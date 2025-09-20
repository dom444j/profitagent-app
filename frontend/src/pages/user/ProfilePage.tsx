import React, { useState, useEffect } from 'react';
import Layout from '../../components/layout/Layout';
import { User, Mail, Phone, Wallet, Copy, Check, Edit3, Save, X, Lock } from 'lucide-react';
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
  withdrawal_wallet_address?: string;
  withdrawal_wallet_verified?: boolean;
  withdrawal_type?: 'automatic' | 'manual';
  telegram_user_id?: string;
  telegram_username?: string;
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
  const [telegramUsername, setTelegramUsername] = useState('');
  const [linkingMethod, setLinkingMethod] = useState<'id' | 'username'>('id');
  const [linkingTelegram, setLinkingTelegram] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    usdt_bep20_address: '',
    withdrawal_wallet_address: '',
    withdrawal_type: 'manual' as 'automatic' | 'manual'
  });
  
  // Withdrawal wallet verification state
  const [showWithdrawalWalletModal, setShowWithdrawalWalletModal] = useState(false);
  const [withdrawalWalletOtp, setWithdrawalWalletOtp] = useState('');
  const [verifyingWithdrawalWallet, setVerifyingWithdrawalWallet] = useState(false);
  
  // Password change state
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [changingPassword, setChangingPassword] = useState(false);

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
        usdt_bep20_address: response.data.usdt_bep20_address || '',
        withdrawal_wallet_address: response.data.withdrawal_wallet_address || '',
        withdrawal_type: response.data.withdrawal_type || 'manual'
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
      usdt_bep20_address: profile?.usdt_bep20_address || '',
      withdrawal_wallet_address: profile?.withdrawal_wallet_address || '',
      withdrawal_type: profile?.withdrawal_type || 'manual'
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
    const isUsingId = linkingMethod === 'id';
    let value = isUsingId ? telegramUserId.trim() : telegramUsername.trim();
    
    if (!value) {
      toast.error(`Por favor ingresa tu ${isUsingId ? 'ID' : 'username'} de Telegram`);
      return;
    }

    // Convert username to lowercase to avoid conflicts
    if (!isUsingId) {
      value = value.toLowerCase();
    }

    try {
      setLinkingTelegram(true);
      
      if (isUsingId) {
        await api.linkTelegram(value, undefined);
        toast.success('Telegram vinculado exitosamente. Recibirás notificaciones y códigos OTP.');
      } else {
        await api.linkTelegram(undefined, value);
        toast('Telegram vinculado con username (convertido a minúsculas). Para recibir notificaciones, necesitas vincular tu ID numérico desde @userinfobot.', {
          icon: '⚠️',
          style: {
            background: '#fef3c7',
            color: '#92400e',
            border: '1px solid #fbbf24'
          }
        });
      }
      
      setShowTelegramModal(false);
      setTelegramUserId('');
      setTelegramUsername('');
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
    setTelegramUsername('');
    setLinkingMethod('id');
  };

  const handleWithdrawalWalletVerification = async () => {
    if (!formData.withdrawal_wallet_address) {
      toast.error('Por favor ingresa una dirección de wallet válida');
      return;
    }
    
    try {
      setVerifyingWithdrawalWallet(true);
      await api.sendWithdrawalWalletOtp(formData.withdrawal_wallet_address);
      setShowWithdrawalWalletModal(true);
      toast.success('Código OTP enviado a tu Telegram');
    } catch (error: any) {
      console.error('Error sending withdrawal wallet OTP:', error);
      toast.error(error.response?.data?.message || 'Error al enviar código OTP');
    } finally {
      setVerifyingWithdrawalWallet(false);
    }
  };

  const confirmWithdrawalWalletOtp = async () => {
    if (!withdrawalWalletOtp || withdrawalWalletOtp.length !== 6) {
      toast.error('Por favor ingresa un código OTP válido de 6 dígitos');
      return;
    }
    
    try {
      setVerifyingWithdrawalWallet(true);
      await api.verifyWithdrawalWalletOtp({
        withdrawal_wallet_address: formData.withdrawal_wallet_address,
        otp_code: withdrawalWalletOtp
      });
      
      await fetchProfile();
      setShowWithdrawalWalletModal(false);
      setWithdrawalWalletOtp('');
      toast.success('Wallet de retiro verificada exitosamente');
    } catch (error: any) {
      console.error('Error verifying withdrawal wallet OTP:', error);
      toast.error(error.response?.data?.message || 'Código OTP inválido');
    } finally {
      setVerifyingWithdrawalWallet(false);
    }
  };

  const closeWithdrawalWalletModal = () => {
    setShowWithdrawalWalletModal(false);
    setWithdrawalWalletOtp('');
  };

  const handleChangePassword = () => {
    setShowPasswordModal(true);
  };

  const closePasswordModal = () => {
    setShowPasswordModal(false);
    setPasswordData({
      current_password: '',
      new_password: '',
      confirm_password: ''
    });
  };

  const handlePasswordSubmit = async () => {
    if (!passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password) {
      toast.error('Por favor completa todos los campos');
      return;
    }

    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('Las contraseñas nuevas no coinciden');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('La nueva contraseña debe tener al menos 6 caracteres');
      return;
    }

    try {
      setChangingPassword(true);
      await api.changeUserPassword(passwordData);
      toast.success('Contraseña cambiada exitosamente');
      closePasswordModal();
    } catch (error: any) {
      console.error('Error changing password:', error);
      toast.error(error.response?.data?.message || 'Error al cambiar la contraseña');
    } finally {
      setChangingPassword(false);
    }
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
                  <>
                    <button
                      onClick={handleChangePassword}
                      className="inline-flex items-center px-3 sm:px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-xs sm:text-sm lg:text-base"
                    >
                      <Lock className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Cambiar Contraseña</span>
                      <span className="sm:hidden">Contraseña</span>
                    </button>
                    <button
                      onClick={() => setEditing(true)}
                      className="inline-flex items-center px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm lg:text-base"
                    >
                      <Edit3 className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">Editar Perfil</span>
                      <span className="sm:hidden">Editar</span>
                    </button>
                  </>
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 sm:p-6">
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

              {/* Wallet de Retiro */}
              <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4 flex items-center">
                  <Wallet className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-green-600" />
                  <span className="truncate">Wallet de Retiro</span>
                  {profile.withdrawal_wallet_verified && (
                    <Check className="w-4 h-4 sm:w-5 sm:h-5 ml-2 text-green-600" />
                  )}
                </h3>
                
                {editing ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Dirección de Wallet
                      </label>
                      <input
                        type="text"
                        value={formData.withdrawal_wallet_address}
                        onChange={(e) => setFormData({ ...formData, withdrawal_wallet_address: e.target.value })}
                        className="w-full px-3 sm:px-4 py-2 sm:py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                        placeholder="0x..."
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Dirección de wallet para recibir retiros (BEP20). Debe ser verificada con OTP.
                      </p>
                    </div>
                    
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                        Tipo de Retiro
                      </label>
                      <div className="space-y-2">
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="withdrawal_type"
                            value="manual"
                            checked={formData.withdrawal_type === 'manual'}
                            onChange={(e) => setFormData({ ...formData, withdrawal_type: e.target.value as 'automatic' | 'manual' })}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs sm:text-sm text-gray-700">
                            <strong>Manual:</strong> Solicitas retiros cuando quieras
                          </span>
                        </label>
                        <label className="flex items-center">
                          <input
                            type="radio"
                            name="withdrawal_type"
                            value="automatic"
                            checked={formData.withdrawal_type === 'automatic'}
                            onChange={(e) => setFormData({ ...formData, withdrawal_type: e.target.value as 'automatic' | 'manual' })}
                            className="mr-2 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="text-xs sm:text-sm text-gray-700">
                            <strong>Automático:</strong> Retiros se procesan automáticamente cada día
                          </span>
                        </label>
                      </div>
                    </div>
                    
                    {formData.withdrawal_wallet_address && !profile.withdrawal_wallet_verified && (
                      <button
                        onClick={handleWithdrawalWalletVerification}
                        disabled={verifyingWithdrawalWallet}
                        className="w-full px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
                      >
                        {verifyingWithdrawalWallet ? 'Enviando OTP...' : 'Verificar Wallet con OTP'}
                      </button>
                    )}
                  </div>
                ) : (
                  <div>
                    {profile.withdrawal_wallet_address ? (
                      <div className="space-y-2">
                        <div className="p-2 sm:p-3 bg-gray-50 rounded-lg">
                          <p className="text-xs sm:text-sm font-mono text-gray-900 break-all">
                            {profile.withdrawal_wallet_address}
                          </p>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Estado:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            profile.withdrawal_wallet_verified 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-yellow-100 text-yellow-800'
                          }`}>
                            {profile.withdrawal_wallet_verified ? 'Verificada' : 'Pendiente verificación'}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-600">Tipo de retiro:</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            profile.withdrawal_type === 'automatic' 
                              ? 'bg-blue-100 text-blue-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {profile.withdrawal_type === 'automatic' ? 'Automático' : 'Manual'}
                          </span>
                        </div>
                        {!profile.withdrawal_wallet_verified && (
                          <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                            <p className="text-xs text-yellow-700">
                              ⚠️ Debes verificar tu wallet con OTP para poder realizar retiros
                            </p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <p className="text-gray-500 text-xs sm:text-sm">No configurada</p>
                        <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                          <p className="text-xs text-red-700">
                            🚨 OBLIGATORIO: Debes configurar y verificar tu wallet de retiro para poder retirar fondos
                          </p>
                        </div>
                      </div>
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
                  {profile.telegram_username && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs sm:text-sm text-gray-600">Username:</span>
                      <span className="text-xs sm:text-sm font-mono text-gray-900 break-all">
                        @{profile.telegram_username}
                      </span>
                    </div>
                  )}
                  
                  {/* Mensaje especial para estado pending */}
                  {profile.telegram_link_status === 'pending' && (
                    <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200 mt-3">
                      <p className="text-xs text-yellow-700 font-medium mb-2">⚠️ Acción requerida</p>
                      <p className="text-xs text-yellow-600 mb-2">
                        Para completar la vinculación y recibir notificaciones:
                      </p>
                      <ol className="text-xs text-yellow-600 space-y-1 ml-4">
                        <li>1. Busca <strong>@profitagent_otp_bot</strong> en Telegram</li>
                        <li>2. Envía cualquier mensaje (ej: "Hola")</li>
                  <li>3. Regresa aquí y haz clic en "Completar Vinculación"</li>
                      </ol>
                    </div>
                  )}
                  
                  {profile.telegram_link_status !== 'linked' ? (
                    <button 
                      onClick={handleLinkTelegram}
                      className="w-full mt-3 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-xs sm:text-sm flex items-center justify-center"
                    >
                      <span className="hidden sm:inline">
                        {profile.telegram_link_status === 'pending' ? 'Completar Vinculación' : 'Vincular Telegram'}
                      </span>
                      <span className="sm:hidden">
                        {profile.telegram_link_status === 'pending' ? 'Completar' : 'Vincular'}
                      </span>
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
                Puedes vincular tu cuenta de Telegram usando tu ID numérico o tu @username.
              </p>
              
              {/* Selector de método */}
              <div className="flex space-x-2 mb-3 sm:mb-4">
                <button
                  onClick={() => setLinkingMethod('id')}
                  className={`flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                    linkingMethod === 'id'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  ID Numérico
                </button>
                <button
                  onClick={() => setLinkingMethod('username')}
                  className={`flex-1 px-3 py-2 text-xs sm:text-sm rounded-lg transition-colors ${
                    linkingMethod === 'username'
                      ? 'bg-blue-100 text-blue-700 border border-blue-300'
                      : 'bg-gray-100 text-gray-600 border border-gray-300'
                  }`}
                >
                  Username
                </button>
              </div>

              {linkingMethod === 'id' ? (
                <>
                  <div className="bg-green-50 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4">
                    <p className="text-xs text-green-700 font-medium mb-2">✅ ID Numérico (Recomendado)</p>
                    <ul className="text-xs text-green-600 space-y-1">
                      <li>• Permite recibir notificaciones y códigos OTP</li>
                        <li>• Método más confiable para comunicación</li>
                        <li>• Funciona con todos los bots de Telegram</li>
                    </ul>
                  </div>
                  
                  <div className="bg-blue-50 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4">
                    <p className="text-xs text-blue-700 font-medium mb-2">📱 ¿Cómo obtener tu ID de Telegram?</p>
                    <ol className="text-xs text-blue-600 space-y-1">
                      <li>1. Abre Telegram y busca el bot @userinfobot</li>
                      <li>2. Envía /start al bot</li>
                        <li>3. El bot te enviará tu ID de usuario (número)</li>
                        <li>4. Copia ese número aquí</li>
                    </ol>
                  </div>
                  
                  <div className="bg-red-50 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 border border-red-200">
                    <p className="text-xs text-red-700 font-medium mb-2">🚨 PASO OBLIGATORIO ANTES DE VINCULAR</p>
                    <ol className="text-xs text-red-600 space-y-1">
                      <li>1. <strong>Busca y escribe a @profitagent_otp_bot en Telegram</strong></li>
                      <li>2. <strong>Envía cualquier mensaje (ej: "Hola")</strong></li>
                        <li>3. <strong>Solo después de escribir al bot, vincula tu cuenta aquí</strong></li>
                        <li>4. Si no escribes al bot primero, NO recibirás notificaciones</li>
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
                </>
              ) : (
                <>
                  <div className="bg-yellow-50 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4">
                    <p className="text-xs text-yellow-700 font-medium mb-2">⚠️ Username de Telegram (Funcionalidad Limitada)</p>
                    <ul className="text-xs text-yellow-600 space-y-1">
                      <li>• Podrás recibir notificaciones y códigos OTP con limitaciones</li>
                        <li>• Requiere que hayas iniciado conversación con los bots</li>
                        <li>• Menos confiable que el ID numérico</li>
                        <li>• <strong>El username se convertirá automáticamente a minúsculas</strong></li>
                        <li>• Se recomienda usar el ID numérico para mejor funcionalidad</li>
                    </ul>
                  </div>
                  
                  <div className="bg-red-50 p-2 sm:p-3 rounded-lg mb-3 sm:mb-4 border border-red-200">
                     <p className="text-xs text-red-700 font-medium mb-2">🚨 PASO OBLIGATORIO ANTES DE VINCULAR</p>
                     <ol className="text-xs text-red-600 space-y-1">
                       <li>1. <strong>Busca y escribe a @profitagent_otp_bot en Telegram</strong></li>
                       <li>2. <strong>Envía cualquier mensaje (ej: "Hola")</strong></li>
                        <li>3. <strong>Solo después de escribir al bot, vincula tu cuenta aquí</strong></li>
                        <li>4. Si no escribes al bot primero, NO recibirás notificaciones</li>
                     </ol>
                   </div>
                  
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-2">
                    Username de Telegram
                  </label>
                  <input
                    type="text"
                    value={telegramUsername}
                    onChange={(e) => setTelegramUsername(e.target.value)}
                    placeholder="Ej: miusuario (sin @)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-xs sm:text-sm"
                  />
                </>
              )}
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
                disabled={linkingTelegram || (linkingMethod === 'id' ? !telegramUserId.trim() : !telegramUsername.trim())}
                className="w-full sm:flex-1 px-3 sm:px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs sm:text-sm"
              >
                {linkingTelegram ? 'Vinculando...' : 'Vincular'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Verificación de Wallet de Retiro */}
      {showWithdrawalWalletModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Verificar Wallet de Retiro</h3>
              <button
                onClick={closeWithdrawalWalletModal}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-700 font-medium mb-2">📱 Código OTP Enviado</p>
                <p className="text-xs text-blue-600">
                  Se ha enviado un código de 6 dígitos a tu Telegram vinculado. 
                  Ingresa el código para verificar tu wallet de retiro.
                </p>
              </div>
              
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-xs text-gray-600 font-medium mb-1">Wallet a verificar:</p>
                <p className="text-xs font-mono text-gray-900 break-all">
                  {formData.withdrawal_wallet_address}
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código OTP (6 dígitos)
                </label>
                <input
                  type="text"
                  value={withdrawalWalletOtp}
                  onChange={(e) => setWithdrawalWalletOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="123456"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center text-lg font-mono"
                  maxLength={6}
                />
              </div>
              
              <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
                <p className="text-xs text-yellow-700">
                  ⚠️ Una vez verificada, esta wallet será la única autorizada para recibir tus retiros.
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={closeWithdrawalWalletModal}
                className="w-full sm:flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={confirmWithdrawalWalletOtp}
                disabled={verifyingWithdrawalWallet || withdrawalWalletOtp.length !== 6}
                className="w-full sm:flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {verifyingWithdrawalWallet ? 'Verificando...' : 'Verificar Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Modal de Cambio de Contraseña */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Lock className="w-5 h-5 mr-2 text-purple-600" />
                Cambiar Contraseña
              </h3>
              <button
                onClick={closePasswordModal}
                className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                <p className="text-xs text-purple-700 font-medium mb-1">🔒 Seguridad de Contraseña</p>
                <ul className="text-xs text-purple-600 space-y-1">
                  <li>• Mínimo 6 caracteres</li>
                  <li>• Se recomienda usar letras, números y símbolos</li>
                  <li>• No compartas tu contraseña con nadie</li>
                </ul>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña Actual
                </label>
                <input
                  type="password"
                  value={passwordData.current_password}
                  onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                  placeholder="Ingresa tu contraseña actual"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.new_password}
                  onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                  placeholder="Ingresa tu nueva contraseña"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirmar Nueva Contraseña
                </label>
                <input
                  type="password"
                  value={passwordData.confirm_password}
                  onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                  placeholder="Confirma tu nueva contraseña"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
                />
              </div>
              
              {passwordData.new_password && passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                <div className="bg-red-50 p-2 rounded-lg border border-red-200">
                  <p className="text-xs text-red-700">❌ Las contraseñas no coinciden</p>
                </div>
              )}
              
              {passwordData.new_password && passwordData.new_password.length < 6 && (
                <div className="bg-yellow-50 p-2 rounded-lg border border-yellow-200">
                  <p className="text-xs text-yellow-700">⚠️ La contraseña debe tener al menos 6 caracteres</p>
                </div>
              )}
            </div>
            
            <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 mt-6">
              <button
                onClick={closePasswordModal}
                className="w-full sm:flex-1 px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordSubmit}
                disabled={changingPassword || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password || passwordData.new_password !== passwordData.confirm_password || passwordData.new_password.length < 6}
                className="w-full sm:flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              >
                {changingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default ProfilePage;
