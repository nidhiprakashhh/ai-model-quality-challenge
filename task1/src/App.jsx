import { useState, useEffect, useRef } from "react";
import { loadAllPreloadedSweeps, parseUploadedFile } from "./utils/parseXlsx";
import { groupSweepsByModel, getModelNames } from "./utils/dataModel";
import CustomerView from "./components/CustomerView";
import EngineerView from "./components/EngineerView";
import FileUpload from "./components/FileUpload";
import ModelSelector from "./components/ModelSelector";

export default function App() {
  const [, setSweeps] = useState([]);
  const isInitialLoad = useRef(true);
  const [groupedData, setGroupedData] = useState({});
  const [modelNames, setModelNames] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [activeView, setActiveView] = useState("customer");
  const [selectedProfile, setSelectedProfile] = useState(1);
  const [selectedBatchSize, setSelectedBatchSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const loaded = await loadAllPreloadedSweeps();
        addSweeps(loaded);
        isInitialLoad.current = false;
      } catch (err) {
        setError("Failed to load performance data: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  function addSweeps(newSweeps) {
    setSweeps(prev => {
      const combined = [...prev, ...newSweeps];
      const grouped = groupSweepsByModel(combined);
      const names = getModelNames(combined);
      setGroupedData(grouped);
      setModelNames(names);
      setSelectedModels(prev =>
        prev.length === 0 && isInitialLoad.current ? names.slice(0, 2) : prev
      );
      return combined;
    });
  }

  async function handleUpload(files) {
    try {
      const parsed = await Promise.all(
        Array.from(files).map(f => parseUploadedFile(f))
      );
      addSweeps(parsed);
    } catch (err) {
      setError("Failed to parse uploaded file: " + err.message);
    }
  }

  function toggleModel(modelName) {
    setSelectedModels(prev =>
      prev.includes(modelName)
        ? prev.filter(m => m !== modelName)
        : [...prev, modelName]
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1DE]">
        <div className="text-center">
          <div
            style={{ fontFamily: "'DM Serif Display', serif" }}
            className="text-2xl text-[#252422] mb-2"
          >
            Performance Explorer
          </div>
          <div className="text-[#403D39] text-sm">Loading performance data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F4F1DE]">
        <div className="text-center text-[#C0392B]">
          <div className="font-semibold mb-2">Error</div>
          <div className="text-sm">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F4F1DE]">
      {/* Header */}
      <header className="bg-[#F4F1DE] border-b border-[#E8E2D9] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: '28px',
            fontWeight: '900',
            color: '#252422',
            letterSpacing: '-0.5px',
            lineHeight: 1,
          }}>
            Performance Explorer
          </span>
        </div>
        <FileUpload onUpload={handleUpload} />
      </header>

      {/* View Toggle */}
      <div className="bg-[#F4F1DE] border-b border-[#E8E2D9] px-8 py-3 flex items-center gap-3">
        <div className="flex gap-1 bg-white rounded-lg p-1 border border-[#E8E2D9]">
          <button
            onClick={() => setActiveView("customer")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeView === "customer"
                ? "bg-[#E07A5F] text-white shadow-sm"
                : "text-[#403D39] hover:text-[#252422]"
            }`}
          >
            Customer View
          </button>
          <button
            onClick={() => setActiveView("engineer")}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all ${
              activeView === "engineer"
                ? "bg-[#E07A5F] text-white shadow-sm"
                : "text-[#403D39] hover:text-[#252422]"
            }`}
          >
            Engineer View
          </button>
        </div>
        <div className="ml-auto">
          <ModelSelector
            modelNames={modelNames}
            selectedModels={selectedModels}
            onToggle={toggleModel}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="px-8 py-6">
        {activeView === "customer" ? (
          <CustomerView
            groupedData={groupedData}
            selectedModels={selectedModels}
            selectedProfile={selectedProfile}
            selectedBatchSize={selectedBatchSize}
            onProfileChange={setSelectedProfile}
            onBatchSizeChange={setSelectedBatchSize}
          />
        ) : (
          <EngineerView
            groupedData={groupedData}
            selectedModels={selectedModels}
            selectedProfile={selectedProfile}
            onProfileChange={setSelectedProfile}
          />
        )}
      </main>
    </div>
  );
}
