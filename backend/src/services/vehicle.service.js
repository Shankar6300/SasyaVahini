/**
 * SasyaVahini — Fleet & Vehicle Assignment Service
 *
 * Implements vehicle selection policy:
 * - Pick SMALLEST vehicle with enough capacity (target utilization 80-90%)
 * - Tie-break by distance from vehicle location/hub to first pickup
 * - Only assign vehicles with status === 'AVAILABLE'
 * - Multi-vehicle clustering when load exceeds single vehicle capacity
 *
 * Owner: Member 4
 */

const config = require('../config/logistics.config');
const { haversineKm } = require('../utils/geo');
const logger = require('../utils/logger');
const prisma = require('../lib/prisma');

// 10 Pune Agricultural Zone Seed Vehicles
const SEED_VEHICLES = [
  {
    id: 'veh_mh12_qx_4012',
    vehicleNumber: 'MH-12-QX-4012',
    vehicleType: 'Mini-Truck',
    capacityKg: 2500,
    driverName: 'Shivaji Mane',
    driverPhone: '+919822014012',
    status: 'AVAILABLE',
    currentLatitude: 18.7606,
    currentLongitude: 73.8636,
    hubName: 'Chakan Hub',
  },
  {
    id: 'veh_mh12_vt_8819',
    vehicleNumber: 'MH-12-VT-8819',
    vehicleType: 'Mini-Truck',
    capacityKg: 3500,
    driverName: 'Deepak Shinde',
    driverPhone: '+919822018819',
    status: 'AVAILABLE',
    currentLatitude: 19.1170,
    currentLongitude: 73.9780,
    hubName: 'Narayangaon Hub',
  },
  {
    id: 'veh_mh14_gh_1290',
    vehicleNumber: 'MH-14-GH-1290',
    vehicleType: 'Tempo',
    capacityKg: 1500,
    driverName: 'Amol Borade',
    driverPhone: '+919822011290',
    status: 'AVAILABLE',
    currentLatitude: 18.5089,
    currentLongitude: 73.9260,
    hubName: 'Hadapsar Hub',
  },
  {
    id: 'veh_mh12_rt_6712',
    vehicleNumber: 'MH-12-RT-6712',
    vehicleType: 'Truck',
    capacityKg: 5000,
    driverName: 'Sunil Jadhav',
    driverPhone: '+919822016712',
    status: 'AVAILABLE',
    currentLatitude: 18.9880,
    currentLongitude: 73.9400,
    hubName: 'Manchar Hub',
  },
  {
    id: 'veh_mh12_pl_3310',
    vehicleNumber: 'MH-12-PL-3310',
    vehicleType: 'Tempo',
    capacityKg: 2000,
    driverName: 'Ganesh Shelke',
    driverPhone: '+919822013310',
    status: 'AVAILABLE',
    currentLatitude: 19.2064,
    currentLongitude: 73.8765,
    hubName: 'Junnar Hub',
  },
  {
    id: 'veh_mh14_zx_5541',
    vehicleNumber: 'MH-14-ZX-5541',
    vehicleType: 'Refrigerated',
    capacityKg: 4000,
    driverName: 'Rahul Sawant',
    driverPhone: '+919822015541',
    status: 'AVAILABLE',
    currentLatitude: 18.1517,
    currentLongitude: 74.5775,
    hubName: 'Baramati Hub',
  },
  {
    id: 'veh_mh12_kp_9901',
    vehicleNumber: 'MH-12-KP-9901',
    vehicleType: 'Tempo',
    capacityKg: 1800,
    driverName: 'Pandurang Kale',
    driverPhone: '+919822019901',
    status: 'AVAILABLE',
    currentLatitude: 18.8470,
    currentLongitude: 73.9100,
    hubName: 'Khed Hub',
  },
  {
    id: 'veh_mh12_bn_2234',
    vehicleNumber: 'MH-12-BN-2234',
    vehicleType: 'Mini-Truck',
    capacityKg: 3000,
    driverName: 'Vikas Kadam',
    driverPhone: '+919822012234',
    status: 'AVAILABLE',
    currentLatitude: 18.7650,
    currentLongitude: 73.8550,
    hubName: 'Chakan Depot',
  },
  {
    id: 'veh_mh14_ee_7712',
    vehicleNumber: 'MH-14-EE-7712',
    vehicleType: 'Truck',
    capacityKg: 6000,
    driverName: 'Sanjay Thorat',
    driverPhone: '+919822017712',
    status: 'AVAILABLE',
    currentLatitude: 18.6270,
    currentLongitude: 73.8470,
    hubName: 'Bhosari Fleet Hub',
  },
  {
    id: 'veh_mh12_ll_1092',
    vehicleNumber: 'MH-12-LL-1092',
    vehicleType: 'Mini-Truck',
    capacityKg: 2500,
    driverName: 'Sachin Patil',
    driverPhone: '+919822011092',
    status: 'AVAILABLE',
    currentLatitude: 18.8270,
    currentLongitude: 74.3780,
    hubName: 'Shirur Depot',
  },
];

// In-memory fleet state for mock / test operations
let inMemoryFleet = [...SEED_VEHICLES];

class VehicleService {
  /**
   * Return fleet vehicles (from DB if available, else in-memory seed)
   */
  async listVehicles(query = {}) {
    const isMock = config.dataSource === 'mock';
    if (!isMock && prisma.vehicle) {
      try {
        const dbVehicles = await prisma.vehicle.findMany({
          where: query.status ? { status: query.status } : undefined,
          include: { logistics: true },
        });
        if (dbVehicles.length > 0) return dbVehicles;
      } catch (err) {
        logger.warn('Failed to query DB for vehicles, using in-memory fleet', { error: err.message });
      }
    }

    if (query.status) {
      return inMemoryFleet.filter((v) => v.status === query.status);
    }
    return inMemoryFleet;
  }

  /**
   * Find vehicle by ID
   */
  async findById(vehicleId) {
    const isMock = config.dataSource === 'mock';
    if (!isMock && prisma.vehicle) {
      try {
        const v = await prisma.vehicle.findUnique({ where: { id: vehicleId } });
        if (v) return v;
      } catch (err) {
        logger.warn('Prisma find vehicle failed, using in-memory', { error: err.message });
      }
    }
    return inMemoryFleet.find((v) => v.id === vehicleId || v.vehicleNumber === vehicleId) || null;
  }

  /**
   * Core algorithm: Pick the SMALLEST vehicle with enough capacity,
   * target utilization 80-90%, tie-breaking by proximity to first pickup.
   *
   * @param {Object} params
   * @param {number} params.requiredCapacityKg
   * @param {number} params.firstPickupLat
   * @param {number} params.firstPickupLng
   * @param {Array}  [params.availableVehicles]
   */
  async selectBestVehicle({
    requiredCapacityKg,
    firstPickupLat,
    firstPickupLng,
    availableVehicles = null,
  }) {
    const fleet = availableVehicles || (await this.listVehicles({ status: 'AVAILABLE' }));

    // Only vehicles with status AVAILABLE and enough capacity
    const eligible = fleet.filter(
      (v) => (v.status === 'AVAILABLE' || !v.status) && v.capacityKg >= requiredCapacityKg,
    );

    if (eligible.length === 0) {
      return null;
    }

    // Score candidates based on:
    // 1. Capacity fit (penalize wasted capacity; preference for 80-90% utilization)
    // 2. Distance from current vehicle location/hub to first pickup
    const scored = eligible.map((v) => {
      const utilization = requiredCapacityKg / v.capacityKg;
      // Ideal utilization is 85% (0.85)
      const utilizationPenalty = Math.abs(0.85 - utilization);

      const lat = v.currentLatitude || 18.7606;
      const lng = v.currentLongitude || 73.8636;
      const distToPickup = haversineKm(lat, lng, firstPickupLat, firstPickupLng);

      return {
        vehicle: v,
        capacityKg: v.capacityKg,
        utilization: Math.round(utilization * 1000) / 10,
        distToPickup: Math.round(distToPickup * 10) / 10,
        // Combined score: lower is better
        // Primary sort: smallest adequate capacity (capacityKg * 10)
        // Secondary sort: distance to pickup
        sortRank: v.capacityKg * 10 + distToPickup + utilizationPenalty * 500,
      };
    });

    scored.sort((a, b) => a.sortRank - b.sortRank);

    const winner = scored[0];
    logger.info('Selected vehicle for assignment', {
      vehicleNumber: winner.vehicle.vehicleNumber,
      capacityKg: winner.capacityKg,
      utilization: winner.utilization,
      distToPickup: winner.distToPickup,
    });

    return {
      ...winner.vehicle,
      targetUtilizationPercent: winner.utilization,
      distanceToFirstPickupKm: winner.distToPickup,
    };
  }

  /**
   * Multi-vehicle assignment: Partition stops when total load exceeds single vehicle
   */
  async assignVehiclesForMultiLoad(stops, buyerLat, buyerLng) {
    const totalWeightKg = stops.reduce((sum, s) => sum + s.qtyKg, 0);
    const available = await this.listVehicles({ status: 'AVAILABLE' });
    const maxSingleCapacity = Math.max(...available.map((v) => v.capacityKg), 5000);

    if (totalWeightKg <= maxSingleCapacity) {
      const best = await this.selectBestVehicle({
        requiredCapacityKg: totalWeightKg,
        firstPickupLat: stops[0]?.lat || buyerLat,
        firstPickupLng: stops[0]?.lng || buyerLng,
        availableVehicles: available,
      });
      return [{ vehicle: best, stops, totalWeightKg }];
    }

    // Partition into clusters: simple greedy bin packing + geographic grouping
    logger.info('Load exceeds single vehicle capacity, clustering into multi-vehicle routes', {
      totalWeightKg,
      maxSingleCapacity,
    });

    const clusters = [];
    let currentCluster = [];
    let currentWeight = 0;

    for (const stop of stops) {
      if (currentWeight + stop.qtyKg > maxSingleCapacity && currentCluster.length > 0) {
        clusters.push({ stops: currentCluster, totalWeightKg: currentWeight });
        currentCluster = [stop];
        currentWeight = stop.qtyKg;
      } else {
        currentCluster.push(stop);
        currentWeight += stop.qtyKg;
      }
    }
    if (currentCluster.length > 0) {
      clusters.push({ stops: currentCluster, totalWeightKg: currentWeight });
    }

    // Assign a vehicle to each cluster
    const assignedClusters = [];
    const usedVehicleIds = new Set();

    for (const cluster of clusters) {
      const remainingFleet = available.filter((v) => !usedVehicleIds.has(v.id));
      const firstStop = cluster.stops[0];
      const vehicle = await this.selectBestVehicle({
        requiredCapacityKg: cluster.totalWeightKg,
        firstPickupLat: firstStop.lat,
        firstPickupLng: firstStop.lng,
        availableVehicles: remainingFleet,
      });

      if (vehicle) {
        usedVehicleIds.add(vehicle.id);
        assignedClusters.push({ vehicle, stops: cluster.stops, totalWeightKg: cluster.totalWeightKg });
      }
    }

    return assignedClusters;
  }

  /**
   * Update vehicle status
   */
  async updateStatus(vehicleId, status) {
    const vehicle = inMemoryFleet.find((v) => v.id === vehicleId || v.vehicleNumber === vehicleId);
    if (vehicle) vehicle.status = status;

    if (config.dataSource !== 'mock' && prisma.vehicle) {
      try {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: { status },
        });
      } catch (err) {
        logger.warn('Failed to update vehicle status in DB', { error: err.message });
      }
    }
    return vehicle;
  }

  /**
   * Record location telemetry ping
   */
  async recordLocation(vehicleId, { latitude, longitude, speedKmh = 0, temperatureC = null }) {
    const vehicle = inMemoryFleet.find((v) => v.id === vehicleId || v.vehicleNumber === vehicleId);
    if (vehicle) {
      vehicle.currentLatitude = latitude;
      vehicle.currentLongitude = longitude;
      vehicle.lastLocationAt = new Date().toISOString();
      if (temperatureC !== null) vehicle.currentTemperatureC = temperatureC;
    }

    if (config.dataSource !== 'mock' && prisma.vehicle) {
      try {
        await prisma.vehicle.update({
          where: { id: vehicleId },
          data: {
            currentLatitude: latitude,
            currentLongitude: longitude,
            lastLocationAt: new Date(),
          },
        });
      } catch (err) {
        logger.warn('Failed to persist vehicle location in DB', { error: err.message });
      }
    }

    return {
      vehicleId,
      latitude,
      longitude,
      speedKmh,
      temperatureC,
      timestamp: new Date().toISOString(),
    };
  }
}

module.exports = new VehicleService();
