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

    // 1. Obtener todas las alertas activas (sin join a kpis)
    const { data: alerts, error: alertsError } = await supabase
      .from('kpi_alerts')
      .select('*')
      .eq('is_active', true)

    if (alertsError) throw alertsError

    console.log(`🔍 [Check Alerts] Verificando ${alerts?.length || 0} alertas activas`)

    const triggeredAlerts = []

    // 2. Para cada alerta, buscar el KPI MÁS RECIENTE por nombre
    for (const alert of alerts || []) {
      // Obtener el valor más reciente del KPI por nombre y company_id
      const { data: latestKPI, error: kpiError } = await supabase
        .from('kpis')
        .select('*')
        .eq('company_id', alert.company_id)
        .ilike('name', alert.kpi_name)
        .order('period_end', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (kpiError || !latestKPI) {
        console.warn(`⚠️ [Alert ${alert.id}] KPI no encontrado: "${alert.kpi_name}" en company ${alert.company_id}`)
        continue
      }

      const currentValue = Number(latestKPI.value)
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

      console.log(`📊 [Alert Check] ${alert.kpi_name}`, {
        current: currentValue,
        threshold,
        condition: alert.condition,
        shouldTrigger,
        lastTriggered: alert.last_triggered_at
      })

      // 3. Si se cumple la condición, crear notificación
      if (shouldTrigger) {
        const now = new Date().toISOString()
        
        // Verificar si ya fue disparada recientemente (últimas 24h)
        if (alert.last_triggered_at) {
          const lastTriggered = new Date(alert.last_triggered_at)
          const hoursSinceLastTrigger = (Date.now() - lastTriggered.getTime()) / (1000 * 60 * 60)
          
          if (hoursSinceLastTrigger < 24) {
            console.log(`⏭️ [Skip Alert] Alerta ${alert.id} ya fue disparada hace ${hoursSinceLastTrigger.toFixed(1)} horas`)
            continue
          }
        }

        triggeredAlerts.push({
          alert_id: alert.id,
          kpi_name: latestKPI.name,
          current_value: currentValue,
          threshold: threshold,
          condition: alert.condition,
          user_id: alert.user_id,
        })

        const conditionText = alert.condition === 'above' ? 'mayor' : alert.condition === 'below' ? 'menor' : 'igual'

        // Crear notificación in-app
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: alert.user_id,
            type: 'kpi_alert',
            title: `🔔 Alerta de KPI: ${latestKPI.name}`,
            message: `El KPI "${latestKPI.name}" tiene un valor de ${currentValue}${latestKPI.unit || ''} que es ${conditionText} al umbral configurado (${threshold}${latestKPI.unit || ''})`,
            priority: currentValue > threshold * 1.5 || currentValue < threshold * 0.5 ? 'high' : 'normal',
            link: '/kpis',
            metadata: {
              kpi_id: latestKPI.id,
              kpi_name: latestKPI.name,
              alert_id: alert.id,
              current_value: currentValue,
              threshold: threshold,
              condition: alert.condition
            }
          })

        if (notifError) {
          console.error('❌ [Notification Error]', notifError)
        } else {
          console.log('✅ [Notification Created] for user', alert.user_id)
        }

        // Actualizar last_triggered_at
        const { error: updateError } = await supabase
          .from('kpi_alerts')
          .update({ last_triggered_at: now })
          .eq('id', alert.id)

        if (updateError) {
          console.error('❌ [Update Alert Error]', updateError)
        }

        console.log(`🚨 [Alert Triggered] ${latestKPI.name} = ${currentValue} (umbral: ${threshold})`)
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
    console.error('❌ [Check Alerts Error]', error)
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
