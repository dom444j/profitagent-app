import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { Button } from '../../components/ui/Button';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { OrderModal } from '../../components/ui/OrderModal';
import { apiService } from '../../services/api';
import { ShoppingCart, CheckCircle, Loader2, XCircle } from 'lucide-react';
import { formatUSDTDisplay } from '../../utils/format';
import { Product } from '../../types';

interface Order {
  id: string;
  product_name: string;
  amount_usdt: string;
  wallet_address: string;
  status: 'pending' | 'paid' | 'confirmed' | 'expired';
  tx_hash?: string;
  expires_at: string;
  created_at: string;
}

const BuyPage: React.FC = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState<Product[]>([]);
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showOrderModal, setShowOrderModal] = useState(false);

  // Fetch products on component mount
  useEffect(() => {
    fetchProducts();
    fetchActiveOrder();
  }, []);

  // Show modal when order is created
  useEffect(() => {
    console.log('useEffect triggered - activeOrder:', activeOrder);
    if (activeOrder && (activeOrder.status === 'pending' || activeOrder.status === 'paid')) {
      console.log('Setting showOrderModal to true');
      setShowOrderModal(true);
    } else {
      console.log('Setting showOrderModal to false');
      setShowOrderModal(false);
    }
  }, [activeOrder]);

  // Polling for order status updates
  useEffect(() => {
    if (activeOrder && ['pending', 'paid'].includes(activeOrder.status)) {
      const interval = setInterval(() => {
        fetchActiveOrder();
      }, 5000);

      return () => clearInterval(interval);
    }
  }, [activeOrder]);

  const fetchProducts = async () => {
    try {
      const response = await apiService.getProducts();
      console.log('Fetched products:', response.data);
      setProducts(response.data || []);
    } catch (err) {
      setError('Error al cargar productos');
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveOrder = async () => {
    try {
      const storedOrderId = localStorage.getItem('active_order_id');
      if (!storedOrderId) {
        setActiveOrder(null);
        return;
      }
      const order = await apiService.getOrder(storedOrderId);
      setActiveOrder(order || null);
    } catch (err) {
      // If order not found or cannot be loaded, clear stored id
      localStorage.removeItem('active_order_id');
      setActiveOrder(null);
    }
  };

  const createOrder = async (productId: string) => {
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      console.log('Creating order for product:', productId);
      console.log('Product ID type:', typeof productId);
      console.log('Product ID length:', productId?.length);
      const order = await apiService.createOrder(productId);
      console.log('Order created:', order);
      
      if (order && order.id) {
        // Redirect to checkout page instead of showing modal
        navigate(`/user/checkout/${order.id}`);
      } else {
        console.error('Invalid order response:', order);
        setError('Error: Respuesta inválida del servidor');
      }
    } catch (err: any) {
      console.error('Error creating order:', err);
      const message = err.response?.data?.message || err.response?.data?.error || 'Error al crear orden';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  const submitTransaction = async (txHash: string) => {
    if (!activeOrder || !txHash.trim()) return;
    
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    try {
      await apiService.submitTransaction(activeOrder.id, txHash);
      setSuccess('Hash de transacción enviado. Tu pago está siendo verificado.');
      fetchActiveOrder();
    } catch (err: any) {
      const message = err.response?.data?.message || err.response?.data?.error || 'Error al enviar transacción';
      setError(message);
      throw err; // Re-throw to handle in modal
    } finally {
      setSubmitting(false);
    }
  };

  const startNewOrder = () => {
    localStorage.removeItem('active_order_id');
    setActiveOrder(null);
    setShowOrderModal(false);
    setError(null);
    setSuccess(null);
  };

  const closeOrderModal = () => {
    setShowOrderModal(false);
  };

  if (loading) {
    return (
      <Layout title="Buy License">
        <div className="container mx-auto p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin" />
            <span className="ml-2">Cargando productos...</span>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Buy License">
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        {/* Background Pattern */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl"></div>
          <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-br from-violet-400/20 to-purple-600/20 rounded-full blur-3xl"></div>
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-cyan-400/10 to-blue-600/10 rounded-full blur-3xl"></div>
        </div>
        
        <div className="relative container mx-auto p-4 sm:p-6">
          {/* Header */}
          <div className="mb-6 sm:mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-3 sm:mb-4">
              💎 Comprar Licencias
            </h1>
            <p className="text-gray-600 text-sm sm:text-base lg:text-lg max-w-2xl mx-auto px-4">
              Selecciona una licencia de herramienta tecnológica para acceder a nuestros agentes IA especializados
            </p>
          </div>

          {/* Alerts */}
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}

          {/* Active Order Summary (when order exists but modal is closed) */}
          {activeOrder && !showOrderModal && (
            <div className="mb-6 sm:mb-8 bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                    <ShoppingCart className="h-5 w-5 sm:h-6 sm:w-6 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">
                      Orden #{activeOrder.id.slice(-8)}
                    </h3>
                    <p className="text-gray-600 text-sm sm:text-base truncate">{activeOrder.product_name} - {formatUSDTDisplay(activeOrder.amount_usdt)} USDT</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto flex-shrink-0">
                  <div className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl font-semibold text-xs sm:text-sm ${
                    activeOrder.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    activeOrder.status === 'expired' ? 'bg-red-100 text-red-700' :
                    activeOrder.status === 'paid' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-blue-100 text-blue-700'
                  }`}>
                    <span className="hidden sm:inline">
                      {activeOrder.status === 'confirmed' ? '✅ Confirmado' :
                       activeOrder.status === 'expired' ? '❌ Expirado' :
                       activeOrder.status === 'paid' ? '⏳ En Revisión' :
                       '🔄 Pendiente'}
                    </span>
                    <span className="sm:hidden">
                      {activeOrder.status === 'confirmed' ? '✅' :
                       activeOrder.status === 'expired' ? '❌' :
                       activeOrder.status === 'paid' ? '⏳' :
                       '🔄'}
                    </span>
                  </div>
                  {(activeOrder.status === 'pending' || activeOrder.status === 'paid') && (
                    <Button
                      onClick={() => setShowOrderModal(true)}
                      className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2"
                    >
                      <span className="hidden sm:inline">Ver Detalles</span>
                      <span className="sm:hidden">Ver</span>
                    </Button>
                  )}
                  {activeOrder.status === 'expired' && (
                    <Button
                      onClick={startNewOrder}
                      className="bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white text-xs sm:text-sm px-3 sm:px-4 py-2"
                    >
                      <span className="hidden sm:inline">Nueva Orden</span>
                      <span className="sm:hidden">Nueva</span>
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Products Catalog */}
          {(!activeOrder || activeOrder.status === 'confirmed' || activeOrder.status === 'expired') && (
            <div>
              <div className="text-center mb-6 sm:mb-8">
                <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-slate-700 via-blue-600 to-indigo-700 bg-clip-text text-transparent mb-2">
                  🤖 Licencias de Arbitraje con Agentes Autónomos con IA
                </h2>
                <div className="max-w-4xl mx-auto px-4">
                  <p className="text-gray-700 text-sm sm:text-base lg:text-lg mb-4 font-medium">
                    Adquiere acceso a nuestros bots de inteligencia artificial especializados en arbitraje de criptomonedas
                  </p>
                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4 sm:p-6 text-left">
                    <h3 className="text-lg sm:text-xl font-bold text-gray-800 mb-3 flex items-center gap-2">
                      <span className="text-xl sm:text-2xl">⚡</span> ¿Cómo funcionan nuestros bots?
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 text-xs sm:text-sm text-gray-700">
                      <div className="flex items-start gap-3">
                        <span className="text-blue-500 font-bold">🎯</span>
                        <div>
                          <strong>Arbitraje Inteligente:</strong> Detectan diferencias de precios entre exchanges en tiempo real
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-green-500 font-bold">📊</span>
                        <div>
                          <strong>Análisis 24/7:</strong> Operan continuamente aprovechando oportunidades del mercado
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-orange-500 font-bold">👥</span>
                        <div>
                          <strong>Agentes Compartidos ($500-$2500):</strong> Recursos compartidos con múltiples usuarios
                        </div>
                      </div>
                      <div className="flex items-start gap-3">
                        <span className="text-purple-500 font-bold">🤖</span>
                        <div>
                          <strong>Agentes Dedicados ($5000+):</strong> Recursos exclusivos con beneficios de independencia
                        </div>
                      </div>
                    </div>
                  </div>
                  <p className="text-gray-600 mt-4 text-sm sm:text-base">
                    Selecciona la licencia que mejor se adapte a tus necesidades y accede a tecnología de arbitraje automatizada
                  </p>
                </div>
              </div>
              
              {products.length === 0 ? (
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 p-12 text-center">
                  <div className="w-20 h-20 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <span className="text-gray-500 text-2xl">📦</span>
                  </div>
                  <h3 className="text-xl font-semibold text-gray-700 mb-2">No hay productos disponibles</h3>
                  <p className="text-gray-500">Los productos estarán disponibles próximamente</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
                  {products.map((product) => (
                    <div key={product.id} className="group bg-white/90 backdrop-blur-sm rounded-2xl shadow-xl border border-white/20 hover:shadow-2xl transition-all duration-300 hover:-translate-y-1 overflow-hidden">
                      <div className="p-4 sm:p-6 border-b border-gray-100">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center flex-shrink-0">
                            <span className="text-white text-lg sm:text-xl">💎</span>
                          </div>
                          <div className="min-w-0 flex-1">
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 truncate">{product.name}</h3>
                            {'description' in product && (product as any).description && (
                              <p className="text-gray-600 text-xs sm:text-sm truncate">{(product as any).description}</p>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="p-4 sm:p-6">
                        <div className="space-y-3 sm:space-y-4 mb-4 sm:mb-6">
                          <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl">
                            <span className="text-gray-700 font-medium text-xs sm:text-sm">💰 Precio:</span>
                            <span className="font-bold text-emerald-600 text-sm sm:text-lg">{formatUSDTDisplay(product.price_usdt)} USDT</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl">
                            <span className="text-gray-700 font-medium text-xs sm:text-sm">📈 Tasa diaria:</span>
                            <span className="font-bold text-blue-600 text-sm sm:text-lg">{(parseFloat(product.daily_rate) * 100).toFixed(2)}%</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl">
                            <span className="text-gray-700 font-medium text-xs sm:text-sm">⏱️ Duración:</span>
                            <span className="font-bold text-purple-600 text-sm sm:text-lg">{product.duration_days} días</span>
                          </div>
                          <div className="flex justify-between items-center p-2.5 sm:p-3 bg-gradient-to-r from-slate-50 to-gray-50 rounded-xl">
                            <span className="text-gray-700 font-medium text-xs sm:text-sm">🤖 Tipo:</span>
                            {parseFloat(product.price_usdt) >= 5000 ? (
                              <span className="font-bold text-purple-600 text-sm sm:text-lg">Agente Dedicado</span>
                            ) : (
                              <span className="font-bold text-orange-600 text-sm sm:text-lg">Agente Compartido</span>
                            )}
                          </div>
                        </div>
                        <Button 
                          className="w-full bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white py-2.5 sm:py-3 rounded-xl font-semibold transition-all duration-200 shadow-lg hover:shadow-xl group-hover:scale-105 text-sm sm:text-base"
                          onClick={() => createOrder(product.id)}
                          disabled={submitting}
                        >
                          {submitting ? (
                            <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin mr-2" />
                          ) : (
                            <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                          )}
                          <span className="hidden sm:inline">Generar Orden</span>
                          <span className="sm:hidden">Comprar</span>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Order Modal */}
        {activeOrder && (
          <OrderModal
            isOpen={showOrderModal}
            onClose={closeOrderModal}
            order={activeOrder}
            onSubmitTransaction={submitTransaction}
            submitting={submitting}
          />
        )}
      </div>
    </Layout>
  );
};

export default BuyPage;