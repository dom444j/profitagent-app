import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, TrendingUp, Shield, Users, Zap, Clock, Star } from 'lucide-react';
import Grow5xLogo from '../components/ui/Grow5xLogo';

const LandingPage: React.FC = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(50)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-blue-400/30 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`,
                animationDuration: `${2 + Math.random() * 3}s`
              }}
            />
          ))}
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Mouse Follow Effect */}
        <div 
          className="absolute w-96 h-96 bg-blue-400/5 rounded-full blur-3xl transition-all duration-1000 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
        
        {/* Grid Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `
              linear-gradient(rgba(59, 130, 246, 0.1) 1px, transparent 1px),
              linear-gradient(90deg, rgba(59, 130, 246, 0.1) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }} />
        </div>
        
        {/* Animated Lines */}
        <div className="absolute inset-0">
          <div className="absolute top-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent animate-pulse" />
          <div className="absolute bottom-0 left-0 w-full h-px bg-gradient-to-r from-transparent via-indigo-400/50 to-transparent animate-pulse" style={{ animationDelay: '1s' }} />
          <div className="absolute top-0 left-0 w-px h-full bg-gradient-to-b from-transparent via-purple-400/50 to-transparent animate-pulse" style={{ animationDelay: '2s' }} />
          <div className="absolute top-0 right-0 w-px h-full bg-gradient-to-b from-transparent via-blue-400/50 to-transparent animate-pulse" style={{ animationDelay: '3s' }} />
        </div>
      </div>
      
      {/* Content Wrapper */}
      <div className="relative z-10">
      {/* Header */}
      <header className="relative z-10 px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Grow5xLogo size="md" variant="white" />
            </div>
            <h1 className="text-2xl font-bold text-white">Grow5X</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Link 
              to="/login" 
              className="px-6 py-2 text-white border border-white/20 rounded-lg hover:bg-white/10 transition-all duration-300"
            >
              Iniciar Sesión
            </Link>
            <Link 
              to="/register" 
              className="px-6 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-lg"
            >
              Registrarse
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative px-6 py-20">
        <div className="max-w-7xl mx-auto text-center">
          <div className="mb-8">
            <span className="inline-block px-4 py-2 bg-blue-500/20 text-blue-300 rounded-full text-sm font-semibold mb-6">
              🚀 Plataforma de Herramientas Tecnológicas con IA
            </span>
            <h1 className="text-5xl md:text-7xl font-bold text-white mb-6">
              Grow5X
              <span className="block text-3xl md:text-4xl bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mt-2">
                Multiplicando Posibilidades con IA
              </span>
            </h1>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              Accede a <strong>agentes de IA especializados</strong> para arbitraje automatizado de criptomonedas. 
              Tecnología propietaria que democratiza el acceso a herramientas profesionales de trading.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mb-12">
            <div className="flex items-center gap-2 text-green-400">
              <Shield className="w-5 h-5" />
              <span>Tecnología Blockchain BEP20</span>
            </div>
            <div className="flex items-center gap-2 text-blue-400">
              <Bot className="w-5 h-5" />
              <span>Agentes IA Propietarios</span>
            </div>
            <div className="flex items-center gap-2 text-purple-400">
              <Zap className="w-5 h-5" />
              <span>Automatización 24/7</span>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content - Two Projects */}
      <section className="px-6 py-16">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            
            {/* Proyecto x5 - En Construcción */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-orange-500/20 text-orange-300 px-3 py-1 rounded-full text-sm font-semibold">
                  🚧 En Construcción
                </span>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-red-600 rounded-xl flex items-center justify-center">
                    <TrendingUp className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Grow5X Ultimate</h2>
                    <p className="text-orange-300 font-semibold">Multiplicador x5 en 45 días</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                  <h3 className="text-lg font-bold text-orange-300 mb-2">🎯 Rendimiento Proyectado</h3>
                  <div className="text-white">
                    <p>• <strong>12.5% diario</strong> durante 8 días por ciclo</p>
                    <p>• <strong>5 ciclos</strong> de 9 días cada uno</p>
                    <p>• <strong>500% total</strong> en 45 días</p>
                  </div>
                </div>

                <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                  <h3 className="text-lg font-bold text-orange-300 mb-2">🤖 Agentes IA Avanzados</h3>
                  <div className="text-white text-sm space-y-1">
                    <p>• <strong>ArbitrageBot Alpha</strong> - Arbitraje entre exchanges</p>
                    <p>• <strong>TradingBot Beta</strong> - Machine learning predictivo</p>
                    <p>• <strong>ScalpingBot Gamma</strong> - Trading de alta frecuencia</p>
                  </div>
                </div>

                <div className="bg-orange-500/10 rounded-xl p-4 border border-orange-500/20">
                  <h3 className="text-lg font-bold text-orange-300 mb-2">⚡ Estado de Desarrollo</h3>
                  <div className="text-white">
                    <div className="flex justify-between items-center mb-2">
                      <span>Progreso:</span>
                      <span className="font-bold">85% Completado</span>
                    </div>
                    <div className="w-full bg-orange-900/30 rounded-full h-2">
                      <div className="h-full bg-gradient-to-r from-orange-500 to-red-600 rounded-full" style={{width: '85%'}}></div>
                    </div>
                    <p className="text-sm text-orange-300 mt-2">
                      <strong>Optimizando latencias</strong> para lograr estabilidad
                    </p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="bg-orange-500/20 text-orange-300 px-4 py-3 rounded-xl border border-orange-500/30">
                  <Clock className="w-5 h-5 inline mr-2" />
                  <strong>Lanzamiento: Muy Pronto</strong>
                  <p className="text-sm mt-1">Últimos ajustes para garantizar máxima estabilidad y rendimiento</p>
                </div>
              </div>
            </div>

            {/* Proyecto x2 - Disponible */}
            <div className="bg-white/10 backdrop-blur-sm rounded-3xl p-8 border border-white/20 relative overflow-hidden">
              <div className="absolute top-4 right-4">
                <span className="bg-green-500/20 text-green-300 px-3 py-1 rounded-full text-sm font-semibold">
                  ✅ Disponible Ahora
                </span>
              </div>
              
              <div className="mb-6">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Star className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-white">Grow5X Stable</h2>
                    <p className="text-green-300 font-semibold">Multiplicador x2 en 20 días</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <h3 className="text-lg font-bold text-green-300 mb-2">💰 Sistema Dual de Beneficios</h3>
                  <div className="text-white">
                    <p>• <strong>10% diario</strong> durante 20 días</p>
                    <p>• <strong>Días 1-10:</strong> Cashback inmediato</p>
                    <p>• <strong>Días 11-20:</strong> Potencial acumulado</p>
                    <p>• <strong>200% total</strong> garantizado</p>
                  </div>
                </div>

                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <h3 className="text-lg font-bold text-green-300 mb-2">🎯 Licencias Disponibles</h3>
                  <div className="text-white text-sm space-y-1">
                    <p>• <strong>Starter:</strong> $50 USDT - SLA 24h</p>
                    <p>• <strong>Standard:</strong> $250 USDT - SLA 6h ⭐</p>
                    <p>• <strong>Premium:</strong> $500 USDT - SLA 3h</p>
                    <p>• <strong>Diamond:</strong> $5,000 USDT - SLA 15min</p>
                  </div>
                </div>

                <div className="bg-green-500/10 rounded-xl p-4 border border-green-500/20">
                  <h3 className="text-lg font-bold text-green-300 mb-2">👥 Sistema de Referidos</h3>
                  <div className="text-white">
                    <p>• <strong>10% comisión</strong> por referido directo</p>
                    <p>• <strong>Sin límites</strong> de referidos</p>
                    <p>• <strong>Pagos en USDT</strong> BEP20</p>
                    <p>• <strong>Gestión transparente</strong> y segura</p>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <Link 
                  to="/register" 
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-green-600 hover:to-emerald-700 transition-all duration-300 shadow-xl"
                >
                  Comenzar Ahora
                  <ArrowRight className="w-5 h-5" />
                </Link>
                <p className="text-sm text-green-300 mt-3">
                  <strong>Beneficios estables</strong> mientras esperas el x5
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-16 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold text-white mb-4">
              ¿Por qué elegir Grow5X?
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              Tecnología de vanguardia diseñada para nuestra comunidad
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Agentes IA Propietarios</h3>
              <p className="text-gray-300">
                Tecnología desarrollada internamente con algoritmos especializados en arbitraje crypto.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Seguridad Blockchain</h3>
              <p className="text-gray-300">
                Operaciones 100% en BEP20 con transparencia total y sistema no custodial.
              </p>
            </div>

            <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-6 border border-white/10">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-white mb-3">Comunidad Activa</h3>
              <p className="text-gray-300">
                Soporte 24/7 especializado y canal de Telegram dedicado para nuestra comunidad.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="px-6 py-20">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
            Únete a la Revolución de las
            <span className="block bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Herramientas IA
            </span>
          </h2>
          <p className="text-xl text-gray-300 mb-8 max-w-2xl mx-auto">
            Comienza con beneficios estables x2 hoy, mientras preparamos la tecnología x5 más avanzada del mercado.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register" 
              className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-blue-600 hover:to-indigo-700 transition-all duration-300 shadow-xl"
            >
              Registrarse Gratis
              <ArrowRight className="w-5 h-5" />
            </Link>
            <Link 
              to="/login" 
              className="inline-flex items-center gap-2 border-2 border-white/20 text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-white/10 transition-all duration-300"
            >
              Ya tengo cuenta
            </Link>
          </div>

          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-3xl font-bold text-blue-400">85%</div>
              <div className="text-gray-300">Proyecto x5 Completado</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-green-400">100%</div>
              <div className="text-gray-300">Proyecto x2 Funcional</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-purple-400">24/7</div>
              <div className="text-gray-300">Soporte Especializado</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-orange-400">10%</div>
              <div className="text-gray-300">Comisión Referidos</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-8 border-t border-white/10">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <span className="text-white font-bold">Grow5X</span>
            </div>
            
            <div className="text-center md:text-right">
              <p className="text-gray-400 text-sm">
                © 2025 Grow5X. Herramientas Tecnológicas bajo Licencia.
              </p>
              <p className="text-gray-500 text-xs mt-1">
                Multiplicando Posibilidades con Inteligencia Artificial
              </p>
            </div>
          </div>
        </div>
      </footer>
      </div>
    </div>
  );
};

export default LandingPage;