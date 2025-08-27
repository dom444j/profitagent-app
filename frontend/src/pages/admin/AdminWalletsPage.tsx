import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Wallet, CheckCircle, XCircle, AlertCircle, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { apiService } from '../../services/api';

interface AdminWallet {
  id: string;
  label: string;
  address: string;
  status: 'active' | 'inactive';
  assigned_count: number;
  last_assigned_at: string | null;
  created_at: string;
}

interface CreateWalletData {
  label: string;
  address: string;
}

interface UpdateWalletData {
  label?: string;
  status?: 'active' | 'inactive';
}

const AdminWalletsPage: React.FC = () => {
  const [wallets, setWallets] = useState<AdminWallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingWallet, setEditingWallet] = useState<AdminWallet | null>(null);
  const [createData, setCreateData] = useState<CreateWalletData>({ label: '', address: '' });
  const [editData, setEditData] = useState<UpdateWalletData>({});

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdminWallets();
      setWallets(response.wallets);
    } catch (error) {
      console.error('Error fetching wallets:', error);
      toast.error('Error al cargar las wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!createData.label.trim() || !createData.address.trim()) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    // Validate BEP20 address format
    if (!/^0x[a-fA-F0-9]{40}$/.test(createData.address)) {
      toast.error('Formato de dirección BEP20 inválido');
      return;
    }

    try {
      await apiService.createAdminWallet(createData);
      toast.success('Wallet creada exitosamente');
      setShowCreateModal(false);
      setCreateData({ label: '', address: '' });
      fetchWallets();
    } catch (error: any) {
      console.error('Error creating wallet:', error);
      if (error.response?.data?.error?.includes('already exists')) {
        toast.error('Esta dirección de wallet ya existe');
      } else {
        toast.error('Error al crear la wallet');
      }
    }
  };

  const handleUpdateWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editingWallet) return;

    try {
      await apiService.updateAdminWallet(editingWallet.id, editData);
      toast.success('Wallet actualizada exitosamente');
      setEditingWallet(null);
      setEditData({});
      fetchWallets();
    } catch (error) {
      console.error('Error updating wallet:', error);
      toast.error('Error al actualizar la wallet');
    }
  };

  const handleDeleteWallet = async (walletId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta wallet?')) {
      return;
    }

    try {
      await apiService.deleteAdminWallet(walletId);
      toast.success('Wallet eliminada exitosamente');
      fetchWallets();
    } catch (error: any) {
      console.error('Error deleting wallet:', error);
      if (error.response?.data?.error?.includes('pending orders')) {
        toast.error('No se puede eliminar una wallet con órdenes pendientes');
      } else {
        toast.error('Error al eliminar la wallet');
      }
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'inactive':
        return <XCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Nunca';
    return new Date(dateString).toLocaleString('es-ES');
  };

  const truncateAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Gestión de Wallets de Recaudo</h1>
            <p className="text-gray-600 mt-1">
              Administra las direcciones USDT BEP20 del pool de recaudación
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span>Agregar Wallet</span>
          </button>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Wallets Activas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {wallets.filter(w => w.status === 'active').length}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <Wallet className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Wallets</p>
                <p className="text-2xl font-bold text-gray-900">{wallets.length}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-center">
              <div className="p-3 bg-blue-100 rounded-lg">
                <BarChart3 className="w-6 h-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Asignaciones</p>
                <p className="text-2xl font-bold text-gray-900">
                  {wallets.reduce((sum, w) => sum + w.assigned_count, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Wallets Table */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Wallets</h2>
          </div>
          
          {wallets.length === 0 ? (
            <div className="text-center py-12">
              <Wallet className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay wallets configuradas</h3>
              <p className="text-gray-600 mb-4">Agrega tu primera wallet de recaudo para comenzar</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Agregar Primera Wallet
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Wallet
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                      Asignaciones
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Última Asignación
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {wallets.map((wallet) => (
                    <tr key={wallet.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{wallet.label}</div>
                          <div className="text-sm text-gray-500 font-mono">
                            {truncateAddress(wallet.address)}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(wallet.status)}
                          <span className={`text-sm font-medium ${
                            wallet.status === 'active' ? 'text-green-700' : 'text-red-700'
                          }`}>
                            {wallet.status === 'active' ? 'Activa' : 'Inactiva'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 hidden sm:table-cell">
                        {wallet.assigned_count}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 hidden lg:table-cell">
                        {formatDate(wallet.last_assigned_at)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              setEditingWallet(wallet);
                              setEditData({ label: wallet.label, status: wallet.status });
                            }}
                            className="text-blue-600 hover:text-blue-900 transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteWallet(wallet.id)}
                            className="text-red-600 hover:text-red-900 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Wallet Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Agregar Nueva Wallet</h3>
              
              <form onSubmit={handleCreateWallet} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Etiqueta
                  </label>
                  <input
                    type="text"
                    value={createData.label}
                    onChange={(e) => setCreateData({ ...createData, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Wallet Principal"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección BEP20
                  </label>
                  <input
                    type="text"
                    value={createData.address}
                    onChange={(e) => setCreateData({ ...createData, address: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                    placeholder="0x..."
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Dirección de wallet USDT en la red BEP20 (Binance Smart Chain)
                  </p>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false);
                      setCreateData({ label: '', address: '' });
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Crear Wallet
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Wallet Modal */}
        {editingWallet && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Editar Wallet</h3>
              
              <form onSubmit={handleUpdateWallet} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Etiqueta
                  </label>
                  <input
                    type="text"
                    value={editData.label || ''}
                    onChange={(e) => setEditData({ ...editData, label: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Ej: Wallet Principal"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={editData.status || ''}
                    onChange={(e) => setEditData({ ...editData, status: e.target.value as 'active' | 'inactive' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="active">Activa</option>
                    <option value="inactive">Inactiva</option>
                  </select>
                </div>
                
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-600">
                    <strong>Dirección:</strong> {truncateAddress(editingWallet.address)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    La dirección no se puede modificar
                  </p>
                </div>
                
                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingWallet(null);
                      setEditData({});
                    }}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Actualizar
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminWalletsPage;