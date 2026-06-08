export default function ModelSelector({ modelNames, selectedModels, onToggle }) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <span className="text-sm text-[#403D39] mr-1">Models:</span>
      {modelNames.map(name => {
        const isSelected = selectedModels.includes(name);
        return (
          <button
            key={name}
            onClick={() => onToggle(name)}
            style={{
              backgroundColor: isSelected ? '#252422' : '#FFFFFF',
              color: isSelected ? '#FFFFFF' : '#403D39',
              border: `1px solid ${isSelected ? '#252422' : '#E8E2D9'}`,
              padding: '4px 12px',
              borderRadius: '9999px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => {
              if (!isSelected) {
                e.target.style.borderColor = '#252422';
                e.target.style.color = '#252422';
              }
            }}
            onMouseLeave={e => {
              if (!isSelected) {
                e.target.style.borderColor = '#E8E2D9';
                e.target.style.color = '#403D39';
              }
            }}
          >
            {name}
          </button>
        );
      })}
    </div>
  );
}
