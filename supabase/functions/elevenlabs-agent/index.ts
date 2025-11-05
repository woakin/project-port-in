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

    // Normalize and validate the 5 required variables
    const requiredVars: Record<string, string> = {
      'COMPANY_NAME': (variables?.COMPANY_NAME || variables?.company_name || variables?.companyName || '').trim(),
      'COMPANY_INDUSTRY': (variables?.COMPANY_INDUSTRY || variables?.company_industry || variables?.companyIndustry || '').trim(),
      'COMPANY_STAGE': (variables?.COMPANY_STAGE || variables?.company_stage || variables?.companyStage || '').trim(),
      'PROJECT_NAME': (variables?.PROJECT_NAME || variables?.project_name || variables?.projectName || '').trim(),
      'PROJECT_DESCRIPTION': (variables?.PROJECT_DESCRIPTION || variables?.project_description || variables?.projectDescription || '').trim(),
    };

    // Validate that all variables are present
    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([key, _]) => key);

    if (missingVars.length > 0) {
      console.error('Missing required variables:', missingVars);
      return new Response(
        JSON.stringify({ 
          error: "Missing required variables", 
          missing: missingVars,
          received: Object.keys(variables || {})
        }), 
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log('Variables being sent to ElevenLabs:', requiredVars);

    // Build query parameters for GET request
    const params = new URLSearchParams();
    params.append('agent_id', 'agent_9801k98jdzhse9ea40vs7gws9d1c');
    
    // Add variables as query parameters in the format ElevenLabs expects
    Object.entries(requiredVars).forEach(([key, value]) => {
      params.append(key, value);
    });

    // Generate signed URL for agent with variables using GET
    const url = `https://api.elevenlabs.io/v1/convai/conversation/get_signed_url?${params.toString()}`;
    console.log('Requesting signed URL from:', url);
    
    const response = await fetch(url, {
      method: "GET",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("ElevenLabs API error:", response.status, errorText);
      throw new Error(`Failed to get signed URL: ${response.status} - ${errorText}`);
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
