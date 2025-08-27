import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { 
  Shield, 
  Bell, 
  Eye, 
  EyeOff, 
  Lock, 
  AlertTriangle,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';


interface SecuritySettings {
  twoFactorEnabled: boolean;
  loginNotifications: boolean;
  withdrawalNotifications: boolean;
}

interface NotificationSettings {
  emailNotifications: boolean;
  telegramNotifications: boolean;
  earningsNotifications: boolean;
  orderNotifications: boolean;
}

const SettingsPage: React.FC = () => {

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'security' | 'notifications' | 'privacy'>('security');
  
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
  const [securitySettings, setSecuritySettings] = useState<SecuritySettings>({
    twoFactorEnabled: false,
    loginNotifications: true,
    withdrawalNotifications: true
  });
  
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    emailNotifications: true,
    telegramNotifications: false,
    earningsNotifications: true,
    orderNotifications: true
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      // En el futuro, estos datos vendrían de la API
      // const response = await api.get('/me/settings');
      // setSecuritySettings(response.data.security);
      // setNotificationSettings(response.data.notifications);
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

    try {
      setSaving(true);
      // await api.put('/me/password', {
      //   currentPassword: passwordData.currentPassword,
      //   newPassword: passwordData.newPassword
      // });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      toast.success('Contraseña actualizada correctamente');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setSaving(false);
    }
  };

  const handleSecuritySettingsChange = async (key: keyof SecuritySettings, value: boolean) => {
    try {
      const newSettings = { ...securitySettings, [key]: value };
      setSecuritySettings(newSettings);
      
      // await api.put('/me/settings/security', newSettings);
      toast.success('Configuración de seguridad actualizada');
    } catch (error) {
      toast.error('Error al actualizar la configuración');
      // Revert the change
      setSecuritySettings(securitySettings);
    }
  };

  const handleNotificationSettingsChange = async (key: keyof NotificationSettings, value: boolean) => {
    try {
      const newSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(newSettings);
      
      // await api.put('/me/settings/notifications', newSettings);
      toast.success('Configuración de notificaciones actualizada');
    } catch (error) {
      toast.error('Error al actualizar la configuración');
      // Revert the change
      setNotificationSettings(notificationSettings);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const tabs = [
    { id: 'security' as const, label: 'Seguridad', icon: Shield },
    { id: 'notifications' as const, label: 'Notificaciones', icon: Bell },
    { id: 'privacy' as const, label: 'Privacidad', icon: Eye }
  ];

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="animate-pulse">
              <div className="bg-white rounded-xl shadow-sm p-8">
                <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
                <div className="space-y-4">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                  <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-6 sm:mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Configuración</h1>
            <p className="text-gray-600 mt-1 sm:mt-2 text-sm sm:text-base">Gestiona tu seguridad, notificaciones y privacidad</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-8">
            {/* Sidebar - Mobile tabs */}
            <div className="lg:col-span-1">
              <div className="bg-white rounded-xl shadow-sm p-3 sm:p-4">
                <nav className="flex lg:flex-col space-x-2 lg:space-x-0 lg:space-y-2 overflow-x-auto lg:overflow-x-visible">
                  {tabs.map((tab) => {
                    const Icon = tab.icon;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center px-3 sm:px-4 py-2 sm:py-3 text-left rounded-lg transition-colors whitespace-nowrap lg:w-full ${
                          activeTab === tab.id
                            ? 'bg-blue-50 text-blue-700 lg:border-l-4 lg:border-blue-600'
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <Icon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 sm:mr-3" />
                        <span className="font-medium text-sm sm:text-base">{tab.label}</span>
                      </button>
                    );
                  })}
                </nav>
              </div>
            </div>

            {/* Content */}
            <div className="lg:col-span-3">
              <div className="bg-white rounded-xl shadow-sm p-8">
                {activeTab === 'security' && (
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
                      <Shield className="w-5 h-5 mr-2 text-blue-600" />
                      Configuración de Seguridad
                    </h2>

                    {/* Change Password */}
                    <div className="mb-8 p-6 border border-gray-200 rounded-lg">
                      <h3 className="text-lg font-medium text-gray-900 mb-4">Cambiar Contraseña</h3>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Contraseña Actual
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.current ? 'text' : 'password'}
                              value={passwordData.currentPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                              className="w-full px-4 py-3 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Ingresa tu contraseña actual"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('current')}
                              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.current ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Nueva Contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.new ? 'text' : 'password'}
                              value={passwordData.newPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                              className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                              placeholder="Ingresa tu nueva contraseña"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('new')}
                              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.new ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Confirmar Nueva Contraseña
                          </label>
                          <div className="relative">
                            <input
                              type={showPasswords.confirm ? 'text' : 'password'}
                              value={passwordData.confirmPassword}
                              onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                              className="w-full px-3 sm:px-4 py-2 sm:py-3 pr-10 sm:pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                              placeholder="Confirma tu nueva contraseña"
                            />
                            <button
                              type="button"
                              onClick={() => togglePasswordVisibility('confirm')}
                              className="absolute right-2 sm:right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                            >
                              {showPasswords.confirm ? <EyeOff className="w-4 h-4 sm:w-5 sm:h-5" /> : <Eye className="w-4 h-4 sm:w-5 sm:h-5" />}
                            </button>
                          </div>
                        </div>

                        <button
                          onClick={handlePasswordChange}
                          disabled={saving || !passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
                          className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base"
                        >
                          <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                          <span className="hidden sm:inline">{saving ? 'Actualizando...' : 'Cambiar Contraseña'}</span>
                          <span className="sm:hidden">{saving ? 'Actualizando...' : 'Cambiar'}</span>
                        </button>
                      </div>
                    </div>

                    {/* Security Options */}
                    <div className="space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Autenticación de Dos Factores</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Añade una capa extra de seguridad a tu cuenta</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings.twoFactorEnabled}
                            onChange={(e) => handleSecuritySettingsChange('twoFactorEnabled', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Notificaciones de Inicio de Sesión</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Recibe alertas cuando alguien acceda a tu cuenta</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings.loginNotifications}
                            onChange={(e) => handleSecuritySettingsChange('loginNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Notificaciones de Retiros</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Recibe alertas para todas las transacciones de retiro</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={securitySettings.withdrawalNotifications}
                            onChange={(e) => handleSecuritySettingsChange('withdrawalNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'notifications' && (
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                      <span className="truncate">Configuración de Notificaciones</span>
                    </h2>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Notificaciones por Email</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Recibe actualizaciones importantes por correo electrónico</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={notificationSettings.emailNotifications}
                            onChange={(e) => handleNotificationSettingsChange('emailNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Notificaciones por Telegram</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Recibe alertas instantáneas en Telegram</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={notificationSettings.telegramNotifications}
                            onChange={(e) => handleNotificationSettingsChange('telegramNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Notificaciones de Actividad</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Recibe alertas sobre el uso de herramientas tecnológicas</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={notificationSettings.earningsNotifications}
                            onChange={(e) => handleNotificationSettingsChange('earningsNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>

                      <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:p-4 border border-gray-200 rounded-lg space-y-2 sm:space-y-0">
                        <div className="min-w-0 flex-1">
                          <h4 className="font-medium text-gray-900 text-sm sm:text-base">Notificaciones de Órdenes</h4>
                          <p className="text-xs sm:text-sm text-gray-500">Recibe actualizaciones sobre el estado de tus órdenes</p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer flex-shrink-0">
                          <input
                            type="checkbox"
                            checked={notificationSettings.orderNotifications}
                            onChange={(e) => handleNotificationSettingsChange('orderNotifications', e.target.checked)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                        </label>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'privacy' && (
                  <div>
                    <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                      <Eye className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                      <span className="truncate">Configuración de Privacidad</span>
                    </h2>

                    <div className="space-y-4 sm:space-y-6">
                      <div className="p-4 sm:p-6 border border-yellow-200 bg-yellow-50 rounded-lg">
                        <div className="flex items-start">
                          <Info className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 mt-0.5 mr-2 sm:mr-3 flex-shrink-0" />
                          <div className="min-w-0">
                            <h4 className="font-medium text-yellow-800 text-sm sm:text-base">Información de Privacidad</h4>
                            <p className="text-xs sm:text-sm text-yellow-700 mt-1">
                              Tu privacidad es importante para nosotros. Todos los datos personales están protegidos 
                              y solo se utilizan para mejorar tu experiencia en la plataforma.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="p-6 border border-red-200 bg-red-50 rounded-lg">
                        <div className="flex items-start">
                          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 mr-3" />
                          <div>
                            <h4 className="font-medium text-red-800">Eliminar Cuenta</h4>
                            <p className="text-sm text-red-700 mt-1 mb-4">
                              Esta acción eliminará permanentemente tu cuenta y todos los datos asociados. 
                              Esta acción no se puede deshacer.
                            </p>
                            <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                              Solicitar Eliminación de Cuenta
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default SettingsPage;