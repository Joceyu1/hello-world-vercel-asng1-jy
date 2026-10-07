import "server-only";
import { parseNote } from "./prompt";
export async function generateNote(prompt: string) {
  const key = process.env.GEMINI_API_KEY;
  if (!key)
    throw new Error(
      "The AI studio is not connected yet. Please try again later.",
    );
  const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
  if (!/^gemini-[a-z0-9.-]+$/.test(model))
    throw new Error("The AI studio configuration needs attention.");
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 2048,
          ...(model.startsWith("gemini-2.5-flash")
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
          temperature: 0.85,
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
      signal: AbortSignal.timeout(30000),
      cache: "no-store",
    },
  );
  if (!response.ok)
    throw new Error(
      response.status === 429
        ? "The AI studio is busy. Try again in a moment."
        : "The AI studio could not finish this note. Please try again.",
    );
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
