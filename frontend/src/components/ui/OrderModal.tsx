import React, { useState, useEffect } from 'react';
import { X, Clock, Copy, Wallet, CheckCircle, AlertTriangle, ExternalLink } from 'lucide-react';
import Button from './Button';
import { Input } from './Input';
import { formatUSDTDisplay } from '../../utils/format';

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

interface OrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order;
  onSubmitTransaction: (txHash: string) => Promise<void>;
  submitting: boolean;
}

const OrderModal: React.FC<OrderModalProps> = ({
  isOpen,
  onClose,
  order,
  onSubmitTransaction,
  submitting
}) => {
  const [txHash, setTxHash] = useState('');
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const [copied, setCopied] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (order && order.status === 'pending') {
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const expiry = new Date(order.expires_at).getTime();
        const remaining = Math.max(0, expiry - now);
        setTimeLeft(remaining);
        
        if (remaining === 0) {
          // Order expired, close modal
          onClose();
        }
      }, 1000);

      return () => clearInterval(interval);
    }
  }, [order, onClose]);

  const formatTimeLeft = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Error copying to clipboard:', err);
    }
  };

  const handleSubmit = async () => {
    if (!txHash.trim()) return;
    
    try {
      await onSubmitTransaction(txHash);
      setTxHash('');
    } catch (error) {
      // Error handling is done in parent component
    }
  };

  const getProgressPercentage = () => {
    const totalTime = 30 * 60 * 1000; // 30 minutes in ms
    const elapsed = totalTime - timeLeft;
    return Math.min((elapsed / totalTime) * 100, 100);
  };

  if (!isOpen || !order) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-white shadow-2xl transition-all">
          {/* Header */}
          <div className="relative bg-gradient-to-r from-blue-600 to-indigo-700 px-6 py-8 text-white">
            <button
              onClick={onClose}
              className="absolute right-4 top-4 rounded-full bg-white/20 p-2 hover:bg-white/30 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
            
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
                <Wallet className="h-8 w-8" />
              </div>
              <div>
                <h2 className="text-2xl font-bold mb-1">🚀 Orden de Compra Generada</h2>
                <p className="text-blue-100">Licencia de Bot de Arbitraje Crypto</p>
              </div>
            </div>
            
            {/* Progress Bar */}
            <div className="mt-6">
              <div className="flex items-center justify-between text-sm mb-2">
                <span>Tiempo restante</span>
                <span className="font-mono font-bold">{formatTimeLeft(timeLeft)}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-2">
                <div 
                  className="bg-white rounded-full h-2 transition-all duration-1000 ease-linear"
                  style={{ width: `${100 - getProgressPercentage()}%` }}
                />
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 space-y-6">
            {/* Order Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">🤖</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Producto</p>
                    <p className="font-bold text-gray-900">{order.product_name}</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-r from-emerald-50 to-green-50 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
                    <span className="text-white text-sm font-bold">💰</span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Monto a Pagar</p>
                    <p className="font-bold text-emerald-600 text-lg">{formatUSDTDisplay(order.amount_usdt)} USDT</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Wallet Address */}
            <div className="bg-gradient-to-r from-purple-50 to-violet-50 rounded-xl p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-purple-500 rounded-xl flex items-center justify-center">
                  <Wallet className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Dirección de Pago (BEP20)</h3>
                  <p className="text-sm text-gray-600">Envía exactamente {formatUSDTDisplay(order.amount_usdt)} USDT a esta dirección</p>
                </div>
              </div>
              
              <div className="bg-white/80 backdrop-blur-sm rounded-lg p-4 border border-purple-200">
                <div className="flex items-center gap-3">
                  <code className="flex-1 font-mono text-sm text-purple-700 break-all">
                    {order.wallet_address}
                  </code>
                  <Button
                    size="sm"
                    onClick={() => copyToClipboard(order.wallet_address)}
                    className={`transition-all duration-200 ${
                      copied 
                        ? 'bg-green-500 hover:bg-green-600 text-white' 
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    {copied ? (
                      <CheckCircle className="h-4 w-4" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Important Instructions */}
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl p-6 border border-amber-200">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-6 w-6 text-amber-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="font-bold text-amber-800 mb-2">⚠️ Instrucciones Importantes</h3>
                  <ul className="text-sm text-amber-700 space-y-1">
                    <li>• Envía <strong>exactamente {formatUSDTDisplay(order.amount_usdt)} USDT</strong> (red BEP20/BSC)</li>
                    <li>• Usa solo <strong>USDT BEP20</strong> - otras redes no serán procesadas</li>
                    <li>• Copia el hash de transacción después del envío</li>
                    <li>• La orden expira en <strong>30 minutos</strong></li>
                    <li>• El bot de arbitraje se activará tras la confirmación</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Transaction Hash Input */}
            <div className="bg-gradient-to-r from-cyan-50 to-blue-50 rounded-xl p-6">
              <h3 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span className="text-cyan-600">📤</span>
                Confirmar Transacción
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Después de enviar el pago, pega aquí el hash de transacción para confirmar
              </p>
              
              <div className="space-y-4">
                <Input
                  placeholder="Hash de transacción (0x...)"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="bg-white/80 backdrop-blur-sm border-cyan-200 focus:border-cyan-400 focus:ring-cyan-400"
                />
                
                <div className="flex gap-3">
                  <Button
                    onClick={handleSubmit}
                    disabled={!txHash.trim() || submitting || order.status !== 'pending'}
                    className="flex-1 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white py-3"
                  >
                    {submitting ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Enviando...
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5" />
                        Confirmar Pago
                      </div>
                    )}
                  </Button>
                  
                  {txHash && (
                    <Button
                      onClick={() => window.open(`https://bscscan.com/tx/${txHash}`, '_blank')}
                      variant="outline"
                      className="border-cyan-300 text-cyan-700 hover:bg-cyan-100"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>

            {/* Status Messages */}
            {order.status === 'paid' && (
              <div className="bg-gradient-to-r from-yellow-50 to-amber-50 rounded-xl p-4 border border-yellow-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-yellow-500 rounded-full flex items-center justify-center">
                    <Clock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-yellow-800">Transacción Enviada</p>
                    <p className="text-sm text-yellow-700">Tu pago está siendo verificado por nuestro equipo</p>
                  </div>
                </div>
              </div>
            )}

            {order.status === 'confirmed' && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-4 border border-green-200">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                    <CheckCircle className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-medium text-green-800">¡Pago Confirmado!</p>
                    <p className="text-sm text-green-700">Tu licencia de bot de arbitraje ha sido activada</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-4 rounded-b-2xl">
            <div className="flex items-center justify-between text-sm text-gray-600">
              <span>Orden #{order.id.slice(-8)}</span>
              <span>Soporte: support@grow5x.app</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export { OrderModal };
export default OrderModal;