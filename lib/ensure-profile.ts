import { supabase } from "@/lib/supabase";

export type Profile = {
  id: string;
  email: string | null;
  full_name: string | null;
  user_name: string | null;
  role: string | null;
  status: string | null;
};

export async function ensureProfile(userId: string, email?: string | null) {
  const { data: existing, error: readError } = await supabase
    .from("profiles")
    .select("id, email, full_name, user_name, role, status")
    .eq("id", userId)
    .maybeSingle();

  if (readError) {
    console.error("Profile read error:", readError);
    return { profile: null, error: readError };
  }

  if (existing) {
    return { profile: existing as Profile, error: null };
  }

  const { data: created, error: insertError } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      email: email ?? null,
      full_name: "",
      user_name: `user_${userId.slice(0, 8)}`,
      role: "user",
      status: "active",
    })
    .select("id, email, full_name, user_name, role, status")
    .maybeSingle();

  if (insertError) {
    console.error("Profile create error:", insertError);
    return { profile: null, error: insertError };
  }

  return { profile: created as Profile | null, error: null };
}