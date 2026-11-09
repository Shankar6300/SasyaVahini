/**
 * SasyaVahini — Live Driver GPS & Telemetry Simulator
 *
 * Simulates a vehicle driving along the road route geometry:
 * - Posts periodic GPS coordinates to POST /api/logistics/vehicles/:id/location
 * - Simulates cold-chain container temperature telemetry (12.0°C – 15.0°C)
 * - Ideal for live demos, judging presentations, and map visualization tests.
 *
 * Uses native fetch (Node 18+).
 * Run: node scripts/simulate-driver.js [shipmentId] [apiBaseUrl]
 *
 * Owner: Member 4
 */

const SHIPMENT_ID = process.argv[2] || 'shp_demo_101';
const API_BASE = process.argv[3] || process.env.API_BASE_URL || 'http://localhost:5000/api';
const VEHICLE_ID = 'veh_mh12_qx_4012';

// Realistic route waypoints from Manchar -> Khed -> Chakan -> Hadapsar
const DEFAULT_ROUTE_COORDS = [
  { lat: 18.9880, lng: 73.9400, name: 'Manchar Farmer Hub' },
  { lat: 18.9175, lng: 73.9250, name: 'Peth Toll Plaza' },
  { lat: 18.8470, lng: 73.9100, name: 'Khed (Rajgurunagar) Farmer Stop' },
  { lat: 18.8038, lng: 73.8868, name: 'Alandi Phata Junction' },
  { lat: 18.7606, lng: 73.8636, name: 'Chakan Logistics Hub' },
  { lat: 18.7125, lng: 73.8821, name: 'Moshi Toll Naka' },
  { lat: 18.6270, lng: 73.8470, name: 'Bhosari Corridor' },
  { lat: 18.5700, lng: 73.8900, name: 'Yerwada River Crossing' },
  { lat: 18.5204, lng: 73.8567, name: 'Pune Central Bypass' },
  { lat: 18.5089, lng: 73.9260, name: 'Hadapsar Buyer Market Yard' },
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function runSimulation() {
  console.log('===============================================================');
  console.log('🚚 SasyaVahini Driver GPS & Cold-Chain Telemetry Simulator');
  console.log(`Target Shipment: ${SHIPMENT_ID}`);
  console.log(`API Base:        ${API_BASE}`);
  console.log(`Vehicle ID:      ${VEHICLE_ID}`);
  console.log('===============================================================\n');

  let waypoints = DEFAULT_ROUTE_COORDS;

  // Try fetching real route coordinates from shipment tracking endpoint
  try {
    const res = await fetch(`${API_BASE}/logistics/shipments/${SHIPMENT_ID}/tracking`);
    const json = await res.json();
    const tracking = json?.data;
    if (tracking?.route?.geometry?.coordinates && tracking.route.geometry.coordinates.length > 2) {
      waypoints = tracking.route.geometry.coordinates.map(([lng, lat], idx) => ({
        lat,
        lng,
        name: `Waypoint ${idx + 1}`,
      }));
      console.log(`✅ Loaded ${waypoints.length} real road waypoints from shipment route geometry.\n`);
    }
  } catch (err) {
    console.log(`ℹ️ Could not fetch shipment tracking from API (${err.message}). Using Pune corridor fallback waypoints.\n`);
  }

  console.log('🚀 Starting driving loop along the corridor (Press Ctrl+C to stop)...\n');

  for (let i = 0; i < waypoints.length; i++) {
    const wp = waypoints[i];
    const speedKmh = Math.floor(40 + Math.random() * 15);
    const temperatureC = Math.round((13.2 + Math.random() * 1.3) * 10) / 10;

    const payload = {
      latitude: wp.lat,
      longitude: wp.lng,
      speedKmh,
      temperatureC,
    };

    try {
      await fetch(`${API_BASE}/logistics/vehicles/${VEHICLE_ID}/location`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: 'Bearer simulator_demo_token',
        },
        body: JSON.stringify(payload),
      });

      console.log(
        `[Ping ${i + 1}/${waypoints.length}] 📍 Location: (${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}) | ⚡ Speed: ${speedKmh} km/h | 🌡️ Temp: ${temperatureC}°C | ${wp.name || ''}`,
      );
    } catch (e) {
      console.log(
        `[Simulated Ping ${i + 1}/${waypoints.length}] 📍 (${wp.lat.toFixed(4)}, ${wp.lng.toFixed(4)}) | ⚡ ${speedKmh} km/h | 🌡️ ${temperatureC}°C | (API offline or auth required)`,
      );
    }

    // Wait 2.5 seconds between GPS points
    await sleep(2500);
  }

  console.log('\n🏁 Destination reached: Vehicle arrived at Buyer Market Yard (Hadapsar)!');
}

runSimulation().catch(console.error);
