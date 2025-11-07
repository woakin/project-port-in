import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/shared/Card';
import { toast } from '@/hooks/use-toast';
import { Send, Loader2, CheckCircle, Home, Info, ArrowLeft, ArrowRight, MessageSquare, Mic, SkipForward, HelpCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import ModeSelector from '@/components/chat/ModeSelector';
import { ensureProjectExists } from '@/lib/projectHelpers';
import QuickActions, { SheetType } from '@/components/chat/QuickActions';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import KPIsSheet from '@/components/chat/sheets/KPIsSheet';
import TasksSheet from '@/components/chat/sheets/TasksSheet';
import DocumentsSheet from '@/components/chat/sheets/DocumentsSheet';
import DiagnosesSheet from '@/components/chat/sheets/DiagnosesSheet';
import { AreaProgressBar } from '@/components/chat/AreaProgressBar';

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

const AREAS = [
  { id: 'strategy', name: 'Estrategia', icon: 'Target' },
  { id: 'operations', name: 'Operaciones', icon: 'Cog' },
  { id: 'finance', name: 'Finanzas', icon: 'DollarSign' },
  { id: 'marketing', name: 'Marketing', icon: 'TrendingUp' },
  { id: 'legal', name: 'Legal', icon: 'Scale' },
  { id: 'technology', name: 'Tecnología', icon: 'Laptop' }
] as const;

export default function ChatDiagnosis() {
  const { user, loading: authLoading } = useAuth();
  const { currentProject, loading: projectLoading, setCurrentProject, refreshProjects } = useProjectContext();
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo | null>(null);
  const [step, setStep] = useState<'company-info' | 'method-selection' | 'chat'>('company-info');
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
  
  // Estados para seguimiento de progreso por área (NUEVO SISTEMA)
  const [currentSection, setCurrentSection] = useState<'strategy'|'operations'|'finance'|'marketing'|'legal'|'technology'>('strategy');
  const [areaProgress, setAreaProgress] = useState({
    currentIndex: 0,
    areas: AREAS.map(area => ({
      id: area.id,
      name: area.name,
      icon: area.icon,
      status: 'pending' as 'pending' | 'in_progress' | 'completed' | 'skipped',
      messageCount: 0,
      responses: ''
    }))
  });
  
  const [sectionAnswers, setSectionAnswers] = useState<Record<string, string>>({
    strategy: '',
    operations: '',
    finance: '',
    marketing: '',
    legal: '',
    technology: '',
    consolidated: ''
  });
  
  const [showSummary, setShowSummary] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Funciones de persistencia en localStorage
  const saveDiagnosisState = () => {
    if (!currentProject?.id || step !== 'chat') return;
    
    const state = {
      projectId: currentProject.id,
      messages,
      areaProgress,
      sectionAnswers,
      currentSection,
      companyInfo,
      chatMode,
      timestamp: Date.now()
    };
    
    localStorage.setItem(`diagnosis_state_${currentProject.id}`, JSON.stringify(state));
  };

  const loadDiagnosisState = (projectId: string) => {
    const saved = localStorage.getItem(`diagnosis_state_${projectId}`);
    if (!saved) return null;
    
    try {
      const state = JSON.parse(saved);
      // Validar que no sea muy antiguo (24 horas)
      const maxAge = 24 * 60 * 60 * 1000;
      if (Date.now() - state.timestamp > maxAge) {
        localStorage.removeItem(`diagnosis_state_${projectId}`);
        return null;
      }
      return state;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (hasInitialized) return;
    if (authLoading || projectLoading) return;
    
    if (!user) {
      navigate('/auth');
      return;
    }

    // Solo ejecutar una vez cuando hay proyecto y NO se ha inicializado
    if (currentProject && !hasInitialized) {
      setHasInitialized(true);
      
      // INTENTAR RESTAURAR ESTADO GUARDADO PRIMERO
      const savedState = loadDiagnosisState(currentProject.id);
      if (savedState) {
        setMessages(savedState.messages);
        setAreaProgress(savedState.areaProgress);
        setSectionAnswers(savedState.sectionAnswers);
        setCurrentSection(savedState.currentSection);
        setCompanyInfo(savedState.companyInfo);
        setChatMode(savedState.chatMode);
        setStep('chat');
        
        toast({
          title: '✅ Diagnóstico restaurado',
          description: 'Continuando donde lo dejaste'
        });
        return;
      }
      
      const info: CompanyInfo = {
        name: currentProject.name,
        industry: 'General',
        stage: 'startup',
        projectName: currentProject.name,
        projectDescription: currentProject.description || undefined
      };
      
      setCompanyInfo(info);
      
      // Verificar diagnóstico previo
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
          setStep('chat');
          const initialMessage = getInitialMessage(currentProject.name, 'diagnosis');
          setMessages([{ role: 'assistant', content: initialMessage }]);
        } else {
          setStep('method-selection');
        }
      };

      fetchPreviousDiagnosis();
    }
  }, [user, authLoading, currentProject, projectLoading, hasInitialized, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Auto-guardado cuando cambien estados críticos
  useEffect(() => {
    if (step === 'chat' && currentProject) {
      saveDiagnosisState();
    }
  }, [messages, areaProgress, sectionAnswers, currentSection, step, currentProject]);

  // Inicializar primera área como in_progress
  useEffect(() => {
    if (step === 'chat' && chatMode === 'diagnosis' && areaProgress.areas[0].status === 'pending') {
      setAreaProgress(prev => ({
        ...prev,
        areas: prev.areas.map((area, idx) => 
          idx === 0 ? { ...area, status: 'in_progress' } : area
        )
      }));
    }
  }, [step, chatMode]);

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

  // Función para calcular la calidad de las respuestas de un área
  const calculateAreaQuality = (area: typeof areaProgress.areas[0]): 'low' | 'medium' | 'high' => {
    if (area.status !== 'completed') return 'low';
    
    const totalChars = area.responses.length;
    const messageCount = area.messageCount;
    
    if (messageCount >= 4 && totalChars >= 300) return 'high';
    if (messageCount >= 3 && totalChars >= 150) return 'medium';
    return 'low';
  };

  // Función para avanzar al siguiente área
  const handleNextArea = async () => {
    const currentArea = areaProgress.areas[areaProgress.currentIndex];

    // Validar que tenga al menos 2 mensajes antes de avanzar
    if (currentArea.messageCount < 2) {
      toast({
        title: 'Información insuficiente',
        description: 'Por favor proporciona al menos 2 respuestas antes de avanzar al siguiente área',
        variant: 'destructive'
      });
      return;
    }

    // Advertencia si las respuestas son muy cortas
    const totalChars = currentArea.responses.length;
    if (currentArea.messageCount < 3 || totalChars < 100) {
      toast({
        title: '⚠️ Información limitada',
        description: 'Cuantas más preguntas respondas, mejor será el diagnóstico',
        variant: 'default'
      });
    }

    const nextIndex = areaProgress.currentIndex + 1;
    if (nextIndex >= AREAS.length) {
      toast({
        title: 'Última área',
        description: 'Ya completaste todas las áreas del diagnóstico',
      });
      return;
    }

    const nextSectionId = AREAS[nextIndex].id as typeof currentSection;
    const nextSectionName = AREAS[nextIndex].name;

    // Actualizar progreso de áreas
    setAreaProgress(prev => ({
      currentIndex: nextIndex,
      areas: prev.areas.map((area, idx) => {
        if (idx === prev.currentIndex) return { ...area, status: 'completed' };
        if (idx === nextIndex) return { ...area, status: 'in_progress' };
        return area;
      })
    }));
    setCurrentSection(nextSectionId);

    // Mensaje del sistema y pregunta inicial automática
    const systemMessage = {
      role: 'assistant' as const,
      content: `🔄 **Avanzando a: ${nextSectionName}**\n\nPerfecto, ahora exploremos el área de ${nextSectionName}.`
    };
    const updatedMessages = [...messages, systemMessage];
    setMessages(updatedMessages);

    toast({
      title: 'Área cambiada',
      description: `Ahora estamos en: ${nextSectionName}`,
    });

    // Generar pregunta inicial con el asistente
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const areaPrompts = {
        operations: '¿Cómo describirías tus procesos operativos actuales? ¿Qué sistemas o metodologías utilizas?',
        finance: '¿Cuál es tu modelo de ingresos principal? ¿Cómo gestionas actualmente las finanzas de tu proyecto?',
        marketing: '¿Qué estrategias de marketing estás utilizando? ¿Cómo adquieres y retienes clientes?',
        legal: '¿Has considerado los aspectos legales de tu negocio? ¿Qué estructura legal tiene tu empresa?',
        technology: '¿Qué tecnologías utilizas en tu negocio? ¿Cómo gestionas la infraestructura tecnológica?'
      } as const;

      const nextId = AREAS[nextIndex].id as keyof typeof areaPrompts;
      const suggested = (areaPrompts as any)[nextId] || '';
      const contextualPrompt = `El usuario acaba de avanzar al área de ${nextSectionName}. Genera una pregunta inicial contextual y amigable para comenzar a explorar esta área. ${suggested ? `La pregunta sugerida sería: "${suggested}" pero puedes adaptarla según el contexto de la conversación previa.` : ''}`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diagnosis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            ...updatedMessages,
            { role: 'system', content: contextualPrompt }
          ],
          companyInfo,
          isComplete: false,
          mode: chatMode,
        }),
      });

      if (!response.ok || !response.body) throw new Error('Error al conectar con el asistente');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      // Agregar mensaje del asistente vacío que iremos llenando
      setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

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
              const cleanContent = filterMetadata(assistantMessage);
              setMessages([...updatedMessages, { role: 'assistant', content: cleanContent }]);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error al avanzar de área:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar la pregunta automática, pero puedes continuar escribiendo.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Función para saltar área actual
  const handleSkipArea = async () => {
    const currentIndex = areaProgress.currentIndex;
    const currentArea = areaProgress.areas[currentIndex];
    const nextIndex = currentIndex + 1;

    // Si es la última área
    if (nextIndex >= AREAS.length) {
      setAreaProgress(prev => ({
        ...prev,
        areas: prev.areas.map((area, idx) =>
          idx === currentIndex
            ? { ...area, status: currentArea.messageCount >= 2 ? 'completed' : 'skipped' }
            : area
        )
      }));

      setMessages(prev => [...prev, {
        role: 'assistant' as const,
        content: `⏭️ **Área ${currentArea.messageCount >= 2 ? 'completada' : 'saltada'}**\n\nHas revisado todas las áreas. Ya puedes generar el diagnóstico.`
      }]);

      toast({
        title: 'Fin del diagnóstico',
        description: 'Ya puedes generar el diagnóstico',
      });
      return;
    }

    // Marcar área actual como completada si ya hay respuestas, si no, como saltada
    setAreaProgress(prev => ({
      currentIndex: nextIndex,
      areas: prev.areas.map((area, idx) => {
        if (idx === currentIndex) {
          return { ...area, status: currentArea.messageCount >= 2 ? 'completed' : 'skipped' };
        }
        if (idx === nextIndex) {
          return { ...area, status: 'in_progress' };
        }
        return area;
      })
    }));

    const nextSectionId = AREAS[nextIndex].id as typeof currentSection;
    const nextSectionName = AREAS[nextIndex].name;
    setCurrentSection(nextSectionId);

    const systemMessage = {
      role: 'assistant' as const,
      content: `⏭️ **Área ${currentArea.messageCount >= 2 ? 'completada' : 'saltada'}**\n\nEntendido, continuemos con ${nextSectionName}.`
    };
    const updatedMessages = [...messages, systemMessage];
    setMessages(updatedMessages);

    toast({
      title: 'Área saltada',
      description: `Ahora estamos en: ${nextSectionName}`,
    });

    // Generar pregunta inicial para la nueva área
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No hay sesión activa');

      const areaPrompts = {
        operations: '¿Cómo describirías tus procesos operativos actuales? ¿Qué sistemas o metodologías utilizas?',
        finance: '¿Cuál es tu modelo de ingresos principal? ¿Cómo gestionas actualmente las finanzas de tu proyecto?',
        marketing: '¿Qué estrategias de marketing estás utilizando? ¿Cómo adquieres y retienes clientes?',
        legal: '¿Has considerado los aspectos legales de tu negocio? ¿Qué estructura legal tiene tu empresa?',
        technology: '¿Qué tecnologías utilizas en tu negocio? ¿Cómo gestionas la infraestructura tecnológica?'
      } as const;

      const nextId = AREAS[nextIndex].id as keyof typeof areaPrompts;
      const suggested = (areaPrompts as any)[nextId] || '';
      const contextualPrompt = `El usuario decidió ${currentArea.messageCount >= 2 ? 'terminar' : 'saltar'} el área anterior. Genera una pregunta inicial para comenzar ${nextSectionName}. ${suggested ? `Sugerencia: "${suggested}"` : ''}`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diagnosis`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          messages: [
            ...updatedMessages,
            { role: 'system', content: contextualPrompt }
          ],
          companyInfo,
          isComplete: false,
          mode: chatMode,
        }),
      });

      if (!response.ok || !response.body) throw new Error('Error al conectar con el asistente');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      let textBuffer = '';

      setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

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
              const cleanContent = filterMetadata(assistantMessage);
              setMessages([...updatedMessages, { role: 'assistant', content: cleanContent }]);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }
    } catch (error) {
      console.error('Error al saltar área:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar la pregunta automática, pero puedes continuar escribiendo.',
        variant: 'destructive',
      });
    } finally {
      setSending(false);
    }
  };

  // Función para regresar a un área anterior
  const handleGoToArea = (areaIndex: number) => {
    if (areaIndex > areaProgress.currentIndex) return;
    
    setAreaProgress(prev => ({
      currentIndex: areaIndex,
      areas: prev.areas.map((area, idx) =>
        idx === areaIndex
          ? { ...area, status: 'in_progress' }
          : area
      )
    }));
    
    setCurrentSection(AREAS[areaIndex].id as typeof currentSection);
    
    setMessages(prev => [...prev, {
      role: 'assistant' as const,
      content: `🔄 **Regresando a: ${AREAS[areaIndex].name}**\n\nVolvamos a revisar el área de ${AREAS[areaIndex].name}.`
    }]);
    
    toast({
      title: 'Área cambiada',
      description: `Regresaste a: ${AREAS[areaIndex].name}`
    });
  };

  // FASE 3: Función para cambiar de área manualmente con coherencia total
  const moveToNextSection = async () => {
    if (sending) return; // No cambiar si hay mensaje en proceso
    
    const order: Array<typeof currentSection> = ['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'];
    const currentIndex = order.indexOf(currentSection);
    if (currentIndex >= order.length - 1) {
      toast({
        title: 'Última área',
        description: 'Ya estás en la última área del diagnóstico',
      });
      return;
    }
    
    const nextSection = order[currentIndex + 1];
    const previousSectionName = getSectionName(currentSection);
    const nextSectionName = getSectionName(nextSection);
      
      // 1. Cambiar la sección actual
      setCurrentSection(nextSection);
      
      // 2. Agregar mensaje del sistema visible
      const systemMessage: Message = {
        role: 'assistant',
        content: `🔄 **Avanzaste a: ${nextSectionName}**\n\nPerfecto, hemos cubierto ${previousSectionName}. Ahora continuemos con ${nextSectionName}.`
      };
      
      const updatedMessages = [...messages, systemMessage];
      setMessages(updatedMessages);
      
      // 3. Toast de confirmación
      toast({
        title: 'Área cambiada',
        description: `Ahora estamos en: ${nextSectionName}`
      });
      
      // 4. El AI genera automáticamente una pregunta para el área nueva
      setSending(true);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('No hay sesión activa');
        }

        // Prompt específico para iniciar el área nueva
        const areaPrompts = {
          operations: '¿Cómo describirías tus procesos operativos actuales? ¿Qué sistemas o metodologías utilizas?',
          finance: '¿Cuál es tu modelo de ingresos principal? ¿Cómo gestionas actualmente las finanzas de tu proyecto?',
          marketing: '¿Qué estrategias de marketing estás utilizando? ¿Cómo adquieres y retienes clientes?',
          legal: '¿Has considerado los aspectos legales de tu negocio? ¿Qué estructura legal tiene tu empresa?',
          technology: '¿Qué tecnologías utilizas en tu negocio? ¿Cómo gestionas la infraestructura tecnológica?'
        };

        const contextualPrompt = `El usuario acaba de avanzar al área de ${nextSectionName}. Genera una pregunta inicial contextual y amigable para comenzar a explorar esta área. La pregunta sugerida sería: "${areaPrompts[nextSection as keyof typeof areaPrompts]}" pero puedes adaptarla según el contexto de la conversación previa.`;

        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diagnosis`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`,
            },
            body: JSON.stringify({
              messages: [
                ...updatedMessages,
                { role: 'system', content: contextualPrompt }
              ],
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
        setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

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
                // Filtrar metadata técnica antes de mostrar
                const cleanContent = filterMetadata(assistantMessage);
                setMessages([...updatedMessages, { role: 'assistant', content: cleanContent }]);
              }
            } catch (e) {
              console.error('Error parsing JSON:', e);
            }
          }
        }

      } catch (error) {
        console.error('Error al cambiar de área:', error);
        toast({
          title: 'Error',
          description: 'No se pudo generar la pregunta automática, pero puedes continuar escribiendo.',
          variant: 'destructive'
        });
      } finally {
        setSending(false);
      }
    
  };

  // FASE 3: Función para retroceder a área anterior
  const moveToPreviousSection = async () => {
    if (sending) return; // No cambiar si hay mensaje en proceso
    
    const order: Array<typeof currentSection> = ['strategy', 'operations', 'finance', 'marketing', 'legal', 'technology'];
    const currentIndex = order.indexOf(currentSection);
    if (currentIndex <= 0) {
      toast({
        title: 'Primera área',
        description: 'Ya estás en la primera área del diagnóstico',
      });
      return;
    }
    
    const previousSection = order[currentIndex - 1];
    const currentSectionName = getSectionName(currentSection);
    const previousSectionName = getSectionName(previousSection);
    
    // 1. Cambiar la sección actual
    setCurrentSection(previousSection);
    
    // 2. Agregar mensaje del sistema visible
    const systemMessage: Message = {
      role: 'assistant',
      content: `🔄 **Retrocediste a: ${previousSectionName}**\n\nVolvamos a revisar ${previousSectionName}.`
    };
    
    const updatedMessages = [...messages, systemMessage];
    setMessages(updatedMessages);
    
    // 3. Toast de confirmación
    toast({
      title: 'Área cambiada',
      description: `Regresaste a: ${previousSectionName}`
    });
    
    // 4. El AI genera automáticamente una pregunta contextual para el área
    setSending(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      const contextualPrompt = `El usuario retrocedió al área de ${previousSectionName}. Genera una pregunta contextual considerando que ya habían discutido esta área anteriormente. Pregunta si quieren revisar o agregar algo más sobre ${previousSectionName}.`;

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat-diagnosis`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            messages: [
              ...updatedMessages,
              { role: 'system', content: contextualPrompt }
            ],
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
      setMessages([...updatedMessages, { role: 'assistant', content: '' }]);

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
              // Filtrar metadata técnica antes de mostrar
              const cleanContent = filterMetadata(assistantMessage);
              setMessages([...updatedMessages, { role: 'assistant', content: cleanContent }]);
            }
          } catch (e) {
            console.error('Error parsing JSON:', e);
          }
        }
      }

    } catch (error) {
      console.error('Error al cambiar de área:', error);
      toast({
        title: 'Error',
        description: 'No se pudo generar la pregunta automática, pero puedes continuar escribiendo.',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
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

  // Función para filtrar metadata técnica del AI
  const filterMetadata = (content: string): string => {
    // Eliminar bloque de metadata al inicio (entre --- y ---)
    return content.replace(/^---\s*\n[\s\S]*?\n---\s*\n/m, '').trim();
  };

  const handleQuickAction = (prompt: string) => {
    setInput(prompt);
    inputRef.current?.focus();
  };

  // Función para guardar datos y redirigir a Voice Diagnosis
  const saveAndRedirectToVoice = async () => {
    // Early return: Si ya existe currentProject, navegar directo sin crear nada
    if (currentProject) {
      navigate('/voice-diagnosis');
      return;
    }

    if (!user) return;

    // Validación estricta de datos
    const name = tempName?.trim();
    const industry = tempIndustry?.trim();
    const stage = tempStage;
    const projectName = tempProjectName?.trim();
    const projectDescription = tempProjectDescription?.trim();

    if (!name || name.length === 0 || name.length > 100) {
      toast({
        title: 'Error de validación',
        description: 'El nombre de la empresa es inválido (máx. 100 caracteres)',
        variant: 'destructive'
      });
      return;
    }

    if (!industry || industry.length === 0 || industry.length > 100) {
      toast({
        title: 'Error de validación',
        description: 'La industria es inválida (máx. 100 caracteres)',
        variant: 'destructive'
      });
      return;
    }

    if (!projectName || projectName.length === 0 || projectName.length > 100) {
      toast({
        title: 'Error de validación',
        description: 'El nombre del proyecto es inválido (máx. 100 caracteres)',
        variant: 'destructive'
      });
      return;
    }
    
    setSending(true);
    try {
      // Usar helper consolidado
      await ensureProjectExists(
        supabase,
        user,
        {
          name,
          industry,
          size: stage
        },
        {
          name: projectName,
          description: projectDescription
        }
      );

      toast({
        title: "Información guardada",
        description: "Redirigiendo a la entrevista por voz...",
      });

      // Redirigir a voice diagnosis
      setTimeout(() => {
        navigate('/voice-diagnosis');
      }, 500);

    } catch (error) {
      console.error('Error al guardar información:', error);
      toast({
        title: "Error",
        description: "No se pudo guardar la información. Intenta de nuevo.",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  };

  const startChat = async () => {
    if (!tempName || !tempIndustry || !tempProjectName) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa todos los campos obligatorios',
        variant: 'destructive'
      });
      return;
    }

    if (!user) {
      toast({
        title: 'Error',
        description: 'No hay sesión de usuario activa',
        variant: 'destructive'
      });
      return;
    }

    setSending(true);
    
    try {
      // Usar helper consolidado
      const result = await ensureProjectExists(
        supabase,
        user,
        {
          name: tempName,
          industry: tempIndustry,
          size: tempStage
        },
        {
          name: tempProjectName,
          description: tempProjectDescription
        }
      );

      // Establecer como proyecto actual en el contexto
      setCurrentProject(result.project as any);

      // Guardar info en estado para uso posterior
      const info: CompanyInfo = {
        name: tempName,
        industry: tempIndustry,
        stage: tempStage,
        projectName: tempProjectName,
        projectDescription: tempProjectDescription
      };
      
      setCompanyInfo(info);

      toast({
        title: '✅ Información guardada',
        description: `Proyecto "${tempProjectName}" creado exitosamente`
      });

      // Avanzar a selección de método
      setStep('method-selection');
      
      // Refrescar lista de proyectos en el contexto
      await refreshProjects();

    } catch (error) {
      console.error('Error al guardar información:', error);
      toast({
        title: 'Error',
        description: 'No se pudo guardar la información. Intenta nuevamente.',
        variant: 'destructive'
      });
    } finally {
      setSending(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || sending || !companyInfo) return;


    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    
    // Guardar respuestas en el área correcta
    if (chatMode === 'diagnosis') {
      const currentAreaId = AREAS[areaProgress.currentIndex].id;
      
      setSectionAnswers(prev => ({
        ...prev,
        [currentAreaId]: prev[currentAreaId]
          ? prev[currentAreaId] + '\n\n' + input.trim()
          : input.trim(),
        consolidated: prev.consolidated
          ? prev.consolidated + '\n\n' + input.trim()
          : input.trim()
      }));
      
      // Actualizar contador de mensajes del área
      setAreaProgress(prev => ({
        ...prev,
        areas: prev.areas.map((area, idx) =>
          idx === prev.currentIndex
            ? { 
                ...area, 
                messageCount: area.messageCount + 1,
                responses: area.responses 
                  ? area.responses + '\n\n' + input.trim()
                  : input.trim()
              }
            : area
        )
      }));
      
      console.log('💾 Respuesta guardada en área:', currentAreaId, 'Total:', areaProgress.areas[areaProgress.currentIndex].messageCount + 1, 'mensajes');
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
            mode: chatMode,
            currentArea: chatMode === 'diagnosis' ? AREAS[areaProgress.currentIndex].id : undefined,
            areaProgress: chatMode === 'diagnosis' ? {
              currentIndex: areaProgress.currentIndex,
              areas: areaProgress.areas.map(a => ({
                id: a.id,
                status: a.status,
                messageCount: a.messageCount
              }))
            } : undefined
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
                // Filtrar metadata técnica antes de mostrar
                const cleanContent = filterMetadata(assistantMessage);
                setMessages([...newMessages, { role: 'assistant', content: cleanContent }]);
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
    console.log('=== GENERATE DIAGNOSIS START ===');
    
    // Validación con feedback explícito
    if (!user) {
      toast({
        title: 'Error de sesión',
        description: 'No hay usuario autenticado',
        variant: 'destructive'
      });
      console.error('generateDiagnosis: user is null');
      return;
    }

    if (!currentProject) {
      toast({
        title: 'Error: Proyecto no encontrado',
        description: 'No se ha cargado el proyecto actual. Intenta recargar la página.',
        variant: 'destructive'
      });
      console.error('generateDiagnosis: currentProject is null');
      return;
    }

    if (!companyInfo) {
      toast({
        title: 'Error: Información de empresa faltante',
        description: 'No se ha cargado la información de la empresa',
        variant: 'destructive'
      });
      console.error('generateDiagnosis: companyInfo is null');
      return;
    }

    console.log('user:', user?.id);
    console.log('currentProject:', currentProject?.id, currentProject?.name);
    console.log('companyInfo:', companyInfo);
    
    // Validar que al menos un área esté completada
    const completedAreas = areaProgress.areas.filter(a => a.status === 'completed');
    
    if (completedAreas.length === 0) {
      toast({
        title: 'Información insuficiente',
        description: 'Debes completar al menos un área para generar el diagnóstico',
        variant: 'destructive'
      });
      console.log('No completed areas');
      return;
    }

    // Verificar calidad de las respuestas
    const lowQualityAreas = completedAreas.filter(area => calculateAreaQuality(area) === 'low');
    const hasLowQuality = lowQualityAreas.length > 0;
    
    if (hasLowQuality && completedAreas.length < 3) {
      toast({
        title: '⚠️ Información limitada detectada',
        description: 'El diagnóstico será más preciso si completas más áreas con mayor detalle',
        variant: 'default',
        duration: 5000
      });
    }
    
    console.log('📊 Áreas completadas:', completedAreas.map(a => a.name).join(', '));
    
    setGeneratingDiagnosis(true);

    toast({
      title: 'Generando diagnóstico...',
      description: 'Esto puede tardar unos segundos'
    });

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No hay sesión activa');
      }

      // Consolidar todas las respuestas por área
      const formResponses = {
        strategy: sectionAnswers.strategy || '',
        operations: sectionAnswers.operations || '',
        finance: sectionAnswers.finance || '',
        marketing: sectionAnswers.marketing || '',
        legal: sectionAnswers.legal || '',
        technology: sectionAnswers.technology || ''
      };

      // Validar que al menos UNA área tenga contenido
      const hasAnyContent = Object.values(formResponses).some(v => v.trim().length > 0);
      
      if (!hasAnyContent) {
        toast({
          title: 'Sin respuestas',
          description: 'Debes proporcionar al menos una respuesta antes de generar el diagnóstico',
          variant: 'destructive'
        });
        console.log('No content in any area');
        return;
      }

      console.log('📊 sectionAnswers:', Object.keys(sectionAnswers).map(k => ({
        area: k,
        length: sectionAnswers[k].length,
        hasContent: sectionAnswers[k].length > 0
      })));
      
      console.log('📤 Sending to diagnose-company:', {
        maturityLevel: companyInfo.stage,
        companyId: currentProject.company_id,
        userId: user.id,
        projectId: currentProject.id,
        completedAreas: completedAreas.map(a => a.name).join(', ')
      });

      // Llamar a diagnose-company
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/diagnose-company`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            formResponses: formResponses,
            maturityLevel: companyInfo.stage,
            companyId: currentProject.company_id,
            userId: user.id,
            projectId: currentProject.id
          }),
        }
      );

      console.log('📥 Respuesta de diagnose-company:', response.status, response.statusText);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('❌ Error de diagnose-company:', errorData);
        throw new Error(errorData.error || 'Error al generar diagnóstico');
      }

      const data = await response.json();
      
      console.log('✅ Diagnóstico generado:', data);

      if (!data.diagnosis_id) {
        throw new Error('No se recibió el ID del diagnóstico');
      }

      toast({
        title: 'Diagnóstico generado',
        description: 'Redirigiendo a los resultados...'
      });

      // Limpiar estado guardado al completar exitosamente
      if (currentProject?.id) {
        localStorage.removeItem(`diagnosis_state_${currentProject.id}`);
      }

      setTimeout(() => {
        navigate(`/diagnosis/${data.diagnosis_id}`);
      }, 500);

    } catch (error) {
      console.error('💥 Error generating diagnosis:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "No se pudo generar el diagnóstico. Por favor intenta nuevamente.",
        variant: "destructive"
      });
    } finally {
      setGeneratingDiagnosis(false);
      console.log('=== GENERATE DIAGNOSIS END ===');
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
                Continuar
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (step === 'method-selection') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card variant="content" className="w-full max-w-2xl">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h1 className="text-3xl font-bold text-foreground">¿Cómo quieres realizar el diagnóstico?</h1>
              <p className="text-muted-foreground">
                Elige el método que prefieras para completar el diagnóstico de tu empresa
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Opción: Chat con IA */}
              <div onClick={() => {
                setStep('chat');
                const initialMessage = getInitialMessage(companyInfo?.projectName || 'tu proyecto', 'diagnosis');
                setMessages([{
                  role: 'assistant',
                  content: initialMessage
                }]);
              }}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group h-full">
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                    <MessageSquare className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Chat con IA</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Conversa por escrito con nuestro asistente de IA. Ideal si prefieres tomarte tu tiempo para responder.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Más control sobre tus respuestas</li>
                      <li>✓ Puedes editar antes de enviar</li>
                      <li>✓ Historial visible de la conversación</li>
                    </ul>
                  </div>
                  <Button className="w-full" variant="default">
                    Continuar con Chat
                  </Button>
                </div>
              </Card>
              </div>

              {/* Opción: Entrevista por Voz */}
              <div onClick={saveAndRedirectToVoice}>
              <Card className="p-6 hover:shadow-lg transition-shadow cursor-pointer group h-full">
                <div className="space-y-4">
                  <div className="p-4 bg-primary/10 rounded-lg w-fit group-hover:bg-primary/20 transition-colors">
                    <Mic className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Entrevista por Voz</h3>
                    <p className="text-muted-foreground text-sm mb-4">
                      Habla directamente con el asistente de IA. Una experiencia más natural y conversacional.
                    </p>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      <li>✓ Más rápido y fluido</li>
                      <li>✓ Experiencia conversacional natural</li>
                      <li>✓ No necesitas escribir</li>
                    </ul>
                  </div>
                  <Button className="w-full" variant="default" disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Guardando...
                      </>
                    ) : (
                      'Iniciar Entrevista por Voz'
                    )}
                  </Button>
                </div>
              </Card>
              </div>
            </div>

            <Button
              variant="ghost"
              onClick={() => setStep('company-info')}
              className="w-full"
            >
              ← Volver a editar información
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      <header className="flex-shrink-0 border-b border-border py-2 px-4 bg-card">
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
            <QuickActions 
              projectId={currentProject?.id}
              onActionClick={handleQuickAction}
              onOpenSheet={setOpenSheet}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowModeInfo(!showModeInfo)}
              className="gap-2"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Ayuda</span>
            </Button>
          </div>
        </div>
      </header>

      {showModeInfo && (
        <div className="flex-shrink-0 bg-muted/50 p-4 border-b border-border">
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

      <div className="flex-shrink-0">
        <ModeSelector 
          currentMode={chatMode} 
          onModeChange={handleModeChange}
          disabled={sending || generatingDiagnosis}
        />

        {chatMode === 'diagnosis' && (
          <AreaProgressBar
            areas={areaProgress.areas}
            currentIndex={areaProgress.currentIndex}
            onGoToArea={handleGoToArea}
          />
        )}
      </div>

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
            {/* Resumen de áreas */}
            <div className="grid gap-3">
              {areaProgress.areas.map((area, idx) => {
                const quality = calculateAreaQuality(area);
                const qualityConfig = {
                  high: { emoji: '✅', label: 'Excelente', color: 'text-green-600' },
                  medium: { emoji: '⚠️', label: 'Aceptable', color: 'text-amber-600' },
                  low: { emoji: '❗', label: 'Básica', color: 'text-orange-600' }
                };
                const config = qualityConfig[quality];
                
                return (
                  <div key={area.id} className={`border rounded-lg p-3 ${
                    area.status === 'completed' ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900' :
                    area.status === 'skipped' ? 'bg-gray-50 dark:bg-gray-900/20 border-gray-200 dark:border-gray-800' :
                    'bg-muted/30'
                  }`}>
                    <div className="flex items-center justify-between mb-1">
                      <h4 className="font-medium text-sm">{area.name}</h4>
                      {area.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                      {area.status === 'skipped' && <span className="text-xs text-muted-foreground">Saltada</span>}
                    </div>
                    {area.status === 'completed' && area.responses && (
                      <div className="space-y-1">
                        <p className="text-xs text-muted-foreground">
                          {area.messageCount} respuestas • {area.responses.length} caracteres
                        </p>
                        <p className={`text-xs font-medium ${config.color}`}>
                          {config.emoji} Calidad: {config.label}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* Advertencia de calidad */}
            {(() => {
              const completedAreas = areaProgress.areas.filter(a => a.status === 'completed');
              const lowQualityCount = completedAreas.filter(a => calculateAreaQuality(a) === 'low').length;
              
              if (lowQualityCount > 0) {
                return (
                  <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 rounded-lg p-3">
                    <p className="text-sm text-amber-800 dark:text-amber-300">
                      <span className="font-semibold">⚠️ Recomendación:</span> {lowQualityCount} {lowQualityCount === 1 ? 'área tiene' : 'áreas tienen'} información limitada. 
                      Puedes generar el diagnóstico ahora, pero será más preciso si aportas más detalles.
                    </p>
                  </div>
                );
              }
              return null;
            })()}
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

      <div className="flex-1 overflow-y-auto p-4 min-h-0">
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

      <div className="flex-shrink-0 border-t border-border bg-card">
        <div className="max-w-4xl mx-auto p-4 space-y-3">
          {/* Botones de navegación de áreas en modo diagnóstico */}
          {chatMode === 'diagnosis' && areaProgress.currentIndex < AREAS.length && (
            <div className="flex gap-2 justify-center">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSkipArea}
                disabled={sending || generatingDiagnosis}
                className="gap-2"
              >
                <SkipForward className="h-4 w-4" />
                Saltar esta área
              </Button>
              
              {areaProgress.areas[areaProgress.currentIndex].messageCount >= 2 && (
                <Button
                  size="sm"
                  onClick={handleNextArea}
                  disabled={sending || generatingDiagnosis}
                  className="gap-2"
                >
                  <ArrowRight className="h-4 w-4" />
                  Avanzar a siguiente área
                </Button>
              )}
            </div>
          )}

          {/* Botón generar diagnóstico cuando al menos 3 áreas están completadas */}
          {chatMode === 'diagnosis' && (() => {
            const completedAreas = areaProgress.areas.filter(a => a.status === 'completed');
            const skippedCount = areaProgress.areas.filter(a => a.status === 'skipped').length;
            
            // Permitir generar con al menos 3 áreas completadas
            const canGenerate = completedAreas.length >= 3;
            
            return canGenerate && (
              <div className="p-4 bg-muted/50 border border-border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      Diagnóstico listo para generar
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {completedAreas.length} áreas completadas{skippedCount > 0 && `, ${skippedCount} saltadas`}
                    </p>
                  </div>
                  <Button onClick={() => setShowSummary(true)} disabled={generatingDiagnosis}>
                    {generatingDiagnosis ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Generando...
                      </>
                    ) : (
                      'Generar Diagnóstico y Plan'
                    )}
                  </Button>
                </div>
              </div>
            );
          })()}
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
