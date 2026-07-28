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

## Surface deletion

- Added a prominent, confirmed **Delete Surface** action in TouchDeck settings.
- Deleting a saved Surface takes effect immediately without requiring **Save and Apply**.
- Deleted profiles are removed from the primary and backup settings files so they do not return after restart.
- Active Companion Satellite devices send `REMOVE-DEVICE` before their TouchDeck window closes.
- The final remaining Surface is protected from deletion.

## Verification

- 14 automated test files and 46 tests passed
- Electron packaged-window smoke test passed
- CycloneDX production-dependency SBOM included and identifies the application license as MIT
- Installer SHA-256: `04A9B383D1770870E98A226119178A2CA94A4C5EC3E5706C81A28C35FFF174C9`

## Installation

Download `Win-TouchDeck-0.1.0-x64.exe`. Bitfocus Companion is not bundled and must be installed separately from the official Bitfocus website.

The installer is not digitally signed. Windows SmartScreen may display an unknown-publisher warning. Verify the published SHA-256 checksum before running it.

Win-TouchDeck is independently developed for compatibility with Bitfocus Companion. It is not affiliated with, endorsed by, certified by, or sponsored by Bitfocus AS, Elgato, or Corsair.
