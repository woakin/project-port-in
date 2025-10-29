import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { ProjectProvider } from "./contexts/ProjectContext";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ForgotPassword from "./pages/ForgotPassword";
import Onboarding from "./pages/Onboarding";
import ChatDiagnosis from "./pages/ChatDiagnosis";
import DiagnosisResults from "./pages/DiagnosisResults";
import Plans from "./pages/Plans";
import PlanView from "./pages/PlanView";
import Tasks from "./pages/Tasks";
import Admin from "./pages/Admin";
import NotFound from "./pages/NotFound";
import Projects from "./pages/Projects";
import Diagnosticos from "./pages/Diagnosticos";
import Documents from "./pages/Documents";
import KPIs from "./pages/KPIs";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <ProjectProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/auth/forgot-password" element={<ForgotPassword />} />
            <Route path="/onboarding" element={<Onboarding />} />
            <Route path="/chat-diagnosis" element={<ChatDiagnosis />} />
            <Route path="/diagnosis/:id" element={<DiagnosisResults />} />
            <Route path="/plans" element={<Plans />} />
            <Route path="/plans/:id" element={<PlanView />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/diagnosticos" element={<Diagnosticos />} />
            <Route path="/documents" element={<Documents />} />
            <Route path="/kpis" element={<KPIs />} />
            <Route path="/admin" element={<Admin />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </ProjectProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
