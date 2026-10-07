import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
export type FeedNote = {
  id: string;
  artist_id: string;
  mood: string;
  scene: string;
  prompt: string;
  title: string;
  caption: string;
  model: string;
  created_at: string;
  score: number;
  upvotes: number;
  downvotes: number;
  ownVote: number | null;
};
export async function getFeed(): Promise<{
  notes: FeedNote[];
  signedIn: boolean;
  issue: string | null;
}> {
  if (!isSupabaseConfigured())
    return {
      notes: [],
      signedIn: false,
      issue:
        "The community wall is getting connected. You can explore the record collection now.",
    };
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { data, error } = await supabase
      .from("generations")
      .select("id,artist_id,mood,scene,prompt,title,caption,model,created_at")
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60);
    if (error)
      return {
        notes: [],
        signedIn: Boolean(user),
        issue:
          "The community wall is temporarily unavailable. Please check back soon.",
      };
    const ids = (data ?? []).map((n) => n.id);
    if (!ids.length) return { notes: [], signedIn: Boolean(user), issue: null };
    const { data: totals, error: totalsError } = await supabase.rpc(
      "vote_totals",
      { generation_ids: ids },
    );
    const ownVotes = user
      ? await supabase
          .from("votes")
          .select("generation_id,value")
          .eq("user_id", user.id)
          .in("generation_id", ids)
      : { data: [], error: null };
    if (totalsError || ownVotes.error)
      return {
        notes: [],
        signedIn: Boolean(user),
        issue:
          "The voting wall is temporarily unavailable. Please check back soon.",
      };
    const scores = new Map<
      string,
      { score: number; upvotes: number; downvotes: number }
    >(
      (totals ?? []).map(
        (t: {
          generation_id: string;
          score: number;
          upvotes: number;
          downvotes: number;
        }) => [t.generation_id, t],
      ),
    );
    const votes = new Map(
      (ownVotes.data ?? []).map((v) => [v.generation_id, v.value]),
    );
    return {
      signedIn: Boolean(user),
      issue: null,
      notes: (data ?? []).map((n) => {
        const tally = scores.get(n.id);
        return {
          ...n,
          score: Number(tally?.score ?? 0),
          upvotes: Number(tally?.upvotes ?? 0),
          downvotes: Number(tally?.downvotes ?? 0),
          ownVote: votes.get(n.id) ?? null,
        };
      }),
    };
  } catch {
    return {
      notes: [],
      signedIn: false,
      issue:
        "The community wall is temporarily unavailable. Please check back soon.",
    };
  }
}
