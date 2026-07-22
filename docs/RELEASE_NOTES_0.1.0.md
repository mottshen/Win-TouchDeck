# Win-TouchDeck 0.1.0

Initial public Windows x64 release of Win-TouchDeck, an open-source touch-display client compatible with the Bitfocus Companion Surface protocol.

## License

Win-TouchDeck source code and official binaries are licensed under the MIT License.

- Users may use, copy, modify, merge, publish, distribute, sublicense, and sell copies or derivative works.
- The copyright notice and MIT permission notice must remain in copies or substantial portions of the software.
- No separate proprietary end-user license applies to this release.

## Highlights

- Multiple independent touch-display Surface profiles
- Six built-in themes: Carbon, Polar, Abyss, Signal Paper, Afterglow, and Maximum
- Configurable grids, bitmap sizing, kiosk mode, multi-touch, PIN lock, brightness, and page navigation
- Settings backup/recovery, import/export, privacy-redacted diagnostics, and legacy setting migration
- Companion API capability negotiation with WebP support

## Verification

- 10 automated test files and 25 tests passed
- Electron packaged-window smoke test passed
- CycloneDX production-dependency SBOM included and identifies the application license as MIT
- Installer SHA-256: `5C20CFECA1F67A04A3BE87901023099C4854E7652D84599E0CDCDEB0D80CCDD9`

## Installation

Download `Win-TouchDeck-0.1.0-x64.exe`. Bitfocus Companion is not bundled and must be installed separately from the official Bitfocus website.

The installer is not digitally signed. Windows SmartScreen may display an unknown-publisher warning. Verify the published SHA-256 checksum before running it.

Win-TouchDeck is independently developed for compatibility with Bitfocus Companion. It is not affiliated with, endorsed by, certified by, or sponsored by Bitfocus AS, Elgato, or Corsair.
