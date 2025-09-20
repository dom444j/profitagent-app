import React, { useState, useEffect } from 'react';
import { MessageCircle, Bot, Send, Users, Settings, CheckCircle, RefreshCw, ExternalLink, Brain, BarChart3, Clock, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import AdminLayout from '../../components/layout/AdminLayout';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';

interface BotInfo {
  id: string;
  bot_username: string;
  bot_name: string;
  bot_type: string;
  status: string;
  webhook_url?: string;
  last_activity?: string;
}

interface TelegramStats {
  totalUsers: number;
  linkedUsers: number;
  activeUsers: number;
  linkageRate: string;
  activityRate: string;
}

interface BroadcastMessage {
  message: string;
  targetType: 'all' | 'linked' | 'active';
  targetValue?: string;
}

interface AISettings {
  enabled: boolean;
  autoResponse: boolean;
  responseDelay: number;
  maxTokens: number;
  temperature: number;
  systemPrompt: string;
}

interface AIStats {
  totalInteractions: number;
  responsesGenerated: number;
  averageResponseTime: number;
  successRate: string;
  last24Hours: {
    interactions: number;
    responses: number;
  };
}

const AdminTelegramPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TelegramStats | null>(null);
  const [activeTab, setActiveTab] = useState<'overview' | 'bots' | 'broadcast' | 'settings'>('overview');
  const [broadcastMessage, setBroadcastMessage] = useState<BroadcastMessage>({
    message: '',
    targetType: 'all'
  });
  const [testMessage, setTestMessage] = useState({ chatId: '', message: '' });
  const [sending, setSending] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [aiSettings, setAiSettings] = useState<AISettings>({
    enabled: true,
    autoResponse: true,
    responseDelay: 2,
    maxTokens: 500,
    temperature: 0.7,
    systemPrompt: 'Eres un asistente de soporte para ProfitAgent. Ayuda a los usuarios con sus consultas de manera amigable y profesional.'
  });
  const [aiStats, setAiStats] = useState<AIStats | null>(null);
  const [savingSettings, setSavingSettings] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [botsResponse, statsResponse, aiStatsResponse, aiSettingsResponse] = await Promise.all([
        fetch('/api/v1/telegram-communication/bot-info'),
        fetch('/api/v1/telegram-communication/stats'),
        fetch('/api/v1/telegram-admin/ai/stats'),
        fetch('/api/v1/telegram-admin/ai/settings')
      ]);

      if (botsResponse.ok) {
        const botsData = await botsResponse.json();
        // Bot data processed successfully
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      if (aiStatsResponse.ok) {
        const aiStatsData = await aiStatsResponse.json();
        setAiStats(aiStatsData.data);
      }

      if (aiSettingsResponse.ok) {
        const aiSettingsData = await aiSettingsResponse.json();
        setAiSettings(aiSettingsData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error al cargar datos de Telegram');
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
    toast.success('Datos actualizados');
  };

  const sendBroadcast = async () => {
    if (!broadcastMessage.message.trim()) {
      toast.error('El mensaje no puede estar vacío');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/v1/telegram/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(broadcastMessage),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Mensaje enviado a ${result.sent} usuarios`);
        setBroadcastMessage({ message: '', targetType: 'all' });
      } else {
        throw new Error('Error al enviar mensaje');
      }
    } catch (error) {
      console.error('Error sending broadcast:', error);
      toast.error('Error al enviar mensaje masivo');
    } finally {
      setSending(false);
    }
  };

  const sendTestMessage = async () => {
    if (!testMessage.chatId.trim() || !testMessage.message.trim()) {
      toast.error('Chat ID y mensaje son requeridos');
      return;
    }

    try {
      setSending(true);
      const response = await fetch('/api/v1/telegram/test-message', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testMessage),
      });

      if (response.ok) {
        toast.success('Mensaje de prueba enviado');
        setTestMessage({ chatId: '', message: '' });
      } else {
        throw new Error('Error al enviar mensaje de prueba');
      }
    } catch (error) {
      console.error('Error sending test message:', error);
      toast.error('Error al enviar mensaje de prueba');
    } finally {
      setSending(false);
    }
  };

  const saveAISettings = async () => {
    try {
      setSavingSettings(true);
      const response = await fetch('/api/v1/telegram-admin/ai/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(aiSettings),
      });

      if (response.ok) {
        toast.success('Configuración de IA guardada exitosamente');
      } else {
        throw new Error('Error al guardar configuración');
      }
    } catch (error) {
      console.error('Error saving AI settings:', error);
      toast.error('Error al guardar configuración de IA');
    } finally {
      setSavingSettings(false);
    }
  };

  const testAIResponse = async () => {
    try {
      setSending(true);
      const response = await fetch('/api/v1/telegram-admin/ai/test', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message: 'Hola, ¿puedes ayudarme?' }),
      });

      if (response.ok) {
        const result = await response.json();
        toast.success(`Respuesta de IA: ${result.response.substring(0, 100)}...`);
      } else {
        throw new Error('Error al probar IA');
      }
    } catch (error) {
      console.error('Error testing AI:', error);
      toast.error('Error al probar respuesta de IA');
    } finally {
      setSending(false);
    }
  };

  const openTelegramBot = (botUsername: string) => {
    window.open(`https://t.me/${botUsername}`, '_blank');
  };

  const renderOverview = () => (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuarios Totales</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.totalUsers || 0}</p>
            </div>
            <Users className="h-8 w-8 text-blue-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuarios Vinculados</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.linkedUsers || 0}</p>
            </div>
            <MessageCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Tasa de Vinculación</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.linkageRate || '0%'}</p>
            </div>
            <CheckCircle className="h-8 w-8 text-purple-600" />
          </div>
        </div>

        <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-600">Usuarios Activos</p>
              <p className="text-2xl font-bold text-slate-900">{stats?.activeUsers || 0}</p>
            </div>
            <Bot className="h-8 w-8 text-orange-600" />
          </div>
        </div>
      </div>

      {/* Bots Status */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Bot className="h-6 w-6 mr-2 text-blue-600" />
          Estado de los Bots
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-900">Bot de Soporte</span>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <p className="text-sm text-blue-700">@profitagent_support_bot</p>
            <p className="text-xs text-blue-600 mt-1">Dominio: profitagent.app</p>
            <Button
              onClick={() => openTelegramBot('profitagent_support_bot')}
              className="mt-2 text-xs"
              variant="outline"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Abrir
            </Button>
          </div>

          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-900">Bot de OTP</span>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <p className="text-sm text-green-700">@profitagent_otp_bot</p>
            <p className="text-xs text-green-600 mt-1">Dominio: profitagent.app</p>
            <Button
              onClick={() => openTelegramBot('profitagent_otp_bot')}
              className="mt-2 text-xs"
              variant="outline"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Abrir
            </Button>
          </div>

          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-orange-900">Bot de Alertas</span>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <p className="text-sm text-orange-700">@profitagent_alerts_bot</p>
            <p className="text-xs text-orange-600 mt-1">Dominio: profitagent.app</p>
            <Button
              onClick={() => openTelegramBot('profitagent_alerts_bot')}
              className="mt-2 text-xs"
              variant="outline"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Abrir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBroadcast = () => (
    <div className="space-y-6">
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Send className="h-6 w-6 mr-2 text-blue-600" />
          Mensaje Masivo
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Destinatarios
            </label>
            <select
              value={broadcastMessage.targetType}
              onChange={(e) => setBroadcastMessage(prev => ({ ...prev, targetType: e.target.value as any }))}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">Todos los usuarios</option>
              <option value="linked">Solo usuarios vinculados</option>
              <option value="active">Solo usuarios activos</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mensaje
            </label>
            <textarea
              value={broadcastMessage.message}
              onChange={(e) => setBroadcastMessage(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Escribe tu mensaje aquí..."
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Button
            onClick={sendBroadcast}
            disabled={sending || !broadcastMessage.message.trim()}
            className="w-full"
          >
            {sending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {sending ? 'Enviando...' : 'Enviar Mensaje Masivo'}
          </Button>
        </div>
      </div>

      {/* Test Message */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <MessageCircle className="h-6 w-6 mr-2 text-green-600" />
          Mensaje de Prueba
        </h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Chat ID
            </label>
            <Input
              value={testMessage.chatId}
              onChange={(e) => setTestMessage(prev => ({ ...prev, chatId: e.target.value }))}
              placeholder="Ej: 123456789 o @username"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Mensaje
            </label>
            <textarea
              value={testMessage.message}
              onChange={(e) => setTestMessage(prev => ({ ...prev, message: e.target.value }))}
              placeholder="Mensaje de prueba..."
              rows={3}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <Button
            onClick={sendTestMessage}
            disabled={sending || !testMessage.chatId.trim() || !testMessage.message.trim()}
            variant="outline"
          >
            {sending ? (
              <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            {sending ? 'Enviando...' : 'Enviar Prueba'}
          </Button>
        </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="space-y-6">
      {/* AI Statistics */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <BarChart3 className="h-6 w-6 mr-2 text-purple-600" />
          Estadísticas de IA
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-purple-900">Interacciones Totales</span>
              <Brain className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">{aiStats?.totalInteractions || 0}</p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-green-50 to-green-100 rounded-xl border border-green-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-green-900">Respuestas Generadas</span>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">{aiStats?.responsesGenerated || 0}</p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl border border-blue-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-blue-900">Tiempo Promedio</span>
              <Clock className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-blue-900">{aiStats?.averageResponseTime || 0}ms</p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-orange-50 to-orange-100 rounded-xl border border-orange-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-orange-900">Tasa de Éxito</span>
              <Zap className="h-5 w-5 text-orange-600" />
            </div>
            <p className="text-2xl font-bold text-orange-900">{aiStats?.successRate || '0%'}</p>
          </div>
        </div>
        
        {/* Last 24 Hours Stats */}
        <div className="bg-slate-50 rounded-xl p-4">
          <h4 className="font-semibold text-slate-900 mb-3">Últimas 24 Horas</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{aiStats?.last24Hours?.interactions || 0}</p>
              <p className="text-sm text-slate-600">Interacciones</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-slate-900">{aiStats?.last24Hours?.responses || 0}</p>
              <p className="text-sm text-slate-600">Respuestas</p>
            </div>
          </div>
        </div>
      </div>

      {/* AI Configuration */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Brain className="h-6 w-6 mr-2 text-blue-600" />
          Configuración de IA
        </h3>
        
        <div className="space-y-6">
          {/* Enable/Disable AI */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <h4 className="font-semibold text-slate-900">Sistema de IA Activado</h4>
              <p className="text-sm text-slate-600">Habilita o deshabilita las respuestas automáticas de IA</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiSettings.enabled}
                onChange={(e) => setAiSettings(prev => ({ ...prev, enabled: e.target.checked }))}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
            </label>
          </div>
          
          {/* Auto Response */}
          <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
            <div>
              <h4 className="font-semibold text-slate-900">Respuesta Automática</h4>
              <p className="text-sm text-slate-600">Responde automáticamente a todos los mensajes</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={aiSettings.autoResponse}
                onChange={(e) => setAiSettings(prev => ({ ...prev, autoResponse: e.target.checked }))}
                className="sr-only peer"
                disabled={!aiSettings.enabled}
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50"></div>
            </label>
          </div>
          
          {/* Response Delay */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Retraso de Respuesta (segundos)
            </label>
            <input
              type="number"
              min="0"
              max="30"
              value={aiSettings.responseDelay}
              onChange={(e) => setAiSettings(prev => ({ ...prev, responseDelay: parseInt(e.target.value) || 0 }))}
              disabled={!aiSettings.enabled}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="text-xs text-slate-500">Tiempo de espera antes de enviar la respuesta automática</p>
          </div>
          
          {/* Max Tokens */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Máximo de Tokens
            </label>
            <input
              type="number"
              min="50"
              max="2000"
              value={aiSettings.maxTokens}
              onChange={(e) => setAiSettings(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 500 }))}
              disabled={!aiSettings.enabled}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
            />
            <p className="text-xs text-slate-500">Longitud máxima de las respuestas generadas</p>
          </div>
          
          {/* Temperature */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Creatividad (Temperature): {aiSettings.temperature}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={aiSettings.temperature}
              onChange={(e) => setAiSettings(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              disabled={!aiSettings.enabled}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
            />
            <div className="flex justify-between text-xs text-slate-500">
              <span>Conservador (0.0)</span>
              <span>Creativo (1.0)</span>
            </div>
          </div>
          
          {/* System Prompt */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-slate-700">
              Prompt del Sistema
            </label>
            <textarea
              value={aiSettings.systemPrompt}
              onChange={(e) => setAiSettings(prev => ({ ...prev, systemPrompt: e.target.value }))}
              disabled={!aiSettings.enabled}
              rows={4}
              className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-50"
              placeholder="Instrucciones para el comportamiento de la IA..."
            />
            <p className="text-xs text-slate-500">Define cómo debe comportarse la IA al responder a los usuarios</p>
          </div>
          
          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button
              onClick={saveAISettings}
              disabled={savingSettings || !aiSettings.enabled}
              className="flex-1"
            >
              {savingSettings ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Settings className="h-4 w-4 mr-2" />
              )}
              {savingSettings ? 'Guardando...' : 'Guardar Configuración'}
            </Button>
            
            <Button
              onClick={testAIResponse}
              disabled={sending || !aiSettings.enabled}
              variant="outline"
              className="flex-1"
            >
              {sending ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Brain className="h-4 w-4 mr-2" />
              )}
              {sending ? 'Probando...' : 'Probar IA'}
            </Button>
          </div>
        </div>
      </div>
      
      {/* AI Status Indicator */}
      <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 shadow-lg border border-white/20">
        <h3 className="text-xl font-bold text-slate-900 mb-4 flex items-center">
          <Zap className="h-6 w-6 mr-2 text-yellow-600" />
          Estado del Sistema
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className={`p-4 rounded-xl border ${
            aiSettings.enabled 
              ? 'bg-gradient-to-r from-green-50 to-green-100 border-green-200' 
              : 'bg-gradient-to-r from-red-50 to-red-100 border-red-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${
                aiSettings.enabled ? 'text-green-900' : 'text-red-900'
              }`}>Sistema de IA</span>
              <div className={`w-3 h-3 rounded-full ${
                aiSettings.enabled ? 'bg-green-400' : 'bg-red-400'
              }`}></div>
            </div>
            <p className={`text-sm ${
              aiSettings.enabled ? 'text-green-700' : 'text-red-700'
            }`}>
              {aiSettings.enabled ? 'Activo' : 'Inactivo'}
            </p>
          </div>
          
          <div className={`p-4 rounded-xl border ${
            aiSettings.autoResponse 
              ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200' 
              : 'bg-gradient-to-r from-gray-50 to-gray-100 border-gray-200'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <span className={`font-medium ${
                aiSettings.autoResponse ? 'text-blue-900' : 'text-gray-900'
              }`}>Respuesta Automática</span>
              <div className={`w-3 h-3 rounded-full ${
                aiSettings.autoResponse ? 'bg-blue-400' : 'bg-gray-400'
              }`}></div>
            </div>
            <p className={`text-sm ${
              aiSettings.autoResponse ? 'text-blue-700' : 'text-gray-700'
            }`}>
              {aiSettings.autoResponse ? 'Habilitada' : 'Deshabilitada'}
            </p>
          </div>
          
          <div className="p-4 bg-gradient-to-r from-purple-50 to-purple-100 rounded-xl border border-purple-200">
            <div className="flex items-center justify-between mb-2">
              <span className="font-medium text-purple-900">Bot de Polling</span>
              <div className="w-3 h-3 bg-green-400 rounded-full"></div>
            </div>
            <p className="text-sm text-purple-700">Ejecutándose</p>
          </div>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'overview' as const, label: 'Resumen', icon: Bot },
    { id: 'broadcast' as const, label: 'Mensajes', icon: Send },
    { id: 'settings' as const, label: 'Configuración', icon: Settings },
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
              <MessageCircle className="h-8 w-8 text-blue-600" />
              Administración de Telegram
            </h1>
            <p className="text-slate-600 mt-2">Gestiona bots, mensajes y comunicación con usuarios</p>
          </div>
          <Button
            onClick={refreshData}
            disabled={refreshing}
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            Actualizar
          </Button>
        </div>

        {/* Tabs */}
        <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-white/50 shadow-lg">
          <div className="border-b border-slate-200">
            <nav className="flex space-x-8 px-6" aria-label="Tabs">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'broadcast' && renderBroadcast()}
            {activeTab === 'settings' && renderSettings()}
          </div>
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTelegramPage;