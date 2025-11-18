import { useLocation, Link } from "react-router-dom";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Home } from "lucide-react";

const routeLabels: Record<string, string> = {
  "/": "Dashboard",
  "/kpis": "KPIs",
  "/tasks": "Tareas",
  "/plans": "Planes",
  "/documents": "Documentos",
  "/chat": "Chat IA",
  "/chat-diagnosis": "Diagnóstico",
  "/voice-diagnosis": "Diagnóstico por Voz",
  "/diagnosticos": "Diagnósticos",
  "/projects": "Proyectos",
  "/admin": "Administración",
};

export function Breadcrumbs() {
  const location = useLocation();
  const pathSegments = location.pathname.split("/").filter(Boolean);

  // Si estamos en la home, no mostrar breadcrumbs
  if (location.pathname === "/") {
    return null;
  }

  // Construir el path acumulativo para cada segmento
  const breadcrumbItems = pathSegments.map((segment, index) => {
    const path = `/${pathSegments.slice(0, index + 1).join("/")}`;
    const label = routeLabels[path] || segment.charAt(0).toUpperCase() + segment.slice(1);
    const isLast = index === pathSegments.length - 1;

    return {
      path,
      label,
      isLast,
    };
  });

  // Si estamos en chat-diagnosis, agregar área actual como breadcrumb
  if (location.pathname === '/chat-diagnosis') {
    const currentArea = sessionStorage.getItem('current_diagnosis_area');
    const areaLabels: Record<string, string> = {
      strategy: 'Estrategia',
      operations: 'Operaciones',
      finance: 'Finanzas',
      marketing: 'Marketing',
      legal: 'Legal',
      technology: 'Tecnología'
    };
    
    if (currentArea && areaLabels[currentArea]) {
      breadcrumbItems.push({
        path: '/chat-diagnosis',
        label: areaLabels[currentArea],
        isLast: true
      });
      // Marcar el anterior como no último
      if (breadcrumbItems.length > 1) {
        breadcrumbItems[breadcrumbItems.length - 2].isLast = false;
      }
    }
  }

  return (
    <Breadcrumb>
      <BreadcrumbList>
        <BreadcrumbItem>
          <BreadcrumbLink asChild>
            <Link to="/" className="flex items-center gap-1">
              <Home className="h-3.5 w-3.5" />
              <span>Inicio</span>
            </Link>
          </BreadcrumbLink>
        </BreadcrumbItem>

        {breadcrumbItems.map((item) => (
          <div key={item.path} className="flex items-center gap-1.5">
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              {item.isLast ? (
                <BreadcrumbPage>{item.label}</BreadcrumbPage>
              ) : (
                <BreadcrumbLink asChild>
                  <Link to={item.path}>{item.label}</Link>
                </BreadcrumbLink>
              )}
            </BreadcrumbItem>
          </div>
        ))}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
