import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

async function getAccessToken(supabase: any) {
  const { data: secretData, error: secretError } = await supabase
    .from('user_secrets')
    .select('google_refresh_token')
    .single();

  if (secretError || !secretData.google_refresh_token) {
    throw new Error("Refresh token not found.");
  }

  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: secretData.google_refresh_token,
      grant_type: "refresh_token",
    }),
  });

  const tokens = await tokenResponse.json();
  if (!tokens.access_token) {
    throw new Error("Failed to refresh access token.");
  }

  return tokens.access_token;
}

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, ...params } = await req.json();
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const accessToken = await getAccessToken(supabase);

    // アクションに応じて処理を分岐
    if (action === "list") {
      // 今後の予定を取得
      const timeMin = params.timeMin || new Date().toISOString();
      const timeMax = params.timeMax;
      const maxResults = params.maxResults || 10;

      let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${encodeURIComponent(timeMin)}&maxResults=${maxResults}&singleEvents=true&orderBy=startTime`;
      if (timeMax) {
        url += `&timeMax=${encodeURIComponent(timeMax)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to list events: ${await response.text()}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({
        success: true,
        events: data.items || []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    if (action === "delete") {
      // イベントを削除
      const { eventId } = params;
      if (!eventId) {
        throw new Error("eventId is required for delete action");
      }

      const response = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!response.ok && response.status !== 204) {
        throw new Error(`Failed to delete event: ${await response.text()}`);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Event deleted successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    if (action === "update") {
      // イベントを更新
      const { eventId, updates } = params;
      if (!eventId) {
        throw new Error("eventId is required for update action");
      }

      // まず既存のイベントを取得
      const getResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
          },
        }
      );

      if (!getResponse.ok) {
        throw new Error(`Failed to get event: ${await getResponse.text()}`);
      }

      const existingEvent = await getResponse.json();

      // 更新を適用
      const updatedEvent = {
        ...existingEvent,
        ...updates,
      };

      const updateResponse = await fetch(
        `https://www.googleapis.com/calendar/v3/calendars/primary/events/${eventId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(updatedEvent),
        }
      );

      if (!updateResponse.ok) {
        throw new Error(`Failed to update event: ${await updateResponse.text()}`);
      }

      return new Response(JSON.stringify({
        success: true,
        message: "Event updated successfully"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    if (action === "search") {
      // イベントを検索
      const { query, timeMin, timeMax } = params;

      let url = `https://www.googleapis.com/calendar/v3/calendars/primary/events?q=${encodeURIComponent(query)}&singleEvents=true&orderBy=startTime`;

      if (timeMin) {
        url += `&timeMin=${encodeURIComponent(timeMin)}`;
      } else {
        // デフォルトは1週間前から
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        url += `&timeMin=${encodeURIComponent(weekAgo.toISOString())}`;
      }

      if (timeMax) {
        url += `&timeMax=${encodeURIComponent(timeMax)}`;
      }

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to search events: ${await response.text()}`);
      }

      const data = await response.json();
      return new Response(JSON.stringify({
        success: true,
        events: data.items || []
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200
      });
    }

    throw new Error(`Unknown action: ${action}`);

  } catch (err) {
    console.error("Error in manage-calendar-events:", err);
    return new Response(JSON.stringify({
      success: false,
      message: err.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500
    });
  }
});
