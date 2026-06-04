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
import ProfileSelector from "./ProfileSelector";

const ALL_COLUMNS = [
  "Batch Size",
  "Input Length",
  "Output Length",
  "Cache %",
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

// Distinct colors for up to 11 models
const MODEL_COLORS = [
  "#FF4B00", "#1a1a1a", "#2563eb", "#16a34a",
  "#9333ea", "#dc2626", "#0891b2", "#d97706",
  "#db2777", "#65a30d", "#7c3aed",
];

function AnomalyBadge({ anomaly }) {
  return (
    <div className="flex items-start gap-2 bg-yellow-50 border border-yellow-200 rounded-lg p-3 text-sm">
      <span className="text-yellow-500 mt-0.5">⚠</span>
      <span className="text-yellow-800">{anomaly.message}</span>
    </div>
  );
}

function DataTable({ data }) {
  if (!data || data.length === 0) return (
    <p className="text-sm text-gray-400 py-4">
      No data for this configuration.
    </p>
  );

  return (
    <div className="overflow-x-auto">
      <table className="text-xs w-full border-collapse">
        <thead>
          <tr className="bg-black text-white">
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
              className={i % 2 === 0 ? "bg-white" : "bg-[#F5F0E8]"}
            >
              {ALL_COLUMNS.map(col => (
                <td key={col} className="px-3 py-2 whitespace-nowrap text-gray-700">
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
      {/* Gen Speed Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-black mb-4">
          Gen Speed (tok/s) vs Batch Size
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="batchSize"
              label={{ value: "Batch Size", position: "insideBottom", offset: -5 }}
            />
            <YAxis />
            <Tooltip formatter={(val) => val?.toFixed(1)} />
            <Legend />
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
          <p className="text-xs text-gray-400 mt-2 text-center">
            Single data point — this profile does not support batch scaling.
          </p>
        )}
      </div>

      {/* TTFT Chart */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h4 className="font-semibold text-black mb-4">
          TTFT (ms) vs Batch Size
        </h4>
        <ResponsiveContainer width="100%" height={250}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis
              dataKey="batchSize"
              label={{ value: "Batch Size", position: "insideBottom", offset: -5 }}
            />
            <YAxis />
            <Tooltip formatter={(val) => val?.toFixed(1)} />
            <Legend />
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
          <p className="text-xs text-gray-400 mt-2 text-center">
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

  // Collect anomalies for all selected models
  const allAnomalies = selectedModels.flatMap(modelName => {
    const profilesData = groupedData[modelName] ?? {};
    return detectAnomalies(profilesData).map(a => ({
      ...a,
      modelName,
    }));
  });

  return (
    <div className="space-y-6">
      {/* Profile Selector */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
        <ProfileSelector
          selectedProfile={selectedProfile}
          onProfileChange={onProfileChange}
        />
        <p className="text-sm text-gray-500 mt-2">
          Showing all batch sizes — select a profile to filter by workload type.
        </p>
      </div>

      {/* Anomaly Flags */}
      {allAnomalies.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-yellow-200 p-5">
          <div className="mb-3">
            <h3 className="font-semibold text-black flex items-center gap-2">
              <span className="text-yellow-500">⚠</span>
              Anomalies Detected ({allAnomalies.length})
            </h3>
            <p className="text-xs text-gray-500 mt-1 ml-5">
              Flagged across all traffic profiles for selected models.
            </p>
          </div>
          <div className="space-y-2">
            {allAnomalies.map((anomaly, i) => (
              <div key={i}>
                <span className="text-xs font-medium text-gray-500 mb-1 block">
                  {anomaly.modelName}
                </span>
                <AnomalyBadge anomaly={anomaly} />
              </div>
            ))}
          </div>
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
              className="bg-white rounded-xl shadow-sm border border-gray-200"
            >
              <button
                onClick={() =>
                  setExpandedModel(isExpanded ? null : modelName)
                }
                className="w-full flex items-center justify-between px-5 py-4 text-left"
              >
                <span className="font-semibold text-black">{modelName}</span>
                <span className="text-gray-400 text-sm">
                  {isExpanded ? "▲ Hide" : "▼ Show full data"}
                </span>
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 p-5">
                  <DataTable data={profileData} modelName={modelName} />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
