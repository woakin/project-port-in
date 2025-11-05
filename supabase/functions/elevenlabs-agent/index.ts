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

    // Add variables to query params with aliases and safe defaults
    const requiredKeys = [
      'COMPANY_NAME',
      'COMPANY_INDUSTRY',
      'COMPANY_STAGE',
      'PROJECT_NAME',
      'PROJECT_DESCRIPTION',
    ];

    const addVar = (key: string, value: unknown, aliases: string[] = []) => {
      const v = (value ?? '').toString().trim() || 'N/A';
      const keys = [key, ...aliases];
      keys.forEach((k) => queryParams.append(`variables[${k}]`, v));
    };

    const v = variables || {};

    // Map core vars + common aliases/casing variants
    addVar('COMPANY_NAME', v.COMPANY_NAME ?? v.company_name ?? v.CompanyName, ['company_name', 'CompanyName', 'COMPANY', 'company']);
    addVar('COMPANY_INDUSTRY', v.COMPANY_INDUSTRY ?? v.company_industry ?? v.CompanyIndustry ?? v.INDUSTRY, ['company_industry', 'CompanyIndustry', 'INDUSTRY', 'industry']);
    addVar('COMPANY_STAGE', v.COMPANY_STAGE ?? v.company_stage ?? v.CompanyStage ?? v.STAGE, ['company_stage', 'CompanyStage', 'STAGE', 'stage']);
    addVar('PROJECT_NAME', v.PROJECT_NAME ?? v.project_name ?? v.ProjectName ?? v.PROJECT, ['project_name', 'ProjectName', 'PROJECT', 'project']);
    addVar('PROJECT_DESCRIPTION', v.PROJECT_DESCRIPTION ?? v.project_description ?? v.ProjectDescription ?? v.PROJECT_DESC, ['project_description', 'ProjectDescription', 'PROJECT_DESC', 'project_desc']);

    // Pass through any additional variables that might be configured in the agent
    Object.keys(v).forEach((key) => {
      if (!requiredKeys.includes(key)) {
        try {
          queryParams.append(`variables[${key}]`, (v[key] ?? '').toString());
        } catch (_) {
          // ignore non-serializable values
        }
      }
    });

    console.log('Variables being sent to ElevenLabs:', v);
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
