import type { ComplianceScoreBreakdown } from "@ai-compliance/shared-types";

export interface ScoreInput {
  hasPoliciesConfigured: boolean;
  blockedIncidentsLast30Days: number;
  warningIncidentsLast30Days: number;
  hasUnapprovedTools: boolean;
  toolCoverageComplete: boolean;
  policiesExistForAllTools: boolean;
}

/**
 * Calculate compliance score (0-100).
 * Starts at 100, deducts for risk factors, adds bonuses.
 * This is an internal operational score, not a legal certification.
 */
export function calculateComplianceScore(input: ScoreInput): ComplianceScoreBreakdown {
  let score = 100;
  const deductions: { reason: string; points: number }[] = [];
  const bonuses: { reason: string; points: number }[] = [];

  // No policies configured
  if (!input.hasPoliciesConfigured) {
    deductions.push({ reason: "No policies configured", points: 15 });
    score -= 15;
  }

  // Blocked incidents (up to -30)
  if (input.blockedIncidentsLast30Days > 0) {
    const points = Math.min(input.blockedIncidentsLast30Days * 10, 30);
    deductions.push({
      reason: `${input.blockedIncidentsLast30Days} blocked incident(s) in last 30 days`,
      points,
    });
    score -= points;
  }

  // Warning incidents (up to -15)
  if (input.warningIncidentsLast30Days > 0) {
    const points = Math.min(input.warningIncidentsLast30Days * 5, 15);
    deductions.push({
      reason: `${input.warningIncidentsLast30Days} warning incident(s) in last 30 days`,
      points,
    });
    score -= points;
  }

  // Unapproved tools
  if (input.hasUnapprovedTools) {
    deductions.push({ reason: "Unapproved AI tools detected", points: 10 });
    score -= 10;
  }

  // Incomplete tool coverage
  if (!input.toolCoverageComplete) {
    deductions.push({
      reason: "Tool inventory coverage incomplete",
      points: 10,
    });
    score -= 10;
  }

  // Bonus: policies exist for all supported tools
  if (input.policiesExistForAllTools) {
    bonuses.push({
      reason: "Policies configured for all supported tools",
      points: 5,
    });
    score += 5;
  }

  return {
    score: Math.max(0, Math.min(100, score)),
    deductions,
    bonuses,
  };
}
