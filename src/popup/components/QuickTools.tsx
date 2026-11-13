import React from 'react';
import { AudioLiftSettings } from '../../types';

interface QuickToolsProps {
  settings: AudioLiftSettings;
  updateSettings: (settings: Partial<AudioLiftSettings>) => void;
  proActive: boolean;
  onLockedClick: () => void;
}

const QuickTools: React.FC<QuickToolsProps> = ({ settings, updateSettings, proActive, onLockedClick }) => {
  return (
    <div className="px-4 py-3 border-b border-border-light">
      <div className="flex gap-2">
        <button
          onClick={() => (proActive ? updateSettings({ smartVolume: !settings.smartVolume }) : onLockedClick())}
          className={`tool-btn flex-1 flex items-center justify-center gap-1.5 p-2 border border-black/10 rounded bg-bg-secondary text-text-primary text-[11px] font-medium cursor-pointer transition-all hover:bg-bg-primary hover:border-accent hover:text-accent ${settings.smartVolume && proActive ? 'bg-accent-bg border-accent text-accent-dark' : ''} ${!proActive ? 'opacity-60' : ''}`}
          title={proActive ? 'Standardize volume levels' : 'Pro feature — unlock in the License section below'}
        >
          <span>📢</span> Smart Volume {!proActive && '🔒'}
        </button>
        <button
          onClick={() => updateSettings({ mono: !settings.mono })}
          className={`tool-btn flex-1 flex items-center justify-center gap-1.5 p-2 border border-black/10 rounded bg-bg-secondary text-text-primary text-[11px] font-medium cursor-pointer transition-all hover:bg-bg-primary hover:border-accent hover:text-accent ${settings.mono ? 'bg-accent-bg border-accent text-accent-dark' : ''}`}
          title="Merge to Mono"
        >
          <span>🔊</span> Mono
        </button>
        <button
          onClick={() => (proActive ? updateSettings({ loudnessMode: !settings.loudnessMode, smartVolume: settings.loudnessMode ? settings.smartVolume : false }) : onLockedClick())}
          className={`tool-btn flex-1 flex items-center justify-center gap-1.5 p-2 border border-black/10 rounded bg-bg-secondary text-text-primary text-[11px] font-medium cursor-pointer transition-all hover:bg-bg-primary hover:border-accent hover:text-accent ${settings.loudnessMode && proActive ? 'bg-accent-bg border-accent text-accent-dark' : ''} ${!proActive ? 'opacity-60' : ''}`}
          title={proActive ? 'Enhance bass & treble' : 'Pro feature — unlock in the License section below'}
        >
          <span>🎚️</span> Loudness {!proActive && '🔒'}
        </button>
      </div>
    </div>
  );
};

export default QuickTools;
