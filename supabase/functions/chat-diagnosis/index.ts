import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages, companyInfo, isComplete } = await req.json();
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Si el usuario indica que terminó, generamos el diagnóstico final
    if (isComplete) {
      const authHeader = req.headers.get('Authorization')!;
      const token = authHeader.replace('Bearer ', '');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabase = createClient(supabaseUrl, token);

      // Extraer información de los mensajes
      const conversationHistory = messages.map((m: Message) => 
        `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`
      ).join('\n\n');

      // Analizar con IA para generar diagnóstico
      const analysisPrompt = `Analiza la siguiente conversación sobre una empresa y genera un diagnóstico empresarial completo.

Información de la empresa:
- Nombre: ${companyInfo.name}
- Industria: ${companyInfo.industry}
- Etapa: ${companyInfo.stage}

Conversación:
${conversationHistory}

INSTRUCCIONES:
1. Analiza la conversación y asigna scores (0-100) para cada área:
   - Estrategia
   - Operaciones
   - Finanzas
   - Marketing
   - Legal
   - Tecnología

2. Genera insights específicos y accionables para cada área con:
   - Fortalezas detectadas
   - Áreas de mejora críticas
   - Recomendaciones concretas

3. Determina el nivel de madurez general: emergente, en desarrollo, maduro, o optimizado

Responde SOLO con un JSON válido en este formato exacto:
{
  "scores": {
    "strategy": number,
    "operations": number,
    "finance": number,
    "marketing": number,
    "legal": number,
    "technology": number
  },
  "maturity_level": "emergente" | "en desarrollo" | "maduro" | "optimizado",
  "insights": {
    "strategy": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "operations": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "finance": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "marketing": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "legal": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "technology": { "strengths": string[], "improvements": string[], "recommendations": string[] }
  }
}`;

      const analysisResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'Eres un consultor empresarial experto. Analiza conversaciones y genera diagnósticos estructurados en JSON.' },
            { role: 'user', content: analysisPrompt }
          ],
          temperature: 0.7,
        }),
      });

      if (!analysisResponse.ok) {
        const errorText = await analysisResponse.text();
        console.error('Lovable AI error:', errorText);
        throw new Error(`Lovable AI error: ${analysisResponse.status}`);
      }

      const analysisData = await analysisResponse.json();
      const analysisText = analysisData.choices[0].message.content;
      
      // Extraer JSON del texto (por si viene con markdown)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No se pudo extraer JSON del análisis');
      }
      
      const diagnosis = JSON.parse(jsonMatch[0]);

      // Obtener el usuario autenticado
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Usuario no autenticado');
      }

      // Crear o actualizar empresa
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', companyInfo.name)
        .maybeSingle();

      let companyId;
      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: companyInfo.name,
            industry: companyInfo.industry,
            size: companyInfo.stage === 'idea' ? 'startup' : companyInfo.stage,
            created_by: user.id
          })
          .select()
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;

        // Actualizar perfil
        await supabase
          .from('profiles')
          .update({ company_id: companyId })
          .eq('id', user.id);
      }

      // Guardar diagnóstico
      const { data: diagnosisData, error: diagnosisError } = await supabase
        .from('diagnoses')
        .insert({
          company_id: companyId,
          user_id: user.id,
          maturity_level: diagnosis.maturity_level,
          strategy_score: diagnosis.scores.strategy,
          operations_score: diagnosis.scores.operations,
          finance_score: diagnosis.scores.finance,
          marketing_score: diagnosis.scores.marketing,
          legal_score: diagnosis.scores.legal,
          technology_score: diagnosis.scores.technology,
          insights: diagnosis.insights,
          form_responses: { conversation: conversationHistory }
        })
        .select()
        .single();

      if (diagnosisError) {
        console.error('Error saving diagnosis:', diagnosisError);
        throw diagnosisError;
      }

      console.log('Diagnosis saved successfully:', diagnosisData.id);

      return new Response(
        JSON.stringify({ 
          diagnosis_id: diagnosisData.id,
          complete: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conversación normal con streaming
    
    // Obtener el system prompt desde la configuración
    let systemPromptTemplate = `Eres un consultor empresarial experto que conduce diagnósticos empresariales.

REGLA CRÍTICA: Debes trabajar ÚNICAMENTE con esta empresa específica. NO inventes ni asumas información diferente.

LA EMPRESA ES:
Nombre: {{COMPANY_NAME}}
Industria: {{COMPANY_INDUSTRY}}
Etapa: {{COMPANY_STAGE}}

TU TRABAJO:
Hacer preguntas UNA a la vez para recopilar información sobre estas 6 áreas:
1. Estrategia (visión, misión, objetivos)
2. Operaciones (procesos, eficiencia, calidad)
3. Finanzas (rentabilidad, control financiero)
4. Marketing (marca, adquisición de clientes)
5. Legal (compliance, contratos, protección)
6. Tecnología (infraestructura, digitalización)

INSTRUCCIONES:
- Usa SIEMPRE el nombre correcto de la empresa: {{COMPANY_NAME}}
- Adapta preguntas a la etapa: {{COMPANY_STAGE}}
- Una pregunta a la vez, conversacional y empático
- NO inventes información que el usuario no te ha dado
- Cuando tengas suficiente información de todas las áreas, pregunta si desea generar el diagnóstico`;

    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseClient = createClient(supabaseUrl, token);
        
        const { data: configData, error: configError } = await supabaseClient
          .from('system_config')
          .select('value')
          .eq('key', 'chat_diagnosis_system_prompt')
          .maybeSingle();

        if (!configError && configData) {
          systemPromptTemplate = (configData.value as any).prompt || systemPromptTemplate;
        }
      }
    } catch (e) {
      console.log('Using default system prompt:', e);
    }

    // Reemplazar variables en el template
    const systemPrompt = systemPromptTemplate
      .replace(/\{\{COMPANY_NAME\}\}/g, companyInfo?.name || 'tu empresa')
      .replace(/\{\{COMPANY_INDUSTRY\}\}/g, companyInfo?.industry || 'No especificado')
      .replace(/\{\{COMPANY_STAGE\}\}/g, companyInfo?.stage || 'startup');

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
          ...messages
        ],
        stream: true,
        temperature: 0.5,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', errorText);
      throw new Error(`Lovable AI error: ${response.status}`);
    }

    // Streaming response
    return new Response(response.body, {
      headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
    });

  } catch (error) {
    console.error('Error in chat-diagnosis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Error desconocido' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
