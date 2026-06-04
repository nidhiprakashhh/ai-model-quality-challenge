import { useState, useEffect } from "react";
import { loadAllPreloadedSweeps, parseUploadedFile } from "./utils/parseXlsx";
import { groupSweepsByModel, getModelNames } from "./utils/dataModel";
import CustomerView from "./components/CustomerView";
import EngineerView from "./components/EngineerView";
import FileUpload from "./components/FileUpload";
import ModelSelector from "./components/ModelSelector";

export default function App() {
  const [, setSweeps] = useState([]);
  const [groupedData, setGroupedData] = useState({});
  const [modelNames, setModelNames] = useState([]);
  const [selectedModels, setSelectedModels] = useState([]);
  const [activeView, setActiveView] = useState("customer"); // "customer" | "engineer"
  const [selectedProfile, setSelectedProfile] = useState(1);
  const [selectedBatchSize, setSelectedBatchSize] = useState(10);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load all preloaded sweeps on startup
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const loaded = await loadAllPreloadedSweeps();
        addSweeps(loaded);
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
      // Auto-select first two models for comparison
      setSelectedModels(prev =>
        prev.length === 0 ? names.slice(0, 2) : prev
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
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
        <div className="text-center">
          <div className="text-2xl font-bold text-[#FF4B00] mb-2">
            Cerebras
          </div>
          <div className="text-gray-600">Loading performance data...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F5F0E8]">
        <div className="text-center text-red-600">
          <div className="font-bold mb-2">Error</div>
          <div>{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F5F0E8]">
      {/* Header */}
      <header className="bg-black text-white px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-[#FF4B00] text-2xl font-bold">Cerebras</span>
          <span className="text-gray-400 text-sm">Performance Explorer</span>
        </div>
        <FileUpload onUpload={handleUpload} />
      </header>

      {/* View Toggle */}
      <div className="bg-white border-b border-gray-200 px-6 py-3 flex items-center gap-4">
        <button
          onClick={() => setActiveView("customer")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeView === "customer"
              ? "bg-[#FF4B00] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Customer View
        </button>
        <button
          onClick={() => setActiveView("engineer")}
          className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
            activeView === "engineer"
              ? "bg-[#FF4B00] text-white"
              : "bg-gray-100 text-gray-600 hover:bg-gray-200"
          }`}
        >
          Engineer View
        </button>
        <div className="ml-auto">
          <ModelSelector
            modelNames={modelNames}
            selectedModels={selectedModels}
            onToggle={toggleModel}
          />
        </div>
      </div>

      {/* Main Content */}
      <main className="px-6 py-6">
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
