import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Bot, TrendingUp, Shield, Users, Zap, Target, BarChart3, Layers, Globe, Activity, Cpu, Eye, Bell, BarChart, HardDrive, FileCheck } from 'lucide-react';
import ProFitAgentLogo from '../components/ui/ProFitAgentLogo';

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
    <div className="min-h-screen relative overflow-hidden bg-gradient-to-br from-gray-900 via-emerald-900 to-teal-900">
      {/* Animated Background Effects */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Floating Particles */}
        <div className="absolute inset-0">
          {[...Array(60)].map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-emerald-400/40 rounded-full animate-pulse"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 4}s`,
                animationDuration: `${3 + Math.random() * 4}s`
              }}
            />
          ))}
        </div>
        
        {/* Gradient Orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-teal-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-1/2 left-1/2 w-64 h-64 bg-cyan-500/15 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '3s' }} />
        
        {/* Mouse Follow Effect */}
        <div 
          className="absolute w-96 h-96 bg-emerald-400/8 rounded-full blur-3xl transition-all duration-1000 ease-out pointer-events-none"
          style={{
            left: mousePosition.x - 192,
            top: mousePosition.y - 192,
          }}
        />
      </div>
      
      {/* Content Wrapper */}
      <div className="relative z-10">
        {/* Header */}
        <header className="relative z-10 px-4 sm:px-6 py-8">
          <div className="max-w-7xl mx-auto">
            {/* Navigation Bar */}
            <nav className="flex items-center justify-between bg-black/30 backdrop-blur-xl rounded-2xl px-6 py-4 border border-emerald-400/20 shadow-2xl">
              {/* Logo y Brand */}
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-400 via-teal-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg border border-emerald-400/40">
                  <ProFitAgentLogo size="md" variant="white" />
                </div>
                <div className="hidden sm:block">
                  <div className="text-xl font-bold text-white">ProFitAgent</div>
                  <div className="text-xs text-emerald-300 font-semibold">Agentes IA Descentralizados</div>
                </div>
              </div>

              {/* Status Indicators */}
              <div className="hidden md:flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-green-300 font-semibold">7 Agentes Activos</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-emerald-300 font-semibold">BSC Conectado</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
                  <span className="text-xs text-cyan-300 font-semibold">Latencia: 15ms</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3">
                <Link 
                  to="/login" 
                  className="hidden sm:block px-6 py-2.5 text-white border border-emerald-400/50 rounded-lg hover:bg-emerald-500/20 hover:border-emerald-400/70 transition-all duration-300 font-semibold backdrop-blur-sm text-sm"
                >
                  Acceder
                </Link>
                <Link 
                  to="/register" 
                  className="px-6 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-lg font-semibold text-sm transform hover:scale-105"
                >
                  Comenzar
                </Link>
              </div>
            </nav>

            {/* Hero Stats Bar */}
            <div className="mt-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 backdrop-blur-sm rounded-xl p-4 border border-emerald-400/20">
              <div className="flex flex-wrap items-center justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-emerald-400" />
                  <span className="text-white font-semibold">Agente Orquesta:</span>
                  <span className="text-emerald-300">Coordinando 11 agentes</span>
                </div>
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-teal-400" />
                  <span className="text-white font-semibold">Operaciones:</span>
                  <span className="text-teal-300">24/7 Automáticas</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-cyan-400" />
                  <span className="text-white font-semibold">Contratos:</span>
                  <span className="text-cyan-300">100% Descentralizados</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-400" />
                  <span className="text-white font-semibold">ROI:</span>
                  <span className="text-green-300">8% Diario Garantizado</span>
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="relative px-4 sm:px-6 py-16 sm:py-24">
          <div className="max-w-7xl mx-auto text-center">
            <div className="space-y-8">
              <div className="space-y-4">
                <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold text-white leading-tight">
                  <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                    ProFitAgent
                  </span>
                  <br />
                  <span className="text-3xl sm:text-5xl lg:text-6xl">Agentes IA Descentralizados</span>
                </h1>
                <p className="text-xl sm:text-2xl text-gray-300 max-w-4xl mx-auto leading-relaxed">
                  <span className="text-emerald-400 font-semibold">8 Agentes IA</span> operando 24/7 con <span className="text-teal-400 font-semibold">latencia &lt;50ms</span>. 
                  <span className="text-cyan-400 font-semibold">200% Total Garantizado</span> en 25 días: 
                  <span className="text-green-400 font-semibold">100% Cashback + 100% Beneficios Adicionales</span>. 
                  Retiros automáticos del <span className="text-emerald-400 font-semibold">8% diario</span>.
                </p>
              </div>

              {/* Feature Badges */}
              <div className="flex flex-wrap justify-center gap-4 text-sm">
                <div className="bg-emerald-500/20 border border-emerald-400/30 rounded-full px-4 py-2 text-emerald-300 font-semibold backdrop-blur-sm">
                  ⚡ Agente Orquesta + 7 Esenciales
                </div>
                <div className="bg-teal-500/20 border border-teal-400/30 rounded-full px-4 py-2 text-teal-300 font-semibold backdrop-blur-sm">
                  🔒 Contratos Descentralizados BSC
                </div>
                <div className="bg-cyan-500/20 border border-cyan-400/30 rounded-full px-4 py-2 text-cyan-300 font-semibold backdrop-blur-sm">
                  💰 8% Diario Automático
                </div>
                <div className="bg-green-500/20 border border-green-400/30 rounded-full px-4 py-2 text-green-300 font-semibold backdrop-blur-sm">
                  📈 200% Total en 25 Días
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-6 justify-center items-center pt-8">
                <Link 
                  to="/register" 
                  className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-2xl font-bold text-lg transform hover:scale-105 flex items-center gap-3"
                >
                  Activar Agentes IA
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link 
                  to="/login" 
                  className="px-8 py-4 text-white border-2 border-emerald-400/50 rounded-2xl hover:bg-emerald-500/20 hover:border-emerald-400/70 transition-all duration-300 font-bold text-lg backdrop-blur-sm"
                >
                  Ya tengo cuenta
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* Ecosistema de Agentes IA */}
        <section className="relative px-4 sm:px-6 py-16">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                Ecosistema de <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Agentes IA</span>
              </h2>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                8 agentes especializados trabajando en perfecta sincronización bajo el control del Agente Orquesta
              </p>
            </div>

            {/* Agente Orquesta */}
            <div className="mb-12 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 backdrop-blur-sm rounded-2xl p-8 border border-purple-400/20">
              <div className="text-center">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <Bot className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">Agente Orquesta</h3>
                <p className="text-purple-300 mb-4">Coordinador maestro que supervisa y optimiza todos los agentes</p>
                <div className="flex justify-center gap-4 text-sm">
                  <span className="bg-purple-500/20 px-3 py-1 rounded-full text-purple-300">Latencia: 5ms</span>
                  <span className="bg-indigo-500/20 px-3 py-1 rounded-full text-indigo-300">Uptime: 99.99%</span>
                </div>
              </div>
            </div>

            {/* 7 Agentes Esenciales */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-12">
              {/* Agente de Retiros */}
              <div className="bg-emerald-500/10 backdrop-blur-sm rounded-xl p-6 border border-emerald-400/20">
                <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center mb-4">
                  <TrendingUp className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Agente Retiros</h4>
                <p className="text-emerald-300 text-sm mb-3">Procesa retiros automáticos del 8% diario</p>
                <span className="text-xs bg-emerald-500/20 px-2 py-1 rounded text-emerald-300">Latencia: 12ms</span>
              </div>

              {/* Agente de Producción */}
              <div className="bg-teal-500/10 backdrop-blur-sm rounded-xl p-6 border border-teal-400/20">
                <div className="w-12 h-12 bg-teal-500 rounded-xl flex items-center justify-center mb-4">
                  <Activity className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Agente Producción</h4>
                <p className="text-teal-300 text-sm mb-3">Genera beneficios adicionales continuos</p>
                <span className="text-xs bg-teal-500/20 px-2 py-1 rounded text-teal-300">Latencia: 18ms</span>
              </div>

              {/* Agente de Seguridad */}
              <div className="bg-cyan-500/10 backdrop-blur-sm rounded-xl p-6 border border-cyan-400/20">
                <div className="w-12 h-12 bg-cyan-500 rounded-xl flex items-center justify-center mb-4">
                  <Shield className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Agente Seguridad</h4>
                <p className="text-cyan-300 text-sm mb-3">Monitorea y protege todas las operaciones</p>
                <span className="text-xs bg-cyan-500/20 px-2 py-1 rounded text-cyan-300">Latencia: 8ms</span>
              </div>

              {/* Agente de Arbitraje */}
              <div className="bg-blue-500/10 backdrop-blur-sm rounded-xl p-6 border border-blue-400/20">
                <div className="w-12 h-12 bg-blue-500 rounded-xl flex items-center justify-center mb-4">
                  <Zap className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Agente Arbitraje</h4>
                <p className="text-blue-300 text-sm mb-3">Ejecuta operaciones de arbitraje cripto</p>
                <span className="text-xs bg-blue-500/20 px-2 py-1 rounded text-blue-300">Latencia: 25ms</span>
              </div>

              {/* Agente de Cashback */}
              <div className="bg-green-500/10 backdrop-blur-sm rounded-xl p-6 border border-green-400/20">
                <div className="w-12 h-12 bg-green-500 rounded-xl flex items-center justify-center mb-4">
                  <Target className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Agente Cashback</h4>
                <p className="text-green-300 text-sm mb-3">Gestiona el 100% de cashback automático</p>
                <span className="text-xs bg-green-500/20 px-2 py-1 rounded text-green-300">Latencia: 15ms</span>
              </div>

              {/* Agente de Optimización */}
              <div className="bg-yellow-500/10 backdrop-blur-sm rounded-xl p-6 border border-yellow-400/20">
                <div className="w-12 h-12 bg-yellow-500 rounded-xl flex items-center justify-center mb-4">
                  <Cpu className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Agente Optimización</h4>
                <p className="text-yellow-300 text-sm mb-3">Optimiza rendimiento y eficiencia</p>
                <span className="text-xs bg-yellow-500/20 px-2 py-1 rounded text-yellow-300">Latencia: 22ms</span>
              </div>

              {/* Agente de Monitoreo */}
              <div className="bg-orange-500/10 backdrop-blur-sm rounded-xl p-6 border border-orange-400/20">
                <div className="w-12 h-12 bg-orange-500 rounded-xl flex items-center justify-center mb-4">
                  <Eye className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-lg font-bold text-white mb-2">Agente Monitoreo</h4>
                <p className="text-orange-300 text-sm mb-3">Supervisa métricas y performance 24/7</p>
                <span className="text-xs bg-orange-500/20 px-2 py-1 rounded text-orange-300">Latencia: 10ms</span>
              </div>
            </div>

            {/* Agentes de Gestión */}
            <div className="bg-gray-500/10 backdrop-blur-sm rounded-xl p-6 border border-gray-400/20">
              <h4 className="text-xl font-bold text-white mb-4 text-center">Agentes de Gestión Adicionales</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Bell className="w-8 h-8 text-blue-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-300">Notificaciones</span>
                </div>
                <div className="text-center">
                  <BarChart className="w-8 h-8 text-purple-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-300">Analytics</span>
                </div>
                <div className="text-center">
                  <HardDrive className="w-8 h-8 text-green-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-300">Backup</span>
                </div>
                <div className="text-center">
                  <FileCheck className="w-8 h-8 text-yellow-400 mx-auto mb-2" />
                  <span className="text-sm text-gray-300">Compliance</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Doble Arbitraje Section */}
         <section className="relative px-4 sm:px-6 py-16">
           <div className="max-w-7xl mx-auto">
             <div className="text-center mb-12">
               <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                 Doble Arbitraje Simultáneo
               </h2>
               <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                 ProFitAgent es la primera plataforma que opera <strong>arbitraje cripto</strong> y <strong>surebet deportivo</strong> 
                 al mismo tiempo, maximizando tus oportunidades de ganancia las 24 horas del día.
               </p>
             </div>
             
             <div className="grid lg:grid-cols-2 gap-6 sm:gap-8">
               
               {/* Arbitraje Cripto BSC */}
               <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-3xl p-8 border border-emerald-400/30 relative overflow-hidden">
                 <div className="absolute top-4 right-4">
                   <span className="bg-emerald-500/30 text-emerald-200 px-3 py-1 rounded-full text-sm font-semibold border border-emerald-400/40">
                     ✅ Activo 24/7
                   </span>
                 </div>
                 
                 <div className="mb-6">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                       <TrendingUp className="w-6 h-6 text-white" />
                     </div>
                     <div>
                       <h2 className="text-2xl font-bold text-white">Arbitraje Cripto BSC</h2>
                       <p className="text-emerald-300 font-semibold">Binance Smart Chain + DEXs</p>
                     </div>
                   </div>
                 </div>
 
                 <div className="space-y-4 mb-8">
                   <div className="bg-emerald-500/15 rounded-xl p-4 border border-emerald-400/30">
                     <h3 className="text-lg font-bold text-emerald-300 mb-2">🔗 Contratos Inteligentes</h3>
                     <div className="text-white text-sm space-y-1">
                       <p>• <strong>PancakeSwap</strong> - Arbitraje principal</p>
                       <p>• <strong>BakerySwap</strong> - Oportunidades secundarias</p>
                       <p>• <strong>ApeSwap</strong> - Diversificación de pools</p>
                       <p>• <strong>Contratos auditados</strong> y verificados</p>
                     </div>
                   </div>
 
                   <div className="bg-emerald-500/15 rounded-xl p-4 border border-emerald-400/30">
                     <h3 className="text-lg font-bold text-emerald-300 mb-2">⚡ Rendimiento Cripto</h3>
                     <div className="text-white">
                       <p>• <strong>100% beneficios</strong> en arbitraje DEX</p>
                       <p>• <strong>Retiros automáticos</strong> del 8% diario</p>
                       <p>• <strong>Sin intervención manual</strong> requerida</p>
                     </div>
                   </div>
                 </div>
               </div>
 
               {/* Arbitraje Surebet */}
               <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-3xl p-8 border border-cyan-400/30 relative overflow-hidden">
                 <div className="absolute top-4 right-4">
                   <span className="bg-cyan-500/30 text-cyan-200 px-3 py-1 rounded-full text-sm font-semibold border border-cyan-400/40">
                     ✅ Activo 24/7
                   </span>
                 </div>
                 
                 <div className="mb-6">
                   <div className="flex items-center gap-3 mb-4">
                     <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                       <Target className="w-6 h-6 text-white" />
                     </div>
                     <div>
                       <h2 className="text-2xl font-bold text-white">Surebet Deportivo</h2>
                       <p className="text-cyan-300 font-semibold">Arbitraje en Casas de Apuestas</p>
                     </div>
                   </div>
                 </div>
 
                 <div className="space-y-4 mb-8">
                   <div className="bg-cyan-500/15 rounded-xl p-4 border border-cyan-400/30">
                     <h3 className="text-lg font-bold text-cyan-300 mb-2">⚽ Casas Integradas</h3>
                     <div className="text-white text-sm space-y-1">
                       <p>• <strong>Bet365</strong> - Casa principal</p>
                       <p>• <strong>Pinnacle</strong> - Mejores cuotas</p>
                       <p>• <strong>Betfair</strong> - Exchange líder</p>
                       <p>• <strong>+15 casas</strong> más integradas</p>
                     </div>
                   </div>
 
                   <div className="bg-cyan-500/15 rounded-xl p-4 border border-cyan-400/30">
                     <h3 className="text-lg font-bold text-cyan-300 mb-2">🎯 Rendimiento Surebet</h3>
                     <div className="text-white">
                       <p>• <strong>100% cashback</strong> automático</p>
                       <p>• <strong>Detección automática</strong> de oportunidades</p>
                       <p>• <strong>Ejecución instantánea</strong> de apuestas</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
             
             {/* Combined Benefits */}
             <div className="mt-8 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 backdrop-blur-sm rounded-3xl p-8 border border-emerald-400/30">
               <div className="text-center">
                 <h3 className="text-2xl font-bold text-white mb-4">💎 Beneficio Combinado</h3>
                 <div className="grid sm:grid-cols-3 gap-6">
                   <div className="text-center">
                     <div className="text-3xl font-bold text-emerald-400 mb-2">100%</div>
                     <div className="text-white font-semibold">Beneficios Adicionales</div>
                     <div className="text-gray-300 text-sm">Arbitraje Cripto BSC</div>
                   </div>
                   <div className="text-center">
                     <div className="text-4xl text-white mb-2">+</div>
                   </div>
                   <div className="text-center">
                     <div className="text-3xl font-bold text-cyan-400 mb-2">100%</div>
                     <div className="text-white font-semibold">Cashback Automático</div>
                     <div className="text-gray-300 text-sm">Capital Inicial</div>
                   </div>
                 </div>
                 <div className="mt-6 p-4 bg-gradient-to-r from-emerald-500/20 to-cyan-500/20 rounded-xl border border-emerald-400/40">
                   <div className="text-4xl font-bold text-white mb-2">= 200% Total Potencial</div>
                   <div className="text-emerald-300 font-semibold">8% diario automático durante 25 días + cashback completo</div>
                 </div>
               </div>
             </div>
           </div>
         </section>

         {/* Licencias Section */}
         <section className="relative px-4 sm:px-6 py-16 bg-black/20">
           <div className="max-w-7xl mx-auto">
             <div className="text-center mb-12">
               <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                 Licencias de Doble Arbitraje
               </h2>
               <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                 Elige tu licencia y comienza a generar ingresos con arbitraje cripto y surebet simultáneamente
               </p>
             </div>
             
             <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
               <div className="bg-gradient-to-br from-emerald-500/10 to-emerald-600/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-400/30 relative overflow-hidden">
                 <div className="text-center">
                   <h3 className="text-xl font-bold text-white mb-2">Starter</h3>
                   <div className="text-3xl font-bold text-emerald-400 mb-4">$500</div>
                   <div className="space-y-3 mb-6">
                     <div className="bg-emerald-500/15 rounded-lg p-3 border border-emerald-400/30">
                       <div className="text-sm text-gray-300">Beneficios Adicionales</div>
                       <div className="text-lg font-bold text-emerald-300">100%</div>
                     </div>
                     <div className="bg-emerald-500/15 rounded-lg p-3 border border-emerald-400/30">
                       <div className="text-sm text-gray-300">Cashback Automático</div>
                       <div className="text-lg font-bold text-emerald-300">100%</div>
                     </div>
                     <div className="bg-gradient-to-r from-emerald-500/20 to-emerald-600/20 rounded-lg p-3 border border-emerald-400/40">
                        <div className="text-sm text-gray-300">Total Potencial</div>
                        <div className="text-xl font-bold text-emerald-200">200%</div>
                      </div>
                   </div>
                   <div className="text-xs text-gray-400 mb-4">8% diario automático • 25 días</div>
                 </div>
               </div>

               <div className="bg-gradient-to-br from-teal-500/10 to-teal-600/10 backdrop-blur-sm rounded-2xl p-6 border border-teal-400/30 relative overflow-hidden">
                 <div className="text-center">
                   <h3 className="text-xl font-bold text-white mb-2">Standard</h3>
                   <div className="text-3xl font-bold text-teal-400 mb-4">$1,000</div>
                   <div className="space-y-3 mb-6">
                     <div className="bg-teal-500/15 rounded-lg p-3 border border-teal-400/30">
                       <div className="text-sm text-gray-300">Beneficios Adicionales</div>
                       <div className="text-lg font-bold text-teal-300">100%</div>
                     </div>
                     <div className="bg-teal-500/15 rounded-lg p-3 border border-teal-400/30">
                       <div className="text-sm text-gray-300">Cashback Automático</div>
                       <div className="text-lg font-bold text-teal-300">100%</div>
                     </div>
                     <div className="bg-gradient-to-r from-teal-500/20 to-teal-600/20 rounded-lg p-3 border border-teal-400/40">
                        <div className="text-sm text-gray-300">Total Potencial</div>
                        <div className="text-xl font-bold text-teal-200">200%</div>
                      </div>
                   </div>
                   <div className="text-xs text-gray-400 mb-4">8% diario automático • 25 días</div>
                 </div>
               </div>

               <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-400/30 relative overflow-hidden">
                 <div className="text-center">
                   <h3 className="text-xl font-bold text-white mb-2">Premium</h3>
                   <div className="text-3xl font-bold text-cyan-400 mb-4">$2,500</div>
                   <div className="space-y-3 mb-6">
                     <div className="bg-cyan-500/15 rounded-lg p-3 border border-cyan-400/30">
                       <div className="text-sm text-gray-300">Beneficios Adicionales</div>
                       <div className="text-lg font-bold text-cyan-300">100%</div>
                     </div>
                     <div className="bg-cyan-500/15 rounded-lg p-3 border border-cyan-400/30">
                       <div className="text-sm text-gray-300">Cashback Automático</div>
                       <div className="text-lg font-bold text-cyan-300">100%</div>
                     </div>
                     <div className="bg-gradient-to-r from-cyan-500/20 to-cyan-600/20 rounded-lg p-3 border border-cyan-400/40">
                        <div className="text-sm text-gray-300">Total Potencial</div>
                        <div className="text-xl font-bold text-cyan-200">200%</div>
                      </div>
                   </div>
                   <div className="text-xs text-gray-400 mb-4">8% diario automático • 25 días</div>
                 </div>
               </div>

               <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 backdrop-blur-sm rounded-2xl p-6 border border-blue-400/30 relative overflow-hidden">
                 <div className="text-center">
                   <h3 className="text-xl font-bold text-white mb-2">Diamond</h3>
                   <div className="text-3xl font-bold text-blue-400 mb-4">$5,000</div>
                   <div className="space-y-3 mb-6">
                     <div className="bg-blue-500/15 rounded-lg p-3 border border-blue-400/30">
                       <div className="text-sm text-gray-300">Beneficios Adicionales</div>
                       <div className="text-lg font-bold text-blue-300">100%</div>
                     </div>
                     <div className="bg-blue-500/15 rounded-lg p-3 border border-blue-400/30">
                       <div className="text-sm text-gray-300">Cashback Automático</div>
                       <div className="text-lg font-bold text-blue-300">100%</div>
                     </div>
                     <div className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-lg p-3 border border-blue-400/40">
                        <div className="text-sm text-gray-300">Total Potencial</div>
                        <div className="text-xl font-bold text-blue-200">200%</div>
                      </div>
                   </div>
                   <div className="text-xs text-gray-400 mb-4">8% diario automático • 25 días</div>
                 </div>
               </div>
             </div>
             
             <div className="text-center mt-8">
               <Link 
                 to="/register" 
                 className="inline-flex items-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white px-8 py-4 rounded-xl font-bold text-lg hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-xl transform hover:scale-105"
               >
                 <span>Comenzar Doble Arbitraje</span>
                 <ArrowRight className="w-5 h-5" />
               </Link>
             </div>
           </div>
         </section>

         {/* Technical Architecture Section */}
         <section className="relative px-4 sm:px-6 py-16 bg-black/30">
           <div className="max-w-7xl mx-auto">
             <div className="text-center mb-12">
               <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                 Arquitectura Técnica
               </h2>
               <p className="text-lg text-gray-300 max-w-3xl mx-auto">
                 Infraestructura descentralizada con smart contracts auditados y agentes IA especializados
               </p>
             </div>
             
             <div className="grid lg:grid-cols-2 gap-8">
               {/* Smart Contracts */}
               <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-3xl p-8 border border-emerald-400/30">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
                     <HardDrive className="w-6 h-6 text-white" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-bold text-white">Smart Contracts BSC</h3>
                     <p className="text-emerald-300 font-semibold">Solidity 0.8.19 + OpenZeppelin</p>
                   </div>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="bg-emerald-500/15 rounded-xl p-4 border border-emerald-400/30">
                     <h4 className="text-lg font-bold text-emerald-300 mb-2">🔐 Contratos Principales</h4>
                     <div className="text-white text-sm space-y-1">
                       <p>• <code className="bg-black/30 px-2 py-1 rounded text-emerald-200">ArbitrageEngine.sol</code> - Lógica de arbitraje DEX</p>
                       <p>• <code className="bg-black/30 px-2 py-1 rounded text-emerald-200">LiquidityPool.sol</code> - Gestión de fondos</p>
                       <p>• <code className="bg-black/30 px-2 py-1 rounded text-emerald-200">RewardDistributor.sol</code> - Distribución automática</p>
                       <p>• <code className="bg-black/30 px-2 py-1 rounded text-emerald-200">GovernanceToken.sol</code> - Token de utilidad</p>
                     </div>
                   </div>
                   
                   <div className="bg-emerald-500/15 rounded-xl p-4 border border-emerald-400/30">
                     <h4 className="text-lg font-bold text-emerald-300 mb-2">⚡ Integración DEX</h4>
                     <div className="text-white text-sm space-y-1">
                       <p>• <strong>PancakeSwap V3</strong> - Router principal</p>
                       <p>• <strong>Uniswap V2 Fork</strong> - Pools secundarios</p>
                       <p>• <strong>Flash Loans</strong> - Aave Protocol</p>
                       <p>• <strong>Price Oracles</strong> - Chainlink + Band Protocol</p>
                     </div>
                   </div>
                 </div>
               </div>
               
               {/* AI Agents & APIs */}
               <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-3xl p-8 border border-cyan-400/30">
                 <div className="flex items-center gap-3 mb-6">
                   <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center">
                     <Bot className="w-6 h-6 text-white" />
                   </div>
                   <div>
                     <h3 className="text-2xl font-bold text-white">Agentes IA & APIs</h3>
                     <p className="text-cyan-300 font-semibold">Python 3.11 + TensorFlow 2.13</p>
                   </div>
                 </div>
                 
                 <div className="space-y-4">
                   <div className="bg-cyan-500/15 rounded-xl p-4 border border-cyan-400/30">
                     <h4 className="text-lg font-bold text-cyan-300 mb-2">🤖 Modelos de IA</h4>
                     <div className="text-white text-sm space-y-1">
                       <p>• <strong>LSTM Networks</strong> - Predicción de precios</p>
                       <p>• <strong>Reinforcement Learning</strong> - Optimización de estrategias</p>
                       <p>• <strong>Transformer Models</strong> - Análisis de sentimiento</p>
                       <p>• <strong>Graph Neural Networks</strong> - Detección de oportunidades</p>
                     </div>
                   </div>
                   
                   <div className="bg-cyan-500/15 rounded-xl p-4 border border-cyan-400/30">
                     <h4 className="text-lg font-bold text-cyan-300 mb-2">🔗 Infraestructura API</h4>
                     <div className="text-white text-sm space-y-1">
                       <p>• <strong>WebSocket Streams</strong> - Datos en tiempo real</p>
                       <p>• <strong>GraphQL Gateway</strong> - Agregación de datos</p>
                       <p>• <strong>Redis Cluster</strong> - Cache distribuido</p>
                       <p>• <strong>Kubernetes</strong> - Orquestación de contenedores</p>
                     </div>
                   </div>
                 </div>
               </div>
             </div>
             
             {/* Technical Specs */}
             <div className="mt-8 bg-gradient-to-r from-purple-500/10 via-indigo-500/10 to-blue-500/10 backdrop-blur-sm rounded-3xl p-8 border border-purple-400/30">
               <div className="text-center mb-6">
                 <h3 className="text-2xl font-bold text-white mb-2">⚙️ Especificaciones Técnicas</h3>
               </div>
               
               <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 <div className="text-center">
                   <div className="text-2xl font-bold text-purple-400 mb-2">&lt; 50ms</div>
                   <div className="text-white font-semibold">Latencia de Ejecución</div>
                   <div className="text-gray-300 text-sm">Smart Contract Calls</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-indigo-400 mb-2">99.9%</div>
                   <div className="text-white font-semibold">Uptime SLA</div>
                   <div className="text-gray-300 text-sm">Infraestructura AWS</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-blue-400 mb-2">1000+</div>
                   <div className="text-white font-semibold">TPS Capacity</div>
                   <div className="text-gray-300 text-sm">Transacciones por segundo</div>
                 </div>
                 <div className="text-center">
                   <div className="text-2xl font-bold text-cyan-400 mb-2">24/7</div>
                   <div className="text-white font-semibold">Monitoreo</div>
                   <div className="text-gray-300 text-sm">Prometheus + Grafana</div>
                 </div>
               </div>
             </div>
           </div>
         </section>

         {/* Features Section */}
         <section className="relative px-4 sm:px-6 py-16">
           <div className="max-w-7xl mx-auto">
             <div className="text-center mb-12">
               <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
                 ¿Por qué ProFitAgent es único?
               </h2>
               <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                 La primera y única plataforma de doble arbitraje automatizado del mercado
               </p>
             </div>
 
             <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-8">
               <div className="bg-gradient-to-br from-emerald-500/10 to-teal-500/10 backdrop-blur-sm rounded-2xl p-6 border border-emerald-400/20">
                 <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center mb-4">
                   <Layers className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">Doble Arbitraje Único</h3>
                 <p className="text-gray-300">
                   Primera plataforma que combina arbitraje cripto en BSC y surebet deportivo simultáneamente.
                 </p>
               </div>
 
               <div className="bg-gradient-to-br from-cyan-500/10 to-blue-500/10 backdrop-blur-sm rounded-2xl p-6 border border-cyan-400/20">
                 <div className="w-12 h-12 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl flex items-center justify-center mb-4">
                   <Bot className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">IA Propietaria Dual</h3>
                 <p className="text-gray-300">
                   Algoritmos especializados que operan en mercados cripto y deportivos las 24 horas.
                 </p>
               </div>
 
               <div className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 backdrop-blur-sm rounded-2xl p-6 border border-green-400/20">
                 <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-600 rounded-xl flex items-center justify-center mb-4">
                   <Shield className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">Seguridad Máxima</h3>
                 <p className="text-gray-300">
                   Contratos inteligentes auditados en BSC y APIs seguras con casas de apuestas licenciadas.
                 </p>
               </div>
 
               <div className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 backdrop-blur-sm rounded-2xl p-6 border border-purple-400/20">
                 <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-600 rounded-xl flex items-center justify-center mb-4">
                   <Users className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">Comunidad Elite</h3>
                 <p className="text-gray-300">
                   Soporte 24/7 vía Telegram con traders especializados en ambos tipos de arbitraje.
                 </p>
               </div>
 
               <div className="bg-gradient-to-br from-yellow-500/10 to-orange-500/10 backdrop-blur-sm rounded-2xl p-6 border border-yellow-400/20">
                 <div className="w-12 h-12 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center mb-4">
                   <BarChart3 className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">ROI Maximizado</h3>
                 <p className="text-gray-300">
                   200% de retorno garantizado combinando ambos tipos de arbitraje en una sola licencia.
                 </p>
               </div>
 
               <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 backdrop-blur-sm rounded-2xl p-6 border border-indigo-400/20">
                 <div className="w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center mb-4">
                   <Globe className="w-6 h-6 text-white" />
                 </div>
                 <h3 className="text-xl font-bold text-white mb-3">Cobertura Global</h3>
                 <p className="text-gray-300">
                   Operaciones en mercados cripto globales y eventos deportivos de todo el mundo.
                 </p>
               </div>
             </div>
           </div>
         </section>

         {/* Final CTA */}
         <section className="relative px-4 sm:px-6 py-16">
           <div className="max-w-4xl mx-auto text-center">
             <h2 className="text-3xl sm:text-4xl font-bold text-white mb-6">
               Activa tus <span className="bg-gradient-to-r from-emerald-400 to-teal-400 bg-clip-text text-transparent">Agentes IA</span> ahora
             </h2>
             <p className="text-xl text-gray-300 mb-8">
               Únete a miles de usuarios que ya disfrutan de retiros automáticos del 8% diario
             </p>
            
            <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
              <Link 
                to="/register" 
                className="group px-8 py-4 bg-gradient-to-r from-emerald-500 to-teal-600 text-white rounded-2xl hover:from-emerald-600 hover:to-teal-700 transition-all duration-300 shadow-2xl font-bold text-lg transform hover:scale-105 flex items-center gap-3"
              >
                Comenzar Ahora
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link 
                to="/login" 
                className="px-8 py-4 text-white border-2 border-emerald-400/50 rounded-2xl hover:bg-emerald-500/20 hover:border-emerald-400/70 transition-all duration-300 font-bold text-lg backdrop-blur-sm"
              >
                Ya tengo cuenta
              </Link>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center mt-8 text-sm text-gray-400">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Agentes IA auditados</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>+8,000 usuarios activos</span>
              </div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                <span>200% ROI garantizado</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LandingPage;

