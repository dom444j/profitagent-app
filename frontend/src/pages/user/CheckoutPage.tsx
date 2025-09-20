import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Clock, Copy, CheckCircle, AlertCircle, RefreshCw, ShoppingCart, History, Eye, Search } from 'lucide-react';
import { apiService } from '../../services/api';
import Layout from '../../components/layout/Layout';

interface Order {
  id: string;
  product_name: string;
  amount_usdt: string;
  wallet_address: string;
  status: 'pending' | 'paid' | 'confirmed' | 'expired' | 'canceled';
  expires_at: string;
  tx_hash?: string;
  created_at: string;
}

const CheckoutPage: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'current' | 'history'>('current');
  const [order, setOrder] = useState<Order | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [reassigning, setReassigning] = useState(false);
  const [txHash, setTxHash] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'paid' | 'confirmed' | 'expired' | 'canceled'>('all');

  useEffect(() => {
    if (orderId) {
      fetchOrder();
    } else {
      setLoading(false);
    }
    fetchOrders();
  }, [orderId]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (order && order.status === 'pending' && timeLeft > 0) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            fetchOrder(); // Refresh order status when timer expires
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [order, timeLeft]);

  useEffect(() => {
    // Auto-refresh order status every 5 seconds for pending/paid orders
    let interval: NodeJS.Timeout;
    if (order && (order.status === 'pending' || order.status === 'paid')) {
      interval = setInterval(() => {
        fetchOrder();
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [order]);

  const fetchOrder = async () => {
    try {
      const response = await apiService.getOrder(orderId!);
      setOrder(response);
      
      // Calculate time left
      if (response.expires_at) {
        const expiresAt = new Date(response.expires_at).getTime();
        const now = new Date().getTime();
        const diff = Math.max(0, Math.floor((expiresAt - now) / 1000));
        setTimeLeft(diff);
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      setError('Error loading order details');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await apiService.getUserOrders();
      setOrders(response.orders || []);
    } catch (err: any) {
      console.error('Error al cargar las órdenes:', err);
    }
  };

  const validateTxHash = (hash: string): boolean => {
    // Remove whitespace and convert to lowercase
    const cleanHash = hash.trim().toLowerCase();
    
    // Check if it starts with 0x and has exactly 66 characters (0x + 64 hex chars)
    const hashRegex = /^0x[a-f0-9]{64}$/;
    return hashRegex.test(cleanHash);
  };

  const handleSubmitTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txHash.trim()) {
      setError('Por favor ingresa un hash de transacción');
      return;
    }

    if (!validateTxHash(txHash)) {
      setError('El hash de transacción debe tener el formato correcto (0x seguido de 64 caracteres hexadecimales)');
      return;
    }

    setSubmitting(true);
    setError('');
    setSuccess('');

    try {
      await apiService.submitTransaction(orderId!, txHash.trim());
      setSuccess('¡Transacción enviada exitosamente! Esperando confirmación del administrador.');
      setTxHash('');
      fetchOrder(); // Refresh order status
    } catch (error: any) {
      console.error('Error submitting transaction:', error);
      setError(error.response?.data?.error || 'Error al enviar la transacción');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReassignOrder = async () => {
    setReassigning(true);
    setError('');
    setSuccess('');

    try {
      const response = await apiService.reassignOrder(orderId!);
      setSuccess('New order created successfully!');
      // Navigate to the new order
      navigate(`/user/checkout/${response.id}`);
    } catch (error: any) {
      console.error('Error reassigning order:', error);
      setError(error.response?.data?.error || 'Error creating new order');
    } finally {
      setReassigning(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error al copiar:', err);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock, text: 'Pendiente' },
      paid: { color: 'bg-blue-100 text-blue-800', icon: Clock, text: 'En Revisión' },
      confirmed: { color: 'bg-green-100 text-green-800', icon: CheckCircle, text: 'Confirmada' },
      expired: { color: 'bg-red-100 text-red-800', icon: AlertCircle, text: 'Expirada' },
      canceled: { color: 'bg-gray-100 text-gray-800', icon: AlertCircle, text: 'Cancelada' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig];
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {config.text}
      </span>
    );
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = searchTerm === '' || 
      order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (loading) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="animate-pulse">
            <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
            <div className="bg-white rounded-lg shadow p-6">
              <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-32 bg-gray-200 rounded"></div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (!order && orderId) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <div className="text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Orden No Encontrada</h2>
            <p className="text-gray-600 mb-4">La orden que buscas no existe o no tienes acceso a ella.</p>
            <button
              onClick={() => navigate('/user/buy')}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
            >
              Volver a Productos
            </button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-4 sm:p-6">
        {/* Header */}
        <div className="mb-4 sm:mb-6">
          <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2">Centro de Órdenes</h1>
          <p className="text-gray-600 text-sm sm:text-base">Gestiona tus compras de herramientas tecnológicas y revisa tu historial</p>
        </div>

        {/* Tabs */}
        <div className="mb-4 sm:mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 sm:space-x-8 overflow-x-auto">
              <button
                onClick={() => setActiveTab('current')}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'current'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ShoppingCart className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Orden Actual</span>
                <span className="sm:hidden">Actual</span>
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-2 px-1 border-b-2 font-medium text-xs sm:text-sm transition-colors whitespace-nowrap ${
                  activeTab === 'history'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <History className="h-3 w-3 sm:h-4 sm:w-4 inline mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Historial ({orders.length})</span>
                <span className="sm:hidden">Historial</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'current' ? (
          <div className="max-w-3xl mx-auto">
            {!order ? (
              /* Empty State */
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 sm:mb-6">
                  <ShoppingCart className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3">
                  No hay orden activa
                </h3>
                <p className="text-gray-600 mb-4 sm:mb-6 max-w-md mx-auto text-sm sm:text-base">
                  Actualmente no tienes ninguna orden en proceso. Crea una nueva orden desde la página de compra de herramientas tecnológicas.
                </p>
                <button
                  onClick={() => navigate('/user/buy')}
                  className="bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg hover:from-emerald-700 hover:to-emerald-800 transition-all duration-200 font-medium text-sm sm:text-base"
                >
                  Comprar Herramientas
                </button>
              </div>
            ) : (
              <div>
                {/* Order Summary */}
                <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100 mb-4">
                  <div className="p-3 sm:p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 gap-2">
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900">Order Summary</h2>
                      <div className="flex-shrink-0">{getStatusBadge(order.status)}</div>
                    </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Product</p>
                <p className="font-semibold text-gray-900 truncate">{order.product_name}</p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Amount</p>
                <p className="font-bold text-emerald-600 text-base sm:text-lg">${order.amount_usdt} USDT</p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Order ID</p>
                <p className="font-mono text-xs text-gray-700 truncate">{order.id.slice(0, 8)}...</p>
              </div>
              <div className="bg-white/60 p-3 rounded-lg">
                <p className="text-xs text-gray-500 uppercase tracking-wide">Created</p>
                <p className="text-xs text-gray-700">{new Date(order.created_at).toLocaleString('es-ES', { 
                  day: '2-digit', 
                  month: '2-digit', 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}</p>
              </div>
            </div>

            {/* Timer */}
            {order.status === 'pending' && timeLeft > 0 && (
              <div className="mt-3 p-3 bg-gradient-to-r from-amber-50 to-yellow-50 rounded-lg border border-amber-200">
                <div className="flex items-center justify-center">
                  <Clock className="h-4 w-4 text-amber-600 mr-2" />
                  <span className="text-amber-800 font-semibold text-sm">
                    Tiempo restante: {formatTime(timeLeft)}
                  </span>
                </div>
              </div>
            )}

            {/* Expired Notice */}
            {order.status === 'expired' && (
              <div className="mt-3 p-3 bg-gradient-to-r from-red-50 to-rose-50 rounded-lg border border-red-200">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <AlertCircle className="h-4 w-4 text-red-600 mr-2" />
                    <span className="text-red-800 font-medium text-sm">Esta orden ha expirado</span>
                  </div>
                  <button
                    onClick={handleReassignOrder}
                    disabled={reassigning}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 py-1.5 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 flex items-center text-sm transition-all"
                  >
                    {reassigning ? (
                      <RefreshCw className="h-3 w-3 mr-1 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3 w-3 mr-1" />
                    )}
                    Nueva Orden
                  </button>
                </div>
              </div>
            )}

            {/* Confirmed Notice */}
            {order.status === 'confirmed' && (
              <div className="mt-3 p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                <div className="flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-600 mr-2" />
                  <span className="text-emerald-800 font-medium text-sm">
                    ¡Orden confirmada! Tu licencia ha sido activada.
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Payment Instructions */}
        {(order.status === 'pending' || order.status === 'paid') && (
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100 mb-4">
            <div className="p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Instrucciones de Pago</h2>
              
              <div className="space-y-3">
                <div className="p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
                  <h3 className="font-semibold text-blue-900 mb-2 text-xs sm:text-sm">Paso 1: Enviar USDT</h3>
                  <p className="text-blue-800 text-xs mb-2">
                    Envía exactamente <strong>${order.amount_usdt} USDT</strong> a la dirección de wallet usando la red BEP20 (Binance Smart Chain).
                  </p>
                  
                  <div className="bg-white/80 p-2 rounded border border-blue-200">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Dirección Wallet (BEP20)</p>
                    <div className="flex items-start sm:items-center justify-between gap-2">
                      <code className="text-xs font-mono break-all text-gray-700 min-w-0 flex-1">{order.wallet_address}</code>
                      <button
                        onClick={() => copyToClipboard(order.wallet_address)}
                        className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-100 rounded transition-all flex-shrink-0"
                        title="Copy address"
                      >
                        {copied ? (
                          <CheckCircle className="h-3 w-3 text-green-500" />
                        ) : (
                          <Copy className="h-3 w-3" />
                        )}
                      </button>
                    </div>
                    {copied && (
                      <p className="text-xs text-green-600 mt-1">Address copied to clipboard!</p>
                    )}
                  </div>
                </div>

                <div className="p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-lg border border-emerald-200">
                  <h3 className="font-semibold text-emerald-900 mb-1 text-sm">Paso 2: Enviar Hash de Transacción</h3>
                  <p className="text-emerald-800 text-xs">
                    Después de enviar el pago, ingresa tu hash de transacción para confirmar el pago.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transaction Submission Form */}
        {order.status === 'pending' && (
          <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-lg border border-gray-100">
            <div className="p-3 sm:p-4">
              <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-3">Enviar Hash de Transacción</h2>
              
              <form onSubmit={handleSubmitTransaction} className="space-y-3">
                <div>
                  <label htmlFor="txHash" className="block text-xs font-semibold text-gray-700 mb-1 uppercase tracking-wide">
                    Hash de Transacción
                  </label>
                  <input
                    type="text"
                    id="txHash"
                    value={txHash}
                    onChange={(e) => {
                      // Only allow hexadecimal characters and 0x prefix
                      const value = e.target.value;
                      if (value === '' || /^0x[a-fA-F0-9]*$/.test(value)) {
                        setTxHash(value);
                      }
                    }}
                    placeholder="0x..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-xs sm:text-sm transition-all font-mono"
                    disabled={submitting}
                    maxLength={66}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Ingresa el hash de transacción de tu wallet después de enviar el pago (debe comenzar con 0x)
                  </p>
                  
                  {/* Warning Message */}
                  <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <div className="flex items-start">
                      <AlertCircle className="h-4 w-4 text-amber-600 mr-2 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-amber-800 mb-1">⚠️ ADVERTENCIA IMPORTANTE</p>
                        <p className="text-xs text-amber-700">
                          Asegúrate de que el hash de transacción sea correcto. Un hash incorrecto puede resultar en la <strong>pérdida permanente de tus fondos</strong>. 
                          Verifica cuidadosamente la información antes de enviar para que el agente encargado pueda validar todo sin problemas.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-red-800 text-xs sm:text-sm">{error}</p>
                  </div>
                )}

                {success && (
                  <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-green-800 text-xs sm:text-sm">{success}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting || !txHash.trim()}
                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-2.5 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-xs sm:text-sm font-semibold transition-all"
                >
                  {submitting ? (
                    <RefreshCw className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                  ) : null}
                  {submitting ? 'Enviando...' : 'Enviar Transacción'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Payment Submitted Status */}
        {order.status === 'paid' && (
          <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-lg border border-blue-100">
            <div className="p-3 sm:p-4">
              <div className="text-center">
                <CheckCircle className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-blue-500 mb-3" />
                <h2 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">Pago Enviado</h2>
                <p className="text-gray-600 mb-3 text-xs sm:text-sm">
                  Tu transacción ha sido enviada y está esperando confirmación del collection agent.
                </p>
                {order.tx_hash && (
                  <div className="bg-white/80 p-3 rounded-lg border border-blue-200">
                    <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide">Hash de Transacción</p>
                    <code className="text-xs font-mono break-all text-gray-700">{order.tx_hash}</code>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
              </div>
            )}
          </div>
        ) : (
          /* History Tab */
          <div>
            {/* Search and Filters */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-3 sm:p-4 mb-4 sm:mb-6">
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-3 w-3 sm:h-4 sm:w-4" />
                    <input
                      type="text"
                      placeholder="Buscar por producto o ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-8 sm:pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value as any)}
                    className="px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm w-full sm:w-auto"
                  >
                    <option value="all">Todas</option>
                    <option value="pending">Pendientes</option>
                    <option value="paid">En Revisión</option>
                    <option value="confirmed">Confirmadas</option>
                    <option value="expired">Expiradas</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Orders List */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 sm:p-12 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-gray-400" />
                </div>
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-2">
                  {searchTerm || statusFilter !== 'all' ? 'No se encontraron órdenes' : 'No tienes órdenes aún'}
                </h3>
                <p className="text-gray-600 mb-4 text-sm sm:text-base">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'Intenta ajustar los filtros de búsqueda'
                    : 'Crea tu primera orden para acceder a nuestras herramientas tecnológicas'
                  }
                </p>
                {!searchTerm && statusFilter === 'all' && (
                  <button
                    onClick={() => navigate('/user/buy')}
                    className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 sm:px-6 py-2 rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold transition-all text-sm sm:text-base"
                  >
                    Comprar Herramientas
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {filteredOrders.map((historyOrder) => (
                  <div key={historyOrder.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6 hover:shadow-md transition-shadow">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-4 gap-3">
                      <div className="flex items-center gap-4 min-w-0 flex-1">
                        <div className="min-w-0 flex-1">
                          <h3 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{historyOrder.product_name}</h3>
                          <p className="text-xs sm:text-sm text-gray-500 truncate">ID: {historyOrder.id}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0">
                        {getStatusBadge(historyOrder.status)}
                        <button
                          onClick={() => {
                            setActiveTab('current');
                            navigate(`/user/checkout/${historyOrder.id}`);
                          }}
                          className="bg-gradient-to-r from-gray-600 to-gray-700 text-white px-2 sm:px-3 py-1.5 rounded-lg hover:from-gray-700 hover:to-gray-800 text-xs sm:text-sm font-medium transition-all flex items-center"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          <span className="hidden sm:inline">Ver Detalles</span>
                          <span className="sm:hidden">Ver</span>
                        </button>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Monto</p>
                        <p className="font-semibold text-emerald-600 text-xs sm:text-sm">${historyOrder.amount_usdt} USDT</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Wallet</p>
                        <p className="font-mono text-xs text-gray-700 truncate">{historyOrder.wallet_address}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Creada</p>
                        <p className="text-xs text-gray-700">
                          {new Date(historyOrder.created_at).toLocaleString('es-ES', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">TX Hash</p>
                        <p className="font-mono text-xs text-gray-700 truncate">
                          {historyOrder.tx_hash ? historyOrder.tx_hash.slice(0, 10) + '...' : 'N/A'}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default CheckoutPage;