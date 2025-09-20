import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, Eye, Lock, Database } from 'lucide-react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black">
      {/* Header */}
      <div className="bg-black/50 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <Link
            to="/register"
            className="inline-flex items-center text-emerald-400 hover:text-emerald-300 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Volver al registro
          </Link>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white/5 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/10 p-8">
          {/* Title */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <Shield className="h-8 w-8 text-emerald-400 mr-3" />
              <h1 className="text-3xl font-bold text-white">Política de Privacidad</h1>
            </div>
            <p className="text-gray-300">ProFitAgent - Protección de Datos Personales</p>
            <p className="text-sm text-gray-400 mt-2">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8 text-gray-300">
            {/* Introduction */}
            <section>
              <div className="flex items-center mb-4">
                <Eye className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">1. Introducción</h2>
              </div>
              <p className="leading-relaxed">
                En ProFitAgent, respetamos su privacidad y nos comprometemos a proteger sus datos personales. 
                Esta política explica cómo recopilamos, utilizamos, almacenamos y protegemos su información.
              </p>
            </section>

            {/* Data Collection */}
            <section>
              <div className="flex items-center mb-4">
                <Database className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">2. Información que Recopilamos</h2>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-3">2.1 Información Personal</h3>
              <div className="space-y-2 mb-4">
                <p className="leading-relaxed">• Nombre y apellidos</p>
                <p className="leading-relaxed">• Dirección de correo electrónico</p>
                <p className="leading-relaxed">• Información de contacto</p>
                <p className="leading-relaxed">• Datos de verificación de identidad (cuando sea requerido)</p>
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">2.2 Información de Arbitraje</h3>
              <div className="space-y-2 mb-4">
                <p className="leading-relaxed">• Historial de transacciones</p>
                <p className="leading-relaxed">• Configuraciones de estrategias de arbitraje</p>
                <p className="leading-relaxed">• Datos de rendimiento y estadísticas</p>
                <p className="leading-relaxed">• Información de cuentas de exchange (encriptada)</p>
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">2.3 Información Técnica</h3>
              <div className="space-y-2">
                <p className="leading-relaxed">• Dirección IP y ubicación geográfica</p>
                <p className="leading-relaxed">• Información del dispositivo y navegador</p>
                <p className="leading-relaxed">• Cookies y tecnologías similares</p>
                <p className="leading-relaxed">• Logs de actividad y uso de la plataforma</p>
              </div>
            </section>

            {/* Data Usage */}
            <section>
              <div className="flex items-center mb-4">
                <Lock className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">3. Cómo Utilizamos su Información</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  <strong>Prestación de Servicios:</strong> Para proporcionar y mantener nuestros servicios de arbitraje automatizado.
                </p>
                <p className="leading-relaxed">
                  <strong>Comunicación:</strong> Para enviar notificaciones importantes, actualizaciones y soporte técnico.
                </p>
                <p className="leading-relaxed">
                  <strong>Seguridad:</strong> Para proteger su cuenta y detectar actividades fraudulentas o sospechosas.
                </p>
                <p className="leading-relaxed">
                  <strong>Mejoras:</strong> Para analizar el uso de la plataforma y mejorar nuestros servicios.
                </p>
                <p className="leading-relaxed">
                  <strong>Cumplimiento Legal:</strong> Para cumplir con obligaciones legales y regulatorias aplicables.
                </p>
              </div>
            </section>

            {/* Data Sharing */}
            <section>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">4. Compartir Información</h2>
              </div>
              <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-4 mb-4">
                <p className="text-blue-200 font-medium">
                  No vendemos, alquilamos ni compartimos su información personal con terceros para fines comerciales.
                </p>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-3">Compartimos información únicamente en estos casos:</h3>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  • <strong>Proveedores de Servicios:</strong> Con terceros que nos ayudan a operar la plataforma (hosting, análisis, soporte)
                </p>
                <p className="leading-relaxed">
                  • <strong>Exchanges y APIs:</strong> Información necesaria para ejecutar operaciones de arbitraje
                </p>
                <p className="leading-relaxed">
                  • <strong>Cumplimiento Legal:</strong> Cuando sea requerido por ley o autoridades competentes
                </p>
                <p className="leading-relaxed">
                  • <strong>Protección de Derechos:</strong> Para proteger nuestros derechos legales o los de nuestros usuarios
                </p>
              </div>
            </section>

            {/* Data Security */}
            <section>
              <div className="flex items-center mb-4">
                <Lock className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">5. Seguridad de Datos</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  <strong>Encriptación:</strong> Utilizamos encriptación de grado militar para proteger datos sensibles.
                </p>
                <p className="leading-relaxed">
                  <strong>Acceso Restringido:</strong> Solo personal autorizado tiene acceso a información personal.
                </p>
                <p className="leading-relaxed">
                  <strong>Monitoreo:</strong> Supervisamos continuamente nuestros sistemas para detectar vulnerabilidades.
                </p>
                <p className="leading-relaxed">
                  <strong>Actualizaciones:</strong> Mantenemos nuestros sistemas de seguridad actualizados regularmente.
                </p>
                <p className="leading-relaxed">
                  <strong>Auditorías:</strong> Realizamos auditorías de seguridad periódicas con terceros especializados.
                </p>
              </div>
            </section>

            {/* Data Retention */}
            <section>
              <div className="flex items-center mb-4">
                <Database className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">6. Retención de Datos</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  Conservamos su información personal solo durante el tiempo necesario para los fines descritos 
                  en esta política o según lo requiera la ley.
                </p>
                <p className="leading-relaxed">
                  <strong>Cuentas Activas:</strong> Mientras su cuenta permanezca activa y por un período adicional 
                  para cumplir con obligaciones legales.
                </p>
                <p className="leading-relaxed">
                  <strong>Cuentas Inactivas:</strong> Los datos de cuentas inactivas se eliminan después de 3 años 
                  de inactividad, salvo requerimientos legales.
                </p>
              </div>
            </section>

            {/* User Rights */}
            <section>
              <div className="flex items-center mb-4">
                <Eye className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">7. Sus Derechos</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  <strong>Acceso:</strong> Puede solicitar una copia de la información personal que tenemos sobre usted.
                </p>
                <p className="leading-relaxed">
                  <strong>Rectificación:</strong> Puede solicitar la corrección de información inexacta o incompleta.
                </p>
                <p className="leading-relaxed">
                  <strong>Eliminación:</strong> Puede solicitar la eliminación de su información personal 
                  (sujeto a obligaciones legales).
                </p>
                <p className="leading-relaxed">
                  <strong>Portabilidad:</strong> Puede solicitar la transferencia de sus datos a otro proveedor.
                </p>
                <p className="leading-relaxed">
                  <strong>Oposición:</strong> Puede oponerse al procesamiento de sus datos para ciertos fines.
                </p>
              </div>
            </section>

            {/* Cookies */}
            <section>
              <div className="flex items-center mb-4">
                <Database className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">8. Cookies y Tecnologías Similares</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  Utilizamos cookies y tecnologías similares para mejorar su experiencia, analizar el uso 
                  de la plataforma y proporcionar funcionalidades personalizadas.
                </p>
                <p className="leading-relaxed">
                  <strong>Cookies Esenciales:</strong> Necesarias para el funcionamiento básico de la plataforma.
                </p>
                <p className="leading-relaxed">
                  <strong>Cookies de Rendimiento:</strong> Para analizar cómo se utiliza la plataforma y mejorar el rendimiento.
                </p>
                <p className="leading-relaxed">
                  <strong>Control:</strong> Puede gestionar las preferencias de cookies a través de su navegador.
                </p>
              </div>
            </section>

            {/* International Transfers */}
            <section>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">9. Transferencias Internacionales</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  Sus datos pueden ser transferidos y procesados en países diferentes al suyo. 
                  Implementamos salvaguardas adecuadas para proteger su información durante estas transferencias.
                </p>
                <p className="leading-relaxed">
                  <strong>Protecciones:</strong> Utilizamos cláusulas contractuales estándar y otros mecanismos 
                  aprobados para garantizar un nivel adecuado de protección.
                </p>
              </div>
            </section>

            {/* Changes to Policy */}
            <section>
              <div className="flex items-center mb-4">
                <Eye className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">10. Cambios a esta Política</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  Podemos actualizar esta política de privacidad ocasionalmente. Le notificaremos sobre 
                  cambios significativos a través de la plataforma o por correo electrónico.
                </p>
                <p className="leading-relaxed">
                  <strong>Fecha de Vigencia:</strong> Los cambios entran en vigor inmediatamente después 
                  de su publicación, salvo que se indique lo contrario.
                </p>
              </div>
            </section>

            {/* Contact */}
            <section>
              <div className="flex items-center mb-4">
                <Lock className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">11. Contacto</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  Para preguntas sobre esta política de privacidad o para ejercer sus derechos, 
                  puede contactarnos a través de los canales oficiales de ProFitAgent.
                </p>
                <p className="leading-relaxed">
                  <strong>Tiempo de Respuesta:</strong> Responderemos a sus solicitudes dentro de 30 días hábiles.
                </p>
              </div>
            </section>
          </div>

          {/* Privacy Commitment */}
          <div className="mt-8 p-6 bg-emerald-500/10 border border-emerald-400/30 rounded-lg">
            <div className="flex items-start">
              <Shield className="h-6 w-6 text-emerald-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-emerald-300 mb-2">Nuestro Compromiso</h3>
                <p className="text-emerald-200 leading-relaxed">
                  En ProFitAgent, la protección de su privacidad es fundamental. Nos comprometemos 
                  a mantener los más altos estándares de seguridad y transparencia en el manejo 
                  de su información personal.
                </p>
              </div>
            </div>
          </div>

          {/* Back Button */}
          <div className="mt-8 text-center">
            <Link
              to="/register"
              className="inline-flex items-center px-6 py-3 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold rounded-xl transition-colors"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Volver al Registro
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;