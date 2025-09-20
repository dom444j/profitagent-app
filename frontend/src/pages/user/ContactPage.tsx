import React from 'react';
import { MessageCircle, Clock, Users, Bot, ExternalLink } from 'lucide-react';
import { Button } from '../../components/ui/Button';
import Layout from '../../components/layout/Layout';

const ContactPage: React.FC = () => {

  const openTelegramBot = (botUsername: string) => {
    window.open(`https://t.me/${botUsername}`, '_blank');
  };

  return (
    <Layout>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-4">
            Contacta con <span className="text-purple-600">ProFitAgent</span>
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Estamos aquí para ayudarte. Elige la forma de contacto que prefieras.
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Telegram Support Section */}
          <div className="space-y-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
              <div className="flex items-center mb-6">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-cyan-500 rounded-xl flex items-center justify-center mr-4">
                  <Bot className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Soporte por Telegram</h2>
                  <p className="text-gray-600">Respuesta inmediata 24/7</p>
                </div>
              </div>
              
              <div className="space-y-4">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Bot de Soporte General</h3>
                      <p className="text-gray-600 text-sm">Consultas generales, ayuda técnica</p>
                      <p className="text-xs text-gray-500 mt-1">Dominio: profitagent.app</p>
                    </div>
                    <Button
                      onClick={() => openTelegramBot('profitagent_support_bot')}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Abrir Chat
                    </Button>
                  </div>
                </div>
                
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 hover:bg-gray-100 transition-all duration-300">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">Bot de Alertas</h3>
                      <p className="text-gray-600 text-sm">Notificaciones y actualizaciones</p>
                      <p className="text-xs text-gray-500 mt-1">Dominio: profitagent.app</p>
                    </div>
                    <Button
                      onClick={() => openTelegramBot('profitagent_alerts_bot')}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center"
                    >
                      <MessageCircle className="h-4 w-4 mr-2" />
                      Suscribirse
                    </Button>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-blue-700 text-sm">
                  💡 <strong>Tip:</strong> Los bots de Telegram ofrecen respuestas instantáneas y están disponibles 24/7.
                </p>
              </div>
            </div>
            

            
            {/* Community */}
            <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
              <h2 className="text-2xl font-bold text-gray-900 mb-6 flex items-center">
                <Users className="h-6 w-6 mr-3 text-emerald-600" />
                Comunidad
              </h2>
              
              <div className="space-y-4">
                <Button
                  onClick={() => openTelegramBot('profitagent_community')}
                  className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white py-3 rounded-lg flex items-center justify-center"
                >
                  <Users className="h-5 w-5 mr-2" />
                  Únete al Canal de Telegram
                  <ExternalLink className="h-4 w-4 ml-2" />
                </Button>
                
                <p className="text-gray-600 text-sm text-center">
                  Conecta con otros usuarios, comparte experiencias y recibe actualizaciones.
                </p>
              </div>
            </div>
          </div>
          
          {/* Información de Contacto Principal */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-lg">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl flex items-center justify-center mr-4">
                <MessageCircle className="h-6 w-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Contacto Directo</h2>
                <p className="text-gray-600">La forma más rápida de obtener ayuda</p>
              </div>
            </div>
            
            <div className="text-center mb-8">
              <p className="text-lg text-gray-600 mb-6">
                Para obtener soporte inmediato y personalizado, contáctanos directamente a través de nuestros bots de Telegram.
              </p>
              <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
                <div className="flex items-center justify-center gap-2 text-purple-700 mb-2">
                  <Clock className="w-5 h-5" />
                  <span className="font-semibold">Respuesta inmediata 24/7</span>
                </div>
                <p className="text-sm text-purple-600">
                  Nuestros bots están disponibles las 24 horas para brindarte asistencia instantánea
                </p>
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-gray-600 mb-6">
                Utiliza los botones de abajo para acceder directamente a nuestros bots de soporte especializados.
              </p>
            </div>
          </div>
        </div>
        
        {/* FAQ Section */}
        <div className="mt-16 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 text-center mb-12">
            Preguntas Frecuentes
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ¿Cuál es el tiempo de respuesta?
              </h3>
              <p className="text-gray-600 text-sm">
                Nuestros bots de Telegram responden inmediatamente, 24/7. Para consultas complejas, un agente humano te contactará en 2-5 minutos.
              </p>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-lg">
              <h3 className="text-lg font-semibold text-gray-900 mb-3">
                ¿Es seguro usar Telegram para soporte?
              </h3>
              <p className="text-gray-600 text-sm">
                Sí, nuestros bots están verificados y usan encriptación. 
                Nunca compartas información sensible como contraseñas.
              </p>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ContactPage;