import type { User } from "@supabase/supabase-js";

export const COLUMBIA_SIGN_IN_MESSAGE =
  "Sign in with a verified @columbia.edu Google account.";

// Call only with the user returned by auth.getUser(), never getSession() or
// client-supplied data. user_metadata is editable and is not authorization proof.
export function isColumbiaGoogleUser(user: User | null | undefined): user is User {
  if (
    !user?.email ||
    !user.email_confirmed_at ||
    !/^[^@\s]+@columbia\.edu$/i.test(user.email) ||
    user.app_metadata?.provider !== "google"
  ) return false;

  return user.identities?.some((identity) =>
    identity.provider === "google" &&
    identity.identity_data?.email_verified === true &&
    typeof identity.identity_data?.email === "string" &&
    identity.identity_data.email.toLowerCase() === user.email!.toLowerCase(),
  ) ?? false;
}
