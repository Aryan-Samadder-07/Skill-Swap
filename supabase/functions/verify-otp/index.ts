import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*", // allow all origins (dev-friendly)
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ✅ Standardized JSON response helper
function jsonResponse(body: object, status = 200) {
  return new Response(JSON.stringify(body), { status, headers });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    let payload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { email, otp, password, name, username } = payload;
    console.log("Incoming signup request:", { email, otp, password, name, username });

    // ✅ Validate required fields
    if (!email || !otp || !password || !name || !username) {
      return jsonResponse({ success: false, error: "Missing required fields" }, 400);
    }

    // ✅ Step 1: Fetch OTP row
    const { data, error } = await supabase
      .from("pending_otps")
      .select("otp, created_at")
      .eq("email", email)
      .single();

    if (error || !data) {
      console.error("No OTP found for:", email, error);
      return jsonResponse({ success: false, error: "OTP not found" }, 400);
    }

    // ✅ Step 2: Check OTP validity + expiry
    const otpExpired =
      new Date(data.created_at).getTime() < Date.now() - 10 * 60 * 1000; // older than 10 minutes

    if (data.otp !== otp || otpExpired) {
      console.error("Invalid or expired OTP:", {
        storedOtp: data.otp,
        providedOtp: otp,
        expired: otpExpired,
      });
      await supabase.from("pending_otps").delete().eq("email", email);
      return jsonResponse({ success: false, error: "Invalid or expired OTP" }, 400);
    }
    console.log("OTP verified successfully for:", email);

    // ✅ Step 3: Try to create user in Supabase Auth
    const { data: authData, error: authError } =
      await supabase.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: { name, username },
      });

    let user;
    if (authError) {
      console.error("Auth error:", authError);

      if (authError.message.includes("already been registered")) {
        // ✅ User already exists → fetch existing user
        const { data: usersList, error: listError } =
          await supabase.auth.admin.listUsers();

        if (listError) {
          return jsonResponse({ success: false, error: listError.message }, 400);
        }

        user = usersList.users.find((u) => u.email === email);
        if (!user) {
          return jsonResponse({ success: false, error: "User exists but could not be fetched" }, 400);
        }

        console.log("Existing user found:", user);

        // ✅ Ensure profile exists (upsert avoids duplicate errors)
        const { error: profileError } = await supabase.from("profiles").upsert({
          id: user.id,
          email,
          name,
          username,
          credits: 0,
        });

        if (profileError) {
          console.error("Profile upsert error:", profileError);
        }

        // ✅ Force confirm email for existing user (safe)
        const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
          email_confirm: true,
        });
        if (confirmError) {
          console.warn("Email confirm update failed:", confirmError.message);
        }
      } else {
        return jsonResponse({ success: false, error: authError.message }, 400);
      }
    } else {
      console.log("User created in Auth:", authData);
      user = authData.user;

      // ✅ Step 4: Insert/Upsert profile row
      const { error: profileError } = await supabase.from("profiles").upsert({
        id: user.id,
        email,
        name,
        username,
        credits: 0,
      });

      if (profileError) {
        console.error("Profile upsert error:", profileError);
      } else {
        console.log("Profile ensured successfully for:", email);
      }

      // ✅ Force confirm email for new user (safe)
      const { error: confirmError } = await supabase.auth.admin.updateUserById(user.id, {
        email_confirm: true,
      });
      if (confirmError) {
        console.warn("Email confirm update failed:", confirmError.message);
      }
    }

    // ✅ Step 5: Clean up OTP (non-fatal)
    const { error: cleanupError } = await supabase
      .from("pending_otps")
      .delete()
      .eq("email", email);

    if (cleanupError) {
      console.error("OTP cleanup error:", cleanupError);
    } else {
      console.log("OTP cleaned up for:", email);
    }

    // ✅ Always return success if user exists
    return jsonResponse({ success: true, data: { user } });
  } catch (err) {
    console.error("Unexpected error in verify-otp:", err);
    return jsonResponse({ success: false, error: err.message || "Unknown error" }, 400);
  }
});