import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Clock, CheckCircle, Copy } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { apiService } from '../../services/api';
import { formatUSDT, formatDate } from '../../utils/format';
import { useAuth } from '../../contexts/AuthContext';
import { useSSE } from '../../hooks/useSSE';

interface Referral {
  id: string;
  email: string;
  ref_code: string;
  created_at: string;
  orders: Array<{
    id: string;
    amount_usdt: string;
    created_at: string;
    product: {
      name: string;
    };
  }>;
  referral_commissions_referred: Array<{
    id: string;
    amount_usdt: string;
    status: string;
    created_at: string;
    release_at?: string;
  }>;
}

interface Commission {
  id: string;
  amount_usdt: string;
  status: string;
  created_at: string;
  release_at?: string;
  referred_user: {
    email: string;
    ref_code: string;
  };
}

const UserReferralsPage: React.FC = () => {
  const { user } = useAuth();
  const { lastEvent } = useSSE();
  const [activeTab, setActiveTab] = useState<'referrals' | 'commissions'>('referrals');
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [loading, setLoading] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  const referralLink = `${window.location.origin}/register?ref=${user?.ref_code}`;

  useEffect(() => {
    fetchData();
  }, [activeTab, pagination.page]);

  // Listen for commission release events via SSE
  useEffect(() => {
    if (lastEvent && lastEvent.type === 'commissionReleased') {
      console.log('Commission released event received:', lastEvent.data);
      // Refresh commission data if we're on the commissions tab
      if (activeTab === 'commissions') {
        fetchData();
      }
    }
  }, [lastEvent, activeTab]);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔍 [DEBUG] Starting fetchData...');
      console.log('🔍 [DEBUG] Current user:', user);
      
      // Always fetch both referrals and commissions for the stats cards
      const [referralsResponse, commissionsResponse] = await Promise.all([
        apiService.getUserReferrals(1, 100), // Get all referrals for stats
        apiService.getUserCommissions(1, 100) // Get all commissions for stats
      ]);
      
      console.log('🔍 [DEBUG] Referrals response:', referralsResponse);
      console.log('🔍 [DEBUG] Commissions response:', commissionsResponse);
      
      if (referralsResponse.success) {
        console.log('Referrals data received:', referralsResponse.data.referrals);
        setReferrals(referralsResponse.data.referrals);
        console.log('🔍 [DEBUG] Referrals set:', referralsResponse.data.referrals);
      }
      
      if (commissionsResponse.success) {
        console.log('Commissions data received:', commissionsResponse.data.commissions);
        setCommissions(commissionsResponse.data.commissions);
        console.log('🔍 [DEBUG] Commissions set:', commissionsResponse.data.commissions);
        console.log('🔍 [DEBUG] Commissions array length:', commissionsResponse.data.commissions.length);
        
        // Debug calculation
        const totalReleased = commissionsResponse.data.commissions.reduce((total: number, commission: Commission) => {
          if (commission.status === 'released') {
            console.log('🔍 [DEBUG] Adding released commission:', commission.amount_usdt, 'USDT');
            return total + parseFloat(commission.amount_usdt);
          }
          return total;
        }, 0);
        
        const totalPending = commissionsResponse.data.commissions.reduce((total: number, commission: Commission) => {
          if (commission.status === 'pending') {
            console.log('🔍 [DEBUG] Adding pending commission:', commission.amount_usdt, 'USDT');
            return total + parseFloat(commission.amount_usdt);
          }
          return total;
        }, 0);
        
        console.log('🔍 [DEBUG] Calculated totals - Released:', totalReleased, 'Pending:', totalPending, 'Total:', totalReleased + totalPending);
      }
      
      // Set pagination based on active tab
      if (activeTab === 'referrals' && referralsResponse.success) {
        setPagination(referralsResponse.data.pagination);
      } else if (activeTab === 'commissions' && commissionsResponse.success) {
        setPagination(commissionsResponse.data.pagination);
      }
      
    } catch (error) {
      console.error('❌ [DEBUG] Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error('Error copying to clipboard:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning">⏳ Pendiente</Badge>;
      case 'released':
        return <Badge variant="success">✅ Liberada</Badge>;
      case 'cancelled':
        return <Badge variant="danger">❌ Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const calculateTotalCommissions = () => {
    console.log('🔍 [CALC] calculateTotalCommissions called');
    console.log('🔍 [CALC] commissions array:', commissions);
    console.log('🔍 [CALC] commissions length:', commissions.length);
    
    const releasedCommissions = commissions.filter(commission => commission.status === 'released');
    console.log('🔍 [CALC] Released commissions for total calculation:', releasedCommissions);
    
    const total = commissions.reduce((total: number, commission: Commission) => {
      console.log('🔍 [CALC] Processing commission:', commission.id, 'status:', commission.status, 'amount:', commission.amount_usdt);
      if (commission.status === 'released') {
        const amount = parseFloat(commission.amount_usdt);
        console.log('🔍 [CALC] Adding released commission amount:', amount);
        return total + amount;
      }
      return total;
    }, 0);
    console.log('🔍 [CALC] Total commissions calculated:', total);
    return total;
  };

  const calculatePendingCommissions = () => {
    const pendingCommissions = commissions.filter(commission => commission.status === 'pending');
    console.log('Pending commissions for calculation:', pendingCommissions);
    const total = commissions.reduce((total: number, commission: Commission) => {
      if (commission.status === 'pending') {
        return total + parseFloat(commission.amount_usdt);
      }
      return total;
    }, 0);
    console.log('Pending commissions calculated:', total);
    return total;
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 p-4 sm:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent mb-2">
              Sistema de Referidos
            </h1>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg">
              Invita amigos y gana comisiones del 10% por cada compra que realicen
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-blue-100 text-xs sm:text-sm font-medium truncate">Total Referidos</p>
                  <p className="text-xl sm:text-2xl font-bold">{referrals.length}</p>
                </div>
                <Users className="w-6 h-6 sm:w-8 sm:h-8 text-blue-200 flex-shrink-0" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-green-100 text-xs sm:text-sm font-medium truncate">Comisiones Liberadas</p>
                  <p className="text-xl sm:text-2xl font-bold truncate">{formatUSDT(calculateTotalCommissions())}</p>
                </div>
                <CheckCircle className="w-6 h-6 sm:w-8 sm:h-8 text-green-200 flex-shrink-0" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-yellow-500 to-orange-500 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-yellow-100 text-xs sm:text-sm font-medium truncate">Comisiones Pendientes</p>
                  <p className="text-xl sm:text-2xl font-bold truncate">{formatUSDT(calculatePendingCommissions())}</p>
                </div>
                <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-yellow-200 flex-shrink-0" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-4 sm:p-6">
              <div className="flex items-center justify-between">
                <div className="flex-1 min-w-0">
                  <p className="text-purple-100 text-xs sm:text-sm font-medium truncate">Total Comisiones</p>
                  <p className="text-xl sm:text-2xl font-bold truncate">{formatUSDT(calculateTotalCommissions() + calculatePendingCommissions())}</p>
                </div>
                <DollarSign className="w-6 h-6 sm:w-8 sm:h-8 text-purple-200 flex-shrink-0" />
              </div>
            </Card>
          </div>

          {/* Referral Link */}
          <Card className="mb-6 sm:mb-8 p-4 sm:p-6">
            <div className="space-y-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-800">Tu Enlace de Referido</h3>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <div className="flex-1 bg-gray-50 rounded-lg p-3 border min-w-0">
                  <code className="text-xs sm:text-sm text-gray-700 break-all">{referralLink}</code>
                </div>
                <Button
                  onClick={copyReferralLink}
                  variant={copySuccess ? 'success' : 'primary'}
                  className="flex items-center justify-center gap-2 w-full sm:w-auto flex-shrink-0"
                >
                  <Copy className="w-4 h-4" />
                  <span className="hidden sm:inline">{copySuccess ? '¡Copiado!' : 'Copiar'}</span>
                  <span className="sm:hidden">{copySuccess ? '¡Copiado!' : 'Copiar Enlace'}</span>
                </Button>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg mb-6 w-full sm:w-fit overflow-x-auto">
            <button
              onClick={() => setActiveTab('referrals')}
              className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all duration-200 text-sm sm:text-base whitespace-nowrap flex-1 sm:flex-none ${
                activeTab === 'referrals'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Mis Referidos
            </button>
            <button
              onClick={() => setActiveTab('commissions')}
              className={`px-4 sm:px-6 py-2 rounded-md font-medium transition-all duration-200 text-sm sm:text-base whitespace-nowrap flex-1 sm:flex-none ${
                activeTab === 'commissions'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Mis Comisiones
            </button>
          </div>

          {/* Content */}
          <Card>
            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : (
              <div>
                {activeTab === 'referrals' ? (
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Usuarios Referidos</h3>
                    {referrals.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <Users className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-base sm:text-lg">Aún no tienes referidos</p>
                        <p className="text-gray-400 text-sm sm:text-base">Comparte tu enlace de referido para comenzar a ganar comisiones</p>
                      </div>
                    ) : (
                      <div>
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Usuario</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha de Registro</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Órdenes</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Comisiones</th>
                              </tr>
                            </thead>
                            <tbody>
                              {referrals.map((referral) => (
                                <tr key={referral.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-4 px-4">
                                    <div>
                                      <p className="font-medium text-gray-800">{referral.email}</p>
                                      <p className="text-sm text-gray-500">Código: {referral.ref_code}</p>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4 text-gray-600">
                                    {formatDate(referral.created_at)}
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="flex items-center gap-2">
                                      <span className="font-medium text-gray-800">{referral.orders.length}</span>
                                      <span className="text-gray-500">órdenes</span>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <div className="space-y-1">
                                      {referral.referral_commissions_referred.map((commission) => (
                                        <div key={commission.id} className="flex items-center gap-2">
                                          <span className="font-medium text-gray-800">
                                            {formatUSDT(parseFloat(commission.amount_usdt))}
                                          </span>
                                          {getStatusBadge(commission.status)}
                                        </div>
                                      ))}
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Mobile Cards */}
                        <div className="lg:hidden space-y-4">
                          {referrals.map((referral) => (
                            <div key={referral.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-800 truncate">{referral.email}</p>
                                  <p className="text-xs sm:text-sm text-gray-500">Código: {referral.ref_code}</p>
                                </div>
                                <div className="text-xs sm:text-sm text-gray-600 flex-shrink-0">
                                  {formatDate(referral.created_at)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <p className="text-xs text-gray-500 mb-1">Órdenes</p>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-gray-800">{referral.orders.length}</span>
                                    <span className="text-xs text-gray-500">órdenes</span>
                                  </div>
                                </div>
                                
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <p className="text-xs text-gray-500 mb-1">Comisiones</p>
                                  <div className="space-y-1">
                                    {referral.referral_commissions_referred.length === 0 ? (
                                      <span className="text-xs text-gray-400">Sin comisiones</span>
                                    ) : (
                                      referral.referral_commissions_referred.map((commission) => (
                                        <div key={commission.id} className="flex items-center gap-2">
                                          <span className="font-medium text-gray-800 text-xs">
                                            {formatUSDT(parseFloat(commission.amount_usdt))}
                                          </span>
                                          {getStatusBadge(commission.status)}
                                        </div>
                                      ))
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <h3 className="text-lg sm:text-xl font-semibold text-gray-800 mb-4 sm:mb-6">Historial de Comisiones</h3>
                    {commissions.length === 0 ? (
                      <div className="text-center py-8 sm:py-12">
                        <DollarSign className="w-12 h-12 sm:w-16 sm:h-16 text-gray-300 mx-auto mb-4" />
                        <p className="text-gray-500 text-base sm:text-lg">No tienes comisiones aún</p>
                        <p className="text-gray-400 text-sm sm:text-base">Las comisiones aparecerán cuando tus referidos realicen compras</p>
                      </div>
                    ) : (
                      <div>
                        {/* Desktop Table */}
                        <div className="hidden lg:block overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b border-gray-200">
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Usuario Referido</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Monto</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Estado</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Fecha</th>
                                <th className="text-left py-3 px-4 font-semibold text-gray-700">Liberación</th>
                              </tr>
                            </thead>
                            <tbody>
                              {commissions.map((commission) => (
                                <tr key={commission.id} className="border-b border-gray-100 hover:bg-gray-50">
                                  <td className="py-4 px-4">
                                    <div>
                                      <p className="font-medium text-gray-800">{commission.referred_user.email}</p>
                                      <p className="text-sm text-gray-500">Código: {commission.referred_user.ref_code}</p>
                                    </div>
                                  </td>
                                  <td className="py-4 px-4">
                                    <span className="font-bold text-green-600">
                                      {formatUSDT(parseFloat(commission.amount_usdt))}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4">
                                    {getStatusBadge(commission.status)}
                                  </td>
                                  <td className="py-4 px-4 text-gray-600">
                                    {formatDate(commission.created_at)}
                                  </td>
                                  <td className="py-4 px-4 text-gray-600">
                                    {commission.release_at ? formatDate(commission.release_at) : '-'}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        
                        {/* Mobile Cards */}
                        <div className="lg:hidden space-y-4">
                          {commissions.map((commission) => (
                            <div key={commission.id} className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
                              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="font-medium text-gray-800 truncate">{commission.referred_user.email}</p>
                                  <p className="text-xs sm:text-sm text-gray-500">Código: {commission.referred_user.ref_code}</p>
                                </div>
                                <div className="flex items-center gap-2 flex-shrink-0">
                                  <span className="font-bold text-green-600 text-sm sm:text-base">
                                    {formatUSDT(parseFloat(commission.amount_usdt))}
                                  </span>
                                  {getStatusBadge(commission.status)}
                                </div>
                              </div>
                              
                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <p className="text-xs text-gray-500 mb-1">Fecha de Comisión</p>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    {formatDate(commission.created_at)}
                                  </p>
                                </div>
                                
                                <div className="bg-gray-50 p-3 rounded-lg">
                                  <p className="text-xs text-gray-500 mb-1">Fecha de Liberación</p>
                                  <p className="text-xs sm:text-sm text-gray-600">
                                    {commission.release_at ? formatDate(commission.release_at) : 'Pendiente'}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default UserReferralsPage;