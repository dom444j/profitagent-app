import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { User, Mail, Phone, Wallet, Copy, Check, Edit3, Save, X } from 'lucide-react';
import toast from 'react-hot-toast';
import { apiService as api } from '../../services/api';

interface UserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  ref_code: string;
  phone?: string;
  usdt_bep20_address?: string;
  telegram_user_id?: string;
  telegram_link_status?: 'pending' | 'linked' | 'failed';
  role: string;
  status: string;
}

const ProfilePage: React.FC = () => {

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [copiedRef, setCopiedRef] = useState(false);
  const [showTelegramModal, setShowTelegramModal] = useState(false);
  const [telegramUserId, setTelegramUserId] = useState('');
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    usdt_bep20_address: ''
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await api.getUserProfile();
      setProfile(response.data);
      setFormData({
        first_name: response.data.first_name || '',
        last_name: response.data.last_name || '',
        phone: response.data.phone || '',
        usdt_bep20_address: response.data.usdt_bep20_address || ''
      });
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Error al cargar el perfil');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      await api.updateUserProfile(formData);
      await fetchProfile();
      setEditing(false);
      toast.success('Perfil actualizado correctamente');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Error al actualizar el perfil');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      first_name: profile?.first_name || '',
      last_name: profile?.last_name || '',
      phone: profile?.phone || '',
      usdt_bep20_address: profile?.usdt_bep20_address || ''
    });
    setEditing(false);
  };

  const copyRefCode = async () => {
    if (profile?.ref_code) {
      try {
        await navigator.clipboard.writeText(profile.ref_code);
        setCopiedRef(true);
        toast.success('Código de referencia copiado');
        setTimeout(() => setCopiedRef(false), 2000);
      } catch (error) {
        toast.error('Error al copiar el código');
      }
    }
  };

  const handleLinkTelegram = () => {
    setShowTelegramModal(true);
  };

  const handleTelegramSubmit = async () => {
    if (!telegramUserId.trim()) {
      toast.error('Por favor ingresa tu ID de Telegram');
      return;
    }

    try {
      setLinkingTelegram(true);
      await api.linkTelegram(telegramUserId.trim());
      toast.success('Telegram vinculado exitosamente');
      setShowTelegramModal(false);
      setTelegramUserId('');
      // Refresh profile to get updated status
      await fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al vincular Telegram');
    } finally {
      setLinkingTelegram(false);
    }
  };

  const handleUnlinkTelegram = async () => {
    try {
      await api.unlinkTelegram();
      toast.success('Telegram desvinculado exitosamente');
      await fetchProfile();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Error al desvincular Telegram');
    }
  };

  const closeTelegramModal = () => {
    setShowTelegramModal(false);
    setTelegramUserId('');
  };

  const getTelegramStatusColor = (status?: string) => {
    switch (status) {
      case 'linked': return 'text-green-600 bg-green-50';
      case 'pending': return 'text-yellow-600 bg-yellow-50';
      case 'failed': return 'text-red-600 bg-red-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getTelegramStatusText = (status?: string) => {
    switch (status) {
      case 'linked': return 'Vinculado';
      case 'pending': return 'Pendiente';
      case 'failed': return 'Error';
      default: return 'No vinculado';
    }
  };

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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

  if (!profile) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="bg-white rounded-xl shadow-sm p-8 text-center">
              <p className="text-gray-500">Error al cargar el perfil</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-4 sm:py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-4 sm:mb-6 lg:mb-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
              <div className="min-w-0 flex-1">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Mi Perfil</h1>
                <p className="text-gray-600 mt-1 text-xs sm:text-sm lg:text-base">Gestiona tu información personal y configuración de cuenta</p>
              </div>
              <div className="flex items-center space-x-2 flex-shrink-0">
                {!editing ? (
                  <button
                    onClick={() => setEditing(true)}
                    className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm lg:text-base"
                  >
                    <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Editar Perfil</span>
                    <span className="sm:hidden">Editar</span>
                  </button>
                ) : (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCancel}
                      className="inline-flex items-center px-2 sm:px-3 lg:px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-xs sm:text-sm lg:text-base"
                    >
                      <X className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Cancelar</span>
                      <span className="sm:hidden">✕</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={saving}
                      className="inline-flex items-center px-2 sm:px-3 lg:px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 text-xs sm:text-sm lg:text-base"
                    >
                      <Save className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{saving ? 'Guardando...' : 'Guardar'}</span>
                      <span className="sm:hidden">{saving ? '...' : '✓'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
            {/* Información Personal */}
            <div className="lg:col-span-2">
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 lg:p-8">
                <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-4 sm:mb-6 flex items-center">
                  <User className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-blue-600" />
                  Información Personal
                </h2>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Nombre
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.first_name}
                        onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Tu nombre"
                      />
                    ) : (
                      <p className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 rounded-lg text-gray-900 text-sm sm:text-base">
                        {profile.first_name || 'No especificado'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Apellido
                    </label>
                    {editing ? (
                      <input
                        type="text"
                        value={formData.last_name}
                        onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="Tu apellido"
                      />
                    ) : (
                      <p className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 rounded-lg text-gray-900 text-sm sm:text-base">
                        {profile.last_name || 'No especificado'}
                      </p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      <Mail className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Email
                    </label>
                    <p className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 rounded-lg text-gray-900 text-sm sm:text-base break-all">
                      {profile.email}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">El email no se puede modificar</p>
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      <Phone className="w-3 h-3 sm:w-4 sm:h-4 inline mr-1" />
                      Teléfono
                    </label>
                    {editing ? (
                      <input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base"
                        placeholder="+1234567890"
                      />
                    ) : (
                      <p className="px-3 sm:px-4 py-2 sm:py-3 bg-gray-50 rounded-lg text-gray-900 text-sm sm:text-base">
                        {profile.phone || 'No especificado'}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                      Estado
                    </label>
                    <span className={`inline-flex items-center px-2 sm:px-3 py-1 rounded-full text-xs sm:text-sm font-medium ${
                      profile.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {profile.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Panel Lateral */}
            <div className="space-y-4 sm:space-y-6">
              {/* Código de Referencia */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Código de Referencia</h3>
                <div className="flex items-center justify-between p-3 sm:p-4 bg-blue-50 rounded-lg">
                  <div className="min-w-0 flex-1">
                    <p className="text-xs sm:text-sm text-gray-600">Tu código</p>
                    <p className="text-lg sm:text-xl font-bold text-blue-600 truncate">{profile.ref_code}</p>
                  </div>
                  <button
                    onClick={copyRefCode}
                    className="p-2 text-blue-600 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0 ml-2"
                  >
                    {copiedRef ? <Check className="w-4 h-4 sm:w-5 sm:h-5" /> : <Copy className="w-4 h-4 sm:w-5 sm:h-5" />}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Comparte este código para referir nuevos usuarios
                </p>
              </div>

              {/* Wallet USDT */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-yellow-600" />
                  <span className="truncate">Wallet USDT BEP20</span>
                </h3>
                {editing ? (
                  <div>
                    <input
                      type="text"
                      value={formData.usdt_bep20_address}
                      onChange={(e) => setFormData({ ...formData, usdt_bep20_address: e.target.value })}
                      className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                      placeholder="0x..."
                    />
                    <p className="text-xs text-gray-500 mt-2">
                      Dirección de tu wallet USDT en la red BEP20 (Binance Smart Chain)
                    </p>
                  </div>
                ) : (
                  <div>
                    {profile.usdt_bep20_address ? (
                      <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs sm:text-sm font-mono text-gray-900 break-all">
                          {profile.usdt_bep20_address}
                        </p>
                      </div>
                    ) : (
                      <p className="text-gray-500 text-xs sm:text-sm">No configurada</p>
                    )}
                  </div>
                )}
              </div>

              {/* Estado de Telegram */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <span className="truncate">Telegram</span>
                </h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs sm:text-sm text-gray-600">Estado:</span>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      getTelegramStatusColor(profile.telegram_link_status)
                    }`}>
                      {getTelegramStatusText(profile.telegram_link_status)}
                    </span>
                  </div>
                  {profile.telegram_user_id && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">ID:</span>
                      <span className="text-xs sm:text-sm font-mono text-gray-900 break-all">
                        {profile.telegram_user_id}
                      </span>
                    </div>
                  )}
                  {profile.telegram_link_status !== 'linked' ? (
                    <button 
                      onClick={handleLinkTelegram}
                      className="w-full mt-3 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm flex items-center justify-center"
                    >
                      <span className="hidden sm:inline">Vincular Telegram</span>
                      <span className="sm:hidden">Vincular</span>
                    </button>
                  ) : (
                    <button 
                      onClick={handleUnlinkTelegram}
                      className="w-full mt-3 px-3 sm:px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-xs sm:text-sm flex items-center justify-center"
                    >
                      <span className="hidden sm:inline">Desvincular Telegram</span>
                      <span className="sm:hidden">Desvincular</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Modal para vincular Telegram */}
      {showTelegramModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-3 sm:mb-4">
              <h3 className="text-base sm:text-lg font-semibold text-gray-900">Vincular Telegram</h3>
              <button
                onClick={closeTelegramModal}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
            
            <div className="mb-3 sm:mb-4">
              <p className="text-xs sm:text-sm text-gray-600 mb-3 sm:mb-4">
                Para vincular tu cuenta de Telegram, necesitas tu ID de usuario de Telegram.
              </p>
              <div className="bg-blue-50 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4">
                <p className="text-xs text-blue-700 font-medium mb-2">📱 ¿Cómo obtener tu ID de Telegram?</p>
                <ol className="text-xs text-blue-600 space-y-1">
                  <li>1. Abre Telegram y busca el bot @userinfobot</li>
                  <li>2. Envía /start al bot</li>
                  <li>3. El bot te enviará tu ID de usuario</li>
                  <li>4. Copia ese número aquí</li>
                </ol>
              </div>
              
              <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                ID de Telegram
              </label>
              <input
                type="text"
                value={telegramUserId}
                onChange={(e) => setTelegramUserId(e.target.value)}
                placeholder="Ej: 123456789"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
              />
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3">
              <button
                onClick={closeTelegramModal}
                className="w-full sm:flex-1 px-3 sm:px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-xs sm:text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handleTelegramSubmit}
                disabled={linkingTelegram || !telegramUserId.trim()}
                className="w-full sm:flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                {linkingTelegram ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProfilePage;