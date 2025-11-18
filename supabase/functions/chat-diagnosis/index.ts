import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Tool schemas
const kpiUpdateSchema = z.object({
  updates: z.array(z.object({
    name: z.string(),
    value: z.number(),
    action: z.enum(['update_current', 'new_period']).default('update_current'),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    unit: z.string().optional(),
    area: z.string().optional(),
    target_value: z.number().optional()
  }))
});

const taskOperationSchema = z.object({
  operations: z.array(z.object({
    action: z.enum(['create', 'update', 'delete', 'change_status', 'assign']),
    task_id: z.string().optional(),
    title: z.string().optional(),
    description: z.string().optional(),
    status: z.enum(['pending', 'in_progress', 'completed', 'blocked']).optional(),
    priority: z.enum(['low', 'medium', 'high']).optional(),
    due_date: z.string().optional(),
    estimated_effort: z.number().optional(),
    assigned_to: z.string().optional()
  }))
});

const documentOperationSchema = z.object({
  operations: z.array(z.object({
    action: z.enum(['analyze', 'recategorize', 'query']),
    document_id: z.string().optional(),
    new_category: z.string().optional(),
    query_text: z.string().optional()
  }))
});

const areaNavigationSchema = z.object({
  action: z.enum(['advance']),
  current_area_id: z.string(),
  reason: z.string().optional()
});

/**
 * Calcula las fechas period_start y period_end basado en una descripción temporal
 */
function calculatePeriodDates(description: string): { start: string; end: string } {
  const today = new Date();
  const year = today.getFullYear();
  const month = today.getMonth();
  
  const lowerDesc = description.toLowerCase();
  
  // Hoy
  if (lowerDesc.includes('hoy') || lowerDesc.includes('today')) {
    const todayStr = today.toISOString().split('T')[0];
    return { start: todayStr, end: todayStr };
  }
  
  // Este mes (por defecto)
  const monthStart = new Date(year, month, 1);
  const monthEnd = new Date(year, month + 1, 0);
  
  return {
    start: monthStart.toISOString().split('T')[0],
    end: monthEnd.toISOString().split('T')[0]
  };
}

/**
 * Busca el KPI más parecido usando fuzzy matching
 * @param searchName - Nombre buscado por el usuario (ej: "NPS")
 * @param existingKPIs - Lista de KPIs existentes con sus nombres completos
 * @returns El nombre exacto del KPI encontrado, o null si no hay match
 */
function findBestKPIMatch(
  searchName: string, 
  existingKPIs: Array<{ name: string }>
): string | null {
  if (!searchName || !existingKPIs || existingKPIs.length === 0) return null;
  
  const search = searchName.toLowerCase().trim();
  
  // 1. Match exacto (case-insensitive)
  const exactMatch = existingKPIs.find(k => 
    k.name.toLowerCase() === search
  );
  if (exactMatch) return exactMatch.name;
  
  // 2. Match si el nombre completo CONTIENE la búsqueda (ej: "NPS" en "NPS (Net Promoter Score)")
  const containsMatches = existingKPIs.filter(k => 
    k.name.toLowerCase().includes(search) || 
    search.includes(k.name.toLowerCase())
  );
  
  // Si hay solo un match, usar ese
  if (containsMatches.length === 1) return containsMatches[0].name;
  
  // Si hay múltiples, preferir el más corto (más específico)
  if (containsMatches.length > 1) {
    return containsMatches.reduce((shortest, current) => 
      current.name.length < shortest.name.length ? current : shortest
    ).name;
  }
  
  // 3. Match por palabras clave (ej: "rotacion empleados" → "Rotación de empleados")
  const searchWords = search.split(/\s+/);
  const wordMatches = existingKPIs.filter(k => {
    const kpiWords = k.name.toLowerCase().split(/\s+/);
    return searchWords.every(sw => 
      kpiWords.some(kw => kw.includes(sw) || sw.includes(kw))
    );
  });
  
  if (wordMatches.length === 1) return wordMatches[0].name;
  
  // Si hay múltiples matches, preferir el más corto
  if (wordMatches.length > 1) {
    return wordMatches.reduce((shortest, current) => 
      current.name.length < shortest.name.length ? current : shortest
    ).name;
  }
  
  // No se encontró match razonable
  return null;
}

/**
 * Valida y ajusta fechas de período para un KPI
 * Asegura que period_start no sea anterior al primer KPI registrado
 */
async function validateAndAdjustPeriodDates(
  companyId: string,
  kpiName: string,
  proposedStart: string,
  proposedEnd: string,
  admin: any
): Promise<{ 
  start: string; 
  end: string; 
  wasAdjusted: boolean; 
  adjustmentReason?: string;
}> {
  // Obtener el primer KPI registrado (el más antiguo)
  const { data: oldestKPI } = await admin
    .from('kpis')
    .select('period_start, created_at')
    .eq('company_id', companyId)
    .ilike('name', kpiName)
    .order('period_start', { ascending: true })
    .limit(1)
    .maybeSingle();
  
  let adjustedStart = proposedStart;
  let adjustedEnd = proposedEnd;
  let wasAdjusted = false;
  let adjustmentReason = '';
  
  if (oldestKPI) {
    const firstKPIDate = new Date(oldestKPI.period_start);
    const proposedStartDate = new Date(proposedStart);
    
    // Si el período propuesto empieza ANTES del primer KPI, ajustar
    if (proposedStartDate < firstKPIDate) {
      adjustedStart = oldestKPI.period_start;
      wasAdjusted = true;
      adjustmentReason = `Período ajustado: no puede empezar antes del primer registro (${firstKPIDate.toISOString().split('T')[0]})`;
      
      console.warn('⚠️ [Period Date Adjustment]', {
        kpiName,
        proposedStart,
        adjustedStart,
        reason: adjustmentReason
      });
    }
  }
  
  // Validar que start < end
  if (new Date(adjustedStart) > new Date(adjustedEnd)) {
    throw new Error(`Fechas inválidas: period_start (${adjustedStart}) es posterior a period_end (${adjustedEnd})`);
  }
  
  return { 
    start: adjustedStart, 
    end: adjustedEnd, 
    wasAdjusted, 
    adjustmentReason 
  };
}

/**
 * Verifica que el KPI se insertó correctamente
 * Retorna el registro insertado o null si hay problemas
 */
async function verifyKPIInsertion(
  companyId: string,
  expectedData: {
    name: string;
    value: number;
    period_start: string;
    period_end: string;
  },
  admin: any,
  insertedId?: string
): Promise<{ success: boolean; data?: any; error?: string }> {
  
  // Buscar el registro insertado (por ID si está disponible, o por datos)
  let query = admin
    .from('kpis')
    .select('*')
    .eq('company_id', companyId)
    .ilike('name', expectedData.name)
    .eq('value', expectedData.value)
    .eq('period_start', expectedData.period_start)
    .eq('period_end', expectedData.period_end)
    .order('created_at', { ascending: false })
    .limit(1);
  
  if (insertedId) {
    query = admin.from('kpis').select('*').eq('id', insertedId).single();
  }
  
  const { data, error } = await query.maybeSingle();
  
  if (error || !data) {
    return {
      success: false,
      error: `No se pudo verificar la inserción: ${error?.message || 'Registro no encontrado'}`
    };
  }
  
  // Verificar consistencia de datos
  if (
    data.value !== expectedData.value ||
    data.period_start !== expectedData.period_start ||
    data.period_end !== expectedData.period_end
  ) {
    return {
      success: false,
      error: 'Los datos insertados no coinciden con los esperados',
      data
    };
  }
  
  console.log('✅ [KPI Insertion Verified]', {
    id: data.id,
    name: data.name,
    value: data.value,
    period: `${data.period_start} → ${data.period_end}`
  });
  
  return { success: true, data };
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

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
  currentArea: z.string().optional(),
  areaProgress: z.object({
    currentIndex: z.number(),
    areas: z.array(z.object({
      id: z.string(),
      status: z.enum(['pending', 'in_progress', 'completed', 'skipped']),
      messageCount: z.number()
    }))
  }).optional(),
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
    data: z.any().optional()
  }).optional()
});

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

// Helper function to get historical context
async function getHistoricalContext(
  admin: any,
  companyId: string,
  projectId: string | null
) {
  if (!projectId) return { hasPreviousDiagnosis: false };

  try {
    // A. Get most recent diagnosis
    const { data: previousDiagnosis } = await admin
      .from('diagnoses')
      .select('version, created_at, form_responses, insights, strategy_score, operations_score, finance_score, marketing_score, legal_score, technology_score, maturity_level')
      .eq('company_id', companyId)
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    // B. Get KPIs summary
    const { data: kpis } = await admin
      .from('kpis')
      .select('name, area, value, target_value, unit, period_start, period_end')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(20);

    // C. Get tasks summary with proper JOIN
    const { data: tasksRaw } = await admin
      .from('tasks')
      .select(`
        title, 
        status, 
        priority, 
        due_date,
        plan_objectives!inner(
          plan_areas!inner(
            action_plans!inner(
              company_id
            )
          )
        )
      `)
      .order('created_at', { ascending: false })
      .limit(50);

    // Filter tasks by company_id
    const tasks = tasksRaw?.filter((t: any) => {
      try {
        return t.plan_objectives?.plan_areas?.action_plans?.company_id === companyId;
      } catch {
        return false;
      }
    }).slice(0, 20).map((t: any) => ({
      title: t.title,
      status: t.status,
      priority: t.priority,
      due_date: t.due_date
    })) || [];

    // D. Get analyzed documents
    const { data: documents } = await admin
      .from('documents')
      .select('file_name, category, analysis_status')
      .eq('company_id', companyId)
      .eq('analysis_status', 'completed')
      .limit(10);

    return {
      previousDiagnosis,
      kpis: kpis || [],
      tasks: tasks,
      documents: documents || [],
      hasPreviousDiagnosis: !!previousDiagnosis
    };
  } catch (error) {
    console.error('Error fetching historical context:', error);
    return { hasPreviousDiagnosis: false };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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

    const { messages, companyInfo, isComplete, mode = 'diagnosis', currentArea, areaProgress, context: requestContext } = validationResult.data;
    
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured');
    }

    // Mode: contextual (for in-app AI assistant chat)
    if (mode === 'contextual') {
      console.log("Mode: contextual - handling in-app AI assistant");
      
      // Track applied operations for signaling
      const appliedOperations: Array<{entity: string, summary: string}> = [];
      
      // Step 1: Extract intentions using tool-calling
      const authHeader = req.headers.get('Authorization');
      const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
      const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
      const admin = createClient(supabaseUrl, supabaseServiceKey);
      
      let companyId: string | undefined;
      let user: any;
      
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        const { data: { user: authUser } } = await admin.auth.getUser(token);
        user = authUser;
        
        if (user) {
          const { data: profile } = await admin
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .maybeSingle();
          companyId = profile?.company_id;
        }
      }
      
      const lastUserMessage = messages[messages.length - 1]?.content || '';
      
      // Get context data for tool-calling
      const { data: existingKPIs } = await admin
        .from('kpis')
        .select('name, area')
        .eq('company_id', companyId || '')
        .order('created_at', { ascending: false });
      
      const uniqueKPINames = [...new Set(existingKPIs?.map(k => k.name) || [])];
      
      const tools = [
        {
          type: "function",
          function: {
            name: "manage_kpis",
            description: "Detecta cuando el usuario quiere actualizar, crear o consultar KPIs. IMPORTANTE: distingue entre actualizar periodo actual (update_current) y registrar nuevo periodo histórico (new_period).",
            parameters: {
              type: "object",
              properties: {
                updates: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string", description: "Nombre del KPI" },
                      value: { type: "number", description: "Nuevo valor numérico" },
                      action: { 
                        type: "string", 
                        enum: ["update_current", "new_period"],
                        description: "update_current: actualiza el valor del periodo actual (sin fechas). new_period: crea un registro histórico nuevo (requiere period_start y period_end)"
                      },
                      period_start: { type: "string", format: "date", nullable: true, description: "Obligatorio para new_period. Formato YYYY-MM-DD" },
                      period_end: { type: "string", format: "date", nullable: true, description: "Obligatorio para new_period. Formato YYYY-MM-DD" },
                      unit: { type: "string", nullable: true },
                      area: { 
                        type: "string", 
                        enum: ["estrategia","finanzas","marketing","operaciones","tecnología","legal","general"],
                        nullable: true 
                      }
                    },
                    required: ["name", "value"]
                  }
                }
              },
              required: ["updates"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "manage_tasks",
            description: "Crear, actualizar, eliminar o cambiar estado de tareas",
            parameters: {
              type: "object",
              properties: {
                operations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { 
                        type: "string", 
                        enum: ["create", "update", "delete", "change_status", "assign"],
                        description: "Acción a realizar"
                      },
                      task_id: { type: "string", nullable: true, description: "UUID de la tarea (requerido para update/delete/change_status/assign)" },
                      title: { type: "string", nullable: true },
                      description: { type: "string", nullable: true },
                      status: { 
                        type: "string", 
                        enum: ["pending", "in_progress", "completed", "blocked"],
                        nullable: true 
                      },
                      priority: { 
                        type: "string", 
                        enum: ["low", "medium", "high"],
                        nullable: true 
                      },
                      due_date: { type: "string", format: "date", nullable: true },
                      estimated_effort: { type: "number", nullable: true },
                      assigned_to: { type: "string", nullable: true, description: "UUID del usuario asignado" }
                    },
                    required: ["action"]
                  }
                }
              },
              required: ["operations"]
            }
          }
        },
        {
          type: "function",
          function: {
            name: "manage_documents",
            description: "Analizar, recategorizar o consultar documentos",
            parameters: {
              type: "object",
              properties: {
                operations: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      action: { 
                        type: "string", 
                        enum: ["analyze", "recategorize", "query"],
                        description: "Acción a realizar"
                      },
                      document_id: { type: "string", nullable: true },
                      new_category: { 
                        type: "string",
                        enum: ["financial", "legal", "operational", "strategic", "other"],
                        nullable: true 
                      },
                      query_text: { type: "string", nullable: true }
                    },
                    required: ["action"]
                  }
                }
              },
              required: ["operations"]
            }
          }
        }
      ];
      
      try {
        const extractionResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${LOVABLE_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'google/gemini-2.5-flash',
            messages: [
              { 
              role: 'system', 
                content: `Eres un asistente que identifica intenciones de gestión de datos.

📋 KPIs EXISTENTES EN EL SISTEMA:
${uniqueKPINames.map((name, i) => `${i + 1}. "${name}"`).join('\n')}

🚨 REGLA CRÍTICA - NOMBRES DE KPIs:
Cuando el usuario mencione un KPI (ej: "NPS", "ventas", "rotación"), DEBES:
1. Buscar en la lista de "KPIs EXISTENTES" arriba
2. Usar el nombre EXACTO y COMPLETO del KPI que más se parezca
3. Si el usuario dice "NPS" y existe "NPS (Net Promoter Score)", usar "NPS (Net Promoter Score)"
4. Si el usuario dice "CAC" y existe "Costo de adquisición de cliente (CAC)", usar el nombre completo
5. NUNCA inventes un nombre nuevo si hay uno similar existente

REGLAS IMPORTANTES PARA KPIs:
COMPORTAMIENTO POR DEFECTO: Siempre usar action: "new_period" para registrar nuevos valores históricos.

VERBOS QUE SIEMPRE USAN "new_period" (registrar nuevo dato):
- "actualiza", "actualizar"
- "agrega", "agregar", "añade", "añadir"
- "registra", "registrar"
- "el valor de X es Y", "X está en Y", "tenemos Y en X"
- "hoy", "esta semana", "este mes"

VERBOS QUE USAN "update_current" (corregir dato existente):
- "corrige", "corregir" + "último", "anterior", "el más reciente"
- "modifica", "modificar" + "último", "anterior"
- "cambia", "cambiar" + "último valor", "valor anterior"
- "me equivoqué", "era", "debería ser" (contexto de corrección)

MANEJO DE FECHAS:
- Si NO se menciona fecha específica → usar periodo del mes actual (ejemplo: 2025-11-01 a 2025-11-30)
- Si se menciona "hoy" → usar periodo del día de hoy (ejemplo: 2025-11-18 a 2025-11-18)
- Si se menciona un mes específico → calcular fechas de ese mes (ejemplo: "noviembre" → 2025-11-01 a 2025-11-30)
- Si se menciona "esta semana" → calcular inicio y fin de la semana actual

EN CASO DE DUDA: Siempre preferir "new_period" para preservar la integridad histórica.

🎯 TU TAREA: Analiza el mensaje del usuario y detecta si contiene alguna de estas intenciones:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 INTENCIONES DE KPI (invoke manage_kpis):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PATRONES QUE SIEMPRE DEBEN INVOCAR manage_kpis:
✅ "actualiza [KPI] a/con [valor]" → Ejemplo: "actualiza NPS a 60"
✅ "agrega [KPI] de/con [valor]" → Ejemplo: "agrega ventas de 1000"
✅ "registra [KPI] en [valor]" → Ejemplo: "registra CAC en 150"
✅ "el [KPI] es/está [valor]" → Ejemplo: "el NPS es 60"
✅ "[KPI] tiene valor de [valor]" → Ejemplo: "ventas tiene valor de 5000"
✅ "[valor] en/para [KPI]" → Ejemplo: "60 para NPS"

EJEMPLOS DE MENSAJES QUE REQUIEREN ACCIÓN:
• "Actualizar el kpi de NPS a 60" ✅ DEBE invocar manage_kpis
• "Agrega el valor de 60 con fecha de hoy" ✅ DEBE invocar manage_kpis
• "El CAC está en 150" ✅ DEBE invocar manage_kpis
• "Registra ventas de 1000 para este mes" ✅ DEBE invocar manage_kpis
• "60 para el NPS" ✅ DEBE invocar manage_kpis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ INTENCIONES DE TAREAS (invoke manage_tasks):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Crear, actualizar, eliminar o cambiar estado de tareas
• Ejemplos: "crea una tarea para...", "marca como completada...", "cambia prioridad..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 INTENCIONES DE DOCUMENTOS (invoke manage_documents):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

• Analizar, recategorizar documentos
• Ejemplos: "analiza el documento...", "cambia categoría..."

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🚨 REGLA CRÍTICA:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Si el mensaje del usuario menciona EXPLÍCITAMENTE:
- Actualizar/agregar/registrar un KPI + un valor numérico
- O contiene "[nombre KPI] es/está [valor]"

→ SIEMPRE debes invocar manage_kpis, NUNCA asumas que es solo conversación.

⚠️ NO invoques herramientas si:
- El usuario solo hace preguntas ("¿cuál es el valor de...?")
- El usuario solo proporciona contexto sin solicitar acción
- El mensaje es ambiguo y no contiene verbos de acción + valores

Si NO detectas ninguna intención clara de operación, entonces no invoques herramientas.`
              },
              { role: 'user', content: lastUserMessage }
            ],
            tools: tools,
            tool_choice: "auto"
          })
        });
        
        if (extractionResponse.ok) {
          const extractionData = await extractionResponse.json();
          const toolCalls = extractionData.choices?.[0]?.message?.tool_calls || [];
          
          console.log('🔍 [KPI Intent Detection]', {
            timestamp: new Date().toISOString(),
            userMessage: lastUserMessage,
            detectedToolCalls: toolCalls.length,
            tools: toolCalls.map((tc: any) => ({
              name: tc.function.name,
              arguments: tc.function.arguments
            }))
          });
          
          // Step 2: Apply operations based on tool calls
          for (const toolCall of toolCalls) {
            console.log(`Executing tool: ${toolCall.function.name}`);
            
            try {
              const functionArgs = JSON.parse(toolCall.function.arguments);
              
              if (toolCall.function.name === 'manage_kpis' && companyId && user) {
                const validated = kpiUpdateSchema.parse(functionArgs);
                
                for (const update of validated.updates) {
                  console.log('📊 [KPI Operation Start]', {
                    timestamp: new Date().toISOString(),
                    kpiName: update.name,
                    action: update.action,
                    value: update.value,
                    periodStart: update.period_start,
                    periodEnd: update.period_end,
                    unit: update.unit,
                    area: update.area
                  });
                  if (update.action === 'update_current') {
                    // 🔍 Buscar el KPI con fuzzy matching
                    const bestMatch = findBestKPIMatch(update.name, existingKPIs || []);
                    const searchName = bestMatch || update.name;
                    
                    console.log('🔍 [KPI Fuzzy Match - update_current]', {
                      timestamp: new Date().toISOString(),
                      userInput: update.name,
                      matchFound: bestMatch,
                      willSearchFor: searchName
                    });
                    
                    // Actualizar el valor del periodo actual (el más reciente)
                    const { data: latest } = await admin
                      .from('kpis')
                      .select('id, name, value, unit, area')
                      .eq('company_id', companyId)
                      .ilike('name', searchName)
                      .order('period_end', { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    
                    if (latest?.id) {
                      const { error: updateError } = await admin
                        .from('kpis')
                        .update({ 
                          value: update.value, 
                          source: 'assistant'
                        })
                        .eq('id', latest.id);
                      
                      if (!updateError) {
                        console.log('✅ [KPI Update Current Success]', {
                          timestamp: new Date().toISOString(),
                          kpiName: searchName,
                          originalInput: update.name !== searchName ? update.name : undefined,
                          kpiId: latest.id,
                          oldValue: latest.value,
                          newValue: update.value,
                          unit: latest.unit || update.unit,
                          operation: 'update_current'
                        });
                        
                        appliedOperations.push({
                          entity: 'kpis',
                          summary: `✏️ Corregido valor de "${searchName}": ${latest.value} → ${update.value}${latest.unit || ''} (modificó registro más reciente)`
                        });
                        
                        await admin.from('audit_logs').insert({
                          resource_type: 'kpi',
                          action: 'update',
                          user_id: user.id,
                          metadata: { kpi_name: searchName, old_value: latest.value, new_value: update.value }
                        });
                      }
                    } else {
                      // Si no existe, crear uno nuevo para el mes actual
                      const now = new Date();
                      const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
                      const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                      
                      const { error: insertError } = await admin
                        .from('kpis')
                        .insert({
                          company_id: companyId,
                          name: update.name,
                          value: update.value,
                          area: update.area || 'general',
                          unit: update.unit || '',
                          period_start: periodStart.toISOString().split('T')[0],
                          period_end: periodEnd.toISOString().split('T')[0],
                          source: 'assistant'
                        });
                      
                      if (!insertError) {
                        console.log('✅ [KPI Create (Fallback from update_current)]', {
                          timestamp: new Date().toISOString(),
                          kpiName: update.name,
                          value: update.value,
                          unit: update.unit,
                          periodStart: periodStart.toISOString().split('T')[0],
                          periodEnd: periodEnd.toISOString().split('T')[0],
                          reason: 'No existing KPI found for update_current'
                        });
                        
                        appliedOperations.push({
                          entity: 'kpis',
                          summary: `🆕 Creado nuevo KPI "${update.name}": ${update.value}${update.unit || ''} (primer registro histórico)`
                        });
                        
                        await admin.from('audit_logs').insert({
                          resource_type: 'kpi',
                          action: 'create',
                          user_id: user.id,
                          metadata: { kpi_name: update.name, value: update.value }
                        });
                      }
                    }
                  } else if (update.action === 'new_period') {
                    // 🔍 Buscar el KPI con fuzzy matching
                    const bestMatch = findBestKPIMatch(update.name, existingKPIs || []);
                    const searchName = bestMatch || update.name;
                    
                    console.log('🔍 [KPI Fuzzy Match - new_period]', {
                      timestamp: new Date().toISOString(),
                      userInput: update.name,
                      matchFound: bestMatch,
                      willSearchFor: searchName
                    });
                    
                    // Calcular fechas iniciales si no se proporcionaron
                    let rawStart = update.period_start;
                    let rawEnd = update.period_end;
                    
                    if (!rawStart || !rawEnd) {
                      console.log('📅 [Auto-calculating period dates]', {
                        kpiName: searchName,
                        reason: 'Missing period dates - using current month'
                      });
                      
                      const dates = calculatePeriodDates(lastUserMessage);
                      rawStart = rawStart || dates.start;
                      rawEnd = rawEnd || dates.end;
                    }
                    
                    // ✅ VALIDACIÓN: Ajustar fechas si son inválidas
                    const { start, end, wasAdjusted, adjustmentReason } = await validateAndAdjustPeriodDates(
                      companyId,
                      searchName,
                      rawStart,
                      rawEnd,
                      admin
                    );
                    
                    if (wasAdjusted) {
                      console.warn('⚠️ [Auto-adjusted Period]', {
                        kpiName: searchName,
                        originalPeriod: `${rawStart} → ${rawEnd}`,
                        adjustedPeriod: `${start} → ${end}`,
                        reason: adjustmentReason
                      });
                    }
                    
                    // Obtener el KPI más reciente para heredar área y unidad
                    const { data: latest } = await admin
                      .from('kpis')
                      .select('area, unit, target_value')
                      .eq('company_id', companyId)
                      .ilike('name', searchName)
                      .order('period_end', { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    
                    // Construir datos de inserción
                    const kpiData = {
                      company_id: companyId,
                      name: searchName,
                      value: update.value,
                      unit: update.unit || latest?.unit || null,
                      target_value: update.target_value || latest?.target_value || null,
                      area: update.area || latest?.area || 'general',
                      period_start: start,  // ✅ Usa fechas validadas
                      period_end: end,      // ✅ Usa fechas validadas
                      source: 'assistant',
                      metadata: { 
                        created_via: 'chat',
                        date_adjusted: wasAdjusted,
                        adjustment_reason: adjustmentReason || null
                      }
                    };
                    
                    // Insertar y obtener el ID
                    const { data: insertedKPI, error: insertError } = await admin
                      .from('kpis')
                      .insert(kpiData)
                      .select('id')
                      .single();
                    
                    if (insertError) {
                      console.error('❌ [KPI Insertion Error]', insertError);
                      throw insertError;
                    }
                    
                    // ✅ VALIDACIÓN POST-INSERCIÓN
                    const verification = await verifyKPIInsertion(
                      companyId,
                      {
                        name: kpiData.name,
                        value: kpiData.value,
                        period_start: kpiData.period_start,
                        period_end: kpiData.period_end
                      },
                      admin,
                      insertedKPI?.id
                    );
                    
                    if (!verification.success) {
                      console.error('❌ [KPI Verification Failed]', {
                        expectedData: kpiData,
                        error: verification.error,
                        actualData: verification.data
                      });
                      
                      throw new Error(`Fallo en verificación post-inserción: ${verification.error}`);
                    }
                    
                    // Log de éxito con todos los detalles
                    console.log('✅ [KPI New Period Success]', {
                      timestamp: new Date().toISOString(),
                      kpiName: searchName,
                      originalInput: update.name !== searchName ? update.name : undefined,
                      value: update.value,
                      unit: kpiData.unit,
                      periodStart: start,
                      periodEnd: end,
                      wasDateAdjusted: wasAdjusted,
                      inheritedFrom: latest ? 'existing KPI' : 'new KPI',
                      verifiedInDB: true,
                      operation: 'new_period'
                    });
                    
                    appliedOperations.push({
                      entity: 'kpis',
                      summary: `📈 Registrado nuevo valor de "${searchName}": ${update.value}${kpiData.unit || ''} para periodo ${start} → ${end}${wasAdjusted ? ' (fechas ajustadas automáticamente)' : ''}`
                    });
                    
                    await admin.from('audit_logs').insert({
                      resource_type: 'kpi',
                      action: 'create',
                      user_id: user.id,
                      metadata: { 
                        kpi_name: searchName, 
                        value: update.value, 
                        period_start: start, 
                        period_end: end,
                        date_adjusted: wasAdjusted
                      }
                    });
                  }
                }
              } else if (toolCall.function.name === 'manage_tasks' && companyId && user) {
                const validated = taskOperationSchema.parse(functionArgs);
                
                for (const op of validated.operations) {
                  if (op.action === 'create' && op.title) {
                    const { data: activePlan } = await admin
                      .from('action_plans')
                      .select('id')
                      .eq('company_id', companyId)
                      .eq('is_active', true)
                      .maybeSingle();
                    
                    if (activePlan) {
                      const { data: firstObjective } = await admin
                        .from('plan_objectives')
                        .select('id')
                        .eq('plan_id', activePlan.id)
                        .limit(1)
                        .maybeSingle();
                      
                      if (firstObjective) {
                        const { error: createError } = await admin
                          .from('tasks')
                          .insert({
                            objective_id: firstObjective.id,
                            title: op.title,
                            description: op.description,
                            status: op.status || 'pending',
                            priority: op.priority || 'medium',
                            due_date: op.due_date,
                            estimated_effort: op.estimated_effort,
                            assigned_to: op.assigned_to
                          });
                        
                        if (!createError) {
                          appliedOperations.push({
                            entity: 'tasks',
                            summary: `Creada tarea "${op.title}"`
                          });
                          
                          await admin.from('audit_logs').insert({
                            resource_type: 'task',
                            action: 'create',
                            user_id: user.id,
                            metadata: { title: op.title }
                          });
                        }
                      }
                    }
                  } else if (op.action === 'change_status' && op.task_id && op.status) {
                    const { data: task } = await admin
                      .from('tasks')
                      .select('title, status')
                      .eq('id', op.task_id)
                      .maybeSingle();
                    
                    if (task) {
                      const { error: updateError } = await admin
                        .from('tasks')
                        .update({ 
                          status: op.status,
                          completed_at: op.status === 'completed' ? new Date().toISOString() : null
                        })
                        .eq('id', op.task_id);
                      
                      if (!updateError) {
                        appliedOperations.push({
                          entity: 'tasks',
                          summary: `"${task.title}": ${task.status} → ${op.status}`
                        });
                        
                        await admin.from('audit_logs').insert({
                          resource_type: 'task',
                          action: 'update',
                          user_id: user.id,
                          metadata: { task_id: op.task_id, old_status: task.status, new_status: op.status }
                        });
                      }
                    }
                  } else if (op.action === 'update' && op.task_id) {
                    const updateData: any = {};
                    if (op.title) updateData.title = op.title;
                    if (op.description) updateData.description = op.description;
                    if (op.status) updateData.status = op.status;
                    if (op.priority) updateData.priority = op.priority;
                    if (op.due_date) updateData.due_date = op.due_date;
                    if (op.estimated_effort) updateData.estimated_effort = op.estimated_effort;
                    if (op.assigned_to) updateData.assigned_to = op.assigned_to;
                    
                    if (Object.keys(updateData).length > 0) {
                      const { error: updateError } = await admin
                        .from('tasks')
                        .update(updateData)
                        .eq('id', op.task_id);
                      
                      if (!updateError) {
                        appliedOperations.push({
                          entity: 'tasks',
                          summary: `Actualizada tarea ${op.task_id}`
                        });
                        
                        await admin.from('audit_logs').insert({
                          resource_type: 'task',
                          action: 'update',
                          user_id: user.id,
                          metadata: { task_id: op.task_id, updates: updateData }
                        });
                      }
                    }
                  }
                }
              } else if (toolCall.function.name === 'manage_documents' && companyId && user) {
                const validated = documentOperationSchema.parse(functionArgs);
                
                for (const op of validated.operations) {
                  if (op.action === 'analyze' && op.document_id) {
                    const { error: analyzeError } = await admin.functions.invoke('analyze-document', {
                      body: { documentId: op.document_id }
                    });
                    
                    if (!analyzeError) {
                      appliedOperations.push({
                        entity: 'documents',
                        summary: `Análisis iniciado para documento ${op.document_id}`
                      });
                      
                      await admin.from('audit_logs').insert({
                        resource_type: 'document',
                        action: 'analyze',
                        user_id: user.id,
                        metadata: { document_id: op.document_id }
                      });
                    }
                  } else if (op.action === 'recategorize' && op.document_id && op.new_category) {
                    const { error: updateError } = await admin
                      .from('documents')
                      .update({ category: op.new_category })
                      .eq('id', op.document_id);
                    
                    if (!updateError) {
                      appliedOperations.push({
                        entity: 'documents',
                        summary: `Documento recategorizado a "${op.new_category}"`
                      });
                      
                      await admin.from('audit_logs').insert({
                        resource_type: 'document',
                        action: 'update',
                        user_id: user.id,
                        metadata: { document_id: op.document_id, new_category: op.new_category }
                      });
                    }
                  }
                }
              }
            } catch (error) {
              console.error(`Error executing ${toolCall.function.name}:`, error);
            }
          }
        }
      } catch (error) {
        console.error('Tool extraction error:', error);
      }
      
      console.log('📝 [Applied Operations Summary]', {
        timestamp: new Date().toISOString(),
        totalOperations: appliedOperations.length,
        operations: appliedOperations.map(op => ({
          entity: op.entity,
          summary: op.summary
        }))
      });
      
      // Build system prompt
      const { currentPage, project, focus, data } = requestContext || {};
      
      const pageName = currentPage === '/' ? 'Dashboard' : 
                       currentPage === '/kpis' ? 'KPIs' : 
                       currentPage === '/tasks' ? 'Tareas' : 
                       currentPage === '/documents' ? 'Documentos' : 
                       currentPage || 'la aplicación';

      let systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres Alasha AI, un asistente empresarial experto que ayuda al usuario en la página "${pageName}"`;
      
      if (project) {
        systemPrompt += ` del proyecto "${project.name}"`;
      }
      
      // Add data context
      if (data) {
        if (data.tasks && Array.isArray(data.tasks)) {
          const urgentTasks = data.tasks.filter((t: any) => t.priority === 'high' && t.status !== 'completed');
          const inProgressTasks = data.tasks.filter((t: any) => t.status === 'in_progress');
          const completedTasks = data.tasks.filter((t: any) => t.status === 'completed');
          
          systemPrompt += `\n\nINFORMACIÓN DE TAREAS DEL PROYECTO:\n- Total de tareas: ${data.tasks.length}\n- Tareas completadas: ${completedTasks.length}\n- Tareas en progreso: ${inProgressTasks.length}\n- Tareas urgentes (prioridad alta): ${urgentTasks.length}`;
        }
        
        if (data.kpis && Array.isArray(data.kpis)) {
          systemPrompt += `\n\nINFORMACIÓN DE KPIs DEL PROYECTO:\n- Total de KPIs: ${data.kpis.length}\n\nKPIs ACTUALES:\n${data.kpis.map((k: any) => {
  const progress = k.target_value ? Math.round((k.value / k.target_value) * 100) : 0;
  const onTarget = k.target_value ? k.value >= k.target_value : null;
  return `• ${k.name} (${k.area}): ${k.value}${k.unit || ''} ${k.target_value ? `/ Meta: ${k.target_value}${k.unit || ''} (${progress}% ${onTarget ? '✓ En meta' : '⚠ Bajo meta'})` : ''}`;
}).join('\n')}`;

          if (data.selectedKPI) {
            systemPrompt += `\n\nKPI ACTUALMENTE SELECCIONADO:\n• ${data.selectedKPI.name}: ${data.selectedKPI.value}${data.selectedKPI.unit || ''}${data.selectedKPI.target_value ? ` / Meta: ${data.selectedKPI.target_value}${data.selectedKPI.unit || ''}` : ''}`;
          }
        }
      }
      
      if (focus) {
        if (focus.kpiName) systemPrompt += `\n\nEl usuario está consultando el KPI: ${focus.kpiName}`;
        if (focus.taskId) systemPrompt += `\n\nEl usuario está consultando una tarea específica`;
        if (focus.documentId) systemPrompt += `\n\nEl usuario está consultando un documento específico`;
      }
      
      systemPrompt += `\n\nINSTRUCCIONES IMPORTANTES:\n- Responde de forma clara y conversacional\n- Si el usuario pide actualizar datos, confirma los cambios realizados\n- Si hay errores o ambigüedades, pide aclaraciones específicas\n- Usa formato markdown para estructurar información compleja`;

      // Add operations summary to system prompt if any were applied
      if (appliedOperations.length > 0) {
        const operationsByEntity = appliedOperations.reduce((acc, op) => {
          if (!acc[op.entity]) acc[op.entity] = [];
          acc[op.entity].push(op.summary);
          return acc;
        }, {} as Record<string, string[]>);
        
        systemPrompt += `\n\nOPERACIONES APLICADAS:\n`;
        for (const [entity, summaries] of Object.entries(operationsByEntity)) {
          systemPrompt += `\n${entity.toUpperCase()}:\n${summaries.map(s => `• ${s}`).join('\n')}`;
        }
        systemPrompt += `\n\nConfirma estos cambios de forma natural y amigable al usuario.`;
      }

      // Stream the AI response
      const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
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

      if (!aiResponse.ok) {
        if (aiResponse.status === 429) {
          return new Response(JSON.stringify({ error: 'Rate limits exceeded, please try again later.' }), {
            status: 429,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        if (aiResponse.status === 402) {
          return new Response(JSON.stringify({ error: 'Payment required, please add funds to your Lovable AI workspace.' }), {
            status: 402,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
        throw new Error(`AI Gateway error: ${aiResponse.status}`);
      }

      // Add headers to signal data updates
      const updatedEntities = [...new Set(appliedOperations.map(op => op.entity))];
      const responseHeaders = {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Data-Updated': appliedOperations.length > 0 ? '1' : '0',
        'X-Updated-Entities': updatedEntities.join(',')
      };

      return new Response(aiResponse.body, {
        headers: responseHeaders
      });
    }

    // Handle non-contextual modes with AI streaming
    let systemPrompt = '';
    const companyName = companyInfo?.name || 'tu empresa';
    const industry = companyInfo?.industry || 'tu industria';
    const stage = companyInfo?.stage || 'tu etapa';
    const projectName = companyInfo?.projectName || 'tu proyecto';
    const projectDesc = companyInfo?.projectDescription || '';

    // Get historical context if authenticated and in diagnosis mode
    let historicalContext: any = null;
    if (mode === 'diagnosis') {
      const authHeader = req.headers.get('Authorization');
      if (authHeader) {
        try {
          const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
          const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
          const admin = createClient(supabaseUrl, supabaseServiceKey);
          
          const token = authHeader.replace('Bearer ', '');
          const { data: { user } } = await admin.auth.getUser(token);
          
          if (user && requestContext?.project?.id) {
            const { data: profile } = await admin
              .from('profiles')
              .select('company_id')
              .eq('id', user.id)
              .maybeSingle();
            
            if (profile?.company_id) {
              historicalContext = await getHistoricalContext(
                admin,
                profile.company_id,
                requestContext.project.id
              );
              console.log('📊 Historical context loaded:', {
                hasPreviousDiagnosis: historicalContext.hasPreviousDiagnosis,
                kpisCount: historicalContext.kpis?.length || 0,
                tasksCount: historicalContext.tasks?.length || 0
              });
            }
          }
        } catch (error) {
          console.error('Error loading historical context:', error);
        }
      }
    }

    switch(mode) {
      case 'diagnosis':
        const areaNames: Record<string, string> = {
          strategy: 'Estrategia',
          operations: 'Operaciones',
          finance: 'Finanzas',
          marketing: 'Marketing',
          legal: 'Legal',
          technology: 'Tecnología'
        };
        
        const currentAreaName = currentArea ? areaNames[currentArea] || currentArea : 'general';
        const areaInfo = areaProgress?.areas.find(a => a.id === currentArea);
        const messageCount = areaInfo?.messageCount || 0;
        
        // Determinar orientación basado solo en messageCount
        let depthGuidance = '';
        if (messageCount >= 2 && messageCount < 3) {
          depthGuidance = '\n\n**IMPORTANTE**: Solo has obtenido pocas respuestas. Haz preguntas más específicas que motiven ejemplos concretos, números, o detalles de su situación actual.';
        } else if (messageCount >= 3 && messageCount < 4) {
          depthGuidance = '\n\n**IMPORTANTE**: Necesitas obtener más información. Pide ejemplos específicos, datos cuantitativos si es posible, y profundiza en los puntos mencionados.';
        }

        // Build context section based on historical data
        let contextSection = '';
        if (historicalContext?.hasPreviousDiagnosis) {
          const prev = historicalContext.previousDiagnosis;
          const criticalAreas = prev.insights?.critical_areas || [];
          const insights = prev.insights?.insights || [];
          
          contextSection = `

📊 CONTEXTO DEL DIAGNÓSTICO ANTERIOR (versión ${prev.version}, ${new Date(prev.created_at).toLocaleDateString('es-MX')}):

Scores previos:
- Estrategia: ${prev.strategy_score}/100
- Operaciones: ${prev.operations_score}/100
- Finanzas: ${prev.finance_score}/100
- Marketing: ${prev.marketing_score}/100
- Legal: ${prev.legal_score}/100
- Tecnología: ${prev.technology_score}/100
- Nivel de madurez: ${prev.maturity_level}

Áreas críticas identificadas: ${criticalAreas.length > 0 ? criticalAreas.join(', ') : 'N/A'}

Insights clave del diagnóstico anterior:
${insights.length > 0 ? insights.map((i: string) => `- ${i}`).join('\n') : '- N/A'}

📈 ESTADO ACTUAL DEL PROYECTO:
- KPIs registrados: ${historicalContext.kpis.length} en áreas: ${[...new Set(historicalContext.kpis.map((k: any) => k.area))].join(', ')}
- Tareas: ${historicalContext.tasks.length} (${historicalContext.tasks.filter((t: any) => t.status === 'completed').length} completadas, ${historicalContext.tasks.filter((t: any) => t.status === 'in_progress').length} en progreso)
- Documentos analizados: ${historicalContext.documents.length}

⚠️ INSTRUCCIONES ESPECIALES PARA DIAGNÓSTICO DE SEGUIMIENTO:
1. Este es un diagnóstico de seguimiento (versión ${(prev.version || 0) + 1})
2. Haz preguntas que evalúen el PROGRESO desde el diagnóstico anterior
3. Pregunta específicamente sobre las áreas críticas identificadas: ${criticalAreas.length > 0 ? criticalAreas.join(', ') : 'todas las áreas'}
4. Indaga si las recomendaciones o insights previos fueron implementados
5. Evalúa si los KPIs han mejorado y qué acciones tomaron
6. Identifica nuevos desafíos que hayan surgido desde entonces
7. Sé más específico y profundo en las preguntas, considerando la madurez del proyecto
8. Relaciona las respuestas actuales con los datos históricos cuando sea relevante

`;
        } else {
          contextSection = `

ℹ️ ESTE ES EL PRIMER DIAGNÓSTICO:
- No hay información previa del proyecto
- Enfócate en entender el estado actual y fundamentos
- Haz preguntas exploratorias para establecer la línea base

`;
        }
        
        systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un consultor empresarial experto de Alasha AI realizando un diagnóstico para ${companyName}, empresa del sector ${industry} en etapa ${stage}.

Estás evaluando el proyecto: ${projectName}${projectDesc ? ` - ${projectDesc}` : ''}
${contextSection}

ÁREA ACTUAL: ${currentAreaName.toUpperCase()}
Estado del área: ${areaInfo?.status || 'in_progress'}
Mensajes del usuario en esta área: ${messageCount}

🤖 CAPACIDAD DE NAVEGACIÓN AUTOMÁTICA:
Tienes acceso a la función \`advance_to_next_area\` que te permite avanzar automáticamente al siguiente área del diagnóstico.

CUÁNDO USAR \`advance_to_next_area\`:
✅ Cuando has cubierto 4-5 puntos del checklist con información de calidad
✅ Y el usuario expresa clara intención de continuar con frases como:
   - "sí", "siguiente", "continuemos", "adelante" 
   - "ya", "ya está", "listo", "ok", "perfecto"
   - "vamos con lo siguiente", "sigamos con otra área"
   - Confirmaciones directas: "claro", "por supuesto", "sí, avancemos"

❌ NO USAR si:
- El usuario hace una pregunta adicional sobre el área actual
- El usuario está agregando más información
- El usuario dice "espera", "no", "antes de continuar..."
- No has cubierto al menos 4 puntos del checklist con respuestas de calidad
- El usuario solo responde con información sin expresar intención de avanzar

⚠️ IMPORTANTE: Antes de invocar la función, confirma verbalmente:
"Perfecto, he cubierto [menciona brevemente los puntos clave]. Continuemos con [siguiente área]."

INSTRUCCIONES ESPECÍFICAS PARA ${currentAreaName.toUpperCase()}:

📍 REGLA FUNDAMENTAL: Enfócate EXCLUSIVAMENTE en evaluar "${currentAreaName}". NO menciones nombres de otras áreas del diagnóstico.

🎯 EVALUACIÓN INTELIGENTE DE COMPLETITUD:
NO te bases en cantidad de mensajes, sino en CALIDAD y COBERTURA de la información.

CHECKLIST INTERNO - Evalúa mentalmente si has cubierto estos puntos clave para ${currentAreaName.toUpperCase()}:

${currentArea === 'strategy' ? `
✓ Visión y Misión: ¿Entiendes claramente la dirección y propósito de la empresa?
✓ Propuesta de Valor: ¿Conoces qué los diferencia de la competencia?
✓ Objetivos Estratégicos: ¿Sabes cuáles son las metas principales a 1-3 años?
✓ Modelo de Negocio: ¿Entiendes cómo generan valor y capturan ingresos?
✓ Posicionamiento: ¿Conoces su lugar en el mercado y cómo se perciben?
✓ Competencia: ¿Tienes información sobre competidores principales?` : ''}

${currentArea === 'operations' ? `
✓ Procesos Clave: ¿Entiendes los workflows principales de operación diaria?
✓ Eficiencia: ¿Sabes cómo miden productividad y dónde hay cuellos de botella?
✓ Calidad: ¿Conoces sus estándares de calidad y sistemas de control?
✓ Recursos: ¿Entiendes qué recursos humanos y materiales utilizan?
✓ Tecnología Operativa: ¿Sabes qué herramientas usan para operar?
✓ Indicadores: ¿Conoces métricas operativas clave (tiempos, costos, errores)?` : ''}

${currentArea === 'finance' ? `
✓ Modelo de Ingresos: ¿Entiendes de dónde viene el dinero y cómo se cobra?
✓ Estructura de Costos: ¿Conoces los principales gastos fijos y variables?
✓ Rentabilidad: ¿Sabes si el negocio es rentable y cuáles son los márgenes?
✓ Flujo de Caja: ¿Entiendes la situación de liquidez y ciclos de cobro/pago?
✓ Financiamiento: ¿Conoces fuentes de capital y situación de deuda?
✓ Proyecciones: ¿Tienen proyecciones financieras o presupuestos?` : ''}

${currentArea === 'marketing' ? `
✓ Estrategia de Adquisición: ¿Entiendes cómo atraen nuevos clientes?
✓ Canales: ¿Conoces qué canales de marketing usan (digital, físico, etc.)?
✓ Mensaje y Posicionamiento: ¿Sabes cómo se comunican con su audiencia?
✓ Segmentación: ¿Entiendes quiénes son sus clientes objetivo?
✓ Retención: ¿Conoces estrategias para mantener clientes y aumentar lealtad?
✓ Métricas: ¿Sabes cómo miden efectividad (CAC, LTV, conversión)?` : ''}

${currentArea === 'legal' ? `
✓ Estructura Legal: ¿Conoces el tipo de sociedad y estructura jurídica?
✓ Compliance: ¿Entiendes qué regulaciones aplican y si cumplen?
✓ Contratos Clave: ¿Sabes de contratos importantes (proveedores, clientes, socios)?
✓ Propiedad Intelectual: ¿Conoces si tienen patentes, marcas, o protección de IP?
✓ Riesgos Legales: ¿Has identificado posibles riesgos o litigios?
✓ Protección de Datos: ¿Entiendes cómo manejan privacidad y datos personales?` : ''}

${currentArea === 'technology' ? `
✓ Infraestructura: ¿Conoces la infraestructura tecnológica (servidores, cloud, on-premise)?
✓ Herramientas y Sistemas: ¿Sabes qué software y sistemas usan (ERP, CRM, etc.)?
✓ Digitalización: ¿Entiendes el nivel de digitalización de procesos?
✓ Automatización: ¿Conoces qué procesos están automatizados?
✓ Datos y Analytics: ¿Sabes cómo recopilan y analizan datos?
✓ Innovación Tecnológica: ¿Entiendes si adoptan nuevas tecnologías (AI, IoT, etc.)?` : ''}

📋 ESTRATEGIA DE PREGUNTAS:
1. ${messageCount === 0 ? 'Inicia presentando el área de forma amigable y haz tu primera pregunta sobre el punto más fundamental' : 'Revisa mentalmente el checklist y pregunta sobre el siguiente punto NO cubierto'}
2. Haz UNA pregunta específica a la vez - busca números, ejemplos concretos, nombres de herramientas
3. Si una respuesta es vaga, profundiza pidiendo ejemplos específicos
4. NO avances al siguiente punto hasta que entiendas bien el actual

✅ CUÁNDO SUGERIR AVANZAR:
- SOLO cuando hayas cubierto AL MENOS 4-5 puntos del checklist con información de calidad
- Si el usuario responde "no sé" o "no aplica" a varios puntos, aún puedes sugerir avanzar
- Sugerencia: "Tengo una buena comprensión del área de ${currentAreaName}. ¿Hay algo más importante que agregar, o continuamos con la siguiente área?"
- NUNCA fuerces el avance - el usuario decide

⚠️ MANTÉN EL ENFOQUE:
- Si el usuario menciona información de otra área, agradece brevemente: "Interesante, lo tomaré en cuenta. Ahora, sobre ${currentAreaName}..."
- NO menciones nombres de otras áreas en tus preguntas${depthGuidance}

ESTILO:
- Haz UNA pregunta a la vez
- Adapta tu lenguaje a la etapa "${stage}"
- Sé conversacional y empático
- Profundiza en respuestas vagas
- Valida con frases cortas
- Relaciona con el sector ${industry}

No menciones que eres IA, actúa como un consultor humano experimentado.`;
        break;

      case 'strategic':
        systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un mentor estratégico senior de Alasha AI trabajando con ${companyName}, empresa del sector ${industry} en etapa ${stage}.

Proyecto: ${projectName}${projectDesc ? ` - ${projectDesc}` : ''}

Te especializas en:
- Visión de largo plazo y decisiones estratégicas
- Análisis de competencia y posicionamiento
- Modelos de negocio y expansión
- Frameworks: SWOT, Porter, Blue Ocean, Business Model Canvas

Adapta tu enfoque según etapa:
- idea/startup: validación, product-market fit, pivots
- pyme: escalabilidad, profesionalización, delegación
- corporate: eficiencia, innovación, transformación

Sé directo, estratégico y orientado a resultados medibles.`;
        break;

      case 'follow_up':
        systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un coach operativo de Alasha AI para ${companyName}, empresa del sector ${industry} en etapa ${stage}.

Proyecto: ${projectName}${projectDesc ? ` - ${projectDesc}` : ''}

Tu enfoque es táctico y orientado a la acción:
- Ejecutar el plan, desbloquear tareas
- Optimizar prioridades y recursos
- Alcanzar objetivos medibles
- Gestionar progreso y accountability

Preguntas clave:
- ¿Qué está bloqueando el avance?
- ¿Las prioridades están claras?
- ¿Los recursos están bien asignados?
- ¿Cómo medimos el éxito?

Sé pragmático, orientado a soluciones rápidas y resultados inmediatos.`;
        break;

      case 'document':
        systemPrompt = `IMPORTANTE: Usa español de México en todas tus respuestas. Sé profesional, directo y cercano.

Eres un analista de datos senior de Alasha AI para ${companyName}, empresa del sector ${industry} en etapa ${stage}.

Proyecto: ${projectName}${projectDesc ? ` - ${projectDesc}` : ''}

Especialidades:
- Análisis de documentos y extracción de insights
- Identificación de tendencias y patrones
- Análisis financiero, operativo, de marketing y tecnológico
- Conexión de datos con estrategia

Enfoque analítico:
- Datos concretos sobre intuiciones
- Identificar correlaciones y causas
- Proponer métricas accionables
- Visualizar insights complejos de forma clara

Sé preciso, basado en datos, y conecta los números con decisiones estratégicas.`;
        break;

      default:
        systemPrompt = 'Eres un asistente útil de Alasha AI especializado en consultoría empresarial.';
    }

    // Preparar tools si estamos en modo diagnosis
    // IMPORTANT: Disable streaming when tool calling is needed, as we need to parse the full response
    const useToolCalling = mode === 'diagnosis' && currentArea;
    
    const requestBody: any = {
      model: 'google/gemini-2.5-flash',
      messages: [
        { role: 'system', content: systemPrompt },
        ...messages
      ],
      stream: !useToolCalling, // Disable streaming when we need to check for tool calls
    };

    // Agregar herramienta de navegación automática solo en modo diagnosis
    if (useToolCalling) {
      requestBody.tools = [
        {
          type: "function",
          function: {
            name: "advance_to_next_area",
            description: "Avanza automáticamente a la siguiente área del diagnóstico cuando: (1) has evaluado que cubriste 4-5 puntos del checklist con calidad, Y (2) el usuario expresa claramente intención de continuar (palabras: 'sí', 'siguiente', 'continuemos', 'adelante', 'ya está', 'ok', 'listo'). NO uses esta función si el usuario hace otra pregunta o agrega información.",
            parameters: {
              type: "object",
              properties: {
                action: {
                  type: "string",
                  enum: ["advance"],
                  description: "Acción de avanzar al siguiente área"
                },
                current_area_id: {
                  type: "string",
                  description: "ID del área actual (para validación)"
                },
                reason: {
                  type: "string",
                  description: "Breve razón de por qué consideras apropiado avanzar (puntos del checklist cubiertos)"
                }
              },
              required: ["action", "current_area_id"]
            }
          }
        }
      ];
      requestBody.tool_choice = "auto";
    }

    // Call Lovable AI Gateway with streaming
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    // Handle AI Gateway errors
    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ error: 'AI credits exhausted. Please add credits to your workspace.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await aiResponse.text();
      console.error('AI Gateway error:', aiResponse.status, errorText);
      return new Response(
        JSON.stringify({ error: 'AI service error' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // En modo diagnosis, verificar si el AI invocó advance_to_next_area
    if (useToolCalling) {
      // Non-streaming response, parse as JSON
      const responseData = await aiResponse.json();
      const toolCalls = responseData.choices?.[0]?.message?.tool_calls;
      
      if (toolCalls) {
        const navigationCall = toolCalls.find((tc: any) => tc.function.name === 'advance_to_next_area');
        if (navigationCall) {
          try {
            const navArgs = JSON.parse(navigationCall.function.arguments);
            const validated = areaNavigationSchema.parse(navArgs);
            
            console.log('🚀 AI invocó advance_to_next_area:', validated);
            
            // Señalizar al cliente que debe avanzar automáticamente
            return new Response(
              JSON.stringify({
                type: 'navigation_action',
                action: 'advance_to_next_area',
                current_area_id: validated.current_area_id,
                reason: validated.reason,
                message: responseData.choices?.[0]?.message?.content || 'Avanzando al siguiente área...'
              }),
              {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
              }
            );
          } catch (e) {
            console.error('Error parsing navigation action:', e);
          }
        }
      }
      
      // No tool call detected, return the AI message as JSON (convert to SSE format for client)
      const content = responseData.choices?.[0]?.message?.content || '';
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        }
      });
      
      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        }
      });
    }

    // Return SSE stream for non-diagnosis modes
    return new Response(aiResponse.body, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      }
    });

  } catch (error: any) {
    console.error('Error in chat-diagnosis function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error',
        stack: error.stack 
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});
