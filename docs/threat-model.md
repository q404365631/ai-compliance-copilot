# Threat Model

## What this extension protects against

1. **Accidental disclosure of PII/secrets to public LLMs** — the primary use case. A user pastes a customer record, API key, or internal ID into ChatGPT and presses Enter; the extension blocks or warns before the request leaves the browser.
2. **Policy-violating tool usage** — orgs can mark certain LLM platforms as unapproved, and the extension enforces the policy at the point of use.
3. **Lack of audit trail** — optional dashboard records incidents for compliance review (GDPR Art. 30, EU AI Act Art. 12).

## What this extension does NOT protect against

The extension is a **speed bump for accidents**, not a containment perimeter. It explicitly does not defend against:

- **Determined insiders.** A user who wants to exfiltrate data can disable the extension, use a different browser, take a photo of the screen, or dictate the content verbatim. Detection is advisory on the user's own machine.
- **Malicious browser extensions or compromised browser.** An attacker with code execution in the browser can bypass capture-phase listeners or read the DOM directly.
- **Non-browser channels.** Desktop LLM clients (ChatGPT Desktop, Claude Desktop), mobile apps, CLI tools, IDE integrations, and API calls are out of scope.
- **Network-level exfiltration.** DLP at the browser layer doesn't help if data is sent via email, Slack, or a custom tool. Pair with network DLP for defense in depth.
- **Screenshot / OCR attacks.** Content entered as an image is not inspected.
- **Novel PII patterns.** Detection is rule-based — unseen identifier formats, domain-specific codes, and creative obfuscations will miss.
- **False negatives in general.** No pattern matcher catches everything. Treat alerts as signal, not proof.

## Trust boundaries

- **Trusted:** the extension code, the detection/policy engines, `chrome.storage.local`.
- **Semi-trusted:** the configured dashboard backend (user opts in explicitly).
- **Untrusted:** the LLM website DOM (could change at any time — adapters must be defensive), network, clipboard.

## Assumptions

- Users install the official build from the Chrome/Firefox/Edge Web Store, or build from source and verify hashes.
- The browser itself is not compromised.
- Extension updates are delivered through the Web Store's signed update channel.

## Residual risks accepted

- **Adapter drift.** LLM vendors change their DOM; adapters may temporarily fail until updated. Failure mode is fail-open (prompt is sent) to avoid blocking legitimate work. Orgs that need fail-closed should use network DLP instead.
- **Local bypass.** Power users can override warnings. The dashboard records overrides as incidents — detection + audit, not prevention.

## Reporting

Suspected bypasses or detection gaps: [SECURITY.md](../SECURITY.md). Please do not post bypass techniques publicly before coordinated disclosure.
