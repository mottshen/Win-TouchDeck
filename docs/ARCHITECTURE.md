# Architecture

## Process Boundaries

Win-TouchDeck uses one Electron main process and one renderer window for each enabled Surface profile.

The main process is responsible for:

- Windows display enumeration, DPI, rotation, and window placement
- Fullscreen kiosk mode, launch at sign-in, and sleep prevention
- Atomic settings persistence
- Secure access to the local Companion administration page
- Settings broadcasts across windows

Each renderer window is responsible for:

- Establishing an independent Satellite WebSocket session
- Registering a virtual Surface with a stable legacy `SERIAL=touchdeck:<profile-id>` value retained for upgrade compatibility
- Decoding WebP/PNG data URLs or raw RGB bitmaps
- Rendering touch buttons and the lock screen
- Sending press, release, PIN, and page-navigation messages

## Protocol Strategy

The minimum supported API is 1.7. Companion 5.0 or later with API 1.12 is recommended.

1. Record the Companion and API versions after receiving `BEGIN`.
2. Wait for `CAPS` on API 1.10 or later; register immediately on older versions.
3. Request WebP only when the server's `BITMAP_FORMATS` capability includes `webp`.
4. Add a stable serial number and touch page-navigation capability on API 1.10 or later.
5. Ignore unknown messages to preserve forward compatibility.
6. Send a heartbeat every two seconds and reconnect with exponential backoff from 350 ms to 5 seconds.

## Touch Safety Model

Each pointer ID can own only one active button. Every event below triggers an idempotent release:

- `pointerup`
- `pointercancel`
- `lostpointercapture`
- Window blur
- Page visibility changes to hidden
- Surface component unmount or settings rebuild

This prevents Companion buttons from remaining pressed after application switching, display disconnection, or interruption by a Windows gesture.

## Security Model

- Electron `contextIsolation` and `sandbox` are enabled; Node.js is unavailable to renderers.
- The preload exposes only an allowlisted IPC interface.
- The Companion administration action accepts only `localhost`, `127.0.0.1`, and `[::1]`.
- Settings accept only `ws://`, `wss://`, or the local mock protocol.
- Win-TouchDeck does not provide internet port forwarding. Remote access should use a VPN or a dedicated TLS gateway.
