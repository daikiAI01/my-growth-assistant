import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { createHmac } from "https://deno.land/std@0.168.0/node/crypto.ts";

// 署名検証関数
function validateSignature(body: string, channelSecret: string, signature: string): boolean {
  const hmac = createHmac("sha256", channelSecret);
  hmac.update(body);
  const hash = hmac.digest("base64");
  return hash === signature;
}

serve(async (req) => {
  console.log("=== LINE Webhook Started ===");

  try {
    // Supabaseクライアントを管理者権限で初期化
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    console.log("SUPABASE_URL exists:", !!supabaseUrl);
    console.log("SUPABASE_SERVICE_ROLE_KEY exists:", !!serviceRoleKey);

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing Supabase environment variables");
    }

    const supabaseClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    );

    // LINEからのリクエストの署名を検証
    const signature = req.headers.get("x-line-signature");
    const body = await req.text();

    console.log("Signature exists:", !!signature);
    console.log("Body received:", body.substring(0, 100));

    const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
    console.log("LINE_CHANNEL_SECRET exists:", !!channelSecret);

    if (!signature) {
      console.error("No x-line-signature header");
      return new Response("Unauthorized", { status: 401 });
    }

    if (!channelSecret) {
      console.error("LINE_CHANNEL_SECRET not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    // 署名を検証
    const isValid = validateSignature(body, channelSecret, signature);
    console.log("Signature valid:", isValid);

    if (!isValid) {
      console.error("Invalid signature");
      return new Response("Unauthorized", { status: 401 });
    }

    // Webhookイベントをパース
    const data = JSON.parse(body);
    const events = data.events || [];
    console.log("Events parsed:", events.length);

    // テキストメッセージを処理
    for (const event of events) {
      console.log("Event type:", event.type);

      if (event.type === "message" && event.message.type === "text") {
        console.log("Message text:", event.message.text);

        const { data, error } = await supabaseClient
          .from("logs")
          .insert({ content: event.message.text })
          .select();

        if (error) {
          console.error("Database error:", error);
        } else {
          console.log("Insert successful:", data);
        }
      }
    }

    return new Response("ok");
  } catch (err) {
    console.error("Error in LINE webhook:", err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
