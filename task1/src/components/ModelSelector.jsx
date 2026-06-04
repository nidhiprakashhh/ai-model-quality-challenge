export default function ModelSelector({ modelNames, selectedModels, onToggle }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-gray-500 mr-1">Models:</span>
      {modelNames.map(name => (
        <button
          key={name}
          onClick={() => onToggle(name)}
          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors ${
            selectedModels.includes(name)
              ? "bg-black text-white border-black"
              : "bg-white text-gray-600 border-gray-300 hover:border-black"
          }`}
        >
          {name}
        </button>
      ))}
    </div>
  );
}
