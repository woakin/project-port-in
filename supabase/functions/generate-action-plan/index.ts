import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.7.1";
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Validation schema
const requestSchema = z.object({
  diagnosisId: z.string().uuid('Invalid diagnosis ID format'),
  timeHorizon: z.number().int().min(1).max(24, 'Time horizon must be between 1 and 24 months'),
  complexityLevel: z.enum(['basic', 'medium', 'advanced'])
});

// Function to get historical context for plan generation
async function getHistoricalPlanContext(supabaseClient: any, companyId: string, currentDiagnosisId: string) {
  try {
    // 1. Get previous plan (most recent before current diagnosis)
    const { data: previousPlan } = await supabaseClient
      .from('action_plans')
      .select(`
        *,
        plan_areas (
          *,
          plan_objectives (
            *,
            tasks (
              id,
              title,
              status,
              priority,
              completed_at,
              due_date
            )
          )
        )
      `)
      .eq('company_id', companyId)
      .neq('diagnosis_id', currentDiagnosisId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // 2. Get current company KPIs (most recent values per KPI)
    const { data: allKPIs } = await supabaseClient
      .from('kpis')
      .select('name, value, target_value, unit, area, period_start')
      .eq('company_id', companyId)
      .order('period_start', { ascending: false });

    // Get unique KPIs (most recent value per name)
    const kpisMap = new Map();
    allKPIs?.forEach((kpi: any) => {
      if (!kpisMap.has(kpi.name)) {
        kpisMap.set(kpi.name, kpi);
      }
    });
    const kpis = Array.from(kpisMap.values());

    // 3. Get analyzed documents
    const { data: documents } = await supabaseClient
      .from('documents')
      .select('file_name, category, analysis_status, created_at')
      .eq('company_id', companyId)
      .eq('analysis_status', 'completed')
      .order('created_at', { ascending: false })
      .limit(10);

    return {
      previousPlan,
      kpis,
      documents
    };
  } catch (error) {
    console.error('Error fetching historical context:', error);
    return {
      previousPlan: null,
      kpis: [],
      documents: []
    };
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
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
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    const { diagnosisId, timeHorizon, complexityLevel } = validationResult.data;

    console.log("Generating plan for diagnosis:", diagnosisId);

    // Crear cliente Supabase
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Obtener datos del diagnóstico
    const { data: diagnosis, error: diagError } = await supabase
      .from("diagnoses")
      .select("*, companies(*)")
      .eq("id", diagnosisId)
      .single();

    if (diagError || !diagnosis) {
      throw new Error("No se encontró el diagnóstico");
    }

    console.log("Diagnosis found:", diagnosis.companies?.name);

    // Get historical context (previous plan, KPIs, documents)
    const historicalContext = await getHistoricalPlanContext(
      supabase,
      diagnosis.company_id,
      diagnosisId
    );

    // Build historical context section for prompt
    let historicalPrompt = '';

    if (historicalContext.previousPlan) {
      const prevPlan = historicalContext.previousPlan;
      const allTasks = prevPlan.plan_areas?.flatMap((a: any) => 
        a.plan_objectives?.flatMap((o: any) => o.tasks || []) || []
      ) || [];
      const completedTasks = allTasks.filter((t: any) => t.status === 'completed');
      const pendingTasks = allTasks.filter((t: any) => t.status === 'pending' || t.status === 'in_progress');
      const highPriorityPending = pendingTasks.filter((t: any) => t.priority === 'high');

      const progressPercentage = allTasks.length > 0 
        ? Math.round((completedTasks.length / allTasks.length) * 100) 
        : 0;

      historicalPrompt = `
CONTEXTO HISTÓRICO (PLAN ANTERIOR):
📋 Plan previo: "${prevPlan.title}" (creado ${new Date(prevPlan.created_at).toLocaleDateString('es-MX')})
📊 Progreso general: ${completedTasks.length}/${allTasks.length} tareas completadas (${progressPercentage}%)
🎯 Áreas trabajadas: ${prevPlan.plan_areas?.map((a: any) => a.name).join(', ') || 'N/A'}

✅ Tareas completadas destacadas:
${completedTasks.slice(0, 5).map((t: any) => `  - ${t.title}`).join('\n') || '  - Ninguna aún'}

⏳ Tareas pendientes de alta prioridad:
${highPriorityPending.slice(0, 3).map((t: any) => `  - ${t.title}`).join('\n') || '  - Ninguna'}

🎯 IMPORTANTE: 
- Este es un PLAN DE CONTINUIDAD: reconoce y valida el progreso del plan anterior
- Continúa con tareas pendientes de alta prioridad si siguen siendo relevantes
- EVITA duplicar objetivos ya completados
- Escala la complejidad según lo ya logrado (el nivel de madurez aumentó)
- Enfócate en las áreas que menos progreso tuvieron o nuevas necesidades
`;
    }

    if (historicalContext.kpis && historicalContext.kpis.length > 0) {
      const kpisByArea = historicalContext.kpis.reduce((acc: any, kpi: any) => {
        if (!acc[kpi.area]) acc[kpi.area] = [];
        acc[kpi.area].push(kpi);
        return acc;
      }, {});

      const kpiSummary = Object.entries(kpisByArea)
        .slice(0, 6)
        .map(([area, kpis]: [string, any]) => {
          const kpiList = kpis.slice(0, 2).map((k: any) => 
            `${k.name}: ${k.value}${k.unit || ''} ${k.target_value ? `(meta: ${k.target_value}${k.unit || ''})` : ''}`
          ).join(', ');
          return `  📈 ${area}: ${kpiList}`;
        }).join('\n');

      historicalPrompt += `
KPIs ACTUALES DE LA EMPRESA:
${kpiSummary}

🎯 IMPORTANTE: Define objetivos y metas del nuevo plan considerando estos KPIs existentes.
- Mejora KPIs que estén por debajo de su meta
- Crea KPIs complementarios si hacen falta
`;
    }

    if (historicalContext.documents && historicalContext.documents.length > 0) {
      const docsByCategory = historicalContext.documents.reduce((acc: any, doc: any) => {
        const cat = doc.category || 'otros';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
      }, {});

      historicalPrompt += `
📄 DOCUMENTOS ANALIZADOS: ${historicalContext.documents.length} documentos disponibles
- Categorías: ${Object.entries(docsByCategory).map(([cat, count]) => `${cat} (${count})`).join(', ')}
`;
    }

    // Construir prompt para el LLM
    const systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un consultor estratégico experto. Genera un plan de acción empresarial estructurado ${historicalContext.previousPlan ? 'que SEA CONTINUACIÓN del trabajo previo' : ''}.

CONTEXTO ACTUAL:
- Empresa: ${diagnosis.companies?.name || "Sin nombre"}
- Sector: ${diagnosis.companies?.industry || "General"}
- Nivel de madurez: ${diagnosis.maturity_level || "startup"}
- Fecha del diagnóstico: ${new Date(diagnosis.created_at).toLocaleDateString('es-MX')}
- Scores actuales (Diagnóstico actual): 
  - Estrategia: ${diagnosis.strategy_score || 0}
  - Operaciones: ${diagnosis.operations_score || 0}
  - Finanzas: ${diagnosis.finance_score || 0}
  - Marketing: ${diagnosis.marketing_score || 0}
  - Legal: ${diagnosis.legal_score || 0}
  - Tecnología: ${diagnosis.technology_score || 0}
- Horizonte temporal: ${timeHorizon} meses
${historicalPrompt}

ESTRUCTURA REQUERIDA (JSON):
{
  "title": "Título del plan",
  "description": "Descripción general del plan",
  "areas": [
    {
      "name": "Estrategia",
      "description": "Descripción del área",
      "target_score": 85,
      "objectives": [
        {
          "title": "Objetivo específico",
          "description": "Descripción detallada",
          "priority": "high",
          "actions": [
            {
              "title": "Acción concreta",
              "description": "Pasos a seguir",
              "estimated_effort": 7,
              "kpis": [{"name": "Métrica", "target": 100, "unit": "%"}]
            }
          ]
        }
      ]
    }
  ]
}

REGLAS:
- Prioriza áreas con scores más bajos (necesitan más atención)
${historicalContext.previousPlan ? '- CONTINÚA el trabajo del plan anterior (NO empieces de cero)\n- ESCALA la complejidad basándote en lo logrado\n- RETOMA tareas pendientes de alta prioridad si siguen siendo relevantes\n- EVITA duplicar objetivos ya completados' : ''}
- Genera entre 3-5 áreas principales
- Máximo 3 objetivos por área
- Entre 2-4 acciones por objetivo
- Acciones concretas y ejecutables
- KPIs medibles y específicos
- Ajusta complejidad según nivel: ${complexityLevel}`;

    // Llamar a Lovable AI
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY no configurada");
    }

    console.log("Calling Lovable AI...");

    const aiResponse = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: "Genera el plan de acción ahora" },
          ],
        }),
      }
    );

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error("AI Error:", errorText);
      throw new Error(`Error en AI: ${aiResponse.status}`);
    }

    const aiData = await aiResponse.json();
    const planContent = aiData.choices[0].message.content;

    console.log("AI Response received");

    // Parsear respuesta (puede venir con markdown)
    let plan;
    try {
      // Intentar extraer JSON si viene envuelto en markdown
      const jsonMatch = planContent.match(/```json\n([\s\S]*?)\n```/);
      if (jsonMatch) {
        plan = JSON.parse(jsonMatch[1]);
      } else {
        plan = JSON.parse(planContent);
      }
    } catch (e) {
      console.error("Error parsing AI response:", e);
      throw new Error("Error al parsear la respuesta del AI");
    }

    // Guardar en base de datos (transacción)
    console.log("Saving plan to database...");

    // 1. Auto-archive any existing active plans for this company
    const { error: archiveError } = await supabase
      .from("action_plans")
      .update({ status: "archived" })
      .eq("company_id", diagnosis.company_id)
      .eq("status", "active");

    if (archiveError) {
      console.error("Error archiving previous plans:", archiveError);
      // Continue anyway - this is not critical
    } else {
      console.log("Previous active plans archived successfully");
    }

    // 2. Crear el nuevo plan (será el único activo)
    const { data: newPlan, error: planError } = await supabase
      .from("action_plans")
      .insert({
        company_id: diagnosis.company_id,
        diagnosis_id: diagnosisId,
        title: plan.title,
        description: plan.description,
        time_horizon: timeHorizon,
        complexity_level: complexityLevel,
        status: "active",
        version: "1.0",
      })
      .select()
      .single();

    if (planError || !newPlan) {
      console.error("Error creating plan:", planError);
      throw new Error("Error al crear el plan");
    }

    console.log("Plan created:", newPlan.id);

    // 3. Crear áreas, objetivos, tareas y KPIs
    for (let areaIndex = 0; areaIndex < plan.areas.length; areaIndex++) {
      const areaData = plan.areas[areaIndex];

      const { data: area, error: areaError } = await supabase
        .from("plan_areas")
        .insert({
          plan_id: newPlan.id,
          name: areaData.name,
          description: areaData.description,
          target_score: areaData.target_score || null,
          order_index: areaIndex,
        })
        .select()
        .single();

      if (areaError || !area) {
        console.error("Error creating area:", areaError);
        continue;
      }

      // Crear objetivos
      for (
        let objIndex = 0;
        objIndex < areaData.objectives.length;
        objIndex++
      ) {
        const objData = areaData.objectives[objIndex];

        const { data: objective, error: objError } = await supabase
          .from("plan_objectives")
          .insert({
            area_id: area.id,
            title: objData.title,
            description: objData.description,
            priority: objData.priority || "medium",
            order_index: objIndex,
          })
          .select()
          .single();

        if (objError || !objective) {
          console.error("Error creating objective:", objError);
          continue;
        }

        // Crear tareas (acciones)
        for (const actionData of objData.actions || []) {
          const { data: task, error: taskError } = await supabase
            .from("tasks")
            .insert({
              objective_id: objective.id,
              title: actionData.title,
              description: actionData.description,
              estimated_effort: actionData.estimated_effort || null,
              priority: objData.priority || "medium",
              status: "pending",
            })
            .select()
            .single();

          if (taskError || !task) {
            console.error("Error creating task:", taskError);
            continue;
          }

          // Crear KPIs de la tarea
          if (actionData.kpis && actionData.kpis.length > 0) {
            const kpisToInsert = actionData.kpis.map((kpi: any) => ({
              task_id: task.id,
              name: kpi.name,
              target_value: kpi.target,
              current_value: 0,
              unit: kpi.unit,
            }));

            const { error: kpiError } = await supabase
              .from("task_kpis")
              .insert(kpisToInsert);

            if (kpiError) {
              console.error("Error creating KPIs:", kpiError);
            }
          }
        }
      }
    }

    console.log("Plan generation completed successfully");

    return new Response(
      JSON.stringify({
        success: true,
        planId: newPlan.id,
        plan: newPlan,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-action-plan:", error);
    return new Response(
      JSON.stringify({
        error: 'An error occurred generating your action plan',
        code: 'PLAN_GENERATION_ERROR'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
