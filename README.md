# Win-TouchDeck

Win-TouchDeck is an independently developed Windows touch-display client compatible with the Bitfocus Companion Surface protocol. It registers each configured display as a Surface and renders a touch-ready button grid for that display's resolution, scale factor, and orientation.

Current version: `0.1.0`

## Features

- Companion Satellite WebSocket API 1.7 through 1.12 capability negotiation
- Companion 5 non-square and compressed-image capability detection with WebP preference
- Multiple displays, Surface profiles, and independent windows
- Six built-in visual themes, including the original dark theme and a high-contrast option
- Layouts from 1 to 16 rows and columns with 48 to 512 px button images
- Safe release on touch cancellation, lost pointer capture, window blur, and focus changes
- Simultaneous multi-touch presses
- Companion PIN lock screen, brightness control, and page navigation
- Windows fullscreen kiosk mode, secondary-surface visibility during Show Desktop, launch at sign-in, and display sleep prevention
- Atomic settings writes, backup recovery, import/export, and exponential reconnect backoff
- Privacy-redacted diagnostics export and a CycloneDX production-dependency SBOM

## Companion Installation

Bitfocus Companion is a separate product and is not included in this repository or in the Win-TouchDeck installer. Download and install it separately from the [official Bitfocus Companion website](https://bitfocus.io/companion).

The default Satellite WebSocket address is `ws://127.0.0.1:16623`. The default Companion administration URL is `http://127.0.0.1:8000`; Win-TouchDeck only opens loopback administration addresses from the application.

## Development

Requires Node.js 22 or later and pnpm 11 or later.

```powershell
pnpm install
pnpm dev
```

The default `mock://local` connection previews the interface without Companion. To connect to Companion, select **Live Companion** in Settings.

## Verification and Build

```powershell
pnpm check
pnpm sbom
pnpm smoke:electron
pnpm pack:win
```

The Windows x64 installer is generated as `release/Win-TouchDeck-0.1.0-x64.exe`.

## Upgrade Compatibility

The renamed application migrates settings from known legacy product data locations on first launch. Browser-preview settings saved under the former storage key are copied to `win-touchdeck.settings`. The existing Companion Surface serial namespace remains unchanged so an upgrade does not unexpectedly register as a different physical device.

## Distribution and Licensing

Win-TouchDeck is open-source software licensed under the [MIT License](./LICENSE). You may use, copy, modify, merge, publish, distribute, sublicense, and sell copies or derivative works, provided the copyright and MIT permission notice remain included. Third-party notices are in `LICENSES/THIRD_PARTY_NOTICES.md`; Electron and Chromium notices are also included in the installed application.

This repository and installer do not include or redistribute Bitfocus Companion. Any future bundled distribution requires a separate license and component audit.

Win-TouchDeck is independently developed for compatibility with Bitfocus Companion. It is not affiliated with, endorsed by, certified by, or sponsored by Bitfocus AS, Elgato, or Corsair. Bitfocus, Companion, Stream Deck, and other product names are trademarks of their respective owners. No third-party logos are used.

The MIT license covers the software copyright. Product-name and trademark questions are separate and do not prevent customers from downloading or using the application. The compatibility and independence notice above is intended to avoid implying third-party endorsement.
