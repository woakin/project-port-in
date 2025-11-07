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

    // Construir prompt para el LLM
    const systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un consultor estratégico experto. Genera un plan de acción empresarial estructurado.

CONTEXTO:
- Empresa: ${diagnosis.companies?.name || "Sin nombre"}
- Sector: ${diagnosis.companies?.industry || "General"}
- Nivel de madurez: ${diagnosis.maturity_level || "startup"}
- Scores actuales: 
  - Estrategia: ${diagnosis.strategy_score || 0}
  - Operaciones: ${diagnosis.operations_score || 0}
  - Finanzas: ${diagnosis.finance_score || 0}
  - Marketing: ${diagnosis.marketing_score || 0}
  - Legal: ${diagnosis.legal_score || 0}
  - Tecnología: ${diagnosis.technology_score || 0}
- Horizonte temporal: ${timeHorizon} meses

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

    // 1. Crear el plan
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

    // 2. Crear áreas, objetivos, tareas y KPIs
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
