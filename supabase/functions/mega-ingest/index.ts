import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// Supabase environment variables (automatically injected on deploy)
const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const supabase = createClient(supabaseUrl, supabaseKey);

serve(async (req) => {
  // Handle preflight OPTIONS request for CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "http://127.0.0.1:5500", // restrict to your frontend
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type", // ✅ no Authorization here
      },
    });
  }

  try {
    const { videoId, title, description, creator_id, cost_credits } =
      await req.json();

    // Insert metadata row with status "uploading"
    const { error } = await supabase.from("videos").insert({
      id: videoId,
      title,
      description,
      creator_id,
      cost_credits,
      status: "uploading",
      created_at: new Date().toISOString(),
    });

    if (error) {
      return new Response(
        JSON.stringify({ success: false, error: error.message }),
        {
          status: 500,
          headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:5500" },
        },
      );
    }

    return new Response(JSON.stringify({ success: true, videoId }), {
      status: 200,
      headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:5500" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, error: err.message }),
      {
        status: 500,
        headers: { "Access-Control-Allow-Origin": "http://127.0.0.1:5500" },
      },
    );
  }
});
