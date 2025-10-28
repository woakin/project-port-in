import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card } from '@/components/shared/Card';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { ArrowRight, ArrowLeft } from 'lucide-react';

type MaturityLevel = 'idea' | 'startup' | 'pyme' | 'corporate';

export default function Onboarding() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Datos del formulario
  const [companyName, setCompanyName] = useState('');
  const [industry, setIndustry] = useState('');
  const [companySize, setCompanySize] = useState<MaturityLevel>('startup');
  const [projectName, setProjectName] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [responses, setResponses] = useState({
    strategy: '',
    operations: '',
    finance: '',
    marketing: '',
    legal: '',
    technology: ''
  });

  const totalSteps = 8;

  const handleNext = () => {
    if (step === 1 && (!companyName || !industry || !projectName)) {
      toast({
        title: 'Campos requeridos',
        description: 'Por favor completa nombre de empresa, industria y nombre del proyecto',
        variant: 'destructive'
      });
      return;
    }
    setStep(prev => Math.min(prev + 1, totalSteps));
  };

  const handleBack = () => {
    setStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!user) {
      toast({
        title: 'Error',
        description: 'Debes iniciar sesión',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Crear o actualizar empresa
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('name', companyName)
        .maybeSingle();

      let companyId;

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            name: companyName,
            industry,
            size: companySize === 'idea' ? 'startup' : companySize,
            created_by: user.id
          })
          .select()
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;

        // Actualizar perfil con company_id
        const { error: profileError } = await supabase
          .from('profiles')
          .update({ company_id: companyId })
          .eq('id', user.id);

        if (profileError) throw profileError;
      }

      // 2. Crear el proyecto
      const { data: newProject, error: projectError } = await supabase
        .from('projects')
        .insert({
          name: projectName,
          description: projectDescription || null,
          company_id: companyId,
          status: 'active',
          is_default: true
        })
        .select()
        .single();

      if (projectError) throw projectError;

      // 3. Llamar a edge function para análisis
      const { data: analysisData, error: analysisError } = await supabase.functions.invoke('diagnose-company', {
        body: {
          formResponses: responses,
          maturityLevel: companySize,
          companyId,
          userId: user.id,
          projectId: newProject.id
        }
      });

      if (analysisError) throw analysisError;

      toast({
        title: 'Diagnóstico completado',
        description: 'Tu análisis está listo'
      });

      // Navegar a resultados
      navigate(`/diagnosis/${analysisData.diagnosis_id}`);

    } catch (error) {
      console.error('Error submitting diagnosis:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Error al procesar diagnóstico',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">Paso {step} de {totalSteps}</span>
            <span className="text-sm text-muted-foreground">{Math.round((step / totalSteps) * 100)}%</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        <Card variant="content">
          {/* Step 1: Información básica */}
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Información de tu empresa</h2>
                <p className="text-muted-foreground">Cuéntanos sobre tu negocio</p>
              </div>

              <div className="space-y-4">
                <div>
                  <Label htmlFor="companyName">Nombre de la empresa *</Label>
                  <Input
                    id="companyName"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Mi Empresa S.A."
                  />
                </div>

                <div>
                  <Label htmlFor="industry">Industria o sector *</Label>
                  <Input
                    id="industry"
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    placeholder="Ej: Tecnología, Alimentos, Servicios..."
                  />
                </div>

                <div>
                  <Label htmlFor="projectName">Nombre del Proyecto *</Label>
                  <Input
                    id="projectName"
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="Ej: Transformación Digital 2025"
                  />
                </div>

                <div>
                  <Label htmlFor="projectDescription">Descripción del proyecto (opcional)</Label>
                  <Textarea
                    id="projectDescription"
                    value={projectDescription}
                    onChange={(e) => setProjectDescription(e.target.value)}
                    placeholder="Describe el objetivo de este proyecto..."
                    rows={2}
                  />
                </div>

                <div>
                  <Label>Etapa de tu negocio</Label>
                  <div className="grid grid-cols-2 gap-4 mt-2">
                    {[
                      { value: 'idea', label: 'Solo una idea' },
                      { value: 'startup', label: 'Startup' },
                      { value: 'pyme', label: 'PyME' },
                      { value: 'corporate', label: 'Corporativo' }
                    ].map(option => (
                      <button
                        key={option.value}
                        onClick={() => setCompanySize(option.value as MaturityLevel)}
                        className={`p-4 rounded-md border-2 transition-colors ${
                          companySize === option.value
                            ? 'border-primary bg-primary/10'
                            : 'border-border hover:border-primary/50'
                        }`}
                      >
                        <span className="font-medium text-foreground">{option.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 2-7: Preguntas por área */}
          {step === 2 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Estrategia</h2>
                <p className="text-muted-foreground">Visión, misión y dirección del negocio</p>
              </div>
              <div>
                <Label htmlFor="strategy">Describe tu estrategia actual y objetivos principales</Label>
                <Textarea
                  id="strategy"
                  value={responses.strategy}
                  onChange={(e) => setResponses(prev => ({ ...prev, strategy: e.target.value }))}
                  placeholder="Ej: Nuestro objetivo es expandirnos a 3 ciudades en el próximo año..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Operaciones</h2>
                <p className="text-muted-foreground">Procesos, eficiencia y calidad</p>
              </div>
              <div>
                <Label htmlFor="operations">¿Cómo funcionan tus operaciones diarias?</Label>
                <Textarea
                  id="operations"
                  value={responses.operations}
                  onChange={(e) => setResponses(prev => ({ ...prev, operations: e.target.value }))}
                  placeholder="Ej: Tenemos 3 empleados, procesos manuales..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Finanzas</h2>
                <p className="text-muted-foreground">Rentabilidad y control financiero</p>
              </div>
              <div>
                <Label htmlFor="finance">Describe tu situación financiera actual</Label>
                <Textarea
                  id="finance"
                  value={responses.finance}
                  onChange={(e) => setResponses(prev => ({ ...prev, finance: e.target.value }))}
                  placeholder="Ej: Ingresos mensuales de $50,000, gastos controlados..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {step === 5 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Marketing</h2>
                <p className="text-muted-foreground">Marca, canales y adquisición de clientes</p>
              </div>
              <div>
                <Label htmlFor="marketing">¿Cómo atraes y retienes clientes?</Label>
                <Textarea
                  id="marketing"
                  value={responses.marketing}
                  onChange={(e) => setResponses(prev => ({ ...prev, marketing: e.target.value }))}
                  placeholder="Ej: Usamos redes sociales y referencias..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {step === 6 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Legal</h2>
                <p className="text-muted-foreground">Compliance y protección legal</p>
              </div>
              <div>
                <Label htmlFor="legal">¿Cuál es tu situación legal actual?</Label>
                <Textarea
                  id="legal"
                  value={responses.legal}
                  onChange={(e) => setResponses(prev => ({ ...prev, legal: e.target.value }))}
                  placeholder="Ej: Empresa constituida, contratos básicos..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {step === 7 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Tecnología</h2>
                <p className="text-muted-foreground">Infraestructura y digitalización</p>
              </div>
              <div>
                <Label htmlFor="technology">¿Qué tecnología usas actualmente?</Label>
                <Textarea
                  id="technology"
                  value={responses.technology}
                  onChange={(e) => setResponses(prev => ({ ...prev, technology: e.target.value }))}
                  placeholder="Ej: Excel, WhatsApp para clientes, sin sitio web..."
                  rows={5}
                />
              </div>
            </div>
          )}

          {/* Step 8: Resumen */}
          {step === 8 && (
            <div className="space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">Resumen</h2>
                <p className="text-muted-foreground">Revisa tu información antes de continuar</p>
              </div>
              <div className="space-y-4">
                <div>
                  <span className="font-medium text-foreground">Empresa:</span>{' '}
                  <span className="text-muted-foreground">{companyName}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Industria:</span>{' '}
                  <span className="text-muted-foreground">{industry}</span>
                </div>
                <div>
                  <span className="font-medium text-foreground">Etapa:</span>{' '}
                  <span className="text-muted-foreground">{companySize}</span>
                </div>
              </div>
              <div className="bg-muted p-4 rounded-md">
                <p className="text-sm text-muted-foreground">
                  Al continuar, analizaremos tu información con IA para generar un diagnóstico personalizado 
                  y recomendaciones específicas para tu negocio.
                </p>
              </div>
            </div>
          )}

          {/* Navigation buttons */}
          <div className="flex items-center justify-between mt-8 pt-6 border-t border-border">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 1 || loading}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Atrás
            </Button>

            {step < totalSteps ? (
              <Button onClick={handleNext}>
                Siguiente
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? 'Analizando...' : 'Generar Diagnóstico'}
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
