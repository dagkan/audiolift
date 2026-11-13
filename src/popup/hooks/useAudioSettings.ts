import { useState, useEffect, useCallback, useRef } from 'react';
import { AudioLiftSettings, defaultSettings, AudioInfo } from '../../types';
import { LicenseActivateResult, LicenseStorageState } from '../../license';

export const useAudioSettings = () => {
  const [settings, setSettings] = useState<AudioLiftSettings>(defaultSettings);
  const [domain, setDomain] = useState<string>('unknown');
  const [tabId, setTabId] = useState<number | null>(null);
  const [audioInfo, setAudioInfo] = useState<AudioInfo>({
    sampleRate: null,
    channels: null,
    bitDepth: null,
    codec: null,
    bitrate: null,
    duration: null
  });
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [proActive, setProActive] = useState(false);
  const [licenseStatus, setLicenseStatus] = useState<LicenseStorageState['licenseStatus']>(null);
  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  // Load initial state and listen for tab changes
  useEffect(() => {
    const updateActiveTab = async () => {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tabs.length > 0 && tabs[0].id) {
        const currentTabId = tabs[0].id;
        setTabId(currentTabId);

        let currentDomain = 'unknown';
        try {
          if (tabs[0].url) {
            currentDomain = new URL(tabs[0].url).hostname;
          }
        } catch (e) {
          console.error('Invalid URL');
        }
        setDomain(currentDomain);

        // Load settings
        const result = await chrome.storage.local.get([
          'globalSettings',
          `domainSettings_${currentDomain}`,
          `domainPreset_${currentDomain}`,
          'proActive',
          'licenseStatus'
        ]);

        const mergedSettings = {
          ...defaultSettings,
          ...result.globalSettings,
          ...result[`domainSettings_${currentDomain}`]
        };

        setSettings(mergedSettings);
        setActivePreset(result[`domainPreset_${currentDomain}`] || null);
        setProActive(!!result.proActive);
        setLicenseStatus(result.licenseStatus || null);
      }
    };

    updateActiveTab();

    // Listen for tab switching
    const onActivated = () => updateActiveTab();
    chrome.tabs.onActivated.addListener(onActivated);

    // Listen for navigation (URL changes)
    const onUpdated = (updatedTabId: number, changeInfo: chrome.tabs.TabChangeInfo) => {
      if (changeInfo.status === 'complete' || changeInfo.url) {
        // Only update if it's the active tab (handled by updateActiveTab query, but we trigger it)
        chrome.tabs.query({ active: true, currentWindow: true }).then(tabs => {
          if (tabs[0] && tabs[0].id === updatedTabId) {
            updateActiveTab();
          }
        });
      }
    };
    chrome.tabs.onUpdated.addListener(onUpdated);

    // Cross-context sync: pick up changes made by the keyboard shortcut, the
    // side panel (if a popup is also open), or a license activation/removal —
    // without waiting for a tab-switch event to re-trigger the query above.
    const onStorageChanged = (changes: { [key: string]: chrome.storage.StorageChange }, area: string) => {
      if (area !== 'local') return;
      if ('proActive' in changes) setProActive(!!changes.proActive.newValue);
      if ('licenseStatus' in changes) setLicenseStatus(changes.licenseStatus.newValue ?? null);
    };
    chrome.storage.onChanged.addListener(onStorageChanged);

    return () => {
      chrome.tabs.onActivated.removeListener(onActivated);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      chrome.storage.onChanged.removeListener(onStorageChanged);
    };
  }, []);

  // Sync to Content Script & Storage
  const updateSettings = useCallback((newSettings: Partial<AudioLiftSettings>, opts?: { fromPreset?: boolean }) => {
    const updated = { ...settingsRef.current, ...newSettings };
    setSettings(updated);

    if (!opts?.fromPreset) {
      // A manual tweak no longer matches the preset that was last applied.
      setActivePreset(null);
      if (domain !== 'unknown') {
        chrome.storage.local.remove(`domainPreset_${domain}`);
      }
    }

    // Per-site only: writing this into `globalSettings` too (as earlier
    // versions did) meant every never-visited site silently inherited
    // whatever site was edited last, defeating "Per-Site Memory".
    if (domain !== 'unknown') {
      chrome.storage.local.set({ [`domainSettings_${domain}`]: updated });
    }
    if (tabId) {
      chrome.tabs.sendMessage(tabId, { type: 'updateSettings', settings: updated }).catch(() => {
        // Tab might be closed or restricted
      });
    }
  }, [domain, tabId]);

  // Apply Preset
  const applyPreset = useCallback(async (presetName: string, presetSettings: Partial<AudioLiftSettings>) => {
    setActivePreset(presetName);
    if (domain !== 'unknown') {
      await chrome.storage.local.set({ [`domainPreset_${domain}`]: presetName });
    }
    updateSettings(presetSettings, { fromPreset: true });
  }, [domain, updateSettings]);

  // Poll Audio Info
  useEffect(() => {
    if (!tabId) return;

    const fetchInfo = () => {
      chrome.tabs.sendMessage(tabId, { type: 'getAudioInfo' })
        .then(response => {
          if (response && response.audioInfo) {
            setAudioInfo(response.audioInfo);
          }
        })
        .catch(() => {
          // Content script not ready
        });
    };

    fetchInfo();
    const interval = setInterval(fetchInfo, 2000);
    return () => clearInterval(interval);
  }, [tabId]);

  const activateLicense = useCallback((key: string): Promise<LicenseActivateResult> => {
    return chrome.runtime.sendMessage({ type: 'activateLicense', key });
  }, []);

  const removeLicense = useCallback((): Promise<void> => {
    return chrome.runtime.sendMessage({ type: 'removeLicense' }).then(() => undefined);
  }, []);

  return {
    settings,
    updateSettings,
    audioInfo,
    activePreset,
    applyPreset,
    domain,
    proActive,
    licenseStatus,
    activateLicense,
    removeLicense
  };
};
