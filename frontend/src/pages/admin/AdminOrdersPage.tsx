import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { Loader2, CheckCircle, XCircle, Clock, ExternalLink, Copy, Search, Filter } from 'lucide-react';
import { formatUSDTDisplay, formatDate } from '../../utils/format';
import { apiService } from '../../services/api';

interface Order {
  id: string;
  user_email: string;
  product_name: string;
  amount_usdt: string;
  wallet_address: string;
  status: 'pending' | 'paid' | 'confirmed' | 'expired' | 'canceled';
  tx_hash?: string;
  expires_at: string;
  created_at: string;
  updated_at: string;
}

const AdminOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'confirmed' | 'expired'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchOrders();
    // Polling para actualizaciones en tiempo real
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await apiService.getAdminOrders();
      setOrders(response.orders || []);
      setError(null);
    } catch (err: any) {
      setError('Error al cargar órdenes');
    } finally {
      setLoading(false);
    }
  };

  const confirmOrder = async (orderId: string) => {
    setActionLoading(orderId);
    setError(null);
    setSuccess(null);
    
    try {
      await apiService.confirmAdminOrder(orderId);
      setSuccess('Orden confirmada exitosamente');
      fetchOrders();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al confirmar orden';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const rejectOrder = async (orderId: string) => {
    setActionLoading(orderId);
    setError(null);
    setSuccess(null);
    
    try {
      await apiService.rejectAdminOrder(orderId, 'Rechazado por administrador');
      setSuccess('Orden rechazada exitosamente');
      fetchOrders();
    } catch (err: any) {
      const message = err.response?.data?.message || 'Error al rechazar orden';
      setError(message);
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openTxInExplorer = (txHash: string) => {
    // BSC Explorer para transacciones BEP20
    window.open(`https://bscscan.com/tx/${txHash}`, '_blank');
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="warning" className="bg-blue-100 text-blue-700">🔄 Pendiente</Badge>;
      case 'paid':
        return <Badge variant="info" className="bg-blue-100 text-blue-700">📤 TX Enviada</Badge>;
      case 'confirmed':
        return <Badge variant="success" className="bg-blue-100 text-blue-700">✅ Confirmada</Badge>;
      case 'expired':
        return <Badge variant="danger" className="bg-blue-100 text-blue-700">⏰ Expirada</Badge>;
      case 'canceled':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-700">❌ Cancelada</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesFilter = filter === 'all' || order.status === filter;
    const matchesSearch = searchTerm === '' || 
      order.user_email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.product_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (order.tx_hash && order.tx_hash.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesFilter && matchesSearch;
  });

  const getOrderPriority = (order: Order) => {
    if (order.status === 'paid') return 1; // Máxima prioridad
    if (order.status === 'pending') return 2;
    return 3;
  };

  const sortedOrders = filteredOrders.sort((a, b) => {
    const priorityA = getOrderPriority(a);
    const priorityB = getOrderPriority(b);
    
    if (priorityA !== priorityB) {
      return priorityA - priorityB;
    }
    
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Cargando órdenes...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                <Clock className="h-6 w-6 text-white" />
              </div>
              Gestión de Órdenes
            </h1>
            <p className="text-gray-600 mt-1">
              Administra las órdenes de licencias de bots de arbitraje crypto
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-500">
              Total: {filteredOrders.length} órdenes
            </div>
          </div>
        </div>

        {/* Alerts */}
        {error && (
          <Alert className="border-red-200 bg-red-50">
            <XCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Filters and Search */}
        <Card className="p-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por email, producto, ID de orden o TX hash..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-stretch sm:items-center gap-2 w-full sm:w-auto">
              <Filter className="h-4 w-4 text-gray-500" />
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full sm:w-auto"
              >
                <option value="all">Todas las órdenes</option>
                <option value="paid">TX Enviadas</option>
                <option value="pending">Pendientes</option>
                <option value="confirmed">Confirmadas</option>
                <option value="expired">Expiradas</option>
              </select>
            </div>
          </div>
        </Card>

        {/* Orders List */}
        {sortedOrders.length === 0 ? (
          <Card className="p-12 text-center">
            <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="h-10 w-10 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-700 mb-2">No hay órdenes</h3>
            <p className="text-gray-500">
              {filter === 'all' ? 'No se encontraron órdenes' : `No hay órdenes con estado "${filter}"`}
            </p>
          </Card>
        ) : (
          <div className="space-y-4">
            {sortedOrders.map((order) => (
              <Card key={order.id} className={`p-4 sm:p-6 transition-all duration-200 ${
                 order.status === 'paid' ? 'ring-2 ring-blue-200 bg-blue-50/30' : ''
               }`}>
                 <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                   <div className="flex-1 space-y-4">
                     {/* Header */}
                     <div className="flex items-start justify-between">
                       <div>
                         <div className="flex items-center gap-3 mb-2">
                           <h3 className="text-lg font-semibold text-gray-900">
                             Orden #{order.id.slice(-8)}
                           </h3>
                           {getStatusBadge(order.status)}
                           {order.status === 'paid' && (
                             <Badge variant="info" className="bg-blue-100 text-blue-700 animate-pulse">
                               🚨 Requiere Revisión
                             </Badge>
                           )}
                         </div>
                         <p className="text-gray-600">{order.user_email}</p>
                         <p className="text-gray-500 text-sm sm:hidden mt-1">
                           {order.product_name} • {formatUSDTDisplay(order.amount_usdt)} USDT
                         </p>
                       </div>
                       <div className="text-right text-sm text-gray-500">
                         <p>Creada: {formatDate(order.created_at)}</p>
                         <p className="hidden sm:block">Expira: {formatDate(order.expires_at)}</p>
                       </div>
                     </div>

                     {/* Order Details */}
                     <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                       <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 hidden sm:block">
                         <p className="text-sm font-medium text-gray-600">Producto</p>
                         <p className="font-semibold text-gray-900">{order.product_name}</p>
                       </div>
                       <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3 hidden sm:block">
                         <p className="text-sm font-medium text-gray-600">Monto</p>
                         <p className="font-semibold text-blue-600">{formatUSDTDisplay(order.amount_usdt)} USDT</p>
                       </div>
                       <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-3">
                         <p className="text-sm font-medium text-gray-600">Wallet Asignada</p>
                         <div className="flex items-center gap-2">
                           <code className="text-xs font-mono text-blue-700">
                             {order.wallet_address.slice(0, 10)}...{order.wallet_address.slice(-8)}
                           </code>
                           <button
                             onClick={() => copyToClipboard(order.wallet_address)}
                             className="text-blue-600 hover:text-blue-800"
                           >
                             <Copy className="h-3 w-3" />
                           </button>
                         </div>
                       </div>
                     </div>

                     {/* Transaction Hash */}
                     {order.tx_hash && (
                       <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4">
                         <p className="text-sm font-medium text-gray-600 mb-2">Hash de Transacción</p>
                         <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                           <code className="bg-white/80 px-3 py-2 rounded text-xs sm:text-sm font-mono flex-1 border border-blue-200 break-all">
                             {order.tx_hash}
                           </code>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => copyToClipboard(order.tx_hash!)}
                             className="border-blue-300 text-blue-700 hover:bg-blue-100 w-full sm:w-auto"
                           >
                             <Copy className="h-4 w-4" />
                           </Button>
                           <Button
                             size="sm"
                             onClick={() => openTxInExplorer(order.tx_hash!)}
                             className="bg-blue-600 hover:bg-blue-700 text-white w-full sm:w-auto"
                           >
                             <ExternalLink className="h-4 w-4 mr-1" />
                             BSCScan
                           </Button>
                         </div>
                       </div>
                     )}
                   </div>

                   {/* Actions */}
                   {order.status === 'paid' && (
                     <div className="flex flex-col sm:flex-row lg:flex-col gap-3 lg:w-48">
                       <Button
                         onClick={() => confirmOrder(order.id)}
                         disabled={actionLoading === order.id}
                         className="bg-blue-600 hover:bg-blue-700 text-white flex-1 w-full"
                       >
                         {actionLoading === order.id ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                         ) : (
                           <CheckCircle className="h-4 w-4 mr-2" />
                         )}
                         Confirmar Pago
                       </Button>
                       <Button
                         onClick={() => rejectOrder(order.id)}
                         disabled={actionLoading === order.id}
                         variant="outline"
                         className="border-blue-300 text-blue-700 hover:bg-blue-50 flex-1 w-full"
                       >
                         {actionLoading === order.id ? (
                           <Loader2 className="h-4 w-4 animate-spin mr-2" />
                         ) : (
                           <XCircle className="h-4 w-4 mr-2" />
                         )}
                         Rechazar
                       </Button>
                     </div>
                   )}
                 </div>
               </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminOrdersPage;