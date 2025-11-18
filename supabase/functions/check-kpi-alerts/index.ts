import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { Resend } from 'https://esm.sh/resend@3.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const resend = new Resend(Deno.env.get('RESEND_API_KEY'))

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
        const alertTitle = `🔔 Alerta de KPI: ${latestKPI.name}`
        const alertMessage = `El KPI "${latestKPI.name}" tiene un valor de ${currentValue}${latestKPI.unit || ''} que es ${conditionText} al umbral configurado (${threshold}${latestKPI.unit || ''})`

        // Crear notificación in-app
        const { error: notifError } = await supabase
          .from('notifications')
          .insert({
            user_id: alert.user_id,
            type: 'kpi_alert',
            title: alertTitle,
            message: alertMessage,
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

        // Enviar email si el canal es 'email'
        if (alert.notification_channel === 'email') {
          try {
            // Obtener el perfil del usuario para obtener su email
            const { data: profile, error: profileError } = await supabase
              .from('profiles')
              .select('email, full_name')
              .eq('id', alert.user_id)
              .single()

            if (profileError || !profile?.email) {
              console.error('❌ [Email Error] No se pudo obtener el email del usuario:', profileError)
            } else {
              const priorityBadge = (currentValue > threshold * 1.5 || currentValue < threshold * 0.5) 
                ? '<span style="display: inline-block; padding: 4px 12px; background-color: #ef4444; color: white; border-radius: 4px; font-size: 12px; font-weight: 600; margin-bottom: 16px;">⚠️ ALTA PRIORIDAD</span>' 
                : ''

              const emailHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                  <meta charset="utf-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f3f4f6;">
                  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
                    <div style="background-color: white; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1); overflow: hidden;">
                      <!-- Header -->
                      <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px 24px; text-align: center;">
                        <h1 style="margin: 0; color: white; font-size: 24px; font-weight: 700;">
                          🔔 Alerta de KPI
                        </h1>
                      </div>
                      
                      <!-- Content -->
                      <div style="padding: 32px 24px;">
                        ${priorityBadge}
                        
                        <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          Hola <strong>${profile.full_name || 'Usuario'}</strong>,
                        </p>
                        
                        <p style="margin: 0 0 24px 0; color: #374151; font-size: 16px; line-height: 1.6;">
                          Se ha activado una alerta para el KPI <strong>"${latestKPI.name}"</strong>.
                        </p>
                        
                        <!-- KPI Details Box -->
                        <div style="background-color: #f9fafb; border-left: 4px solid #6366f1; border-radius: 8px; padding: 20px; margin-bottom: 24px;">
                          <div style="margin-bottom: 12px;">
                            <span style="color: #6b7280; font-size: 14px; font-weight: 600; text-transform: uppercase;">Valor Actual</span>
                            <div style="color: #111827; font-size: 28px; font-weight: 700; margin-top: 4px;">
                              ${currentValue}${latestKPI.unit || ''}
                            </div>
                          </div>
                          
                          <div style="border-top: 1px solid #e5e7eb; padding-top: 12px;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                              <span style="color: #6b7280; font-size: 14px;">Condición:</span>
                              <span style="color: #111827; font-size: 14px; font-weight: 600;">${conditionText}</span>
                            </div>
                            <div style="display: flex; justify-content: space-between;">
                              <span style="color: #6b7280; font-size: 14px;">Umbral configurado:</span>
                              <span style="color: #111827; font-size: 14px; font-weight: 600;">${threshold}${latestKPI.unit || ''}</span>
                            </div>
                          </div>
                        </div>
                        
                        <p style="margin: 0 0 24px 0; color: #6b7280; font-size: 14px; line-height: 1.6;">
                          Esta alerta se activó porque el valor actual del KPI es <strong>${conditionText}</strong> al umbral que configuraste.
                        </p>
                        
                        <!-- CTA Button -->
                        <div style="text-align: center; margin: 32px 0;">
                          <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || 'https://tu-app.com'}/kpis" 
                             style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 6px rgba(99, 102, 241, 0.3);">
                            Ver Dashboard de KPIs →
                          </a>
                        </div>
                      </div>
                      
                      <!-- Footer -->
                      <div style="background-color: #f9fafb; padding: 24px; text-align: center; border-top: 1px solid #e5e7eb;">
                        <p style="margin: 0 0 8px 0; color: #6b7280; font-size: 12px;">
                          Este email fue enviado por el sistema de alertas de Alasha AI
                        </p>
                        <p style="margin: 0; color: #9ca3af; font-size: 11px;">
                          Para modificar tus alertas, visita la sección de KPIs en tu dashboard
                        </p>
                      </div>
                    </div>
                  </div>
                </body>
                </html>
              `

              const { error: emailError } = await resend.emails.send({
                from: 'Alasha AI <alertas@alasha.app>',
                to: profile.email,
                subject: `${priorityBadge ? '⚠️ ' : ''}Alerta de KPI: ${latestKPI.name}`,
                html: emailHtml,
              })

              if (emailError) {
                console.error('❌ [Email Send Error]', emailError)
              } else {
                console.log(`📧 [Email Sent] to ${profile.email}`)
              }
            }
          } catch (emailError) {
            console.error('❌ [Email Process Error]', emailError)
          }
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
