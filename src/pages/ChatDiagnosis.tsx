import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { useProjectContext } from '@/contexts/ProjectContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/shared/Card';
import { toast } from '@/hooks/use-toast';
import { Send, Loader2, CheckCircle, Home } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';

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
  const inputRef = useRef<HTMLInputElement>(null);
  const [generatingDiagnosis, setGeneratingDiagnosis] = useState(false);

  // Formulario inicial
  const [tempName, setTempName] = useState('');
  const [tempIndustry, setTempIndustry] = useState('');
  const [tempStage, setTempStage] = useState<'idea' | 'startup' | 'pyme' | 'corporate'>('startup');
  const [tempProjectName, setTempProjectName] = useState('');
  const [tempProjectDescription, setTempProjectDescription] = useState('');
  const [diagnosisVersion, setDiagnosisVersion] = useState<number>(0);
  const [hasPreviousDiagnosis, setHasPreviousDiagnosis] = useState(false);

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
      
      // Mensaje inicial
      setMessages([{
        role: 'assistant',
        content: `¡Hola! Soy tu consultor de IA para **${currentProject.name}**. \n\nEstoy aquí para ayudarte con cualquier pregunta sobre tu proyecto, darte consejos estratégicos, analizar situaciones o ayudarte a tomar decisiones. \n\n¿En qué puedo ayudarte hoy?`
      }]);
    }
  }, [user, authLoading, currentProject, projectLoading, step, navigate]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

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

    const userMessage: Message = { role: 'user', content: input };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
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
            isComplete: false
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
    if (!companyInfo) return;
    
    setGeneratingDiagnosis(true);

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
            messages,
            companyInfo,
            isComplete: true
          }),
        }
      );

      if (!response.ok) {
        throw new Error('Error al generar diagnóstico');
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

      // Pequeña pausa para que el usuario vea el toast
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
        <div className="max-w-4xl mx-auto flex items-center gap-3">
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
      </header>

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
          {messages.length > 6 && (
            <div className="flex justify-center">
              <Button
                onClick={generateDiagnosis}
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
          <div className="flex gap-2">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
              placeholder="Escribe tu respuesta..."
              disabled={sending || generatingDiagnosis}
              autoFocus
            />
            <Button onClick={sendMessage} disabled={sending || generatingDiagnosis || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
