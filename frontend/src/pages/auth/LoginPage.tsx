import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Bot, Shield, Target, BarChart3 } from 'lucide-react';


const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/user/dashboard');
    } catch (err: any) {
      console.error('Login error:', err);
      
      // Manejo específico de errores según el código de estado
      if (err.response?.status === 401) {
        setError('Credenciales incorrectas. Verifica tu email y contraseña.');
      } else if (err.response?.status === 404) {
        setError('Usuario no encontrado. Verifica tu email.');
      } else if (err.response?.status === 403) {
        setError('Cuenta desactivada. Contacta al administrador.');
      } else if (err.response?.status >= 500) {
        setError('Error del servidor. Intenta nuevamente más tarde.');
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Error al iniciar sesión. Intenta nuevamente.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-900 flex relative overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-500/20 rounded-full animate-pulse"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-cyan-400/20 rounded-lg rotate-45 animate-bounce"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-teal-500/15 rounded-full animate-pulse"></div>
        <div className="absolute bottom-32 right-10 w-28 h-28 bg-emerald-400/25 rounded-lg rotate-12"></div>
        <div className="absolute top-1/2 left-5 w-16 h-16 bg-cyan-300/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-emerald-300/25 rounded-lg rotate-45"></div>
      </div>

      {/* Left side - Welcome section */}
      <div className="hidden lg:flex w-1/2 p-8 xl:p-12 items-center justify-center relative z-10">
        <div className="max-w-lg text-center">
          {/* Logo */}
          <div className="mb-6 xl:mb-8">
            <div className="w-20 xl:w-24 h-20 xl:h-24 mx-auto bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3 border border-emerald-400/30">
              <Bot className="w-10 xl:w-12 h-10 xl:h-12 text-emerald-400" />
            </div>
          </div>
          
          <h2 className="text-5xl xl:text-6xl font-bold text-white mb-6 leading-tight">
            Bienvenido a
            <span className="block bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent">
              ProFitAgent
            </span>
          </h2>
          <p className="text-gray-300 text-lg xl:text-xl leading-relaxed mb-8">
            Plataforma de arbitraje automatizado con agentes IA especializados. Accede a tecnología de doble arbitraje cripto y surebet.
          </p>
          
          {/* Feature highlights */}
          <div className="space-y-6">
            <div className="bg-emerald-500/10 backdrop-blur-sm rounded-2xl p-4 border border-emerald-400/30">
              <div className="flex items-center justify-center text-emerald-300 mb-2">
                <Bot className="w-6 h-6 mr-3" />
                <span className="text-lg font-semibold">Agentes IA Automatizados</span>
              </div>
              <p className="text-gray-400 text-sm">Algoritmos avanzados operando 24/7</p>
            </div>
            
            <div className="bg-cyan-500/10 backdrop-blur-sm rounded-2xl p-4 border border-cyan-400/30">
              <div className="flex items-center justify-center text-cyan-300 mb-2">
                <Target className="w-6 h-6 mr-3" />
                <span className="text-lg font-semibold">Doble Arbitraje Simultáneo</span>
              </div>
              <p className="text-gray-400 text-sm">Cripto + Surebet en una sola plataforma</p>
            </div>
            
            <div className="bg-teal-500/10 backdrop-blur-sm rounded-2xl p-4 border border-teal-400/30">
              <div className="flex items-center justify-center text-teal-300 mb-2">
                <BarChart3 className="w-6 h-6 mr-3" />
                <span className="text-lg font-semibold">Licencias Tecnológicas</span>
              </div>
              <p className="text-gray-400 text-sm">Acceso a infraestructura profesional</p>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Login form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-6 sm:mb-8">
            <div className="inline-flex items-center justify-center w-14 sm:w-16 h-14 sm:h-16 bg-gradient-to-r from-emerald-500 to-cyan-400 rounded-2xl mb-3 sm:mb-4 shadow-lg border border-emerald-400/30">
              <Bot className="w-7 sm:w-8 h-7 sm:h-8 text-emerald-400" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-300 bg-clip-text text-transparent mb-2">
              ProFitAgent
            </h1>
            <p className="text-gray-300 text-xs sm:text-sm">
              Arbitraje Automatizado con IA
            </p>
          </div>

          {/* Glass morphism card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl sm:rounded-3xl shadow-2xl p-6 sm:p-8">
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
                Iniciar Sesión
              </h2>
              <p className="text-gray-300 text-sm sm:text-base">
                Accede a tu cuenta y gestiona tus licencias de arbitraje
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
                    <span className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                      </svg>
                      Email
                    </span>
                  </label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu@email.com"
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white placeholder-gray-400"
                  />
                </div>
                
                <div>
                  <label htmlFor="password" className="block text-sm font-semibold text-white mb-2">
                    <span className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      Contraseña
                    </span>
                  </label>
                  <Input
                    id="password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Tu contraseña"
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white placeholder-gray-400"
                  />
                </div>

                {error && (
                  <div className="bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm flex items-center">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {error}
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-600 hover:to-cyan-600 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none border border-emerald-400/30"
                >
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Iniciando sesión...
                    </>
                  ) : (
                    <>
                      <Shield className="h-5 w-5 mr-2" />
                      Acceder a ProFitAgent
                    </>
                  )}
                </Button>

                <div className="text-center mt-6">
                  <Link
                    to="/forgot-password"
                    className="text-sm text-emerald-400 hover:text-emerald-300 transition-colors duration-200 font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </Link>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center">
                  <div className="flex-1 border-t border-white/20"></div>
                  <div className="px-4 text-sm text-gray-400 font-medium">o</div>
                  <div className="flex-1 border-t border-white/20"></div>
                </div>
                
                <div className="flex flex-col space-y-3">
                  <Link
                    to="/register"
                    className="group flex items-center justify-center py-3 px-4 border-2 border-emerald-400/30 rounded-xl text-sm font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all duration-200 backdrop-blur-sm"
                  >
                    <svg className="h-4 w-4 mr-2 text-emerald-400 group-hover:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    ¿No tienes cuenta? Regístrate aquí
                  </Link>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

