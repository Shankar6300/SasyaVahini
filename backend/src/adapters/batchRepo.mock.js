/**
 * SasyaVahini — Mock Produce Batch Repository
 * Realistic agricultural listings in the Pune belt (Chakan, Manchar, Junnar, Khed, Shirur, etc.)
 *
 * Owner: Member 4
 */

const MOCK_BATCHES = [
  {
    id: 'batch_pune_tom_01',
    farmerId: 'farmer_manchar_01',
    farmerName: 'Ramesh Kulkarni',
    cropName: 'Tomato',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    totalQuantityKg: 3000,
    availableQuantityKg: 2500,
    pricePerKg: 22.0,
    harvestDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Manchar',
    latitude: 18.9880,
    longitude: 73.9400,
    farmerReliability: 0.94,
    fpoId: 'fpo_pune_north',
  },
  {
    id: 'batch_pune_tom_02',
    farmerId: 'farmer_khed_01',
    farmerName: 'Suresh Bhor',
    cropName: 'Tomato',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    totalQuantityKg: 2000,
    availableQuantityKg: 1800,
    pricePerKg: 23.5,
    harvestDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Khed (Rajgurunagar)',
    latitude: 18.8470,
    longitude: 73.9100,
    farmerReliability: 0.89,
    fpoId: 'fpo_pune_north',
  },
  {
    id: 'batch_pune_tom_03',
    farmerId: 'farmer_chakan_01',
    farmerName: 'Tukaram Shinde',
    cropName: 'Tomato',
    category: 'Vegetables',
    qualityGrade: 'GRADE_B',
    totalQuantityKg: 3500,
    availableQuantityKg: 3200,
    pricePerKg: 19.5,
    harvestDate: new Date(Date.now() - 3 * 86400000).toISOString(),
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Chakan',
    latitude: 18.7606,
    longitude: 73.8636,
    farmerReliability: 0.85,
    fpoId: null,
  },
  {
    id: 'batch_pune_tom_04',
    farmerId: 'farmer_junnar_01',
    farmerName: 'Ganesh Shelke',
    cropName: 'Tomato',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    totalQuantityKg: 2500,
    availableQuantityKg: 2200,
    pricePerKg: 24.0,
    harvestDate: new Date(Date.now() - 1 * 86400000).toISOString(),
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Junnar',
    latitude: 19.2064,
    longitude: 73.8765,
    farmerReliability: 0.96,
    fpoId: 'fpo_junnar_valley',
  },
  {
    id: 'batch_pune_tom_05',
    farmerId: 'farmer_narayan_01',
    farmerName: 'Deepak Thorat',
    cropName: 'Tomato',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    totalQuantityKg: 1500,
    availableQuantityKg: 1200,
    pricePerKg: 21.0,
    harvestDate: new Date(Date.now() - 2 * 86400000).toISOString(),
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Narayangaon',
    latitude: 19.1170,
    longitude: 73.9780,
    farmerReliability: 0.91,
    fpoId: 'fpo_junnar_valley',
  },
  {
    id: 'batch_pune_tom_06',
    farmerId: 'farmer_shirur_01',
    farmerName: 'Sachin Patil',
    cropName: 'Tomato',
    category: 'Vegetables',
    qualityGrade: 'GRADE_B',
    totalQuantityKg: 4000,
    availableQuantityKg: 3800,
    pricePerKg: 18.5,
    harvestDate: new Date(Date.now() - 4 * 86400000).toISOString(),
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Shirur',
    latitude: 18.8270,
    longitude: 74.3780,
    farmerReliability: 0.82,
    fpoId: null,
  },
  {
    id: 'batch_pune_oni_01',
    farmerId: 'farmer_chakan_02',
    farmerName: 'Anil Kad',
    cropName: 'Onion',
    category: 'Vegetables',
    qualityGrade: 'GRADE_A',
    totalQuantityKg: 5000,
    availableQuantityKg: 4500,
    pricePerKg: 28.0,
    harvestDate: new Date(Date.now() - 5 * 86400000).toISOString(),
    state: 'Maharashtra',
    district: 'Pune',
    village: 'Chakan',
    latitude: 18.7610,
    longitude: 73.8640,
    farmerReliability: 0.93,
    fpoId: 'fpo_pune_north',
  },
];

class MockBatchRepo {
  /**
   * Find available batches matching crop
   * @param {string} crop
   * @returns {Promise<Array>}
   */
  async findCandidatesByCrop(crop) {
    const normalizedCrop = crop.trim().toLowerCase();
    return MOCK_BATCHES.filter(
      (b) => b.cropName.toLowerCase() === normalizedCrop && b.availableQuantityKg > 0,
    );
  }

  /**
   * Find single batch by ID
   * @param {string} batchId
   */
  async findById(batchId) {
    return MOCK_BATCHES.find((b) => b.id === batchId) || null;
  }
}

module.exports = new MockBatchRepo();
