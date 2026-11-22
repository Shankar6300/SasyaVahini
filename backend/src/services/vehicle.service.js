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
const { haversineKm, distanceToPolylineMeters } = require('../utils/geo');
const logisticsEvents = require('../events/logisticsEvents');
const logger = require('../utils/logger');
const prisma = require('../lib/prisma');
const { AuthorizationError, NotFoundError, ValidationError } = require('../utils/errors');

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

// In-memory fleet state for mock / test operations (gated in production)
let inMemoryFleet = process.env.NODE_ENV === 'production' ? [] : [...SEED_VEHICLES];

class VehicleService {
  /**
   * Return fleet vehicles (from DB if available, else in-memory seed)
   */
  async listVehicles(query = {}, user = null) {
    let dbVehicles = [];
    const isMock = ((process.env.JEST_WORKER_ID !== undefined || process.env.NODE_ENV === 'test') && !process.env.TEST_DB) ||
      process.env.LOGISTICS_DATA_SOURCE === 'mock';

    if (isMock && user && user.role === 'LOGISTICS') {
      if (user.id === 'dev-logistics-preview' || user.id?.startsWith('dev-logistics')) {
        return user.partnerType === 'FLEET_OPERATOR'
          ? inMemoryFleet.slice(0, 3)
          : inMemoryFleet.slice(0, 1);
      }
      return [];
    }

    if (!isMock && prisma.vehicle) {
      try {
        const whereClause = {};
        if (query.status) whereClause.status = query.status;
        if (query.category) whereClause.category = query.category;
        if (query.verificationStatus) whereClause.verificationStatus = query.verificationStatus;

        // MULTI-TENANT ISOLATION:
        // A logged-in transport partner must ONLY see vehicles registered under their own profile/organization.
        if (user && user.role === 'LOGISTICS') {
          const profile = await prisma.logisticsProfile.findUnique({
            where: { userId: user.id },
            include: { user: { select: { id: true, name: true, phone: true } } },
          });

          if (profile) {
            whereClause.logisticsId = profile.id;
          } else {
            if (user.id === 'dev-logistics-preview' || user.id?.startsWith('dev-logistics')) {
              if (user.partnerType === 'FLEET_OPERATOR') {
                return inMemoryFleet.slice(0, 3);
              }
              // For individual driver or vehicle owner, strictly return only 1 particular vehicle
              return inMemoryFleet.slice(0, 1);
            }
            return [];
          }
        } else if (query.logisticsId) {
          whereClause.logisticsId = query.logisticsId;
        }

        dbVehicles = await prisma.vehicle.findMany({
          where: whereClause,
          include: {
            logistics: {
              include: { user: { select: { id: true, name: true, phone: true, email: true } } },
            },
            documents: true,
          },
          orderBy: { createdAt: 'desc' },
        });

        // For logged-in transport partners, NEVER leak inMemoryFleet or other organizations' vehicles
        if (user && user.role === 'LOGISTICS') {
          return dbVehicles;
        }
      } catch (err) {
        logger.warn('Failed to query DB for vehicles', { error: err.message });
        if (user && user.role === 'LOGISTICS') {
          throw err;
        }
      }
    }

    // Merge DB vehicles with non-duplicate seed vehicles only for admin or anonymous optimizer queries
    const dbNumbers = new Set(dbVehicles.map((v) => (v.vehicleNumber || '').toUpperCase()));
    let resultFleet = [...dbVehicles];

    for (const seed of inMemoryFleet) {
      if (!dbNumbers.has((seed.vehicleNumber || '').toUpperCase())) {
        resultFleet.push(seed);
      }
    }

    if (query.status) {
      resultFleet = resultFleet.filter((v) => v.status === query.status);
    }
    if (query.category) {
      resultFleet = resultFleet.filter((v) => (v.category || '').toUpperCase() === query.category.toUpperCase());
    }
    if (query.verificationStatus) {
      resultFleet = resultFleet.filter((v) => (v.verificationStatus || 'VERIFIED') === query.verificationStatus);
    }

    return resultFleet;
  }

  /**
   * Find vehicle by ID
   */
  async findById(vehicleId, user = null) {
    let v = null;
    if (prisma.vehicle) {
      try {
        v = await prisma.vehicle.findFirst({
          where: {
            OR: [{ id: vehicleId }, { vehicleNumber: vehicleId.toUpperCase() }],
          },
          include: {
            logistics: {
              include: { user: { select: { id: true, name: true, phone: true, email: true } } },
            },
            documents: true,
          },
        });
      } catch (err) {
        logger.warn('Prisma find vehicle failed, using in-memory', { error: err.message });
      }
    }
    if (!v) {
      v = inMemoryFleet.find((item) => item.id === vehicleId || item.vehicleNumber === vehicleId) || null;
    }
    if (!v) return null;

    // Tenant authorization check
    if (user && user.role === 'LOGISTICS') {
      const profile = await prisma.logisticsProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile) {
        if (user.id === 'dev-logistics-preview') return v;
        throw new AuthorizationError('Access denied: You do not have permission to view this vehicle.');
      }
      if (v.logisticsId && v.logisticsId !== profile.id) {
        throw new AuthorizationError('Access denied: You do not have permission to view vehicles outside your registered fleet.');
      }
    }
    return v;
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

    const now = new Date();
    // Only vehicles with status AVAILABLE, adequate capacity, and NO EXPIRED statutory documents
    const eligible = fleet.filter((v) => {
      if (v.status && v.status !== 'AVAILABLE') return false;
      if (v.capacityKg < requiredCapacityKg) return false;
      if (v.verificationStatus === 'REJECTED') return false;
      if (v.documents && v.documents.length > 0) {
        const hasExpired = v.documents.some((d) => d.expiryDate && new Date(d.expiryDate) < now);
        if (hasExpired) return false;
      }
      return true;
    });

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
  async recordLocation(vehicleId, { latitude, longitude, speedKmh = 0, temperatureC = null }, user = null) {
    if (user?.role === 'LOGISTICS') {
      await this.findById(vehicleId, user);
    }
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
        if (prisma.locationPing) {
          await prisma.locationPing.create({
            data: {
              vehicleId,
              latitude,
              longitude,
              speedKmh,
              temperatureC,
            },
          });
        }
      } catch (err) {
        logger.warn('Failed to persist vehicle location in DB', { error: err.message });
      }
    }

    let isDeviated = false;
    let deviationMeters = 0;

    // Check deviation if vehicle is on active shipment
    try {
      const { shipmentRepo } = require('../adapters');
      const activeShipment = (await shipmentRepo.listShipments({ limit: 10, where: { vehicleId } }))?.items?.find(
        (s) => s.status === 'TRANSIT' || s.status === 'PICKUP' || s.status === 'OUT_FOR_DELIVERY'
      );

      const polylineCoords = activeShipment?.routeGeometry?.coordinates || activeShipment?.routeGeometryJson?.coordinates;
      if (Array.isArray(polylineCoords) && polylineCoords.length >= 2) {
        deviationMeters = distanceToPolylineMeters({ lat: latitude, lng: longitude }, polylineCoords);
        if (deviationMeters > 300) {
          isDeviated = true;
          logisticsEvents.emit('logistics.route_deviation', {
            vehicleId,
            shipmentId: activeShipment.id,
            deviationMeters,
            currentLat: latitude,
            currentLng: longitude,
            timestamp: new Date().toISOString(),
          });
          logger.warn('Vehicle deviated from locked route corridor', {
            vehicleId,
            shipmentId: activeShipment.id,
            deviationMeters,
          });
        }
      }
    } catch {
      // Non-blocking deviation check
    }

    return {
      vehicleId,
      latitude,
      longitude,
      speedKmh,
      temperatureC,
      isDeviated,
      deviationMeters,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Register a new vehicle with full commercial specifications and documents
   */
  async createVehicle(logisticsId, data) {
    const {
      vehicleNumber,
      vehicleType,
      capacityKg,
      driverName,
      driverPhone,
      make,
      model,
      manufacturingYear,
      category = 'MCV',
      fuelType = 'DIESEL',
      gvwKg,
      mileageKmpl = 14.5,
      dimensions,
      isRefrigerated = false,
      minTempC,
      maxTempC,
      baseHub = 'Pune Rural Hub',
      operatingDistricts = ['Pune'],
      photoUrls = [],
      documents = [],
    } = data;

    const normalizedNo = vehicleNumber.trim().toUpperCase();

    // Check duplicate
    const existing = await prisma.vehicle.findUnique({
      where: { vehicleNumber: normalizedNo },
    });
    if (existing) {
      const err = new Error(`Vehicle number ${normalizedNo} is already registered.`);
      err.statusCode = 409;
      throw err;
    }

    const parsedDistricts = Array.isArray(operatingDistricts)
      ? operatingDistricts
      : typeof operatingDistricts === 'string' && operatingDistricts.trim()
      ? operatingDistricts.split(',').map((s) => s.trim())
      : ['Pune'];

    const parsedPhotos = Array.isArray(photoUrls)
      ? photoUrls
      : typeof photoUrls === 'string' && photoUrls.trim()
      ? [photoUrls]
      : [];

    const docCreates = [];
    if (Array.isArray(documents)) {
      for (const doc of documents) {
        if (doc.docType && (doc.fileUrl || doc.frontUrl)) {
          docCreates.push({
            docType: doc.docType,
            docNumber: doc.docNumber || null,
            fileUrl: doc.fileUrl || doc.frontUrl || '',
            frontUrl: doc.frontUrl || null,
            backUrl: doc.backUrl || null,
            issueDate: doc.issueDate ? new Date(doc.issueDate) : null,
            expiryDate: doc.expiryDate ? new Date(doc.expiryDate) : null,
            verificationStatus: 'PENDING',
          });
        }
      }
    }

    const created = await prisma.vehicle.create({
      data: {
        logisticsId,
        vehicleNumber: normalizedNo,
        vehicleType: vehicleType || (category === 'HCV' ? 'Truck' : category === 'SCV' ? 'Tempo' : 'Mini-Truck'),
        capacityKg: capacityKg ? Number(capacityKg) : 2500,
        driverName: driverName || 'Designated Driver',
        driverPhone: driverPhone || '+919800000000',
        make: make || 'Tata',
        model: model || 'Intra V30',
        manufacturingYear: manufacturingYear ? Number(manufacturingYear) : 2023,
        category,
        fuelType,
        gvwKg: gvwKg ? Number(gvwKg) : null,
        mileageKmpl: mileageKmpl ? Number(mileageKmpl) : 14.5,
        dimensions: dimensions || '10ft x 5.5ft x 5ft',
        isRefrigerated: !!isRefrigerated,
        minTempC: minTempC !== undefined && minTempC !== '' ? Number(minTempC) : null,
        maxTempC: maxTempC !== undefined && maxTempC !== '' ? Number(maxTempC) : null,
        baseHub,
        operatingDistricts: parsedDistricts,
        photoUrls: parsedPhotos,
        status: 'AVAILABLE',
        verificationStatus: 'PENDING',
        documents: docCreates.length > 0 ? { create: docCreates } : undefined,
      },
      include: {
        logistics: {
          include: { user: { select: { id: true, name: true, phone: true, email: true } } },
        },
        documents: true,
      },
    });

    // Also push to inMemoryFleet
    inMemoryFleet.unshift({
      id: created.id,
      vehicleNumber: created.vehicleNumber,
      vehicleType: created.vehicleType,
      capacityKg: created.capacityKg,
      driverName: created.driverName,
      driverPhone: created.driverPhone,
      status: created.status,
      hubName: created.baseHub,
      category: created.category,
      make: created.make,
      model: created.model,
      verificationStatus: created.verificationStatus,
    });

    return created;
  }

  /**
   * Verify or reject vehicle with DoCA officer remarks
   */
  async verifyVehicle(vehicleId, { status = 'VERIFIED', adminRemarks = '', rejectionReason = '' }) {
    const isApproved = status === 'VERIFIED';
    const updated = await prisma.vehicle.update({
      where: { id: vehicleId },
      data: {
        verificationStatus: status,
        rcVerified: isApproved,
        insuranceVerified: isApproved,
        fitnessVerified: isApproved,
        permitVerified: isApproved,
        pucVerified: isApproved,
        taxVerified: isApproved,
        adminRemarks: adminRemarks || null,
        rejectionReason: rejectionReason || null,
        verifiedAt: new Date(),
      },
      include: { documents: true, logistics: true },
    });

    // Automatically update attached documents to the matching verification status
    if (updated.documents && updated.documents.length > 0) {
      await prisma.vehicleDocument.updateMany({
        where: { vehicleId },
        data: {
          verificationStatus: status,
          adminRemarks: adminRemarks || null,
          rejectionReason: rejectionReason || null,
          verifiedAt: new Date(),
        },
      });
    }

    // Update in-memory copy
    const inMem = inMemoryFleet.find((v) => v.id === vehicleId || v.vehicleNumber === updated.vehicleNumber);
    if (inMem) {
      inMem.verificationStatus = status;
    }

    return updated;
  }

  /**
   * Verify or reject Driver / Transport Partner
   */
  async verifyDriver(logisticsProfileId, { status = 'VERIFIED', adminRemarks = '', rejectionReason = '' }) {
    const isApproved = status === 'VERIFIED';
    const updated = await prisma.logisticsProfile.update({
      where: { id: logisticsProfileId },
      data: {
        verificationStatus: status,
        driverVerified: isApproved,
        licenseVerified: isApproved,
        adminRemarks: adminRemarks || null,
        rejectionReason: rejectionReason || null,
        verifiedAt: new Date(),
      },
      include: { user: { select: { id: true, name: true, phone: true, email: true } }, vehicles: true },
    });
    return updated;
  }

  /**
   * Verify or reject single vehicle document
   */
  async verifyDocument(documentId, { status = 'VERIFIED', adminRemarks = '', rejectionReason = '' }) {
    const updated = await prisma.vehicleDocument.update({
      where: { id: documentId },
      data: {
        verificationStatus: status,
        adminRemarks: adminRemarks || null,
        rejectionReason: rejectionReason || null,
        verifiedAt: new Date(),
      },
    });

    const fieldMap = {
      RC: 'rcVerified',
      INSURANCE: 'insuranceVerified',
      FITNESS: 'fitnessVerified',
      PERMIT: 'permitVerified',
      PUC: 'pucVerified',
      ROAD_TAX: 'taxVerified',
    };

    const isApproved = status === 'VERIFIED';
    const vehicleUpdate = {};
    if (fieldMap[updated.docType]) {
      vehicleUpdate[fieldMap[updated.docType]] = isApproved;
    }

    if (status === 'REJECTED') {
      vehicleUpdate.verificationStatus = 'REJECTED';
      vehicleUpdate.rejectionReason = rejectionReason || `Document ${updated.docType} was rejected by DoCA auditor.`;
      vehicleUpdate.adminRemarks = adminRemarks || null;
    }

    if (Object.keys(vehicleUpdate).length > 0) {
      await prisma.vehicle.update({
        where: { id: updated.vehicleId },
        data: vehicleUpdate,
      });
    }

    return updated;
  }

  /**
   * DoCA Admin Verification Queue: retrieve pending vehicles, drivers, and fleet audits
   */
  async getAdminVerificationQueue() {
    const [pendingVehicles, verifiedVehicles, rejectedVehicles, pendingPartners, allPartners] = await Promise.all([
      prisma.vehicle.findMany({
        where: { verificationStatus: 'PENDING' },
        include: {
          logistics: {
            include: { user: { select: { id: true, name: true, email: true, phone: true } } },
          },
          documents: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.vehicle.count({ where: { verificationStatus: 'VERIFIED' } }),
      prisma.vehicle.count({ where: { verificationStatus: 'REJECTED' } }),
      prisma.logisticsProfile.findMany({
        where: { verificationStatus: 'PENDING' },
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          vehicles: { include: { documents: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.logisticsProfile.findMany({
        include: {
          user: { select: { id: true, name: true, email: true, phone: true } },
          vehicles: { include: { documents: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      stats: {
        pendingVehiclesCount: pendingVehicles.length,
        verifiedVehiclesCount: verifiedVehicles,
        rejectedVehiclesCount: rejectedVehicles,
        pendingPartnersCount: pendingPartners.length,
        totalPartnersCount: allPartners.length,
      },
      pendingVehicles,
      pendingPartners,
      allPartners,
    };
  }

  /**
   * Retrieve logged-in logistics partner's complete profile, classification, documents & fleet metrics
   */
  /**
   * Upload or re-upload a statutory document for a vehicle (RC, INSURANCE, FITNESS, PERMIT, PUC, ROAD_TAX).
   * Automatically resets document and vehicle status to PENDING so DoCA compliance officer can review it.
   */
  async uploadVehicleDocument(vehicleId, docData, user = null) {
    if (!prisma.vehicle) {
      throw new NotFoundError('Vehicle database');
    }

    // 1. Verify vehicle existence and tenant ownership
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        logistics: {
          include: { user: { select: { id: true } } },
        },
        documents: true,
      },
    });

    if (!vehicle) {
      throw new NotFoundError('Vehicle');
    }

    if (user && user.role === 'LOGISTICS') {
      const profile = await prisma.logisticsProfile.findUnique({
        where: { userId: user.id },
      });
      if (!profile || vehicle.logisticsId !== profile.id) {
        throw new AuthorizationError('Access denied: You can only upload documents for vehicles in your own fleet.');
      }
    }

    const docType = docData.docType || docData.documentType;
    const docNumber = docData.docNumber !== undefined ? docData.docNumber : docData.documentNumber;
    const fileUrl = docData.fileUrl || docData.documentUrl || docData.frontUrl;
    const frontUrl = docData.frontUrl;
    const backUrl = docData.backUrl;
    const issueDate = docData.issueDate;
    const expiryDate = docData.expiryDate || docData.validUntil;
    if (!docType || (!fileUrl && !frontUrl)) {
      throw new ValidationError('Document type and file are required.');
    }

    // 2. Check if a document of this docType already exists for this vehicle
    const existingDoc = await prisma.vehicleDocument.findFirst({
      where: {
        vehicleId,
        docType,
      },
    });

    let savedDoc;
    if (existingDoc) {
      savedDoc = await prisma.vehicleDocument.update({
        where: { id: existingDoc.id },
        data: {
          docNumber: docNumber !== undefined ? docNumber : existingDoc.docNumber,
          fileUrl: fileUrl || frontUrl || existingDoc.fileUrl,
          frontUrl: frontUrl || existingDoc.frontUrl,
          backUrl: backUrl || existingDoc.backUrl,
          issueDate: issueDate ? new Date(issueDate) : existingDoc.issueDate,
          expiryDate: expiryDate ? new Date(expiryDate) : existingDoc.expiryDate,
          verificationStatus: 'PENDING',
          adminRemarks: 'Re-uploaded by transporter. Pending DoCA verification.',
          rejectionReason: null,
          verifiedAt: null,
        },
      });
    } else {
      savedDoc = await prisma.vehicleDocument.create({
        data: {
          vehicleId,
          docType,
          docNumber: docNumber || null,
          fileUrl: fileUrl || frontUrl || '',
          frontUrl: frontUrl || null,
          backUrl: backUrl || null,
          issueDate: issueDate ? new Date(issueDate) : null,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          verificationStatus: 'PENDING',
          adminRemarks: 'Newly uploaded document. Pending DoCA verification.',
        },
      });
    }

    // 3. Reset vehicle status to PENDING so it re-enters DoCA audit queue
    const fieldMap = {
      RC: 'rcVerified',
      INSURANCE: 'insuranceVerified',
      FITNESS: 'fitnessVerified',
      PERMIT: 'permitVerified',
      PUC: 'pucVerified',
      ROAD_TAX: 'taxVerified',
    };
    const updateVehicleData = {
      verificationStatus: 'PENDING',
      adminRemarks: 'Document re-uploaded. Re-queued for DoCA statutory audit.',
      rejectionReason: null,
      verifiedAt: null,
    };
    if (fieldMap[docType]) {
      updateVehicleData[fieldMap[docType]] = false;
    }

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: updateVehicleData,
    });

    // Return updated vehicle with all documents
    return await prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        documents: true,
        logistics: {
          include: { user: { select: { id: true, name: true, phone: true, email: true } } },
        },
      },
    });
  }

  async getProfile(userId) {
    if (prisma.logisticsProfile) {
      try {
        const profile = await prisma.logisticsProfile.findUnique({
          where: { userId },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
                role: true,
                status: true,
                createdAt: true,
              },
            },
            vehicles: {
              include: {
                documents: true,
              },
              orderBy: { createdAt: 'desc' },
            },
          },
        });

        if (profile) {
          const totalVehicles = profile.vehicles.length;
          const verifiedVehicles = profile.vehicles.filter((v) => v.verificationStatus === 'VERIFIED').length;
          const pendingVehicles = profile.vehicles.filter((v) => v.verificationStatus === 'PENDING').length;
          const rejectedVehicles = profile.vehicles.filter((v) => v.verificationStatus === 'REJECTED').length;

          return {
            ...profile,
            stats: {
              totalVehicles,
              verifiedVehicles,
              pendingVehicles,
              rejectedVehicles,
            },
          };
        }
      } catch (err) {
        logger.warn('Failed to query DB for logistics profile', { error: err.message });
      }
    }

    // Mock fallback when DB is disconnected
    if (userId?.startsWith('dev-logistics') || process.env.LOGISTICS_DATA_SOURCE === 'mock') {
      const isDriver = userId?.includes('driver');
      const isOrg = userId?.includes('org');
      const mockVehs = isOrg ? inMemoryFleet.slice(0, 3) : inMemoryFleet.slice(0, 1);
      return {
        id: `mock_profile_${userId}`,
        userId,
        partnerType: isOrg ? 'FLEET_OPERATOR' : isDriver ? 'INDIVIDUAL_DRIVER' : 'VEHICLE_OWNER',
        companyName: isOrg ? 'Sahyadri Agro Logistics Pvt Ltd' : isDriver ? 'Santosh Gaikwad (Commercial Driver)' : 'Patil Agro Transport',
        ownerName: isOrg ? null : isDriver ? 'Santosh Gaikwad' : 'Ramesh Patil',
        phone: isOrg ? '+919822014000' : isDriver ? '+919833001122' : '+919822099881',
        verificationStatus: 'VERIFIED',
        licenseVerified: true,
        driverVerified: true,
        vehicles: mockVehs,
        stats: {
          totalVehicles: mockVehs.length,
          verifiedVehicles: mockVehs.length,
          pendingVehicles: 0,
          rejectedVehicles: 0,
        },
      };
    }

    return null;
  }

  /**
   * Update logged-in logistics partner's profile & credentials
   */
  async updateProfile(userId, updateData = {}) {
    if (!prisma.logisticsProfile) return null;

    const existing = await prisma.logisticsProfile.findUnique({ where: { userId } });
    if (!existing) {
      throw new NotFoundError('Logistics profile');
    }

    const allowed = [
      'companyName',
      'ownerName',
      'emergencyContact',
      'serviceStates',
      'serviceDistricts',
      'ownershipType',
      'panNumber',
      'gstin',
      'businessRegNo',
      'businessCertUrl',
      'profilePhotoUrl',
      'drivingLicenceNo',
      'licenceExpiry',
      'permittedClasses',
      'licenceFrontUrl',
      'licenceBackUrl',
      'accountHolderName',
      'bankName',
      'accountNumber',
      'ifscCode',
    ];

    const dataToUpdate = {};
    for (const key of allowed) {
      if (updateData[key] !== undefined) {
        if (key === 'licenceExpiry' && updateData[key]) {
          dataToUpdate[key] = new Date(updateData[key]);
        } else {
          dataToUpdate[key] = updateData[key];
        }
      }
    }

    if (updateData.name || updateData.phone) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          name: updateData.name !== undefined ? updateData.name : undefined,
          phone: updateData.phone !== undefined ? updateData.phone : undefined,
        },
      });
    }

    // If profile was REJECTED or critical KYC documents were updated, reset to PENDING and re-queue for DoCA audit
    if (
      existing.verificationStatus === 'REJECTED' ||
      updateData.businessCertUrl ||
      updateData.licenceFrontUrl ||
      updateData.licenceBackUrl ||
      updateData.drivingLicenceNo
    ) {
      dataToUpdate.verificationStatus = 'PENDING';
      dataToUpdate.adminRemarks = 'Credentials updated/re-submitted by partner. Pending DoCA statutory audit.';
      dataToUpdate.rejectionReason = null;
      dataToUpdate.verifiedAt = null;
    }

    return await prisma.logisticsProfile.update({
      where: { userId },
      data: dataToUpdate,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            role: true,
            status: true,
          },
        },
        vehicles: {
          include: { documents: true },
        },
      },
    });
  }

}

module.exports = new VehicleService();
