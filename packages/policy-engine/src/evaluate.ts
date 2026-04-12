import type {
  Policy,
  PolicyAction,
  PolicyEvaluationResult,
  DetectionResult,
} from "@ai-compliance/shared-types";

/**
 * Evaluate detection results against organization policies.
 *
 * Conflict resolution:
 * - block > warn > allow
 * - highest severity wins
 * - all matching policies are logged
 */
export function evaluatePolicies(
  detection: DetectionResult,
  policies: Policy[],
  toolId: string,
): PolicyEvaluationResult {
  if (detection.matches.length === 0) {
    return {
      finalAction: "allow",
      matchedPolicyIds: [],
      reasons: ["No sensitive data detected"],
    };
  }

  const enabledPolicies = policies.filter((p) => p.enabled);
  const matchedPolicies: Policy[] = [];

  for (const policy of enabledPolicies) {
    if (policyMatches(policy, detection, toolId)) {
      matchedPolicies.push(policy);
    }
  }

  if (matchedPolicies.length === 0) {
    // No policies matched — use detection recommendation as fallback
    return {
      finalAction: detection.recommendation,
      matchedPolicyIds: [],
      reasons: detection.reasons,
    };
  }

  // Resolve conflicts: block > warn > allow
  const finalAction = resolveAction(matchedPolicies);
  const matchedPolicyIds = matchedPolicies.map((p) => p.id);

  // Build user message from the highest-priority policy
  const primaryPolicy = matchedPolicies.find((p) => p.action === finalAction);
  const userMessage = primaryPolicy?.userMessage;

  const reasons = matchedPolicies.map((p) => `Policy "${p.name}": ${p.action}`);

  return {
    finalAction,
    matchedPolicyIds,
    userMessage,
    reasons,
  };
}

function policyMatches(policy: Policy, detection: DetectionResult, toolId: string): boolean {
  // Check tool scope
  if (policy.tools && policy.tools.length > 0) {
    if (!policy.tools.includes(toolId)) {
      return false;
    }
  }

  // Check category scope
  if (policy.categories && policy.categories.length > 0) {
    const hasMatchingCategory = detection.categories.some((cat) =>
      policy.categories!.includes(cat),
    );
    if (!hasMatchingCategory) {
      return false;
    }
  }

  // Check severity threshold
  if (policy.minSeverityScore !== undefined && policy.minSeverityScore !== null) {
    if (detection.severityScore < policy.minSeverityScore) {
      return false;
    }
  }

  // Check custom rule IDs
  if (policy.customRuleIds && policy.customRuleIds.length > 0) {
    const matchedRuleIds = detection.matches.map((m) => m.ruleId);
    const hasMatchingRule = policy.customRuleIds.some((ruleId) => matchedRuleIds.includes(ruleId));
    if (!hasMatchingRule) {
      return false;
    }
  }

  return true;
}

function resolveAction(policies: Policy[]): PolicyAction {
  const actions = policies.map((p) => p.action);
  if (actions.includes("block")) return "block";
  if (actions.includes("warn")) return "warn";
  return "allow";
}
