import React, { useState, useEffect } from 'react';
import { Gift, Search, Filter, Calendar, User, DollarSign } from 'lucide-react';
import { apiService } from '../../services/api';
import { toast } from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';

interface Bonus {
  id: string;
  user: {
    id: string;
    email: string;
    name: string;
  };
  amount_usdt: string;
  status: 'pending' | 'released';
  reason: string | null;
  created_by_admin: {
    id: string;
    email: string;
    name: string;
  } | null;
  created_at: string;
  updated_at: string;
}

interface BonusesResponse {
  bonuses: Bonus[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

const AdminBonusesPage: React.FC = () => {
  const [bonuses, setBonuses] = useState<Bonus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  const [filters, setFilters] = useState({
    status: '',
    user_email: '',
    created_from: '',
    created_to: ''
  });

  const fetchBonuses = async (page: number = 1) => {
    try {
      setLoading(true);
      const response: BonusesResponse = await apiService.getAdminBonuses(page, pagination.limit, filters);
      setBonuses(response.bonuses);
      setPagination(response.pagination);
    } catch (error: any) {
      console.error('Error fetching bonuses:', error);
      toast.error('Error al cargar los bonos');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBonuses();
  }, []);

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchBonuses(1);
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      user_email: '',
      created_from: '',
      created_to: ''
    });
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchBonuses(1);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge variant="warning">
            Pendiente
          </Badge>
        );
      case 'released':
        return (
          <Badge variant="success">
            Liberado
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary">
            {status}
          </Badge>
        );
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatAmount = (amount: string) => {
    return parseFloat(amount).toFixed(2);
  };

  return (
    <AdminLayout title="Historial de Bonos">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Gift className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Historial de Bonos</h1>
              <p className="text-slate-600">Gestiona y revisa todos los bonos asignados</p>
            </div>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-800">Filtros</h2>
            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2"
            >
              <Filter className="h-4 w-4" />
              {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
            </Button>
          </div>
          
          {showFilters && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos los estados</option>
                    <option value="pending">Pendiente</option>
                    <option value="released">Liberado</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Email del Usuario
                  </label>
                  <input
                    type="text"
                    value={filters.user_email}
                    onChange={(e) => handleFilterChange('user_email', e.target.value)}
                    placeholder="Buscar por email..."
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha Desde
                  </label>
                  <input
                    type="date"
                    value={filters.created_from}
                    onChange={(e) => handleFilterChange('created_from', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1">
                    Fecha Hasta
                  </label>
                  <input
                    type="date"
                    value={filters.created_to}
                    onChange={(e) => handleFilterChange('created_to', e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button
                  onClick={applyFilters}
                  className="flex items-center gap-2"
                >
                  <Search className="h-4 w-4" />
                  Aplicar Filtros
                </Button>
                <Button
                  variant="outline"
                  onClick={clearFilters}
                >
                  Limpiar
                </Button>
              </div>
            </div>
          )}
        </Card>

        {/* Bonuses Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-slate-700">Usuario</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-slate-700">Monto</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-slate-700 hidden sm:table-cell">Estado</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-slate-700 hidden md:table-cell">Razón</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-slate-700 hidden lg:table-cell">Creado por</th>
                  <th className="text-left py-3 px-2 sm:px-4 font-medium text-slate-700 hidden md:table-cell">Fecha</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                        <span className="ml-2 text-slate-600">Cargando bonos...</span>
                      </div>
                    </td>
                  </tr>
                ) : bonuses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8">
                      <div className="flex flex-col items-center">
                        <Gift className="h-12 w-12 text-slate-400 mb-2" />
                        <p className="text-slate-600">No se encontraron bonos</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  bonuses.map((bonus) => (
                    <tr key={bonus.id} className="border-b border-slate-100 hover:bg-slate-50">
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-2 sm:gap-3">
                          <div className="p-2 bg-blue-100 rounded-lg">
                            <User className="h-4 w-4 text-blue-600" />
                          </div>
                          <div>
                            <div className="font-medium text-slate-800 text-sm sm:text-base">
                              {bonus.user.name || 'Sin nombre'}
                            </div>
                            <div className="text-xs sm:text-sm text-slate-600">{bonus.user.email}</div>
                            <div className="sm:hidden mt-1">
                              {getStatusBadge(bonus.status)}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4">
                        <div className="flex items-center gap-2">
                          <DollarSign className="h-4 w-4 text-green-600" />
                          <span className="font-semibold text-green-600 text-sm sm:text-base">
                            ${formatAmount(bonus.amount_usdt)} USDT
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden sm:table-cell">
                        {getStatusBadge(bonus.status)}
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                        <span className="text-slate-700">
                          {bonus.reason || 'Sin razón especificada'}
                        </span>
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden lg:table-cell">
                        {bonus.created_by_admin ? (
                          <div>
                            <div className="font-medium text-slate-800">
                              {bonus.created_by_admin.name || 'Sin nombre'}
                            </div>
                            <div className="text-sm text-slate-600">
                              {bonus.created_by_admin.email}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-500">Sistema</span>
                        )}
                      </td>
                      <td className="py-3 px-2 sm:px-4 hidden md:table-cell">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-slate-400" />
                          <span className="text-slate-700">
                            {formatDate(bonus.created_at)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="px-4 py-3 border-t border-slate-200 flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Mostrando {((pagination.page - 1) * pagination.limit) + 1} a{' '}
                {Math.min(pagination.page * pagination.limit, pagination.total)} de{' '}
                {pagination.total} bonos
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBonuses(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  Anterior
                </Button>
                <span className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded-lg">
                  {pagination.page} de {pagination.pages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchBonuses(pagination.page + 1)}
                  disabled={pagination.page === pagination.pages}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminBonusesPage;