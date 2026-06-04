import { PROFILE_METADATA } from "../utils/dataModel";

export default function ProfileSelector({ selectedProfile, onProfileChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-gray-700">Traffic Profile</span>
      <div className="flex flex-wrap gap-2">
        {Object.entries(PROFILE_METADATA).map(([num, meta]) => (
          <button
            key={num}
            onClick={() => onProfileChange(parseInt(num))}
            title={meta.description}
            className={`px-3 py-2 rounded-lg text-xs font-medium border transition-colors text-left ${
              selectedProfile === parseInt(num)
                ? "bg-[#FF4B00] text-white border-[#FF4B00]"
                : "bg-white text-gray-600 border-gray-300 hover:border-[#FF4B00]"
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>
      {PROFILE_METADATA[selectedProfile] && (
        <p className="text-xs text-gray-500 mt-1">
          {PROFILE_METADATA[selectedProfile].description}
        </p>
      )}
    </div>
  );
}
