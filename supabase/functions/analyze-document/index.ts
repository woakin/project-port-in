import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { z } from 'https://deno.land/x/zod@v3.22.4/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const requestSchema = z.object({
  documentId: z.string().uuid('Invalid document ID format')
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const body = await req.json()
    const { documentId } = requestSchema.parse(body)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Obtener metadata del documento
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError) throw docError

    // 2. Actualizar estado a "processing"
    await supabase
      .from('documents')
      .update({ analysis_status: 'processing' })
      .eq('id', documentId)

    // 3. Descargar archivo del storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(doc.file_url.split('/').slice(-2).join('/'))

    if (downloadError) throw downloadError

    // 4. Extraer texto según tipo de archivo
    let extractedText = ''
    
    if (doc.file_type === 'txt' || doc.file_type === 'csv') {
      extractedText = await fileData.text()
    } else if (doc.file_type === 'pdf' || doc.file_type === 'docx' || doc.file_type === 'xlsx') {
      // Para archivos binarios, limitamos la extracción al nombre y metadata
      extractedText = `Archivo: ${doc.file_name}\nTipo: ${doc.file_type}\nTamaño: ${doc.file_size} bytes\n\nNOTA: La extracción completa de ${doc.file_type} requiere procesamiento adicional.`
    }

    // Limitar texto a 8000 caracteres para el LLM
    const textSample = extractedText.substring(0, 8000)

    // 5. Analizar con Lovable AI
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY')
    if (!LOVABLE_API_KEY) {
      throw new Error('LOVABLE_API_KEY not configured')
    }

    const systemPrompt = `Eres un analista de documentos empresariales experto. Analiza el siguiente documento y genera:

1. **Categoría** (elige una): financial, legal, operational, marketing, strategic, other
2. **Resumen ejecutivo** (máximo 150 palabras): resumen claro y conciso del contenido
3. **Datos clave extraídos**: fechas importantes, números relevantes, entidades mencionadas
4. **Insights y recomendaciones** (3-5 puntos): hallazgos importantes y acciones sugeridas
5. **KPIs potenciales**: si el documento contiene métricas, identifícalas

Responde SOLO con JSON en este formato:
{
  "category": "...",
  "summary": "...",
  "key_data": {
    "dates": ["..."],
    "numbers": ["..."],
    "entities": ["..."]
  },
  "insights": ["..."],
  "suggested_kpis": [
    {
      "name": "...",
      "current_value": 0,
      "target_value": 0,
      "unit": "...",
      "area": "..."
    }
  ]
}`

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
          { role: 'user', content: `Documento: ${doc.file_name}\n\nContenido:\n${textSample}` }
        ],
      }),
    })

    if (!aiResponse.ok) {
      throw new Error(`AI API error: ${aiResponse.status}`)
    }

    const aiData = await aiResponse.json()
    const analysisText = aiData.choices[0].message.content

    // Extraer JSON del texto (por si viene con markdown)
    const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON del análisis')
    }

    const analysis = JSON.parse(jsonMatch[0])

    // 6. Actualizar documento con análisis
    const { error: updateError } = await supabase
      .from('documents')
      .update({
        category: analysis.category,
        analysis_status: 'completed',
        analysis_result: analysis,
        updated_at: new Date().toISOString()
      })
      .eq('id', documentId)

    if (updateError) throw updateError

    // 7. Si hay KPIs sugeridos, insertarlos (opcional)
    if (analysis.suggested_kpis && analysis.suggested_kpis.length > 0) {
      const kpisToInsert = analysis.suggested_kpis.map((kpi: any) => ({
        company_id: doc.company_id,
        area: kpi.area || 'other',
        name: kpi.name,
        value: kpi.current_value || 0,
        target_value: kpi.target_value || 0,
        unit: kpi.unit || '',
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        source: 'document_analysis',
        metadata: {
          document_id: documentId,
          document_name: doc.file_name
        }
      }))

      await supabase.from('kpis').insert(kpisToInsert)
    }

    return new Response(
      JSON.stringify({ 
        success: true,
        analysis 
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )

  } catch (error) {
    console.error('Error analyzing document:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid request data',
          details: error.errors 
        }),
        { 
          status: 400,
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'application/json' 
          } 
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error analizando documento' 
      }),
      { 
        status: 500,
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  }
})