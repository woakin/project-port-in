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
    
    // Build query params with agent_id
    const queryParams = new URLSearchParams({
      agent_id: "agent_9801k98jdzhse9ea40vs7gws9d1c",
    });

    // Add ONLY the exact variables that the agent expects (matching template exactly)
    if (variables) {
      const requiredVars = {
        'COMPANY_NAME': variables.COMPANY_NAME || variables.company_name || 'tu empresa',
        'COMPANY_INDUSTRY': variables.COMPANY_INDUSTRY || variables.company_industry || 'tu industria',
        'COMPANY_STAGE': variables.COMPANY_STAGE || variables.company_stage || 'startup',
        'PROJECT_NAME': variables.PROJECT_NAME || variables.project_name || 'tu proyecto',
        'PROJECT_DESCRIPTION': variables.PROJECT_DESCRIPTION || variables.project_description || 'este proyecto',
      };

      // Add each variable EXACTLY once with the exact key the template uses
      Object.entries(requiredVars).forEach(([key, value]) => {
        queryParams.append(`variables[${key}]`, value);
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
