# AudioLift

> Boost and enhance audio for any browser tab with EQ, dynamic range compression, and dialogue enhancement.

AudioLift is a Chrome extension that provides professional-grade audio enhancement for your browser tabs. Perfect for watching movies with low audio, boosting dialogue clarity, or customizing your audio experience.

## Features

### Audio Enhancement (Free)
- **10-Band Parametric Equalizer**: Professional-grade frequency control (±12dB per band)
  - 32Hz, 64Hz, 125Hz, 250Hz, 500Hz, 1kHz, 2kHz, 4kHz, 8kHz, 16kHz
  - Optimized filter types (lowshelf, peaking, highshelf)
- **Preamp/Gain**: Boost overall volume up to +10dB
- **Dynamic Range Compression**: Reduce the difference between quiet and loud sounds
  - Adjustable threshold, ratio, and knee
  - Perfect for movies with quiet dialogue and loud action scenes
- **Mono**: Merge stereo to mono
- **Real-time Processing**: Zero latency audio enhancement using Web Audio API
- **Audio Information Display**: Sample rate, channels, bit depth, codec, bitrate, duration
- **Per-Site Memory**: Settings save automatically per domain, no button to click

### Presets — 5 free, 15 with Pro
- **Free**: Flat, Movie, Music, Podcast, Bass+
- **Pro**: Dialogue, Cinematic, Night, Rock, Classical, Jazz, Electronic, Hip Hop, Metal, Acoustic, Podcast Radio, Vocal, Gaming, Lo-Fi, Audiophile

### AudioLift Pro
- **All 20 presets**
- **Smart Volume**: One-tap automatic loudness normalization
- **Loudness Mode**: One-tap bass/treble + dialogue boost
- **$2.99/month** (7-day free trial) or **$19.99/year** (save ~44%)
- Activated with a license key from [Polar.sh](https://polar.sh) — no account, no login. AudioLift has no backend of its own; the license key is checked directly against Polar's API. See [PRIVACY.md](./PRIVACY.md) for exactly what that sends.

### User Experience
- **Ultra-Compact UI**: Chrome minimal design
- **Side Panel Support**: Open in Chrome's sidebar for persistent access
- **Keyboard Shortcut**: Toggle on/off with `Cmd+Shift+A` (Mac) or `Ctrl+Shift+A` (Windows)

## Installation

### From the Chrome Web Store
Coming soon — see [`chrome-web-store/`](./chrome-web-store) for submission status.

### From Source
1. Clone this repository and run `npm install`
2. Run `npm run build` — this produces a `dist/` folder
3. Open Chrome and navigate to `chrome://extensions/`
4. Enable "Developer mode" in the top right
5. Click "Load unpacked" and select the `dist/` folder

## Usage

1. Click the AudioLift icon in your browser toolbar (or right-click it to open the side panel)
2. Toggle it on
3. Navigate to a video or audio page (e.g., YouTube, Netflix, Plex)
4. Adjust settings, or pick a preset — everything saves automatically for that site
5. Optional: activate a Pro license key at the bottom of the panel to unlock all 20 presets, Smart Volume, and Loudness Mode

### 10-Band Equalizer

- **32 Hz** (Lowshelf): Sub-bass, rumble, deep impact
- **64 Hz**: Bass fundamentals, kick drums
- **125 Hz**: Bass warmth, lower vocals
- **250 Hz**: Body and warmth, male vocals
- **500 Hz**: Lower midrange, fullness
- **1 kHz**: Presence, vocal clarity
- **2 kHz**: Upper midrange, speech intelligibility
- **4 kHz**: Clarity, definition, sibilance
- **8 kHz**: Brilliance, air
- **16 kHz** (Highshelf): Ultra-high frequencies, sparkle

Each band: -12dB to +12dB range.

### Dynamic Range Compression

- **Threshold**: Level above which compression starts (default: -24dB). Lower = more compression.
- **Ratio**: How much to compress (default: 3:1). Higher = more aggressive.
- **Knee**: How smoothly compression engages (default: 30dB). Higher = smoother.

## Technical Details

### How It Works

AudioLift uses the Web Audio API to process audio in real-time:

1. When you enable it for a site, it detects `<audio>`/`<video>` elements on the page and routes each one through a processing chain: `Source → Mono → Preamp → 10 EQ Filters → Compressor → Output`.
2. Uses `BiquadFilterNode` for EQ (lowshelf, peaking, highshelf) and `DynamicsCompressorNode` for compression.
3. AudioLift stays out of the way entirely until you turn it on for a site — it doesn't touch a page's audio graph while disabled.

### Browser Compatibility
Chrome 88+, Edge 88+, or any Chromium-based browser with Manifest V3 support.

## Troubleshooting

### Audio not working?
- Refresh the page after enabling AudioLift for that site
- Some sites load media dynamically — try toggling off/on
- Web Audio can silence audio from sites that don't serve media with CORS headers; AudioLift only connects to media once you enable it, to minimize this risk, but it can't fully eliminate it for every site

### Distorted audio?
- Lower the Preamp setting
- Reduce EQ boost values
- Decrease the compression ratio

## Development

### Project Structure

```
browser-audiolift/
├── manifest.json          # Extension manifest (MV3)
├── src/
│   ├── background/        # Service worker: badge, keyboard shortcut, Polar license calls
│   ├── content/            # Injected into pages: builds the Web Audio graph
│   ├── license.ts          # Shared Polar license config/types
│   ├── types.ts             # AudioLiftSettings + defaults
│   └── popup/                # React UI (used for both the popup and the side panel)
│       ├── components/
│       ├── hooks/useAudioSettings.ts
│       └── presets.ts
├── chrome-web-store/       # Store listing copy, screenshots, privacy policy, submission guide
└── scripts/build.js        # Builds + zips a Chrome Web Store package
```

### Stack
TypeScript + React 18 + Vite + `@crxjs/vite-plugin` + Tailwind CSS.

### Building
```bash
npm install
npm run build      # tsc + vite build → dist/
npm run package     # build + zip into chrome-web-store/AudioLift-v<version>.zip
```

### Testing
1. `npm run build`, then load `dist/` as an unpacked extension
2. Navigate to any page with audio/video
3. Open DevTools console to see any errors
4. Test on multiple sites (YouTube, Netflix, Plex, etc.)

## Privacy

See [PRIVACY.md](./PRIVACY.md). Short version: AudioLift collects nothing and talks to no server, except your own license key going to Polar.sh if you activate Pro.

## License

MIT License for the extension's code. AudioLift Pro is a paid upgrade — see above.

## Changelog

See [CHANGELOG.md](./CHANGELOG.md).
