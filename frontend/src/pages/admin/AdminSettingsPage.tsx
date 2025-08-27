import React, { useState, useEffect } from 'react';

import AdminLayout from '../../components/layout/AdminLayout';
import { 
  Settings, 
  Shield, 
  Bell, 
  Eye, 
  EyeOff, 
  Lock, 
  Save, 
  AlertTriangle,

  Server,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService } from '../../services/api';

interface SystemSettings {
  maintenanceMode: boolean;
  registrationEnabled: boolean;
  withdrawalEnabled: boolean;
  minimumWithdrawal: number;
  maximumWithdrawal: number;
  withdrawalFeeUsdt: number;
  systemFeePercentage: number;
  dailyEarningRate: number;
  maxEarningDays: number;
  earningCapPercentage: number;
  passwordMinLength: number;
}

interface SecuritySettings {
  twoFactorRequired: boolean;
  sessionTimeout: number;
  maxLoginAttempts: number;
  passwordMinLength: number;
}

interface NotificationSettings {
  emailNotifications: boolean;
  adminAlerts: boolean;
  systemAlerts: boolean;
  withdrawalAlerts: boolean;
  userRegistrationAlerts: boolean;
}

const AdminSettingsPage: React.FC = () => {

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'system' | 'security' | 'notifications' | 'password'>('system');
  
  // Password change state
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  
  // Settings state
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    maintenanceMode: false,
    registrationEnabled: true,
    withdrawalEnabled: true,
    minimumWithdrawal: 10,
    maximumWithdrawal: 10000,
    withdrawalFeeUsdt: 2,
    systemFeePercentage: 10,
    dailyEarningRate: 10,
    maxEarningDays: 20,
    earningCapPercentage: 200,
    passwordMinLength: 8
  });
  
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorRequired: false,
    sessionTimeout: 24,
    maxLoginAttempts: 5,
    passwordMinLength: 8
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    adminAlerts: true,
    systemAlerts: true,
    withdrawalAlerts: true,
    userRegistrationAlerts: false
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const response = await apiService.getAdminSettings();
      
      if (response.success) {
        const { system, security, notifications } = response.data;
        
        // Map backend data to frontend state
        setSystemSettings({
          maintenanceMode: system.maintenance_mode || false,
          registrationEnabled: system.registration_enabled ?? true,
          withdrawalEnabled: system.withdrawal_enabled ?? true,
          minimumWithdrawal: parseFloat(system.min_withdrawal_amount) || 10,
          maximumWithdrawal: parseFloat(system.maximum_withdrawal) || 10000,
          withdrawalFeeUsdt: parseFloat(system.withdrawal_fee_usdt) || 2,
          systemFeePercentage: (parseFloat(system.referral_commission_rate) * 100) || 10,
          dailyEarningRate: (parseFloat(system.daily_earning_rate) * 100) || 10,
          maxEarningDays: parseInt(system.max_earning_days) || 20,
          earningCapPercentage: (parseFloat(system.earning_cap_percentage) * 100) || 200,
          passwordMinLength: parseInt(system.password_min_length) || 8
        });
        
        setSecuritySettings({
          twoFactorRequired: security.require_2fa || false,
          sessionTimeout: Math.floor(security.session_timeout / 3600) || 24, // Convert seconds to hours
          maxLoginAttempts: security.max_login_attempts || 5,
          passwordMinLength: 8 // Not in backend yet
        });
        
        setNotificationSettings({
          emailNotifications: notifications.email_notifications || true,
          adminAlerts: notifications.telegram_bot_enabled || true,
          systemAlerts: notifications.push_notifications || true,
          withdrawalAlerts: notifications.email_notifications || true,
          userRegistrationAlerts: notifications.sms_notifications || false
        });
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Error al cargar la configuración');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('Las contraseñas no coinciden');
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error('La contraseña debe tener al menos 8 caracteres');
      return;
    }

    if (!passwordData.currentPassword) {
      toast.error('Debe ingresar su contraseña actual');
      return;
    }

    try {
      setSaving(true);
      const response = await apiService.changeAdminPassword({
        current_password: passwordData.currentPassword,
        new_password: passwordData.newPassword,
        confirm_password: passwordData.confirmPassword
      });
      
      if (response?.success) {
        toast.success('Contraseña actualizada correctamente');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error('Error al cambiar la contraseña');
      }
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.error || 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveSettings = async (settingsType: 'system' | 'security' | 'notifications') => {
    try {
      setSaving(true);
      
      let response;
      
      switch (settingsType) {
        case 'system':
          // Map frontend state to backend format
          const systemData = {
            maintenance_mode: systemSettings.maintenanceMode,
            min_withdrawal_amount: systemSettings.minimumWithdrawal,
            withdrawal_fee_usdt: systemSettings.withdrawalFeeUsdt,
            referral_commission_rate: systemSettings.systemFeePercentage / 100,
            daily_earning_rate: systemSettings.dailyEarningRate / 100,
            max_earning_days: systemSettings.maxEarningDays,
            earning_cap_percentage: systemSettings.earningCapPercentage / 100,
            registration_enabled: systemSettings.registrationEnabled,
            withdrawal_enabled: systemSettings.withdrawalEnabled,
            maximum_withdrawal: systemSettings.maximumWithdrawal,
            password_min_length: systemSettings.passwordMinLength
          };
          response = await apiService.updateAdminSystemSettings(systemData);
          break;
          
        case 'security':
          // Map frontend state to backend format
          const securityData = {
            require_2fa: securitySettings.twoFactorRequired,
            session_timeout: securitySettings.sessionTimeout * 3600, // Convert hours to seconds
            max_login_attempts: securitySettings.maxLoginAttempts
          };
          response = await apiService.updateAdminSecuritySettings(securityData);
          break;
          
        case 'notifications':
          // Map frontend state to backend format
          const notificationData = {
            email_notifications: notificationSettings.emailNotifications,
            telegram_bot_enabled: notificationSettings.adminAlerts,
            push_notifications: notificationSettings.systemAlerts,
            sms_notifications: notificationSettings.userRegistrationAlerts
          };
          response = await apiService.updateAdminNotificationSettings(notificationData);
          break;
      }
      
      if (response?.success) {
        toast.success('Configuración guardada correctamente');
        // Refresh settings to get updated values
        await fetchSettings();
      } else {
        toast.error('Error al guardar la configuración');
      }
    } catch (error: any) {
      console.error('Error saving settings:', error);
      toast.error(error.response?.data?.error || 'Error al guardar la configuración');
    } finally {
      setSaving(false);
    }
  };

  const togglePassword = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'system', label: 'Sistema', icon: Server },
    { id: 'security', label: 'Seguridad', icon: Shield },
    { id: 'notifications', label: 'Notificaciones', icon: Bell },
    { id: 'password', label: 'Contraseña', icon: Lock }
  ];

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-800 flex items-center gap-3">
              <Settings className="h-8 w-8 text-blue-600" />
              Configuración del Sistema
            </h1>
            <p className="text-slate-600 mt-2">Administra la configuración global de la plataforma</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg">
          <div className="border-b border-slate-200">
            <nav className="flex flex-wrap sm:space-x-8 px-4 sm:px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`py-3 sm:py-4 px-2 sm:px-1 border-b-2 font-medium text-xs sm:text-sm flex items-center gap-1 sm:gap-2 transition-colors flex-1 sm:flex-none justify-center sm:justify-start ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {tab.label}
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {/* System Settings Tab */}
            {activeTab === 'system' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Maintenance Mode */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Server className="h-5 w-5 text-blue-600" />
                      Estado del Sistema
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Modo Mantenimiento</label>
                          <p className="text-xs text-slate-500">Deshabilita el acceso de usuarios</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={systemSettings.maintenanceMode}
                            onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Registro de Usuarios</label>
                          <p className="text-xs text-slate-500">Permite nuevos registros</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={systemSettings.registrationEnabled}
                            onChange={(e) => setSystemSettings(prev => ({ ...prev, registrationEnabled: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-slate-700">Retiros Habilitados</label>
                          <p className="text-xs text-slate-500">Permite solicitudes de retiro</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={systemSettings.withdrawalEnabled}
                            onChange={(e) => setSystemSettings(prev => ({ ...prev, withdrawalEnabled: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>

                  {/* Financial Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <DollarSign className="h-5 w-5 text-blue-600" />
                      Configuración Financiera
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Retiro Mínimo (USDT)</label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={systemSettings.minimumWithdrawal}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, minimumWithdrawal: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Retiro Máximo (USDT)</label>
                        <input
                          type="number"
                          min="1"
                          step="0.01"
                          value={systemSettings.maximumWithdrawal}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, maximumWithdrawal: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Fee de Retiro (USDT)</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={systemSettings.withdrawalFeeUsdt}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, withdrawalFeeUsdt: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500">Fee fijo en USDT aplicado a cada retiro (gas agent)</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Comisión del Sistema (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={systemSettings.systemFeePercentage}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, systemFeePercentage: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Tasa Diaria de Procesamiento (%)</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          step="0.1"
                          value={systemSettings.dailyEarningRate}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, dailyEarningRate: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500">Porcentaje diario aplicado a las herramientas activas (actualmente 10%)</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Días Máximos de Procesamiento</label>
                        <input
                          type="number"
                          min="1"
                          max="365"
                          step="1"
                          value={systemSettings.maxEarningDays}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, maxEarningDays: parseInt(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500">Número máximo de días que una herramienta puede procesar datos (actualmente 20 días)</p>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Tope de Rendimiento (%)</label>
                        <input
                          type="number"
                          min="100"
                          max="1000"
                          step="10"
                          value={systemSettings.earningCapPercentage}
                          onChange={(e) => setSystemSettings(prev => ({ ...prev, earningCapPercentage: parseFloat(e.target.value) || 0 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                        <p className="text-xs text-slate-500">Porcentaje máximo de rendimiento respecto a la inversión inicial (actualmente 200%)</p>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveSettings('system')}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar Configuración
                  </button>
                </div>
              </div>
            )}

            {/* Security Settings Tab */}
            {activeTab === 'security' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                      <Shield className="h-5 w-5 text-blue-600" />
                      Políticas de Seguridad
                    </h3>
                    
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                        <div>
                          <label className="text-sm font-medium text-slate-700">2FA Obligatorio</label>
                          <p className="text-xs text-slate-500">Requiere autenticación de dos factores</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings.twoFactorRequired}
                            onChange={(e) => setSecuritySettings(prev => ({ ...prev, twoFactorRequired: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Tiempo de Sesión (horas)</label>
                        <input
                          type="number"
                          min="1"
                          max="168"
                          value={securitySettings.sessionTimeout}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, sessionTimeout: parseInt(e.target.value) || 24 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Máximo Intentos de Login</label>
                        <input
                          type="number"
                          min="3"
                          max="10"
                          value={securitySettings.maxLoginAttempts}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, maxLoginAttempts: parseInt(e.target.value) || 5 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <label className="text-sm font-medium text-slate-700">Longitud Mínima de Contraseña</label>
                        <input
                          type="number"
                          min="6"
                          max="20"
                          value={securitySettings.passwordMinLength}
                          onChange={(e) => setSecuritySettings(prev => ({ ...prev, passwordMinLength: parseInt(e.target.value) || 8 }))}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveSettings('security')}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar Configuración
                  </button>
                </div>
              </div>
            )}

            {/* Notifications Settings Tab */}
            {activeTab === 'notifications' && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
                    <Bell className="h-5 w-5 text-blue-600" />
                    Configuración de Notificaciones
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Notificaciones por Email</label>
                        <p className="text-xs text-slate-500">Enviar notificaciones por correo</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.emailNotifications}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, emailNotifications: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Alertas de Admin</label>
                        <p className="text-xs text-slate-500">Notificaciones administrativas</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.adminAlerts}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, adminAlerts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Alertas del Sistema</label>
                        <p className="text-xs text-slate-500">Errores y eventos críticos</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.systemAlerts}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, systemAlerts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Alertas de Retiros</label>
                        <p className="text-xs text-slate-500">Nuevas solicitudes de retiro</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.withdrawalAlerts}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, withdrawalAlerts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Nuevos Registros</label>
                        <p className="text-xs text-slate-500">Notificar nuevos usuarios</p>
                      </div>
                      <label className="relative inline-flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={notificationSettings.userRegistrationAlerts}
                          onChange={(e) => setNotificationSettings(prev => ({ ...prev, userRegistrationAlerts: e.target.checked }))}
                          className="sr-only peer"
                        />
                        <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                      </label>
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <button
                    onClick={() => handleSaveSettings('notifications')}
                    disabled={saving}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {saving ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Save className="h-4 w-4" />
                    )}
                    Guardar Configuración
                  </button>
                </div>
              </div>
            )}

            {/* Password Change Tab */}
            {activeTab === 'password' && (
              <div className="space-y-6">
                <div className="max-w-md">
                  <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2 mb-4">
                    <Lock className="h-5 w-5 text-blue-600" />
                    Cambiar Contraseña
                  </h3>
                  
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Contraseña Actual</label>
                      <div className="relative">
                        <input
                          type={showPasswords.current ? 'text' : 'password'}
                          value={passwordData.currentPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, currentPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ingresa tu contraseña actual"
                        />
                        <button
                          type="button"
                          onClick={() => togglePassword('current')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.current ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Nueva Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPasswords.new ? 'text' : 'password'}
                          value={passwordData.newPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Ingresa tu nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => togglePassword('new')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.new ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-slate-700">Confirmar Nueva Contraseña</label>
                      <div className="relative">
                        <input
                          type={showPasswords.confirm ? 'text' : 'password'}
                          value={passwordData.confirmPassword}
                          onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                          className="w-full px-3 py-2 pr-10 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Confirma tu nueva contraseña"
                        />
                        <button
                          type="button"
                          onClick={() => togglePassword('confirm')}
                          className="absolute inset-y-0 right-0 pr-3 flex items-center"
                        >
                          {showPasswords.confirm ? (
                            <EyeOff className="h-4 w-4 text-slate-400" />
                          ) : (
                            <Eye className="h-4 w-4 text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                    
                    {passwordData.newPassword && passwordData.newPassword.length < 8 && (
                      <div className="flex items-center gap-2 text-blue-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        La contraseña debe tener al menos 8 caracteres
                      </div>
                    )}
                    
                    {passwordData.newPassword && passwordData.confirmPassword && passwordData.newPassword !== passwordData.confirmPassword && (
                      <div className="flex items-center gap-2 text-red-600 text-sm">
                        <AlertTriangle className="h-4 w-4" />
                        Las contraseñas no coinciden
                      </div>
                    )}
                    
                    <button
                      onClick={handlePasswordChange}
                      disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword || passwordData.newPassword !== passwordData.confirmPassword || passwordData.newPassword.length < 8}
                      className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {saving ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      Cambiar Contraseña
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminSettingsPage;