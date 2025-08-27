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
  const progress = license.product.duration_days > 0
          ? Math.min(((license.days_active || 0) / license.product.duration_days) * 100, 100)
          : 0;
  
  // Campos adicionales según checklist
  const cashbackAccum = parseFloat(license.cashback_accum || '0');
  const potentialAccum = parseFloat(license.potential_accum || '0');
  const priceUsdt = parseFloat(license.product.price_usdt || '0');
  const cashbackProgress = priceUsdt > 0 ? (cashbackAccum / priceUsdt) * 100 : 0;
  const potentialProgress = priceUsdt > 0 ? (potentialAccum / priceUsdt) * 100 : 0;
  const dayIndexActual = license.days_active || 0;
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
  const activeLicenses = licenses.filter(l => l.status === 'active');
  const topLicenses = activeLicenses.slice(0, 3);

  return (
    <Layout title="Dashboard">
      {/* Welcome Header */}
      <div className="mb-6 sm:mb-8">
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl sm:rounded-3xl shadow-xl border border-white/20 p-4 sm:p-6 lg:p-8">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent mb-2">
                    Dashboard de Herramientas IA
                  </h1>
                  <p className="text-gray-600 text-sm sm:text-base lg:text-lg">Bienvenido de vuelta! Aquí tienes el resumen de tus herramientas tecnológicas</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                    <span className="text-xs text-gray-500">
                      {connected ? 'Actualizaciones en tiempo real' : 'Sin conexión en tiempo real'}
                    </span>
                  </div>
                </div>
                <div className="hidden sm:block ml-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-lg">
                    <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-white" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Balance Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-emerald-400 to-green-500 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Saldo Disponible</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-600 bg-clip-text text-transparent truncate">
                    ${formatUSDTDisplay(balance?.available || '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-amber-400 to-orange-500 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Potencial en Espera</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent truncate">
                    ${formatUSDTDisplay(balance?.on_hold_potential || '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-blue-400 to-indigo-500 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <Users className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Comisiones Pendientes</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent truncate">
                    ${formatUSDTDisplay(balance?.pending_commissions || '0')}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
              <div className="flex items-center">
                <div className="p-2 sm:p-3 bg-gradient-to-r from-purple-400 to-violet-500 rounded-lg sm:rounded-xl shadow-lg flex-shrink-0">
                  <Award className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="ml-3 sm:ml-4 min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-gray-600 mb-1">Licencias Activas</p>
                  <p className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-purple-600 to-violet-600 bg-clip-text text-transparent truncate">
                    {activeLicenses.length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Active Licenses Section */}
          <div className="bg-white/90 backdrop-blur-sm rounded-xl sm:rounded-2xl shadow-xl border border-white/20 mb-6 sm:mb-8">
            <div className="p-4 sm:p-6 border-b border-gray-100">
              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
                <div className="min-w-0">
                  <h2 className="text-xl sm:text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                    Licencias Activas (Top 3)
                  </h2>
                  <p className="text-gray-600 text-sm sm:text-base">Tus herramientas tecnológicas activas generando resultados</p>
                </div>
                <Link 
                  to="/user/licenses"
                  className="inline-flex items-center justify-center px-4 py-2 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base whitespace-nowrap"
                >
                  Ver Todas
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              {topLicenses.length === 0 ? (
                <div className="text-center py-8 sm:py-16">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-xl sm:rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
                    <TrendingUp className="h-8 w-8 sm:h-10 sm:w-10 text-gray-500" />
                  </div>
                  <h3 className="text-lg sm:text-xl font-semibold text-gray-700 mb-2">No tienes licencias activas</h3>
                  <p className="text-gray-500 mb-4 sm:mb-6 text-sm sm:text-base px-4">
                    Adquiere una licencia para acceder a nuestras herramientas de arbitraje IA
                  </p>
                  <Link 
                    to="/user/buy"
                    className="inline-flex items-center px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl hover:from-blue-600 hover:to-indigo-700 font-semibold transition-all duration-200 shadow-lg hover:shadow-xl text-sm sm:text-base"
                  >
                    Comprar Licencia
                  </Link>
                </div>
              ) : (
                <div className="overflow-x-auto -mx-4 sm:mx-0">
                  <table className="min-w-full">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Licencia</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden sm:table-cell">Precio</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Estado</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700">Resultados & Progreso</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">Tasa Diaria</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden md:table-cell">Días Activos</th>
                        <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs sm:text-sm font-semibold text-gray-700 hidden lg:table-cell">Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {topLicenses.map((license) => (
                        <LicenseRow key={license.id} license={license} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 mb-8">
            <div className="p-6 border-b border-gray-100">
              <div>
                <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-1">
                  Acciones Rápidas
                </h2>
                <p className="text-gray-600">Gestiona tu cuenta de forma eficiente</p>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Link 
                  to="/user/buy"
                  className="group relative overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl p-6 hover:from-blue-100 hover:to-indigo-100 transition-all duration-300 border border-blue-100 hover:border-blue-200 hover:shadow-lg"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                      <DollarSign className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Comprar Licencia</h3>
                  <p className="text-sm text-gray-600">Adquiere nuevas licencias de herramientas IA</p>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowRight className="h-5 w-5 text-blue-600" />
                  </div>
                </Link>
                
                <Link 
                  to="/user/licenses"
                  className="group relative overflow-hidden bg-gradient-to-br from-emerald-50 to-green-50 rounded-2xl p-6 hover:from-emerald-100 hover:to-green-100 transition-all duration-300 border border-emerald-100 hover:border-emerald-200 hover:shadow-lg"
                >
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-green-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                      <TrendingUp className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Ver Licencias</h3>
                  <p className="text-sm text-gray-600">Gestiona todas tus licencias activas</p>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <ArrowRight className="h-5 w-5 text-emerald-600" />
                  </div>
                </Link>
                
                <button className="group relative overflow-hidden bg-gradient-to-br from-purple-50 to-violet-50 rounded-2xl p-6 hover:from-purple-100 hover:to-violet-100 transition-all duration-300 border border-purple-100 hover:border-purple-200 hover:shadow-lg">
                  <div className="flex items-start">
                    <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-violet-600 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform duration-200">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                  </div>
                  <h3 className="font-bold text-gray-900 mb-2">Descargar Reporte</h3>
                  <p className="text-sm text-gray-600">Obtén un reporte de tus resultados</p>
                  <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    <Clock className="h-5 w-5 text-purple-600" />
                  </div>
                </button>
              </div>
            </div>
          </div>

          {/* Account Summary & Referrals */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <h3 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-6">Resumen de Cuenta</h3>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                  <span className="text-gray-700 font-medium">Licencias Activas:</span>
                  <span className="font-bold text-blue-600 text-lg">{activeLicenses.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                  <span className="text-gray-700 font-medium">Total Invertido:</span>
                  <span className="font-bold text-emerald-600 text-lg">
                    ${formatUSDTDisplay(
                      activeLicenses.reduce((sum, license) => 
                        sum + parseFloat(license.principal_usdt), 0
                      )
                    )}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl">
                  <span className="text-gray-700 font-medium">Total Ganado:</span>
                  <span className="font-bold text-amber-600 text-lg">
                    ${formatUSDTDisplay(
                      activeLicenses.reduce((sum, license) => 
                        sum + parseFloat(license.accrued_usdt || '0'), 0
                      )
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Sección Básica de Referidos */}
            <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">Programa de Referidos</h3>
                <Gift className="h-6 w-6 text-purple-600" />
              </div>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl">
                  <span className="text-gray-700 font-medium">Referidos Activos:</span>
                  <span className="font-bold text-purple-600 text-lg">0</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-pink-50 to-rose-50 rounded-xl">
                  <span className="text-gray-700 font-medium">Comisiones Ganadas:</span>
                  <span className="font-bold text-pink-600 text-lg">
                    ${formatUSDTDisplay(balance?.pending_commissions || '0')}
                  </span>
                </div>
                <Link 
                  to="/user/referrals"
                  className="w-full inline-flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl hover:from-purple-600 hover:to-violet-700 font-medium transition-all duration-200 shadow-lg hover:shadow-xl text-sm"
                >
                  <Gift className="mr-2 h-4 w-4" />
                  Ver Programa Completo
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
    </Layout>
  );
};

export default DashboardPage;