import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Shield, Bot, Users, Award, Eye, EyeOff, Zap, TrendingUp, Star } from 'lucide-react';


const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [first_name, setFirst_name] = useState('');
  const [last_name, setLast_name] = useState('');
  const [sponsorCode, setSponsorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReferralCode, setIsReferralCode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  // Detectar parámetro 'ref' en la URL y prellenar el código de sponsor
  useEffect(() => {
    const refCode = searchParams.get('ref');
    if (refCode) {
      setSponsorCode(refCode.toUpperCase());
      setIsReferralCode(true);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // Validaciones
    if (password !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      setLoading(false);
      return;
    }

    if (!sponsorCode.trim()) {
      setError('El código de sponsor es obligatorio');
      setLoading(false);
      return;
    }

    if (!acceptTerms) {
      setError('Debes aceptar los términos y condiciones');
      setLoading(false);
      return;
    }

    try {
      await register(email, password, sponsorCode, first_name, last_name);
      navigate('/user/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black flex relative overflow-hidden">
      {/* Animated Background */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-blue-500/10"></div>
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/20 rounded-full filter blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/20 rounded-full filter blur-3xl animate-pulse animation-delay-2000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-500/10 rounded-full filter blur-3xl animate-pulse animation-delay-4000"></div>
      </div>

      {/* Left side - Welcome section */}
      <div className="hidden lg:flex w-1/2 p-12 items-center justify-center relative z-10">
        <div className="max-w-lg text-center">
          {/* Enhanced Logo */}
          <div className="mb-8 relative">
            {/* Outer glow ring */}
            <div className="absolute inset-0 w-32 h-32 mx-auto bg-gradient-to-r from-emerald-400/30 to-cyan-400/30 rounded-full blur-xl animate-pulse"></div>
            
            {/* Main logo container */}
            <div className="relative w-28 h-28 mx-auto bg-gradient-to-br from-emerald-500 via-emerald-400 to-cyan-500 rounded-3xl flex items-center justify-center shadow-2xl transform hover:rotate-6 transition-all duration-500 border-2 border-emerald-300/50 hover:border-emerald-300/80">
              {/* Inner gradient overlay */}
              <div className="absolute inset-2 bg-gradient-to-tr from-white/20 to-transparent rounded-2xl"></div>
              
              {/* Multiple icon layers for depth */}
              <div className="relative flex items-center justify-center">
                {/* Background accent icons */}
                <TrendingUp className="absolute w-6 h-6 text-emerald-200/40 transform -rotate-12 translate-x-2 translate-y-2" />
                <Zap className="absolute w-5 h-5 text-cyan-200/40 transform rotate-45 -translate-x-2 -translate-y-1" />
                
                {/* Main shield icon */}
                <Shield className="w-14 h-14 text-white drop-shadow-lg relative z-10" />
                
                {/* Accent star */}
                <Star className="absolute w-4 h-4 text-yellow-300 transform translate-x-4 -translate-y-4 animate-pulse" />
              </div>
              
              {/* Floating particles effect */}
              <div className="absolute -top-1 -right-1 w-2 h-2 bg-emerald-300 rounded-full animate-bounce animation-delay-1000"></div>
              <div className="absolute -bottom-1 -left-1 w-1.5 h-1.5 bg-cyan-300 rounded-full animate-bounce animation-delay-2000"></div>
            </div>
            
            {/* Orbiting elements */}
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-40 h-40">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-3 h-3 bg-emerald-400 rounded-full animate-spin" style={{animationDuration: '8s'}}></div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-cyan-400 rounded-full animate-spin" style={{animationDuration: '6s', animationDirection: 'reverse'}}></div>
            </div>
          </div>
          
          <h2 className="text-6xl font-bold text-white mb-6 leading-tight">
            Únete a
            <span className="block bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              ProFitAgent
            </span>
          </h2>
          <p className="text-gray-300 text-xl leading-relaxed mb-8">
            Crea tu cuenta y comienza a generar ingresos automáticos con nuestros agentes de IA especializados en arbitraje.
          </p>
          
          {/* Feature highlights */}
          <div className="space-y-4">
            <div className="flex items-center justify-center text-gray-300">
              <Bot className="w-5 h-5 text-emerald-400 mr-4" />
              <span className="text-lg">Arbitraje automatizado 24/7</span>
            </div>
            <div className="flex items-center justify-center text-gray-300">
              <Bot className="w-5 h-5 text-cyan-400 mr-4" />
              <span className="text-lg">Agentes IA especializados</span>
            </div>
            <div className="flex items-center justify-center text-gray-300">
              <Users className="w-5 h-5 text-emerald-400 mr-4" />
              <span className="text-lg">Sistema de referidos incluido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Enhanced Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative inline-block mb-4">
              {/* Mobile glow effect */}
              <div className="absolute inset-0 w-20 h-20 bg-gradient-to-r from-emerald-400/40 to-cyan-400/40 rounded-2xl blur-lg animate-pulse"></div>
              
              {/* Mobile logo container */}
              <div className="relative w-18 h-18 bg-gradient-to-br from-emerald-500 via-emerald-400 to-cyan-500 rounded-2xl flex items-center justify-center shadow-xl border-2 border-emerald-300/50">
                {/* Inner shine */}
                <div className="absolute inset-1 bg-gradient-to-tr from-white/25 to-transparent rounded-xl"></div>
                
                {/* Icon composition */}
                <div className="relative">
                  <TrendingUp className="absolute w-4 h-4 text-emerald-200/50 transform -rotate-12 translate-x-1 translate-y-1" />
                  <Shield className="w-9 h-9 text-white drop-shadow-md relative z-10" />
                  <Star className="absolute w-2.5 h-2.5 text-yellow-300 transform translate-x-3 -translate-y-3 animate-pulse" />
                </div>
              </div>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent mb-2">
              ProFitAgent
            </h1>
            <p className="text-gray-300 text-sm">
              Plataforma de arbitraje automatizado con IA
            </p>
          </div>

          {/* Glass morphism card */}
          <div className="bg-white/5 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/10 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-white mb-2">
                Crear Cuenta
              </h2>
              <p className="text-sm text-gray-300">
                Únete a la revolución del arbitraje automatizado
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-semibold text-white mb-2">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-emerald-400" />
                      Nombre
                    </span>
                  </label>
                  <Input
                    id="first_name"
                    name="first_name"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={first_name}
                    onChange={(e) => setFirst_name(e.target.value)}
                    placeholder="Juan"
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white placeholder-gray-400"
                  />
                </div>
                <div>
                  <label htmlFor="last_name" className="block text-sm font-semibold text-white mb-2">
                    <span className="flex items-center">
                      <Users className="h-4 w-4 mr-2 text-emerald-400" />
                      Apellido
                    </span>
                  </label>
                  <Input
                    id="last_name"
                    name="last_name"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={last_name}
                    onChange={(e) => setLast_name(e.target.value)}
                    placeholder="Pérez"
                    className="w-full px-4 py-3 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white placeholder-gray-400"
                  />
                </div>
              </div>

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
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full px-4 py-3 pr-12 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-white mb-2">
                  <span className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Confirmar Contraseña
                  </span>
                </label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirma tu contraseña"
                    className="w-full px-4 py-3 pr-12 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 bg-white/5 backdrop-blur-sm hover:bg-white/10 text-white placeholder-gray-400"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-white transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label htmlFor="sponsorCode" className="block text-sm font-semibold text-white mb-2">
                  <span className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    Código de Sponsor *
                  </span>
                </label>
                <Input
                  id="sponsorCode"
                  name="sponsorCode"
                  type="text"
                  required
                  value={sponsorCode}
                  onChange={(e) => setSponsorCode(e.target.value)}
                  placeholder={isReferralCode ? "Código de sponsor prellenado" : "Ingresa el código de sponsor"}
                  disabled={isReferralCode}
                  className={`w-full px-4 py-3 border border-white/20 rounded-xl focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 transition-all duration-200 text-white placeholder-gray-400 ${
                    isReferralCode 
                      ? 'bg-white/10 cursor-not-allowed opacity-70' 
                      : 'bg-white/5 backdrop-blur-sm hover:bg-white/10'
                  }`}
                />
                <p className="text-xs text-gray-400 mt-1">
                  {isReferralCode 
                    ? "Código de sponsor detectado automáticamente" 
                    : "Obligatorio: Ingresa el código de sponsor para registrarte"}
                </p>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-400/30 text-red-300 px-4 py-3 rounded-xl text-sm backdrop-blur-sm flex items-center">
                <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {error}
              </div>
            )}

            <div className="flex items-start space-x-3">
              <div className="flex items-center h-5">
                <input
                  id="acceptTerms"
                  name="acceptTerms"
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 bg-white/10 border-white/20 rounded focus:ring-emerald-500 focus:ring-2"
                />
              </div>
              <div className="text-sm">
                <label htmlFor="acceptTerms" className="text-gray-300">
                  Acepto los{' '}
                  <Link
                    to="/terms"
                    className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
                    target="_blank"
                  >
                    términos y condiciones
                  </Link>
                  {' '}y la{' '}
                  <Link
                    to="/privacy"
                    className="text-emerald-400 hover:text-emerald-300 underline transition-colors"
                    target="_blank"
                  >
                    política de privacidad
                  </Link>
                </label>
              </div>
            </div>

            <div>
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
                    Creando cuenta...
                  </>
                ) : (
                  <>
                    <Award className="h-5 w-5 mr-2" />
                    Unirse a ProFitAgent
                  </>
                )}
              </Button>
            </div>
          </form>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-1 border-t border-white/20"></div>
              <div className="px-4 text-sm text-gray-400 font-medium">o</div>
              <div className="flex-1 border-t border-white/20"></div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Link
                to="/login"
                className="group flex items-center justify-center py-3 px-4 border-2 border-emerald-400/30 rounded-xl text-sm font-semibold text-emerald-300 bg-emerald-500/10 hover:bg-emerald-500/20 hover:border-emerald-400/50 transition-all duration-200 backdrop-blur-sm"
              >
                <svg className="h-4 w-4 mr-2 text-emerald-400 group-hover:text-emerald-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                </svg>
                ¿Ya tienes cuenta? Inicia sesión aquí
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
