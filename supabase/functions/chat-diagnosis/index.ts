import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

// Validation schemas
const messageSchema = z.object({
  role: z.enum(['user', 'assistant', 'system']),
  content: z.string().max(10000, 'Message content too long')
});

const companyInfoSchema = z.object({
  name: z.string().min(1).max(200, 'Company name too long'),
  industry: z.string().min(1).max(200, 'Industry name too long'),
  stage: z.enum(['idea', 'startup', 'pyme', 'corporate']),
  projectName: z.string().min(1).max(200, 'Project name too long'),
  projectDescription: z.string().max(500, 'Project description too long').optional()
});

const requestSchema = z.object({
  messages: z.array(messageSchema).max(100, 'Too many messages'),
  companyInfo: companyInfoSchema.optional(),
  isComplete: z.boolean().optional(),
  mode: z.enum(['diagnosis', 'strategic', 'follow_up', 'document', 'contextual']).optional(),
  context: z.object({
    currentPage: z.string().optional(),
    project: z.object({
      id: z.string(),
      name: z.string()
    }).nullable().optional(),
    focus: z.object({
      kpiId: z.string().optional(),
      kpiName: z.string().optional(),
      taskId: z.string().optional(),
      documentId: z.string().optional()
    }).optional(),
    data: z.any().optional() // Datos contextuales de la página
  }).optional()
});

// KPI validation schema for chat commands
const kpiDataSchema = z.object({
  name: z.string()
    .min(1, 'El nombre del KPI no puede estar vacío')
    .max(100, 'El nombre del KPI es demasiado largo (máximo 100 caracteres)')
    .regex(/^[a-záéíóúñ0-9\s\-_]+$/i, 'El nombre contiene caracteres no permitidos'),
  area: z.enum(['estrategia', 'finanzas', 'marketing', 'operaciones', 'tecnología', 'legal', 'general'], {
    errorMap: () => ({ message: 'Área inválida. Debe ser: estrategia, finanzas, marketing, operaciones, tecnología, legal o general' })
  }),
  value: z.number()
    .min(-1000000000, 'El valor es demasiado bajo')
    .max(1000000000, 'El valor es demasiado alto')
    .finite('El valor debe ser un número finito'),
  target_value: z.number()
    .min(-1000000000, 'El valor objetivo es demasiado bajo')
    .max(1000000000, 'El valor objetivo es demasiado alto')
    .finite('El valor objetivo debe ser un número finito')
    .nullable()
    .optional(),
  unit: z.string()
    .max(20, 'La unidad es demasiado larga (máximo 20 caracteres)')
    .regex(/^[a-z$€£%]+$/i, 'Formato de unidad inválido')
    .nullable()
    .optional(),
  period_start: z.date()
    .min(new Date('2000-01-01'), 'La fecha de inicio está muy en el pasado (mínimo: año 2000)')
    .max(new Date('2100-12-31'), 'La fecha de inicio está muy en el futuro (máximo: año 2100)'),
  period_end: z.date()
    .min(new Date('2000-01-01'), 'La fecha de fin está muy en el pasado (mínimo: año 2000)')
    .max(new Date('2100-12-31'), 'La fecha de fin está muy en el futuro (máximo: año 2100)')
}).refine(data => data.period_end >= data.period_start, {
  message: 'La fecha de fin debe ser igual o posterior a la fecha de inicio'
});

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { messages, companyInfo, isComplete, mode = 'diagnosis', context: requestContext } = validationResult.data;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Modo contextual: asistente global
    if (mode === 'contextual') {
      const { currentPage, project, focus, data } = requestContext || {};
      
      const pageName = currentPage === '/' ? 'Dashboard' : 
                       currentPage === '/kpis' ? 'KPIs' : 
                       currentPage === '/tasks' ? 'Tareas' : 
                       currentPage === '/documents' ? 'Documentos' : 
                       currentPage || 'la aplicación';

      let systemPrompt = `Eres Alasha AI, un asistente empresarial experto que ayuda al usuario en la página "${pageName}"`;
      
      if (project) {
        systemPrompt += ` del proyecto "${project.name}"`;
      }
      
      // Añadir datos contextuales si existen
      if (data) {
        if (data.tasks && Array.isArray(data.tasks)) {
          const urgentTasks = data.tasks.filter((t: any) => t.priority === 'high' && t.status !== 'completed');
          const inProgressTasks = data.tasks.filter((t: any) => t.status === 'in_progress');
          const completedTasks = data.tasks.filter((t: any) => t.status === 'completed');
          
          systemPrompt += `\n\nINFORMACIÓN DE TAREAS DEL PROYECTO:
- Total de tareas: ${data.tasks.length}
- Tareas completadas: ${completedTasks.length}
- Tareas en progreso: ${inProgressTasks.length}
- Tareas urgentes (prioridad alta): ${urgentTasks.length}

TAREAS URGENTES:
${urgentTasks.length > 0 ? urgentTasks.map((t: any) => 
  `• ${t.title} - ${t.status} ${t.due_date ? `(Fecha límite: ${new Date(t.due_date).toLocaleDateString()})` : ''}`
).join('\n') : '(No hay tareas urgentes pendientes)'}

TAREAS EN PROGRESO:
${inProgressTasks.length > 0 ? inProgressTasks.slice(0, 5).map((t: any) => 
  `• ${t.title} - Prioridad: ${t.priority}`
).join('\n') : '(No hay tareas en progreso)'}`;
        }
        
        if (data.kpis && Array.isArray(data.kpis)) {
          systemPrompt += `\n\nINFORMACIÓN DE KPIs DEL PROYECTO:
- Total de KPIs: ${data.kpis.length}

KPIs ACTUALES:
${data.kpis.map((k: any) => {
  const progress = k.target_value ? Math.round((k.value / k.target_value) * 100) : 0;
  const onTarget = k.target_value ? k.value >= k.target_value : null;
  return `• ${k.name} (${k.area}): ${k.value}${k.unit || ''} ${k.target_value ? `/ Meta: ${k.target_value}${k.unit || ''} (${progress}% ${onTarget ? '✓ En meta' : '⚠ Bajo meta'})` : ''}`;
}).join('\n')}`;

          if (data.selectedKPI) {
            systemPrompt += `\n\nKPI ACTUALMENTE SELECCIONADO:
• ${data.selectedKPI.name}: ${data.selectedKPI.value}${data.selectedKPI.unit || ''}${data.selectedKPI.target_value ? ` / Meta: ${data.selectedKPI.target_value}${data.selectedKPI.unit || ''}` : ''}`;
          }
        }
      }
      
      if (focus) {
        if (focus.kpiName) systemPrompt += `\n\nEl usuario está consultando el KPI: ${focus.kpiName}`;
        if (focus.taskId) systemPrompt += `\n\nEl usuario está consultando una tarea específica`;
        if (focus.documentId) systemPrompt += `\n\nEl usuario está consultando un documento específico`;
      }
      
      systemPrompt += `.\n\nINSTRUCCIONES:
- Usa la información proporcionada arriba para dar respuestas específicas y precisas
- Si el usuario pregunta por datos (tareas, KPIs), usa SOLO la información real que te di
- Sé breve, específico y accionable
- No inventes números ni información que no tienes
- Si no tienes la información solicitada, dilo claramente
- Responde en español`;

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
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (response.status === 402) {
          return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        const errorText = await response.text();
        console.error('Lovable AI error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI gateway error' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    // Si el usuario indica que terminó, generamos el diagnóstico final
    if (isComplete) {
      if (!companyInfo) {
        return new Response(JSON.stringify({ error: 'companyInfo is required when isComplete is true' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const authHeader = req.headers.get('Authorization');
      if (!authHeader) {
        throw new Error('No authorization header');
      }
      
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      // Obtener el usuario del token JWT usando el service role key
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error: userError } = await supabase.auth.getUser(token);
      
      if (userError || !user) {
        console.error('Auth error:', userError);
        throw new Error('Usuario no autenticado');
      }

      // Buscar diagnósticos previos y plan activo
      let existingDiagnoses: any[] = [];
      let latestVersion = 0;
      let previousDiagnosis: any = null;
      let activePlan: any = null;

      // Buscar si existe proyecto con ese nombre
      const { data: existingProjects } = await supabase
        .from('projects')
        .select('id')
        .eq('name', companyInfo.projectName)
        .limit(1);

      if (existingProjects && existingProjects.length > 0) {
        const projectId = existingProjects[0].id;

        // Obtener diagnósticos previos
        const { data: diagnoses } = await supabase
          .from('diagnoses')
          .select('*')
          .eq('project_id', projectId)
          .order('version', { ascending: false });

        if (diagnoses && diagnoses.length > 0) {
          existingDiagnoses = diagnoses;
          previousDiagnosis = diagnoses[0];
          latestVersion = previousDiagnosis.version || 0;
        }

        // Obtener plan activo con toda su estructura
        const { data: plans } = await supabase
          .from('action_plans')
          .select(`
            *,
            plan_areas (
              *,
              plan_objectives (
                *,
                tasks (*)
              )
            )
          `)
          .eq('project_id', projectId)
          .eq('status', 'active')
          .maybeSingle();

        activePlan = plans;
      }

      // Construir contexto histórico si existe
      let historicalContext = '';
      if (previousDiagnosis && activePlan) {
        const allTasks = activePlan.plan_areas?.flatMap((a: any) => 
          a.plan_objectives?.flatMap((o: any) => o.tasks || []) || []
        ) || [];
        const completedTasks = allTasks.filter((t: any) => t.status === 'completed');
        const inProgressTasks = allTasks.filter((t: any) => t.status === 'in_progress');
        
        // Calcular estadísticas por área
        const areaStats = new Map();
        if (activePlan.plan_areas) {
          activePlan.plan_areas.forEach((area: any) => {
            const areaTasks = area.plan_objectives?.flatMap((o: any) => o.tasks || []) || [];
            const areaCompleted = areaTasks.filter((t: any) => t.status === 'completed');
            const areaInProgress = areaTasks.filter((t: any) => t.status === 'in_progress');
            
            areaStats.set(area.name, {
              total: areaTasks.length,
              completed: areaCompleted.length,
              inProgress: areaInProgress.length,
              progress: areaTasks.length > 0 ? Math.round((areaCompleted.length / areaTasks.length) * 100) : 0,
              completedTasks: areaCompleted.map((t: any) => ({
                title: t.title,
                completed_at: t.completed_at
              })),
              objectives: area.plan_objectives?.map((o: any) => o.title) || []
            });
          });
        }
        
        historicalContext = `
CONTEXTO DEL PROYECTO EXISTENTE:
- Nombre: ${companyInfo.projectName}
- Diagnósticos previos: ${existingDiagnoses.length}
- Última actualización: ${new Date(previousDiagnosis.created_at).toLocaleDateString()}

DIAGNÓSTICO ANTERIOR (Versión ${previousDiagnosis.version}):
- Maturity Level: ${previousDiagnosis.maturity_level}
- Scores previos:
  * Estrategia: ${previousDiagnosis.strategy_score}
  * Operaciones: ${previousDiagnosis.operations_score}
  * Finanzas: ${previousDiagnosis.finance_score}
  * Marketing: ${previousDiagnosis.marketing_score}
  * Legal: ${previousDiagnosis.legal_score}
  * Tecnología: ${previousDiagnosis.technology_score}

PLAN ACTUAL EN EJECUCIÓN (v${activePlan.version}):
- Total de tareas: ${allTasks.length}
- Tareas completadas: ${completedTasks.length} (${allTasks.length > 0 ? Math.round((completedTasks.length / allTasks.length) * 100) : 0}%)
- Tareas en progreso: ${inProgressTasks.length}

PROGRESO DETALLADO POR ÁREA:
${Array.from(areaStats.entries()).map(([areaName, stats]: [string, any]) => `
${areaName} - ${stats.progress}% completado:
  • Tareas: ${stats.completed}/${stats.total} completadas, ${stats.inProgress} en progreso
  • Objetivos del área:
${stats.objectives.map((obj: string) => `    - ${obj}`).join('\n')}
  • Logros completados:
${stats.completedTasks.length > 0 
  ? stats.completedTasks.map((t: any) => `    ✓ ${t.title}${t.completed_at ? ` (${new Date(t.completed_at).toLocaleDateString()})` : ''}`).join('\n')
  : '    (Sin tareas completadas aún)'}
`).join('\n')}

INSTRUCCIONES CRÍTICAS PARA ACTUALIZACIÓN:
1. **Reconoce el trabajo realizado**: Las tareas completadas arriba representan AVANCES REALES del usuario
2. **Ajusta scores según progreso**: Si completaron tareas de un área, el score de esa área debe MEJORAR
3. **Analiza la EVOLUCIÓN**: Compara scores anteriores con la situación actual considerando las tareas completadas
4. **Mantén continuidad**: Identifica áreas/objetivos que deben continuar (usa "action": "keep")
5. **NO recrees tareas existentes**: Solo agrega tareas NUEVAS marcadas con "is_new": true
6. **Prioriza según progreso**: Si un área tiene poco progreso, puede necesitar tareas más claras o diferentes
7. **Genera insights de CAMBIO**: Enfócate en evolución, no repitas análisis del diagnóstico anterior
8. **Incluye changes_summary**: Resumen de cómo evolucionó el proyecto desde el último diagnóstico

`;
      }

      // Extraer información de los mensajes
      const conversationHistory = messages.map((m: Message) => 
        `${m.role === 'user' ? 'Usuario' : 'Asistente'}: ${m.content}`
      ).join('\n\n');

      // Analizar con IA para generar diagnóstico
      const analysisPrompt = `Analiza la siguiente conversación sobre una empresa y genera ${previousDiagnosis ? 'una ACTUALIZACIÓN del' : 'un'} diagnóstico empresarial completo y un plan de acción estratégico.

Información de la empresa:
- Nombre: ${companyInfo.name}
- Industria: ${companyInfo.industry}
- Etapa: ${companyInfo.stage}
- Proyecto: ${companyInfo.projectName}
${companyInfo.projectDescription ? `- Descripción del proyecto: ${companyInfo.projectDescription}` : ''}

${historicalContext}

Conversación${previousDiagnosis ? ' (Nueva información del usuario)' : ''}:
${conversationHistory}

INSTRUCCIONES:
1. Analiza la conversación y asigna scores (0-100) para cada área${previousDiagnosis ? ', considerando evolución' : ''}:
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

4. GENERA UN PLAN DE ACCIÓN COMPLETO con:
   - Áreas de acción (basadas en los scores más bajos)
   - Objetivos específicos por área
   - Tareas concretas y accionables
   - Prioridades (high, medium, low)
   - Estimación de esfuerzo en días

5. GENERA KPIs EMPRESARIALES (5-10 indicadores clave):
   - Basándote en la conversación y el sector/industria
   - Si el usuario mencionó números (ej: "vendemos $10k/mes"), úsalos
   - Si no hay datos, usa benchmarks típicos del sector y etapa
   - Prioriza KPIs accionables y relevantes (no vanity metrics)
   - Ejemplos por sector:
     * SaaS: MRR, Churn Rate, CAC, LTV, Active Users
     * E-commerce: Conversion Rate, AOV, Cart Abandonment, Customer Retention
     * Servicios: Utilization Rate, Revenue per Employee, Client Retention

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
  "maturity_level": "emergente" | "en_desarrollo" | "maduro" | "optimizado",
  "insights": {
    "strategy": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "operations": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "finance": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "marketing": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "legal": { "strengths": string[], "improvements": string[], "recommendations": string[] },
    "technology": { "strengths": string[], "improvements": string[], "recommendations": string[] }
  },
  "action_plan": {
    ${previousDiagnosis ? '"changes_summary": "Breve resumen de cambios principales",' : ''}
    "areas": [
      {
        "name": string,
        "description": string,
        "target_score": number,
        ${previousDiagnosis ? '"action": "keep" | "update" | "new",' : ''}
        "objectives": [
          {
            "title": string,
            "description": string,
            "priority": "high" | "medium" | "low",
            ${previousDiagnosis ? '"action": "keep" | "update" | "new",' : ''}
            "tasks": [
              {
                "title": string,
                "description": string,
                "priority": "high" | "medium" | "low",
                "estimated_effort": number,
                ${previousDiagnosis ? '"is_new": true  // SOLO tareas NUEVAS' : ''}
              }
            ]
          }
        ]
      }
    ]
  },
  "suggested_kpis": [
    {
      "area": "marketing" | "finance" | "operations" | "strategy" | "technology" | "legal",
      "name": string,
      "current_value": number,
      "target_value": number,
      "unit": string,
      "period": "daily" | "weekly" | "monthly" | "quarterly" | "yearly",
      "source": "user_provided" | "estimated" | "benchmark"
    }
  ]
}${previousDiagnosis ? `

IMPORTANTE: Solo incluye tareas marcadas con "is_new": true. NO incluyas tareas existentes.` : ''}`;

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

      // Validar estructura del diagnosis
      if (!diagnosis.scores || !diagnosis.maturity_level || !diagnosis.insights || !diagnosis.action_plan) {
        console.error('Estructura inválida del diagnóstico:', diagnosis);
        throw new Error('El análisis del LLM no tiene la estructura esperada');
      }

      // Validar maturity_level
      const validMaturityLevels = ['emergente', 'en_desarrollo', 'maduro', 'optimizado'];
      if (!validMaturityLevels.includes(diagnosis.maturity_level)) {
        console.error('Maturity level inválido:', diagnosis.maturity_level);
        diagnosis.maturity_level = 'emergente'; // valor por defecto
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

      // Crear o actualizar proyecto
      let projectData;
      if (existingProjects && existingProjects.length > 0) {
        // Usar proyecto existente
        const { data: project } = await supabase
          .from('projects')
          .select('*')
          .eq('id', existingProjects[0].id)
          .single();
        projectData = project;
      } else {
        // Crear nuevo proyecto
        const { data: newProject, error: projectError } = await supabase
          .from('projects')
          .insert({
            name: companyInfo.projectName,
            description: companyInfo.projectDescription || null,
            company_id: companyId,
            status: 'active',
            is_default: true
          })
          .select()
          .single();

        if (projectError) throw projectError;
        projectData = newProject;
      }

      // Guardar diagnóstico (nuevo o actualización)
      const newVersion = latestVersion + 1;
      const { data: diagnosisData, error: diagnosisError } = await supabase
        .from('diagnoses')
        .insert({
          company_id: companyId,
          user_id: user.id,
          project_id: projectData.id,
          version: newVersion,
          maturity_level: diagnosis.maturity_level,
          strategy_score: diagnosis.scores.strategy,
          operations_score: diagnosis.scores.operations,
          finance_score: diagnosis.scores.finance,
          marketing_score: diagnosis.scores.marketing,
          legal_score: diagnosis.scores.legal,
          technology_score: diagnosis.scores.technology,
          insights: diagnosis.insights,
          form_responses: { 
            conversation: conversationHistory,
            is_update: latestVersion > 0,
            previous_version: latestVersion > 0 ? latestVersion : undefined
          }
        })
        .select()
        .single();

      if (diagnosisError) {
        console.error('Error saving diagnosis:', diagnosisError);
        throw new Error(`Error al guardar diagnóstico: ${diagnosisError.message}`);
      }

      console.log(`Diagnosis v${newVersion} saved:`, diagnosisData.id);

      // Crear o actualizar plan de acción
      const incrementVersion = (v: string) => {
        const parts = v.split('.');
        const minor = parseInt(parts[1] || '0') + 1;
        return `${parts[0]}.${minor}`;
      };

      let planData: any;
      if (activePlan) {
        // Actualizar plan existente
        const newPlanVersion = incrementVersion(activePlan.version || '1.0');
        const { data: updatedPlan, error: planError } = await supabase
          .from('action_plans')
          .update({
            diagnosis_id: diagnosisData.id,
            version: newPlanVersion,
            description: `Plan actualizado - Diagnóstico v${newVersion}`,
            updated_at: new Date().toISOString(),
            metadata: {
              ...activePlan.metadata,
              previous_version: activePlan.version,
              changes_summary: diagnosis.action_plan.changes_summary || 'Plan actualizado',
              updated_at: new Date().toISOString()
            }
          })
          .eq('id', activePlan.id)
          .select()
          .single();

        if (planError) throw planError;
        planData = updatedPlan;
        console.log(`Plan updated to v${newPlanVersion}:`, planData.id);
      } else {
        // Crear nuevo plan
        const { data: newPlan, error: planError } = await supabase
          .from('action_plans')
          .insert({
            company_id: companyId,
            project_id: projectData.id,
            diagnosis_id: diagnosisData.id,
            title: `Plan de Acción - ${companyInfo.projectName}`,
            description: `Plan generado automáticamente basado en el diagnóstico conversacional`,
            version: '1.0',
            status: 'active',
            time_horizon: 90
          })
          .select()
          .single();

        if (planError) throw planError;
        planData = newPlan;
        console.log('Plan v1.0 created:', planData.id);
      }

      // Procesar áreas, objetivos y tareas
      if (diagnosis.action_plan?.areas) {
        for (const area of diagnosis.action_plan.areas) {
          const areaAction = area.action || 'new';
          
          let areaData: any;
          
          // Buscar área existente si es actualización
          if (activePlan && (areaAction === 'keep' || areaAction === 'update')) {
            const existingArea = activePlan.plan_areas?.find((a: any) => 
              a.name.toLowerCase() === area.name.toLowerCase()
            );

            if (existingArea) {
              if (areaAction === 'update') {
                await supabase
                  .from('plan_areas')
                  .update({ target_score: area.target_score, description: area.description })
                  .eq('id', existingArea.id);
              }
              areaData = existingArea;
              console.log(`Area "${area.name}" kept/updated`);
            } else {
              // Crear si no existe
              const { data: newArea, error: areaError } = await supabase
                .from('plan_areas')
                .insert({
                  plan_id: planData.id,
                  name: area.name,
                  description: area.description,
                  target_score: area.target_score,
                  order_index: diagnosis.action_plan.areas.indexOf(area)
                })
                .select()
                .single();

              if (areaError) continue;
              areaData = newArea;
            }
          } else {
            // Crear nueva área
            const { data: newArea, error: areaError } = await supabase
              .from('plan_areas')
              .insert({
                plan_id: planData.id,
                name: area.name,
                description: area.description,
                target_score: area.target_score,
                order_index: diagnosis.action_plan.areas.indexOf(area)
              })
              .select()
              .single();

            if (areaError) continue;
            areaData = newArea;
          }

          // Procesar objetivos
          for (const objective of area.objectives) {
            const objectiveAction = objective.action || 'new';
            let objectiveData: any;

            if (areaData.plan_objectives && (objectiveAction === 'keep' || objectiveAction === 'update')) {
              const existingObjective = areaData.plan_objectives?.find((o: any) => 
                o.title.toLowerCase().includes(objective.title.toLowerCase().substring(0, 20))
              );

              if (existingObjective) {
                if (objectiveAction === 'update') {
                  await supabase
                    .from('plan_objectives')
                    .update({ description: objective.description, priority: objective.priority })
                    .eq('id', existingObjective.id);
                }
                objectiveData = existingObjective;
              } else {
                const { data: newObj } = await supabase
                  .from('plan_objectives')
                  .insert({
                    area_id: areaData.id,
                    title: objective.title,
                    description: objective.description,
                    priority: objective.priority,
                    order_index: area.objectives.indexOf(objective)
                  })
                  .select()
                  .single();
                objectiveData = newObj;
              }
            } else {
              const { data: newObj } = await supabase
                .from('plan_objectives')
                .insert({
                  area_id: areaData.id,
                  title: objective.title,
                  description: objective.description,
                  priority: objective.priority,
                  order_index: area.objectives.indexOf(objective)
                })
                .select()
                .single();
              objectiveData = newObj;
            }

            if (!objectiveData) continue;

            // Procesar tareas (solo nuevas si es actualización)
            for (const task of objective.tasks) {
              // Si es actualización y no está marcada como nueva, saltarla
              if (activePlan && !task.is_new && objectiveAction === 'keep') {
                continue;
              }

              // Verificar duplicados
              if (objectiveData.tasks) {
                const exists = objectiveData.tasks.some((t: any) => 
                  t.title.toLowerCase().includes(task.title.toLowerCase().substring(0, 15))
                );
                if (exists) continue;
              }

              await supabase
                .from('tasks')
                .insert({
                  objective_id: objectiveData.id,
                  title: task.title,
                  description: task.description,
                  priority: task.priority,
                  estimated_effort: task.estimated_effort,
                  status: 'pending'
                });
            }
          }
        }
      }

      // Insertar KPIs sugeridos por el LLM
      if (diagnosis.suggested_kpis && Array.isArray(diagnosis.suggested_kpis) && diagnosis.suggested_kpis.length > 0) {
        console.log(`Inserting ${diagnosis.suggested_kpis.length} suggested KPIs`);
        
        // Calcular period_end basado en el period
        const getPeriodEnd = (period: string, start: Date) => {
          const periodMap: { [key: string]: number } = {
            daily: 1,
            weekly: 7,
            monthly: 30,
            quarterly: 90,
            yearly: 365
          };
          const days = periodMap[period] || 30;
          return new Date(start.getTime() + days * 24 * 60 * 60 * 1000).toISOString();
        };

        const now = new Date();
        const kpisToInsert = diagnosis.suggested_kpis.map((kpi: any) => ({
          company_id: companyId,
          area: kpi.area,
          name: kpi.name,
          value: kpi.current_value,
          target_value: kpi.target_value,
          unit: kpi.unit || null,
          period_start: now.toISOString(),
          period_end: getPeriodEnd(kpi.period, now),
          source: kpi.source || 'ai_estimated',
          metadata: {
            generated_by: 'chat_diagnosis',
            diagnosis_id: diagnosisData.id,
            diagnosis_version: newVersion,
            period: kpi.period
          }
        }));

        const { error: kpisError } = await supabase
          .from('kpis')
          .insert(kpisToInsert);

        if (kpisError) {
          console.error('Error inserting KPIs:', kpisError);
          // No lanzar error, solo loguearlo
        } else {
          console.log(`${kpisToInsert.length} KPIs inserted successfully`);
        }
      }

      return new Response(
        JSON.stringify({ 
          diagnosis_id: diagnosisData.id,
          complete: true 
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Conversación normal con streaming
    
    // Obtener contexto adicional según el modo
    let additionalContext = '';
    
    if (mode === 'follow_up' || mode === 'document') {
      if (!companyInfo) {
        return new Response(JSON.stringify({ error: 'companyInfo is required for follow_up and document modes' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseClient = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        
        // Obtener info del proyecto actual
        const { data: projects } = await supabaseClient
          .from('projects')
          .select(`
            *,
            action_plans!inner(
              *,
              plan_areas(
                *,
                plan_objectives(
                  *,
                  tasks(*)
                )
              )
            ),
            kpis(*)
          `)
          .eq('name', companyInfo.projectName)
          .eq('action_plans.status', 'active')
          .limit(1);
        
        if (projects && projects.length > 0) {
          const project = projects[0];
          const plan = project.action_plans[0];
          
          if (mode === 'follow_up' && plan) {
            const allTasks = plan.plan_areas?.flatMap((a: any) => 
              a.plan_objectives?.flatMap((o: any) => o.tasks || []) || []
            ) || [];
            const pending = allTasks.filter((t: any) => t.status === 'pending');
            const inProgress = allTasks.filter((t: any) => t.status === 'in_progress');
            const completed = allTasks.filter((t: any) => t.status === 'completed');
            
            additionalContext = `
CONTEXTO DEL PLAN ACTIVO (v${plan.version}):
- Total tareas: ${allTasks.length}
- Completadas: ${completed.length} (${allTasks.length > 0 ? Math.round((completed.length / allTasks.length) * 100) : 0}%)
- En progreso: ${inProgress.length}
- Pendientes: ${pending.length}

ÁREAS DEL PLAN:
${plan.plan_areas?.map((area: any) => {
  const areaTasks = area.plan_objectives?.flatMap((o: any) => o.tasks || []) || [];
  const areaCompleted = areaTasks.filter((t: any) => t.status === 'completed').length;
  return `- ${area.name}: ${areaCompleted}/${areaTasks.length} tareas completadas`;
}).join('\n')}

TAREAS RECIENTES:
${completed.slice(0, 5).map((t: any) => `✓ ${t.title}`).join('\n')}

KPIS ACTUALES:
${project.kpis?.slice(0, 5).map((k: any) => `- ${k.name}: ${k.value}${k.unit || ''} (meta: ${k.target_value}${k.unit || ''})`).join('\n') || 'Sin KPIs registrados'}`;
          }
          
          if (mode === 'document') {
            const { data: docs } = await supabaseClient
              .from('documents')
              .select('*')
              .eq('analysis_status', 'completed')
              .order('created_at', { ascending: false })
              .limit(5);
            
            if (docs && docs.length > 0) {
              additionalContext = `
DOCUMENTOS RECIENTES ANALIZADOS:
${docs.map(d => `
- ${d.file_name} (${d.category || 'General'})
  Resumen: ${d.analysis_summary?.substring(0, 150) || 'Sin resumen'}...
  Insights: ${d.analysis_insights?.slice(0, 2).join(', ') || 'Sin insights'}
`).join('\n')}`;
            }
          }
        }
      }
    }
    
    // Default prompts (fallback)
    const DEFAULT_PROMPTS: Record<string, string> = {
      diagnosis: `Eres un consultor empresarial experto especializado en diagnósticos organizacionales.

Tu rol es realizar un diagnóstico completo a través de una conversación estructurada en 6 áreas clave:
1. **Estrategia** (strategy)
2. **Operaciones** (operations)
3. **Finanzas** (finance)
4. **Marketing** (marketing)
5. **Legal** (legal)
6. **Tecnología** (technology)

## REGLAS FUNDAMENTALES:

1. **Una pregunta a la vez**: Haz SOLO una pregunta por turno, clara y específica.

2. **Profundidad antes de avance**: NO cambies de área hasta que la respuesta contenga:
   - Datos concretos (números, métricas, porcentajes)
   - Ejemplos específicos
   - Herramientas o procesos mencionados
   - Responsables identificados

3. **Validación de respuestas**: Si la respuesta es vaga o muy general, pide aclaración con ejemplos concretos.

4. **Metadata en respuesta**: SIEMPRE incluye al inicio de tu respuesta un bloque de metadata en este formato:
   \`\`\`
   ---
   section: strategy|operations|finance|marketing|legal|technology
   needs_more: true|false
   confidence: low|medium|high
   ---
   \`\`\`

5. **Quick Actions**: Si el usuario escribe un comando que comienza con:
   - "Crear tarea:"
   - "Actualizar KPI:"
   - "Crear objetivo:"
   
   Ejecuta el comando normalmente, pero NO cambies de área. Confirma la acción y regresa a la pregunta actual.

6. **Adaptación por etapa**:
   - **Idea**: Enfócate en visión, validación de mercado, MVP
   - **Startup**: Enfócate en product-market fit, tracción, fundraising
   - **PYME**: Enfócate en eficiencia operativa, escalabilidad, procesos
   - **Corporate**: Enfócate en optimización, transformación digital, governance

7. **NO generes diagnóstico**: Tu trabajo es SOLO recopilar información. El diagnóstico final se genera en otro proceso.

## ESTILO DE CONVERSACIÓN:

- Sé conversacional pero profesional
- Usa ejemplos relevantes al sector de la empresa
- Reconoce logros antes de profundizar en problemas
- Máximo 120 palabras por respuesta
- Usa markdown para énfasis y estructura

## INFORMACIÓN DEL PROYECTO:
- Empresa: {{COMPANY_NAME}}
- Sector: {{COMPANY_INDUSTRY}}
- Etapa: {{COMPANY_STAGE}}
- Proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

## GUÍA DE PROGRESO:
- Después de 8-12 intercambios significativos, pregunta: "¿Te gustaría que genere ahora el diagnóstico completo y un plan de acción personalizado?"
- Si el usuario acepta, responde con: "¡Perfecto! Haz clic en el botón 'Generar Diagnóstico' para crear tu análisis completo y plan de acción."`,
      
      strategic: `Eres un consultor estratégico senior especializado en visión de largo plazo y dirección empresarial.

INFORMACIÓN DEL PROYECTO:
- Empresa: {{COMPANY_NAME}}
- Industria: {{COMPANY_INDUSTRY}}
- Etapa: {{COMPANY_STAGE}}
- Proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

TU ROL (MODO MENTOR ESTRATÉGICO):
Proporcionar orientación estratégica de alto nivel, enfocándote en:
- **Visión de largo plazo**: Ayudar a definir dirección a 3-5 años
- **Liderazgo**: Guiar en toma de decisiones complejas
- **Posicionamiento**: Análisis de mercado, competencia y diferenciación
- **Modelos de negocio**: Evaluar y optimizar cómo se genera valor
- **Expansión y escalabilidad**: Estrategias de crecimiento sostenible

FRAMEWORKS Y HERRAMIENTAS:
- SWOT, Porter's Five Forces, Blue Ocean Strategy
- Business Model Canvas, Value Proposition Canvas
- OKRs para alineación estratégica
- Análisis de escenarios y planificación estratégica

QUICK ACTIONS (Comandos disponibles):
- "Crear tarea: [descripción]" → Crea una tarea estratégica
- "Actualizar KPI [nombre] a [valor]" → Actualiza un KPI
- "Crear objetivo estratégico: [título]" → Crea un objetivo de largo plazo

ESTILO:
- Directo pero reflexivo
- Fundamentado en frameworks reconocidos
- Usa ejemplos concretos y casos de éxito relevantes a {{COMPANY_INDUSTRY}}
- Haz preguntas desafiantes que inviten a pensar estratégicamente
- Conecta decisiones tácticas con impacto estratégico`,
      
      follow_up: `Eres un coach operativo especializado en ejecución táctica y seguimiento de planes.

INFORMACIÓN DEL PROYECTO:
- Empresa: {{COMPANY_NAME}}
- Industria: {{COMPANY_INDUSTRY}}
- Proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

${additionalContext}

TU ROL (MODO COACH OPERATIVO):
Ayudar al usuario a ejecutar su plan con excelencia, enfocándote en:
- **Ejecución táctica**: Cómo hacer las cosas, no solo qué hacer
- **Priorización**: Identificar lo urgente vs importante
- **Productividad**: Optimizar tiempo y recursos
- **Resolución de bloqueos**: Desatorar tareas estancadas
- **Accountability**: Mantener compromiso con los objetivos

QUICK ACTIONS (Comandos disponibles):
- "Crear tarea: [descripción]" → Crea una tarea operativa
- "Marcar tarea [id] como completada" → Actualiza estado de tarea
- "Actualizar progreso de [área]" → Registra avance
- "Crear objetivo: [título]" → Agrega un nuevo objetivo táctico

ENFOQUE:
- Analiza el progreso actual del plan (% completado, tareas bloqueadas)
- Identifica patrones: ¿qué áreas avanzan? ¿cuáles están estancadas?
- Propón soluciones prácticas y específicas
- Celebra los avances reales (reconoce tareas completadas)
- Sugiere próximos pasos claros y accionables

ESTILO:
- Práctico y orientado a acción inmediata
- Motiva reconociendo logros
- Usa técnicas de coaching (preguntas poderosas)
- Proporciona recursos y tácticas concretas
- Mantén foco en resultados medibles`,
      
      document: `Eres un analista de datos empresariales especializado en extraer insights accionables.

INFORMACIÓN DEL PROYECTO:
- Empresa: {{COMPANY_NAME}}
- Industria: {{COMPANY_INDUSTRY}}
- Proyecto: {{PROJECT_NAME}}
{{PROJECT_DESCRIPTION}}

${additionalContext}

TU ROL (MODO ANALISTA DE DATOS):
Ayudar al usuario a tomar decisiones basadas en datos, enfocándote en:
- **Análisis de documentos**: Extraer información clave de reportes, estados financieros, etc.
- **Identificación de tendencias**: Detectar patrones en KPIs y métricas
- **Conexión estratégica**: Vincular datos con objetivos del negocio
- **Detección de riesgos**: Identificar señales de alerta temprana
- **Oportunidades ocultas**: Encontrar insights no obvios en los datos

QUICK ACTIONS (Comandos disponibles):
- "Actualizar KPI [nombre] a [valor] [unidad]" → Registra nueva métrica
- "Crear tarea: Revisar [aspecto]" → Genera tarea de análisis
- "Alertar sobre [métrica]" → Configura alerta de KPI

CAPACIDADES DE ANÁLISIS:
- Documentos financieros (P&L, Balance, Cash Flow)
- Reportes de marketing (CAC, LTV, Conversion rates)
- Datos operativos (eficiencia, productividad)
- Métricas legales y de compliance
- Indicadores tecnológicos (uptime, performance)

ESTILO:
- Analítico pero accesible (no uses jerga innecesaria)
- Enfocado en insights ACCIONABLES, no solo datos
- Conecta siempre los números con estrategia
- Proporciona contexto (benchmarks del sector)
- Usa analogías y visualizaciones mentales para clarificar`
    };

    // Inicializar con prompt por defecto según el modo
    let systemPromptTemplate = DEFAULT_PROMPTS[mode] || DEFAULT_PROMPTS['diagnosis'];

    // Intentar cargar prompt personalizado desde system_config
    try {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
        const supabaseClient = createClient(
          supabaseUrl,
          Deno.env.get('SUPABASE_ANON_KEY')!,
          { global: { headers: { Authorization: `Bearer ${token}` } } }
        );
        
        const promptKey = `chat_${mode}_system_prompt`;
        const { data: configData, error: configError } = await supabaseClient
          .from('system_config')
          .select('value')
          .eq('key', promptKey)
          .maybeSingle();

        // Si existe un prompt personalizado y no está vacío, usarlo
        if (!configError && configData?.value?.prompt && configData.value.prompt.trim() !== '') {
          systemPromptTemplate = configData.value.prompt;
          console.log(`Using custom prompt for mode: ${mode}`);
        }
      }
    } catch (e) {
      console.log(`Using default prompt for mode ${mode}:`, e);
    }

    // Detección y ejecución de Quick Actions
    let actionResults: any[] = [];
    const lastUserMessage = messages[messages.length - 1];
    
    if (lastUserMessage && lastUserMessage.role === 'user') {
      const userText = lastUserMessage.content;
      
      try {
        const authHeader = req.headers.get('Authorization');
        if (authHeader && companyInfo) {
          const token = authHeader.replace('Bearer ', '');
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseClient = createClient(
            supabaseUrl,
            Deno.env.get('SUPABASE_ANON_KEY')!,
            { global: { headers: { Authorization: `Bearer ${token}` } } }
          );
          
          // Obtener el usuario autenticado
          const { data: { user }, error: userError } = await supabaseClient.auth.getUser(token);
          if (!userError && user) {
            // Buscar proyecto actual
            const { data: projects } = await supabaseClient
              .from('projects')
              .select('id, company_id')
              .eq('name', companyInfo.projectName)
              .limit(1)
              .maybeSingle();
            
            if (projects) {
              const projectId = projects.id;
              const companyId = projects.company_id;
              
              // Patrón 1: "Crear tarea: [descripción]"
              const createTaskMatch = userText.match(/crear\s+tarea[:\s]+(.+)/i);
              if (createTaskMatch) {
                const taskTitle = createTaskMatch[1].trim();
                
                // Buscar plan activo
                const { data: activePlan } = await supabaseClient
                  .from('action_plans')
                  .select('id, plan_areas(id, plan_objectives(id))')
                  .eq('project_id', projectId)
                  .eq('status', 'active')
                  .maybeSingle();
                
                if (activePlan && activePlan.plan_areas && activePlan.plan_areas[0]?.plan_objectives?.[0]) {
                  const firstObjectiveId = activePlan.plan_areas[0].plan_objectives[0].id;
                  
                  const { data: newTask, error: taskError } = await supabaseClient
                    .from('tasks')
                    .insert({
                      objective_id: firstObjectiveId,
                      title: taskTitle,
                      description: `Tarea creada desde el chat en modo ${mode}`,
                      status: 'pending',
                      priority: 'medium',
                      estimated_effort: 1
                    })
                    .select()
                    .single();
                  
                  if (!taskError && newTask) {
                    actionResults.push({
                      type: 'task_created',
                      success: true,
                      data: { id: newTask.id, title: newTask.title }
                    });
                  }
                }
              }
              
              // Patrón 2: Comandos de KPI flexibles con todos los campos
              let kpiName: string | null = null;
              let kpiValue: number | null = null;
              let kpiUnit: string | null = null;
              let kpiTarget: number | null = null;
              let kpiArea: string = 'operations'; // Default area
              let kpiPeriodStart: Date | null = null;
              let kpiPeriodEnd: Date | null = null;
              
              // Extraer área si se especifica
              const areaPatterns = [
                /(?:en el|del)?\s*(?:área|area)(?:\s+de)?\s*(?::)?\s*(estrategia|strategy|finanzas|finance|marketing|operaciones|operations|tecnología|technology|tecnologia|legal)/i,
                /(?:área|area)\s*[:=]\s*(estrategia|strategy|finanzas|finance|marketing|operaciones|operations|tecnología|technology|tecnologia|legal)/i,
              ];
              
              for (const areaPattern of areaPatterns) {
                const areaMatch = userText.match(areaPattern);
                if (areaMatch) {
                  const areaText = areaMatch[1].toLowerCase();
                  // Mapear a nombres en inglés para la base de datos
                  const areaMap: Record<string, string> = {
                    'estrategia': 'strategy',
                    'strategy': 'strategy',
                    'finanzas': 'finance',
                    'finance': 'finance',
                    'marketing': 'marketing',
                    'operaciones': 'operations',
                    'operations': 'operations',
                    'tecnología': 'technology',
                    'tecnologia': 'technology',
                    'technology': 'technology',
                    'legal': 'legal'
                  };
                  kpiArea = areaMap[areaText] || 'operations';
                  break;
                }
              }
              
              // Extraer fechas de periodo si se especifican
              const datePatterns = [
                // "del 1 de octubre al 31 de octubre"
                /del\s+(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})?\s+al\s+(\d{1,2})\s+de\s+(\w+)\s+(?:de\s+)?(\d{4})?/i,
                // "desde 01/10/2025 hasta 31/10/2025" o "desde 2025-10-01 hasta 2025-10-31"
                /desde\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})\s+hasta\s+(\d{4}[-/]\d{1,2}[-/]\d{1,2}|\d{1,2}[-/]\d{1,2}[-/]\d{4})/i,
                // "periodo: octubre 2025" o "periodo octubre 2025"
                /periodo[:\s]+(\w+)\s+(\d{4})/i,
              ];
              
              const monthMap: Record<string, number> = {
                'enero': 0, 'febrero': 1, 'marzo': 2, 'abril': 3, 'mayo': 4, 'junio': 5,
                'julio': 6, 'agosto': 7, 'septiembre': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11
              };
              
              for (const datePattern of datePatterns) {
                const dateMatch = userText.match(datePattern);
                if (dateMatch) {
                  if (dateMatch[0].includes('del') && dateMatch[0].includes('al')) {
                    // Formato "del X de mes al Y de mes"
                    const day1 = parseInt(dateMatch[1]);
                    const month1 = monthMap[dateMatch[2].toLowerCase()] ?? 0;
                    const year1 = dateMatch[3] ? parseInt(dateMatch[3]) : new Date().getFullYear();
                    const day2 = parseInt(dateMatch[4]);
                    const month2 = monthMap[dateMatch[5].toLowerCase()] ?? 0;
                    const year2 = dateMatch[6] ? parseInt(dateMatch[6]) : new Date().getFullYear();
                    
                    kpiPeriodStart = new Date(year1, month1, day1);
                    kpiPeriodEnd = new Date(year2, month2, day2);
                  } else if (dateMatch[0].includes('desde')) {
                    // Formato "desde X hasta Y"
                    kpiPeriodStart = new Date(dateMatch[1]);
                    kpiPeriodEnd = new Date(dateMatch[2]);
                  } else if (dateMatch[0].toLowerCase().includes('periodo')) {
                    // Formato "periodo: mes año"
                    const month = monthMap[dateMatch[1].toLowerCase()] ?? 0;
                    const year = parseInt(dateMatch[2]);
                    kpiPeriodStart = new Date(year, month, 1);
                    kpiPeriodEnd = new Date(year, month + 1, 0);
                  }
                  break;
                }
              }
              
              // Primero extraer la meta si existe
              const metaMatch = userText.match(/(?:meta|objetivo|target)(?:\s+de)?\s+(\d+(?:[.,]\d+)?)/i);
              if (metaMatch) {
                kpiTarget = parseFloat(metaMatch[1].replace(',', '.'));
              }
              
              // Patrón principal: captura nombre, valor y unidad
              const patterns = [
                // "Crea/Actualiza el KPI 'Nombre' con valor 3000"
                /(?:crea|crear|actualizar|actualiza)(?:\s+el)?\s+kpi\s+['"]([^'"]+)['"]\s+(?:con\s+)?(?:valor\s+)?(?:de\s+)?(\d+(?:[.,]\d+)?)\s*([$€£%]|[a-z]{1,4})?\s*(?:y|con)?/i,
                // "KPI Nombre: 3000"
                /kpi\s+([a-záéíóúñ\s]+?)[:=]\s*(\d+(?:[.,]\d+)?)\s*([$€£%]|[a-z]{1,4})?/i,
                // "Actualiza/Crea Nombre a 3000"
                /(?:actualiza|actualizar|crea|crear)\s+(?:el\s+)?(?:kpi\s+)?([a-záéíóúñ\s]+?)\s+(?:a|con\s+valor|con|valor\s+de?)\s+(\d+(?:[.,]\d+)?)\s*([$€£%]|[a-z]{1,4})?/i,
              ];
              
              for (const pattern of patterns) {
                const match = userText.match(pattern);
                if (match) {
                  kpiName = match[1].trim().replace(/^['"]|['"]$/g, '').toLowerCase();
                  kpiValue = parseFloat(match[2].replace(',', '.'));
                  
                  // Solo capturar unit si es válida (símbolo o palabra corta, excluyendo palabras comunes)
                  const potentialUnit = match[3]?.trim().toLowerCase() || '';
                  const excludedWords = ['y', 'con', 'la', 'de', 'el', 'a'];
                  
                  if (potentialUnit && 
                      !excludedWords.includes(potentialUnit) && 
                      (['$', '€', '£', '%'].includes(potentialUnit) || potentialUnit.length <= 4)) {
                    kpiUnit = potentialUnit;
                  }
                  break;
                }
              }
              
              if (kpiName && kpiValue !== null) {
                console.log('KPI Match found:', { kpiName, kpiValue, kpiUnit, kpiTarget, kpiArea, kpiPeriodStart, kpiPeriodEnd });
                
                // Si no se especificaron fechas, usar el mes actual por defecto
                const today = new Date();
                const periodStart = kpiPeriodStart || new Date(today.getFullYear(), today.getMonth(), 1);
                const periodEnd = kpiPeriodEnd || new Date(today.getFullYear(), today.getMonth() + 1, 0);
                
                // Buscar KPI existente con el mismo nombre para obtener valores por defecto
                const { data: existingKpi } = await supabaseClient
                  .from('kpis')
                  .select('*')
                  .eq('company_id', companyId)
                  .ilike('name', kpiName)
                  .order('created_at', { ascending: false })
                  .limit(1)
                  .maybeSingle();
                
                // Validate extracted KPI data before insertion
                try {
                  const validatedData = kpiDataSchema.parse({
                    name: kpiName,
                    area: kpiArea || existingKpi?.area || 'operaciones',
                    value: kpiValue,
                    target_value: kpiTarget !== null ? kpiTarget : (existingKpi?.target_value || null),
                    unit: kpiUnit || existingKpi?.unit || null,
                    period_start: periodStart,
                    period_end: periodEnd
                  });
                  
                  // Siempre crear un nuevo registro histórico con datos validados
                  console.log('Creating new historical KPI record with validated data:', validatedData);
                  const { data: resultKpi, error: kpiError } = await supabaseClient
                    .from('kpis')
                    .insert({
                      company_id: companyId,
                      area: validatedData.area,
                      name: validatedData.name,
                      value: validatedData.value,
                      target_value: validatedData.target_value,
                      unit: validatedData.unit,
                      period_start: validatedData.period_start.toISOString(),
                      period_end: validatedData.period_end.toISOString(),
                      source: 'manual'
                    })
                    .select()
                    .single();
                  
                  if (!kpiError && resultKpi) {
                    console.log('KPI operation successful:', resultKpi);
                    actionResults.push({
                      type: 'kpi_updated',
                      success: true,
                      data: { name: resultKpi.name, value: resultKpi.value, unit: resultKpi.unit, target: resultKpi.target_value }
                    });
                  } else {
                    console.error('Error with KPI operation:', kpiError);
                    actionResults.push({
                      type: 'kpi_updated',
                      success: false,
                      error: kpiError?.message || 'Error al guardar el KPI'
                    });
                  }
                } catch (validationError) {
                  if (validationError instanceof z.ZodError) {
                    console.error('KPI validation failed:', validationError.errors);
                    const errorMessages = validationError.errors.map(e => e.message).join('. ');
                    actionResults.push({
                      type: 'kpi_updated',
                      success: false,
                      error: `Datos de KPI inválidos: ${errorMessages}`
                    });
                  } else {
                    console.error('Unexpected validation error:', validationError);
                    actionResults.push({
                      type: 'kpi_updated',
                      success: false,
                      error: 'Error inesperado al validar los datos del KPI'
                    });
                  }
                }
              }
              
              // Patrón 3: "Crear objetivo: [título]"
              const createObjectiveMatch = userText.match(/crear\s+objetivo[:\s]+(.+)/i);
              if (createObjectiveMatch) {
                const objectiveTitle = createObjectiveMatch[1].trim();
                
                // Buscar plan activo
                const { data: activePlan } = await supabaseClient
                  .from('action_plans')
                  .select('id, plan_areas(id)')
                  .eq('project_id', projectId)
                  .eq('status', 'active')
                  .maybeSingle();
                
                if (activePlan && activePlan.plan_areas && activePlan.plan_areas[0]) {
                  const firstAreaId = activePlan.plan_areas[0].id;
                  
                  const { data: newObjective, error: objError } = await supabaseClient
                    .from('plan_objectives')
                    .insert({
                      area_id: firstAreaId,
                      title: objectiveTitle,
                      description: `Objetivo creado desde el chat en modo ${mode}`,
                      priority: 'medium'
                    })
                    .select()
                    .single();
                  
                  if (!objError && newObjective) {
                    actionResults.push({
                      type: 'objective_created',
                      success: true,
                      data: { id: newObjective.id, title: newObjective.title }
                    });
                  }
                }
              }
            }
          }
        }
      } catch (actionError) {
        console.error('Error executing quick action:', actionError);
      }
    }
    
    // Agregar confirmación de acciones a los mensajes si se ejecutó algo
    let messagesWithActions = [...messages];
    if (actionResults.length > 0) {
      const actionSummary = actionResults.map(result => {
        if (result.type === 'task_created') {
          return `✅ Tarea creada: "${result.data.title}"\n💡 Usa el botón "Ver Tareas" para verla.`;
        } else if (result.type === 'kpi_updated') {
          return `✅ KPI ${result.data.name}: ${result.data.value}${result.data.unit} registrado exitosamente\n💡 Usa el botón "Ver KPIs" para ver todos tus indicadores.`;
        } else if (result.type === 'objective_created') {
          return `✅ Objetivo creado: "${result.data.title}"`;
        }
        return '';
      }).filter(s => s).join('\n\n');
      
      // Insertar confirmación antes del último mensaje del usuario
      messagesWithActions = [
        ...messages.slice(0, -1),
        { role: 'system' as const, content: `ACCIONES EJECUTADAS:\n${actionSummary}\n\nConfirma estas acciones al usuario de forma breve y amigable.` },
        messages[messages.length - 1]
      ];
    }

    // Reemplazar variables en el template
    const projectDescLine = companyInfo?.projectDescription 
      ? `- Descripción: ${companyInfo.projectDescription}`
      : '';
    
    const systemPrompt = systemPromptTemplate
      .replace(/\{\{COMPANY_NAME\}\}/g, companyInfo?.name || 'tu empresa')
      .replace(/\{\{COMPANY_INDUSTRY\}\}/g, companyInfo?.industry || 'No especificado')
      .replace(/\{\{COMPANY_STAGE\}\}/g, companyInfo?.stage || 'startup')
      .replace(/\{\{PROJECT_NAME\}\}/g, companyInfo?.projectName || 'tu proyecto')
      .replace(/\{\{PROJECT_DESCRIPTION\}\}/g, projectDescLine);

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
          ...messagesWithActions
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
      JSON.stringify({ 
        error: 'An error occurred processing your request',
        code: 'CHAT_ERROR'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});