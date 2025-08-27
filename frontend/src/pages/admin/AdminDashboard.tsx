import React, { useState, useEffect } from 'react';
import { Users, Package, ShoppingCart, BarChart3, Settings, UserPlus, CheckCircle, ArrowUpCircle, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import ProductsPage from './ProductsPage';
import AdminLayout from '../../components/layout/AdminLayout';
import { useAuth } from '../../contexts/AuthContext';
import { apiService } from '../../services/api';
import { useSSE } from '../../hooks/useSSE';

interface AdminStats {
  totalUsers: number;
  activeLicenses: number;
  totalEarningsDistributed: string;
  pendingWithdrawals: {
    count: number;
    amount: string;
  };
  totalProducts: number;
  totalOrders: number;
  pendingOrders: number;
  totalVolumeConfirmed: string;
  totalCommissionsPaid: string;
  totalSystemBalance: string;
}

interface RecentActivity {
  type: string;
  date: string;
  description: string;
  details: string;
  icon: string;
  timestamp: string;
}

interface AdminOverview {
  summary: AdminStats;
  recentActivity: RecentActivity[];
}

type ActiveTab = 'overview' | 'products' | 'orders' | 'users' | 'settings';

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [overview, setOverview] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const { connected, lastEvent } = useSSE();

  const fetchStats = async () => {
    try {
      setLoading(true);
      const data = await apiService.getAdminOverview();
      setOverview(data);
    } catch (error: any) {
      if (error?.response?.status === 401) {
        logout();
        navigate('/admin/login');
        return;
      }
      console.error('Error fetching admin overview:', error);
      toast.error('Error al cargar el resumen del dashboard');
    } finally {
      setLoading(false);
    }
  };

  const stats = overview?.summary || null;

  useEffect(() => {
    fetchStats();
  }, []);

  // Listen for SSE events to refresh data
  useEffect(() => {
    if (lastEvent) {
      // Refresh dashboard data on relevant events
      if (['orderUpdated', 'withdrawalUpdated', 'earningPaid', 'licenseCompleted'].includes(lastEvent.type)) {
        fetchStats();
      }
    }
  }, [lastEvent]);



  const menuItems = [
    { id: 'overview' as ActiveTab, label: 'Resumen', icon: BarChart3 },
    { id: 'products' as ActiveTab, label: 'Productos', icon: Package },
    { id: 'orders' as ActiveTab, label: 'Órdenes', icon: ShoppingCart },
    { id: 'settings' as ActiveTab, label: 'Configuración', icon: Settings },
  ];

  const handleUsersClick = () => {
    navigate('/admin/users');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'products':
        return <ProductsPage />;
      case 'overview':
        return (
          <div>
            <div className="mb-6 sm:mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-2">
                    Resumen del Sistema
                  </h1>
                  <p className="text-slate-600 text-sm sm:text-base lg:text-lg">Gestiona tu plataforma desde un solo lugar</p>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="bg-white/80 backdrop-blur-sm rounded-2xl px-4 py-2 shadow-lg border border-white/20">
                    <div className="flex items-center space-x-2">
                      <div className={`w-3 h-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
                      <span className="text-sm font-medium text-slate-700">
                        {connected ? 'Tiempo Real Activo' : 'Desconectado'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="relative">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-slate-200"></div>
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-blue-500 border-t-transparent absolute top-0 left-0"></div>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Usuarios</p>
                        <p className="text-3xl font-bold text-slate-800">{stats?.totalUsers || 0}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">usuarios registrados</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <Users className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Productos</p>
                        <p className="text-3xl font-bold text-slate-800">{stats?.totalProducts || 0}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">productos activos</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-400 to-blue-600 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <Package className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Total Órdenes</p>
                        <p className="text-3xl font-bold text-slate-800">{stats?.totalOrders || 0}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">órdenes procesadas</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <ShoppingCart className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Resultados Totales</p>
                        <p className="text-2xl font-bold text-slate-800">${stats?.totalEarningsDistributed || '0.000000'}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">USDT procesados</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <BarChart3 className="h-8 w-8 text-white" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Herramientas Activas</p>
                        <p className="text-3xl font-bold text-slate-800">{stats?.activeLicenses || 0}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">herramientas activas</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4 sm:gap-6 mb-6 sm:mb-8">
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Retiros Pendientes</p>
                        <p className="text-2xl font-bold text-slate-800">{stats?.pendingWithdrawals?.count || 0}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">${stats?.pendingWithdrawals?.amount || '0.00'} USDT</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Órdenes Pendientes</p>
                        <p className="text-3xl font-bold text-slate-800">{stats?.pendingOrders || 0}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">esperando confirmación</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Volumen Total Confirmado</p>
                        <p className="text-2xl font-bold text-slate-800">${stats?.totalVolumeConfirmed || '0.00'}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">USDT confirmados</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-700 to-blue-900 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Comisiones Pagadas</p>
                        <p className="text-2xl font-bold text-slate-800">${stats?.totalCommissionsPaid || '0.00'}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">USDT en comisiones</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                    </div>
                  </div>
                  
                  <div className="group bg-gradient-to-br from-white to-blue-50 p-4 sm:p-6 rounded-2xl shadow-lg border border-white/50 hover:shadow-xl transition-all duration-300 hover:transform hover:scale-105">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide mb-1">Balance Total Sistema</p>
                        <p className="text-2xl font-bold text-slate-800">${stats?.totalSystemBalance || '0.00'}</p>
                        <p className="text-xs text-blue-600 font-medium mt-1">USDT en sistema</p>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-800 rounded-2xl shadow-lg group-hover:shadow-blue-500/25 transition-all duration-300">
                        <svg className="h-8 w-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16l3-1m-3 1l-3-1" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20 mb-8">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Actividad Reciente</h2>
                      <p className="text-slate-600">Últimas actividades del sistema</p>
                    </div>
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-white" />
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    {overview?.recentActivity && overview.recentActivity.length > 0 ? (
                      overview.recentActivity.map((activity, index) => {
                        // Get icon component based on activity type
                        const getActivityIcon = (iconType: string) => {
                          switch (iconType) {
                            case 'user-plus':
                              return <UserPlus className="w-6 h-6 text-white" />;
                            case 'check-circle':
                              return <CheckCircle className="w-6 h-6 text-white" />;
                            case 'arrow-up-circle':
                              return <ArrowUpCircle className="w-6 h-6 text-white" />;
                            case 'trending-up':
                              return <TrendingUp className="w-6 h-6 text-white" />;
                            default:
                              return <BarChart3 className="w-6 h-6 text-white" />;
                          }
                        };

                        // Get color based on activity type
                        const getActivityColor = (type: string) => {
                          switch (type) {
                            case 'user_registration':
                              return 'from-green-500 to-green-600';
                            case 'order_confirmed':
                              return 'from-blue-500 to-blue-600';
                            case 'withdrawal_processed':
                              return 'from-purple-500 to-purple-600';
                            case 'daily_earnings':
                              return 'from-orange-500 to-orange-600';
                            default:
                              return 'from-slate-500 to-slate-600';
                          }
                        };

                        return (
                          <div key={index} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gradient-to-r from-slate-50 to-white rounded-2xl border border-slate-100 hover:shadow-md transition-shadow">
                            <div className="flex items-center space-x-4">
                              <div className={`w-12 h-12 bg-gradient-to-br ${getActivityColor(activity.type)} rounded-xl flex items-center justify-center`}>
                                {getActivityIcon(activity.icon)}
                              </div>
                              <div>
                                <p className="font-semibold text-slate-800">{activity.description}</p>
                                <p className="text-sm text-slate-600">{activity.details}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-sm text-slate-500">{activity.date}</span>
                              <p className="text-xs text-slate-400 capitalize">{activity.type.replace('_', ' ')}</p>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-8">
                        <div className="w-16 h-16 bg-gradient-to-br from-slate-200 to-slate-300 rounded-full flex items-center justify-center mx-auto mb-4">
                          <BarChart3 className="w-8 h-8 text-slate-500" />
                        </div>
                        <p className="text-slate-500 font-medium">No hay actividad reciente disponible</p>
                        <p className="text-sm text-slate-400 mt-1">Las actividades del sistema aparecerán aquí</p>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="bg-white/80 backdrop-blur-sm rounded-3xl p-4 sm:p-6 lg:p-8 shadow-xl border border-white/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6 sm:mb-8">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-800 mb-2">Accesos Rápidos</h2>
                      <p className="text-slate-600">Accede directamente a las funciones principales</p>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
                    <button
                      onClick={() => setActiveTab('orders')}
                      className="group p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Gestionar Órdenes</h3>
                          <p className="text-xs sm:text-sm text-slate-600">Ver y procesar órdenes pendientes</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="group p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Gestionar Herramientas</h3>
                          <p className="text-xs sm:text-sm text-slate-600">Administrar herramientas de usuarios</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={handleUsersClick}
                      className="group p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <Users className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Gestionar Usuarios</h3>
                          <p className="text-xs sm:text-sm text-slate-600">Ver y administrar todos los usuarios</p>
                        </div>
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setActiveTab('settings')}
                      className="group p-4 sm:p-6 bg-gradient-to-br from-blue-50 to-white rounded-2xl border border-blue-100 hover:border-blue-200 hover:shadow-lg transition-all duration-300 text-left"
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                          <svg className="w-5 h-5 sm:w-6 sm:h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-sm sm:text-base">Gestionar Retiros</h3>
                          <p className="text-xs sm:text-sm text-slate-600">Procesar solicitudes de retiro</p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        );
      default:
        return (
          <div className="p-8">
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-800 mb-4">
                {(() => {
                  const activeItem = menuItems.find(item => item.id === activeTab);
                  return activeItem ? activeItem.label : 'Página';
                })()}
              </h2>
              <p className="text-slate-600">Esta sección está en desarrollo.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <AdminLayout title="Panel de Administración">
      {renderContent()}
    </AdminLayout>
  );
};

export default AdminDashboard;