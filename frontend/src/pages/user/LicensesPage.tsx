import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Calendar, TrendingUp, DollarSign, Clock, Pause } from 'lucide-react';
import Layout from '../../components/layout/Layout';

import Button from '../../components/ui/Button';

import ProgressBar from '../../components/ui/ProgressBar';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { useLicenses, useLicenseEarnings } from '../../hooks/useLicenses';
import { useBalance } from '../../hooks/useBalance';
import { formatUSDTDisplay, formatPercentage, formatDate, calculateProgress } from '../../utils/format';
import { License } from '../../types';

// Real-time Production Component
interface RealTimeProductionProps {
  principal: number;
  startedAt?: string;
}

const RealTimeProduction: React.FC<RealTimeProductionProps> = ({ principal, startedAt }) => {
  const [currentEarnings, setCurrentEarnings] = useState(0);
  const [secondsElapsed, setSecondsElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt || !principal || isNaN(principal)) return;

    const interval = setInterval(() => {
      const now = new Date().getTime();
      const start = new Date(startedAt).getTime();
      const elapsedMs = now - start;
      const elapsedSeconds = Math.floor(elapsedMs / 1000);
      
      // Ensure we have valid numbers
      if (elapsedSeconds < 0) return;
      
      setSecondsElapsed(elapsedSeconds);
      
      // Calculate earnings: 10% daily = 0.1157% per second
      // Production per second = (principal * 0.1) / 86400
      const validPrincipal = parseFloat(principal.toString()) || 0;
      const productionPerSecond = (validPrincipal * 0.1) / 86400;
      const totalEarnings = productionPerSecond * elapsedSeconds;
      
      setCurrentEarnings(totalEarnings);
    }, 1000);

    return () => clearInterval(interval);
  }, [startedAt, principal]);

  if (!startedAt) {
    return (
      <div className="text-center text-gray-500 text-sm">
        ⏳ Producción no iniciada
      </div>
    );
  }

  const validPrincipal = parseFloat(principal?.toString() || '0') || 0;
  const productionPerSecond = (validPrincipal * 0.1) / 86400;

  return (
    <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg p-3 border border-green-200">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-green-700 font-medium flex items-center gap-2">
          <TrendingUp className="h-4 w-4" />
          Producción en Vivo
        </span>
        <span className="text-xs text-green-600 font-semibold">
          +${productionPerSecond.toFixed(6)}/seg
        </span>
      </div>
      
      <div className="text-center">
        <div className="text-lg font-bold text-green-700">
          ${currentEarnings.toFixed(6)} USDT
        </div>
        <div className="text-xs text-green-600">
          Generado en {Math.floor(secondsElapsed / 3600)}h {Math.floor((secondsElapsed % 3600) / 60)}m {secondsElapsed % 60}s
        </div>
      </div>
    </div>
  );
};

// Daily Timer Component
interface DailyTimerProps {
  startedAt?: string;
}

const DailyTimer: React.FC<DailyTimerProps> = ({ startedAt }) => {
  const [timeProgress, setTimeProgress] = useState(0);
  const [timeDisplay, setTimeDisplay] = useState('00:00:00');

  useEffect(() => {
    if (!startedAt) return;

    const updateTimer = () => {
      const now = new Date();
      const started = new Date(startedAt);
      
      // Calculate time elapsed since license started
      const timeSinceStart = now.getTime() - started.getTime();
      
      // Calculate current day progress (24 hours cycle)
      const dayInMs = 24 * 60 * 60 * 1000;
      const timeInCurrentDay = timeSinceStart % dayInMs;
      
      // Ensure we don't have negative values
      const validTimeInDay = Math.max(0, timeInCurrentDay);
      
      const progress = Math.min((validTimeInDay / dayInMs) * 100, 100);
      const hours = Math.floor(validTimeInDay / (60 * 60 * 1000));
      const minutes = Math.floor((validTimeInDay % (60 * 60 * 1000)) / (60 * 1000));
      const seconds = Math.floor((validTimeInDay % (60 * 1000)) / 1000);
      
      setTimeProgress(progress);
      setTimeDisplay(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return () => clearInterval(interval);
  }, [startedAt]);

  if (!startedAt) {
    return (
      <div className="text-xs text-gray-500 text-center">
        ⏱️ Timer iniciará al activarse
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center text-xs">
        <span className="text-gray-600 font-medium">⏱️ Progreso Diario</span>
        <span className="font-mono text-blue-600 font-semibold">{timeDisplay}</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
        <div 
          className="h-full bg-gradient-to-r from-orange-400 to-red-500 rounded-full transition-all duration-1000"
          style={{ width: `${timeProgress}%` }}
        ></div>
      </div>
      <div className="text-xs text-gray-500 text-center">
        {timeProgress.toFixed(1)}% del día completado
      </div>
    </div>
  );
};

// License Card Component
interface LicenseCardProps {
  license: License;
  isSelected: boolean;
  onClick: () => void;
}

const LicenseCard: React.FC<LicenseCardProps> = ({ license, isSelected, onClick }) => {
  const principal = parseFloat(license.principalUSDT || license.principal_usdt || '0');
  const accrued = parseFloat(license.accruedUSDT || license.accrued_usdt || '0');
  const cap = principal * 2; // 200% cap
  const progress = calculateProgress(accrued, cap);
  const isPaused = license.flags?.pause_potential || license.pause_potential || false;

  return (
    <div
      className={`bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6 cursor-pointer transition-all duration-300 hover:shadow-2xl hover:scale-[1.02] ${
        isSelected ? 'ring-2 ring-blue-500 bg-gradient-to-br from-blue-50/80 to-indigo-50/80' : 'hover:bg-white/95'
      }`}
      onClick={onClick}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
            <h3 className="font-bold text-gray-800">{license.product.name}</h3>
          </div>
          <p className="text-xs text-gray-500 font-medium truncate">Licencia #{license.id}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
          license.status === 'active' 
            ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
            : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
        }`}>
          {license.status === 'active' ? '🟢 Activa' : '⚪ Inactiva'}
        </span>
      </div>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 font-medium">Principal:</span>
          <span className="text-lg font-bold text-gray-800">${formatUSDTDisplay(license.principal_usdt)}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 font-medium">Acumulado:</span>
          <span className="text-lg font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">${formatUSDTDisplay(license.accrued_usdt || '0')}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600 font-medium">Días:</span>
          <span className="text-base font-bold text-purple-600">{license.days_generated || 0}/20 días</span>
        </div>
        
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm text-gray-600 font-medium">Progreso:</span>
          <span className="text-base font-bold text-blue-600">{formatPercentage(progress)}</span>
        </div>
        
        <div className="w-full bg-gray-200 rounded-full h-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between items-center text-sm pt-3">
          <span className="text-gray-500 font-medium">Límite: ${formatUSDTDisplay(cap.toString())}</span>
          {isPaused && (
            <span className="flex items-center gap-1 text-orange-600 font-semibold text-sm">
              <Pause className="h-4 w-4" />
              Pausada
            </span>
          )}
        </div>
        
        {/* Real-time Production */}
        <div className="mt-4 pt-3 border-t border-gray-200">
          <RealTimeProduction 
            principal={principal} 
            startedAt={license.started_at || license.startedAt} 
          />
        </div>
        
        {/* Daily Timer */}
        <div className="mt-3">
          <DailyTimer startedAt={license.started_at || license.startedAt} />
        </div>
      </div>
    </div>
  );
};

// License Details Component
interface LicenseDetailsProps {
  license: License;
  earnings: any[];
  loading: boolean;
}

const LicenseDetails: React.FC<LicenseDetailsProps> = ({ license, earnings, loading }) => {
  const principal = parseFloat(license.principalUSDT || license.principal_usdt || '0');
  const accrued = parseFloat(license.accruedUSDT || license.accrued_usdt || '0');
  const cap = principal * 2;
  const progress = calculateProgress(accrued, cap);
  
  // Calculate days generated and phase information
  const daysGenerated = license.daysGenerated || license.days_generated || 0;
  const cashbackDays = Math.min(daysGenerated, 10);
  const potentialDays = Math.max(0, daysGenerated - 10);
  const cashbackAmount = principal * 0.1 * cashbackDays;
  const potentialAmount = accrued - cashbackAmount;
  
  // Calculate end dates
  const startDate = license.started_at ? new Date(license.started_at) : null;
  const cashbackEndDate = startDate ? new Date(startDate.getTime() + (10 * 24 * 60 * 60 * 1000)) : null;
  const licenseEndDate = startDate ? new Date(startDate.getTime() + (20 * 24 * 60 * 60 * 1000)) : null;

  return (
    <div className="space-y-6">
      {/* License Overview */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-base sm:text-lg">💼</span>
            </div>
            <div className="min-w-0 flex-1">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800 truncate">{license.product.name}</h3>
              <p className="text-xs text-gray-500 truncate">Licencia #{license.id}</p>
            </div>
          </div>
          <span className={`px-3 sm:px-4 py-1 sm:py-2 rounded-xl text-xs sm:text-sm font-semibold text-center flex-shrink-0 ${
            license.status === 'active' 
              ? 'bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200' 
              : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-700 border border-gray-300'
          }`}>
            {license.status === 'active' ? '🟢 Activa' : '⚪ Inactiva'}
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 mb-6">
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-3 sm:p-4 border border-blue-100">
            <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1">💰 Monto Principal</p>
            <p className="text-xl sm:text-2xl font-bold text-blue-700 truncate">${formatUSDTDisplay(license.principalUSDT || license.principal_usdt || '0')}</p>
          </div>
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-3 sm:p-4 border border-green-100">
            <p className="text-xs sm:text-sm text-green-600 font-medium mb-1">📈 Total Acumulado</p>
            <p className="text-xl sm:text-2xl font-bold text-green-700 truncate">${formatUSDTDisplay(license.accruedUSDT || license.accrued_usdt || '0')}</p>
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <span className="text-base text-gray-700 font-semibold">🎯 Progreso al Límite</span>
            <span className="text-lg font-bold text-blue-600">{formatPercentage(progress)}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-5 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <p className="text-base text-gray-600 mt-3 text-center font-medium">Límite: ${formatUSDTDisplay(cap.toString())}</p>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 text-sm bg-gray-50 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col gap-2">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">📅 Fecha de Compra</span>
            <span className="font-bold text-gray-800 text-base">{formatDate(license.created_at || '')}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">🚀 Fecha de Activación</span>
            <span className="font-bold text-gray-800 text-base">{license.started_at ? formatDate(license.started_at) : 'Pendiente'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">🆔 ID de Licencia</span>
            <span className="font-bold text-gray-800 text-xs truncate">#{license.id}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">⏱️ Días Generados</span>
            <span className="font-bold text-purple-600 text-base">{daysGenerated}/20 días</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">🏁 Fin Cashback</span>
            <span className="font-bold text-gray-800 text-base">{cashbackEndDate ? formatDate(cashbackEndDate.toISOString()) : 'Calculando...'}</span>
          </div>
          <div className="flex flex-col gap-2">
            <span className="text-gray-600 font-medium text-xs uppercase tracking-wide">🎯 Fin Licencia</span>
            <span className="font-bold text-gray-800 text-base">{licenseEndDate ? formatDate(licenseEndDate.toISOString()) : 'Calculando...'}</span>
          </div>
        </div>
      </div>
      
      {/* Phase Breakdown */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="text-center mb-6">
          <h4 className="text-xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
            📊 Desglose por Fases
          </h4>
          <p className="text-gray-600">Separación entre Cashback y Potencial</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Cashback Phase */}
          <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-lg font-bold text-green-700 flex items-center gap-2">
                💰 Fase Cashback
              </h5>
              <span className="text-sm font-semibold text-green-600 bg-green-100 px-2 py-1 rounded-lg">
                Días 1-10
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Días Completados:</span>
                <span className="font-bold text-green-700">{cashbackDays}/10</span>
              </div>
              
              <div className="w-full bg-green-200 rounded-full h-3">
                <div 
                  className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500"
                  style={{ width: `${(cashbackDays / 10) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-green-600">Ganancia Estimada:</span>
                <span className="font-bold text-green-700">${formatUSDTDisplay(cashbackAmount.toFixed(6))}</span>
              </div>
              
              <div className="text-xs text-green-600 bg-green-100 p-2 rounded-lg">
                ✅ Se aplica directamente al balance
              </div>
            </div>
          </div>
          
          {/* Potential Phase */}
          <div className="bg-gradient-to-br from-purple-50 to-violet-50 rounded-xl p-4 border border-purple-200">
            <div className="flex items-center justify-between mb-4">
              <h5 className="text-lg font-bold text-purple-700 flex items-center gap-2">
                🚀 Fase Potencial
              </h5>
              <span className="text-sm font-semibold text-purple-600 bg-purple-100 px-2 py-1 rounded-lg">
                Días 11-20
              </span>
            </div>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-600">Días Completados:</span>
                <span className="font-bold text-purple-700">{potentialDays}/10</span>
              </div>
              
              <div className="w-full bg-purple-200 rounded-full h-3">
                <div 
                  className="h-full bg-gradient-to-r from-purple-500 to-violet-600 rounded-full transition-all duration-500"
                  style={{ width: `${(potentialDays / 10) * 100}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-sm text-purple-600">Ganancia Acumulada:</span>
                <span className="font-bold text-purple-700">${formatUSDTDisplay(Math.max(0, potentialAmount).toFixed(6))}</span>
              </div>
              
              <div className="text-xs text-purple-600 bg-purple-100 p-2 rounded-lg">
                ⏳ Se libera al completar la licencia
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 20-Day Earning Calendar */}
      <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-6">
        <div className="text-center mb-6">
          <h4 className="text-xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
            📅 Calendario de Ganancias (20 Días)
          </h4>
          <p className="text-gray-600">Liberación cada 24 horas - Seguimiento diario</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
        ) : (
          <EarningCalendar earnings={earnings} />
        )}
      </div>
    </div>
  );
};

// Earning Calendar Component
interface EarningCalendarProps {
  earnings: any[];
}

const EarningCalendar: React.FC<EarningCalendarProps> = ({ earnings }) => {
  return (
    <div className="space-y-6">
      {/* Cashback Phase (Days 1-10) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
          <h5 className="text-lg font-bold text-green-700">💰 Fase Cashback (Días 1-10)</h5>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Se aplica al balance</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({ length: 10 }, (_, index) => {
            const dayNumber = index + 1;
            const earning = earnings.find(e => {
              const earningDate = new Date(e.created_at);
              const daysSinceStart = Math.floor((earningDate.getTime() - new Date(earnings[0]?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return daysSinceStart === dayNumber;
            });
            
            return (
              <div
                key={dayNumber}
                className={`p-2 rounded-lg border text-center transition-all duration-300 hover:scale-105 relative min-h-[80px] ${
                  earning
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300 shadow-lg'
                    : dayNumber <= new Date().getDate()
                    ? 'bg-gradient-to-br from-green-25 to-emerald-25 border-green-200 shadow-md'
                    : 'bg-white border-green-100 shadow-sm'
                }`}
              >
                <div className="absolute -top-1 -right-1 text-xs bg-green-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">💰</div>
                <div className="text-[10px] font-bold text-green-600 mb-1">Día {dayNumber}</div>
                {earning ? (
                  <>
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-green-500 text-sm">✅</span>
                    </div>
                    <div className="text-[10px] font-bold text-green-700 mb-1 truncate">
                      ${formatUSDTDisplay(earning.amount_usdt)}
                    </div>
                    <div className="text-[8px] text-green-600 truncate">
                      {formatDate(earning.created_at)}
                    </div>
                  </>
                ) : dayNumber <= new Date().getDate() ? (
                  <>
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-green-400 text-sm">⏳</span>
                    </div>
                    <div className="text-[9px] text-green-600 font-medium">Procesando</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-green-300 text-sm">📅</span>
                    </div>
                    <div className="text-[9px] text-green-500 font-medium">Pendiente</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Potential Phase (Days 11-20) */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <div className="w-4 h-4 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full"></div>
          <h5 className="text-lg font-bold text-purple-700">🚀 Fase Potencial (Días 11-20)</h5>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">Se libera al completar</span>
        </div>
        <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
          {Array.from({ length: 10 }, (_, index) => {
            const dayNumber = index + 11;
            const earning = earnings.find(e => {
              const earningDate = new Date(e.created_at);
              const daysSinceStart = Math.floor((earningDate.getTime() - new Date(earnings[0]?.created_at || Date.now()).getTime()) / (1000 * 60 * 60 * 24)) + 1;
              return daysSinceStart === dayNumber;
            });
            
            return (
              <div
                key={dayNumber}
                className={`p-2 rounded-lg border text-center transition-all duration-300 hover:scale-105 relative min-h-[80px] ${
                  earning
                    ? 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-300 shadow-lg'
                    : dayNumber <= new Date().getDate()
                    ? 'bg-gradient-to-br from-purple-25 to-violet-25 border-purple-200 shadow-md'
                    : 'bg-white border-purple-100 shadow-sm'
                }`}
              >
                <div className="absolute -top-1 -right-1 text-xs bg-purple-500 text-white rounded-full w-4 h-4 flex items-center justify-center font-bold text-[10px]">🚀</div>
                <div className="text-[10px] font-bold text-purple-600 mb-1">Día {dayNumber}</div>
                {earning ? (
                  <>
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-purple-500 text-sm">✅</span>
                    </div>
                    <div className="text-[10px] font-bold text-purple-700 mb-1 truncate">
                      ${formatUSDTDisplay(earning.amount_usdt)}
                    </div>
                    <div className="text-[8px] text-purple-600 truncate">
                      {formatDate(earning.created_at)}
                    </div>
                  </>
                ) : dayNumber <= new Date().getDate() ? (
                  <>
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-purple-400 text-sm">⏳</span>
                    </div>
                    <div className="text-[9px] text-purple-600 font-medium">Procesando</div>
                  </>
                ) : (
                  <>
                    <div className="flex items-center justify-center mb-1">
                      <span className="text-purple-300 text-sm">📅</span>
                    </div>
                    <div className="text-[9px] text-purple-500 font-medium">Pendiente</div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const LicensesPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { licenses, loading: licensesLoading, error: licensesError } = useLicenses('active');
  const { loading: balanceLoading } = useBalance();
  const [selectedLicense, setSelectedLicense] = useState<License | null>(null);
  const { earnings, loading: earningsLoading } = useLicenseEarnings(selectedLicense?.id || null);

  // Auto-select license if ID is provided in URL
  useEffect(() => {
    if (id && licenses.length > 0) {
      const license = licenses.find(l => l.id === id);
      if (license) {
        setSelectedLicense(license);
      }
    }
  }, [id, licenses]);

  // Calculate KPIs
  const activeLicenses = licenses.filter(l => l.status === 'active');
  const totalInvested = activeLicenses.reduce((sum, license) => {
    // Use principalUSDT first, then fallback to product.price_usdt
    const principal = license.principalUSDT || license.product?.price_usdt || '0';
    return sum + parseFloat(principal);
  }, 0);
  const totalEarned = activeLicenses.reduce((sum, license) => sum + parseFloat(license.accrued_usdt || '0'), 0);
  const avgProgress = activeLicenses.length > 0 
    ? activeLicenses.reduce((sum, license) => {
        const principal = parseFloat(license.principal_usdt);
        const accrued = parseFloat(license.accrued_usdt || '0');
        const cap = principal * 2; // 200% cap
        return sum + calculateProgress(accrued, cap);
      }, 0) / activeLicenses.length
    : 0;

  if (licensesLoading || balanceLoading) {
    return (
      <Layout title="My Licenses">
        <div className="p-6">
          <LoadingSpinner size="lg" text="Loading licenses..." className="mt-20" />
        </div>
      </Layout>
    );
  }

  if (licensesError) {
    return (
      <Layout title="My Licenses">
        <div className="p-6">
          <div className="max-w-7xl mx-auto">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-800">Error loading licenses: {licensesError}</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="My Licenses">
      <div className="bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 relative">
        {/* Geometric background patterns */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-20 w-40 h-40 bg-blue-200/20 rounded-full"></div>
          <div className="absolute top-40 right-32 w-32 h-32 bg-indigo-200/30 rounded-lg rotate-45"></div>
          <div className="absolute bottom-32 left-1/3 w-48 h-48 bg-slate-200/15 rounded-full"></div>
          <div className="absolute bottom-20 right-20 w-36 h-36 bg-blue-300/20 rounded-lg rotate-12"></div>
        </div>
        
        <div className="relative z-10 p-6">
          {/* Production Indicator */}
          <div className="flex justify-center mb-4">
            <div className="inline-flex items-center gap-2 bg-green-100 border border-green-200 rounded-full px-3 py-1 text-xs font-medium text-green-700">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              🚀 Sistema en Producción
            </div>
          </div>
          
          {/* Welcome Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
              📊 Mis Licencias
            </h1>
            <p className="text-gray-600 text-lg">Gestiona y monitorea el rendimiento de tus herramientas tecnológicas</p>
          </div>
          
          <div className="max-w-7xl mx-auto space-y-8">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Licencias Activas</p>
                    <p className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent truncate">{activeLicenses.length}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Calendar className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Total Invertido</p>
                    <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-emerald-600 to-green-700 bg-clip-text text-transparent truncate">${formatUSDTDisplay(totalInvested.toString())}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <DollarSign className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Total Ganado</p>
                    <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-purple-600 to-pink-700 bg-clip-text text-transparent truncate">${formatUSDTDisplay(totalEarned.toString())}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-purple-500 to-pink-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <TrendingUp className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                </div>
              </div>

              <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs sm:text-sm font-medium text-gray-600 mb-1 sm:mb-2">Progreso Promedio</p>
                    <p className="text-xl sm:text-3xl font-bold bg-gradient-to-r from-orange-600 to-red-700 bg-clip-text text-transparent truncate">{formatPercentage(avgProgress)}</p>
                  </div>
                  <div className="w-10 h-10 sm:w-14 sm:h-14 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl flex items-center justify-center flex-shrink-0">
                    <Clock className="h-5 w-5 sm:h-7 sm:w-7 text-white" />
                  </div>
                </div>
                <div className="mt-3">
                  <ProgressBar value={avgProgress} className="h-2 bg-gray-200 rounded-full overflow-hidden" />
                </div>
              </div>
            </div>

            {/* Main Content */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8">
              {/* Licenses List */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
                    💼 Tus Licencias
                  </h2>
                  <p className="text-gray-600">Selecciona una licencia para ver sus detalles</p>
                </div>
                
                {activeLicenses.length === 0 ? (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Calendar className="h-10 w-10 text-gray-500" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">No tienes licencias activas</h3>
                    <p className="text-gray-500 mb-6">Adquiere una licencia para acceder a nuestras herramientas de arbitraje IA</p>
                    <Button 
                      onClick={() => navigate('/user/buy')}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white px-6 py-3 rounded-xl font-semibold"
                    >
                      Comprar Licencia
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {activeLicenses.map((license) => (
                      <LicenseCard
                        key={license.id}
                        license={license}
                        isSelected={selectedLicense?.id === license.id}
                        onClick={() => setSelectedLicense(license)}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* License Details */}
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
                    📈 Detalles de Licencia
                  </h2>
                  <p className="text-gray-600">Información detallada y calendario de ganancias</p>
                </div>
                
                {selectedLicense ? (
                  <LicenseDetails
                    license={selectedLicense}
                    earnings={earnings}
                    loading={earningsLoading}
                  />
                ) : (
                  <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-200 to-indigo-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                      <Calendar className="h-10 w-10 text-blue-600" />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-700 mb-2">Selecciona una licencia</h3>
                    <p className="text-gray-500">Haz clic en cualquier tarjeta de licencia para ver el calendario de ganancias de 20 días</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default LicensesPage;