import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

export const supabase = createClient(
  "https://ikixyxjmsmgdnmbtwnah.supabase.co",   // replace with your new Project URL
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlraXh5eGptc21nZG5tYnR3bmFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk1OTYzMDgsImV4cCI6MjA4NTE3MjMwOH0.0mo0-nRMgsbNnT053Rgdvr6CJYvWIW6pDPqK8Z_I--U" // replace with your new anon/public key
);

// Signup: create user + profile
export async function signup(email, password, name, username) {
  // 1. Create user in Auth
  const { data, error } = await supabase.auth.signUp({
    email,
    password
  });

  if (error || !data?.user) {
    return { user: null, error };
  }

  const user = data.user;

  // 2. Wait until session is established
  let { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    // retry once after short delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    ({ data: { session } } = await supabase.auth.getSession());
  }

  if (!session) {
    return { user, error: new Error("No active session yet — try logging in after signup.") };
  }

  // 3. Insert profile row (authenticated request, passes RLS)
  const { error: profileError } = await supabase
    .from("profiles")
    .insert({
      id: user.id,
      email: user.email,
      name,
      username,
      credits: 0
    });

  return { user, error: profileError || null };
}

export async function login(email, password) {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password
  });
  return { user: data?.user, error };
}

export async function logout() {
  const { error } = await supabase.auth.signOut();
  return { error };
}

export async function updateCredits(userId, amount) {
  const { data, error } = await supabase
    .from("profiles")
    .update({ credits: amount })
    .eq("id", userId);
  return { data, error };
}