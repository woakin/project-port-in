import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // 1. Obtener todas las alertas activas
    const { data: alerts, error: alertsError } = await supabase
      .from('kpi_alerts')
      .select('*, kpis(*)')
      .eq('is_active', true)

    if (alertsError) throw alertsError

    console.log(`Verificando ${alerts?.length || 0} alertas activas`)

    const triggeredAlerts = []

    // 2. Para cada alerta, verificar si se cumple la condición
    for (const alert of alerts || []) {
      if (!alert.kpis) continue

      const kpi = alert.kpis
      const currentValue = Number(kpi.value)
      const threshold = Number(alert.threshold)

      let shouldTrigger = false

      switch (alert.condition) {
        case 'above':
          shouldTrigger = currentValue > threshold
          break
        case 'below':
          shouldTrigger = currentValue < threshold
          break
        case 'equal':
          shouldTrigger = currentValue === threshold
          break
      }

      // 3. Si se cumple la condición, crear notificación
      if (shouldTrigger) {
        const now = new Date().toISOString()
        
        // Verificar si ya fue disparada recientemente (últimas 24h)
        if (alert.last_triggered_at) {
          const lastTriggered = new Date(alert.last_triggered_at)
          const hoursSinceLastTrigger = (Date.now() - lastTriggered.getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceLastTrigger < 24) {
            console.log(`Alerta ${alert.id} ya fue disparada hace ${hoursSinceLastTrigger.toFixed(1)} horas`)
            continue
          }
        }

        triggeredAlerts.push({
          alert_id: alert.id,
          kpi_name: kpi.name,
          current_value: currentValue,
          threshold: threshold,
          condition: alert.condition,
          user_id: alert.user_id,
        })

        // Crear notificación in-app
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: alert.user_id,
            type: 'kpi_alert',
            title: `Alerta de KPI: ${kpi.name}`,
            message: `El KPI "${kpi.name}" tiene un valor de ${currentValue} que es ${alert.condition === 'above' ? 'mayor' : alert.condition === 'below' ? 'menor' : 'igual'} al umbral configurado (${threshold})`,
            priority: currentValue > threshold * 1.5 || currentValue < threshold * 0.5 ? 'high' : 'normal',
            metadata: {
              kpi_id: kpi.id,
              alert_id: alert.id,
              current_value: currentValue,
              threshold: threshold,
            }
          })

        if (notifError) {
          console.error('Error creando notificación:', notifError)
        }

        // Actualizar last_triggered_at
        const { error: updateError } = await supabase
          .from('kpi_alerts')
          .update({ last_triggered_at: now })
          .eq('id', alert.id)

        if (updateError) {
          console.error('Error actualizando alerta:', updateError)
        }

        console.log(`Alerta disparada: ${kpi.name} = ${currentValue} (umbral: ${threshold})`)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: alerts?.length || 0,
        triggered: triggeredAlerts.length,
        alerts: triggeredAlerts,
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    )
  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Error desconocido' 
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
