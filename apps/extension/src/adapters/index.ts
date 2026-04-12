import type { SiteAdapter } from "@ai-compliance/shared-types";
import { ChatGPTAdapter } from "./chatgpt";
import { ClaudeAdapter } from "./claude";
import { GeminiAdapter } from "./gemini";
import { PerplexityAdapter } from "./perplexity";

const adapters: SiteAdapter[] = [
  new ChatGPTAdapter(),
  new ClaudeAdapter(),
  new GeminiAdapter(),
  new PerplexityAdapter(),
];

export function getAdapterForUrl(url: string): SiteAdapter | null {
  return adapters.find((a) => a.matches(url)) ?? null;
}

export function getToolIdForUrl(url: string): string | null {
  const adapter = getAdapterForUrl(url);
  return adapter?.id ?? null;
}
