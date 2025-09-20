import React, { useState, useEffect } from 'react';
import { DollarSign, Clock, CheckCircle, XCircle, Download, Check } from 'lucide-react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { apiService } from '../../services/api';
import { formatUSDT, formatDate } from '../../utils/format';

interface Withdrawal {
  id: string;
  amount_usdt: string;
  payout_address: string;
  status: 'requested' | 'approved' | 'paid' | 'rejected' | 'canceled';
  created_at: string;
  paid_at?: string;
  paid_tx_hash?: string;
  notes?: string;
  user: {
    id: string;
    email: string;
    first_name?: string;
    last_name?: string;
  };
}

interface PaginatedWithdrawals {
  withdrawals: Withdrawal[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const AdminWithdrawalsPage: React.FC = () => {
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showTxModal, setShowTxModal] = useState<string | null>(null);
  const [txHash, setTxHash] = useState('');
  const [txNotes, setTxNotes] = useState('');
  const [skipValidation, setSkipValidation] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    fetchWithdrawals();
  }, [currentPage, selectedStatus]);

  const fetchWithdrawals = async () => {
    try {
      setLoading(true);
      setError(null); // Clear previous errors
      const statusFilter = selectedStatus === 'all' ? undefined : selectedStatus;
      const response: PaginatedWithdrawals = await apiService.getAdminWithdrawals(
        currentPage,
        20,
        statusFilter
      );
      setWithdrawals(response.withdrawals || []);
      setTotalPages(response.pagination?.pages || 1);
    } catch (err: any) {
      // Only show error if it's not a "no data" scenario
      if (err.response?.status !== 404 && err.response?.data?.message !== 'No withdrawals found') {
        setError('Error al cargar los retiros');
        console.error('Error fetching withdrawals:', err);
      } else {
        // No data found is not an error, just empty state
        setWithdrawals([]);
        setTotalPages(1);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (withdrawalId: string) => {
    try {
      setProcessing(withdrawalId);
      setError(null);
      await apiService.approveWithdrawal(withdrawalId);
      setSuccess('Retiro aprobado exitosamente');
      fetchWithdrawals();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al aprobar el retiro');
    } finally {
      setProcessing(null);
    }
  };

  const handleMarkAsPaid = async () => {
    if (!showTxModal || !txHash.trim()) {
      setError('El hash de transacción es requerido');
      return;
    }

    try {
      setProcessing(showTxModal);
      setError(null);
      await apiService.markWithdrawalAsPaid(showTxModal, txHash.trim(), txNotes.trim() || undefined, skipValidation);
      setSuccess('Retiro marcado como pagado exitosamente');
      setShowTxModal(null);
      setTxHash('');
      setTxNotes('');
      setSkipValidation(false);
      fetchWithdrawals();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al marcar el retiro como pagado';
      setError(errorMessage);
      console.error('Error marking withdrawal as paid:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async () => {
    if (!showRejectModal || !rejectReason.trim()) return;
    
    try {
      setProcessing(showRejectModal);
      setError(null);
      await apiService.rejectWithdrawal(showRejectModal, rejectReason.trim());
      
      setSuccess('Retiro rechazado exitosamente');
      setShowRejectModal(null);
      setRejectReason('');
      fetchWithdrawals();
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al rechazar el retiro';
      setError(errorMessage);
      console.error('Error rejecting withdrawal:', err);
    } finally {
      setProcessing(null);
    }
  };

  const handleExport = async () => {
    try {
      setProcessing('export');
      setError(null);
      const data = await apiService.exportAdminWithdrawals();
      
      // Create and download JSON file
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `withdrawals-approved-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      setSuccess('Archivo exportado exitosamente');
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Error al exportar';
      setError(errorMessage);
      console.error('Error exporting withdrawals:', err);
    } finally {
      setProcessing(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      requested: { color: 'yellow' as const, icon: Clock, text: 'Solicitado' },
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

  const getActionButtons = (withdrawal: Withdrawal) => {
    const { status, id } = withdrawal;
    
    if (status === 'requested') {
      return (
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button
            size="sm"
            onClick={() => handleApprove(id)}
            disabled={processing === id}
            className="bg-green-600 hover:bg-green-700"
          >
            {processing === id ? (
              <LoadingSpinner size="sm" className="mr-1" />
            ) : (
              <Check className="w-4 h-4 mr-1" />
            )}
            Aprobar
          </Button>
          <Button
            size="sm"
            onClick={() => setShowRejectModal(id)}
            disabled={processing === id}
            variant="outline"
            className="border-red-300 text-red-600 hover:bg-red-50"
          >
            <XCircle className="w-4 h-4 mr-1" />
            Rechazar
          </Button>
        </div>
      );
    }
    
    if (status === 'approved') {
      return (
        <Button
          size="sm"
          onClick={() => setShowTxModal(id)}
          disabled={processing === id}
          className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
        >
          <DollarSign className="w-4 h-4 mr-1" />
          Marcar Pagado
        </Button>
      );
    }
    
    return null;
  };

  const statusOptions = [
    { value: 'all', label: 'Todos' },
    { value: 'requested', label: 'Solicitados' },
    { value: 'approved', label: 'Aprobados' },
    { value: 'paid', label: 'Pagados' },
    { value: 'rejected', label: 'Rechazados' },
    { value: 'canceled', label: 'Cancelados' }
  ];

  if (loading && currentPage === 1) {
    return (
      <AdminLayout>
        <div className="flex justify-center items-center min-h-[400px]">
          <LoadingSpinner size="lg" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Gestión de Retiros</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Administra las solicitudes de retiro de usuarios
            </p>
          </div>
          
          <Button
            onClick={handleExport}
            disabled={processing === 'export'}
            className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto"
          >
            {processing === 'export' ? (
              <LoadingSpinner size="sm" className="mr-2" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Exportar Aprobados
          </Button>
        </div>

        {/* Filters */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-full sm:w-auto">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Estado
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full sm:w-auto px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              >
                {statusOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        {error && (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-600 dark:text-red-400 text-sm">{error}</p>
          </div>
        )}
        
        {success && (
          <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
            <p className="text-green-600 dark:text-green-400 text-sm">{success}</p>
          </div>
        )}

        {/* Withdrawals List */}
        <div className="space-y-4">
          {withdrawals.length === 0 ? (
            <Card className="p-8 text-center">
              <DollarSign className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
                No hay retiros
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                No se encontraron retiros con los filtros seleccionados.
              </p>
            </Card>
          ) : (
            withdrawals.map((withdrawal) => (
              <Card key={withdrawal.id} className="p-4 sm:p-6">
                 <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                   <div className="flex-1">
                     <div className="flex items-center gap-3 mb-3">
                       <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                         {formatUSDT(withdrawal.amount_usdt)}
                       </h3>
                       {getStatusBadge(withdrawal.status)}
                     </div>
                     
                     <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 dark:text-gray-400">
                       <div className="space-y-1">
                         <p><span className="font-medium">Usuario:</span> {withdrawal.user.email}</p>
                         {(withdrawal.user.first_name || withdrawal.user.last_name) && (
                           <p><span className="font-medium">Nombre:</span> {withdrawal.user.first_name} {withdrawal.user.last_name}</p>
                         )}
                         <p>
                           <span className="font-medium">Dirección:</span>{' '}
                           <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs break-all">
                             {withdrawal.payout_address}
                           </code>
                         </p>
                         <p><span className="font-medium">Solicitado:</span> {formatDate(withdrawal.created_at)}</p>
                       </div>
                       
                       <div className="space-y-1">
                         {withdrawal.paid_at && (
                           <p><span className="font-medium">Pagado:</span> {formatDate(withdrawal.paid_at)}</p>
                         )}
                         {withdrawal.paid_tx_hash && (
                           <p className="flex items-center gap-2">
                             <span className="font-medium">TX Hash:</span>
                             <code className="bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded text-xs">
                               {withdrawal.paid_tx_hash.slice(0, 10)}...{withdrawal.paid_tx_hash.slice(-8)}
                             </code>
                           </p>
                         )}
                         {withdrawal.notes && (
                           <p><span className="font-medium">Notas:</span> {withdrawal.notes}</p>
                         )}
                       </div>
                     </div>
                   </div>
                   
                  <div className="lg:ml-4 mt-2 lg:mt-0 w-full sm:w-auto">
                     {getActionButtons(withdrawal)}
                   </div>
                 </div>
               </Card>
            ))
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex justify-center items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1 || loading}
            >
              Anterior
            </Button>
            
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Página {currentPage} de {totalPages}
            </span>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages || loading}
            >
              Siguiente
            </Button>
          </div>
        )}
      </div>

      {/* Mark as Paid Modal */}
      {showTxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Marcar como Pagado
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Hash de Transacción *
                </label>
                <input
                  type="text"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="0x..."
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Notas (opcional)
                </label>
                <textarea
                  value={txNotes}
                  onChange={(e) => setTxNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={3}
                  placeholder="Información adicional sobre el pago..."
                />
              </div>
              
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="skipValidation"
                  checked={skipValidation}
                  onChange={(e) => setSkipValidation(e.target.checked)}
                  className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-gray-800 focus:ring-2 dark:bg-gray-700 dark:border-gray-600"
                />
                <label htmlFor="skipValidation" className="text-sm text-gray-700 dark:text-gray-300">
                  Omitir validación on-chain (usar solo si hay problemas técnicos)
                </label>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowTxModal(null);
                  setTxHash('');
                  setTxNotes('');
                  setSkipValidation(false);
                }}
                disabled={processing === showTxModal}
              >
                Cancelar
              </Button>
              
              <Button
                onClick={handleMarkAsPaid}
                disabled={processing === showTxModal || !txHash.trim()}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {processing === showTxModal ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Procesando...
                  </>
                ) : (
                  'Confirmar Pago'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rechazar Retiro
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Motivo del rechazo *
                </label>
                <textarea
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  rows={4}
                  placeholder="Explica el motivo del rechazo..."
                  required
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectModal(null);
                  setRejectReason('');
                }}
                disabled={processing === showRejectModal}
              >
                Cancelar
              </Button>
              
              <Button
                onClick={handleReject}
                disabled={processing === showRejectModal || !rejectReason.trim()}
                className="bg-red-600 hover:bg-red-700"
              >
                {processing === showRejectModal ? (
                  <>
                    <LoadingSpinner size="sm" className="mr-2" />
                    Rechazando...
                  </>
                ) : (
                  'Confirmar Rechazo'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminWithdrawalsPage;