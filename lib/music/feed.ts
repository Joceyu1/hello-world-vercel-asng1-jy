import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readFeed, type Feed } from "./feed-data";
export type { FeedNote } from "./feed-data";

// The marker and the new artist whitelist are installed in one transaction.
// An older database can still serve the original studio without failed choices.
export async function getPopGroupsReady(): Promise<boolean> {
  if (!isSupabaseConfigured()) return false;
  try {
    const { data, error } = await (await createClient()).rpc("side_b_pop_groups_ready");
    return !error && data === true;
  } catch {
    return false;
  }
}

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
