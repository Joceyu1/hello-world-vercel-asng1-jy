import "server-only";
import { setTimeout as delay } from "node:timers/promises";
import { parseNote } from "./prompt";

const providerStatuses = new Set([
  "INVALID_ARGUMENT",
  "UNAUTHENTICATED",
  "PERMISSION_DENIED",
  "NOT_FOUND",
  "FAILED_PRECONDITION",
  "RESOURCE_EXHAUSTED",
  "INTERNAL",
  "UNAVAILABLE",
]);
const credentialReasons = new Set([
  "API_KEY_INVALID",
  "API_KEY_EXPIRED",
  "API_KEY_NOT_FOUND",
  "API_KEY_SERVICE_BLOCKED",
  "API_KEY_HTTP_REFERRER_BLOCKED",
  "API_KEY_IP_ADDRESS_BLOCKED",
  "ACCESS_TOKEN_EXPIRED",
  "IAM_PERMISSION_DENIED",
]);
const setupReasons = new Set(["SERVICE_DISABLED", "BILLING_DISABLED"]);
const providerReasons = new Set([
  ...credentialReasons,
  ...setupReasons,
  "RATE_LIMIT_EXCEEDED",
  "QUOTA_EXCEEDED",
]);

async function requestGemini(url: string, options: RequestInit) {
  // All attempts share one deadline and the exact same request. Retry only an
  // explicit service outage, never an ambiguous timeout or a quota/key error.
  const signal = AbortSignal.timeout(45000);
  const request = { ...options, signal };
  let response = await fetch(url, request);
  for (let retry = 0; response.status === 503 && retry < 2; retry++) {
    await response.body?.cancel().catch(() => {});
    try {
      await delay(1000 * 2 ** retry, undefined, { signal });
    } catch (error) {
      // Preserve TimeoutError so the action shows its existing timeout message.
      if (signal.aborted) throw signal.reason;
      throw error;
    }
    signal.throwIfAborted();
    response = await fetch(url, request);
  }
  return response;
}

async function rejectProviderResponse(
  response: Response,
  model: string,
): Promise<never> {
  const body = (await response.json().catch(() => null)) as {
    error?: { status?: unknown; details?: unknown };
  } | null;
  const rawStatus = body?.error?.status;
  const providerStatus =
    typeof rawStatus === "string" && providerStatuses.has(rawStatus)
      ? rawStatus
      : "UNKNOWN";
  const details = body?.error?.details;
  const reason =
    (Array.isArray(details)
      ? details
          .map((detail: unknown) => {
            const value =
              detail && typeof detail === "object" && "reason" in detail
                ? detail.reason
                : undefined;
            return typeof value === "string" && providerReasons.has(value)
              ? value
              : undefined;
          })
          .find((value) => value !== undefined)
      : undefined) ?? "UNKNOWN";

  // Only fixed diagnostic codes are exposed. Provider messages and metadata
  // can contain credentials or prompts and must never reach logs or the UI.
  console.error("[SIDE B] Gemini request rejected", {
    httpStatus: response.status,
    model,
    providerStatus,
    reason,
  });

  let message: string;
  if (response.status === 429) {
    message =
      "The AI service is busy or has reached its usage limit. Please try again later.";
  } else if (response.status >= 500) {
    message =
      "The AI service is temporarily unavailable. Please try again later.";
  } else if (
    setupReasons.has(reason) ||
    providerStatus === "FAILED_PRECONDITION"
  ) {
    message =
      "The AI service needs its account setup completed. Please contact the site owner.";
  } else if (
    credentialReasons.has(reason) ||
    response.status === 401 ||
    response.status === 403
  ) {
    message =
      "The AI service rejected this site's key or permissions. Please contact the site owner.";
  } else if (response.status === 404) {
    message =
      "The configured AI model is unavailable. Please contact the site owner.";
  } else {
    message =
      "The AI service rejected this request. Please contact the site owner.";
  }
  const code = reason === "UNKNOWN" ? providerStatus : reason;
  throw new Error(`${message} Reference: AI-${response.status}-${code}`);
}

export async function generateNote(prompt: string) {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key)
    throw new Error(
      "The AI studio is not connected yet. Please try again later.",
    );
  const model = process.env.GEMINI_MODEL?.trim() || "gemini-3.5-flash-lite";
  if (!/^gemini-[a-z0-9.-]+$/.test(model))
    throw new Error("The AI studio configuration needs attention.");
  const response = await requestGemini(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
          // Short liner notes need minimal reasoning. Apply model-specific
          // controls only to known compatible models, never unknown aliases.
          ...(model === "gemini-3.5-flash-lite"
            ? { thinkingConfig: { thinkingLevel: "MINIMAL" } }
            : model.startsWith("gemini-2.5-flash")
              ? { thinkingConfig: { thinkingBudget: 0 }, temperature: 0.85 }
              : {}),
          responseSchema: {
            type: "OBJECT",
            properties: {
              title: { type: "STRING" },
              caption: { type: "STRING" },
            },
            required: ["title", "caption"],
          },
        },
      }),
      cache: "no-store",
    },
  );
  if (!response.ok) await rejectProviderResponse(response, model);
  const body = await response.json();
  const text = body.candidates?.[0]?.content?.parts
    ?.map((p: { text?: string }) => p.text ?? "")
    .join("");
  if (!text)
    throw new Error(
      "The AI could not generate that idea. Try a different prompt.",
    );
  return { ...parseNote(text), model };
}
