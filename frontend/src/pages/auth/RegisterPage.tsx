import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';


const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [sponsorCode, setSponsorCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isReferralCode, setIsReferralCode] = useState(false);
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

    try {
      await register(email, password, sponsorCode, firstName, lastName);
      navigate('/user/dashboard');
    } catch (err: any) {
      setError(err.message || 'Error al registrar usuario');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex relative overflow-hidden">
      {/* Geometric background pattern */}
      <div className="absolute inset-0">
        <div className="absolute top-10 left-10 w-32 h-32 bg-emerald-200/30 rounded-full"></div>
        <div className="absolute top-32 right-20 w-24 h-24 bg-teal-200/40 rounded-lg rotate-45"></div>
        <div className="absolute bottom-20 left-1/4 w-40 h-40 bg-cyan-200/20 rounded-full"></div>
        <div className="absolute bottom-32 right-10 w-28 h-28 bg-emerald-300/25 rounded-lg rotate-12"></div>
        {/* Additional floating elements */}
        <div className="absolute top-1/2 left-5 w-16 h-16 bg-teal-300/20 rounded-full animate-pulse"></div>
        <div className="absolute top-1/3 right-1/3 w-20 h-20 bg-emerald-200/25 rounded-lg rotate-45"></div>
      </div>

      {/* Left side - Welcome section */}
      <div className="hidden lg:flex w-1/2 p-12 items-center justify-center relative z-10">
        <div className="max-w-lg text-center">
          {/* Logo */}
          <div className="mb-8">
            <div className="w-24 h-24 mx-auto bg-gradient-to-r from-emerald-500 to-teal-500 rounded-3xl flex items-center justify-center shadow-2xl transform rotate-3">
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
          </div>
          
          <h2 className="text-6xl font-bold text-gray-800 mb-6 leading-tight">
            Únete a
            <span className="block bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent">
              Grow5X
            </span>
          </h2>
          <p className="text-gray-600 text-xl leading-relaxed mb-8">
            Crea tu cuenta y comienza a generar ingresos pasivos con nuestras licencias tecnológicas avanzadas.
          </p>
          
          {/* Feature highlights */}
          <div className="space-y-4">
            <div className="flex items-center justify-center text-gray-600">
              <div className="w-3 h-3 bg-emerald-400 rounded-full mr-4"></div>
              <span className="text-lg">Registro rápido y seguro</span>
            </div>
            <div className="flex items-center justify-center text-gray-600">
              <div className="w-3 h-3 bg-teal-400 rounded-full mr-4"></div>
              <span className="text-lg">Acceso inmediato a licencias</span>
            </div>
            <div className="flex items-center justify-center text-gray-600">
              <div className="w-3 h-3 bg-emerald-400 rounded-full mr-4"></div>
              <span className="text-lg">Sistema de referidos incluido</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Register form */}
      <div className="flex-1 flex items-center justify-center p-6 sm:p-12 relative z-10">
        <div className="w-full max-w-md">
          {/* Mobile header */}
          <div className="lg:hidden text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-emerald-500 to-teal-500 rounded-2xl mb-4 shadow-lg">
              <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-2">
              Grow5X
            </h1>
            <p className="text-gray-600 text-sm">
              Plataforma de licencias tecnológicas
            </p>
          </div>

          {/* Clean white card */}
          <div className="bg-white rounded-3xl shadow-2xl border border-gray-100 p-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Crear Cuenta
              </h2>
              <p className="text-sm text-gray-600">
                Únete a la plataforma de licencias tecnológicas
              </p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Nombre
                    </span>
                  </label>
                  <Input
                    id="firstName"
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Juan"
                    className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 rounded-xl bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="lastName" className="block text-sm font-semibold text-gray-700 mb-2">
                    <span className="flex items-center">
                      <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      Apellido
                    </span>
                  </label>
                  <Input
                    id="lastName"
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Pérez"
                    className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 rounded-xl bg-gray-50 focus:bg-white transition-colors"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 rounded-xl bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                    Contraseña
                  </span>
                </label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className="h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 rounded-xl bg-gray-50 focus:bg-white transition-colors"
                />
              </div>

              <div>
                <label htmlFor="sponsorCode" className="block text-sm font-semibold text-gray-700 mb-2">
                  <span className="flex items-center">
                    <svg className="h-4 w-4 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
                  onChange={(e) => !isReferralCode && setSponsorCode(e.target.value.toUpperCase())}
                  placeholder={isReferralCode ? "Código de referido prellenado" : "SPONSOR"}
                  disabled={isReferralCode}
                  className={`h-12 border-gray-200 focus:border-emerald-400 focus:ring-emerald-400 rounded-xl transition-colors ${
                    isReferralCode 
                      ? 'bg-gray-100 text-gray-700 cursor-not-allowed' 
                      : 'bg-gray-50 focus:bg-white'
                  }`}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {isReferralCode 
                    ? "Código de referido detectado automáticamente" 
                    : "Código de referencia de tu sponsor (obligatorio)"}
                </p>
              </div>
            </div>

            {error && (
              <div className="rounded-xl bg-red-50 border border-red-200 p-4">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-red-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <p className="text-sm font-medium text-red-800">
                      {error}
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                    Crear Cuenta
                  </>
                )}
              </Button>
            </div>
          </form>
          </div>

          <div className="space-y-4">
            <div className="flex items-center">
              <div className="flex-1 border-t border-gray-200"></div>
              <div className="px-4 text-sm text-gray-500 font-medium">o</div>
              <div className="flex-1 border-t border-gray-200"></div>
            </div>
            
            <div className="flex flex-col space-y-3">
              <Link
                to="/login"
                className="group flex items-center justify-center py-3 px-4 border-2 border-emerald-200 rounded-xl text-sm font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hover:border-emerald-300 transition-all duration-200"
              >
                <svg className="h-4 w-4 mr-2 text-emerald-600 group-hover:text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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