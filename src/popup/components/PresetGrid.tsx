import React from 'react';
import { presets } from '../presets';
import { AudioLiftSettings } from '../../types';
import { FREE_PRESET_KEYS } from '../../license';

interface PresetGridProps {
  activePreset: string | null;
  onSelect: (name: string, settings: Partial<AudioLiftSettings>) => void;
  proActive: boolean;
  onLockedClick: () => void;
}

const PresetGrid: React.FC<PresetGridProps> = ({ activePreset, onSelect, proActive, onLockedClick }) => {
  return (
    <div className="px-4 py-3 border-b border-border-light">
      <div className="flex justify-between items-center mb-2">
        <div className="text-[10px] font-medium text-text-secondary uppercase tracking-wider">Presets</div>
        {!proActive && (
          <div className="text-[9px] text-text-secondary">{FREE_PRESET_KEYS.length} free · {Object.keys(presets).length - FREE_PRESET_KEYS.length} Pro</div>
        )}
      </div>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(65px,1fr))] gap-1">
        {Object.entries(presets).map(([key, preset]) => {
          const locked = !proActive && !(FREE_PRESET_KEYS as readonly string[]).includes(key);
          return (
            <button
              key={key}
              onClick={() => (locked ? onLockedClick() : onSelect(key, preset))}
              title={locked ? 'Pro preset — unlock in the License section below' : preset.name}
              className={`preset-btn px-1 py-1.5 border border-black/10 rounded bg-bg-secondary text-[9px] font-medium text-text-secondary transition-all whitespace-nowrap overflow-hidden text-ellipsis hover:bg-bg-primary hover:border-accent hover:text-accent hover:shadow-sm ${
                activePreset === key ? 'bg-accent-bg border-accent text-accent-dark font-semibold shadow-none' : ''
              } ${locked ? 'opacity-50 cursor-not-allowed hover:bg-bg-secondary hover:border-black/10 hover:text-text-secondary hover:shadow-none' : 'cursor-pointer'}`}
            >
              {locked ? '🔒 ' : ''}{preset.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default PresetGrid;
