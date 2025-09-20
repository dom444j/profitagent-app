import React, { useState, useEffect } from 'react';
import { Search, Users, Mail, Calendar, Shield, Eye, Edit, Ban, CheckCircle, X, DollarSign, Pause, Play } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { apiService } from '../../services/api';

interface User {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  ref_code: string;
  sponsor_id: string | null;
  status: 'active' | 'suspended';
  created_at: string;
  total_licenses: number;
  total_orders: number;
}



// Utility functions
const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString('es-ES', {
    day: '2-digit',
    month: '2-digit'
  });
};

const formatUSDTDisplay = (amount: string | number) => {
  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  return num.toFixed(2);
};

// Earning Calendar Component for Admin
interface AdminEarningCalendarProps {
  earnings: any[];
  licenseName: string;
}

const AdminEarningCalendar: React.FC<AdminEarningCalendarProps> = ({ earnings, licenseName }) => {
  return (
    <div className="space-y-4">
      <h5 className="text-lg font-bold text-slate-800">📅 Calendario de Ganancias - {licenseName}</h5>
      
      {/* Phase Legend */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full"></div>
          <span className="text-sm font-bold text-green-700">💰 Fase Cashback (Días 1-13)</span>
          <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-semibold">Se aplica al balance</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-gradient-to-r from-purple-400 to-violet-500 rounded-full"></div>
          <span className="text-sm font-bold text-purple-700">🚀 Fase Potencial (Días 14-25)</span>
          <span className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-full font-semibold">Se libera al completar</span>
        </div>
      </div>

      {/* 25-Day Calendar Grid */}
      <div className="grid grid-cols-5 sm:grid-cols-10 lg:grid-cols-12 xl:grid-cols-13 gap-1">
        {Array.from({ length: 25 }, (_, index) => {
          const dayNumber = index + 1;
          const earning = earnings.find(e => e.day_index === dayNumber);
          const isCashbackPhase = dayNumber <= 13;
          
          return (
            <div
              key={dayNumber}
              className={`p-1 rounded border text-center transition-all duration-300 min-h-[60px] text-xs ${
                earning
                  ? isCashbackPhase
                    ? 'bg-gradient-to-br from-green-50 to-emerald-50 border-green-300'
                    : 'bg-gradient-to-br from-purple-50 to-violet-50 border-purple-300'
                  : isCashbackPhase
                  ? 'bg-white border-green-100'
                  : 'bg-white border-purple-100'
              }`}
            >
              <div className={`text-[9px] font-bold mb-1 ${
                isCashbackPhase ? 'text-green-600' : 'text-purple-600'
              }`}>
                Día {dayNumber}
              </div>
              {earning ? (
                <>
                  <div className="flex items-center justify-center mb-1">
                    <span className={`text-xs ${
                      isCashbackPhase ? 'text-green-500' : 'text-purple-500'
                    }`}>✅</span>
                  </div>
                  <div className={`text-[9px] font-bold mb-1 ${
                    isCashbackPhase ? 'text-green-700' : 'text-purple-700'
                  }`}>
                    ${formatUSDTDisplay(earning.amount_usdt)}
                  </div>
                  <div className={`text-[8px] ${
                    isCashbackPhase ? 'text-green-600' : 'text-purple-600'
                  }`}>
                    {formatDate(earning.created_at)}
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center mb-1">
                    <span className={`text-xs ${
                      isCashbackPhase ? 'text-green-300' : 'text-purple-300'
                    }`}>
                      {isCashbackPhase ? '📅' : '⏳'}
                    </span>
                  </div>
                  <div className={`text-[8px] ${
                    isCashbackPhase ? 'text-green-500' : 'text-purple-500'
                  }`}>
                    Pendiente
                  </div>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const UsersPage: React.FC = () => {

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    pages: 0
  });
  
  // Modal states
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [showBonusModal, setShowBonusModal] = useState(false);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [bonusAmount, setBonusAmount] = useState('');
  const [bonusReason, setBonusReason] = useState('');
  const [pauseReason, setPauseReason] = useState('');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [licenseEarnings, setLicenseEarnings] = useState<{[key: string]: any[]}>({});
  const [earningsLoading, setEarningsLoading] = useState(false);
  
  // Edit form states
  const [editForm, setEditForm] = useState({
    first_name: '',
    last_name: '',
    email: ''
  });
  
  // Form states
  const [statusAction, setStatusAction] = useState<'activate' | 'disable' | 'delete'>('disable');

  const fetchUsers = async (page: number = 1, search: string = '') => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiService.getAdminUsers(page, 10, search);
      setUsers(response.users);
      setPagination(response.pagination);
      setCurrentPage(page);
    } catch (err: any) {
      console.error('Error fetching users:', err);
      setError(err.message || 'Error al cargar usuarios');
      toast.error('Error al cargar usuarios');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchUsers(1, searchTerm);
  };

  const handlePageChange = (page: number) => {
    fetchUsers(page, searchTerm);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getStatusBadge = (status: string) => {
    if (status === 'active') {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
          <CheckCircle className="w-3 h-3 mr-1" />
          Activo
        </span>
      );
    } else {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
          <Ban className="w-3 h-3 mr-1" />
          Suspendido
        </span>
      );
    }
  };



  // User action handlers
  const handleViewUser = async (user: User) => {
    try {
      setSelectedUser(user);
      setProfileLoading(true);
      setShowProfileModal(true);
      
      const response = await apiService.getAdminUserProfile(user.id);
      setUserProfile(response.profile);
      
      // Load earnings for each active license
      if (response.profile.licenses) {
        setEarningsLoading(true);
        const earningsData: {[key: string]: any[]} = {};
        
        for (const license of response.profile.licenses) {
          if (license.status === 'active') {
            try {
              const earningsResponse = await apiService.getLicenseEarnings(license.id);
              earningsData[license.id] = earningsResponse.data || [];
            } catch (error) {
              console.error(`Error loading earnings for license ${license.id}:`, error);
              earningsData[license.id] = [];
            }
          }
        }
        
        setLicenseEarnings(earningsData);
        setEarningsLoading(false);
      }
    } catch (err: any) {
      console.error('Error fetching user profile:', err);
      toast.error('Error al cargar el perfil del usuario');
      setShowProfileModal(false);
    } finally {
      setProfileLoading(false);
    }
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditForm({
      first_name: user.first_name,
      last_name: user.last_name,
      email: user.email
    });
    setShowEditModal(true);
  };

  const handleStatusAction = (user: User, action: 'activate' | 'disable' | 'delete') => {
    setSelectedUser(user);
    setStatusAction(action);
    setStatusReason('');
    setShowStatusModal(true);
  };

  const handleBonusAction = (user: User) => {
    setSelectedUser(user);
    setBonusAmount('');
    setBonusReason('');
    setShowBonusModal(true);
  };

  const handlePauseAction = (user: User) => {
    setSelectedUser(user);
    setPauseReason('');
    setShowPauseModal(true);
  };

  const confirmStatusAction = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      const newStatus = statusAction === 'activate' ? 'active' : 
                       statusAction === 'disable' ? 'disabled' : 'deleted';
      
      await apiService.updateUserStatus(selectedUser.id, newStatus, statusReason);
      
      // Update user in local state
      setUsers(users.map(user => 
        user.id === selectedUser.id 
          ? { ...user, status: newStatus as 'active' | 'suspended' }
          : user
      ));
      
      toast.success(`Usuario ${statusAction === 'activate' ? 'activado' : statusAction === 'disable' ? 'desactivado' : 'eliminado'} exitosamente`);
      setShowStatusModal(false);
    } catch (error: any) {
      console.error('Error updating user status:', error);
      toast.error('Error al actualizar el estado del usuario');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmBonusAction = async () => {
    if (!selectedUser || !bonusAmount || !bonusReason) {
      toast.error('Por favor completa todos los campos');
      return;
    }
    
    try {
      setActionLoading(true);
      await apiService.createUserBonus(selectedUser.id, parseFloat(bonusAmount), bonusReason);
      
      toast.success(`Bono de $${bonusAmount} USDT asignado a ${selectedUser.email}`);
      
      // Reset form and close modal
      setBonusAmount('');
      setBonusReason('');
      setSelectedUser(null);
      setShowBonusModal(false);
    } catch (error: any) {
      console.error('Error creating bonus:', error);
      toast.error('Error al asignar el bono');
    } finally {
      setActionLoading(false);
    }
  };

  const confirmPauseAction = async () => {
    if (!selectedUser) return;
    
    try {
      setActionLoading(true);
      const isPaused = (selectedUser as any).flags?.pause_potential || false;
      
      await apiService.pauseUserPotential(selectedUser.id, !isPaused, pauseReason);
      
      toast.success(`Potencial ${!isPaused ? 'pausado' : 'reactivado'} para ${selectedUser.email}`);
      setShowPauseModal(false);
      
      // Refresh users to get updated data
      fetchUsers(currentPage, searchTerm);
    } catch (error: any) {
      console.error('Error pausing user potential:', error);
      toast.error('Error al pausar/reactivar el potencial');
    } finally {
      setActionLoading(false);
    }
  };

  const closeModals = () => {
    setShowStatusModal(false);
    setShowBonusModal(false);
    setShowPauseModal(false);
    setShowEditModal(false);
    setShowProfileModal(false);
    setSelectedUser(null);
    setUserProfile(null);
    setStatusReason('');
    setBonusAmount('');
    setBonusReason('');
    setPauseReason('');
    setEditForm({ first_name: '', last_name: '', email: '' });
  };

  const confirmEditUser = async () => {
    if (!selectedUser || !editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.email.trim()) {
      toast.error('Todos los campos son requeridos');
      return;
    }

    try {
      setActionLoading(true);
      
      await apiService.updateUser(selectedUser.id, {
        first_name: editForm.first_name.trim(),
        last_name: editForm.last_name.trim(),
        email: editForm.email.trim()
      });
      
      await fetchUsers(currentPage, searchTerm);
      toast.success('Usuario actualizado exitosamente');
      
      closeModals();
    } catch (error: any) {
      console.error('Error updating user:', error);
      toast.error('Error al actualizar el usuario');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg p-6">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-slate-700">Cargando usuarios...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 p-4">
        <div className="max-w-7xl mx-auto">
          <div className="bg-red-50 rounded-xl border border-red-200 shadow-lg p-6">
            <div className="text-center">
              <div className="text-red-700 text-lg font-semibold mb-2">Error al cargar usuarios</div>
              <div className="text-red-600">{error}</div>
              <button
                onClick={() => fetchUsers(currentPage, searchTerm)}
                className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                Reintentar
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout title="Gestión de Usuarios">
      <div className="space-y-6">
          {/* Description */}
          <div className="mb-6">
            <p className="text-slate-600 text-sm sm:text-base">Administra todos los usuarios registrados en la plataforma</p>
          </div>

          {/* Search and Stats */}
          <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg p-4 sm:p-6 mb-4">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              {/* Search */}
              <form onSubmit={handleSearch} className="flex-1 max-w-md">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-4 w-4" />
                  <input
                    type="text"
                    placeholder="Buscar por email o nombre..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 sm:py-3 bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                  />
                </div>
              </form>

              {/* Stats */}
              <div className="flex items-center justify-center sm:justify-start space-x-4 sm:space-x-6 text-sm">
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-slate-800">{pagination.total}</div>
                  <div className="text-slate-600 text-xs">Total Usuarios</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-green-600">{users.filter(u => u.status === 'active').length}</div>
                  <div className="text-slate-600 text-xs">Activos</div>
                </div>
                <div className="text-center">
                  <div className="text-lg sm:text-xl font-bold text-red-600">{users.filter(u => u.status === 'suspended').length}</div>
                  <div className="text-slate-600 text-xs">Suspendidos</div>
                </div>
              </div>
            </div>
          </div>

          {/* Users Table */}
          {users.length > 0 && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50/80">
                    <tr>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Usuario</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Email</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Código Ref</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden sm:table-cell">Estado</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Herramientas</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden lg:table-cell">Compras</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider hidden md:table-cell">Registro</th>
                      <th className="px-3 sm:px-6 py-3 sm:py-4 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-6 w-6 sm:h-8 sm:w-8">
                              <div className="h-6 w-6 sm:h-8 sm:w-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                                <span className="text-white text-xs sm:text-sm font-medium">
                                  {user.first_name.charAt(0)}{user.last_name.charAt(0)}
                                </span>
                              </div>
                            </div>
                            <div className="ml-2 sm:ml-4">
                              <div className="text-xs sm:text-sm font-medium text-slate-900">
                                {user.first_name} {user.last_name}
                              </div>
                              <div className="text-xs text-slate-500 sm:hidden">
                                {user.email}
                              </div>
                              <div className="sm:hidden mt-1">
                                <div className="inline-block transform scale-95 origin-left">
                                  {getStatusBadge(user.status)}
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 text-slate-400 mr-2" />
                            <span className="text-sm text-slate-900">{user.email}</span>
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <span className="text-sm font-mono text-slate-600 bg-slate-100 px-2 py-1 rounded">
                            {user.ref_code}
                          </span>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden sm:table-cell">
                          {getStatusBadge(user.status)}
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-900 hidden lg:table-cell">
                          <div className="flex items-center">
                            <Shield className="h-4 w-4 text-blue-500 mr-1" />
                            {user.total_licenses}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm text-slate-900 hidden lg:table-cell">
                          <div className="flex items-center">
                            <DollarSign className="h-4 w-4 text-green-500 mr-1" />
                            {user.total_orders}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap hidden md:table-cell">
                          <div className="flex items-center text-sm text-slate-500">
                            <Calendar className="h-4 w-4 mr-1" />
                            {formatDate(user.created_at)}
                          </div>
                        </td>
                        <td className="px-3 sm:px-6 py-3 sm:py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex items-center space-x-1 sm:space-x-2">
                            <button 
                              onClick={() => handleViewUser(user)}
                              className="text-blue-600 hover:text-blue-900 transition-colors p-1"
                              title="Ver perfil"
                            >
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button 
                              onClick={() => handleEditUser(user)}
                              className="text-slate-600 hover:text-slate-900 transition-colors p-1"
                              title="Editar usuario"
                            >
                              <Edit className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button 
                              onClick={() => handleBonusAction(user)}
                              className="text-green-600 hover:text-green-900 transition-colors p-1 hidden sm:block"
                              title="Asignar bono"
                            >
                              <DollarSign className="h-3 w-3 sm:h-4 sm:w-4" />
                            </button>
                            <button 
                              onClick={() => handlePauseAction(user)}
                              className="text-orange-600 hover:text-orange-900 transition-colors p-1 hidden sm:block"
                              title="Pausar/Reactivar potencial"
                            >
                              {(user as any).flags?.pause_potential ? <Play className="h-3 w-3 sm:h-4 sm:w-4" /> : <Pause className="h-3 w-3 sm:h-4 sm:w-4" />}
                            </button>
                            {user.status === 'active' ? (
                              <button 
                                onClick={() => handleStatusAction(user, 'disable')}
                                className="text-red-600 hover:text-red-900 transition-colors p-1"
                                title="Desactivar usuario"
                              >
                                <Ban className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            ) : (
                              <button 
                                onClick={() => handleStatusAction(user, 'activate')}
                                className="text-green-600 hover:text-green-900 transition-colors p-1"
                                title="Activar usuario"
                              >
                                <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4" />
                              </button>
                            )}
        </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {pagination.pages > 1 && (
                <div className="bg-white/50 px-4 sm:px-6 py-4 border-t border-slate-200">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div className="text-xs sm:text-sm text-slate-700 text-center sm:text-left">
                      Mostrando {((currentPage - 1) * pagination.limit) + 1} a {Math.min(currentPage * pagination.limit, pagination.total)} de {pagination.total} usuarios
                    </div>
                    <div className="flex items-center space-x-1 sm:space-x-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Anterior
                      </button>
                      
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const page = Math.max(1, Math.min(pagination.pages - 4, currentPage - 2)) + i;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`px-2 sm:px-3 py-1 text-xs sm:text-sm rounded-md transition-colors ${
                              page === currentPage
                                ? 'bg-blue-600 text-white border border-blue-600'
                                : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {page}
                          </button>
                        );
                      })}
                      
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === pagination.pages}
                        className="px-2 sm:px-3 py-1 text-xs sm:text-sm bg-white border border-slate-200 text-slate-700 rounded-md hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Empty State */}
          {users.length === 0 && !loading && (
            <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg p-8 text-center">
              <Users className="h-10 w-10 text-slate-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-800 mb-2">No se encontraron usuarios</h3>
              <p className="text-slate-600">
                {searchTerm ? 'Intenta con otros términos de búsqueda' : 'No hay usuarios registrados aún'}
              </p>
            </div>
          )}

          {/* Status Change Modal */}
          {showStatusModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {statusAction === 'activate' ? 'Activar Usuario' : 
                       statusAction === 'disable' ? 'Desactivar Usuario' : 'Eliminar Usuario'}
                    </h3>
                    <button
                      onClick={closeModals}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-slate-600 mb-2">
                      ¿Estás seguro de que quieres {statusAction === 'activate' ? 'activar' : statusAction === 'disable' ? 'desactivar' : 'eliminar'} a:
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="font-medium text-slate-800">{selectedUser.first_name} {selectedUser.last_name}</div>
                      <div className="text-sm text-slate-600">{selectedUser.email}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Razón {statusAction === 'delete' ? '(requerida)' : '(opcional)'}
                    </label>
                    <textarea
                      value={statusReason}
                      onChange={(e) => setStatusReason(e.target.value)}
                      placeholder="Describe la razón del cambio de estado..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      required={statusAction === 'delete'}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeModals}
                      disabled={actionLoading}
                      className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmStatusAction}
                      disabled={actionLoading || (statusAction === 'delete' && !statusReason.trim())}
                      className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                        statusAction === 'activate' ? 'bg-green-600 hover:bg-green-700' :
                        statusAction === 'disable' ? 'bg-orange-600 hover:bg-orange-700' :
                        'bg-red-600 hover:bg-red-700'
                      }`}
                    >
                      {actionLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Procesando...
                        </div>
                      ) : (
                        statusAction === 'activate' ? 'Activar' : statusAction === 'disable' ? 'Desactivar' : 'Eliminar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Bonus Assignment Modal */}
          {showBonusModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">Asignar Bono</h3>
                    <button
                      onClick={closeModals}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-slate-600 mb-2">Asignar bono a:</p>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="font-medium text-slate-800">{selectedUser.first_name} {selectedUser.last_name}</div>
                      <div className="text-sm text-slate-600">{selectedUser.email}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Cantidad (USDT) *
                    </label>
                    <input
                      type="number"
                      value={bonusAmount}
                      onChange={(e) => setBonusAmount(e.target.value)}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Razón *
                    </label>
                    <textarea
                      value={bonusReason}
                      onChange={(e) => setBonusReason(e.target.value)}
                      placeholder="Describe la razón del bono..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                      required
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeModals}
                      disabled={actionLoading}
                      className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmBonusAction}
                      disabled={actionLoading || !bonusAmount || !bonusReason.trim()}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Asignando...
                        </div>
                      ) : (
                        'Asignar Bono'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Pause Potential Modal */}
          {showPauseModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      {(selectedUser as any).flags?.pause_potential ? 'Reactivar Potencial' : 'Pausar Potencial'}
                    </h3>
                    <button
                      onClick={closeModals}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-slate-600 mb-2">
                      ¿Estás seguro de que quieres {(selectedUser as any).flags?.pause_potential ? 'reactivar' : 'pausar'} el potencial de:
                    </p>
                    <div className="bg-slate-50 rounded-lg p-3">
                      <div className="font-medium text-slate-800">{selectedUser.first_name} {selectedUser.last_name}</div>
                      <div className="text-sm text-slate-600">{selectedUser.email}</div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-start">
                        <div className="text-blue-600 mr-2">ℹ️</div>
                        <div className="text-sm text-blue-800">
                          {(selectedUser as any).flags?.pause_potential ? 
                            'Al reactivar el potencial, el usuario volverá a generar ganancias diarias en sus licencias activas.' :
                            'Al pausar el potencial, el usuario dejará de generar ganancias diarias temporalmente.'
                          }
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mb-4">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Razón (opcional)
                    </label>
                    <textarea
                      value={pauseReason}
                      onChange={(e) => setPauseReason(e.target.value)}
                      placeholder="Describe la razón del cambio..."
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={closeModals}
                      disabled={actionLoading}
                      className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmPauseAction}
                      disabled={actionLoading}
                      className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                        (selectedUser as any).flags?.pause_potential ? 
                        'bg-green-600 hover:bg-green-700' : 
                        'bg-orange-600 hover:bg-orange-700'
                      }`}
                    >
                      {actionLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Procesando...
                        </div>
                      ) : (
                        (selectedUser as any).flags?.pause_potential ? 'Reactivar' : 'Pausar'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Profile Modal */}
          {showProfileModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="text-xl font-semibold text-slate-800">
                      Perfil de Usuario
                    </h3>
                    <button
                      onClick={() => {
                        setShowProfileModal(false);
                        setUserProfile(null);
                        setLicenseEarnings({});
                        setEarningsLoading(false);
                      }}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                  
                  {profileLoading ? (
                    <div className="flex items-center justify-center py-12">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                      <span className="ml-3 text-slate-600">Cargando perfil...</span>
                    </div>
                  ) : userProfile ? (
                    <div className="space-y-6">
                      {/* Basic Info */}
                      <div className="bg-slate-50 rounded-lg p-4">
                        <h4 className="font-semibold text-slate-800 mb-3">Información Básica</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium text-slate-600">Nombre Completo</label>
                            <p className="text-slate-800">{userProfile.first_name} {userProfile.last_name}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Email</label>
                            <p className="text-slate-800">{userProfile.email}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Código de Referencia</label>
                            <p className="text-slate-800 font-mono">{userProfile.ref_code}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Estado</label>
                            <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              userProfile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                            }`}>
                              {userProfile.status === 'active' ? 'Activo' : 'Suspendido'}
                            </span>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Fecha de Registro</label>
                            <p className="text-slate-800">{new Date(userProfile.created_at).toLocaleDateString('es-ES')}</p>
                          </div>
                          <div>
                            <label className="text-sm font-medium text-slate-600">Balance Calculado</label>
                            <p className="text-slate-800 font-semibold">${userProfile.calculated_balance?.toFixed(2) || '0.00'}</p>
                          </div>
                        </div>
                      </div>

                      {/* Sponsor Info */}
                      {userProfile.sponsor && (
                        <div className="bg-blue-50 rounded-lg p-4">
                          <h4 className="font-semibold text-slate-800 mb-3">Información del Patrocinador</h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium text-slate-600">Nombre</label>
                              <p className="text-slate-800">{userProfile.sponsor.first_name} {userProfile.sponsor.last_name}</p>
                            </div>
                            <div>
                              <label className="text-sm font-medium text-slate-600">Email</label>
                              <p className="text-slate-800">{userProfile.sponsor.email}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Statistics */}
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-green-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-green-600">{userProfile.licenses?.length || 0}</div>
                          <div className="text-sm text-green-700">Licencias</div>
                        </div>
                        <div className="bg-blue-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-blue-600">{userProfile.orders?.length || 0}</div>
                          <div className="text-sm text-blue-700">Órdenes</div>
                        </div>
                        <div className="bg-purple-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-purple-600">{userProfile.withdrawals?.length || 0}</div>
                          <div className="text-sm text-purple-700">Retiros</div>
                        </div>
                        <div className="bg-orange-50 rounded-lg p-4 text-center">
                          <div className="text-2xl font-bold text-orange-600">{userProfile.referred_users?.length || 0}</div>
                          <div className="text-sm text-orange-700">Referidos</div>
                        </div>
                      </div>

                      {/* License Earnings Calendar */}
                      {userProfile.licenses && userProfile.licenses.filter((license: any) => license.status === 'active').length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h4 className="font-semibold text-slate-800 mb-4">📅 Calendarios de Ganancias</h4>
                          {earningsLoading ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                              <span className="ml-3 text-slate-600">Cargando calendarios...</span>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {userProfile.licenses
                                .filter((license: any) => license.status === 'active')
                                .map((license: any) => (
                                  <div key={license.id} className="bg-white rounded-lg p-4 border border-slate-200">
                                    <div className="mb-4">
                                      <h5 className="font-semibold text-slate-800">{license.product?.name || 'Licencia'}</h5>
                                      <div className="text-sm text-slate-600 mt-1">
                                        <span>Días generados: {license.days_generated || 0}</span>
                                        <span className="mx-2">•</span>
                                        <span>Cashback: ${license.cashback_accum || '0.00'}</span>
                                        <span className="mx-2">•</span>
                                        <span>Potencial: ${license.potential_accum || '0.00'}</span>
                                      </div>
                                    </div>
                                    <AdminEarningCalendar 
                                      earnings={licenseEarnings[license.id] || []} 
                                      licenseName={license.product?.name || 'Licencia'}
                                    />
                                  </div>
                                ))
                              }
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recent Activity */}
                      {userProfile.orders && userProfile.orders.length > 0 && (
                        <div className="bg-slate-50 rounded-lg p-4">
                          <h4 className="font-semibold text-slate-800 mb-3">Órdenes Recientes</h4>
                          <div className="space-y-2 max-h-40 overflow-y-auto">
                            {userProfile.orders.slice(0, 5).map((order: any, index: number) => (
                              <div key={index} className="flex justify-between items-center py-2 border-b border-slate-200 last:border-b-0">
                                <div>
                                  <p className="text-sm font-medium text-slate-800">Orden #{order.id}</p>
                                  <p className="text-xs text-slate-600">{new Date(order.created_at).toLocaleDateString('es-ES')}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm font-semibold text-slate-800">${order.amount}</p>
                                  <span className={`text-xs px-2 py-1 rounded-full ${
                                    order.status === 'completed' ? 'bg-green-100 text-green-800' :
                                    order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {order.status}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-slate-600">No se pudo cargar el perfil del usuario</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
           )}

          {/* Edit User Modal */}
          {showEditModal && selectedUser && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-slate-800">
                      Editar Usuario
                    </h3>
                    <button
                      onClick={closeModals}
                      className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                  
                  <div className="mb-4">
                    <p className="text-slate-600 mb-4">Editando información de:</p>
                    <div className="bg-slate-50 rounded-lg p-3 mb-4">
                      <div className="font-medium text-slate-800">{selectedUser.first_name} {selectedUser.last_name}</div>
                      <div className="text-sm text-slate-600">{selectedUser.email}</div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Nombre
                      </label>
                      <input
                        type="text"
                        value={editForm.first_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, first_name: e.target.value }))}
                        placeholder="Nombre del usuario"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Apellido
                      </label>
                      <input
                        type="text"
                        value={editForm.last_name}
                        onChange={(e) => setEditForm(prev => ({ ...prev, last_name: e.target.value }))}
                        placeholder="Apellido del usuario"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-slate-700 mb-2">
                        Email
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                        placeholder="Email del usuario"
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      onClick={closeModals}
                      disabled={actionLoading}
                      className="px-4 py-2 text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={confirmEditUser}
                      disabled={actionLoading || !editForm.first_name.trim() || !editForm.last_name.trim() || !editForm.email.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {actionLoading ? (
                        <div className="flex items-center">
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Guardando...
                        </div>
                      ) : (
                        'Guardar Cambios'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
      </div>
    </AdminLayout>
  );
};

export default UsersPage;