import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.76.1";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Tool schemas
const kpiUpdateSchema = z.object({
  updates: z.array(z.object({
    name: z.string(),
    value: z.number(),
    action: z.enum(['update_latest', 'insert_new']).default('update_latest'),
    period_start: z.string().optional(),
    period_end: z.string().optional(),
    unit: z.string().optional(),
    area: z.string().optional()
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

    const { messages, companyInfo, isComplete, mode = 'diagnosis', context: requestContext } = validationResult.data;
    
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
            description: "Detecta cuando el usuario quiere actualizar, crear o consultar KPIs. Extrae los datos estructurados.",
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
                        enum: ["update_latest", "insert_new"],
                        description: "update_latest para actualizar el registro más reciente, insert_new para crear nuevo periodo"
                      },
                      period_start: { type: "string", format: "date", nullable: true },
                      period_end: { type: "string", format: "date", nullable: true },
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

KPIs existentes: ${uniqueKPINames.join(', ')}

Extrae operaciones estructuradas del mensaje del usuario. Si no detectas ninguna operación, no invoques herramientas.` 
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
          
          // Step 2: Apply operations based on tool calls
          for (const toolCall of toolCalls) {
            console.log(`Executing tool: ${toolCall.function.name}`);
            
            try {
              const functionArgs = JSON.parse(toolCall.function.arguments);
              
              if (toolCall.function.name === 'manage_kpis' && companyId && user) {
                const validated = kpiUpdateSchema.parse(functionArgs);
                
                for (const update of validated.updates) {
                  if (update.action === 'update_latest') {
                    const { data: latest } = await admin
                      .from('kpis')
                      .select('id, name, value')
                      .eq('company_id', companyId)
                      .ilike('name', update.name)
                      .order('period_end', { ascending: false })
                      .limit(1)
                      .maybeSingle();
                    
                    if (latest?.id) {
                      const { error: updateError } = await admin
                        .from('kpis')
                        .update({ 
                          value: update.value, 
                          source: 'assistant',
                          updated_at: new Date().toISOString()
                        })
                        .eq('id', latest.id);
                      
                      if (!updateError) {
                        appliedOperations.push({
                          entity: 'kpis',
                          summary: `${update.name}: ${latest.value} → ${update.value}`
                        });
                        
                        await admin.from('audit_logs').insert({
                          resource_type: 'kpi',
                          action: 'update',
                          user_id: user.id,
                          metadata: { kpi_name: update.name, old_value: latest.value, new_value: update.value }
                        });
                      }
                    }
                  } else if (update.action === 'insert_new' && update.period_start && update.period_end) {
                    const { error: insertError } = await admin
                      .from('kpis')
                      .insert({
                        company_id: companyId,
                        name: update.name,
                        value: update.value,
                        area: update.area || 'general',
                        unit: update.unit,
                        period_start: update.period_start,
                        period_end: update.period_end,
                        source: 'assistant'
                      });
                    
                    if (!insertError) {
                      appliedOperations.push({
                        entity: 'kpis',
                        summary: `Creado KPI "${update.name}": ${update.value}`
                      });
                      
                      await admin.from('audit_logs').insert({
                        resource_type: 'kpi',
                        action: 'create',
                        user_id: user.id,
                        metadata: { kpi_name: update.name, value: update.value }
                      });
                    }
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
      
      // Build system prompt
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

    // Handle other modes or standard chat modes
    // For simplicity, just echo back the last user message in this example
    // You can implement other modes as needed

    // Example: simple echo response for non-contextual modes
    const lastMessage = messages[messages.length - 1]?.content || '';
    const responseText = `Echo: ${lastMessage}`;

    return new Response(JSON.stringify({ reply: responseText }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
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
