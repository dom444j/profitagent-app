import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, Send, AlertCircle } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { apiService } from '../../services/api';
import { systemConfigService } from '../../services/systemConfig';
import { formatUSDT, formatDate } from '../../utils/format';
import { Withdrawal } from '../../types';

interface UserBalance {
  available: string;
  pendingWithdrawals: string;
  totalEarned: string;
  pending_commissions: string;
}

const UserWithdrawalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'new' | 'history'>('new');
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [balance, setBalance] = useState<UserBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [amount, setAmount] = useState('');
  const [payoutAddress, setPayoutAddress] = useState('');
  const [amountError, setAmountError] = useState<string | null>(null);
  
  // OTP Modal state
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [pendingWithdrawal, setPendingWithdrawal] = useState<any>(null);
  const [otpSubmitting, setOtpSubmitting] = useState(false);
  const [withdrawalFee, setWithdrawalFee] = useState(2);
  const [minWithdrawal, setMinWithdrawal] = useState(10);

  useEffect(() => {
    fetchData();
    loadSystemConfig();
  }, []);

  const loadSystemConfig = async () => {
    try {
      const [fee, minAmount] = await Promise.all([
        systemConfigService.getWithdrawalFee(),
        systemConfigService.getMinWithdrawal()
      ]);
      setWithdrawalFee(fee);
      setMinWithdrawal(minAmount);
    } catch (error) {
      console.error('Error loading system config:', error);
      // Keep default values
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const [withdrawalsData, balanceData] = await Promise.all([
        apiService.getUserWithdrawals(),
        apiService.getUserBalance()
      ]);
      setWithdrawals(withdrawalsData || []);
      setBalance(balanceData.data);
    } catch (err) {
      setError('Error al cargar los datos');
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  const validateAmount = (value: string) => {
    if (!value) {
      setAmountError(null);
      return;
    }

    const amountNum = parseFloat(value);
    const availableNum = parseFloat(balance?.available || '0');
    const totalRequired = amountNum + withdrawalFee;

    if (isNaN(amountNum) || amountNum <= 0) {
      setAmountError('El monto debe ser mayor a 0');
      return;
    }

    if (amountNum < minWithdrawal) {
      setAmountError(`El monto mínimo de retiro es $${minWithdrawal} USDT`);
      return;
    }

    if (totalRequired > availableNum) {
      setAmountError(`Saldo insuficiente. Necesitas $${totalRequired.toFixed(2)} USDT (incluyendo $${withdrawalFee.toFixed(2)} USDT de fee)`);
      return;
    }

    setAmountError(null);
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setAmount(value);
    validateAmount(value);
  };

  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || !payoutAddress) {
      setError('Por favor completa todos los campos');
      return;
    }

    const amountNum = parseFloat(amount);
    const availableNum = parseFloat(balance?.available || '0');
    const totalRequired = amountNum + withdrawalFee;
    
    if (amountNum <= 0) {
      setError('El monto debe ser mayor a 0');
      return;
    }

    if (totalRequired > availableNum) {
      setError(`Monto insuficiente. Necesitas $${totalRequired.toFixed(2)} USDT (incluyendo $${withdrawalFee.toFixed(2)} USDT de fee por gas agent)`);
      return;
    }

    if (amountNum < minWithdrawal) {
      setError(`El monto mínimo de retiro es $${minWithdrawal} USDT`);
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await apiService.createWithdrawal({
        amount_usdt: amountNum,
        payout_address: payoutAddress
      });
      
      // Store withdrawal data and show OTP modal
      setPendingWithdrawal(response.data);
      setShowOtpModal(true);
      setSuccess('OTP enviado a tu Telegram. Por favor ingresa el código.');
      
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar el retiro');
    } finally {
      setSubmitting(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!otpCode || otpCode.length !== 6) {
      setError('Por favor ingresa un código OTP válido de 6 dígitos');
      return;
    }

    try {
      setOtpSubmitting(true);
      setError(null);
      
      await apiService.confirmWithdrawalOtp(pendingWithdrawal.id, otpCode, pendingWithdrawal.otp_id);
      
      // Éxito: cerrar modal y limpiar estado
      setSuccess('Retiro confirmado exitosamente. Será procesado por el administrador.');
      setShowOtpModal(false);
      setOtpCode('');
      setAmount('');
      setPayoutAddress('');
      setPendingWithdrawal(null);
      setActiveTab('history');
      fetchData();
    } catch (err: any) {
      // Error: mostrar mensaje pero mantener modal abierto para reintentos
      const errorMessage = err.response?.data?.error || err.response?.data?.message || 'Código OTP inválido';
      setError(errorMessage);
      
      // Si el error es por OTP expirado o inválido, limpiar el código para permitir reintento
      if (errorMessage.includes('expired') || errorMessage.includes('Invalid')) {
        setOtpCode('');
      }
    } finally {
      setOtpSubmitting(false);
    }
  };

  const handleCloseOtpModal = async () => {
    if (pendingWithdrawal) {
      try {
        // Cancel the withdrawal when closing the modal
        await apiService.cancelWithdrawal(pendingWithdrawal.id);
        setSuccess('Retiro cancelado exitosamente');
        // Refresh data to update balance and withdrawals list
        await fetchData();
      } catch (error: any) {
        console.error('Error canceling withdrawal:', error);
        // Don't show error to user as this is a background operation
      }
    }
    setShowOtpModal(false);
    setOtpCode('');
    setPendingWithdrawal(null);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      requested: { color: 'yellow' as const, icon: Clock, text: 'Solicitado' },
      otp_sent: { color: 'blue' as const, icon: Send, text: 'OTP Enviado' },
      otp_verified: { color: 'blue' as const, icon: CheckCircle, text: 'OTP Verificado' },
      approved: { color: 'green' as const, icon: CheckCircle, text: 'Aprobado' },
      paid: { color: 'green' as const, icon: CheckCircle, text: 'Pagado' },
      rejected: { color: 'red' as const, icon: XCircle, text: 'Rechazado' },
      canceled: { color: 'gray' as const, icon: XCircle, text: 'Cancelado' }
    };
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.requested;
    const Icon = config.icon;
    
    return (
      <Badge color={config.color} className="flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {config.text}
      </Badge>
    );
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Retiros</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Gestiona tus retiros de USDT
          </p>
        </div>

        {/* Balance Summary */}
        {balance && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 dark:text-green-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Disponible</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {formatUSDT(balance.available)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Retiros Pendientes</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {formatUSDT(balance.pendingWithdrawals)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex-shrink-0">
                  <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Total Ganado</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {formatUSDT(balance.totalEarned)}
                  </p>
                </div>
              </div>
            </Card>
            
            <Card className="p-3 sm:p-4">
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="p-2 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex-shrink-0">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 dark:text-purple-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Comisiones Pendientes</p>
                  <p className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white truncate">
                    {formatUSDT(balance.pending_commissions)}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="-mb-px flex flex-wrap sm:space-x-8 gap-2 sm:gap-0">
            <button
              onClick={() => setActiveTab('new')}
              className={`py-2 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex-1 sm:flex-none text-center sm:text-left ${
                activeTab === 'new'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Nuevo Retiro
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`py-2 px-3 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex-1 sm:flex-none text-center sm:text-left ${
                activeTab === 'history'
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              Historial ({withdrawals.length})
            </button>
          </nav>
        </div>

        {/* Content */}
        {activeTab === 'new' && (
          <Card className="p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Solicitar Retiro
            </h2>
            
            {error && (
              <div className="mb-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                  <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
                </div>
              </div>
            )}
            
            {success && (
              <div className="mb-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                  <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
                </div>
              </div>
            )}
            
            <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Monto (USDT)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={minWithdrawal.toString()}
                  max={balance?.available || '0'}
                  value={amount}
                  onChange={handleAmountChange}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white ${
                    amountError 
                      ? 'border-red-300 dark:border-red-600' 
                      : 'border-gray-300 dark:border-gray-600'
                  }`}
                  placeholder={`Mínimo $${minWithdrawal} USDT`}
                  required
                />
                {amount && parseFloat(amount) > 0 && (
                  <div className="mt-2 p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
                    <div className="text-sm text-yellow-800 dark:text-yellow-200">
                      <div className="flex justify-between">
                        <span>Monto solicitado:</span>
                        <span>${parseFloat(amount).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between">
                         <span>Fee por gas agent:</span>
                         <span>${withdrawalFee.toFixed(2)} USDT</span>
                       </div>
                      <div className="flex justify-between border-t border-yellow-200 dark:border-yellow-700 pt-1 mt-1 font-medium">
                        <span>Total a descontar:</span>
                        <span>${(parseFloat(amount) + withdrawalFee).toFixed(2)} USDT</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Recibirás:</span>
                        <span>${parseFloat(amount).toFixed(2)} USDT</span>
                      </div>
                    </div>
                   </div>
                 )}
                {amountError && (
                  <div className="mt-2 p-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400" />
                      <p className="text-red-600 dark:text-red-400 text-sm">{amountError}</p>
                    </div>
                  </div>
                )}
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Disponible: {formatUSDT(balance?.available || '0')}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Dirección de Pago (USDT)
                </label>
                <input
                  type="text"
                  value={payoutAddress}
                  onChange={(e) => setPayoutAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0x..."
                  required
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Dirección de wallet para recibir USDT
                </p>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                <div className="flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                  <div className="text-sm text-yellow-700 dark:text-yellow-300">
                    <p className="font-medium mb-1">Información importante:</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Monto mínimo: ${minWithdrawal} USDT</li>
                      <li>Se aplicará un fee de ${withdrawalFee.toFixed(2)} USDT por gas agent en cada retiro</li>
                      <li>Los retiros requieren confirmación por OTP de Telegram</li>
                      <li>Los retiros requieren aprobación del administrador</li>
                      <li>Verifica que la dirección sea correcta, no se puede cambiar después</li>
                      <li>El procesamiento puede tomar de 15 min - 48 horas</li>
                    </ul>
                  </div>
                </div>
              </div>
              
              <Button
                type="submit"
                disabled={submitting || !amount || !payoutAddress || !!amountError}
                className="w-full"
              >
                {submitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Procesando...
                  </>
                ) : (
                  'Solicitar Retiro'
                )}
              </Button>
            </form>
          </Card>
        )}

        {activeTab === 'history' && (
          <div className="space-y-4">
            {withdrawals.length === 0 ? (
              <Card className="p-8 text-center">
                <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                  No hay retiros
                </h3>
                <p className="text-gray-600 dark:text-gray-400">
                  Aún no has realizado ningún retiro.
                </p>
              </Card>
            ) : (
              withdrawals.map((withdrawal) => (
                <Card key={withdrawal.id} className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                        <h3 className="text-lg sm:text-xl font-semibold text-gray-900 dark:text-white">
                          {formatUSDT(withdrawal.amount_usdt)}
                        </h3>
                        {getStatusBadge(withdrawal.status)}
                      </div>
                      
                      <div className="space-y-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
                        <div className="break-all">
                          <span className="font-medium">Dirección:</span> 
                          <span className="block sm:inline sm:ml-1">{withdrawal.payout_address}</span>
                        </div>
                        <p><span className="font-medium">Solicitado:</span> {formatDate(withdrawal.created_at)}</p>
                        {withdrawal.paid_at && (
                          <p><span className="font-medium">Pagado:</span> {formatDate(withdrawal.paid_at)}</p>
                        )}
                        {withdrawal.paid_tx_hash && (
                          <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2">
                            <span className="font-medium">TX Hash:</span>
                            <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">
                              <span className="sm:hidden">{withdrawal.paid_tx_hash.slice(0, 8)}...{withdrawal.paid_tx_hash.slice(-6)}</span>
                              <span className="hidden sm:inline">{withdrawal.paid_tx_hash.slice(0, 10)}...{withdrawal.paid_tx_hash.slice(-8)}</span>
                            </code>
                          </div>
                        )}
                        {withdrawal.notes && (
                          <p><span className="font-medium">Notas:</span> {withdrawal.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>
        )}
      </div>

      {/* OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Confirmar Retiro con OTP
            </h3>
            
            {pendingWithdrawal?.fee_info && (
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">Resumen del Retiro:</h4>
                <div className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                  <div className="flex justify-between">
                    <span>Monto solicitado:</span>
                    <span>${pendingWithdrawal.fee_info.requested_amount} USDT</span>
                  </div>
                  <div className="flex justify-between">
                     <span>Fee por gas agent:</span>
                     <span>${pendingWithdrawal.fee_info.gas_fee} USDT</span>
                   </div>
                  <div className="flex justify-between border-t border-blue-200 dark:border-blue-700 pt-1 font-medium">
                    <span>Total a descontar:</span>
                    <span>${pendingWithdrawal.fee_info.total_deducted} USDT</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Recibirás:</span>
                    <span>${pendingWithdrawal.fee_info.net_amount} USDT</span>
                  </div>
                </div>
              </div>
            )}
            
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Ingresa el código de 6 dígitos que recibiste en Telegram:
            </p>
            
            <input
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              placeholder="000000"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-center text-lg tracking-widest"
              maxLength={6}
            />
            
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                onClick={handleCloseOtpModal}
                disabled={otpSubmitting}
                className="flex-1"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleConfirmOtp}
                disabled={otpSubmitting || otpCode.length !== 6}
                className="flex-1"
              >
                {otpSubmitting ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Confirmando...
                  </>
                ) : (
                  'Confirmar'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default UserWithdrawalsPage;