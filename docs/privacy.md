# Privacy

## What the extension processes

- **Prompt text** — inspected **locally in the browser** via the detection engine. Never sent off-device by the extension itself.
- **Hostname of the current tab** — used to pick the right adapter (e.g. `claude.ai` → Claude adapter).
- **User interactions** — `keydown` and button `click` events on LLM chat pages, captured at capture-phase to run detection before send.

## What is stored locally (`chrome.storage.local`)

| Key                                     | Purpose                                                            |
| --------------------------------------- | ------------------------------------------------------------------ |
| `sessionStats`                          | Counters: detections, blocked, overridden (per day)                |
| `recentDetections`                      | Last 12 detection summaries (category + timestamp, no prompt text) |
| `personalPrompts`                       | User's own saved prompts                                           |
| `theme`                                 | UI preference                                                      |
| `pendingIncidents`                      | Offline queue, flushed when backend reachable                      |
| `authToken`, `organizationId`, `userId` | Only present if user connected a dashboard                         |

## What leaves the device

**Standalone mode** (default, no dashboard connected): **nothing** leaves the device. The extension makes no outbound network requests.

**Connected mode** (user has linked a dashboard): the background worker posts to the configured backend:

- Usage events: `{ toolId, domain, timestamp, browserVersion }`
- Incidents: `{ actionTaken, categories, severity, matchedPolicyIds, timestamp }`
- Optional redacted preview of the offending prompt, **only if** the org's policy explicitly enables it. Raw prompt content is never transmitted.

Configuration (policies, custom patterns, company prompts) is fetched from the backend and cached for 5 minutes.

## What the extension never does

- Send prompt text to any third party.
- Track browsing outside the configured LLM hostnames (see `host_permissions` in [manifest.json](../apps/extension/public/manifest.json)).
- Phone home for telemetry, analytics, or crash reports.
- Access cookies or tokens of the LLM provider.

## Verifying this yourself

- Open `chrome://extensions` → Developer Mode → Inspect the service worker → Network tab. In standalone mode you should see zero outbound requests.
- The full source is in this repo; grep for `fetch(` to audit every network call.

## Reporting privacy concerns

Use the [SECURITY.md](../SECURITY.md) disclosure process.
