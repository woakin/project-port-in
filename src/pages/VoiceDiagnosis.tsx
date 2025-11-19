import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConversation } from "@11labs/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2, CheckCircle2, ArrowLeft, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface DiagnosisResponses {
  strategy?: string;
  operations?: string;
  finance?: string;
  marketing?: string;
  legal?: string;
  technology?: string;
}

interface CompanyData {
  companyName: string;
  companyIndustry: string;
  companyStage: string;
  projectName: string;
  projectDescription: string;
  projectId: string | null;
}

export default function VoiceDiagnosis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<DiagnosisResponses>({});
  const [completedAreas, setCompletedAreas] = useState<string[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [currentArea, setCurrentArea] = useState<string | null>(null);
  const [userMessages, setUserMessages] = useState<Record<string, string[]>>({});
  
  // Load company data on mount
  useEffect(() => {
    const loadCompanyData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          navigate('/auth');
          return;
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id, companies(name, industry, size)')
          .eq('id', user.id)
          .single();

        if (!profile?.companies) {
          toast({
            title: "Configuración requerida",
            description: "Redirigiendo para completar la información...",
          });
          setTimeout(() => navigate('/chat-diagnosis'), 1500);
          return;
        }

        const { data: project } = await supabase
          .from('projects')
          .select('id, name, description')
          .eq('company_id', profile.company_id)
          .order('is_default', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        const data: CompanyData = {
          companyName: profile.companies.name,
          companyIndustry: profile.companies.industry || 'General',
          companyStage: profile.companies.size || 'startup',
          projectName: project?.name || 'Proyecto Principal',
          projectDescription: project?.description || '',
          projectId: project?.id || null,
        };

        setCompanyData(data);
        console.log('Company data loaded:', data);
      } catch (error) {
        console.error('Error loading company data:', error);
        toast({
          title: "Error",
          description: "No se pudo cargar la información de la empresa",
          variant: "destructive",
        });
      }
    };

    loadCompanyData();
  }, [toast]);

  const conversation = useConversation({
    onConnect: () => {
      console.log("✅ Connected to ElevenLabs");
      setIsLoading(false);
      toast({
        title: "Conectado",
        description: "La entrevista por voz está lista",
      });
    },
    onDisconnect: (event) => {
      console.log("❌ Disconnected from ElevenLabs");
      console.log("Disconnect event:", event);
      
      setIsLoading(false);
      
      // Solo mostrar toast si hay áreas completadas (desconexión normal)
      if (completedAreas.length > 0) {
        toast({
          title: "Desconectado",
          description: "La conversación ha finalizado",
        });
      } else {
        // Detectar si es error de variables mirando el reason como string
        const eventStr = JSON.stringify(event);
        const isVariablesError = eventStr.includes('Missing required dynamic variables');
        
        toast({
          title: "Desconexión inesperada",
          description: isVariablesError 
            ? "Error de variables. Variables enviadas: " + JSON.stringify(companyData)
            : "La conversación se desconectó. Intenta de nuevo.",
          variant: "destructive",
        });
        
        if (isVariablesError) {
          console.error('❌ Variables issue - sent from client:', companyData);
        }
      }
    },
    onError: (error: any) => {
      console.error("❌ Conversation error:", error);
      console.error("Error details:", JSON.stringify(error, null, 2));
      setIsLoading(false);
      toast({
        title: "Error de conexión",
        description: error instanceof Error ? error.message : `Hubo un problema: ${JSON.stringify(error)}`,
        variant: "destructive",
      });
    },
    onMessage: (message) => {
      console.log("📨 Message received:", message);
      
      // Autodetección de área cuando el agente habla
      if (message.source === "ai") {
        const text = (message.message || "").toLowerCase();
        if (text.includes("estrategia")) {
          console.log("🎯 Área autodetectada: strategy");
          setCurrentArea("strategy");
        } else if (text.includes("operac")) {
          console.log("🎯 Área autodetectada: operations");
          setCurrentArea("operations");
        } else if (text.includes("finanz")) {
          console.log("🎯 Área autodetectada: finance");
          setCurrentArea("finance");
        } else if (text.includes("marketing")) {
          console.log("🎯 Área autodetectada: marketing");
          setCurrentArea("marketing");
        } else if (text.includes("legal")) {
          console.log("🎯 Área autodetectada: legal");
          setCurrentArea("legal");
        } else if (text.includes("tecnolog")) {
          console.log("🎯 Área autodetectada: technology");
          setCurrentArea("technology");
        }
      }
      
      // Si es mensaje del usuario y hay un área activa, guardarlo
      if (message.source === "user" && currentArea) {
        console.log(`📝 Capturing user message for area: ${currentArea}`);
        setUserMessages(prev => ({
          ...prev,
          [currentArea]: [...(prev[currentArea] || []), message.message]
        }));
      }
    },
    clientTools: {
      // Tool para establecer el área actual que se está discutiendo
      setCurrentArea: async (parameters: any) => {
        try {
          const { area } = parameters || {};
          console.log(`🎯 Setting current area to: ${area}`);
          
          if (!area) {
            console.error('❌ Area parameter is missing');
            return 'Error: area parameter is required';
          }
          
          setCurrentArea(area);
          return `Área ${area} establecida como actual`;
        } catch (error) {
          console.error(`❌ Error setting area:`, error);
          return `Error al establecer área`;
        }
      },
      
      // Tool para guardar respuesta de cada área (usa mensajes capturados)
      saveAreaResponse: async (parameters: any) => {
        try {
          console.log(`🔍 saveAreaResponse called with parameters:`, parameters);
          
          const { area } = parameters || {};
          
          if (!area) {
            console.error('❌ Area parameter is missing');
            toast({
              title: "Error",
              description: "Parámetro 'area' no recibido",
              variant: "destructive",
            });
            return 'Error: area parameter is required';
          }
          
          // Obtener todos los mensajes del usuario para esta área
          const areaMessages = userMessages[area] || [];
          
          if (areaMessages.length === 0) {
            console.error(`❌ No user messages captured for area: ${area}`);
            toast({
              title: "Sin respuestas",
              description: `No se capturaron respuestas para ${area}`,
              variant: "destructive",
            });
            return `Error: No se capturaron respuestas para ${area}`;
          }
          
          // Combinar todos los mensajes en una respuesta consolidada
          const consolidatedResponse = areaMessages.join('\n\n');
          
          console.log(`💾 Saving ${area} with ${areaMessages.length} message(s)`);
          const preview = consolidatedResponse.length > 100 
            ? consolidatedResponse.substring(0, 100) + '...' 
            : consolidatedResponse;
          console.log(`📝 Consolidated response preview:`, preview);
          
          setResponses(prev => ({
            ...prev,
            [area]: consolidatedResponse
          }));
          
          setCompletedAreas(prev => {
            if (!prev.includes(area)) {
              const updated = [...prev, area];
              console.log(`✅ Area ${area} completada. Total: ${updated.length}/6`);
              toast({
                title: "Área guardada",
                description: `${area} guardada con ${areaMessages.length} respuesta(s)`,
              });
              return updated;
            }
            return prev;
          });
          
          // Limpiar el área actual para la siguiente
          setCurrentArea(null);
          
          return `Respuesta de ${area} guardada exitosamente con ${areaMessages.length} mensaje(s)`;
        } catch (error) {
          const areaName = parameters?.area || 'unknown';
          console.error(`❌ Error saving ${areaName} response:`, error);
          toast({
            title: "Error",
            description: `Error al guardar respuesta de ${areaName}`,
            variant: "destructive",
          });
          return `Error al guardar respuesta`;
        }
      },
      
      // Tool para finalizar diagnóstico
      finalizeDiagnosis: async () => {
        try {
          console.log("🏁 Finalizing diagnosis with responses:", Object.keys(responses));
          
          // Cerrar la sesión de voz primero
          try {
            await conversation.endSession();
            console.log('🔌 Voice session ended');
          } catch (e) {
            console.log('Voice session already ended or error:', e);
          }
          
          const requiredAreas = ['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'];
          const missingAreas = requiredAreas.filter(area => !responses[area]);
          
          if (missingAreas.length > 0) {
            console.error('❌ Missing responses for areas:', missingAreas);
            toast({
              title: "Información incompleta",
              description: `Faltan respuestas para: ${missingAreas.join(', ')}. Presiona "Generar diagnóstico" cuando estés listo.`,
              variant: "destructive",
            });
            return `Error: Faltan respuestas para las siguientes áreas: ${missingAreas.join(', ')}`;
          }
          
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) {
            console.error("❌ No user found");
            throw new Error("No user found");
          }

          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

          if (!profile?.company_id) {
            console.error("❌ No company found for user");
            throw new Error("No company found");
          }

          // Determinar projectId: usar el cargado o crear uno nuevo
          let validProjectId = companyData?.projectId;
          
          if (!validProjectId) {
            console.log('📦 No project found, creating default project...');
            const { data: newProj, error: newProjErr } = await supabase
              .from('projects')
              .insert({
                company_id: profile.company_id,
                name: 'Proyecto Principal',
                description: 'Proyecto creado automáticamente durante diagnóstico',
                is_default: true
              })
              .select('id')
              .single();

            if (newProjErr || !newProj) {
              console.error('❌ Error creating project:', newProjErr);
              toast({
                title: "Error",
                description: "No se pudo crear el proyecto",
                variant: "destructive",
              });
              return 'Error: No se pudo crear el proyecto';
            }
            
            validProjectId = newProj.id;
            console.log('✅ Project created:', validProjectId);
          }

          console.log("📤 Invoking diagnose-company function...");
          
          // Llamar a la función de diagnóstico con camelCase
          const { data, error } = await supabase.functions.invoke('diagnose-company', {
            body: {
              formResponses: responses,
              maturityLevel: companyData?.companyStage || 'startup',
              companyId: profile.company_id,
              userId: user.id,
              projectId: validProjectId,
            }
          });

          if (error) {
            console.error("❌ Error from diagnose-company:", error);
            throw error;
          }

          console.log("✅ Diagnosis created:", data.diagnosis_id);

          toast({
            title: "¡Diagnóstico completado!",
            description: "Redirigiendo a los resultados...",
          });

          // Navegar a resultados inmediatamente
          setTimeout(() => {
            navigate(`/diagnosis-results/${data.diagnosis_id}`);
          }, 1500);

          return "Diagnóstico completado y guardado. Redirigiendo a resultados...";
        } catch (error) {
          console.error("❌ Error finalizing diagnosis:", error);
          toast({
            title: "Error al finalizar",
            description: error instanceof Error ? error.message : "No se pudo completar el diagnóstico",
            variant: "destructive",
          });
          return `Error al guardar el diagnóstico: ${error instanceof Error ? error.message : 'Unknown error'}`;
        }
      }
    },
  });

  const startConversation = async () => {
    if (!companyData) {
      toast({
        title: "Error",
        description: "Cargando información de la empresa...",
        variant: "destructive",
      });
      return;
    }

    // Validación preflight: verificar que todas las variables estén presentes
    const requiredFields = {
      COMPANY_NAME: companyData.companyName,
      COMPANY_INDUSTRY: companyData.companyIndustry,
      COMPANY_STAGE: companyData.companyStage,
      PROJECT_NAME: companyData.projectName,
      PROJECT_DESCRIPTION: companyData.projectDescription,
    };

    const emptyFields = Object.entries(requiredFields)
      .filter(([_, value]) => !value || value.trim() === '')
      .map(([key, _]) => key);

    if (emptyFields.length > 0) {
      toast({
        title: "Faltan datos requeridos",
        description: `Por favor completa: ${emptyFields.join(', ')}`,
        variant: "destructive",
      });
      console.error('Missing fields:', emptyFields);
      return;
    }

    setIsLoading(true);
    try {
      // Primero solicitar permisos de micrófono
      await navigator.mediaDevices.getUserMedia({ audio: true });

      console.log('🚀 Starting conversation with variables:', requiredFields);

      // Obtener signed URL del edge function con variables
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: {
          variables: requiredFields
        }
      });
      
      if (error) throw error;
      
      if (!data?.signed_url) {
        throw new Error("No se obtuvo la URL firmada del servidor");
      }

      console.log('🔗 Signed URL obtained:', data.signed_url?.substring(0, 50) + '...');
      console.log('📋 Dynamic variables to send:', requiredFields);

      // Iniciar conversación con ElevenLabs pasando las variables dinámicas
      await conversation.startSession({ 
        signedUrl: data.signed_url,
        dynamicVariables: {
          COMPANY_NAME: requiredFields.COMPANY_NAME,
          COMPANY_INDUSTRY: requiredFields.COMPANY_INDUSTRY,
          COMPANY_STAGE: requiredFields.COMPANY_STAGE,
          PROJECT_NAME: requiredFields.PROJECT_NAME,
          PROJECT_DESCRIPTION: requiredFields.PROJECT_DESCRIPTION,
        }
      });
      
      console.log('✅ Session started successfully');

    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo iniciar la conversación",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const endConversation = async () => {
    try {
      await conversation.endSession();
      toast({
        title: "Entrevista finalizada",
        description: "La conversación ha terminado",
      });
    } catch (error) {
      console.error('Error ending conversation:', error);
      toast({
        title: "Error",
        description: "Error al finalizar la conversación",
        variant: "destructive",
      });
    }
  };

  const handleManualDiagnosis = async () => {
    const requiredAreas = ['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'];
    const missingAreas = requiredAreas.filter(area => !responses[area]);
    
    if (missingAreas.length > 0) {
      toast({
        title: "Información incompleta",
        description: `Faltan respuestas para: ${missingAreas.join(', ')}`,
        variant: "destructive",
      });
      return;
    }

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast({
          title: "Error de autenticación",
          description: "Debes iniciar sesión",
          variant: "destructive",
        });
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) {
        toast({
          title: "Error",
          description: "No se pudo obtener la información de la empresa",
          variant: "destructive",
        });
        return;
      }

      let validProjectId = companyData?.projectId;
      
      if (!validProjectId) {
        const { data: newProj, error: newProjErr } = await supabase
          .from('projects')
          .insert({
            company_id: profile.company_id,
            name: 'Proyecto Principal',
            description: 'Proyecto creado automáticamente durante diagnóstico',
            is_default: true
          })
          .select('id')
          .single();

        if (newProjErr || !newProj) {
          toast({
            title: "Error",
            description: "No se pudo crear el proyecto",
            variant: "destructive",
          });
          return;
        }
        
        validProjectId = newProj.id;
      }

      const { data, error } = await supabase.functions.invoke('diagnose-company', {
        body: {
          formResponses: responses,
          maturityLevel: companyData?.companyStage || 'startup',
          companyId: profile.company_id,
          userId: user.id,
          projectId: validProjectId,
        }
      });

      if (error) {
        toast({
          title: "Error al generar diagnóstico",
          description: error.message || "Error desconocido",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "¡Diagnóstico completado!",
        description: "Tu diagnóstico ha sido generado exitosamente",
      });

      navigate(`/diagnosis-results/${data.diagnosis_id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Error al finalizar el diagnóstico",
        variant: "destructive",
      });
    }
  };

  const areas = [
    { key: 'strategy', label: 'Estrategia', icon: '🎯' },
    { key: 'operations', label: 'Operaciones', icon: '⚙️' },
    { key: 'finance', label: 'Finanzas', icon: '💰' },
    { key: 'marketing', label: 'Marketing', icon: '📢' },
    { key: 'legal', label: 'Legal', icon: '⚖️' },
    { key: 'technology', label: 'Tecnología', icon: '💻' },
  ];

  return (
    <MainLayout>
      <div className="h-full overflow-y-auto">
        <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Entrevista de Diagnóstico por Voz</h1>
          <p className="text-muted-foreground text-lg">
            Habla con nuestro asistente de IA para realizar tu diagnóstico empresarial
          </p>
        </div>

        {/* Progress Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          {areas.map((area) => (
            <Card 
              key={area.key}
              className={`p-4 text-center transition-all ${
                completedAreas.includes(area.key) 
                  ? 'bg-primary/10 border-primary' 
                  : 'bg-background'
              }`}
            >
              <div className="text-3xl mb-2">{area.icon}</div>
              <div className="font-medium text-sm">{area.label}</div>
              {completedAreas.includes(area.key) && (
                <CheckCircle2 className="w-5 h-5 text-primary mx-auto mt-2" />
              )}
            </Card>
          ))}
        </div>

        {/* Status Card */}
        <Card className="p-6 mb-8 text-center">
          <div className="flex flex-col items-center gap-4">
            {conversation.status === "connected" ? (
              <>
                <div className="relative">
                  <div className={`w-24 h-24 rounded-full bg-primary/20 flex items-center justify-center ${
                    conversation.isSpeaking ? 'animate-pulse' : ''
                  }`}>
                    <Mic className="w-12 h-12 text-primary" />
                  </div>
                  {conversation.isSpeaking && (
                    <div className="absolute -inset-2 border-4 border-primary/30 rounded-full animate-ping" />
                  )}
                </div>
                <div>
                  <p className="text-lg font-medium">
                    {conversation.isSpeaking ? "El asistente está hablando..." : "Escuchando..."}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {completedAreas.length} de {areas.length} áreas completadas
                  </p>
                </div>
              </>
            ) : (
              <>
                <MicOff className="w-16 h-16 text-muted-foreground" />
                <div>
                  <p className="text-lg font-medium">No conectado</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Presiona el botón para iniciar la entrevista
                  </p>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Control Buttons */}
        <div className="flex flex-wrap gap-4 justify-center">
          {conversation.status === "disconnected" ? (
            <>
              <Button
                size="lg"
                onClick={startConversation}
                disabled={isLoading}
                className="min-w-[200px]"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Conectando...
                  </>
                ) : (
                  <>
                    <Mic className="w-5 h-5 mr-2" />
                    Iniciar Entrevista
                  </>
                )}
              </Button>
              
              {Object.keys(responses).length > 0 && (
                <Button
                  size="lg"
                  onClick={handleManualDiagnosis}
                  variant="default"
                  className="min-w-[200px]"
                >
                  <CheckCircle2 className="w-5 h-5 mr-2" />
                  Generar Diagnóstico
                </Button>
              )}
            </>
          ) : (
            <Button
              size="lg"
              variant="destructive"
              onClick={endConversation}
              className="min-w-[200px]"
            >
              <MicOff className="w-5 h-5 mr-2" />
              Finalizar Entrevista
            </Button>
          )}

          <Button
            size="lg"
            variant="outline"
            onClick={() => navigate('/diagnosticos')}
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            Volver
          </Button>
        </div>

        {/* Instructions */}
        <Card className="mt-8 p-6 bg-muted/50">
          <h3 className="font-semibold mb-3">Instrucciones:</h3>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li>• El asistente te guiará a través de 6 áreas empresariales</li>
            <li>• Responde con naturalidad, como en una conversación normal</li>
            <li>• Puedes pedir aclaraciones o ejemplos en cualquier momento</li>
            <li>• Al finalizar, se generará automáticamente tu diagnóstico</li>
          </ul>
        </Card>
      </div>
      </div>
    </MainLayout>
  );
}
