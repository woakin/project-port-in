import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useConversation } from "@11labs/react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, MicOff, Loader2, CheckCircle2 } from "lucide-react";
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
}

export default function VoiceDiagnosis() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [responses, setResponses] = useState<DiagnosisResponses>({});
  const [completedAreas, setCompletedAreas] = useState<string[]>([]);
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  
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
          .select('name, description')
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
      console.log("Connected to ElevenLabs");
      toast({
        title: "Conectado",
        description: "La entrevista por voz está lista",
      });
    },
    onDisconnect: () => {
      console.log("Disconnected from ElevenLabs");
    },
    onError: (error) => {
      console.error("Conversation error:", error);
      toast({
        title: "Error",
        description: "Hubo un problema con la conexión de voz",
        variant: "destructive",
      });
    },
    clientTools: {
      // Tool para guardar respuesta de cada área
      saveAreaResponse: async ({ area, response }: { area: string; response: string }) => {
        console.log(`Saving ${area} response:`, response);
        
        setResponses(prev => ({
          ...prev,
          [area]: response
        }));
        
        setCompletedAreas(prev => {
          if (!prev.includes(area)) {
            return [...prev, area];
          }
          return prev;
        });
        
        return `Respuesta de ${area} guardada exitosamente`;
      },
      
      // Tool para finalizar diagnóstico
      finalizeDiagnosis: async () => {
        console.log("Finalizing diagnosis with responses:", responses);
        
        try {
          const { data: { user } } = await supabase.auth.getUser();
          if (!user) throw new Error("No user found");

          const { data: profile } = await supabase
            .from('profiles')
            .select('company_id')
            .eq('id', user.id)
            .single();

          if (!profile?.company_id) throw new Error("No company found");

          // Llamar a la función de diagnóstico
          const { data, error } = await supabase.functions.invoke('diagnose-company', {
            body: {
              form_responses: responses,
              maturity_level: 'startup',
              company_id: profile.company_id,
              user_id: user.id,
              project_id: null,
            }
          });

          if (error) throw error;

          toast({
            title: "Diagnóstico completado",
            description: "Procesando resultados...",
          });

          // Navegar a resultados después de 2 segundos
          setTimeout(() => {
            navigate(`/diagnosis-results/${data.diagnosis_id}`);
          }, 2000);

          return "Diagnóstico completado y guardado. Redirigiendo a resultados...";
        } catch (error) {
          console.error("Error finalizing diagnosis:", error);
          toast({
            title: "Error",
            description: "No se pudo completar el diagnóstico",
            variant: "destructive",
          });
          return "Error al guardar el diagnóstico";
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

    setIsLoading(true);
    try {
      // Primero solicitar permisos de micrófono
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Obtener signed URL del edge function con variables
      const { data, error } = await supabase.functions.invoke('elevenlabs-agent', {
        body: {
          variables: {
            COMPANY_NAME: companyData.companyName,
            COMPANY_INDUSTRY: companyData.companyIndustry,
            COMPANY_STAGE: companyData.companyStage,
            PROJECT_NAME: companyData.projectName,
            PROJECT_DESCRIPTION: companyData.projectDescription,
          }
        }
      });
      
      if (error) throw error;

      console.log('Starting conversation with variables:', companyData);

      // Iniciar conversación con ElevenLabs
      await conversation.startSession({ 
        signedUrl: data.signed_url 
      });

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
    await conversation.endSession();
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
        <div className="flex gap-4 justify-center">
          {conversation.status === "disconnected" ? (
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
    </MainLayout>
  );
}
