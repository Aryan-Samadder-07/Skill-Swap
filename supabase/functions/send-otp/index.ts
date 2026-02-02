import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";
import nodemailer from "npm:nodemailer"; // Nodemailer via npm import in Deno

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

// ✅ Configure Nodemailer transporter (Gmail SMTP)
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: Deno.env.get("SMTP_EMAIL"),
    pass: Deno.env.get("SMTP_PASSWORD"),
  },
});

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return jsonResponse({ ok: true });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let payload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { email } = payload;
    if (!email) {
      return jsonResponse({ success: false, error: "Email is required" }, 400);
    }

    // ✅ Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Save OTP in pending_otps table with timestamp
    const { error: insertError } = await supabase
      .from("pending_otps")
      .upsert({ email, otp, created_at: new Date().toISOString() });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return jsonResponse({ success: false, error: insertError.message }, 400);
    }

    console.log("OTP stored for:", email, "OTP:", otp);

    // ✅ Send OTP via Gmail SMTP
    try {
      await transporter.sendMail({
        from: `SkillSwap <${Deno.env.get("SMTP_EMAIL")}>`,
        to: email,
        subject: "Your SkillSwap OTP",
        html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
      });
      console.log("OTP email sent successfully to:", email);
    } catch (mailError) {
      console.error("SMTP error:", mailError);
      return jsonResponse(
        { success: false, error: "Failed to send OTP email" },
        400,
      );
    }

    return jsonResponse({ success: true, data: { email } });
  } catch (err) {
    console.error("Unexpected error in send-otp:", err);
    return jsonResponse(
      { success: false, error: err.message || "Unknown error" },
      400,
    );
  }
});

/* import { serve } from "https://deno.land/std/http/server.ts";
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
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let payload;
    try {
      payload = await req.json();
    } catch {
      return jsonResponse({ success: false, error: "Invalid JSON body" }, 400);
    }

    const { email } = payload;
    if (!email) {
      return jsonResponse({ success: false, error: "Email is required" }, 400);
    }

    // ✅ Generate a 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    // ✅ Save OTP in pending_otps table with timestamp
    const { error: insertError } = await supabase
      .from("pending_otps")
      .upsert({ email, otp, created_at: new Date().toISOString() });

    if (insertError) {
      console.error("OTP insert error:", insertError);
      return jsonResponse({ success: false, error: insertError.message }, 400);
    }

    console.log("OTP stored for:", email, "OTP:", otp);

    // ✅ Send OTP via Resend
    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        // ⚠️ Replace with your verified sender email/domain in Resend
        from: "onboarding@resend.dev",
        to: email,
        subject: "Your SkillSwap OTP",
        html: `<p>Your OTP is <strong>${otp}</strong>. It expires in 10 minutes.</p>`,
      }),
    });

    if (!resendResponse.ok) {
      const errText = await resendResponse.text();
      console.error("Resend error:", errText);
      return jsonResponse(
        { success: false, error: `Resend failed: ${errText}` },
        400,
      );
    }

    console.log("OTP email sent successfully to:", email);

    return jsonResponse({ success: true, data: { email } });
  } catch (err) {
    console.error("Unexpected error in send-otp:", err);
    return jsonResponse(
      { success: false, error: err.message || "Unknown error" },
      400,
    );
  }
});
 */
