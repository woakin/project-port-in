import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.7.1';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const authHeader = req.headers.get('Authorization') || '';
    const jwt = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(jwt);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'No autorizado' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Obtener company_id del usuario
    const { data: profile, error: profileError } = await supabaseClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      throw new Error('No se encontró la empresa del usuario');
    }

    const companyId = profile.company_id;

    // Buscar el diagnóstico más reciente
    const { data: diagnosis, error: diagnosisError } = await supabaseClient
      .from('diagnoses')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (diagnosisError) {
      console.error('Error fetching diagnosis:', diagnosisError);
      return new Response(
        JSON.stringify({ 
          error: 'No se encontró ningún diagnóstico. Primero completa un diagnóstico para obtener recomendaciones personalizadas.',
          code: 'NO_DIAGNOSIS'
        }), 
        { 
          status: 404, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    // Buscar el plan más reciente con sus áreas
    const { data: plan, error: planError } = await supabaseClient
      .from('action_plans')
      .select(`
        *,
        plan_areas (
          id,
          name,
          description
        )
      `)
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (planError) {
      console.log('No plan found, continuing with diagnosis only');
    }

    // Verificar KPIs existentes para no duplicar
    const { data: existingKPIs } = await supabaseClient
      .from('kpis')
      .select('name')
      .eq('company_id', companyId);

    const existingKPINames = (existingKPIs || []).map(k => k.name.toLowerCase());

    // Construir prompt para Lovable AI
    const criticalAreas = diagnosis.insights?.critical_areas || [];
    const planAreas = plan?.plan_areas || [];

    const systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un consultor de KPIs empresariales. Basándote en el diagnóstico y plan de acción de la empresa, sugiere 5-8 KPIs específicos y medibles.

DIAGNÓSTICO:
- Nivel de madurez: ${diagnosis.maturity_level}
- Scores por área:
  - Estrategia: ${diagnosis.strategy_score}/100
  - Operaciones: ${diagnosis.operations_score}/100
  - Finanzas: ${diagnosis.finance_score}/100
  - Marketing: ${diagnosis.marketing_score}/100
  - Tecnología: ${diagnosis.technology_score}/100
  - Legal: ${diagnosis.legal_score}/100
- Áreas críticas: ${criticalAreas.length > 0 ? criticalAreas.join(', ') : 'Ninguna identificada'}

${plan ? `PLAN DE ACCIÓN:
- Áreas de trabajo: ${planAreas.map((a: any) => a.name).join(', ')}
- Horizonte temporal: ${plan.time_horizon} meses
- Nivel de complejidad: ${plan.complexity_level}` : 'Sin plan de acción generado aún.'}

KPIs EXISTENTES (NO DUPLICAR):
${existingKPINames.length > 0 ? existingKPINames.join(', ') : 'Ninguno'}

Criterios para sugerir KPIs:
1. Enfócate en las áreas con scores más bajos (< 60)
2. Los KPIs deben ser SMART (específicos, medibles, alcanzables, relevantes, temporales)
3. Prioriza KPIs que impacten directamente los objetivos del plan
4. Usa unidades estándar (%, $, MXN, usuarios, ventas, días, etc.)
5. Metas realistas según el nivel de madurez de la empresa
6. NO sugieras KPIs que ya existen en la lista
7. Provee una razón clara y específica para cada KPI

Para cada KPI sugiere:
- name: Nombre descriptivo y claro
- area: Una de estas áreas: strategy, operations, finance, marketing, technology, legal
- unit: Unidad de medida (%, $, MXN, usuarios, etc.)
- suggested_target: Meta numérica realista
- rationale: Razón específica de 1-2 oraciones explicando por qué es importante este KPI`;

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY no está configurado');
    }

    // Llamar a Lovable AI con tool calling para asegurar JSON estructurado
    const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Genera los KPIs recomendados en formato JSON' }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'suggest_kpis',
              description: 'Retorna una lista de 5-8 KPIs recomendados',
              parameters: {
                type: 'object',
                properties: {
                  kpis: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        name: { type: 'string', description: 'Nombre del KPI' },
                        area: { 
                          type: 'string', 
                          enum: ['strategy', 'operations', 'finance', 'marketing', 'technology', 'legal'],
                          description: 'Área del KPI'
                        },
                        unit: { type: 'string', description: 'Unidad de medida' },
                        suggested_target: { type: 'number', description: 'Meta sugerida' },
                        rationale: { type: 'string', description: 'Razón de la sugerencia' }
                      },
                      required: ['name', 'area', 'unit', 'suggested_target', 'rationale'],
                      additionalProperties: false
                    }
                  }
                },
                required: ['kpis'],
                additionalProperties: false
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'suggest_kpis' } }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`Error al generar sugerencias: ${response.status}`);
    }

    const aiResponse = await response.json();
    console.log('AI Response:', JSON.stringify(aiResponse, null, 2));

    // Extraer KPIs del tool call
    const toolCall = aiResponse.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      throw new Error('No se recibió respuesta estructurada del AI');
    }

    const suggestedKPIs = JSON.parse(toolCall.function.arguments);

    return new Response(
      JSON.stringify({
        success: true,
        suggested_kpis: suggestedKPIs.kpis || []
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    console.error('Error in suggest-kpis function:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido',
        success: false
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
