/**
 * SasyaVahini — Logistics Data Adapters Entrypoint
 * Dynamically switches between 'mock' and 'prisma' based on LOGISTICS_DATA_SOURCE and NODE_ENV.
 *
 * Owner: Member 4
 */

const config = require('../config/logistics.config');

const mockBatchRepo = require('./batchRepo.mock');
const prismaBatchRepo = require('./batchRepo.prisma');

const mockOrderRepo = require('./orderRepo.mock');
const prismaOrderRepo = require('./orderRepo.prisma');

const mockFarmerRepo = require('./farmerRepo.mock');
const prismaFarmerRepo = require('./farmerRepo.prisma');

const mockShipmentRepo = require('./shipmentRepo.mock');
const prismaShipmentRepo = require('./shipmentRepo.prisma');

const reservationPort = require('./reservationPort');

function isMockMode() {
  if ((process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') && !process.env.TEST_DB) {
    return true;
  }
  if (process.env.LOGISTICS_DATA_SOURCE === 'mock') return true;
  if (process.env.LOGISTICS_DATA_SOURCE === 'prisma') return false;
  return config.dataSource === 'mock';
}

function createRepoProxy(mockRepo, prismaRepo) {
  return new Proxy({}, {
    get(_target, prop) {
      const activeRepo = isMockMode() ? mockRepo : prismaRepo;
      const val = activeRepo[prop];
      if (typeof val === 'function') {
        return val.bind(activeRepo);
      }
      return val;
    },
  });
}

const batchRepo = createRepoProxy(mockBatchRepo, prismaBatchRepo);
const orderRepo = createRepoProxy(mockOrderRepo, prismaOrderRepo);
const farmerRepo = createRepoProxy(mockFarmerRepo, prismaFarmerRepo);
const shipmentRepo = createRepoProxy(mockShipmentRepo, prismaShipmentRepo);

module.exports = {
  batchRepo,
  orderRepo,
  farmerRepo,
  shipmentRepo,
  reservationPort,
  get isMock() {
    return isMockMode();
  },
};
