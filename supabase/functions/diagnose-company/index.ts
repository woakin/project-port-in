import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation schema
const requestSchema = z.object({
  formResponses: z.object({
    strategy: z.string().max(5000, 'Strategy response too long'),
    operations: z.string().max(5000, 'Operations response too long'),
    finance: z.string().max(5000, 'Finance response too long'),
    marketing: z.string().max(5000, 'Marketing response too long'),
    legal: z.string().max(5000, 'Legal response too long'),
    technology: z.string().max(5000, 'Technology response too long')
  }),
  maturityLevel: z.enum(['idea', 'startup', 'pyme', 'corporate']),
  companyId: z.string().uuid('Invalid company ID format'),
  userId: z.string().uuid('Invalid user ID format'),
  projectId: z.string().uuid('Invalid project ID format')
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // Validate request body
    const body = await req.json();
    const validationResult = requestSchema.safeParse(body);
    
    if (!validationResult.success) {
      console.error('Validation error:', validationResult.error);
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data',
          details: validationResult.error.issues.map(i => i.message)
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const { formResponses, maturityLevel, companyId, userId, projectId } = validationResult.data;

    console.log('Analyzing diagnosis for company:', companyId);

    // Construir prompt para análisis
    const systemPrompt = `Eres un consultor empresarial experto. Analiza las respuestas del diagnóstico empresarial y genera un análisis estructurado.

Debes analizar 6 áreas clave:
1. **Estrategia**: Visión, misión, objetivos, posicionamiento
2. **Operaciones**: Procesos, eficiencia, calidad, cadena de suministro
3. **Finanzas**: Rentabilidad, flujo de caja, control presupuestario
4. **Marketing**: Marca, canales, adquisición, retención de clientes
5. **Legal**: Compliance, contratos, protección de datos, riesgos legales
6. **Tecnología**: Infraestructura, digitalización, ciberseguridad, innovación

Para cada área, asigna un score de 0 a 100 basado en:
- 0-20: Área crítica, requiere atención inmediata
- 21-40: Área débil, necesita mejoras significativas
- 41-60: Área en desarrollo, puede optimizarse
- 61-80: Área sólida, con oportunidades de mejora
- 81-100: Área excelente, mantener y evolucionar

Genera también:
- 3-5 insights clave (máximo 100 caracteres cada uno)
- 2-3 áreas críticas a mejorar (las de menor score)

IMPORTANTE: Responde SOLO con JSON válido en este formato exacto:
{
  "scores": {
    "strategy": 65,
    "operations": 45,
    "finance": 50,
    "marketing": 38,
    "legal": 55,
    "technology": 42
  },
  "insights": [
    "Falta claridad en la propuesta de valor diferenciada",
    "Procesos operativos poco documentados y estandarizados",
    "Necesidad urgente de mejorar presencia digital"
  ],
  "critical_areas": ["marketing", "technology", "operations"]
}`;

    const userPrompt = `Nivel de madurez: ${maturityLevel}

Respuestas del formulario:
${JSON.stringify(formResponses, null, 2)}

Analiza estas respuestas y proporciona el diagnóstico en formato JSON.`;

    // Llamar a Lovable AI
    console.log('Calling Lovable AI for analysis...');
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
          { role: 'user', content: userPrompt }
        ],
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('Lovable AI error:', response.status, errorText);
      throw new Error(`AI analysis failed: ${response.status}`);
    }

    const data = await response.json();
    const analysisText = data.choices[0].message.content;
    
    console.log('AI response:', analysisText);

    // Extraer JSON del response (puede venir con markdown)
    let analysis;
    try {
      // Intentar parsear directamente
      analysis = JSON.parse(analysisText);
    } catch {
      // Si falla, buscar JSON en el texto (puede estar en bloques de código)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No valid JSON found in AI response');
      }
    }

    // Validar estructura
    if (!analysis.scores || !analysis.insights || !analysis.critical_areas) {
      throw new Error('Invalid analysis structure from AI');
    }

    // Guardar en base de datos
    const { data: diagnosis, error: dbError } = await supabase
      .from('diagnoses')
      .insert({
        company_id: companyId,
        user_id: userId,
        project_id: projectId,
        version: 1,
        strategy_score: analysis.scores.strategy,
        operations_score: analysis.scores.operations,
        finance_score: analysis.scores.finance,
        marketing_score: analysis.scores.marketing,
        legal_score: analysis.scores.legal,
        technology_score: analysis.scores.technology,
        form_responses: formResponses,
        maturity_level: maturityLevel,
        insights: {
          insights: analysis.insights,
          critical_areas: analysis.critical_areas
        }
      })
      .select()
      .single();

    if (dbError) {
      console.error('Database error:', dbError);
      throw dbError;
    }

    console.log('Diagnosis saved successfully:', diagnosis.id);

    return new Response(
      JSON.stringify({
        diagnosis_id: diagnosis.id,
        scores: analysis.scores,
        insights: analysis.insights,
        critical_areas: analysis.critical_areas
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in diagnose-company:', error);
    return new Response(
      JSON.stringify({ 
        error: 'An error occurred processing your diagnosis',
        code: 'DIAGNOSIS_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
