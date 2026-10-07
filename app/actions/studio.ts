"use server";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { buildPrompt, type GenerationInput } from "@/lib/music/prompt";
import { generateNote } from "@/lib/music/gemini";

export type ActionResult = { ok: boolean; message: string };

function dailyLimitMessage() {
  const reset = new Date();
  reset.setUTCHours(24, 0, 0, 0);
  const resetTime = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(reset);
  return `You've used your five daily studio attempts. Failed requests count too. Try again ${resetTime} (New York time).`;
}

export async function publishNote(
  input: GenerationInput,
): Promise<ActionResult> {
  if (!isSupabaseConfigured())
    return { ok: false, message: "The studio is not connected yet." };
  let reservedId: string | undefined;
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return { ok: false, message: "Sign in to create a mixtape note." };
    const prompt = buildPrompt(input);
    if (!process.env.GEMINI_API_KEY?.trim())
      return {
        ok: false,
        message: "The AI studio is not connected yet. Please try again later.",
      };
    const admin = createAdminClient();
    const { data: id, error: reserveError } = await admin.rpc(
      "reserve_generation",
      {
        p_user_id: user.id,
        p_artist_id: input.artistId,
        p_mood: input.mood,
        p_scene: input.scene,
        p_prompt: prompt,
      },
    );
    if (reserveError)
      return {
        ok: false,
        message:
          reserveError.code === "P0001"
            ? dailyLimitMessage()
            : "Publishing is unavailable. Please try again later.",
      };
    reservedId = id;
    const note = await generateNote(prompt);
    const { data: published, error } = await admin
      .from("generations")
      .update({ ...note, status: "published" })
      .eq("id", id)
      .eq("user_id", user.id)
      .eq("status", "pending")
      .select("id")
      .single();
    if (error || !published)
      throw new Error("Your note could not be saved. Please try again later.");
    revalidatePath("/");
    return {
      ok: true,
      message:
        "Your mixtape note is on the community wall. Let the votes roll in.",
    };
  } catch (error) {
    if (reservedId) {
      try {
        await createAdminClient()
          .from("generations")
          .update({ status: "failed" })
          .eq("id", reservedId)
          .eq("status", "pending");
      } catch {
        /* Keep a failed reservation private even when the database is unavailable. */
      }
    }
    return {
      ok: false,
      message:
        error instanceof Error && error.name === "TimeoutError"
          ? "The AI service didn't respond in time. Please wait a minute before trying again. Reference: AI-TIMEOUT"
          : error instanceof Error
            ? error.message
            : "Could not publish your note.",
    };
  }
}

export async function submitVote(
  generationId: string,
  value: number,
): Promise<ActionResult> {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      generationId,
    ) ||
    ![-1, 1].includes(value)
  )
    return { ok: false, message: "Choose a valid note and vote." };
  if (!isSupabaseConfigured())
    return { ok: false, message: "Voting is not connected yet." };
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user)
      return { ok: false, message: "Sign in to cast your vote." };
    const { error } = await supabase
      .from("votes")
      .insert({ generation_id: generationId, user_id: user.id, value });
    if (error)
      return {
        ok: false,
        message:
          error.code === "23505"
            ? "You've already voted on this note."
            : "Your vote could not be saved. Please try again.",
      };
    revalidatePath("/");
    return { ok: true, message: "Vote saved. One listener, one vote." };
  } catch {
    return {
      ok: false,
      message: "Voting is temporarily unavailable. Please try again.",
    };
  }
}
