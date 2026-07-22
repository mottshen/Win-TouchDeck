# Third-Party Notices

Win-TouchDeck 0.1.0 does not bundle or redistribute Bitfocus Companion.

Production runtime dependencies audited on 2026-07-22:

| Component | Version | License |
|---|---:|---|
| Electron | 43.1.1 | MIT; includes Chromium and Node.js third-party notices |
| React | 19.2.7 | MIT |
| React DOM | 19.2.7 | MIT |
| Scheduler | 0.27.0 | MIT |

The packaged Electron distribution includes `LICENSE.electron.txt` and `LICENSES.chromium.html`. Those files and all notices within them must remain in every installed or redistributed copy.

## React, React DOM, and Scheduler

Copyright (c) Meta Platforms, Inc. and affiliates.

MIT License

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## Release Audit Requirement

Build and test dependencies are recorded in `pnpm-lock.yaml` and are not shipped as application runtime modules. Before every commercial release run `pnpm licenses list --prod --json` and verify this notice against the versions actually packaged.

If Bitfocus Companion is ever bundled in a future SKU, include its complete applicable license, preserve its copyright notice, and audit every selected Companion module separately.
