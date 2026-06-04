/**
 * Anomaly detection for the engineer view.
 * Flags suspicious patterns in performance projections.
 */

/**
 * Check if TTFT decreases appropriately as cache % increases.
 * High cache should mean faster TTFT — if it doesn't, flag it.
 */
function checkCacheVsTTFT(profilesData) {
  const anomalies = [];

  const profilePairs = [
    { low: 3, high: 6 },
    { low: 4, high: 7 },
  ];

  for (const pair of profilePairs) {
    const lowCacheData = profilesData[pair.low]?.[0];
    const highCacheData = profilesData[pair.high]?.[0];

    if (!lowCacheData || !highCacheData) continue;

    const lowTTFT = lowCacheData['TTFT (ms)'];
    const highTTFT = highCacheData['TTFT (ms)'];

    if (lowTTFT && highTTFT && highTTFT > lowTTFT * 0.9) {
      anomalies.push({
        type: 'cache_ttft_mismatch',
        severity: 'warning',
        message: `Profile ${pair.high} has higher cache % than Profile ${pair.low} but TTFT did not improve (${Math.round(highTTFT)}ms vs ${Math.round(lowTTFT)}ms). Verify projection assumptions.`,
        profiles: [pair.low, pair.high],
      });
    }
  }

  return anomalies;
}

/**
 * Check throughput/box consistency across batch sizes.
 * Only flag if variance exceeds 40% — reduced sensitivity to avoid noise.
 * Groups all profiles into one summary flag instead of per-profile flags.
 */
function checkThroughputConsistency(profilesData) {
  const inconsistentProfiles = [];

  for (const [profileNum, profileData] of Object.entries(profilesData)) {
    if (!profileData || profileData.length < 2) continue;

    const values = profileData
      .map(row => row['Throughput / box (t/s/hardware)'])
      .filter(v => v !== null && v !== undefined);

    if (values.length < 2) continue;

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const maxDeviation = Math.max(...values.map(v => Math.abs(v - mean) / mean));

    if (maxDeviation > 0.4) {
      inconsistentProfiles.push({
        profile: profileNum,
        deviation: maxDeviation,
      });
    }
  }

  if (inconsistentProfiles.length === 0) return [];

  // Group into single flag
  const profileList = inconsistentProfiles
    .map(p => `Profile ${p.profile} (${(p.deviation * 100).toFixed(0)}% variance)`)
    .join(', ');

  return [{
    type: 'throughput_inconsistency',
    severity: 'warning',
    message: `Throughput/box varies significantly across batch sizes in: ${profileList}. May indicate projection errors worth reviewing.`,
  }];
}

/**
 * Check if Gen Speed drops significantly between consecutive batch sizes.
 * Only flag drops greater than 20% to reduce noise.
 */
function checkGenSpeedScaling(profilesData) {
  const anomalies = [];

  for (const [profileNum, profileData] of Object.entries(profilesData)) {
    if (!profileData || profileData.length < 3) continue;

    const sorted = [...profileData].sort((a, b) =>
      (a['Batch Size'] ?? 0) - (b['Batch Size'] ?? 0)
    );

    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1]['Gen Speed (t/s/user)'];
      const curr = sorted[i]['Gen Speed (t/s/user)'];
      const prevBatch = sorted[i - 1]['Batch Size'];
      const currBatch = sorted[i]['Batch Size'];

      if (prev && curr && curr < prev * 0.80) {
        anomalies.push({
          type: 'gen_speed_drop',
          severity: 'warning',
          message: `Profile ${profileNum}: Gen Speed drops sharply from batch ${prevBatch} (${Math.round(prev)} tok/s) to batch ${currBatch} (${Math.round(curr)} tok/s). Check for capacity ceiling.`,
          profiles: [parseInt(profileNum)],
        });
      }
    }
  }

  return anomalies;
}

/**
 * Run all anomaly checks for a model across all its profiles.
 *
 * @param {Object} profilesData - { profileNumber: [rows], ... }
 * @returns {Array} list of anomaly objects
 */
export function detectAnomalies(profilesData) {
  const anomalies = [];

  anomalies.push(...checkCacheVsTTFT(profilesData));
  anomalies.push(...checkThroughputConsistency(profilesData));
  anomalies.push(...checkGenSpeedScaling(profilesData));

  return anomalies;
}

/**
 * Get anomaly severity color for display
 */
export function getAnomalySeverityColor(severity) {
  switch (severity) {
    case 'error': return 'red';
    case 'warning': return 'yellow';
    default: return 'gray';
  }
}
