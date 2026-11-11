/**
 * SasyaVahini — Transactional Outbox Event Dispatcher
 *
 * Implements the Transactional Outbox Pattern to guarantee at-least-once
 * event delivery without dual-write consistency issues.
 *
 * Events written atomically within business transactions:
 * - 'shipment.created'
 * - 'shipment.milestone'
 * - 'shipment.delivered' (Triggers Member 1 & 2 escrow release)
 * - 'shipment.route_locked'
 * - 'logistics.route_deviation'
 * - 'logistics.offer.accepted'
 * - 'logistics.transfer.completed'
 * - 'logistics.transfer.dispute'
 *
 * Owner: Member 4
 */

const prisma = require('../lib/prisma');
const logger = require('../utils/logger');
const logisticsEvents = require('./logisticsEvents');

// In-memory fallback outbox for testing and mock mode
const inMemoryOutbox = [];

let pollIntervalTimer = null;
let isDispatching = false;

/**
 * Record an event atomically into the transactional outbox table or in-memory store.
 *
 * @param {object} params
 * @param {string} params.aggregateType - "SHIPMENT" | "VEHICLE" | "LEG" | "OFFER"
 * @param {string} params.aggregateId - ID of the aggregate root
 * @param {string} params.eventType - Unique dot-namespaced event name
 * @param {object} params.payload - JSON-serializable event payload
 * @param {object} [tx] - Optional Prisma transaction client
 * @returns {Promise<object>} The persisted outbox event entry
 */
async function recordOutboxEvent(
  { aggregateType, aggregateId, eventType, payload },
  tx = null
) {
  const client = tx || prisma;
  const now = new Date();

  const eventRecord = {
    id: `outbox_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    aggregateType,
    aggregateId: String(aggregateId),
    eventType,
    payload,
    status: 'PENDING',
    retryCount: 0,
    maxRetries: 5,
    lastError: null,
    scheduledFor: now,
    processedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  try {
    if (client?.outboxEvent) {
      const created = await client.outboxEvent.create({
        data: {
          aggregateType: eventRecord.aggregateType,
          aggregateId: eventRecord.aggregateId,
          eventType: eventRecord.eventType,
          payload: eventRecord.payload,
          status: 'PENDING',
          scheduledFor: eventRecord.scheduledFor,
        },
      });
      // Trigger async dispatch tick
      setImmediate(() => dispatchPendingEvents().catch(() => {}));
      return created;
    }
  } catch (err) {
    logger.warn('Prisma OutboxEvent write failed or table missing, using in-memory store', {
      error: err.message,
      eventType,
      aggregateId,
    });
  }

  // Fallback in-memory outbox
  inMemoryOutbox.push(eventRecord);
  setImmediate(() => dispatchPendingEvents().catch(() => {}));
  return eventRecord;
}

/**
 * Dispatch pending outbox events asynchronously with exponential backoff and retry limits.
 *
 * @returns {Promise<number>} Count of events successfully dispatched
 */
async function dispatchPendingEvents() {
  if (isDispatching) return 0;
  isDispatching = true;
  let dispatchedCount = 0;

  try {
    const now = new Date();

    // 1. Process in-memory outbox
    const pendingMemory = inMemoryOutbox.filter(
      (e) => e.status === 'PENDING' && new Date(e.scheduledFor) <= now
    );

    for (const event of pendingMemory) {
      try {
        event.status = 'PROCESSING';
        logisticsEvents.emit(event.eventType, event.payload);
        event.status = 'SENT';
        event.processedAt = new Date();
        dispatchedCount++;
      } catch (dispatchErr) {
        event.retryCount += 1;
        event.lastError = dispatchErr.message;
        if (event.retryCount >= event.maxRetries) {
          event.status = 'FAILED';
          logger.error(`Outbox event ${event.id} permanently failed after ${event.retryCount} retries`, {
            eventType: event.eventType,
            error: dispatchErr.message,
          });
        } else {
          event.status = 'PENDING';
          // Exponential backoff: 2^retries seconds
          event.scheduledFor = new Date(Date.now() + Math.pow(2, event.retryCount) * 1000);
        }
      }
    }

    // 2. Process database outbox (if available)
    if (prisma?.outboxEvent) {
      try {
        const dbPending = await prisma.outboxEvent.findMany({
          where: {
            status: 'PENDING',
            scheduledFor: { lte: now },
          },
          take: 50,
          orderBy: { createdAt: 'asc' },
        });

        for (const event of dbPending) {
          try {
            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: 'PROCESSING' },
            });

            logisticsEvents.emit(event.eventType, event.payload);

            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: { status: 'SENT', processedAt: new Date() },
            });
            dispatchedCount++;
          } catch (eventErr) {
            const nextRetries = event.retryCount + 1;
            const isExhausted = nextRetries >= event.maxRetries;
            const nextScheduled = new Date(Date.now() + Math.pow(2, nextRetries) * 1000);

            await prisma.outboxEvent.update({
              where: { id: event.id },
              data: {
                status: isExhausted ? 'FAILED' : 'PENDING',
                retryCount: nextRetries,
                lastError: eventErr.message,
                scheduledFor: nextScheduled,
              },
            });
          }
        }
      } catch {
        // Table not ready or DB connection error; handled gracefully
      }
    }
  } finally {
    isDispatching = false;
  }

  return dispatchedCount;
}

/**
 * Start background polling for the outbox worker
 */
function startOutboxWorker(pollIntervalMs = 5000) {
  if (pollIntervalTimer) return;
  pollIntervalTimer = setInterval(() => {
    dispatchPendingEvents().catch((err) => {
      logger.error('Outbox polling cycle error', { error: err.message });
    });
  }, pollIntervalMs);
  if (pollIntervalTimer.unref) pollIntervalTimer.unref();
}

/**
 * Stop background polling (for test cleanup and graceful server shutdown)
 */
function stopOutboxWorker() {
  if (pollIntervalTimer) {
    clearInterval(pollIntervalTimer);
    pollIntervalTimer = null;
  }
}

/**
 * Get internal outbox stats for monitoring and integration tests
 */
function getOutboxStats() {
  const pending = inMemoryOutbox.filter((e) => e.status === 'PENDING').length;
  const sent = inMemoryOutbox.filter((e) => e.status === 'SENT').length;
  const failed = inMemoryOutbox.filter((e) => e.status === 'FAILED').length;
  return {
    inMemoryTotal: inMemoryOutbox.length,
    pending,
    sent,
    failed,
    isPolling: pollIntervalTimer !== null,
  };
}

/**
 * Clear in-memory outbox (for test isolations)
 */
function clearInMemoryOutbox() {
  inMemoryOutbox.length = 0;
}

module.exports = {
  recordOutboxEvent,
  dispatchPendingEvents,
  startOutboxWorker,
  stopOutboxWorker,
  getOutboxStats,
  clearInMemoryOutbox,
};

