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

    // Prepare variables object (exact keys expected by the agent)
    const vars = {
      COMPANY_NAME: variables?.COMPANY_NAME || variables?.company_name || 'tu empresa',
      COMPANY_INDUSTRY: variables?.COMPANY_INDUSTRY || variables?.company_industry || 'tu industria',
      COMPANY_STAGE: variables?.COMPANY_STAGE || variables?.company_stage || 'startup',
      PROJECT_NAME: variables?.PROJECT_NAME || variables?.project_name || 'tu proyecto',
      PROJECT_DESCRIPTION: variables?.PROJECT_DESCRIPTION || variables?.project_description || 'este proyecto',
    };

    console.log('Variables being sent to ElevenLabs (POST body):', vars);

    // Generate signed URL for agent with variables via POST body (more reliable than query params)
    const response = await fetch(
      `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url`,
      {
        method: "POST",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          agent_id: "agent_9801k98jdzhse9ea40vs7gws9d1c",
          variables: vars,
        }),
      },
    );

    if (!response.ok) {
      const t = await response.text();
      console.error("ElevenLabs error:", response.status, t);
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
