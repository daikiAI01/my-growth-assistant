import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Supabaseクライアントを初期化し、全ログを取得
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: logs, error: logsError } = await supabaseClient
      .from('logs')
      .select('content')
      .order('created_at', { ascending: true });

    if (logsError) throw logsError;
    if (logs.length === 0) {
      return new Response(JSON.stringify({ message: "分析するログがありません。" }), { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 });
    }

    // 2. 全ログを一つのテキストに結合
    const allText = logs.map(log => log.content).join('\n---\n');

    // 3. OpenAI APIに分析を依頼
    const openaiKey = Deno.env.get("OPENAI_API_KEY")!;
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
                    content: "あなたは優秀なデータアナリストです。以下のユーザーの日報ログ全体を分析し、ユーザー本人も気づいていないような「思考のパターン」「興味の対象」「活動の傾向」について、3つの洞察（インサイト）を簡潔な箇条書きで抽出してください。友人のように、親しみやすくポジティブな口調で語りかけてください。"
                },
                {
                    role: "user",
                    content: allText
                }
            ],
            max_tokens: 500,
        }),
    });

    if (!gptResponse.ok) {
        throw new Error(`OpenAI API request failed: ${gptResponse.statusText}`);
    }

    const gptData = await gptResponse.json();
    const insights = gptData.choices[0].message.content;

    // 4. 分析結果を返す
    return new Response(JSON.stringify({ insights: insights }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ message: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
