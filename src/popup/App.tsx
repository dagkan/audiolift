import { useRef } from 'react';
import Header from './components/Header';
import AudioInfoPanel from './components/AudioInfo';
import QuickTools from './components/QuickTools';
import PresetGrid from './components/PresetGrid';
import Equalizer from './components/Equalizer';
import Compressor from './components/Compressor';
import License from './components/License';
import Footer from './components/Footer';
import { useAudioSettings } from './hooks/useAudioSettings';

function App() {
  const {
    settings,
    updateSettings,
    audioInfo,
    activePreset,
    applyPreset,
    proActive,
    licenseStatus,
    activateLicense,
    removeLicense
  } = useAudioSettings();

  const licenseRef = useRef<HTMLDivElement>(null);
  const scrollToLicense = () => licenseRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  return (
    <div className="flex flex-col h-full bg-bg-primary">
      <Header enabled={settings.enabled} onToggle={(v) => updateSettings({ enabled: v })} />

      {settings.enabled && <AudioInfoPanel info={audioInfo} />}

      <div className={`flex-1 overflow-y-auto ${!settings.enabled ? 'opacity-50 pointer-events-none grayscale' : ''}`}>
        <QuickTools settings={settings} updateSettings={updateSettings} proActive={proActive} onLockedClick={scrollToLicense} />
        <PresetGrid activePreset={activePreset} onSelect={applyPreset} proActive={proActive} onLockedClick={scrollToLicense} />
        <Equalizer settings={settings} updateSettings={updateSettings} disabled={settings.loudnessMode && proActive} />
        <Compressor settings={settings} updateSettings={updateSettings} disabled={settings.smartVolume && proActive} />
        <div ref={licenseRef}>
          <License proActive={proActive} licenseStatus={licenseStatus} activateLicense={activateLicense} removeLicense={removeLicense} />
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default App;
