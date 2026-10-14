import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readFeed, type Feed } from "./feed-data";
export type { FeedNote } from "./feed-data";

export async function getFeed(): Promise<Feed> {
  if (!isSupabaseConfigured()) return {
    notes: [], signedIn: false,
    issue: "The community wall is getting connected. You can explore the record collection now.",
  };
  try {
    return await readFeed(await createClient());
  } catch {
    return { notes: [], signedIn: false, issue: "The community wall is temporarily unavailable. Please check back soon." };
  }
}
