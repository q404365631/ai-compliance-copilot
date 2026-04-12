import type { ExtensionConfig, Prompt } from "@ai-compliance/shared-types";

const API_BASE_URL = "http://localhost:3000/api/extension";

let cachedConfig: ExtensionConfig | null = null;
let configFetchedAt = 0;
const CONFIG_TTL_MS = 5 * 60 * 1000;

const MAX_RECENT = 12;

/**
 * Background service worker.
 * Handles communication between content scripts, popup, and the backend API.
 */
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  switch (message.type) {
    case "GET_CONFIG":
      getConfig().then((config) => sendResponse({ config }));
      return true;

    case "GET_STATS":
      getStats().then((stats) => sendResponse(stats));
      return true;

    case "USAGE_EVENT":
      sendUsageEvent(message.payload);
      break;

    case "INCIDENT":
      handleIncident(message.payload);
      break;

    // ── Prompt library ────────────────────────────────────────────────────────

    case "GET_PROMPTS":
      getPrompts().then((prompts) => sendResponse(prompts));
      return true;

    case "SAVE_PROMPT":
      savePersonalPrompt(message.payload as Prompt).then(() => sendResponse({ success: true }));
      return true;

    case "DELETE_PROMPT":
      deletePersonalPrompt(message.payload.id as string).then(() =>
        sendResponse({ success: true }),
      );
      return true;

    case "INSERT_PROMPT":
      // Forward the prompt content to the active tab's content script.
      forwardToActiveTab(message.payload).then((result) => sendResponse(result));
      return true;
  }
});

// ── Stats ──────────────────────────────────────────────────────────────────

interface SessionStats {
  detections: number;
  blocked: number;
  overridden: number;
  date: string; // YYYY-MM-DD — reset on new day
}

interface RecentDetection {
  categories: string[];
  toolId: string;
  actionTaken: string;
  timestamp: string;
}

async function getStats(): Promise<{ stats: SessionStats; recent: RecentDetection[] }> {
  const { sessionStats, recentDetections } = await chrome.storage.local.get([
    "sessionStats",
    "recentDetections",
  ]);
  return {
    stats: sessionStats ?? freshStats(),
    recent: recentDetections ?? [],
  };
}

function freshStats(): SessionStats {
  return { detections: 0, blocked: 0, overridden: 0, date: todayStr() };
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

async function trackIncident(payload: Record<string, unknown>) {
  const { sessionStats = freshStats(), recentDetections = [] } = await chrome.storage.local.get([
    "sessionStats",
    "recentDetections",
  ]);

  // Reset on new day
  const stats: SessionStats = sessionStats.date === todayStr() ? sessionStats : freshStats();

  const action = payload.actionTaken as string;
  stats.detections++;
  if (action === "block") stats.blocked++;
  if (action === "allow_after_warning") stats.overridden++;

  const entry: RecentDetection = {
    categories: (payload.categories as string[]) ?? [],
    toolId: (payload.toolId as string) ?? "unknown",
    actionTaken: action,
    timestamp: (payload.timestamp as string) ?? new Date().toISOString(),
  };

  const updated = [entry, ...recentDetections].slice(0, MAX_RECENT);

  await chrome.storage.local.set({
    sessionStats: stats,
    recentDetections: updated,
  });
}

// ── Config ─────────────────────────────────────────────────────────────────

async function getConfig(): Promise<ExtensionConfig> {
  const now = Date.now();
  if (cachedConfig && now - configFetchedAt < CONFIG_TTL_MS) return cachedConfig;

  try {
    const { authToken, organizationId } = await chrome.storage.local.get([
      "authToken",
      "organizationId",
    ]);

    if (!authToken) return getDefaultConfig();

    const response = await fetch(`${API_BASE_URL}/config`, {
      headers: {
        Authorization: `Bearer ${authToken}`,
        "X-Organization-Id": organizationId || "",
      },
    });

    if (!response.ok) {
      console.warn("[AI Compliance Copilot] Failed to fetch config, using defaults");
      return getDefaultConfig();
    }

    const data = await response.json();
    cachedConfig = data.data as ExtensionConfig;
    configFetchedAt = now;
    return cachedConfig;
  } catch {
    return getDefaultConfig();
  }
}

// ── Events ─────────────────────────────────────────────────────────────────

async function sendUsageEvent(payload: Record<string, unknown>) {
  try {
    const { authToken, organizationId, userId } = await chrome.storage.local.get([
      "authToken",
      "organizationId",
      "userId",
    ]);
    if (!authToken) return;

    await fetch(`${API_BASE_URL}/usage-event`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        "X-Organization-Id": organizationId || "",
      },
      body: JSON.stringify({ ...payload, organizationId, userId }),
    });
  } catch {
    console.warn("[AI Compliance Copilot] Failed to send usage event");
  }
}

async function handleIncident(payload: Record<string, unknown>) {
  // Always track locally for popup stats
  await trackIncident(payload);

  try {
    const { authToken, organizationId, userId } = await chrome.storage.local.get([
      "authToken",
      "organizationId",
      "userId",
    ]);

    if (!authToken) {
      const { pendingIncidents = [] } = await chrome.storage.local.get("pendingIncidents");
      pendingIncidents.push({ ...payload, timestamp: new Date().toISOString() });
      await chrome.storage.local.set({ pendingIncidents });
      return;
    }

    await fetch(`${API_BASE_URL}/incident`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
        "X-Organization-Id": organizationId || "",
      },
      body: JSON.stringify({ ...payload, organizationId, userId, status: "open" }),
    });
  } catch {
    console.warn("[AI Compliance Copilot] Failed to send incident");
  }
}

// ── Prompt Library ─────────────────────────────────────────────────────────

async function getPrompts(): Promise<{ company: Prompt[]; personal: Prompt[] }> {
  const config = await getConfig();
  const { personalPrompts = [] } = await chrome.storage.local.get("personalPrompts");
  return {
    company: config.companyPrompts ?? [],
    personal: personalPrompts as Prompt[],
  };
}

async function savePersonalPrompt(prompt: Prompt): Promise<void> {
  const { personalPrompts = [] } = await chrome.storage.local.get("personalPrompts");
  const existing = personalPrompts as Prompt[];
  const idx = existing.findIndex((p) => p.id === prompt.id);
  if (idx >= 0) {
    existing[idx] = prompt;
  } else {
    existing.push(prompt);
  }
  await chrome.storage.local.set({ personalPrompts: existing });
}

async function deletePersonalPrompt(id: string): Promise<void> {
  const { personalPrompts = [] } = await chrome.storage.local.get("personalPrompts");
  const updated = (personalPrompts as Prompt[]).filter((p) => p.id !== id);
  await chrome.storage.local.set({ personalPrompts: updated });
}

/**
 * Forwards an INSERT_PROMPT payload to the currently active tab's content
 * script so it can inject the prompt text into the AI tool's input field.
 */
async function forwardToActiveTab(payload: unknown): Promise<{ success: boolean }> {
  return new Promise((resolve) => {
    chrome.tabs.query({ active: true, currentWindow: true }, ([tab]) => {
      if (!tab?.id) return resolve({ success: false });
      chrome.tabs.sendMessage(tab.id, { type: "INSERT_PROMPT", payload }, (response) => {
        if (chrome.runtime.lastError) {
          resolve({ success: false });
          return;
        }
        resolve(response ?? { success: false });
      });
    });
  });
}

function getDefaultConfig(): ExtensionConfig {
  return {
    policies: [],
    customPatterns: [],
    settings: {
      storeRedactedPreview: false,
      enabledTools: ["chatgpt", "claude", "gemini", "perplexity"],
    },
  };
}
