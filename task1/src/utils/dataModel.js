/**
 * Profile metadata — plain English labels and descriptions
 * for customer-facing display
 */
export const PROFILE_METADATA = {
  1: {
    label: 'Profile 1 — RAG / Search',
    description: 'Long input with moderate responses and partial caching. Typical for retrieval-augmented search applications.',
    inputLength: 10000,
    outputLength: 333,
    cachePercent: 0.5,
  },
  2: {
    label: 'Profile 2 — Document Generation',
    description: 'Long input with very long output, no caching. Typical for document summarization or long-form generation.',
    inputLength: 10000,
    outputLength: 4000,
    cachePercent: 0,
  },
  3: {
    label: 'Profile 3 — Standard Chat',
    description: 'Medium input with short responses and partial caching. Typical for general Q&A and chat applications.',
    inputLength: 3200,
    outputLength: 400,
    cachePercent: 0.5,
  },
  4: {
    label: 'Profile 4 — Conversational AI',
    description: 'Balanced input and output with partial caching. Typical for interactive conversational assistants.',
    inputLength: 1000,
    outputLength: 1000,
    cachePercent: 0.5,
  },
  5: {
    label: 'Profile 5 — Document Analysis',
    description: 'Long input with moderate output and partial caching. Typical for code review and document analysis.',
    inputLength: 8000,
    outputLength: 1000,
    cachePercent: 0.5,
  },
  6: {
    label: 'Profile 6 — Large Knowledge Base RAG',
    description: 'Very long input with high cache rate. Typical for enterprise RAG over large knowledge bases.',
    inputLength: 60000,
    outputLength: 200,
    cachePercent: 0.9,
  },
  7: {
    label: 'Profile 7 — Complex Reasoning',
    description: 'Long input and output with high caching. Typical for multi-step reasoning and long-form generation.',
    inputLength: 17000,
    outputLength: 3500,
    cachePercent: 0.7,
  },
};

/**
 * The three metrics customers care about.
 * Everything else is for engineers only.
 */
export const CUSTOMER_METRICS = [
  {
    key: 'Gen Speed (t/s/user)',
    label: 'Gen Speed',
    unit: 'tok/s',
    description: 'How fast text appears to the user',
    higherIsBetter: true,
  },
  {
    key: 'TTFT (ms)',
    label: 'Time to First Token',
    unit: 'ms',
    description: 'How long before anything appears',
    higherIsBetter: false,
  },
  {
    key: 'RPM',
    label: 'Requests / Min',
    unit: 'rpm',
    description: 'Total request capacity per minute',
    higherIsBetter: true,
  },
];

/**
 * Default thresholds for go/no-go indicators.
 * Green = meets threshold, Yellow = borderline, Red = does not meet.
 */
export const DEFAULT_THRESHOLDS = {
  'Gen Speed (t/s/user)': { green: 800, yellow: 400 },
  'TTFT (ms)': { green: 50, yellow: 200 }, // lower is better
  'RPM': { green: 1000, yellow: 500 },
};

/**
 * Get go/no-go status for a metric value
 */
export function getGoNoGoStatus(metricKey, value) {
  const threshold = DEFAULT_THRESHOLDS[metricKey];
  if (!threshold || value === null || value === undefined) return 'unknown';

  const { green, yellow } = threshold;
  const higherIsBetter = CUSTOMER_METRICS.find(m => m.key === metricKey)?.higherIsBetter;

  if (higherIsBetter) {
    if (value >= green) return 'green';
    if (value >= yellow) return 'yellow';
    return 'red';
  } else {
    // Lower is better (TTFT)
    if (value <= green) return 'green';
    if (value <= yellow) return 'yellow';
    return 'red';
  }
}

/**
 * Given all parsed sweeps, group them by model and profile
 * Returns: { 'Model A': { 1: [...rows], 2: [...rows], ... }, ... }
 */
export function groupSweepsByModel(sweeps) {
  const grouped = {};
  for (const sweep of sweeps) {
    if (!grouped[sweep.modelName]) {
      grouped[sweep.modelName] = {};
    }
    grouped[sweep.modelName][sweep.profileNumber] = sweep.data;
  }
  return grouped;
}

/**
 * Get all unique model names from sweeps, sorted
 */
export function getModelNames(sweeps) {
  const names = [...new Set(sweeps.map(s => s.modelName))];
  return names.sort();
}

/**
 * Get data for a specific model, profile, and batch size
 */
export function getDataPoint(groupedSweeps, modelName, profileNumber, batchSize) {
  const profileData = groupedSweeps[modelName]?.[profileNumber];
  if (!profileData) return null;
  return profileData.find(row => row['Batch Size'] === batchSize) ?? profileData[0];
}

/**
 * Get all available batch sizes for a model+profile combination
 */
export function getBatchSizes(groupedSweeps, modelName, profileNumber) {
  const profileData = groupedSweeps[modelName]?.[profileNumber];
  if (!profileData) return [];
  return profileData
    .map(row => row['Batch Size'])
    .filter(Boolean)
    .sort((a, b) => a - b);
}

/**
 * Format a metric value for display
 */
export function formatMetricValue(metricKey, value) {
  if (value === null || value === undefined) return 'N/A';
  const metric = CUSTOMER_METRICS.find(m => m.key === metricKey);
  if (!metric) return value.toFixed(1);

  if (metricKey === 'TTFT (ms)') {
    return `${Math.round(value)} ms`;
  }
  if (metricKey === 'RPM') {
    return `${Math.round(value).toLocaleString()} rpm`;
  }
  return `${Math.round(value).toLocaleString()} tok/s`;
}
