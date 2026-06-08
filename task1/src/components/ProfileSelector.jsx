import { PROFILE_METADATA } from "../utils/dataModel";

export default function ProfileSelector({ selectedProfile, onProfileChange }) {
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium text-[#252422]">Traffic Profile</span>
      <div className="flex flex-wrap gap-2">
        {Object.entries(PROFILE_METADATA).map(([num, meta]) => (
          <button
            key={num}
            onClick={() => onProfileChange(parseInt(num))}
            title={meta.description}
            className={`px-3 py-2 rounded-lg text-xs font-semibold border transition-colors text-left ${
              selectedProfile === parseInt(num)
                ? "bg-[#E07A5F] text-white border-[#E07A5F]"
                : "bg-white text-[#252422] border-[#E8E2D9] hover:border-[#E07A5F]"
            }`}
          >
            {meta.label}
          </button>
        ))}
      </div>
      {PROFILE_METADATA[selectedProfile] && (
        <p className="text-xs text-[#403D39] mt-1">
          {PROFILE_METADATA[selectedProfile].description}
        </p>
      )}
    </div>
  );
}
