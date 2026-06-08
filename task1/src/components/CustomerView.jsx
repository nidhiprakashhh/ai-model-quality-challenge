import { CUSTOMER_METRICS, PROFILE_METADATA, getGoNoGoStatus, getDataPoint, getBatchSizes, formatMetricValue } from "../utils/dataModel";
import ProfileSelector from "./ProfileSelector";

const STATUS_COLORS = {
  green:   "bg-[#EDF7F0] border-[#4A7C59] text-[#4A7C59]",
  yellow:  "bg-[#FEFCE8] border-[#B8860B] text-[#B8860B]",
  red:     "bg-[#FEF2F0] border-[#C0392B] text-[#C0392B]",
  unknown: "bg-[#F9F7F4] border-[#E8E2D9] text-[#403D39]",
};

const STATUS_LABELS = {
  green:   "✓ Meets requirement",
  yellow:  "⚠ Borderline",
  red:     "✗ Does not meet requirement",
  unknown: "No data",
};

const STATUS_DOT = {
  green:   "bg-[#4A7C59]",
  yellow:  "bg-[#B8860B]",
  red:     "bg-[#C0392B]",
  unknown: "bg-[#C4B9AE]",
};

function MetricCard({ metricKey, label, value, status }) {
  return (
    <div className={`rounded-lg border p-3 relative ${STATUS_COLORS[status]}`}>
      <span className={`absolute top-2 right-2 w-2 h-2 rounded-full ${STATUS_DOT[status]}`} />
      <div style={{
        fontSize: '11px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
        marginBottom: '4px',
        color: 'inherit',
      }}>
        {label}
      </div>
      <div style={{ fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
        {formatMetricValue(metricKey, value)}
      </div>
      <div style={{ fontSize: '11px', fontWeight: 500 }}>
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

  const badgeStyles = {
    green:   "bg-[#EDF7F0] text-[#4A7C59] border border-[#4A7C59]",
    yellow:  "bg-[#FEFCE8] text-[#B8860B] border border-[#B8860B]",
    red:     "bg-[#FEF2F0] text-[#C0392B] border border-[#C0392B]",
    unknown: "bg-[#F9F7F4] text-[#403D39] border border-[#E8E2D9]",
  };

  const badgeLabel = {
    green:   "GO",
    yellow:  "REVIEW",
    red:     "NO GO",
    unknown: "NO DATA",
  };

  return (
    <div
      className="bg-white rounded-xl border border-[#E8E2D9] p-5"
      style={{ boxShadow: '0 1px 4px rgba(37,34,34,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-base font-semibold text-[#252422]">{modelName}</h3>
        <div className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${badgeStyles[overallStatus]}`}>
          {badgeLabel[overallStatus]}
        </div>
      </div>

      {!dataPoint ? (
        <div className="text-[#403D39] text-sm py-4 text-center">
          Uploaded model sweep does not include this configuration
        </div>
      ) : (
        <div className="grid grid-cols-3 gap-2.5">
          {CUSTOMER_METRICS.map(metric => {
            const value = dataPoint[metric.key];
            const status = getGoNoGoStatus(metric.key, value);
            return (
              <MetricCard
                key={metric.key}
                metricKey={metric.key}
                label={metric.label}
                value={value}
                status={status}
              />
            );
          })}
        </div>
      )}

      <div className="mt-3 text-[11px] text-[#403D39]">
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
  const firstModel = selectedModels[0];
  const availableBatchSizes = firstModel
    ? getBatchSizes(groupedData, firstModel, selectedProfile)
    : [10, 20, 30, 40];

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div
        className="bg-white rounded-xl border border-[#E8E2D9] p-5 space-y-4"
        style={{ boxShadow: '0 1px 4px rgba(37,34,34,0.06)' }}
      >
        <ProfileSelector
          selectedProfile={selectedProfile}
          onProfileChange={(p) => {
            onProfileChange(p);
            onBatchSizeChange(10);
          }}
        />
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[#403D39]">
            Concurrent Users (Batch Size)
          </span>
          <div className="flex gap-2">
            {availableBatchSizes.map(size => (
              <button
                key={size}
                onClick={() => onBatchSizeChange(size)}
                className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${
                  selectedBatchSize === size
                    ? "bg-[#252422] text-white border-[#252422]"
                    : "bg-white text-[#403D39] border-[#E8E2D9] hover:border-[#252422]"
                }`}
              >
                {size}
              </button>
            ))}
          </div>
        </div>

        {PROFILE_METADATA[selectedProfile] && (
          <div className="bg-[#F4F1DE] rounded-lg p-3 text-sm text-[#403D39]">
            <span className="font-medium">Selected workload: </span>
            {PROFILE_METADATA[selectedProfile].description}
            <span className="ml-2 text-xs text-[#403D39]">
              ({PROFILE_METADATA[selectedProfile].inputLength.toLocaleString()} input tokens,{" "}
              {PROFILE_METADATA[selectedProfile].outputLength.toLocaleString()} output tokens,{" "}
              {PROFILE_METADATA[selectedProfile].cachePercent * 100}% cache)
            </span>
          </div>
        )}
      </div>

      {/* Model Cards */}
      {selectedModels.length === 0 ? (
        <div className="text-center text-[#403D39] py-12">
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
      <div className="flex gap-6 text-sm" style={{ color: '#403D39', fontWeight: 500 }}>
        <div className="flex items-center gap-2">
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#4A7C59', display: 'inline-block', flexShrink: 0 }} />
          GO — meets performance threshold
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#B8860B', display: 'inline-block', flexShrink: 0 }} />
          REVIEW — borderline, discuss with engineer
        </div>
        <div className="flex items-center gap-2">
          <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: '#C0392B', display: 'inline-block', flexShrink: 0 }} />
          NO GO — does not meet threshold
        </div>
      </div>
    </div>
  );
}
