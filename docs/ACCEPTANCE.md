# MVP Acceptance Record

Acceptance period: 2026-07-20 through 2026-07-21

## Passed

| ID | Item | Result | Evidence |
|---|---|---|---|
| A01 | Complete TypeScript type checking | PASS | `pnpm typecheck` |
| A02 | Protocol, settings, touch, and UI tests | PASS | 10 source test files and 25 tests |
| A03 | Real loopback WebSocket handshake | PASS | API 1.12, WebP, and KEY-PRESS integration test |
| A04 | Production frontend build | PASS | Vite production build succeeded |
| A05 | Electron desktop smoke test | PASS | 15 buttons, preload bridge present, no fatal error |
| A06 | 1920 x 1080 layout | PASS | `artifacts/visual/console-1920x1080.png` |
| A07 | 1920 x 480 ultra-wide layout | PASS | `artifacts/visual/console-1920x480.png` |
| A08 | 1024 x 600 compact layout | PASS | `artifacts/visual/console-1024x600.png` |
| A09 | Malicious protocol and URL settings filtering | PASS | Settings unit tests and main-process local URL allowlist |
| A10 | Production dependency vulnerability scan | PASS | `pnpm audit --prod` found no known vulnerabilities |
| A11 | Windows x64 NSIS installer | PASS | Installer smoke test exited with code 0 |
| A12 | Settings backup recovery and diagnostics export | PASS | Corrupt-primary recovery, redaction, and rolling-log tests passed |
| A13 | SBOM and third-party notices | PASS | CycloneDX 1.6 dependency SBOM and four verified runtime components; stale pre-rename binary SBOMs were removed |
| A14 | ASAR cleanliness | PASS | Diagnostics and SBOM present; no compiled `*.test.js` files |
| A15 | Packaged Electron bridge regression | PASS | Sandboxed preload uses the correct CJS format and smoke testing verifies `window.winTouchDeck` |
| A16 | Real Companion 5.0.1 handshake and Surface registration | PASS | `BEGIN`, API 1.12.0, `CAPS`, WebP, and `ADD-DEVICE OK` |
| A17 | Physical Z3 1024 x 600 display at 100% scale | PASS | Five columns by three rows, 144 px WebP, and correct images, text, and colors |
| A18 | Real press, release, and page navigation | PASS | Redacted proxy captured KEY-PRESS and CHANGE-PAGE acknowledgements |
| A19 | Dynamic brightness | PASS | Z3 dimmed at value 42 and was restored to 100 |
| A20 | Five-minute stability baseline | PASS | 300 seconds, 61 samples, one connection, no errors or state changes |
| A21 | Real diagnostics bundle redaction | PASS | No user home path, bitmap payload, or sensitive credential fields |

Current installer target: `release/Win-TouchDeck-0.1.0-x64.exe`. Any pre-rename installer is superseded and must not be distributed.

SHA-256: `AD42647911C6147CF341AC393EBC34ACE65F78A8F411957EB6F80998E6219264`

Authenticode: `NotSigned`. This build is intended for engineering validation. Public distribution should include an explicit signing and SmartScreen decision.

## Required Validation Before General Availability

The following items require physical hardware, a release certificate, or a representative customer environment:

| ID | Item | Current Status | Release Requirement |
|---|---|---|---|
| H01 | Companion 5.0.1 hardware interoperability | Partially passed | PIN lock and unlock still require a user-configured PIN test |
| H02 | Ten-point touch and touch mapping | Z3 hands-on test pending | Test single tap, staggered two-finger release, drag-out, and focus loss on all target displays |
| H03 | DPI, rotation, and hot-plug | One configuration passed | Test remaining scale factors, portrait orientation, and 20 hot-plug cycles |
| H04 | Long-duration stability | Five minutes passed | Run the 72-hour matrix if required by release policy |
| H05 | Code-signed installer | Not performed | Sign the release and validate SmartScreen if required by distribution policy |
| H06 | Companion and module licensing | Not applicable to current package | Re-audit licenses before any bundled distribution |
| H07 | Enabled malware scan | External environment required | Scan on a clean system with Windows Defender enabled |

Current conclusion: the engineering MVP and Companion/Z3 integration baseline passed. General availability still depends on the remaining PIN, physical multi-touch, DPI, rotation, hot-plug, stability, signing, SmartScreen, and enabled-Defender validation selected by the release policy.

See `docs/COMPANION_INTEROP.md` for Companion v5.0.1 interoperability evidence and reproduction details.
