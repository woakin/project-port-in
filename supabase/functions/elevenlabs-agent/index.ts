import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const ELEVENLABS_API_KEY = Deno.env.get("ELEVENLABS_API_KEY");
    if (!ELEVENLABS_API_KEY) {
      throw new Error("ELEVENLABS_API_KEY is not configured");
    }

    // Get variables from request body
    const { variables } = await req.json();
    
    // Build query params with agent_id and variables
    const queryParams = new URLSearchParams({
      agent_id: "agent_9801k98jdzhse9ea40vs7gws9d1c",
    });

    // Add variables to query params
    if (variables) {
      Object.keys(variables).forEach(key => {
        queryParams.append(`variables[${key}]`, variables[key]);
      });
    }

    console.log('Variables being sent to ElevenLabs:', variables);
    console.log('Full query string:', queryParams.toString());

    // Generate signed URL for agent with variables
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?${queryParams.toString()}`,
      {
        method: "GET",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
        },
      },
    );

    if (!response.ok) {
      console.error("ElevenLabs error:", await response.text());
      throw new Error("Failed to get signed URL");
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
