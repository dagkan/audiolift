# Privacy Policy for AudioLift

**Last Updated:** September 2, 2026

## 1. Data Collection

AudioLift does **not** collect, transmit, or store any personal user data, browsing history, or audio content on external servers.

## 2. Local Storage

The extension uses `chrome.storage.local` to save your audio preferences (equalizer settings, compressor settings, active presets, enabled state) per domain, and your license state (see §4). This data:
- Remains entirely on your device.
- Is not shared with the developer or third parties, except as described in §4 for license activation.
- Is automatically removed if you uninstall the extension or clear your browser data.

## 3. Permissions

- **storage** — saves your audio preferences and license state on your device.
- **alarms** — schedules a once-daily check that your Pro license is still valid (see §4).
- **scripting** — injects the audio processing engine into tabs that were already open when the extension is installed or updated.
- **sidePanel** — lets AudioLift open in Chrome's side panel.
- **host_permissions (`<all_urls>`)** — required to find and process `<audio>`/`<video>` elements on any page you visit. AudioLift does not read page content, monitor browsing, or collect any information beyond detecting media elements.

## 4. License Activation (Polar.sh)

AudioLift Pro is an optional paid upgrade. AudioLift has no backend of its own — when you activate a license key, the extension sends the **key**, a **device label** (browser + OS + activation date, e.g. "Chrome — MacIntel — 9/2/2026"), and a fixed **organization ID** directly from your browser to Polar.sh's license-key API (`api.polar.sh`), our payment and licensing processor. The same call repeats once a day to confirm the key is still valid; if it can't reach Polar for more than 7 days your Pro features pause until it can reconnect. Purchases themselves (checkout, receipts, refunds) are handled entirely by Polar.sh and never touch this extension's code. See [Polar's privacy policy](https://polar.sh/legal/privacy) for how they handle payment and license data.

## 5. Audio Processing

All EQ, compression, and preset processing happens locally in your browser using the Web Audio API. Audio is never sent anywhere, recorded, or analyzed for tracking.

## 6. Third-Party Services

The only third party AudioLift talks to is **Polar.sh**, and only for the license activation described in §4. AudioLift does not use analytics, advertising networks, or crash reporting.

## 7. Contact

If you have any questions about this policy, you may contact the developer via the links provided in the extension's interface.
