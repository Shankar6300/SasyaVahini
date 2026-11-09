/**
 * SasyaVahini — Mock Farmer Repository
 *
 * Owner: Member 4
 */

const MOCK_FARMERS = {
  farmer_manchar_01: {
    id: 'farmer_manchar_01',
    name: 'Ramesh Kulkarni',
    village: 'Manchar',
    district: 'Pune',
    latitude: 18.9880,
    longitude: 73.9400,
    reliabilityScore: 0.94,
    successfulDeliveries: 42,
    disputeCount: 0,
  },
  farmer_khed_01: {
    id: 'farmer_khed_01',
    name: 'Suresh Bhor',
    village: 'Khed (Rajgurunagar)',
    district: 'Pune',
    latitude: 18.8470,
    longitude: 73.9100,
    reliabilityScore: 0.89,
    successfulDeliveries: 28,
    disputeCount: 1,
  },
  farmer_chakan_01: {
    id: 'farmer_chakan_01',
    name: 'Tukaram Shinde',
    village: 'Chakan',
    district: 'Pune',
    latitude: 18.7606,
    longitude: 73.8636,
    reliabilityScore: 0.85,
    successfulDeliveries: 19,
    disputeCount: 1,
  },
  farmer_junnar_01: {
    id: 'farmer_junnar_01',
    name: 'Ganesh Shelke',
    village: 'Junnar',
    district: 'Pune',
    latitude: 19.2064,
    longitude: 73.8765,
    reliabilityScore: 0.96,
    successfulDeliveries: 53,
    disputeCount: 0,
  },
  farmer_narayan_01: {
    id: 'farmer_narayan_01',
    name: 'Deepak Thorat',
    village: 'Narayangaon',
    district: 'Pune',
    latitude: 19.1170,
    longitude: 73.9780,
    reliabilityScore: 0.91,
    successfulDeliveries: 31,
    disputeCount: 0,
  },
  farmer_shirur_01: {
    id: 'farmer_shirur_01',
    name: 'Sachin Patil',
    village: 'Shirur',
    district: 'Pune',
    latitude: 18.8270,
    longitude: 74.3780,
    reliabilityScore: 0.82,
    successfulDeliveries: 15,
    disputeCount: 2,
  },
};

class MockFarmerRepo {
  async getFarmerProfile(farmerId) {
    return MOCK_FARMERS[farmerId] || {
      id: farmerId,
      name: 'Registered Farmer',
      village: 'Pune Rural',
      district: 'Pune',
      latitude: 18.7606,
      longitude: 73.8636,
      reliabilityScore: 0.85,
      successfulDeliveries: 10,
      disputeCount: 0,
    };
  }

  async getFarmerReliability(farmerId) {
    const profile = await this.getFarmerProfile(farmerId);
    return profile.reliabilityScore;
  }
}

module.exports = new MockFarmerRepo();
