import React, { useEffect } from 'react';
import { TrendingUp, DollarSign, Clock, Users, ArrowRight, Award, Eye, Gift, Pause } from 'lucide-react';
import { Link } from 'react-router-dom';
import Layout from '../../components/layout/Layout';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useLicenses } from '../../hooks/useLicenses';
import { useBalance } from '../../hooks/useBalance';
import { useSSE } from '../../hooks/useSSE';
import { formatUSDTDisplay, formatDate, getStatusBadgeClass } from '../../utils/format';
import { License } from '../../types';

// License Row Component for the table
interface LicenseRowProps {
  license: License;
}

const LicenseRow: React.FC<LicenseRowProps> = ({ license }) => {
  const totalEarnings = parseFloat(license.accrued_usdt || '0');
  const dailyRate = parseFloat(String(license.daily_rate || '0'));
  const daysGenerated = license.days_generated || license.daysGenerated || 0;
  const progress = license.product.duration_days > 0
          ? Math.min((daysGenerated / license.product.duration_days) * 100, 100)
          : 0;
  
  // Campos adicionales según checklist
  const cashbackAccum = parseFloat(license.cashback_accum || '0');
  const potentialAccum = parseFloat(license.potential_accum || '0');
  const priceUsdt = parseFloat(license.product.price_usdt || '0');
  const cashbackProgress = priceUsdt > 0 ? (cashbackAccum / priceUsdt) * 100 : 0;
  const potentialProgress = priceUsdt > 0 ? (potentialAccum / priceUsdt) * 100 : 0;
  const dayIndexActual = daysGenerated;
  const isPotentialPaused = license.flags?.pause_potential || false;

  return (
    <tr className="border-b border-gray-200 hover:bg-gray-50">
      <td className="px-3 sm:px-6 py-3 sm:py-4">
        <div className="font-medium text-gray-900 text-sm sm:text-base">{license.name}</div>
        <div className="text-xs sm:text-sm text-gray-500 truncate">{license.description}</div>
        {/* Show price on mobile */}
        <div className="text-xs text-gray-600 mt-1 sm:hidden">
          ${formatUSDTDisplay(license.product.price_usdt)}
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden sm:table-cell">
        ${formatUSDTDisplay(license.product.price_usdt)}
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4">
        <Badge className={getStatusBadgeClass(license.status)}>
          {license.status}
        </Badge>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900">
        <div className="space-y-1">
          <div className="font-medium">${formatUSDTDisplay(totalEarnings)}</div>
          <div className="text-xs text-emerald-600">Cashback: ${formatUSDTDisplay(cashbackAccum)} ({cashbackProgress.toFixed(1)}%)</div>
          <div className="text-xs text-amber-600">Potencial: ${formatUSDTDisplay(potentialAccum)} ({potentialProgress.toFixed(1)}%)</div>
          {isPotentialPaused && (
            <Badge className="bg-orange-100 text-orange-800 text-xs">
              <Pause className="h-3 w-3 mr-1" />
              Potencial en pausa
            </Badge>
          )}
        </div>
        {/* Show daily rate on mobile */}
        <div className="text-xs text-gray-500 lg:hidden">
          {(dailyRate * 100).toFixed(2)}% diario
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-900 hidden lg:table-cell">
        {(dailyRate * 100).toFixed(2)}%
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 hidden md:table-cell">
        <div className="space-y-2">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-green-600 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <div className="text-xs text-gray-500">
            Día {dayIndexActual}/{license.product.duration_days}
          </div>
        </div>
      </td>
      <td className="px-3 sm:px-6 py-3 sm:py-4 text-xs sm:text-sm text-gray-500 hidden lg:table-cell">
        <div className="space-y-2">
          <div>{formatDate(license.created_at || '')}</div>
          <Link 
            to={`/user/licenses/${license.id}`}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 text-xs"
          >
            <Eye className="h-3 w-3 mr-1" />
            Ver detalles
          </Link>
        </div>
      </td>
    </tr>
  );
};

const DashboardPage: React.FC = () => {
  const { licenses, loading: licensesLoading, error: licensesError, refetch: refetchLicenses } = useLicenses('active');
  const { balance, loading: balanceLoading, error: balanceError, refetch: refetchBalance } = useBalance();
  const { connected, lastEvent } = useSSE();

  // Listen for SSE events to refresh data
  useEffect(() => {
    if (lastEvent) {
      // Refresh data on relevant events
      if (['earningPaid', 'licensePaused', 'licenseCompleted'].includes(lastEvent.type)) {
        refetchLicenses();
        refetchBalance();
      }
    }
  }, [lastEvent, refetchLicenses, refetchBalance]);

  if (licensesLoading || balanceLoading) {
    return (
      <Layout title="Dashboard">
        <div className="p-6">
          <LoadingSpinner size="lg" text="Loading dashboard..." className="mt-20" />
        </div>
      </Layout>
    );
  }

  if (licensesError || balanceError) {
    return (
      <Layout title="Dashboard">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading dashboard: {licensesError || balanceError}</p>
              <button 
                onClick={() => window.location.reload()}
                className="mt-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  // Get top 3 active licenses
  const activeLicenses = (licenses || []).filter(l => l.status === 'active');
  const topLicenses = activeLicenses.slice(0, 3);

  return (
    <Layout title="Dashboard">
      {/* Welcome Header */}
      <div className="mb-6 sm:mb-8">
            <div className="relative overflow-hidden bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl sm:rounded-3xl shadow-2xl border border-white/20 p-4 sm:p-6 lg:p-8">
              <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-purple-600/20 backdrop-blur-sm"></div>
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-48 translate-x-48"></div>
              <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-32 -translate-x-32"></div>
              <div className="relative flex items-center justify-between">
                <div className="flex-1 min-w-0 animate-fade-in">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2 drop-shadow-lg">
                    Dashboard de Herramientas IA
                  </h1>
                  <p className="text-white/90 text-sm sm:text-base lg:text-lg drop-shadow-sm">Bienvenido de vuelta! Aquí tienes el resumen de tus herramientas tecnológicas</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-emerald-400 animate-pulse shadow-lg shadow-emerald-400/50' : 'bg-red-400 shadow-lg shadow-red-400/50'}`}></div>
                    <span className="text-xs text-white/80">
                      {connected ? 'Actualizaciones en tiempo real' : 'Sin conexión en tiempo real'}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block ml-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-white/20 to-white/10 backdrop-blur-sm rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg border border-white/30">
                    <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-white drop-shadow-lg" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="group relative overflow-hidden bg-gradient-to-br from-cyan-50 to-blue-100 rounded-xl sm:rounded-2xl shadow-xl border border-cyan-200/50 p-4 sm:p-6 hover:shadow-2xl hover:scale-105 transition-all-smooth hover-lift">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg sm:rounded-xl shadow-lg shadow-cyan-500/30 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-cyan-700 mb-1">Saldo Disponible</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-cyan-900 truncate">
                    ${formatUSDTDisplay(balance?.available || '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-amber-50 to-orange-100 rounded-xl sm:rounded-2xl shadow-xl border border-amber-200/50 p-4 sm:p-6 hover:shadow-2xl hover:scale-105 transition-all-smooth hover-lift">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-amber-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg sm:rounded-xl shadow-lg shadow-amber-500/30 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-amber-700 mb-1">Potencial en Espera</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-amber-900 truncate">
                    ${formatUSDTDisplay(balance?.on_hold_potential || '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-100 rounded-xl sm:rounded-2xl shadow-xl border border-emerald-200/50 p-4 sm:p-6 hover:shadow-2xl hover:scale-105 transition-all-smooth hover-lift">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg sm:rounded-xl shadow-lg shadow-emerald-500/30 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Users className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-emerald-700 mb-1">Comisiones Pendientes</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-emerald-900 truncate">
                    ${formatUSDTDisplay(balance?.pending_commissions || '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="group relative overflow-hidden bg-gradient-to-br from-violet-50 to-purple-100 rounded-xl sm:rounded-2xl shadow-xl border border-violet-200/50 p-4 sm:p-6 hover:shadow-2xl hover:scale-105 transition-all-smooth hover-lift">
              <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-violet-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg sm:rounded-xl shadow-lg shadow-violet-500/30 flex-shrink-0 group-hover:scale-110 transition-transform duration-300">
                  <Award className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-violet-700 mb-1">Licencias Activas</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold text-violet-900 truncate">
                    {activeLicenses.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Licenses Section */}
          <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-gray-100 rounded-3xl shadow-2xl border border-slate-200/50 mb-6 sm:mb-8 animate-fade-in-up">
            <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-indigo-200/20 to-transparent rounded-full -translate-y-20 translate-x-20"></div>
            <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-purple-200/20 to-transparent rounded-full translate-y-16 -translate-x-16"></div>
            <div className="relative p-4 sm:p-6 border-b border-slate-200/50 backdrop-blur-sm">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent mb-1">
                    Licencias Activas (Top 3)
                  </h2>
                  <p className="text-slate-600 text-sm sm:text-base font-medium">Tus herramientas tecnológicas activas generando resultados</p>
                </div>
                <Link 
                  to="/user/licenses"
                  className="group inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base whitespace-nowrap"
                >
                  Ver Todas
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform duration-300" />
                </Link>
              </div>
            </div>
            <div className="relative p-4 sm:p-6">
              {topLicenses.length === 0 ? (
                <div className="text-center py-8 sm:py-16">
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto mb-6 sm:mb-8 shadow-lg">
                    <TrendingUp className="h-10 w-10 sm:h-12 sm:w-12 text-indigo-500" />
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-3">No tienes licencias activas</h3>
                  <p className="text-slate-600 mb-6 sm:mb-8 text-sm sm:text-base px-4 max-w-md mx-auto">
                    Adquiere una licencia para acceder a nuestras herramientas de arbitraje IA
                  </p>
                  <Link 
                    to="/user/buy"
                    className="group inline-flex items-center px-6 sm:px-8 py-3 sm:py-4 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white rounded-2xl hover:from-indigo-600 hover:via-purple-600 hover:to-pink-600 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm sm:text-base"
                  >
                    <DollarSign className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    Comprar Licencia
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <div className="bg-white/50 backdrop-blur-sm rounded-2xl border border-white/30 shadow-inner">
                    <table className="min-w-full">
                      <thead>
                        <tr className="border-b border-slate-200/50">
                          <th className="px-3 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-bold text-slate-700">Licencia</th>
                          <th className="px-3 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-bold text-slate-700 hidden sm:table-cell">Precio</th>
                          <th className="px-3 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-bold text-slate-700">Estado</th>
                          <th className="px-3 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-bold text-slate-700">Resultados & Progreso</th>
                          <th className="px-3 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-bold text-slate-700 hidden lg:table-cell">Tasa Diaria</th>
                          <th className="px-3 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-bold text-slate-700 hidden md:table-cell">Días Activos</th>
                          <th className="px-3 sm:px-6 py-4 sm:py-5 text-left text-xs sm:text-sm font-bold text-slate-700 hidden lg:table-cell">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200/30">
                        {topLicenses.map((license) => (
                          <LicenseRow key={license.id} license={license} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="relative overflow-hidden bg-gradient-to-br from-white/95 to-slate-50/95 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/30 mb-8 animate-slide-in-right">
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-br from-cyan-200/20 to-transparent rounded-full -translate-y-16 -translate-x-16"></div>
            <div className="absolute bottom-0 right-0 w-40 h-40 bg-gradient-to-tl from-purple-200/20 to-transparent rounded-full translate-y-20 translate-x-20"></div>
            <div className="relative p-6 border-b border-slate-200/50">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-cyan-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mb-1">
                  Acciones Rápidas
                </h2>
                <p className="text-slate-600 font-medium">Gestiona tu cuenta de forma eficiente</p>
              </div>
            </div>
            <div className="relative p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link 
                  to="/user/buy"
                  className="group relative overflow-hidden bg-gradient-to-br from-cyan-50 via-blue-50 to-indigo-50 rounded-2xl p-6 hover:from-cyan-100 hover:via-blue-100 hover:to-indigo-100 transition-all duration-300 border border-cyan-200/50 hover:border-cyan-300/70 hover:shadow-xl hover:scale-105"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-cyan-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
                  <div className="flex items-start relative z-10">
                    <div className="w-14 h-14 bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-cyan-500/30">
                      <DollarSign className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 text-lg relative z-10">Comprar Licencia</h3>
                  <p className="text-sm text-slate-600 relative z-10">Adquiere nuevas licencias de herramientas IA</p>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                    <ArrowRight className="h-6 w-6 text-cyan-600" />
                  </div>
                </Link>
                
                <Link 
                  to="/user/licenses"
                  className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 via-green-50 to-teal-50 rounded-2xl p-6 hover:from-emerald-100 hover:via-green-100 hover:to-teal-100 transition-all duration-300 border border-emerald-200/50 hover:border-emerald-300/70 hover:shadow-xl hover:scale-105"
                >
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-emerald-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
                  <div className="flex items-start relative z-10">
                    <div className="w-14 h-14 bg-gradient-to-r from-emerald-500 via-green-500 to-teal-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-emerald-500/30">
                      <TrendingUp className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 text-lg relative z-10">Ver Licencias</h3>
                  <p className="text-sm text-slate-600 relative z-10">Gestiona todas tus licencias activas</p>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                    <ArrowRight className="h-6 w-6 text-emerald-600" />
                  </div>
                </Link>
                
                <button className="group relative overflow-hidden bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-2xl p-6 hover:from-violet-100 hover:via-purple-100 hover:to-fuchsia-100 transition-all duration-300 border border-violet-200/50 hover:border-violet-300/70 hover:shadow-xl hover:scale-105">
                  <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-bl from-violet-200/30 to-transparent rounded-full -translate-y-10 translate-x-10"></div>
                  <div className="flex items-start relative z-10">
                    <div className="w-14 h-14 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 rounded-2xl flex items-center justify-center mb-4 group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 shadow-lg shadow-violet-500/30">
                      <Clock className="h-7 w-7 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-slate-800 mb-2 text-lg relative z-10">Descargar Reporte</h3>
                  <p className="text-sm text-slate-600 relative z-10">Obtén un reporte de tus resultados</p>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 group-hover:translate-x-1">
                    <Clock className="h-6 w-6 text-violet-600" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Account Summary & Referrals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-blue-50 rounded-3xl shadow-2xl border border-slate-200/50 p-6 hover-lift transition-all-smooth">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-blue-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-slate-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
              <div className="relative">
                <div className="flex items-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-r from-slate-600 to-blue-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                    <TrendingUp className="h-6 w-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-600 bg-clip-text text-transparent">Resumen de Cuenta</h3>
                </div>
                <div className="space-y-4">
                  <div className="group flex justify-between items-center p-4 bg-gradient-to-r from-cyan-50/80 to-blue-50/80 backdrop-blur-sm rounded-2xl border border-cyan-200/30 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center mr-3">
                        <Award className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-slate-700 font-semibold">Licencias Activas:</span>
                    </div>
                    <span className="font-bold text-cyan-700 text-xl">{activeLicenses.length}</span>
                  </div>
                  <div className="group flex justify-between items-center p-4 bg-gradient-to-r from-emerald-50/80 to-green-50/80 backdrop-blur-sm rounded-2xl border border-emerald-200/30 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-emerald-500 to-green-600 rounded-lg flex items-center justify-center mr-3">
                        <DollarSign className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-slate-700 font-semibold">Total Invertido:</span>
                    </div>
                    <span className="font-bold text-emerald-700 text-xl">
                      ${formatUSDTDisplay(
                        activeLicenses.reduce((sum, license) => 
                          sum + parseFloat(license.principal_usdt), 0
                        )
                      )}
                    </span>
                  </div>
                  <div className="group flex justify-between items-center p-4 bg-gradient-to-r from-amber-50/80 to-orange-50/80 backdrop-blur-sm rounded-2xl border border-amber-200/30 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg flex items-center justify-center mr-3">
                        <TrendingUp className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-slate-700 font-semibold">Total Ganado:</span>
                    </div>
                    <span className="font-bold text-amber-700 text-xl">
                      ${formatUSDTDisplay(
                        activeLicenses.reduce((sum, license) => 
                          sum + parseFloat(license.accrued_usdt || '0'), 0
                        )
                      )}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Sección Básica de Referidos */}
            <div className="relative overflow-hidden bg-gradient-to-br from-violet-50 to-fuchsia-50 rounded-3xl shadow-2xl border border-violet-200/50 p-6 hover-lift transition-all-smooth">
              <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-fuchsia-200/30 to-transparent rounded-full -translate-y-16 translate-x-16"></div>
              <div className="absolute bottom-0 left-0 w-24 h-24 bg-gradient-to-tr from-violet-200/30 to-transparent rounded-full translate-y-12 -translate-x-12"></div>
              <div className="relative">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center">
                    <div className="w-12 h-12 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-2xl flex items-center justify-center mr-4 shadow-lg">
                      <Gift className="h-6 w-6 text-white" />
                    </div>
                    <h3 className="text-xl font-bold bg-gradient-to-r from-violet-700 via-purple-600 to-fuchsia-600 bg-clip-text text-transparent">Programa de Referidos</h3>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="group flex justify-between items-center p-4 bg-gradient-to-r from-violet-50/80 to-purple-50/80 backdrop-blur-sm rounded-2xl border border-violet-200/30 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center mr-3">
                        <Users className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-slate-700 font-semibold">Referidos Activos:</span>
                    </div>
                    <span className="font-bold text-violet-700 text-xl">0</span>
                  </div>
                  <div className="group flex justify-between items-center p-4 bg-gradient-to-r from-fuchsia-50/80 to-pink-50/80 backdrop-blur-sm rounded-2xl border border-fuchsia-200/30 hover:shadow-lg transition-all duration-300">
                    <div className="flex items-center">
                      <div className="w-8 h-8 bg-gradient-to-r from-fuchsia-500 to-pink-600 rounded-lg flex items-center justify-center mr-3">
                        <Gift className="h-4 w-4 text-white" />
                      </div>
                      <span className="text-slate-700 font-semibold">Comisiones Ganadas:</span>
                    </div>
                    <span className="font-bold text-fuchsia-700 text-xl">
                      ${formatUSDTDisplay(balance?.pending_commissions || '0')}
                    </span>
                  </div>
                  <Link 
                    to="/user/referrals"
                    className="group w-full inline-flex items-center justify-center px-6 py-4 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-600 text-white rounded-2xl hover:from-violet-600 hover:via-purple-600 hover:to-fuchsia-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105 text-sm"
                  >
                    <Gift className="mr-2 h-5 w-5 group-hover:scale-110 transition-transform duration-300" />
                    Ver Programa Completo
                    <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform duration-300" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
    </Layout>
  );
};

export default DashboardPage;