import { 
  LayoutDashboard, 
  TrendingUp, 
  CheckSquare, 
  FileText, 
  MessageSquare, 
  Stethoscope,
  FolderKanban,
  ChevronRight
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  useSidebar,
} from "@/components/ui/sidebar";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useState } from "react";

const navigationItems = [
  {
    title: "Dashboard",
    url: "/",
    icon: LayoutDashboard,
    description: "Vista general de métricas y estado"
  }
];

const analysisItems = [
  {
    title: "KPIs",
    url: "/kpis",
    icon: TrendingUp,
    description: "Indicadores clave de rendimiento"
  },
  {
    title: "Diagnósticos",
    url: "/diagnosticos",
    icon: Stethoscope,
    description: "Análisis empresariales completos"
  }
];

const managementItems = [
  {
    title: "Tareas",
    url: "/tasks",
    icon: CheckSquare,
    description: "Gestión de tareas y actividades"
  },
  {
    title: "Planes",
    url: "/plans",
    icon: FolderKanban,
    description: "Planes de acción estratégicos"
  },
  {
    title: "Documentos",
    url: "/documents",
    icon: FileText,
    description: "Repositorio de documentos"
  }
];

const assistantItems = [
  {
    title: "Chat IA",
    url: "/chat",
    icon: MessageSquare,
    description: "Asistente conversacional"
  }
];

interface NavItemProps {
  item: {
    title: string;
    url: string;
    icon: React.ComponentType<{ className?: string }>;
    description: string;
  };
  isActive: boolean;
  isCollapsed: boolean;
}

function NavItem({ item, isActive, isCollapsed }: NavItemProps) {
  const menuButton = (
    <SidebarMenuButton asChild isActive={isActive}>
      <Link to={item.url} className="flex items-center gap-3">
        <item.icon className="h-4 w-4 flex-shrink-0" />
        {!isCollapsed && <span>{item.title}</span>}
      </Link>
    </SidebarMenuButton>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{menuButton}</TooltipTrigger>
        <TooltipContent side="right" className="flex flex-col gap-1">
          <span className="font-semibold">{item.title}</span>
          <span className="text-xs text-muted-foreground">{item.description}</span>
        </TooltipContent>
      </Tooltip>
    );
  }

  return menuButton;
}

export function AppSidebar() {
  const { open: sidebarOpen } = useSidebar();
  const location = useLocation();
  const currentPath = location.pathname;
  
  const [analysisOpen, setAnalysisOpen] = useState(
    analysisItems.some(item => currentPath === item.url)
  );
  const [managementOpen, setManagementOpen] = useState(
    managementItems.some(item => currentPath === item.url)
  );
  const [assistantOpen, setAssistantOpen] = useState(
    assistantItems.some(item => currentPath === item.url)
  );

  const isCollapsed = !sidebarOpen;

  return (
    <TooltipProvider delayDuration={0}>
      <Sidebar collapsible="icon" className="border-r">
        <SidebarHeader className="border-b px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img 
              src="/src/assets/alasha-logo.png" 
              alt="Alasha" 
              className="h-8 w-8 object-contain"
            />
            {!isCollapsed && (
              <span className="font-bold text-lg">Alasha AI</span>
            )}
          </Link>
        </SidebarHeader>

        <SidebarContent>
          {/* Principal */}
          <SidebarGroup>
            {!isCollapsed && <SidebarGroupLabel>Principal</SidebarGroupLabel>}
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.url}>
                    <NavItem 
                      item={item} 
                      isActive={currentPath === item.url}
                      isCollapsed={isCollapsed}
                    />
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Análisis y Métricas */}
          <Collapsible open={analysisOpen} onOpenChange={setAnalysisOpen}>
            <SidebarGroup>
              {!isCollapsed ? (
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1">
                    <span>Análisis y Métricas</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${analysisOpen ? 'rotate-90' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              ) : (
                <SidebarGroupLabel />
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {analysisItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <NavItem 
                          item={item} 
                          isActive={currentPath === item.url}
                          isCollapsed={isCollapsed}
                        />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          {/* Gestión */}
          <Collapsible open={managementOpen} onOpenChange={setManagementOpen}>
            <SidebarGroup>
              {!isCollapsed ? (
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1">
                    <span>Gestión</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${managementOpen ? 'rotate-90' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              ) : (
                <SidebarGroupLabel />
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {managementItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <NavItem 
                          item={item} 
                          isActive={currentPath === item.url}
                          isCollapsed={isCollapsed}
                        />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>

          {/* Asistente IA */}
          <Collapsible open={assistantOpen} onOpenChange={setAssistantOpen}>
            <SidebarGroup>
              {!isCollapsed ? (
                <CollapsibleTrigger className="w-full">
                  <SidebarGroupLabel className="flex items-center justify-between cursor-pointer hover:bg-accent/50 rounded-md px-2 py-1">
                    <span>Asistente IA</span>
                    <ChevronRight className={`h-4 w-4 transition-transform ${assistantOpen ? 'rotate-90' : ''}`} />
                  </SidebarGroupLabel>
                </CollapsibleTrigger>
              ) : (
                <SidebarGroupLabel />
              )}
              <CollapsibleContent>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {assistantItems.map((item) => (
                      <SidebarMenuItem key={item.url}>
                        <NavItem 
                          item={item} 
                          isActive={currentPath === item.url}
                          isCollapsed={isCollapsed}
                        />
                      </SidebarMenuItem>
                    ))}
                  </SidebarMenu>
                </SidebarGroupContent>
              </CollapsibleContent>
            </SidebarGroup>
          </Collapsible>
        </SidebarContent>
      </Sidebar>
    </TooltipProvider>
  );
}
