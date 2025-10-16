import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GOOGLE_CLIENT_ID = Deno.env.get("GOOGLE_CLIENT_ID")!;
const GOOGLE_CLIENT_SECRET = Deno.env.get("GOOGLE_CLIENT_SECRET")!;

serve(async (req) => {
  const url = new URL(req.url);
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // 正しいリダイレクトURIを構築
  const redirectUri = "https://bbuydqtmzjgxxamtvtda.supabase.co/functions/v1/google-auth/callback";

  // 認証開始のエンドポイント
  if (url.pathname.endsWith('/start')) {
    const authUrl = new URL("https://accounts.google.com/o/oauth2/v2/auth");
    authUrl.searchParams.set("client_id", GOOGLE_CLIENT_ID);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("scope", "https://www.googleapis.com/auth/calendar.events");
    authUrl.searchParams.set("access_type", "offline");
    authUrl.searchParams.set("prompt", "consent");

    return Response.redirect(authUrl.toString(), 302);
  }

  // 認証後のコールバック処理
  if (url.pathname.endsWith('/callback')) {
    const code = url.searchParams.get("code");
    if (!code) {
      return new Response("Authorization code not found.", { status: 400 });
    }

    // コードを使ってトークンを取得
    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    const tokens = await tokenResponse.json();
    if (!tokens.refresh_token) {
        return new Response("Refresh token not found. Please re-authenticate.", { status: 400 });
    }

    // ★注意：このサンプルではuser_idを固定していますが、将来的にはログインユーザーのIDを使います
    const userId = '00000000-0000-0000-0000-000000000000'; // 仮のユーザーID

    // リフレッシュトークンをDBに保存
    const { error } = await supabase.from('user_secrets').upsert({
      user_id: userId,
      google_refresh_token: tokens.refresh_token,
    }, { onConflict: 'user_id' });

    if (error) throw error;

    return new Response("連携が完了しました！このウィンドウを閉じてください。", { status: 200 });
  }

  return new Response("Not found.", { status: 404 });
});
