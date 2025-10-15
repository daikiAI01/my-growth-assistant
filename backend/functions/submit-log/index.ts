import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  };

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    console.log("Received body:", JSON.stringify(body));

    const { content, tags } = body;
    console.log("Parsed content:", content);
    console.log("Parsed tags:", JSON.stringify(tags));

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Use RPC function to properly handle text[] arrays
    console.log("Calling RPC with content:", content, "and tags:", JSON.stringify(tags));

    const { data, error } = await supabaseClient
      .rpc("insert_log_with_tags", {
        p_content: content,
        p_tags: tags
      });

    if (error) {
      console.error("Database error:", JSON.stringify(error));
      throw error;
    }

    console.log("Insert successful, returned data:", JSON.stringify(data));

    return new Response(JSON.stringify({ message: "Log saved!", data: data }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (err) {
    console.error("Function error:", err.message);
    return new Response(JSON.stringify({ message: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
