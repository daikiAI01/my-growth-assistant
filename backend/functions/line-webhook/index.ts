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
    // --- 環境変数の確認 ---
    const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
    console.log("LINE_CHANNEL_SECRET exists:", !!channelSecret);

    if (!channelSecret) {
      console.error("LINE_CHANNEL_SECRET not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    // --- リクエストヘッダーとボディの取得 ---
    const signature = req.headers.get("x-line-signature");
    const body = await req.text();

    console.log("Signature exists:", !!signature);
    console.log("Signature value:", signature);
    console.log("Body length:", body.length);
    console.log("Body preview:", body.substring(0, 200));

    // --- LINE Webhookの検証 ---
    if (!signature) {
      console.error("No x-line-signature header found");
      return new Response("Unauthorized: No signature", { status: 401 });
    }

    const isValid = validateSignature(body, channelSecret, signature);
    console.log("Signature validation result:", isValid);

    if (!isValid) {
      console.error("Invalid signature - authentication failed");
      return new Response("Unauthorized: Invalid signature", { status: 401 });
    }

    console.log("Signature validation successful!");

    // --- メインの処理 ---
    const data = JSON.parse(body);
    const events = data.events || [];
    console.log("Events parsed:", events.length);

    for (const event of events) {
      console.log("Event type:", event.type);

      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        console.log("Message text:", userMessage);

        // 1. まず、受け取ったメッセージをDBに保存
        const supabaseClient = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        const { data: insertData, error: insertError } = await supabaseClient
          .from("logs")
          .insert({ content: userMessage })
          .select();

        if (insertError) {
          console.error("Database error:", insertError);
        } else {
          console.log("Insert successful:", insertData);
        }

        // 2. OpenAI APIにリクエストを送信
        const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
        console.log("OpenAI API key exists:", !!openaiKey);

        const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content: "あなたは優秀なアシスタントです。ユーザーの日報を受け取り、以下の3点を簡潔にまとめてポジティブなフィードバックを返してください。\n1.内容の要約\n2.素晴らしい点や特筆すべき点の賞賛\n3.明日への活力となるような、短い応援メッセージ"
              },
              {
                role: "user",
                content: userMessage
              }
            ],
            max_tokens: 200,
          }),
        });

        const gptData = await gptResponse.json();
        console.log("OpenAI response:", gptData);

        if (!gptData.choices || !gptData.choices[0]) {
          console.error("Invalid OpenAI response:", gptData);
          throw new Error("OpenAI API returned invalid response");
        }

        const aiReply = gptData.choices[0].message.content;
        console.log("AI reply:", aiReply);

        // 3. AIからの返信をLINEに送信
        const lineResponse = await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!}`,
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: "text", text: aiReply }],
          }),
        });

        console.log("LINE reply status:", lineResponse.status);
        const lineData = await lineResponse.text();
        console.log("LINE reply response:", lineData);
      }
    }

    return new Response("ok");
  } catch (err) {
    console.error("Error in LINE webhook:", err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
