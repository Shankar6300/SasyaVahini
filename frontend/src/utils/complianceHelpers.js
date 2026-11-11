/**
 * SasyaVahini — Logistics Statutory Compliance & Document Expiry Helpers
 *
 * Implements Indian Motor Vehicles Act compliance logic:
 * - Tracking expiry for: RC, Commercial Insurance, Pollution (PUC), Fitness, Permit, Road Tax, and Driving Licence
 * - Smart gating: Vehicles with ANY expired statutory document cannot be allocated to shipment runs.
 */

export const STATUTORY_DOC_TYPES = [
  {
    type: 'RC',
    label: 'Registration Certificate (RC - Form 23)',
    shortLabel: 'RC Certificate',
    mandatory: true,
    flagKey: 'rcVerified',
    sampleNum: 'MH-14-AZ-RC-2024',
    description: 'Vehicle legal registration under Motor Vehicles Act, 1988',
  },
  {
    type: 'INSURANCE',
    label: 'Commercial Vehicle Insurance Policy',
    shortLabel: 'Insurance Policy',
    mandatory: true,
    flagKey: 'insuranceVerified',
    sampleNum: 'NIC-COMM-991204',
    description: 'Comprehensive / third-party goods commercial carrier coverage',
  },
  {
    type: 'PUC',
    label: 'Pollution Under Control (PUC / Emission)',
    shortLabel: 'Pollution Certificate (PUC)',
    mandatory: true,
    flagKey: 'pucVerified',
    sampleNum: 'PUC-MH-998811',
    description: 'Emission compliance certificate under CMVR 1989 Form 59',
  },
  {
    type: 'FITNESS',
    label: 'Vehicle Fitness Certificate (Form 38)',
    shortLabel: 'Fitness Certificate',
    mandatory: true,
    flagKey: 'fitnessVerified',
    sampleNum: 'MH-FIT-8891-2024',
    description: 'Mandatory mechanical roadworthiness for commercial transport vehicles',
  },
  {
    type: 'PERMIT',
    label: 'Goods Carriage Route Permit (Form 47)',
    shortLabel: 'Route Permit',
    mandatory: true,
    flagKey: 'permitVerified',
    sampleNum: 'MH-NP-4491-2024',
    description: 'National / State agricultural goods carriage permit',
  },
  {
    type: 'ROAD_TAX',
    label: 'Motor Vehicle Road Tax Token',
    shortLabel: 'Road Tax Token',
    mandatory: false,
    flagKey: 'taxVerified',
    sampleNum: 'MV-TAX-2026-27',
    description: 'State Motor Vehicle tax payment receipt / token',
  },
];

/**
 * Calculate expiry status and day differences for a statutory document or DL
 */
export function getExpiryStatus(expiryDate) {
  if (!expiryDate) {
    return {
      status: 'NOT_SET',
      label: 'No Expiry Set',
      isExpired: false,
      isExpiringSoon: false,
      badgeText: 'NO EXPIRY DATE',
      badgeClass: 'bg-gray-100 text-gray-600 border border-gray-300',
    };
  }

  const exp = new Date(expiryDate);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const expDay = new Date(exp.getFullYear(), exp.getMonth(), exp.getDate());
  const diffDays = Math.round((expDay - today) / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return {
      status: 'EXPIRED',
      isExpired: true,
      diffDays,
      label: `Expired on ${exp.toLocaleDateString()} (${Math.abs(diffDays)}d ago)`,
      badgeText: '🚨 EXPIRED',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold animate-pulse',
    };
  }

  if (diffDays <= 30) {
    return {
      status: 'EXPIRING_SOON',
      isExpiringSoon: true,
      diffDays,
      label: `Expiring in ${diffDays} day${diffDays === 1 ? '' : 's'} (${exp.toLocaleDateString()})`,
      badgeText: `⚠️ EXPIRING (${diffDays}d)`,
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
    };
  }

  return {
    status: 'VALID',
    isValid: true,
    diffDays,
    label: `Valid till ${exp.toLocaleDateString()}`,
    badgeText: '✓ VALID',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold',
  };
}

/**
 * Determine overall vehicle statutory compliance and allocation eligibility.
 * Any expired document automatically sets canAllocate: false.
 */
export function getVehicleComplianceSummary(vehicle) {
  const docs = vehicle?.documents || [];
  const now = new Date();

  const expiredDocs = docs.filter((d) => d.expiryDate && new Date(d.expiryDate) < now);
  const expiringSoonDocs = docs.filter((d) => {
    if (!d.expiryDate) return false;
    const exp = new Date(d.expiryDate);
    const diff = Math.round((exp - now) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 30;
  });

  const hasExpired = expiredDocs.length > 0;
  const isRejected = vehicle?.verificationStatus === 'REJECTED';

  if (hasExpired) {
    return {
      canAllocate: false,
      status: 'EXPIRED',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      badgeText: `🚨 EXPIRED (${expiredDocs.length}) — ALLOCATION BLOCKED`,
      reason: `Statutory certificate(s) [${expiredDocs.map((d) => d.docType).join(', ')}] expired. Motor Vehicles Act compliance requires renewal.`,
      expiredDocs,
      expiringSoonDocs,
    };
  }

  if (isRejected) {
    return {
      canAllocate: false,
      status: 'REJECTED',
      badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold',
      badgeText: '✕ REJECTED — BLOCKED',
      reason: vehicle?.adminRemarks || vehicle?.rejectionReason || 'Rejected by compliance auditor',
      expiredDocs: [],
      expiringSoonDocs,
    };
  }

  if (expiringSoonDocs.length > 0) {
    return {
      canAllocate: true,
      status: 'EXPIRING_SOON',
      badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold',
      badgeText: `⚠️ EXPIRING SOON (${expiringSoonDocs.length})`,
      reason: `Expiring soon: ${expiringSoonDocs.map((d) => d.docType).join(', ')}`,
      expiredDocs: [],
      expiringSoonDocs,
    };
  }

  return {
    canAllocate: true,
    status: 'COMPLIANT',
    badgeClass: 'bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold',
    badgeText: '✓ STATUTORY COMPLIANT',
    reason: 'All statutory certificates verified and active',
    expiredDocs: [],
    expiringSoonDocs: [],
  };
}

