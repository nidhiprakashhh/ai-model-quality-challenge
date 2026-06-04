import { CUSTOMER_METRICS, PROFILE_METADATA, getGoNoGoStatus, getDataPoint, getBatchSizes, formatMetricValue } from "../utils/dataModel";
import ProfileSelector from "./ProfileSelector";

const STATUS_COLORS = {
  green: "bg-green-100 border-green-400 text-green-800",
  yellow: "bg-yellow-100 border-yellow-400 text-yellow-800",
  red: "bg-red-100 border-red-400 text-red-800",
  unknown: "bg-gray-100 border-gray-300 text-gray-600",
};

const STATUS_LABELS = {
  green: "✓ Meets requirement",
  yellow: "⚠ Borderline",
  red: "✗ Does not meet requirement",
  unknown: "No data",
};

const STATUS_DOT = {
  green: "bg-green-500",
  yellow: "bg-yellow-500",
  red: "bg-red-500",
  unknown: "bg-gray-400",
};

function MetricCard({ metricKey, label, value, status }) {
  return (
    <div className={`rounded-lg border-2 p-4 ${STATUS_COLORS[status]}`}>
      <div className="text-xs font-medium uppercase tracking-wide opacity-70 mb-1">
        {label}
      </div>
      <div className="text-2xl font-bold mb-1">
        {formatMetricValue(metricKey, value)}
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className={`w-2 h-2 rounded-full inline-block ${STATUS_DOT[status]}`} />
        {STATUS_LABELS[status]}
      </div>
    </div>
  );
}

function ModelCard({ modelName, dataPoint, batchSize }) {
  const overallStatus = CUSTOMER_METRICS.reduce((worst, metric) => {
    const value = dataPoint?.[metric.key];
    const status = getGoNoGoStatus(metric.key, value);
    const order = { green: 0, yellow: 1, red: 2, unknown: 3 };
    return order[status] > order[worst] ? status : worst;
  }, "green");

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-black">{modelName}</h3>
        <div className={`px-3 py-1 rounded-full text-xs font-bold border-2 ${STATUS_COLORS[overallStatus]}`}>
          {overallStatus === "green" ? "GO" : overallStatus === "red" ? "NO GO" : "REVIEW"}
        </div>
      </div>

      {!dataPoint ? (
        <div className="text-gray-400 text-sm">No data for this configuration</div>
      ) : (
        <div className="grid grid-cols-3 gap-3">
          {CUSTOMER_METRICS.map(metric => {
            const value = dataPoint[metric.key];
            const status = getGoNoGoStatus(metric.key, value);
            return (
              <MetricCard
                key={metric.key}
                metricKey={metric.key}
                label={metric.label}
                unit={metric.unit}
                value={value}
                status={status}
              />
            );
          })}
        </div>
      )}

      <div className="mt-3 text-xs text-gray-400">
        Batch size: {batchSize} concurrent requests
      </div>
    </div>
  );
}

export default function CustomerView({
  groupedData,
  selectedModels,
  selectedProfile,
  selectedBatchSize,
  onProfileChange,
  onBatchSizeChange,
}) {
  // Get available batch sizes from first selected model
  const firstModel = selectedModels[0];
  const availableBatchSizes = firstModel
    ? getBatchSizes(groupedData, firstModel, selectedProfile)
    : [10, 20, 30, 40];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 space-y-4">
        <ProfileSelector
          selectedProfile={selectedProfile}
          onProfileChange={(p) => {
            onProfileChange(p);
            onBatchSizeChange(10);
          }}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-gray-700">
            Concurrent Users (Batch Size)
          </span>
          <div className="flex gap-2">
            {availableBatchSizes.map(size => (
              <button
                key={size}
                onClick={() => onBatchSizeChange(size)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedBatchSize === size
                    ? "bg-black text-white border-black"
                    : "bg-white text-gray-600 border-gray-300 hover:border-black"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {/* Profile summary */}
        {PROFILE_METADATA[selectedProfile] && (
          <div className="bg-[#F5F0E8] rounded-lg p-3 text-sm text-gray-600">
            <span className="font-medium">Selected workload: </span>
            {PROFILE_METADATA[selectedProfile].description}
            <span className="ml-2 text-xs text-gray-400">
              ({PROFILE_METADATA[selectedProfile].inputLength.toLocaleString()} input tokens,{" "}
              {PROFILE_METADATA[selectedProfile].outputLength.toLocaleString()} output tokens,{" "}
              {PROFILE_METADATA[selectedProfile].cachePercent * 100}% cache)
            </span>
          </div>
        )}
      </div>

      {/* Model Cards */}
      {selectedModels.length === 0 ? (
        <div className="text-center text-gray-400 py-12">
          Select at least one model to compare
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {selectedModels.map(modelName => {
            const dataPoint = getDataPoint(
              groupedData,
              modelName,
              selectedProfile,
              selectedBatchSize
            );
            return (
              <ModelCard
                key={modelName}
                modelName={modelName}
                dataPoint={dataPoint}
                batchSize={selectedBatchSize}
              />
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex gap-4 text-xs text-gray-500">
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          GO — meets performance threshold
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-yellow-500 inline-block" />
          REVIEW — borderline, discuss with engineer
        </div>
        <div className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
          NO GO — does not meet threshold
        </div>
      </div>
    </div>
  );
}
