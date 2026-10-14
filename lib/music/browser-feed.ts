import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { readFeed, type Feed } from "./feed-data";

// Uses only the public Supabase key and the listener's session. Database RLS
// restricts rows; service-role credentials and Gemini never enter this module.
export async function getBrowserFeed(): Promise<Feed> {
  if (!isSupabaseConfigured()) return {
    notes: [], signedIn: false,
    issue: "The community wall is getting connected. You can explore the record collection now.",
  };
  try {
    return await readFeed(createClient());
  } catch {
    return { notes: [], signedIn: false, issue: "The community wall is temporarily unavailable. Please check back soon." };
  }
}
