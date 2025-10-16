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

// ツール関数の定義
const tools = [
  {
    type: "function",
    function: {
      name: "add_to_calendar",
      description: "ユーザーが予定や計画について話した場合、Googleカレンダーに予定を追加する。「明日ジム」「来週会議」「10月20日に歯医者」など、日付を含む予定の話が出たら使用。",
      parameters: {
        type: "object",
        properties: {
          event_title: {
            type: "string",
            description: "予定のタイトル（例：ジム、会議、歯医者、買い物）"
          },
          event_description: {
            type: "string",
            description: "予定の詳細説明（ユーザーのメッセージ全体）"
          },
          event_date: {
            type: "string",
            description: "予定の日付（YYYY-MM-DD形式）。相対的な表現を計算する：「明日」「明後日」「来週火曜」「3日後」など"
          },
          event_time: {
            type: "string",
            description: "予定の開始時刻（HH:MM形式、24時間表記）。あいまいな表現も解釈：「朝」→09:00、「午前」→10:00、「昼」→12:00、「午後」→14:00、「夕方」→17:00、「夜」→19:00。時刻指定がない場合は省略可能。"
          },
          event_end_time: {
            type: "string",
            description: "予定の終了時刻（HH:MM形式、24時間表記）。「2時間」→開始+2時間、「30分」→開始+30分。省略可能。"
          },
          event_end_date: {
            type: "string",
            description: "終了日（YYYY-MM-DD形式）。複数日にまたがる予定の場合のみ指定。例：「20日から25日まで休暇」"
          }
        },
        required: ["event_title", "event_description", "event_date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_upcoming_events",
      description: "今後の予定を確認する。「今週の予定は？」「明日何がある？」「来週のスケジュール教えて」などユーザーが予定を確認したい時に使用。",
      parameters: {
        type: "object",
        properties: {
          days_ahead: {
            type: "number",
            description: "何日先まで取得するか。「今週」→7、「来週」→14、「今月」→30"
          }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_calendar_event",
      description: "特定のイベントを検索する。「ジムの予定いつ？」「歯医者いつだっけ？」など特定の予定を探す時に使用。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "検索キーワード（例：ジム、会議、歯医者）"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_calendar_event",
      description: "予定をキャンセル・削除する。「明日のジムキャンセル」「歯医者の予定を削除」などユーザーが予定をキャンセルしたい時に使用。まずsearch_calendar_eventで検索してから削除。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "削除したい予定のキーワード"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "update_calendar_event",
      description: "予定を変更する。「ジムを17時に変更」「歯医者を明後日に変更」などユーザーが予定を変更したい時に使用。まずsearch_calendar_eventで検索してから更新。",
      parameters: {
        type: "object",
        properties: {
          query: {
            type: "string",
            description: "変更したい予定のキーワード"
          },
          new_date: {
            type: "string",
            description: "新しい日付（YYYY-MM-DD形式）。日付を変更する場合のみ。"
          },
          new_time: {
            type: "string",
            description: "新しい時刻（HH:MM形式）。時刻を変更する場合のみ。"
          }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "search_logs",
      description: "過去のログや記録を検索する。「最近何したっけ？」「記録を見せて」「今週何やった？」などと聞かれた場合に使用。",
      parameters: {
        type: "object",
        properties: {
          limit: {
            type: "number",
            description: "取得する件数（デフォルト5件）"
          }
        },
        required: []
      }
    }
  }
];

// ツール実行関数
async function executeTool(toolName: string, args: any, supabase: any) {
  console.log(`Executing tool: ${toolName}`, args);

  if (toolName === "add_to_calendar") {
    try {
      const payload = {
        goalContent: args.event_title,
        eventDate: args.event_date,
        eventTime: args.event_time,
        eventEndTime: args.event_end_time,
        eventEndDate: args.event_end_date
      };

      console.log("Sending to create-calendar-event:", payload);

      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/create-calendar-event`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const timeInfo = args.event_time ? `${args.event_date} ${args.event_time}` : args.event_date;
        return JSON.stringify({
          success: true,
          message: `「${args.event_title}」を${timeInfo}でカレンダーに追加しました`
        });
      } else {
        const errorText = await response.text();
        return JSON.stringify({
          success: false,
          message: `カレンダー追加に失敗しました: ${errorText}`
        });
      }
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: `エラー: ${error.message}`
      });
    }
  }

  if (toolName === "list_upcoming_events") {
    try {
      const daysAhead = args.days_ahead || 7;
      const now = new Date();
      const future = new Date();
      future.setDate(future.getDate() + daysAhead);

      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-calendar-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "list",
            timeMin: now.toISOString(),
            timeMax: future.toISOString(),
            maxResults: 20
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const events = data.events.map((event: any) => {
        const start = event.start.dateTime || event.start.date;
        return {
          summary: event.summary,
          start: new Date(start).toLocaleString('ja-JP', {
            month: 'long',
            day: 'numeric',
            hour: event.start.dateTime ? 'numeric' : undefined,
            minute: event.start.dateTime ? 'numeric' : undefined
          })
        };
      });

      return JSON.stringify({
        success: true,
        events: events,
        message: events.length > 0 ? `${daysAhead}日以内の予定を${events.length}件見つけました` : "予定はありません"
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: `予定の取得に失敗しました: ${error.message}`
      });
    }
  }

  if (toolName === "search_calendar_event") {
    try {
      const response = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-calendar-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "search",
            query: args.query
          }),
        }
      );

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = await response.json();
      const events = data.events.map((event: any) => {
        const start = event.start.dateTime || event.start.date;
        return {
          id: event.id,
          summary: event.summary,
          start: new Date(start).toLocaleString('ja-JP', {
            month: 'long',
            day: 'numeric',
            hour: event.start.dateTime ? 'numeric' : undefined,
            minute: event.start.dateTime ? 'numeric' : undefined
          })
        };
      });

      return JSON.stringify({
        success: true,
        events: events,
        message: events.length > 0 ? `「${args.query}」に関連する予定を${events.length}件見つけました` : "該当する予定が見つかりませんでした"
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: `検索に失敗しました: ${error.message}`
      });
    }
  }

  if (toolName === "delete_calendar_event") {
    try {
      // まず検索
      const searchResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-calendar-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "search",
            query: args.query
          }),
        }
      );

      if (!searchResponse.ok) {
        throw new Error(await searchResponse.text());
      }

      const searchData = await searchResponse.json();
      if (!searchData.events || searchData.events.length === 0) {
        return JSON.stringify({
          success: false,
          message: `「${args.query}」に該当する予定が見つかりませんでした`
        });
      }

      // 最初の結果を削除
      const eventToDelete = searchData.events[0];
      const deleteResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-calendar-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "delete",
            eventId: eventToDelete.id
          }),
        }
      );

      if (!deleteResponse.ok) {
        throw new Error(await deleteResponse.text());
      }

      return JSON.stringify({
        success: true,
        message: `「${eventToDelete.summary}」の予定を削除しました`
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: `削除に失敗しました: ${error.message}`
      });
    }
  }

  if (toolName === "update_calendar_event") {
    try {
      // まず検索
      const searchResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-calendar-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "search",
            query: args.query
          }),
        }
      );

      if (!searchResponse.ok) {
        throw new Error(await searchResponse.text());
      }

      const searchData = await searchResponse.json();
      if (!searchData.events || searchData.events.length === 0) {
        return JSON.stringify({
          success: false,
          message: `「${args.query}」に該当する予定が見つかりませんでした`
        });
      }

      // 最初の結果を更新
      const eventToUpdate = searchData.events[0];
      const updates: any = {};

      if (args.new_date && args.new_time) {
        updates.start = {
          dateTime: `${args.new_date}T${args.new_time}:00`,
          timeZone: 'Asia/Tokyo'
        };
        updates.end = {
          dateTime: `${args.new_date}T${args.new_time.split(':')[0]}:59:59`,
          timeZone: 'Asia/Tokyo'
        };
      } else if (args.new_date) {
        updates.start = { date: args.new_date };
        updates.end = { date: args.new_date };
      } else if (args.new_time) {
        // 既存の日付を保持して時刻のみ変更
        const existingDate = eventToUpdate.start.dateTime || eventToUpdate.start.date;
        const date = existingDate.split('T')[0];
        updates.start = {
          dateTime: `${date}T${args.new_time}:00`,
          timeZone: 'Asia/Tokyo'
        };
        updates.end = {
          dateTime: `${date}T${args.new_time.split(':')[0]}:59:59`,
          timeZone: 'Asia/Tokyo'
        };
      }

      const updateResponse = await fetch(
        `${Deno.env.get("SUPABASE_URL")}/functions/v1/manage-calendar-events`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
          },
          body: JSON.stringify({
            action: "update",
            eventId: eventToUpdate.id,
            updates: updates
          }),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(await updateResponse.text());
      }

      return JSON.stringify({
        success: true,
        message: `「${eventToUpdate.summary}」の予定を変更しました`
      });
    } catch (error) {
      return JSON.stringify({
        success: false,
        message: `更新に失敗しました: ${error.message}`
      });
    }
  }

  if (toolName === "search_logs") {
    const limit = args.limit || 5;
    const { data, error } = await supabase
      .from('logs')
      .select('content, created_at')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      return JSON.stringify({ success: false, message: "取得に失敗しました" });
    }

    return JSON.stringify({
      success: true,
      logs: data.map(log => ({
        content: log.content,
        date: new Date(log.created_at).toLocaleDateString('ja-JP')
      }))
    });
  }

  return JSON.stringify({ success: false, message: "未知のツールです" });
}

serve(async (req) => {
  console.log("=== LINE Webhook Started ===");

  try {
    const channelSecret = Deno.env.get("LINE_CHANNEL_SECRET");
    if (!channelSecret) {
      console.error("LINE_CHANNEL_SECRET not configured");
      return new Response("Server configuration error", { status: 500 });
    }

    const signature = req.headers.get("x-line-signature");
    const body = await req.text();

    if (!signature) {
      console.error("No x-line-signature header found");
      return new Response("Unauthorized: No signature", { status: 401 });
    }

    const isValid = validateSignature(body, channelSecret, signature);
    if (!isValid) {
      console.error("Invalid signature - authentication failed");
      return new Response("Unauthorized: Invalid signature", { status: 401 });
    }

    console.log("Signature validation successful!");

    const data = JSON.parse(body);
    const events = data.events || [];

    for (const event of events) {
      if (event.type === "message" && event.message.type === "text") {
        const userMessage = event.message.text;
        const replyToken = event.replyToken;
        const lineUserId = event.source.userId || "unknown";

        console.log("Message from user:", lineUserId, "->", userMessage);

        const supabase = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
        );

        // 1. ユーザーメッセージをログとして保存
        await supabase.from("logs").insert({ content: userMessage });

        // 2. 会話履歴を取得（直近10件）
        const { data: historyData } = await supabase
          .from("conversation_history")
          .select("*")
          .eq("line_user_id", lineUserId)
          .order("created_at", { ascending: false })
          .limit(10);

        // 会話履歴を逆順にして、古い順に並べる
        const conversationHistory = (historyData || []).reverse().map(h => {
          const message: any = {
            role: h.role,
            content: h.content
          };

          if (h.tool_calls) {
            message.tool_calls = h.tool_calls;
          }

          if (h.tool_call_id) {
            message.tool_call_id = h.tool_call_id;
            message.name = h.name;
          }

          return message;
        });

        // 3. 現在のユーザーメッセージを追加
        conversationHistory.push({
          role: "user",
          content: userMessage
        });

        // 4. OpenAI APIにリクエスト（Function Calling対応）
        const openaiKey = Deno.env.get("OPENAI_API_KEY")!;

        // 今日の日付を取得（日本時間）
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        const todayJP = today.toLocaleDateString('ja-JP', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' });

        const messages = [
          {
            role: "system",
            content: `あなたは優秀なパーソナルアシスタントです。ユーザーの成長をサポートします。

【現在の日時】
今日は${todayJP}（${todayStr}）です。

【基本的な役割】
1. ユーザーの日報や活動報告を受け取り、ポジティブなフィードバックを返す
2. 予定や計画について話があれば、適切にカレンダーに追加する
3. ユーザーが予定の確認・変更・削除をしたい時は、適切に対応する
4. 過去の記録を確認したい時は情報を提供する
5. 自然で親しみやすい会話を心がける

【ツールの使い方】
**予定の追加:**
- 「明日ジムに行く」「来週会議」「10月20日に歯医者」→ add_to_calendar
  - event_dateは必ず計算して YYYY-MM-DD 形式で渡す
  - event_timeは HH:MM 形式（24時間表記）
  - あいまいな時間も解釈: 「朝」→09:00、「午後」→14:00、「夕方」→17:00、「夜」→19:00
  - 複数日: event_end_dateを使う
  - 「明日」→ ${new Date(today.getTime() + 86400000).toISOString().split('T')[0]}

**予定の確認:**
- 「今週の予定は？」「明日何がある？」→ list_upcoming_events
- 「ジムの予定いつ？」「歯医者いつだっけ？」→ search_calendar_event

**予定の変更:**
- 「ジムを17時に変更」「歯医者を明後日に変更」→ update_calendar_event
  - まずsearch_calendar_eventで検索してから更新

**予定の削除:**
- 「明日のジムキャンセル」「歯医者の予定を削除」→ delete_calendar_event
  - まずsearch_calendar_eventで検索してから削除

**記録の確認:**
- 「最近何したっけ？」「記録を見せて」→ search_logs

【応答のスタイル】
- 簡潔で温かみのある文章
- ツールを使った場合は、その結果を自然に会話に織り込む
- 予定を追加・変更・削除した場合は明確に伝える
- 複数の予定が見つかった場合は分かりやすくリスト表示
- 200文字以内を目安に`
          },
          ...conversationHistory
        ];

        console.log("Sending to OpenAI with messages:", JSON.stringify(messages));

        const gptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: messages,
            tools: tools,
            tool_choice: "auto",
            max_tokens: 300,
          }),
        });

        const gptData = await gptResponse.json();
        console.log("OpenAI response:", JSON.stringify(gptData));

        if (!gptData.choices || !gptData.choices[0]) {
          throw new Error("Invalid OpenAI response");
        }

        const assistantMessage = gptData.choices[0].message;
        let finalReply = "";

        // 5. ツール呼び出しがあるか確認
        if (assistantMessage.tool_calls && assistantMessage.tool_calls.length > 0) {
          console.log("Tool calls detected:", assistantMessage.tool_calls);

          // アシスタントのツール呼び出しメッセージを会話履歴に保存
          await supabase.from("conversation_history").insert({
            line_user_id: lineUserId,
            role: "assistant",
            content: assistantMessage.content,
            tool_calls: assistantMessage.tool_calls
          });

          // 各ツールを実行
          const toolMessages = [];
          for (const toolCall of assistantMessage.tool_calls) {
            const toolName = toolCall.function.name;
            const toolArgs = JSON.parse(toolCall.function.arguments);

            const toolResult = await executeTool(toolName, toolArgs, supabase);

            toolMessages.push({
              role: "tool",
              tool_call_id: toolCall.id,
              name: toolName,
              content: toolResult
            });

            // ツール結果を会話履歴に保存
            await supabase.from("conversation_history").insert({
              line_user_id: lineUserId,
              role: "tool",
              content: toolResult,
              tool_call_id: toolCall.id,
              name: toolName
            });
          }

          // 6. ツール結果を含めて再度OpenAIに問い合わせ
          const secondMessages = [
            ...messages,
            assistantMessage,
            ...toolMessages
          ];

          console.log("Sending tool results to OpenAI");

          const secondGptResponse = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${openaiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4o",
              messages: secondMessages,
              max_tokens: 300,
            }),
          });

          const secondGptData = await secondGptResponse.json();
          console.log("Second OpenAI response:", JSON.stringify(secondGptData));

          finalReply = secondGptData.choices[0].message.content;
        } else {
          // ツール呼び出しがない場合は、そのまま応答
          finalReply = assistantMessage.content;
        }

        // 7. 最終的なアシスタントの応答を会話履歴に保存
        await supabase.from("conversation_history").insert({
          line_user_id: lineUserId,
          role: "assistant",
          content: finalReply
        });

        // 8. LINEに返信
        const lineResponse = await fetch("https://api.line.me/v2/bot/message/reply", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${Deno.env.get("LINE_CHANNEL_ACCESS_TOKEN")!}`,
          },
          body: JSON.stringify({
            replyToken: replyToken,
            messages: [{ type: "text", text: finalReply }],
          }),
        });

        console.log("LINE reply status:", lineResponse.status);
      }
    }

    return new Response("ok");
  } catch (err) {
    console.error("Error in LINE webhook:", err);
    return new Response(String(err?.message ?? err), { status: 500 });
  }
});
