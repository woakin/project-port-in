import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/shared/Card';
import { toast } from '@/hooks/use-toast';
import { Send, Loader2, CheckCircle, Home, Info } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import ModeSelector from '@/components/chat/ModeSelector';
import QuickActions, { SheetType } from '@/components/chat/QuickActions';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import KPIsSheet from '@/components/chat/sheets/KPIsSheet';
import TasksSheet from '@/components/chat/sheets/TasksSheet';
import DocumentsSheet from '@/components/chat/sheets/DocumentsSheet';
import DiagnosesSheet from '@/components/chat/sheets/DiagnosesSheet';

type ChatMode = 'diagnosis' | 'strategic' | 'follow_up' | 'document';

type Message = {
  role: 'user' | 'assistant';
  content: string;
};

type CompanyInfo = {
  name: string;
  industry: string;
  stage: 'idea' | 'startup' | 'pyme' | 'corporate';
  projectName: string;
  projectDescription?: string;
};

export default function ChatDiagnosis() {
  const { user, loading: authLoading } = useAuth();
  const { currentProject, loading: projectLoading } = useProjectContext();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [step, setStep] = useState<'company-info' | 'chat'>('company-info');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [generatingDiagnosis, setGeneratingDiagnosis] = useState(false);

  // Formulario inicial
  const [tempName, setTempName] = useState('');
  const [tempIndustry, setTempIndustry] = useState('');
  const [tempStage, setTempStage] = useState<'idea' | 'startup' | 'pyme' | 'corporate'>('startup');
  const [tempProjectName, setTempProjectName] = useState('');
  const [tempProjectDescription, setTempProjectDescription] = useState('');
  const [diagnosisVersion, setDiagnosisVersion] = useState<number>(0);
  const [hasPreviousDiagnosis, setHasPreviousDiagnosis] = useState(false);
  const [chatMode, setChatMode] = useState<ChatMode>('diagnosis');
  const [showModeInfo, setShowModeInfo] = useState(false);
  const [openSheet, setOpenSheet] = useState<SheetType>(null);
  
  // Estados para seguimiento de progreso por área (FASE 1)
  const [currentSection, setCurrentSection] = useState<'strategy'|'operations'|'finance'|'marketing'|'legal'|'technology'>('strategy');
  const [sectionAnswers, setSectionAnswers] = useState<Record<string, string>>({
    strategy: '',
    operations: '',
    finance: '',
    marketing: '',
    legal: '',
    technology: ''
  });
  
  // FASE 3: Estado para diálogo de resumen
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    if (authLoading || projectLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }

    // Si hay proyecto activo, ir directo al chat y cargar diagnóstico previo
    if (currentProject && step === 'company-info') {
      const info: CompanyInfo = {
        name: currentProject.name,
        industry: 'General',
        stage: 'startup',
        projectName: currentProject.name,
        projectDescription: currentProject.description || undefined
      };
      
      setCompanyInfo(info);
      
      // Buscar diagnóstico previo
      const fetchPreviousDiagnosis = async () => {
        const { data } = await supabase
          .from('diagnoses')
          .select('version')
          .eq('project_id', currentProject.id)
          .order('version', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (data) {
          setDiagnosisVersion(data.version);
          setHasPreviousDiagnosis(true);
        }
      };

      fetchPreviousDiagnosis();
      setStep('chat');
      
      // Mensaje inicial basado en modo
      const initialMessage = getInitialMessage(currentProject.name, 'diagnosis');
      setMessages([{
        role: 'assistant',
        content: initialMessage
      }]);
    }
  }, [user, authLoading, currentProject, projectLoading, step, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const getInitialMessage = (projectName: string, mode: ChatMode) => {
    const messages = {
      diagnosis: `¡Hola! Soy Alasha AI en modo **Diagnóstico** para **${projectName}**. 

Voy a ayudarte a crear un diagnóstico completo y un plan de acción estratégico. Te haré preguntas sobre 6 áreas clave de tu negocio: Estrategia, Operaciones, Finanzas, Marketing, Legal y Tecnología.

💡 **Tip**: También puedo ejecutar comandos como:
- "Crear tarea: [descripción]"
- "Actualizar KPI [nombre] a [valor]"

¿Comenzamos?`,
      
      strategic: `¡Hola! Soy Alasha AI en modo **Mentor Estratégico** para **${projectName}**. 

Me especializo en visión de largo plazo, decisiones estratégicas y posicionamiento de mercado. Puedo ayudarte con análisis de competencia, modelos de negocio, expansión y frameworks estratégicos (SWOT, Porter, Blue Ocean, etc.).

💡 **Quick Actions disponibles**:
- "Crear tarea estratégica: [descripción]"
- "Crear objetivo: [título]"

¿Qué desafío estratégico quieres abordar?`,
      
      follow_up: `¡Hola! Soy Alasha AI en modo **Coach Operativo** para **${projectName}**. 

Voy a ayudarte a ejecutar tu plan, desbloquear tareas, optimizar prioridades y alcanzar tus objetivos. Me enfoco en la acción táctica y resultados medibles.

💡 **Quick Actions disponibles**:
- "Crear tarea: [descripción]"
- "Actualizar progreso de [área]"

¿Qué aspectos del plan quieres revisar?`,
      
      document: `¡Hola! Soy Alasha AI en modo **Analista de Datos** para **${projectName}**. 

Puedo ayudarte a analizar documentos, extraer insights de métricas, identificar tendencias y conectar datos con tu estrategia. Especializado en análisis financiero, operativo, de marketing y tecnológico.

💡 **Quick Actions disponibles**:
- "Actualizar KPI [nombre] a [valor] [unidad]"
- "Crear tarea: Revisar [aspecto]"

¿Qué datos quieres que analice?`
    };
    return messages[mode];
  };

  const handleModeChange = (newMode: ChatMode) => {
    if (sending || generatingDiagnosis) return;
    
    setChatMode(newMode);
    
    // Reemplazar el primer mensaje (bienvenida del modo anterior) con el nuevo mensaje de bienvenida
    const newWelcomeMessage = {
      role: 'assistant' as const,
      content: getInitialMessage(companyInfo?.projectName || 'tu proyecto', newMode)
    };
    
    setMessages(prev => {
      // Si hay mensajes, reemplazar el primero (que es siempre la bienvenida)
      // y mantener el resto de la conversación
      if (prev.length > 0) {
        return [newWelcomeMessage, ...prev.slice(1)];
      }
      return [newWelcomeMessage];
    });
  };

  const getModeLabel = (mode: ChatMode) => {
    const labels = {
      diagnosis: 'Diagnóstico',
      strategic: 'Mentor Estratégico',
      follow_up: 'Coach Operativo',
      document: 'Analista de Datos'
    };
    return labels[mode];
  };

  // Funciones auxiliares para el seguimiento de progreso (FASE 1)
  const getSectionNumber = (section: typeof currentSection): number => {
    const order = ['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'];
    return order.indexOf(section) + 1;
  };

  const getSectionName = (section: typeof currentSection): string => {
    const names = {
      strategy: 'Estrategia',
      operations: 'Operaciones',
      finance: 'Finanzas',
      marketing: 'Marketing',
      legal: 'Legal',
      technology: 'Tecnología'
    };
    return names[section];
  };

  // FASE 3: Función para cambiar de área manualmente
  const moveToNextSection = () => {
    const order: Array<typeof currentSection> = ['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'];
    const currentIndex = order.indexOf(currentSection);
    if (currentIndex < order.length - 1) {
      const nextSection = order[currentIndex + 1];
      setCurrentSection(nextSection);
      toast({
        title: 'Área cambiada',
        description: `Ahora estamos en: ${getSectionName(nextSection)}`
      });
    }
  };

  // FASE 2: Auto-resize del textarea según contenido
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
    
    // Reset height para calcular el scrollHeight correcto
    e.target.style.height = 'auto';
    
    // Ajustar altura basada en contenido, con límites
    const newHeight = Math.min(e.target.scrollHeight, 200); // max 200px
    e.target.style.height = `${newHeight}px`;
  };

  // FASE 3.1: Placeholder contextual según modo
  const getPlaceholder = () => {
    switch (chatMode) {
      case 'diagnosis':
        return 'Describe tu situación actual... (Enter para enviar, Shift+Enter para nueva línea)';
      case 'strategic':
        return 'Pregunta sobre estrategia... (Enter para enviar, Shift+Enter para nueva línea)';
      case 'follow_up':
        return 'Gestiona tus tareas o actualiza progreso... (Enter para enviar, Shift+Enter para nueva línea)';
      case 'document':
        return 'Pregunta sobre tus documentos... (Enter para enviar, Shift+Enter para nueva línea)';
      default:
        return 'Escribe tu mensaje... (Enter para enviar, Shift+Enter para nueva línea)';
    }
  };

  // FASE 3.4: Detectar dispositivo móvil
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  const startChat = () => {
    if (!tempName || !tempIndustry || !tempProjectName) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive'
      });
      return;
    }

    const info: CompanyInfo = {
      name: tempName,
      industry: tempIndustry,
      stage: tempStage,
      projectName: tempProjectName,
      projectDescription: tempProjectDescription
    };
    
    setCompanyInfo(info);
    setStep('chat');

    // Mensaje inicial del asistente
    setMessages([{
      role: 'assistant',
      content: `¡Perfecto! Vamos a trabajar en **${info.projectName}** para **${info.name}** en el sector de **${info.industry}**. \n\nPara crear un diagnóstico completo y un plan de acción personalizado, necesito conocer más sobre tu negocio. Voy a hacerte algunas preguntas sobre diferentes áreas clave.\n\nComencemos con la **estrategia**: ¿Cuál es la visión principal de tu empresa y qué objetivos buscan alcanzar?`
    }]);
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !companyInfo) return;

    // FASE 1: Validación de respuestas cortas en modo diagnóstico
    if (chatMode === 'diagnosis' && input.trim().length < 20) {
      toast({
        title: 'Necesito más detalle',
        description: 'Por favor proporciona una respuesta más completa para esta área (al menos 20 caracteres)',
        variant: 'destructive'
      });
      return;
    }

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // FASE 1: Guardar respuesta por área en modo diagnóstico
    if (chatMode === 'diagnosis') {
      setSectionAnswers(prev => ({
        ...prev,
        [currentSection]: prev[currentSection]
          ? prev[currentSection] + '\n' + input.trim()
          : input.trim()
      }));
    }
    
    setInput('');
    
    // FASE 2: Resetear altura del textarea después de enviar
    if (inputRef.current) {
      inputRef.current.style.height = '60px';
    }
    
    setSending(true);
    
    // Mantener foco en el input
    setTimeout(() => inputRef.current?.focus(), 100);

    try {
      // Obtener token de la sesión actual
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diagnosis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: newMessages,
            companyInfo,
            isComplete: false,
            mode: chatMode
          }),
        }
      );

      if (!response.ok || !response.body) {
        throw new Error('Error al conectar con el asistente');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      // Agregar mensaje del asistente vacío que iremos llenando
      setMessages([...newMessages, { role: 'assistant', content: '' }]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') continue;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              assistantMessage += content;
              setMessages([...newMessages, { role: 'assistant', content: assistantMessage }]);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }

    } catch (error) {
      console.error('Error:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al enviar mensaje',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const generateDiagnosis = async () => {
    if (!companyInfo || !currentProject) return;
    
    // FASE 1: Validar que todas las áreas tengan respuestas
    const emptyAreas = Object.entries(sectionAnswers)
      .filter(([_, answer]) => !answer || answer.trim().length < 20)
      .map(([area, _]) => getSectionName(area as typeof currentSection));
    
    if (emptyAreas.length > 0) {
      toast({
        title: 'Áreas incompletas',
        description: `Por favor completa las siguientes áreas: ${emptyAreas.join(', ')}`,
        variant: 'destructive'
      });
      return;
    }
    
    setGeneratingDiagnosis(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // FASE 1: Llamar a diagnose-company en lugar de chat-diagnosis
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose-company`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            formResponses: sectionAnswers,
            maturityLevel: companyInfo.stage,
            companyId: currentProject.company_id,
            userId: user.id,
            projectId: currentProject.id
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al generar diagnóstico');
      }

      const data = await response.json();
      
      console.log('Diagnóstico generado:', data);

      if (!data.diagnosis_id) {
        throw new Error('No se recibió el ID del diagnóstico');
      }

      toast({
        title: 'Diagnóstico generado',
        description: 'Redirigiendo a los resultados...'
      });

      setTimeout(() => {
        navigate(`/diagnosis/${data.diagnosis_id}`);
      }, 500);

    } catch (error) {
      console.error('Error generating diagnosis:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el diagnóstico. Por favor intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setGeneratingDiagnosis(false);
    }
  };

  // Mostrar loading mientras carga el proyecto
  if (authLoading || projectLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (step === 'company-info') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card variant="content" className="w-full max-w-md">
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-3xl font-bold text-foreground mb-2">Diagnóstico Conversacional</h1>
                <p className="text-muted-foreground">Primero, cuéntanos sobre tu empresa</p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="shrink-0"
              >
                <Home className="h-5 w-5" />
              </Button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre de la empresa *
                </label>
                <Input
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  placeholder="Mi Empresa S.A."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Industria o sector *
                </label>
                <Input
                  value={tempIndustry}
                  onChange={(e) => setTempIndustry(e.target.value)}
                  placeholder="Ej: Tecnología, Alimentos..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Nombre del proyecto *
                </label>
                <Input
                  value={tempProjectName}
                  onChange={(e) => setTempProjectName(e.target.value)}
                  placeholder="Ej: Transformación Digital 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Descripción del proyecto (opcional)
                </label>
                <Input
                  value={tempProjectDescription}
                  onChange={(e) => setTempProjectDescription(e.target.value)}
                  placeholder="Describe brevemente el objetivo..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-foreground mb-2">
                  Etapa de tu negocio
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'idea', label: 'Solo una idea' },
                    { value: 'startup', label: 'Startup' },
                    { value: 'pyme', label: 'PyME' },
                    { value: 'corporate', label: 'Corporativo' }
                  ].map(option => (
                    <button
                      key={option.value}
                      onClick={() => setTempStage(option.value as typeof tempStage)}
                      className={`p-3 rounded-md border-2 transition-colors ${
                        tempStage === option.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/50'
                      }`}
                    >
                      <span className="font-medium text-sm text-foreground">{option.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <Button onClick={startChat} className="w-full" size="lg">
                Comenzar Conversación
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="border-b border-border p-4 bg-card">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate('/')}
              className="shrink-0"
            >
              <Home className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">
                {companyInfo?.projectName}
              </h1>
              <p className="text-sm text-muted-foreground">
                {companyInfo?.name} · {companyInfo?.industry}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Modo: {getModeLabel(chatMode)}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowModeInfo(!showModeInfo)}
            >
              <Info className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      {showModeInfo && (
        <div className="bg-muted/50 p-4 border-b border-border">
          <div className="max-w-4xl mx-auto">
            <p className="text-sm text-muted-foreground">
              <strong>Modo {getModeLabel(chatMode)}:</strong>{' '}
              {chatMode === 'diagnosis' && 'Generación de diagnóstico completo y plan de acción personalizado.'}
              {chatMode === 'strategic' && 'Consultas estratégicas puntuales sin generar diagnóstico formal.'}
              {chatMode === 'follow_up' && 'Seguimiento del plan activo, revisión de progreso y ajustes.'}
              {chatMode === 'document' && 'Análisis contextualizado de documentos subidos.'}
            </p>
          </div>
        </div>
      )}

      <ModeSelector 
        currentMode={chatMode} 
        onModeChange={handleModeChange}
        disabled={sending || generatingDiagnosis}
      />

      <QuickActions 
        projectId={currentProject?.id}
        onActionClick={handleQuickAction}
        onOpenSheet={setOpenSheet}
      />

      {/* Side Sheets */}
      <Sheet open={openSheet === 'kpis'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>KPIs Actuales</SheetTitle>
            <SheetDescription>
              Indicadores de rendimiento del proyecto
            </SheetDescription>
          </SheetHeader>
          <KPIsSheet isOpen={openSheet === 'kpis'} />
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'tasks'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Tareas</SheetTitle>
            <SheetDescription>
              Gestiona y visualiza tus tareas
            </SheetDescription>
          </SheetHeader>
          <TasksSheet />
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'documents'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Documentos</SheetTitle>
            <SheetDescription>
              Documentos subidos y analizados
            </SheetDescription>
          </SheetHeader>
          <DocumentsSheet />
        </SheetContent>
      </Sheet>

      <Sheet open={openSheet === 'diagnoses'} onOpenChange={(open) => !open && setOpenSheet(null)}>
        <SheetContent side="right" className="w-[400px] sm:w-[540px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Historial de Diagnósticos</SheetTitle>
            <SheetDescription>
              Diagnósticos generados anteriormente
            </SheetDescription>
          </SheetHeader>
          <DiagnosesSheet />
        </SheetContent>
      </Sheet>

      {/* FASE 3: Diálogo de resumen antes de generar diagnóstico */}
      <Dialog open={showSummary} onOpenChange={setShowSummary}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resumen de Diagnóstico</DialogTitle>
            <DialogDescription>
              Revisa la información recopilada antes de generar el diagnóstico final
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4">
            {Object.entries(sectionAnswers).map(([section, answer]) => (
              <div key={section} className="border rounded-lg p-4 bg-muted/30">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold text-base">
                    {getSectionName(section as typeof currentSection)}
                  </h4>
                  {answer.length > 0 ? (
                    <CheckCircle className="h-4 w-4 text-green-500" />
                  ) : (
                    <div className="text-xs text-muted-foreground">Sin respuestas</div>
                  )}
                </div>
                {answer.length > 0 ? (
                  <>
                    <p className="text-sm text-foreground whitespace-pre-wrap mb-2">
                      {answer.length > 300 ? `${answer.substring(0, 300)}...` : answer}
                    </p>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{answer.length} caracteres</span>
                      {answer.length < 20 && (
                        <span className="text-amber-500">⚠️ Muy corta</span>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No se recopiló información para esta área
                  </p>
                )}
              </div>
            ))}
          </div>
          
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSummary(false)}>
              Continuar conversación
            </Button>
            <Button 
              onClick={() => {
                setShowSummary(false);
                generateDiagnosis();
              }}
              disabled={generatingDiagnosis}
              className="gap-2"
            >
              {generatingDiagnosis ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Generando...
                </>
              ) : (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Generar Diagnóstico
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* FASE 1 & 3: Indicador de progreso en modo diagnóstico */}
      {chatMode === 'diagnosis' && (
        <div className="border-b border-border bg-muted/50 px-6 py-3">
          <div className="flex items-center justify-between text-sm gap-4">
            <span className="font-medium">
              Área actual: {getSectionName(currentSection)} ({getSectionNumber(currentSection)}/6)
            </span>
            <div className="flex items-center gap-2">
              <div className="flex gap-1">
                {(['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'] as const).map((section) => (
                  <div
                    key={section}
                    className={`h-2 w-8 rounded-full transition-colors ${
                      sectionAnswers[section]?.length > 0
                        ? 'bg-green-500'
                        : section === currentSection
                        ? 'bg-blue-500'
                        : 'bg-gray-300'
                    }`}
                    title={getSectionName(section)}
                  />
                ))}
              </div>
              {/* FASE 3: Botón para avanzar de área */}
              {getSectionNumber(currentSection) < 6 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={moveToNextSection}
                  className="text-xs"
                >
                  Siguiente área
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.map((message, idx) => (
            <div
              key={idx}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-4 ${
                  message.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="prose prose-sm dark:prose-invert max-w-none [&>*:first-child]:mt-0 [&>*:last-child]:mb-0">
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                ) : (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                )}
              </div>
            </div>
          ))}
          {sending && (
            <div className="flex justify-start">
              <div className="bg-muted rounded-lg p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border bg-card">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {messages.length > 6 && chatMode === 'diagnosis' && (
            <div className="flex justify-center">
              <Button
                onClick={() => setShowSummary(true)}
                disabled={generatingDiagnosis}
                size="lg"
                className="gap-2 w-full max-w-md"
              >
                {generatingDiagnosis ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {hasPreviousDiagnosis ? 'Actualizando diagnóstico...' : 'Generando diagnóstico...'}
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    {hasPreviousDiagnosis ? `Actualizar Diagnóstico (v${diagnosisVersion + 1})` : 'Generar Diagnóstico y Plan'}
                  </>
                )}
              </Button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <div className="relative flex-1">
              <Textarea
                ref={inputRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  // FASE 3.4: En móvil, Enter siempre hace salto de línea
                  if (isMobile) return;
                  
                  // FASE 1: Comportamiento estándar - Enter envía, Shift+Enter hace salto de línea
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    sendMessage();
                  }
                }}
                placeholder={getPlaceholder()}
                disabled={sending || generatingDiagnosis}
                autoFocus
                className="min-h-[60px] max-h-[200px] resize-none overflow-y-auto transition-all pr-20"
                rows={1}
                style={{ height: '60px' }}
                aria-label="Campo de entrada de mensaje"
                aria-describedby="chat-input-hint"
                aria-invalid={chatMode === 'diagnosis' && input.length > 0 && input.length < 20}
              />
              {/* FASE 3.2: Indicador de caracteres para respuestas largas */}
              {input.length > 500 && (
                <span className="absolute bottom-2 right-2 text-xs text-muted-foreground bg-background/80 px-2 py-1 rounded">
                  {input.length} caracteres
                </span>
              )}
              {/* FASE 4: Accesibilidad - descripción del input */}
              <span id="chat-input-hint" className="sr-only">
                Presiona Enter para enviar tu mensaje o Shift+Enter para crear una nueva línea. En dispositivos móviles, usa el botón para enviar.
              </span>
            </div>
            {/* FASE 3.3: Botón de envío mejorado con tooltip */}
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    onClick={sendMessage} 
                    disabled={sending || generatingDiagnosis || !input.trim()}
                    size="icon"
                    className="h-[60px] w-[60px] shrink-0"
                  >
                    {sending ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Send className="h-5 w-5" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Enviar mensaje {!isMobile && '(Enter)'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>
      </div>
    </div>
  );
}
