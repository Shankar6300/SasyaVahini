/**
 * SasyaVahini — Logistics Data Adapters Entrypoint
 * Switches between 'mock' and 'prisma' based on LOGISTICS_DATA_SOURCE env variable.
 *
 * Owner: Member 4
 */

const config = require('../config/logistics.config');
const logger = require('../utils/logger');

const isMock = config.dataSource === 'mock';

logger.info(`Logistics Data Source initialized in [${isMock ? 'MOCK' : 'PRISMA'}] mode`);

const batchRepo = isMock
  ? require('./batchRepo.mock')
  : require('./batchRepo.prisma');

const orderRepo = isMock
  ? require('./orderRepo.mock')
  : require('./orderRepo.prisma');

const farmerRepo = isMock
  ? require('./farmerRepo.mock')
  : require('./farmerRepo.prisma');

module.exports = {
  batchRepo,
  orderRepo,
  farmerRepo,
  isMock,
};
