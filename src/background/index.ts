import { AudioLiftSettings, defaultSettings } from '../types';
import contentScriptPath from '../content/index?script';
import { LICENSE, LICENSE_STORAGE_KEYS, LicenseActivateResult, LicenseStorageState } from '../license';

// AudioLift - Background Service Worker

// ── AudioLift Pro — lisans katmanı ──────────────────────────────────
// Backend yok: Polar'ın public "customer portal" license-key uçları
// doğrudan bu service worker'dan çağrılır (aynı desen: AdPilot/Mailskin
// background.js). storage.local şeması: licenseKey, activationId,
// proActive, licenseStatus, lastValidatedAt.

function licenseActivationLabel(): string {
  let platform = 'unknown';
  try {
    if (navigator?.platform) platform = navigator.platform;
  } catch {
    // ignore
  }
  return `Chrome — ${platform} — ${new Date().toLocaleDateString()}`;
}

async function activateLicense(rawKey: string): Promise<LicenseActivateResult> {
  const key = String(rawKey || '').trim();
  if (!key) return { ok: false, error: 'empty' };

  try {
    const res = await fetch(`${LICENSE.API_BASE}/activate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ key, organization_id: LICENSE.ORG_ID, label: licenseActivationLabel() }),
    });

    if (!res.ok) {
      return { ok: false, error: 'invalid' };
    }

    const activation = await res.json();
    const status = activation?.license_key?.status;
    const granted = status === 'granted';

    await chrome.storage.local.set({
      licenseKey: key,
      activationId: activation.id,
      proActive: granted,
      licenseStatus: status || 'error',
      lastValidatedAt: granted ? Date.now() : null,
    });

    return granted ? { ok: true, status } : { ok: false, error: 'not-granted', status };
  } catch {
    return { ok: false, error: 'network' };
  }
}

async function deactivateLicense(): Promise<void> {
  const stored = (await chrome.storage.local.get(['licenseKey', 'activationId'])) as LicenseStorageState;
  await chrome.storage.local.remove(LICENSE_STORAGE_KEYS as unknown as string[]);

  if (!stored.licenseKey || !stored.activationId) return;

  try {
    await fetch(`${LICENSE.API_BASE}/deactivate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: stored.licenseKey,
        organization_id: LICENSE.ORG_ID,
        activation_id: stored.activationId,
      }),
    });
  } catch {
    // Best-effort — local state is already cleared.
  }
}

async function validateLicense(): Promise<void> {
  const stored = (await chrome.storage.local.get([
    'licenseKey',
    'activationId',
    'lastValidatedAt',
  ])) as LicenseStorageState;

  if (!stored.licenseKey || !stored.activationId) return;

  try {
    const res = await fetch(`${LICENSE.API_BASE}/validate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key: stored.licenseKey,
        organization_id: LICENSE.ORG_ID,
        activation_id: stored.activationId,
      }),
    });

    if (!res.ok) {
      await chrome.storage.local.set({ proActive: false, licenseStatus: 'invalid' });
      return;
    }

    const validated = await res.json();
    const granted = validated.status === 'granted';
    await chrome.storage.local.set({
      proActive: granted,
      licenseStatus: validated.status,
      lastValidatedAt: granted ? Date.now() : stored.lastValidatedAt,
    });
  } catch {
    // Network error — honor a 7-day offline grace window before revoking Pro.
    const withinGrace = stored.lastValidatedAt && Date.now() - stored.lastValidatedAt < LICENSE.OFFLINE_GRACE_MS;
    if (!withinGrace) {
      await chrome.storage.local.set({ proActive: false, licenseStatus: 'error' });
    }
  }
}

chrome.alarms.create(LICENSE.VALIDATE_ALARM, { periodInMinutes: 24 * 60 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === LICENSE.VALIDATE_ALARM) validateLicense();
});
validateLicense();

// Handle keyboard shortcut
chrome.commands.onCommand.addListener(async (command) => {
  if (command === 'toggle-audiolift') {
    // Get active tab
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tabs.length === 0) return;

    const tab = tabs[0];
    const tabId = tab.id;
    if (!tabId || !tab.url) return;

    let domain;
    try {
      domain = new URL(tab.url).hostname;
    } catch (e) {
      return; // Invalid URL
    }

    // Get current settings
    const result = await chrome.storage.local.get(['globalSettings', `domainSettings_${domain}`]);
    const currentSettings: AudioLiftSettings = {
      ...defaultSettings,
      ...result.globalSettings,
      ...result[`domainSettings_${domain}`]
    };

    // Toggle enabled state
    currentSettings.enabled = !currentSettings.enabled;

    // Save to storage
    await chrome.storage.local.set({
      [`domainSettings_${domain}`]: currentSettings
    });

    // Send message to content script
    try {
      chrome.tabs.sendMessage(tabId, {
        type: 'updateSettings',
        settings: currentSettings
      }, () => {
        // Ignore errors if tab is closed or script not ready
        const err = chrome.runtime.lastError;
        if (err) {
           console.log('AudioLift: Could not send message to tab ' + tabId, err.message);
        }
      });

      // Update badge
      updateBadge(tabId, currentSettings.enabled);

    } catch (error) {
      console.error('Error toggling AudioLift:', error);
    }
  }
});

// Handle messages from content script and popup
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'activateLicense') {
    activateLicense(message.key).then(sendResponse);
    return true; // async sendResponse
  }
  if (message.type === 'removeLicense') {
    deactivateLicense().then(() => sendResponse({ ok: true }));
    return true;
  }
  return false;
});

// Update badge when tab changes
chrome.tabs.onActivated.addListener(async (activeInfo) => {
  const tabId = activeInfo.tabId;
  try {
    const tab = await chrome.tabs.get(tabId);
    if (!tab.url) return;

    const domain = new URL(tab.url).hostname;
    const result = await chrome.storage.local.get([`domainSettings_${domain}`, 'globalSettings']);

    const settings: AudioLiftSettings = {
      ...defaultSettings,
      ...result.globalSettings,
      ...result[`domainSettings_${domain}`]
    };

    updateBadge(tabId, settings.enabled);
  } catch (error) {
    // Tab might be closed or restricted
  }
});

// Update badge on tab update (URL change)
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    try {
      const domain = new URL(tab.url).hostname;
      const result = await chrome.storage.local.get([`domainSettings_${domain}`, 'globalSettings']);

      const settings: AudioLiftSettings = {
        ...defaultSettings,
        ...result.globalSettings,
        ...result[`domainSettings_${domain}`]
      };

      updateBadge(tabId, settings.enabled);
    } catch (e) {
      // Ignore invalid URLs
    }
  }
});

// Update badge and icon
function updateBadge(tabId: number, enabled: boolean) {
  // No badge (too large, covers icon)
  chrome.action.setBadgeText({ text: '', tabId });

  // Change icon color based on state
  // Assuming the paths are relative to the root/dist which is handled by manifest
  const iconPath = enabled ? {
    "16": "icons/icon-active-16.png",
    "48": "icons/icon-active-48.png",
    "128": "icons/icon-active-128.png"
  } : {
    "16": "icons/icon16.png",
    "48": "icons/icon48.png",
    "128": "icons/icon128.png"
  };

  chrome.action.setIcon({ path: iconPath, tabId });
}

// Inject the content script into tabs that were already open before install/update —
// the manifest's declarative content_scripts only fire on the NEXT navigation.
// This must run only here (on install/update), never unconditionally at module
// top-level: the service worker's whole script re-runs on every wake (tab switch,
// alarm, message), and re-injecting into a tab that's already running AudioLift
// tears down its live AudioContext (see content/index.ts cleanup()), silencing
// whatever was playing until the page is reloaded.
async function injectContentScripts() {
  try {
    const tabs = await chrome.tabs.query({ url: ["http://*/*", "https://*/*"] });
    for (const tab of tabs) {
      if (!tab.id) continue;
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: [contentScriptPath]
        });
      } catch (err) {
        // Ignore errors (e.g. restricted tab, or script already running there)
      }
    }
  } catch (e) {
    console.error('Error auto-injecting scripts:', e);
  }
}

// Initialize
chrome.runtime.onInstalled.addListener(async (details) => {
  if (details.reason === 'install') {
    // Set default settings
    await chrome.storage.local.set({
      globalSettings: defaultSettings
    });
  }

  // Re-inject into tabs already open from before this install/update.
  if (details.reason === 'install' || details.reason === 'update') {
    injectContentScripts();
  }

  // Enable side panel on all sites
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {
      console.log('Side panel API not available or failed');
    });
  }
});
