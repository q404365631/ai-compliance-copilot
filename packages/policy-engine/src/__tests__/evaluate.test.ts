import { describe, it, expect } from "vitest";
import { evaluatePolicies } from "../evaluate";
import { calculateComplianceScore } from "../score";
import type { DetectionResult, Policy } from "@ai-compliance/shared-types";

const makeDetectionResult = (overrides: Partial<DetectionResult> = {}): DetectionResult => ({
  categories: ["email"],
  matches: [
    {
      category: "email",
      ruleId: "email-address",
      matchedText: "test@example.com",
      start: 0,
      end: 16,
    },
  ],
  severityScore: 40,
  recommendation: "warn",
  reasons: ["Detected email"],
  ...overrides,
});

const makePolicy = (overrides: Partial<Policy> = {}): Policy => ({
  id: "policy-1",
  organizationId: "org-1",
  name: "Test Policy",
  enabled: true,
  action: "warn",
  ...overrides,
});

describe("Policy Engine", () => {
  describe("evaluatePolicies", () => {
    it("returns allow when no matches", () => {
      const result = evaluatePolicies(
        { categories: [], matches: [], severityScore: 0, recommendation: "allow", reasons: [] },
        [makePolicy()],
        "chatgpt",
      );
      expect(result.finalAction).toBe("allow");
    });

    it("applies warn policy", () => {
      const result = evaluatePolicies(
        makeDetectionResult(),
        [makePolicy({ action: "warn" })],
        "chatgpt",
      );
      expect(result.finalAction).toBe("warn");
      expect(result.matchedPolicyIds).toContain("policy-1");
    });

    it("applies block policy", () => {
      const result = evaluatePolicies(
        makeDetectionResult(),
        [makePolicy({ action: "block" })],
        "chatgpt",
      );
      expect(result.finalAction).toBe("block");
    });

    it("block wins over warn (conflict resolution)", () => {
      const result = evaluatePolicies(
        makeDetectionResult(),
        [makePolicy({ id: "p1", action: "warn" }), makePolicy({ id: "p2", action: "block" })],
        "chatgpt",
      );
      expect(result.finalAction).toBe("block");
    });

    it("filters by tool scope", () => {
      const result = evaluatePolicies(
        makeDetectionResult(),
        [makePolicy({ action: "block", tools: ["claude"] })],
        "chatgpt",
      );
      // Policy scoped to Claude shouldn't match for ChatGPT
      // Falls back to detection recommendation
      expect(result.finalAction).toBe("warn");
    });

    it("filters by category scope", () => {
      const result = evaluatePolicies(
        makeDetectionResult({ categories: ["email"] }),
        [makePolicy({ action: "block", categories: ["credit_card"] })],
        "chatgpt",
      );
      // Policy scoped to credit_card shouldn't match for email
      expect(result.finalAction).toBe("warn");
    });

    it("filters by severity threshold", () => {
      const result = evaluatePolicies(
        makeDetectionResult({ severityScore: 30 }),
        [makePolicy({ action: "block", minSeverityScore: 70 })],
        "chatgpt",
      );
      // Severity 30 is below threshold of 70
      expect(result.finalAction).toBe("warn");
    });

    it("skips disabled policies", () => {
      const result = evaluatePolicies(
        makeDetectionResult(),
        [makePolicy({ action: "block", enabled: false })],
        "chatgpt",
      );
      expect(result.finalAction).toBe("warn");
    });
  });

  describe("calculateComplianceScore", () => {
    it("returns 100 for perfect setup", () => {
      const result = calculateComplianceScore({
        hasPoliciesConfigured: true,
        blockedIncidentsLast30Days: 0,
        warningIncidentsLast30Days: 0,
        hasUnapprovedTools: false,
        toolCoverageComplete: true,
        policiesExistForAllTools: true,
      });
      expect(result.score).toBe(100);
    });

    it("deducts for no policies", () => {
      const result = calculateComplianceScore({
        hasPoliciesConfigured: false,
        blockedIncidentsLast30Days: 0,
        warningIncidentsLast30Days: 0,
        hasUnapprovedTools: false,
        toolCoverageComplete: true,
        policiesExistForAllTools: false,
      });
      expect(result.score).toBeLessThan(100);
      expect(result.deductions.some((d) => d.reason.includes("No policies"))).toBe(true);
    });

    it("deducts for blocked incidents", () => {
      const result = calculateComplianceScore({
        hasPoliciesConfigured: true,
        blockedIncidentsLast30Days: 3,
        warningIncidentsLast30Days: 0,
        hasUnapprovedTools: false,
        toolCoverageComplete: true,
        policiesExistForAllTools: true,
      });
      expect(result.score).toBeLessThan(100);
    });

    it("never goes below 0", () => {
      const result = calculateComplianceScore({
        hasPoliciesConfigured: false,
        blockedIncidentsLast30Days: 10,
        warningIncidentsLast30Days: 10,
        hasUnapprovedTools: true,
        toolCoverageComplete: false,
        policiesExistForAllTools: false,
      });
      expect(result.score).toBeGreaterThanOrEqual(0);
    });

    it("adds bonus for full tool policy coverage", () => {
      const result = calculateComplianceScore({
        hasPoliciesConfigured: true,
        blockedIncidentsLast30Days: 0,
        warningIncidentsLast30Days: 0,
        hasUnapprovedTools: false,
        toolCoverageComplete: true,
        policiesExistForAllTools: true,
      });
      expect(result.bonuses.length).toBeGreaterThan(0);
    });
  });
});
