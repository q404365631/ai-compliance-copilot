# AI Compliance Copilot

[![CI](https://github.com/lennardgeissler/ai-compliance-copilot/actions/workflows/ci.yml/badge.svg)](https://github.com/lennardgeissler/ai-compliance-copilot/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

A browser extension that stops sensitive data from leaking into ChatGPT, Claude, Gemini, and Perplexity. Detection runs **locally in your browser** — no prompt content is sent anywhere unless you explicitly opt in.

> **Status:** early-stage OSS. APIs and detection rules may change before 1.0.

## Why

Employees paste customer records, API keys, and internal docs into public LLMs every day. Most orgs find out only when something breaks. This extension is a speed bump: it inspects the prompt before you hit send and blocks or warns based on configurable policies.

## Features

- 🛡️ **Local detection** — regex + contextual rules for PII, secrets, HR data, IBANs, credit cards, and more
- 🌐 **Works on** ChatGPT, Claude, Gemini, Perplexity (plus any site you add an adapter for)
- 🔒 **Privacy-by-design** — zero outbound network calls in standalone mode
- ⚙️ **Configurable policies** — allow / warn / block per category, severity, and tool
- ✂️ **Smart redaction** — send a sanitized version of your prompt with one click
- 📚 **Prompt library** — save and reuse company-approved prompts
- 🏢 **Optional dashboard** (not in this repo) for org-wide policies, incidents, and compliance reporting

See [docs/](docs/) for architecture, threat model, and privacy details.

## Install

**From source** (until the Web Store listing is live):

```bash
git clone https://github.com/lennardgeissler/ai-compliance-copilot.git
cd ai-compliance-copilot
pnpm install
pnpm --filter extension build
```

Load in Chrome/Edge:

1. Open `chrome://extensions`
2. Enable **Developer mode**
3. **Load unpacked** → select `apps/extension/dist`

The extension runs standalone. No signup, no account, no network calls.

## How it works

```
You type a prompt → content script intercepts keydown/click
                  → detection engine scans text (local)
                  → policy engine decides: allow / warn / block
                  → overlay shown if warn or block
                  → you continue, go back, or send redacted
```

Details: [docs/architecture.md](docs/architecture.md).

## Detection categories

| Category                     | Examples                                                   | Default severity |
| ---------------------------- | ---------------------------------------------------------- | ---------------- |
| `email`, `phone`             | Contact info                                               | 30–40            |
| `iban`, `credit_card`        | Financial                                                  | 70–80            |
| `secret`                     | API keys, AWS keys, bearer tokens, private keys, passwords | 80–95            |
| `address`                    | Postal addresses (incl. German format)                     | 50               |
| `hr_data`                    | Salary, SSN, Tax-ID                                        | 60–75            |
| `employee_id`, `customer_id` | Internal identifiers                                       | 35–40            |
| `custom_keyword`             | Your own patterns                                          | configurable     |

Full list: [docs/detection-engine.md](docs/detection-engine.md).

## Repository layout

```
apps/extension/         — The browser extension (Manifest V3)
packages/
  detection-engine/     — Pattern + contextual detection rules
  policy-engine/        — Action resolution, compliance scoring
  shared-types/         — TypeScript contracts
docs/                   — Architecture, threat model, privacy
```

> The optional dashboard is maintained in a separate, non-public repo. The extension is fully functional without it.

## Contributing

PRs welcome — especially:

- New detection rules (with tests and a false-positive sample)
- Adapters for additional LLM platforms
- False-positive reports (use the issue template)
- Translations

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a PR. By contributing you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).

## Security

Please do **not** file public issues for security bugs. Use the [private security advisory](../../security/advisories/new) flow described in [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE) © Lennard Geißler
