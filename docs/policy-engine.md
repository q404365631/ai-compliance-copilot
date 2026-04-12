# Policy Engine

Maps detection findings to actions (`allow`, `warn`, `block`) based on configurable policies.

Source: [packages/policy-engine/src](../packages/policy-engine/src)

## How evaluation works

[`evaluatePolicies()`](../packages/policy-engine/src/evaluate.ts) walks every enabled policy and checks:

1. **Tool scope** — does the policy apply to the current LLM platform?
2. **Category scope** — is at least one finding in a category the policy covers?
3. **Severity threshold** — is the highest matching finding ≥ the policy's threshold?
4. **Custom rule IDs** — does the finding match a specific custom rule the policy targets?

Every matching policy contributes an action. Conflict resolution: **`block` > `warn` > `allow`** — the most restrictive wins.

Return value:

```ts
{
  finalAction: "allow" | "warn" | "block",
  matchedPolicyIds: string[],
  userMessage: string,   // shown in the overlay
  reasons: string[],     // per-policy explanation
}
```

## Actions

| Action  | UX                                                                                            |
| ------- | --------------------------------------------------------------------------------------------- |
| `allow` | Send proceeds silently.                                                                       |
| `warn`  | Modal appears. User can **Continue** (logged as override), **Go Back**, or **Send Redacted**. |
| `block` | Modal appears. **Continue** is disabled. Only **Go Back** or **Send Redacted**.               |

## Compliance score

[`calculateComplianceScore()`](../packages/policy-engine/src/score.ts) produces a 0–100 score for dashboard reporting.

| Factor                           | Effect                  |
| -------------------------------- | ----------------------- |
| No policies configured           | −15                     |
| Blocked incidents                | −10 each, capped at −30 |
| Warnings                         | −5 each, capped at −15  |
| Unapproved tools used            | −10                     |
| Incomplete tool coverage         | −10                     |
| All approved tools have policies | +5                      |

## Writing a policy

Policies live in the dashboard. Shape (from [shared-types](../packages/shared-types/src/index.ts)):

```ts
{
  id: "pol_pii_chatgpt",
  name: "Block PII on ChatGPT",
  enabled: true,
  scope: {
    tools: ["chatgpt"],
    categories: ["email", "phone", "iban"],
  },
  severityThreshold: 50,
  action: "block",
  userMessage: "Personal data is not allowed in external AI tools.",
}
```

## Testing

See [packages/policy-engine/src/\_\_tests\_\_/evaluate.test.ts](../packages/policy-engine/src/__tests__/evaluate.test.ts). Every new action type or conflict rule must add a test.
