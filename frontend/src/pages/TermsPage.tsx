import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Shield, AlertTriangle, Scale, Globe } from 'lucide-react';

const TermsPage: React.FC = () => {
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
              <Scale className="h-8 w-8 text-emerald-400 mr-3" />
              <h1 className="text-3xl font-bold text-white">Términos y Condiciones</h1>
            </div>
            <p className="text-gray-300">ProFitAgent - Plataforma de Arbitraje Automatizado</p>
            <p className="text-sm text-gray-400 mt-2">Última actualización: {new Date().toLocaleDateString('es-ES')}</p>
          </div>

          {/* Content Sections */}
          <div className="space-y-8 text-gray-300">
            {/* Acceptance */}
            <section>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">1. Aceptación de Términos</h2>
              </div>
              <p className="leading-relaxed">
                Al acceder y utilizar ProFitAgent, usted acepta estar legalmente vinculado por estos términos y condiciones. 
                Si no está de acuerdo con alguno de estos términos, no debe utilizar nuestros servicios.
              </p>
            </section>

            {/* Age and Legal Capacity */}
            <section>
              <div className="flex items-center mb-4">
                <Globe className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">2. Mayoría de Edad y Capacidad Legal</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  <strong>Requisitos de Edad:</strong> Debe ser mayor de edad según las leyes de su jurisdicción (18 años o más en la mayoría de países) 
                  para utilizar nuestros servicios.
                </p>
                <p className="leading-relaxed">
                  <strong>Capacidad Legal:</strong> Debe tener la capacidad legal completa para celebrar contratos vinculantes en su jurisdicción.
                </p>
                <p className="leading-relaxed">
                  <strong>Verificación:</strong> Nos reservamos el derecho de solicitar verificación de edad e identidad en cualquier momento.
                </p>
              </div>
            </section>

            {/* Legal Responsibility */}
            <section>
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-5 w-5 text-yellow-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">3. Responsabilidad Legal del Usuario</h2>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-400/30 rounded-lg p-4 mb-4">
                <p className="text-yellow-200 font-medium">
                  ⚠️ IMPORTANTE: La responsabilidad legal y operativa es completamente del usuario.
                </p>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  <strong>Jurisdicción Local:</strong> Usted es responsable de cumplir con todas las leyes, regulaciones y normativas 
                  aplicables en su país de residencia y jurisdicción.
                </p>
                <p className="leading-relaxed">
                  <strong>Legalidad del Arbitraje:</strong> Debe verificar que el arbitraje de criptomonedas y el uso de bots automatizados 
                  sea legal en su jurisdicción antes de utilizar nuestros servicios.
                </p>
                <p className="leading-relaxed">
                  <strong>Obligaciones Fiscales:</strong> Es su responsabilidad declarar y pagar todos los impuestos aplicables 
                  sobre las ganancias obtenidas a través de nuestra plataforma.
                </p>
                <p className="leading-relaxed">
                  <strong>Cumplimiento Regulatorio:</strong> Debe cumplir con todas las regulaciones financieras locales, 
                  incluyendo pero no limitado a KYC (Know Your Customer) y AML (Anti-Money Laundering).
                </p>
              </div>
            </section>

            {/* Risk Disclosure */}
            <section>
              <div className="flex items-center mb-4">
                <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">4. Divulgación de Riesgos</h2>
              </div>
              <div className="bg-red-500/10 border border-red-400/30 rounded-lg p-4 mb-4">
                <p className="text-red-200 font-medium">
                  🚨 ADVERTENCIA: El arbitraje de criptomonedas conlleva riesgos significativos de pérdida financiera.
                </p>
              </div>
              
              <h3 className="text-lg font-semibold text-white mb-3">4.1 Riesgos de Arbitraje</h3>
              <div className="space-y-2 mb-4">
                <p className="leading-relaxed">
                  • <strong>Riesgo Conservador:</strong> Aunque el arbitraje se considera una estrategia de bajo riesgo, 
                  no está exento de pérdidas potenciales.
                </p>
                <p className="leading-relaxed">
                  • <strong>Diferencias de Precios:</strong> Las oportunidades de arbitraje pueden desaparecer rápidamente 
                  debido a la volatilidad del mercado.
                </p>
                <p className="leading-relaxed">
                  • <strong>Latencia y Ejecución:</strong> Los retrasos en la ejecución pueden resultar en pérdidas 
                  en lugar de ganancias esperadas.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">4.2 Dependencia de Terceros</h3>
              <div className="space-y-2 mb-4">
                <p className="leading-relaxed">
                  • <strong>Servicios de IA:</strong> Dependemos de proveedores externos de inteligencia artificial 
                  que pueden experimentar interrupciones o cambios en sus servicios.
                </p>
                <p className="leading-relaxed">
                  • <strong>APIs de Exchanges:</strong> Los exchanges de criptomonedas pueden modificar, limitar 
                  o suspender el acceso a sus APIs sin previo aviso.
                </p>
                <p className="leading-relaxed">
                  • <strong>Casas de Apuestas:</strong> Los servicios de terceros pueden cambiar sus términos, 
                  comisiones o disponibilidad en cualquier momento.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">4.3 Riesgos del Mercado</h3>
              <div className="space-y-2 mb-4">
                <p className="leading-relaxed">
                  • <strong>Volatilidad Extrema:</strong> Las criptomonedas pueden experimentar caídas bruscas 
                  y significativas en sus valores.
                </p>
                <p className="leading-relaxed">
                  • <strong>Riesgo de Liquidez:</strong> Puede haber dificultades para ejecutar órdenes 
                  en mercados con baja liquidez.
                </p>
                <p className="leading-relaxed">
                  • <strong>Riesgo de Contraparte:</strong> Los exchanges pueden experimentar problemas técnicos, 
                  hackeos o insolvencia.
                </p>
              </div>

              <h3 className="text-lg font-semibold text-white mb-3">4.4 Riesgos Técnicos</h3>
              <div className="space-y-2">
                <p className="leading-relaxed">
                  • <strong>Fallas de Sistema:</strong> Interrupciones en nuestros servicios pueden afectar 
                  la ejecución de estrategias de arbitraje.
                </p>
                <p className="leading-relaxed">
                  • <strong>Conectividad:</strong> Problemas de internet o conectividad pueden resultar 
                  en pérdidas de oportunidades o ejecuciones erróneas.
                </p>
                <p className="leading-relaxed">
                  • <strong>Seguridad:</strong> Riesgos de ciberseguridad que pueden afectar 
                  la integridad de los datos y transacciones.
                </p>
              </div>
            </section>

            {/* Liability Disclaimer */}
            <section>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">5. Descargo de Responsabilidad</h2>
              </div>
              <div className="bg-gray-500/10 border border-gray-400/30 rounded-lg p-4 mb-4">
                <p className="text-gray-200 font-medium">
                  ProFitAgent actúa únicamente como una herramienta tecnológica y no asume responsabilidad 
                  por las decisiones de inversión o sus resultados.
                </p>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  <strong>Sin Garantías:</strong> No garantizamos ganancias, rendimientos específicos 
                  o la ausencia de pérdidas al utilizar nuestros servicios.
                </p>
                <p className="leading-relaxed">
                  <strong>Decisiones Propias:</strong> Todas las decisiones de arbitraje son tomadas por el usuario 
                  bajo su propia responsabilidad y criterio.
                </p>
                <p className="leading-relaxed">
                  <strong>Limitación de Responsabilidad:</strong> En ningún caso seremos responsables por pérdidas 
                  directas, indirectas, incidentales o consecuentes.
                </p>
                <p className="leading-relaxed">
                  <strong>Fuerza Mayor:</strong> No somos responsables por eventos fuera de nuestro control, 
                  incluyendo pero no limitado a fallas de terceros, cambios regulatorios o eventos del mercado.
                </p>
              </div>
            </section>

            {/* User Responsibilities */}
            <section>
              <div className="flex items-center mb-4">
                <Globe className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">6. Responsabilidades del Usuario</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  • Proporcionar información precisa y actualizada durante el registro
                </p>
                <p className="leading-relaxed">
                  • Mantener la confidencialidad de sus credenciales de acceso
                </p>
                <p className="leading-relaxed">
                  • Utilizar los servicios de manera responsable y ética
                </p>
                <p className="leading-relaxed">
                  • Informarse adecuadamente sobre los riesgos antes de operar
                </p>
                <p className="leading-relaxed">
                  • Cumplir con todas las leyes y regulaciones aplicables
                </p>
                <p className="leading-relaxed">
                  • No utilizar los servicios para actividades ilegales o fraudulentas
                </p>
              </div>
            </section>

            {/* Service Modifications */}
            <section>
              <div className="flex items-center mb-4">
                <Shield className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">7. Modificaciones del Servicio</h2>
              </div>
              <div className="space-y-3">
                <p className="leading-relaxed">
                  Nos reservamos el derecho de modificar, suspender o discontinuar cualquier aspecto 
                  de nuestros servicios en cualquier momento, con o sin previo aviso.
                </p>
                <p className="leading-relaxed">
                  Los cambios en estos términos y condiciones serán efectivos inmediatamente 
                  después de su publicación en nuestra plataforma.
                </p>
              </div>
            </section>

            {/* Governing Law */}
            <section>
              <div className="flex items-center mb-4">
                <Scale className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">8. Ley Aplicable</h2>
              </div>
              <p className="leading-relaxed">
                Estos términos se rigen por las leyes de la jurisdicción donde opera ProFitAgent. 
                Sin embargo, el usuario mantiene la responsabilidad de cumplir con las leyes 
                de su jurisdicción local.
              </p>
            </section>

            {/* Contact */}
            <section>
              <div className="flex items-center mb-4">
                <Globe className="h-5 w-5 text-emerald-400 mr-2" />
                <h2 className="text-xl font-semibold text-white">9. Contacto</h2>
              </div>
              <p className="leading-relaxed">
                Para preguntas sobre estos términos y condiciones, puede contactarnos a través 
                de los canales oficiales de ProFitAgent.
              </p>
            </section>
          </div>

          {/* Final Warning */}
          <div className="mt-8 p-6 bg-red-500/10 border border-red-400/30 rounded-lg">
            <div className="flex items-start">
              <AlertTriangle className="h-6 w-6 text-red-400 mr-3 mt-1 flex-shrink-0" />
              <div>
                <h3 className="text-lg font-semibold text-red-300 mb-2">Advertencia Final</h3>
                <p className="text-red-200 leading-relaxed">
                  El arbitraje de criptomonedas es altamente especulativo y conlleva un alto riesgo de pérdida. 
                  Solo invierta lo que puede permitirse perder. ProFitAgent no es un asesor financiero 
                  y no proporciona consejos de inversión. Consulte con un profesional financiero 
                  antes de tomar decisiones de inversión.
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

export default TermsPage;