import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import * as line from "https://deno.land/x/line@v1.0.1/mod.ts";

// LINE SDKのクライアントを初期化
const lineClient = new line.Client({
  channelAccessToken: Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!,
});

serve(async (req) => {
  // Supabaseクライアントを初期化
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: req.headers.get("Authorization")! } } }
  );

  // LINEからのリクエストの署名を検証
  const signature = req.headers.get("x-line-signature");
  const body = await req.text();
  if (!signature || !line.validateSignature(body, Deno.env.get("LINE_CHANNEL_SECRET")!, signature)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Webhookイベントをパース
  const events = await line.parser(body);

  // テキストメッセージを処理
  for (const event of events) {
    if (event.type === "message" && event.message.type === "text") {
      const { error } = await supabaseClient
        .from("logs")
        .insert({ content: event.message.text });

      if (error) {
        console.error("Error inserting data:", error);
      }
    }
  }

  return new Response("ok");
});
