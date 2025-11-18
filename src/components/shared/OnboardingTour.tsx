import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { Card } from "@/components/shared/Card";
import { Button } from "@/components/ui/button";
import { X, ArrowRight, ArrowLeft, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingStep {
  route: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "center";
}

const onboardingSteps: OnboardingStep[] = [
  {
    route: "/",
    title: "¡Bienvenido a Alasha AI!",
    description: "Tu asistente inteligente para el crecimiento empresarial. Aquí verás un resumen de todas tus métricas y progreso.",
    position: "center"
  },
  {
    route: "/",
    title: "Búsqueda Global",
    description: "Presiona Cmd+K (o Ctrl+K) en cualquier momento para buscar KPIs, tareas, documentos y navegar rápidamente.",
    position: "top"
  },
  {
    route: "/diagnosticos",
    title: "Diagnósticos Empresariales",
    description: "Inicia un diagnóstico conversacional para analizar tu negocio en 6 áreas clave y obtener un plan personalizado.",
    position: "center"
  },
  {
    route: "/kpis",
    title: "Métricas y KPIs",
    description: "Monitorea tus indicadores clave de rendimiento con gráficos y alertas automáticas.",
    position: "center"
  },
  {
    route: "/tasks",
    title: "Gestión de Tareas",
    description: "Organiza tu trabajo con tableros Kanban y vistas de Gantt para mantener el control de tu progreso.",
    position: "center"
  }
];

export function OnboardingTour() {
  const [isActive, setIsActive] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const location = useLocation();

  useEffect(() => {
    // Check if user has seen onboarding
    const hasSeenOnboarding = localStorage.getItem('alasha_onboarding_completed');
    if (!hasSeenOnboarding && location.pathname === '/') {
      // Start onboarding after a short delay
      const timer = setTimeout(() => setIsActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [location.pathname]);

  const handleNext = () => {
    if (currentStep < onboardingSteps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = () => {
    localStorage.setItem('alasha_onboarding_completed', 'true');
    setIsActive(false);
  };

  const handleSkip = () => {
    localStorage.setItem('alasha_onboarding_completed', 'true');
    setIsActive(false);
  };

  if (!isActive) return null;

  const step = onboardingSteps[currentStep];
  const isOnCorrectRoute = location.pathname === step.route;

  if (!isOnCorrectRoute) return null;

  return (
    <>
      {/* Overlay */}
      <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 animate-fade-in" />
      
      {/* Onboarding Card */}
      <div className={cn(
        "fixed z-50 animate-scale-in",
        step.position === "center" && "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
        step.position === "top" && "top-24 left-1/2 -translate-x-1/2",
        step.position === "bottom" && "bottom-24 left-1/2 -translate-x-1/2"
      )}>
        <Card variant="content" className="w-[90vw] max-w-md p-6 shadow-2xl border-2 border-primary/20">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-foreground">{step.title}</h3>
                <p className="text-xs text-muted-foreground">
                  Paso {currentStep + 1} de {onboardingSteps.length}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleSkip}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mb-6">
            {step.description}
          </p>

          {/* Progress Dots */}
          <div className="flex items-center justify-center gap-2 mb-4">
            {onboardingSteps.map((_, index) => (
              <div
                key={index}
                className={cn(
                  "h-2 rounded-full transition-all",
                  index === currentStep
                    ? "w-8 bg-primary"
                    : "w-2 bg-muted"
                )}
              />
            ))}
          </div>

          <div className="flex items-center justify-between gap-2">
            {currentStep > 0 ? (
              <Button
                variant="outline"
                onClick={handlePrevious}
                className="gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Anterior
              </Button>
            ) : (
              <Button
                variant="ghost"
                onClick={handleSkip}
                className="text-muted-foreground"
              >
                Saltar tutorial
              </Button>
            )}

            <Button onClick={handleNext} className="gap-2">
              {currentStep < onboardingSteps.length - 1 ? (
                <>
                  Siguiente
                  <ArrowRight className="h-4 w-4" />
                </>
              ) : (
                "Finalizar"
              )}
            </Button>
          </div>
        </Card>
      </div>
    </>
  );
}