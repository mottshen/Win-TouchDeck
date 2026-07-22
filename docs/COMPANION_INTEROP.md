# Companion v5.0.1 Interoperability Evidence

Evidence collected: 2026-07-20 through 2026-07-21

## Test Environment

- Companion: `5.0.1+9649-stable-6acd549dd5`; the official installer signature was valid.
- Satellite API: `1.12.0`.
- Administration interface: `http://127.0.0.1:8000`.
- Satellite WebSocket: `ws://127.0.0.1:16623`.
- Client: packaged Win-TouchDeck 0.1.0 build (tested before the product-name migration).
- Surface: Z3, 1024 x 600, landscape, 100% Windows scaling, 5 columns by 3 rows, 144 px WebP bitmaps.
- Companion pages: Page 1 contained a normal `REAL COMPANION` button with pressed feedback; Page 2 was configured; the fixed column contained previous-page, page-number, and next-page buttons.

## Protocol Evidence

A redacting transparent proxy listened only on `127.0.0.1:16624` with the real Companion instance at `127.0.0.1:16623` as its upstream. Bitmap and Base64 text payloads were not written to the log. Evidence file: `artifacts/real-companion-proxy-20260721-091858.jsonl`.

Confirmed messages included:

- Companion to Win-TouchDeck: `BEGIN`, `CAPS`, `ADD-DEVICE OK`, and `BRIGHTNESS`.
- Win-TouchDeck to Companion: `ADD-DEVICE` with 15 keys, five keys per row, 144 px bitmaps, full PIN lock, stable serial number, page navigation, and WebP.
- Normal button press and release messages both received `KEY-PRESS OK`.
- Keys 10 and 0 navigated pages in both directions and refreshed Page 1 and Page 2 images.
- `CHANGE-PAGE` messages in both directions received `CHANGE-PAGE OK`.

These records came from a real Companion process, not a mock or loopback test server.

## Images, Text, Color, and Feedback

- The physical Z3 window displayed Companion's Page 1 grid, page navigation images, `REAL COMPANION` text, black background, white text, and yellow divider.
- A normal button used Companion's built-in `internal: Button: When pushed` feedback, and the real Companion process acknowledged both press and release messages.
- Page 2 displayed `PAGE 2`; returning to Page 1 restored the button images.

## Brightness

- The initial handshake reported brightness 100.
- Changing brightness to 42 in Companion Surface settings visibly dimmed the Z3 button area in real time.
- Brightness was restored and verified at 100 after testing.

## Network Exposure

- `127.0.0.1:8000` was the administration interface listener.
- Satellite port 16623 listened on `::`, not exclusively on loopback.
- A connection to the local non-loopback address `192.168.0.5:16623` succeeded. Cross-host reachability from another LAN device was not tested.
- Windows Firewall was enabled for Domain, Private, and Public profiles with `BlockInbound,AllowOutbound`; no explicit application rule for `Companion.exe` was found.
- This test did not change Companion bindings or Windows Firewall settings.

## Five-Minute Stability Baseline

- Time: 2026-07-21 09:30:11 through 09:35:11 Asia/Shanghai; 300 seconds.
- Sampling: every five seconds, 61 samples total.
- Win-TouchDeck process count remained four.
- Established connections on port 16623 remained one.
- Working set: 492,630,016 to 492,843,008 bytes; net change +12,288 bytes.
- Private memory: 298,037,248 to 298,254,336 bytes; net change +131,072 bytes.
- Handles: 2,297 to 2,308.
- No `surface.status` changes or error events occurred.
- The 72-hour test and Companion restart test were not performed in this run.

## Diagnostics Bundle

The privacy-redacted diagnostics file remains local validation evidence and is excluded from source distribution.

- Size: 6,316 bytes.
- `packaged: true`; displays included Mi Monitor 2560 x 1440 and Z3 1024 x 600.
- Direct connection to `ws://127.0.0.1:16623`; Z3 layout 5 x 3, 144 px, 100% scaling.
- No user home-directory path, bitmap payload, or Token/Password/Secret field was present.
- Local URLs and non-sensitive Surface settings were retained by design.

## Outstanding Validation

- PIN: `PINCODE_LOCK=FULL` was negotiated, but lock, numeric input, and unlock behavior require a user-configured PIN.
- Physical Z3 touch: single tap, simultaneous two-finger press, staggered release, drag-out, and focus-loss behavior still require hands-on testing.
- Other scale factors, rotations, hot-plug behavior, and the other two touch displays have not been tested.
- The 72-hour stability run, code signing, and SmartScreen validation were skipped.
- Windows Defender was disabled on this system, so no Defender scan result is claimed.
