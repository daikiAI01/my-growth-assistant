import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  console.log("=== Suggest Milestones Function Started ===");

  // CORSヘッダーを設定
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  // プリフライトリクエストの処理
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // リクエストボディの取得
    const { goalContent } = await req.json();

    if (!goalContent || !goalContent.trim()) {
      return new Response(
        JSON.stringify({ error: "目標の内容が必要です" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log("Goal content:", goalContent);

    // OpenAI API キーの確認
    const openaiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openaiKey) {
      console.error("OPENAI_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "サーバー設定エラー" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // OpenAI APIにリクエストを送信
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
            content: `あなたは優秀な目標達成コーチです。ユーザーが入力した目標に対して、達成するための具体的なマイルストーン（中間目標）を3〜5個提案してください。

各マイルストーンは以下の形式で提案してください：
- 具体的で測定可能
- 実現可能で現実的
- 目標達成に向けた段階的なステップ
- 簡潔に1〜2文で説明

回答は以下のフォーマットで返してください：
1. [マイルストーン1]
2. [マイルストーン2]
3. [マイルストーン3]
...`
          },
          {
            role: "user",
            content: `目標: ${goalContent}\n\nこの目標を達成するための具体的なマイルストーンを提案してください。`
          }
        ],
        max_tokens: 500,
        temperature: 0.7,
      }),
    });

    const gptData = await gptResponse.json();
    console.log("OpenAI response status:", gptResponse.status);

    if (!gptResponse.ok || !gptData.choices || !gptData.choices[0]) {
      console.error("Invalid OpenAI response:", gptData);
      return new Response(
        JSON.stringify({ error: "AI応答の取得に失敗しました" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const suggestions = gptData.choices[0].message.content;
    console.log("AI suggestions:", suggestions);

    return new Response(
      JSON.stringify({ suggestions }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (err) {
    console.error("Error in suggest-milestones:", err);
    return new Response(
      JSON.stringify({ error: String(err?.message ?? err) }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
