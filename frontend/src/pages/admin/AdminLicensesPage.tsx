import React, { useState, useEffect } from 'react';
import AdminLayout from '../../components/layout/AdminLayout';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import { Alert, AlertDescription } from '../../components/ui/Alert';
import { Loader2, Pause, Play, Search, Filter, Calendar, TrendingUp, DollarSign, Users, Settings, Zap, Clock } from 'lucide-react';
import { formatUSDTDisplay, formatPercentage } from '../../utils/format';
import { apiService } from '../../services/api';
import { License } from '../../types';

interface AdminLicense extends License {
  user: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
  };
}

interface LicensesResponse {
  licenses: AdminLicense[];
  total: number;
  page: number;
  totalPages: number;
}

const AdminLicensesPage: React.FC = () => {
  const [licenses, setLicenses] = useState<AdminLicense[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'completed' | 'paused' | 'canceled'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedLicense, setSelectedLicense] = useState<AdminLicense | null>(null);
  const [showPauseModal, setShowPauseModal] = useState(false);
  const [showAdjustDaysModal, setShowAdjustDaysModal] = useState(false);
  const [showAdjustTimingModal, setShowAdjustTimingModal] = useState(false);
  const [adjustDaysForm, setAdjustDaysForm] = useState({ days: 0, reason: '' });
  const [adjustTimingForm, setAdjustTimingForm] = useState({ hours: 0, minutes: 0, reason: '' });
  const [showProcessEarningsModal, setShowProcessEarningsModal] = useState(false);

  useEffect(() => {
    fetchLicenses(currentPage, searchTerm, statusFilter);
  }, [currentPage, statusFilter]);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      fetchLicenses(currentPage, searchTerm, statusFilter);
    }, 30000);
    return () => clearInterval(interval);
  }, [currentPage, searchTerm, statusFilter]);

  const fetchLicenses = async (page: number = 1, search: string = '', status: string = 'all') => {
    try {
      setLoading(true);
      const response: LicensesResponse = await apiService.getAdminLicenses(
        page,
        20,
        status === 'all' ? undefined : status,
        search || undefined
      );
      
      setLicenses(response.licenses || []);
      setTotalPages(response.totalPages || 1);
      setError(null);
    } catch (err: any) {
      setError('Error al cargar licencias');
      console.error('Error fetching licenses:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchLicenses(1, searchTerm, statusFilter);
  };

  const handlePausePotential = (license: AdminLicense) => {
    setSelectedLicense(license);
    setShowPauseModal(true);
  };

  const handleAdjustDays = (license: AdminLicense) => {
    setSelectedLicense(license);
    setAdjustDaysForm({ days: license.daysGenerated || license.days_generated || 0, reason: '' });
    setShowAdjustDaysModal(true);
  };

  const handleAdjustTiming = (license: AdminLicense) => {
    setSelectedLicense(license);
    setAdjustTimingForm({ hours: 0, minutes: 0, reason: '' });
    setShowAdjustTimingModal(true);
  };

  const handleProcessEarnings = (license: AdminLicense) => {
    setSelectedLicense(license);
    setShowProcessEarningsModal(true);
  };

  const confirmPauseAction = async () => {
    if (!selectedLicense) return;
    
    try {
      setActionLoading(selectedLicense.id);
      const newPauseState = !(selectedLicense.flags?.pause_potential || selectedLicense.pause_potential || false);
      
      await apiService.pauseLicensePotential(selectedLicense.id, newPauseState);
      
      setSuccess(`Potencial ${newPauseState ? 'pausado' : 'reanudado'} exitosamente`);
      setShowPauseModal(false);
      setSelectedLicense(null);
      fetchLicenses(currentPage, searchTerm, statusFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al cambiar estado del potencial');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAdjustDays = async () => {
    if (!selectedLicense || !adjustDaysForm.reason.trim()) return;
    
    try {
      setActionLoading(selectedLicense.id);
      
      await apiService.adjustLicenseDays(selectedLicense.id, adjustDaysForm.days, adjustDaysForm.reason);
      
      setSuccess(`Días de licencia ajustados exitosamente a ${adjustDaysForm.days}`);
      setShowAdjustDaysModal(false);
      setSelectedLicense(null);
      setAdjustDaysForm({ days: 0, reason: '' });
      fetchLicenses(currentPage, searchTerm, statusFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al ajustar días de licencia');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmAdjustTiming = async () => {
    if (!selectedLicense || !adjustTimingForm.reason.trim()) return;
    
    try {
      setActionLoading(selectedLicense.id);
      
      const totalMinutes = adjustTimingForm.hours * 60 + adjustTimingForm.minutes;
      await apiService.adjustLicenseTiming(selectedLicense.id, totalMinutes, adjustTimingForm.reason);
      
      setSuccess(`Tiempo de conteo ajustado exitosamente: ${adjustTimingForm.hours}h ${adjustTimingForm.minutes}m`);
      setShowAdjustTimingModal(false);
      setSelectedLicense(null);
      setAdjustTimingForm({ hours: 0, minutes: 0, reason: '' });
      fetchLicenses(currentPage, searchTerm, statusFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al ajustar tiempo de licencia');
    } finally {
      setActionLoading(null);
    }
  };

  const confirmProcessEarnings = async () => {
    if (!selectedLicense) return;
    
    try {
      setActionLoading(selectedLicense.id);
      
      await apiService.processLicenseEarnings(selectedLicense.id, true);
      
      setSuccess('Ganancias procesadas exitosamente');
      setShowProcessEarningsModal(false);
      setSelectedLicense(null);
      fetchLicenses(currentPage, searchTerm, statusFilter);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar ganancias');
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="success" className="bg-green-100 text-green-700">🟢 Activa</Badge>;
      case 'completed':
        return <Badge variant="info" className="bg-blue-100 text-blue-700">✅ Completada</Badge>;
      case 'paused':
        return <Badge variant="warning" className="bg-yellow-100 text-yellow-700">⏸️ Pausada</Badge>;
      case 'canceled':
        return <Badge variant="danger" className="bg-red-100 text-red-700">❌ Cancelada</Badge>;
      default:
        return <Badge variant="secondary" className="bg-gray-100 text-gray-700">{status}</Badge>;
    }
  };

  const calculateProgress = (accrued: string, principal: string) => {
    const accruedNum = parseFloat(accrued || '0');
    const principalNum = parseFloat(principal || '0');
    const cap = principalNum * 2; // 200% cap
    return cap > 0 ? Math.min((accruedNum / cap) * 100, 100) : 0;
  };

  const calculateDaysRemaining = (daysGenerated: number, totalDays: number = 20) => {
    const validDaysGenerated = daysGenerated || 0;
    return Math.max(totalDays - validDaysGenerated, 0);
  };

  // Calculate summary stats
  const totalLicenses = licenses.length;
  const activeLicenses = licenses.filter(l => l.status === 'active').length;
  const pausedLicenses = licenses.filter(l => l.flags?.pause_potential || l.pause_potential).length;
  const totalInvested = licenses.reduce((sum, l) => {
    // Use principalUSDT first, then fallback to product.price_usdt
    const principal = l.principalUSDT || l.product?.price_usdt || '0';
    return sum + parseFloat(principal);
  }, 0);
  const totalEarned = licenses.reduce((sum, l) => sum + parseFloat(l.accruedUSDT || l.accrued_usdt || '0'), 0);

  if (loading && licenses.length === 0) {
    return (
      <AdminLayout title="Gestión de Licencias">
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-2 text-gray-600">Cargando licencias...</span>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="Gestión de Licencias">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">📊 Gestión de Licencias</h1>
            <p className="text-gray-600">Monitorea y gestiona todas las herramientas tecnológicas activas del sistema</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Licencias</p>
                <p className="text-2xl font-bold text-gray-900">{totalLicenses}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <Calendar className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Activas</p>
                <p className="text-2xl font-bold text-green-600">{activeLicenses}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pausadas</p>
                <p className="text-2xl font-bold text-yellow-600">{pausedLicenses}</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-lg">
                <Pause className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total en Licencias</p>
                <p className="text-2xl font-bold text-blue-600">{formatUSDTDisplay(totalInvested.toString())}</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-lg">
                <DollarSign className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Procesado</p>
                <p className="text-2xl font-bold text-green-600">{formatUSDTDisplay(totalEarned.toString())}</p>
              </div>
              <div className="p-3 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por email de usuario..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div className="flex gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">Todos los estados</option>
                <option value="active">Activas</option>
                <option value="completed">Completadas</option>
                <option value="paused">Pausadas</option>
                <option value="canceled">Canceladas</option>
              </select>
              
              <Button onClick={handleSearch} className="px-4 py-2">
                <Filter className="h-4 w-4 mr-2" />
                Filtrar
              </Button>
            </div>
          </div>
        </Card>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        {success && (
          <Alert variant="default" className="border-green-200 bg-green-50">
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {/* Licenses Table */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Producto
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:table-cell">
                    Fecha Activación
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                    Progreso
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                    Días
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell">
                    Resultados
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden 2xl:table-cell">
                    Potencial
                  </th>
                  <th className="px-3 sm:px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {licenses.map((license) => {
                  const progress = calculateProgress(license.accruedUSDT || license.accrued_usdt || '0', license.principalUSDT || license.principal_usdt || '0');
                  const daysGenerated = license.daysGenerated || license.days_generated || 0;
                  const isPotentialPaused = license.flags?.pause_potential || license.pause_potential || false;
                  
                  return (
                    <tr key={license.id} className="hover:bg-gray-50">
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {license.user.first_name} {license.user.last_name}
                          </div>
                          <div className="text-sm text-gray-500 break-all">{license.user.email}</div>
                        </div>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{license.product.name}</div>
                          <div className="text-sm text-gray-500">{formatUSDTDisplay(license.principalUSDT || license.principal_usdt || '0')}</div>
                        </div>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(license.status)}
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                        <div className="text-sm text-gray-900">
                          {(() => {
                            const dateValue = license.startedAt || license.started_at;
                            return dateValue ? 
                              new Date(dateValue).toLocaleDateString('es-ES', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit'
                              }) : 'No activada';
                          })()}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const dateValue = license.startedAt || license.started_at;
                            return dateValue ? 
                              new Date(dateValue).toLocaleTimeString('es-ES', {
                                hour: '2-digit',
                                minute: '2-digit'
                              }) : '';
                          })()}
                        </div>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden md:table-cell">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${progress}%` }}
                          ></div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">{formatPercentage(progress)}</div>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden lg:table-cell">
                        <div className="text-sm text-gray-900">
                          {daysGenerated}/20
                        </div>
                        <div className="text-xs text-gray-500">
                          {calculateDaysRemaining(daysGenerated)} restantes
                        </div>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden xl:table-cell">
                        <div className="text-sm text-gray-900">
                          {formatUSDTDisplay(license.accruedUSDT || license.accrued_usdt || '0')}
                        </div>
                        <div className="text-xs text-gray-500">
                          de {formatUSDTDisplay((parseFloat(license.principalUSDT || license.principal_usdt || '0') * 2).toString())}
                        </div>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden 2xl:table-cell">
                        <div className="flex items-center">
                          {isPotentialPaused ? (
                            <Badge variant="warning" className="bg-red-100 text-red-700">
                              ⏸️ Pausado
                            </Badge>
                          ) : (
                            <Badge variant="success" className="bg-green-100 text-green-700">
                              ▶️ Activo
                            </Badge>
                          )}
                        </div>
                      </td>
                      
                      <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handlePausePotential(license)}
                            disabled={actionLoading === license.id || license.status !== 'active'}
                            className="flex items-center"
                            aria-label={isPotentialPaused ? 'Reanudar potencial' : 'Pausar potencial'}
                          >
                            {actionLoading === license.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : isPotentialPaused ? (
                              <Play className="h-4 w-4" />
                            ) : (
                              <Pause className="h-4 w-4" />
                            )}
                            <span className="ml-1 hidden sm:inline">
                              {isPotentialPaused ? 'Reanudar' : 'Pausar'}
                            </span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustDays(license)}
                            disabled={actionLoading === license.id}
                            className="flex items-center"
                            aria-label="Ajustar días"
                          >
                            <Settings className="h-4 w-4" />
                            <span className="ml-1 hidden lg:inline">Días</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleAdjustTiming(license)}
                            disabled={actionLoading === license.id}
                            className="flex items-center"
                            aria-label="Ajustar tiempo"
                          >
                            <Clock className="h-4 w-4" />
                            <span className="ml-1 hidden lg:inline">Tiempo</span>
                          </Button>
                          
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleProcessEarnings(license)}
                            disabled={actionLoading === license.id || license.status !== 'active'}
                            className="flex items-center"
                            aria-label="Procesar ganancias"
                          >
                            <Zap className="h-4 w-4" />
                            <span className="ml-1 hidden lg:inline">Procesar</span>
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          
          {licenses.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay licencias</h3>
              <p className="text-gray-500">No se encontraron herramientas tecnológicas con los filtros aplicados.</p>
            </div>
          )}
        </Card>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-700">
              Página {currentPage} de {totalPages}
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
              >
                Siguiente
              </Button>
            </div>
          </div>
        )}

        {/* Adjust Timing Modal */}
        {showAdjustTimingModal && selectedLicense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  🕒 Ajustar Tiempo de Conteo
                </h3>
                <button
                  onClick={() => setShowAdjustTimingModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="font-medium text-gray-800">
                    {selectedLicense.user.first_name} {selectedLicense.user.last_name}
                  </div>
                  <div className="text-sm text-gray-600">{selectedLicense.user.email}</div>
                  <div className="text-sm text-gray-600">{selectedLicense.product.name}</div>
                  <div className="text-sm text-gray-600">{formatUSDTDisplay(selectedLicense.principalUSDT || selectedLicense.principal_usdt || '0')}</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ajustar tiempo de conteo
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Horas</label>
                        <input
                          type="number"
                          min="-23"
                          max="23"
                          value={adjustTimingForm.hours}
                          onChange={(e) => setAdjustTimingForm(prev => ({ ...prev, hours: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">Minutos</label>
                        <input
                          type="number"
                          min="-59"
                          max="59"
                          value={adjustTimingForm.minutes}
                          onChange={(e) => setAdjustTimingForm(prev => ({ ...prev, minutes: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Usa valores negativos para retrasar el conteo, positivos para adelantarlo
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razón del ajuste *
                    </label>
                    <textarea
                      value={adjustTimingForm.reason}
                      onChange={(e) => setAdjustTimingForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Explica por qué se está ajustando el tiempo de esta licencia..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <div className="mr-2 text-blue-600">🕒</div>
                  <div className="text-sm text-blue-800">
                    Este ajuste modificará el tiempo de conteo para el próximo procesamiento de ganancias. Esta acción quedará registrada en el log de auditoría.
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAdjustTimingModal(false)}
                  disabled={actionLoading === selectedLicense.id}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmAdjustTiming}
                  disabled={actionLoading === selectedLicense.id || !adjustTimingForm.reason.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading === selectedLicense.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Ajustar Tiempo
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Adjust Days Modal */}
        {showAdjustDaysModal && selectedLicense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  ⚙️ Ajustar Días de Licencia
                </h3>
                <button
                  onClick={() => setShowAdjustDaysModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <div className="bg-gray-50 rounded-lg p-3 mb-4">
                  <div className="font-medium text-gray-800">
                    {selectedLicense.user.first_name} {selectedLicense.user.last_name}
                  </div>
                  <div className="text-sm text-gray-600">{selectedLicense.user.email}</div>
                  <div className="text-sm text-gray-600">{selectedLicense.product.name}</div>
                  <div className="text-sm text-gray-600">{formatUSDTDisplay(selectedLicense.principalUSDT || selectedLicense.principal_usdt || '0')}</div>
                  <div className="text-sm text-gray-600">Días actuales: {selectedLicense.daysGenerated || selectedLicense.days_generated || 0}</div>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nuevos días (0-20)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="20"
                      value={adjustDaysForm.days}
                      onChange={(e) => setAdjustDaysForm(prev => ({ ...prev, days: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Razón del ajuste *
                    </label>
                    <textarea
                      value={adjustDaysForm.reason}
                      onChange={(e) => setAdjustDaysForm(prev => ({ ...prev, reason: e.target.value }))}
                      placeholder="Explica por qué se está ajustando los días de esta licencia..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      rows={3}
                    />
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <div className="mr-2 text-yellow-600">⚠️</div>
                  <div className="text-sm text-yellow-800">
                    Este ajuste modificará los días generados y recalculará las ganancias totales de la licencia. Esta acción quedará registrada en el log de auditoría.
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowAdjustDaysModal(false)}
                  disabled={actionLoading === selectedLicense.id}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmAdjustDays}
                  disabled={actionLoading === selectedLicense.id || !adjustDaysForm.reason.trim()}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading === selectedLicense.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Ajustar Días
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Process Earnings Modal */}
        {showProcessEarningsModal && selectedLicense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  ⚡ Procesar Ganancias Manualmente
                </h3>
                <button
                  onClick={() => setShowProcessEarningsModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  ¿Estás seguro de que quieres procesar manualmente las ganancias de esta licencia?
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-800">
                    {selectedLicense.user.first_name} {selectedLicense.user.last_name}
                  </div>
                  <div className="text-sm text-gray-600">{selectedLicense.user.email}</div>
                  <div className="text-sm text-gray-600">{selectedLicense.product.name}</div>
                  <div className="text-sm text-gray-600">{formatUSDTDisplay(selectedLicense.principalUSDT || selectedLicense.principal_usdt || '0')}</div>
                  <div className="text-sm text-gray-600">Días generados: {selectedLicense.daysGenerated || selectedLicense.days_generated || 0}/20</div>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
                <div className="flex items-start">
                  <div className="mr-2 text-blue-600">⚡</div>
                  <div className="text-sm text-blue-800">
                    Esto procesará el siguiente día de ganancias para esta licencia específica, aplicando las validaciones correspondientes (24 horas desde activación, límites de días, etc.).
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowProcessEarningsModal(false)}
                  disabled={actionLoading === selectedLicense.id}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmProcessEarnings}
                  disabled={actionLoading === selectedLicense.id}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {actionLoading === selectedLicense.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  Procesar Ganancias
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Pause/Resume Modal */}
        {showPauseModal && selectedLicense && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {(selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) ? 'Reanudar' : 'Pausar'} Potencial
                </h3>
                <button
                  onClick={() => setShowPauseModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-gray-600 mb-2">
                  ¿Estás seguro de que quieres {(selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) ? 'reanudar' : 'pausar'} el potencial de esta licencia?
                </p>
                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="font-medium text-gray-800">
                    {selectedLicense.user.first_name} {selectedLicense.user.last_name}
                  </div>
                  <div className="text-sm text-gray-600">{selectedLicense.user.email}</div>
                  <div className="text-sm text-gray-600">{selectedLicense.product.name}</div>
                  <div className="text-sm text-gray-600">{formatUSDTDisplay(selectedLicense.principalUSDT || selectedLicense.principal_usdt || '0')}</div>
                </div>
              </div>

              <div className={`border rounded-lg p-3 mb-4 ${
                (selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-yellow-50 border-yellow-200'
              }`}>
                <div className="flex items-start">
                  <div className={`mr-2 ${
                    (selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) ? 'text-green-600' : 'text-yellow-600'
                  }`}>
                    {(selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) ? '▶️' : '⏸️'}
                  </div>
                  <div className={`text-sm ${
                    (selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) ? 'text-green-800' : 'text-yellow-800'
                  }`}>
                    {(selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) 
                      ? 'Al reanudar, el potencial volverá a acumularse en los próximos beneficios diarios.'
                      : 'Al pausar, el potencial dejará de acumularse pero el cashback continuará normalmente.'
                    }
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setShowPauseModal(false)}
                  disabled={actionLoading === selectedLicense.id}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={confirmPauseAction}
                  disabled={actionLoading === selectedLicense.id}
                  className={(selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) ? 'bg-green-600 hover:bg-green-700' : 'bg-yellow-600 hover:bg-yellow-700'}
                >
                  {actionLoading === selectedLicense.id ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : null}
                  {(selectedLicense.flags?.pause_potential || selectedLicense.pause_potential) ? 'Reanudar' : 'Pausar'}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
};

export default AdminLicensesPage;