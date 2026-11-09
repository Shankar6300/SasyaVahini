/**
 * SasyaVahini — Cross-Module Logistics Event Bus
 *
 * Emits asynchronous lifecycle events for Members 1, 2, 3:
 * - 'shipment.created'   -> { shipmentId, orderId, trackingNumber, vehicleId, totalWeightKg }
 * - 'shipment.milestone' -> { shipmentId, orderId, milestone, timestamp, latitude, longitude }
 * - 'shipment.delivered' -> { shipmentId, orderId, deliveredAt, verifiedOtp }
 *   (Triggers Member 1 & 2 escrow release to farmers)
 *
 * Owner: Member 4
 */

const EventEmitter = require('events');
const logger = require('../utils/logger');

class LogisticsEventEmitter extends EventEmitter {}

const logisticsEvents = new LogisticsEventEmitter();

// Default logging listeners for debugging and audibility
logisticsEvents.on('shipment.created', (payload) => {
  logger.info('[Event: shipment.created]', payload);
});

logisticsEvents.on('shipment.milestone', (payload) => {
  logger.info('[Event: shipment.milestone]', payload);
});

logisticsEvents.on('shipment.delivered', (payload) => {
  logger.info('[Event: shipment.delivered] Triggering escrow disbursement signal', payload);
});

module.exports = logisticsEvents;
