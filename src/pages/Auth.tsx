import { useState } from 'react';
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/shared/Card';
import { Chrome } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import alashaLogo from "@/assets/alasha-logo.png";
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().email('Email inválido').trim().toLowerCase(),
  password: z.string().min(8, 'Contraseña debe tener al menos 8 caracteres')
});

const signupSchema = z.object({
  email: z.string().email('Email inválido').trim().toLowerCase(),
  fullName: z.string().min(2, 'Nombre muy corto').max(100, 'Nombre muy largo').trim(),
  password: z.string()
    .min(8, 'Mínimo 8 caracteres')
    .regex(/[A-Z]/, 'Requiere al menos una mayúscula')
    .regex(/[0-9]/, 'Requiere al menos un número')
});

export default function Auth() {
  const { user, signIn, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultTab = searchParams.get('tab') === 'signup' ? 'signup' : 'login';
  
  // Login state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginErrors, setLoginErrors] = useState<{ email?: string; password?: string }>({});
  
  // Signup state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupFullName, setSignupFullName] = useState('');
  const [signupLoading, setSignupLoading] = useState(false);
  const [signupErrors, setSignupErrors] = useState<{ email?: string; password?: string; fullName?: string }>({});

  // Redirect if already authenticated
  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginErrors({});
    
    // Validate inputs
    const result = loginSchema.safeParse({ email: loginEmail, password: loginPassword });
    if (!result.success) {
      const errors: { email?: string; password?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as 'email' | 'password'] = err.message;
      });
      setLoginErrors(errors);
      return;
    }
    
    setLoginLoading(true);
    
    const { error } = await signIn(result.data.email, loginPassword);
    
    if (!error) {
      // Get current session to access user ID immediately
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Now query with the correct user ID
        const { data: profile } = await supabase
          .from('profiles')
          .select('company_id')
          .eq('id', session.user.id)
          .single();
        
        if (profile?.company_id) {
          navigate('/');
        } else {
          navigate('/chat-diagnosis');
        }
      } else {
        // Fallback if no session for some reason
        navigate('/chat-diagnosis');
      }
    }
    
    setLoginLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignupErrors({});
    
    // Validate inputs
    const result = signupSchema.safeParse({ 
      email: signupEmail, 
      password: signupPassword, 
      fullName: signupFullName 
    });
    if (!result.success) {
      const errors: { email?: string; password?: string; fullName?: string } = {};
      result.error.errors.forEach(err => {
        if (err.path[0]) errors[err.path[0] as 'email' | 'password' | 'fullName'] = err.message;
      });
      setSignupErrors(errors);
      return;
    }
    
    setSignupLoading(true);
    
    const { error } = await signUp(result.data.email, signupPassword, result.data.fullName);
    
    if (!error) {
      // New users go directly to chat diagnosis
      navigate('/chat-diagnosis');
    }
    
    setSignupLoading(false);
  };

  const handleGoogleAuth = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
        }
      });

      if (error) throw error;
    } catch (error: any) {
      toast({
        title: 'Error con Google',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground">Cargando...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-xl overflow-hidden shadow-lg">
            <img src={alashaLogo} alt="Alasha AI Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">Bienvenido a Alasha AI</h1>
          <p className="text-muted-foreground">Tu plataforma de inteligencia empresarial</p>
        </div>

        <Card variant="content">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="login">Iniciar Sesión</TabsTrigger>
              <TabsTrigger value="signup">Registrarse</TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Correo electrónico</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={loginEmail}
                    onChange={(e) => {
                      setLoginEmail(e.target.value);
                      setLoginErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    required
                  />
                  {loginErrors.email && (
                    <p className="text-xs text-destructive">{loginErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Contraseña</Label>
                  <Input
                    id="login-password"
                    type="password"
                    placeholder="••••••••"
                    value={loginPassword}
                    onChange={(e) => {
                      setLoginPassword(e.target.value);
                      setLoginErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    required
                  />
                  {loginErrors.password && (
                    <p className="text-xs text-destructive">{loginErrors.password}</p>
                  )}
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={loginLoading}
                >
                  {loginLoading ? 'Iniciando sesión...' : 'Iniciar Sesión'}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      o continuar con
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleAuth}
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => navigate('/auth/forgot-password')}
                >
                  ¿Olvidaste tu contraseña?
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Nombre completo</Label>
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="Juan Pérez"
                    value={signupFullName}
                    onChange={(e) => {
                      setSignupFullName(e.target.value);
                      setSignupErrors(prev => ({ ...prev, fullName: undefined }));
                    }}
                    required
                  />
                  {signupErrors.fullName && (
                    <p className="text-xs text-destructive">{signupErrors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-email">Correo electrónico</Label>
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="tu@email.com"
                    value={signupEmail}
                    onChange={(e) => {
                      setSignupEmail(e.target.value);
                      setSignupErrors(prev => ({ ...prev, email: undefined }));
                    }}
                    required
                  />
                  {signupErrors.email && (
                    <p className="text-xs text-destructive">{signupErrors.email}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="signup-password">Contraseña</Label>
                  <Input
                    id="signup-password"
                    type="password"
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => {
                      setSignupPassword(e.target.value);
                      setSignupErrors(prev => ({ ...prev, password: undefined }));
                    }}
                    required
                  />
                  {signupErrors.password && (
                    <p className="text-xs text-destructive">{signupErrors.password}</p>
                  )}
                  <p className="text-xs text-muted-foreground">Mínimo 8 caracteres, incluye mayúscula y número</p>
                </div>

                <Button 
                  type="submit" 
                  className="w-full"
                  disabled={signupLoading}
                >
                  {signupLoading ? 'Creando cuenta...' : 'Crear Cuenta'}
                </Button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-border" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                      o continuar con
                    </span>
                  </div>
                </div>

                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleGoogleAuth}
                >
                  <Chrome className="mr-2 h-4 w-4" />
                  Google
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}
