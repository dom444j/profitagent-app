import React, { useState, useEffect } from 'react';
import { Users, DollarSign, Clock, CheckCircle, X, Check } from 'lucide-react';
import Layout from '../../components/layout/Layout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { apiService } from '../../services/api';
import { formatUSDT, formatDate } from '../../utils/format';

interface PendingCommission {
  id: string;
  amount_usdt: string;
  status: string;
  created_at: string;
  sponsor: {
    email: string;
    ref_code: string;
  };
  referred_user: {
    email: string;
    ref_code: string;
  };
}

const AdminReferralsPage: React.FC = () => {
  const [commissions, setCommissions] = useState<PendingCommission[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  useEffect(() => {
    fetchCommissions();
  }, [pagination.page]);

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdminReferrals(pagination.page, 20);
      if (response.success) {
        setCommissions(response.data.commissions);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error fetching commissions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleReleaseCommission = async (commissionId: string) => {
    try {
      setActionLoading(commissionId);
      const response = await apiService.releaseCommission(commissionId);
      if (response.success) {
        // Remove the commission from the list since it's no longer pending
        setCommissions(prev => prev.filter(c => c.id !== commissionId));
        // Show success message
        alert('Comisión liberada exitosamente');
      }
    } catch (error) {
      console.error('Error releasing commission:', error);
      alert('Error al liberar la comisión');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelCommission = async (commissionId: string) => {
    if (!confirm('¿Estás seguro de que quieres cancelar esta comisión?')) {
      return;
    }

    try {
      setActionLoading(commissionId);
      const response = await apiService.cancelCommission(commissionId);
      if (response.success) {
        // Remove the commission from the list since it's no longer pending
        setCommissions(prev => prev.filter(c => c.id !== commissionId));
        // Show success message
        alert('Comisión cancelada exitosamente');
      }
    } catch (error) {
      console.error('Error cancelling commission:', error);
      alert('Error al cancelar la comisión');
    } finally {
      setActionLoading(null);
    }
  };

  const calculateTotalPending = () => {
    return commissions.reduce((total, commission) => {
      return total + parseFloat(commission.amount_usdt);
    }, 0);
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

  return (
    <Layout>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-blue-200 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-blue-800 bg-clip-text text-transparent mb-2">
              Gestión de Comisiones de Referidos
            </h1>
            <p className="text-gray-600 text-lg">
              Administra las comisiones pendientes de liberación
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <Card className="bg-gradient-to-br from-blue-700 to-blue-800 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Comisiones Pendientes</p>
                  <p className="text-2xl font-bold">{commissions.length}</p>
                </div>
                <Clock className="w-8 h-8 text-blue-200" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-600 to-blue-700 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Monto Total Pendiente</p>
                  <p className="text-2xl font-bold">{formatUSDT(calculateTotalPending())}</p>
                </div>
                <DollarSign className="w-8 h-8 text-blue-200" />
              </div>
            </Card>

            <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm font-medium">Usuarios Afectados</p>
                  <p className="text-2xl font-bold">
                    {new Set(commissions.map(c => c.sponsor.email)).size}
                  </p>
                </div>
                <Users className="w-8 h-8 text-blue-200" />
              </div>
            </Card>
          </div>

          {/* Commissions Table */}
          <Card>
            <div className="mb-6">
              <h3 className="text-xl font-semibold text-gray-800">Comisiones Pendientes de Liberación</h3>
              <p className="text-gray-600 mt-1">
                Revisa y gestiona las comisiones que requieren aprobación manual
              </p>
            </div>

            {loading ? (
              <div className="flex justify-center py-12">
                <LoadingSpinner size="lg" />
              </div>
            ) : commissions.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle className="w-16 h-16 text-green-300 mx-auto mb-4" />
                <p className="text-gray-500 text-lg">No hay comisiones pendientes</p>
                <p className="text-gray-400">Todas las comisiones han sido procesadas</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Sponsor</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden sm:table-cell">Usuario Referido</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Monto</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden md:table-cell">Estado</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700 hidden lg:table-cell">Fecha</th>
                      <th className="text-left py-3 px-4 font-semibold text-gray-700">Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {commissions.map((commission) => (
                      <tr key={commission.id} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-4 px-4">
                          <div>
                            <p className="font-medium text-gray-800">{commission.sponsor.email}</p>
                            <p className="text-sm text-gray-500">Código: {commission.sponsor.ref_code}</p>
                          </div>
                        </td>
                        <td className="py-4 px-4 hidden sm:table-cell">
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
                        <td className="py-4 px-4 hidden md:table-cell">
                          {getStatusBadge(commission.status)}
                        </td>
                        <td className="py-4 px-4 text-gray-600 hidden lg:table-cell">
                          {formatDate(commission.created_at)}
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-2">
                            <Button
                              onClick={() => handleReleaseCommission(commission.id)}
                              variant="success"
                              size="sm"
                              disabled={actionLoading === commission.id}
                              className="flex items-center gap-1"
                            >
                              {actionLoading === commission.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <>
                                  <Check className="w-4 h-4" />
                                  Liberar
                                </>
                              )}
                            </Button>
                            <Button
                              onClick={() => handleCancelCommission(commission.id)}
                              variant="danger"
                              size="sm"
                              disabled={actionLoading === commission.id}
                              className="flex items-center gap-1"
                            >
                              <X className="w-4 h-4" />
                              Cancelar
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex justify-center mt-6">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
                    disabled={pagination.page === 1}
                    variant="outline"
                    size="sm"
                  >
                    Anterior
                  </Button>
                  <span className="px-3 py-1 text-sm text-gray-600">
                    Página {pagination.page} de {pagination.totalPages}
                  </span>
                  <Button
                    onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
                    disabled={pagination.page === pagination.totalPages}
                    variant="outline"
                    size="sm"
                  >
                    Siguiente
                  </Button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
};

export default AdminReferralsPage;