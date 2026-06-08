import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { detectAnomalies } from "../utils/anomalyDetection";
import { PROFILE_METADATA } from "../utils/dataModel";
import ProfileSelector from "./ProfileSelector";

const ALL_COLUMNS = [
  "Batch Size",
  "TTFT (ms)",
  "Gen Speed (t/s/user)",
  "RPM",
  "Throughput (t/s)",
  "Throughput / box (t/s/hardware)",
  "Prompt only Throughput (t/s)",
  "Gen only Throughput (t/s)",
  "Uncached Throughput (t/s)",
  "Uncached Throughput / box (t/s/hardware)",
  "Cached Throughput (t/s)",
  "Cached Throughput / box (t/s/hardware)",
  "Real Prompt Speed (t/s/user)",
  "Prompt Speed with Queueing (t/s/user)",
  "Max number of milliseconds",
  "Target Max number of milliseconds",
];

const MODEL_COLORS = [
  "#E07A5F", "#252422", "#2563eb", "#4A7C59",
  "#9333ea", "#C0392B", "#0891b2", "#B8860B",
  "#db2777", "#65a30d", "#7c3aed",
];

function DataTable({ data }) {
  if (!data || data.length === 0) return (
    <p className="text-sm text-[#403D39] py-4">
      No data for this configuration.
    </p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="bg-[#252422] text-white">
            {ALL_COLUMNS.map(col => (
              <th
                key={col}
                className="px-3 py-2 text-left whitespace-nowrap font-medium"
              >
                {col}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr
              key={i}
              className={i % 2 === 0 ? "bg-white" : "bg-[#F9F7F4]"}
            >
              {ALL_COLUMNS.map(col => (
                <td key={col} className="px-3 py-2 whitespace-nowrap text-[#403D39]">
                  {row[col] !== null && row[col] !== undefined
                    ? typeof row[col] === "number"
                      ? row[col].toLocaleString(undefined, { maximumFractionDigits: 2 })
                      : row[col]
                    : "—"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ChartSection({ groupedData, selectedModels, selectedProfile }) {
  const chartData = [10, 20, 30, 40].map(batchSize => {
    const point = { batchSize };
    for (const modelName of selectedModels) {
      const profileData = groupedData[modelName]?.[selectedProfile];
      if (!profileData) continue;
      const row = profileData.find(r => r["Batch Size"] === batchSize);
      if (row) {
        point[`${modelName}_genSpeed`] = row["Gen Speed (t/s/user)"];
        point[`${modelName}_ttft`] = row["TTFT (ms)"];
      }
    }
    return point;
  }).filter(p => Object.keys(p).length > 1);

  if (chartData.length === 0) return null;

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
      <div
        className="bg-white rounded-xl border border-[#E8E2D9] p-5"
        style={{ boxShadow: '0 1px 4px rgba(37,34,34,0.06)' }}
      >
        <h4 className="font-semibold text-[#252422] mb-4">
          Gen Speed (tok/s) vs Batch Size
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D9" />
            <XAxis
              dataKey="batchSize"
              label={{ value: "Batch Size", position: "insideBottom", offset: -5 }}
              tick={{ fill: '#403D39', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#403D39', fontSize: 11 }} />
            <Tooltip formatter={(val) => val?.toFixed(1)} />
            <Legend wrapperStyle={{ paddingTop: '10px', bottom: 0 }} />
            {selectedModels.map((modelName, i) => (
              <Line
                key={modelName}
                type="monotone"
                dataKey={`${modelName}_genSpeed`}
                name={modelName}
                stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {chartData.length === 1 && (
          <p className="text-xs text-[#403D39] mt-2 text-center">
            Single data point — this profile does not support batch scaling.
          </p>
        )}
      </div>

      <div
        className="bg-white rounded-xl border border-[#E8E2D9] p-5"
        style={{ boxShadow: '0 1px 4px rgba(37,34,34,0.06)' }}
      >
        <h4 className="font-semibold text-[#252422] mb-4">
          TTFT (ms) vs Batch Size
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: 10, bottom: 40 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E8E2D9" />
            <XAxis
              dataKey="batchSize"
              label={{ value: "Batch Size", position: "insideBottom", offset: -5 }}
              tick={{ fill: '#403D39', fontSize: 11 }}
            />
            <YAxis tick={{ fill: '#403D39', fontSize: 11 }} />
            <Tooltip formatter={(val) => val?.toFixed(1)} />
            <Legend wrapperStyle={{ paddingTop: '10px', bottom: 0 }} />
            {selectedModels.map((modelName, i) => (
              <Line
                key={modelName}
                type="monotone"
                dataKey={`${modelName}_ttft`}
                name={modelName}
                stroke={MODEL_COLORS[i % MODEL_COLORS.length]}
                strokeWidth={2}
                dot={{ r: 4 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
        {chartData.length === 1 && (
          <p className="text-xs text-[#403D39] mt-2 text-center">
            Single data point — this profile does not support batch scaling.
          </p>
        )}
      </div>
    </div>
  );
}

export default function EngineerView({
  groupedData,
  selectedModels,
  selectedProfile,
  onProfileChange,
}) {
  const [expandedModel, setExpandedModel] = useState(null);
  const [collapsedModels, setCollapsedModels] = useState({});

  function toggleModelCollapse(modelName) {
    setCollapsedModels(prev => ({
      ...prev,
      [modelName]: !prev[modelName],
    }));
  }

  const allAnomalies = selectedModels.flatMap(modelName => {
    const profilesData = groupedData[modelName] ?? {};
    return detectAnomalies(profilesData).map(a => ({
      ...a,
      modelName,
    }));
  });

  const anomaliesByModel = allAnomalies.reduce((acc, a) => {
    if (!acc[a.modelName]) acc[a.modelName] = [];
    acc[a.modelName].push(a);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      {/* Profile Selector */}
      <div
        className="bg-white rounded-xl border border-[#E8E2D9] p-5"
        style={{ boxShadow: '0 1px 4px rgba(37,34,34,0.06)' }}
      >
        <ProfileSelector
          selectedProfile={selectedProfile}
          onProfileChange={onProfileChange}
        />
        <p className="text-sm text-[#403D39] mt-2">
          Showing all batch sizes — select a profile to filter by workload type.
        </p>
      </div>

      {/* Anomaly Flags */}
      {allAnomalies.length > 0 && (
        <div
          className="bg-white rounded-xl border border-[#E8E2D9] p-5 space-y-2"
          style={{ boxShadow: '0 1px 4px rgba(37,34,34,0.06)' }}
        >
          <div className="flex items-center gap-2 mb-3">
            <span className="text-yellow-600">⚠</span>
            <h3 className="font-semibold text-[#252422]">
              Anomalies Detected ({allAnomalies.length})
            </h3>
            <span className="text-xs text-[#403D39]">
              Flagged across all traffic profiles for selected models.
            </span>
          </div>
          {Object.entries(anomaliesByModel).map(([modelName, modelAnomalies]) => (
            <div key={modelName} className="border border-[#E8E2D9] rounded-lg overflow-hidden">
              <button
                onClick={() => toggleModelCollapse(modelName)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-[#F9F7F4] hover:bg-[#F4F1DE] transition-colors text-left"
              >
                <span className="text-sm font-medium text-[#252422]">{modelName}</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#403D39]">
                    {modelAnomalies.length} issue{modelAnomalies.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-[#403D39] text-xs">
                    {collapsedModels[modelName] ? '▶' : '▼'}
                  </span>
                </div>
              </button>
              {!collapsedModels[modelName] && (
                <div className="divide-y divide-[#F4F1DE]">
                  {modelAnomalies.map((anomaly, i) => (
                    <div key={i} className="flex items-start gap-2.5 px-4 py-2.5">
                      <span className="text-yellow-500 text-xs mt-0.5">⚠</span>
                      <span className="text-sm text-[#403D39]">{anomaly.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Charts */}
      <ChartSection
        groupedData={groupedData}
        selectedModels={selectedModels}
        selectedProfile={selectedProfile}
      />

      {/* Data Tables per model */}
      <div className="space-y-4">
        {selectedModels.map(modelName => {
          const profileData = groupedData[modelName]?.[selectedProfile] ?? [];
          const isExpanded = expandedModel === modelName;

          return (
            <div
              key={modelName}
              className="bg-white rounded-xl border border-[#E8E2D9]"
              style={{ boxShadow: '0 1px 4px rgba(37,34,34,0.06)' }}
            >
              <button
                onClick={() => setExpandedModel(isExpanded ? null : modelName)}
                className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-[#F9F7F4] rounded-xl transition-colors"
              >
                <span className="font-semibold text-[#252422]">{modelName}</span>
                <span className="text-[#403D39] text-sm">
                  {isExpanded ? "▲ Hide" : "▼ Show full data"}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-[#E8E2D9] p-5">
                  {PROFILE_METADATA[selectedProfile] && (
                    <div style={{
                      fontSize: '13px',
                      color: '#403D39',
                      fontWeight: 500,
                      marginBottom: '12px',
                      padding: '8px 12px',
                      background: '#F4F1DE',
                      borderRadius: '8px',
                    }}>
                      Profile spec:{' '}
                      {PROFILE_METADATA[selectedProfile].inputLength.toLocaleString()} input tokens
                      {' · '}
                      {PROFILE_METADATA[selectedProfile].outputLength.toLocaleString()} output tokens
                      {' · '}
                      {PROFILE_METADATA[selectedProfile].cachePercent * 100}% cache
                    </div>
                  )}
                  <DataTable data={profileData} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
