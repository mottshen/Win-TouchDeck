# Testing

## Automated Coverage

### Unit Tests

- Protocol-line parsing, quoting, and Base64 text
- API version comparison
- v3/v5 registration command compatibility
- Key, brightness, and lock state handling
- Settings protocol filtering and numeric bounds
- Idempotent release for multiple pointers

### Integration Tests

- In-memory `FakeSocket` coverage for controller, session, and touch-command behavior
- Real loopback `WebSocketServer` coverage for the complete `BEGIN` / `CAPS` / `ADD-DEVICE` / `KEY-PRESS` handshake
- Electron smoke test for the real desktop window, title, button count, connection status, preload bridge, and fatal errors

### Visual Tests

The repository includes Chromium render captures at three resolutions:

- `artifacts/visual/console-1920x1080.png`
- `artifacts/visual/console-1920x480.png`
- `artifacts/visual/console-1024x600.png`

## Pre-Release Commands

```powershell
pnpm check
pnpm sbom
pnpm smoke:electron
pnpm pack:win
```

The build uses `electron/tsconfig.build.json` to exclude test source files. Before release, inspect `release/win-unpacked/resources/app.asar`: it must contain `dist-electron/diagnostics.js` and `LICENSES/SBOM.cdx.json`, and it must not contain compiled `dist-electron/*.test.js` files.

## Physical Device Test Procedure

1. In Windows Tablet PC Settings, confirm that touch input maps to the intended secondary display.
2. Start Win-TouchDeck at 100%, 125%, 150%, 175%, and 200% display scaling.
3. Hold two buttons for five seconds and release them in both possible orders.
4. While holding a button, switch windows, disconnect the display, lock Windows, and put the system to sleep; confirm that Companion receives a release.
5. Hot-plug the secondary display 20 times and confirm that its window returns to the assigned display.
6. With **Keep Visible When Showing Desktop** enabled for the secondary Surface, press `Win+D`; confirm the primary display shows the desktop, the Surface returns on the secondary display, and keyboard focus remains on the primary display.
7. Disable the option and repeat `Win+D`; confirm the secondary Surface follows the normal Windows Show Desktop behavior.
8. Run for 72 hours while testing Companion restarts, network interruptions, and system sleep.
9. Confirm that logs contain no unhandled exceptions, sustained memory growth, or reconnect storms.
