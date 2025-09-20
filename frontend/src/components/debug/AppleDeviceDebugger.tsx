import React, { useState, useEffect } from 'react';
import { diagnoseAppleDeviceIssues, testAppFunctionality, AppleDeviceIssues } from '../../utils/appleDeviceDebug';

interface DebuggerProps {
  enabled?: boolean;
  showInProduction?: boolean;
}

const AppleDeviceDebugger: React.FC<DebuggerProps> = ({ 
  enabled = true, 
  showInProduction = false 
}) => {
  const [diagnosis, setDiagnosis] = useState<AppleDeviceIssues | null>(null);
  const [appTest, setAppTest] = useState<{success: boolean, errors: string[]} | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Solo mostrar en desarrollo o si está explícitamente habilitado para producción
  const shouldShow = enabled && (process.env.NODE_ENV === 'development' || showInProduction);

  useEffect(() => {
    if (!shouldShow) return;

    const runDiagnosis = async () => {
      setIsLoading(true);
      
      // Ejecutar diagnóstico de dispositivo Apple
      const deviceDiagnosis = diagnoseAppleDeviceIssues();
      setDiagnosis(deviceDiagnosis);
      
      // Ejecutar test de funcionalidad de la app
      const appTestResult = await testAppFunctionality();
      setAppTest(appTestResult);
      
      setIsLoading(false);
      
      // Auto-mostrar si hay problemas críticos
      if (deviceDiagnosis.issues.length > 0 || !appTestResult.success) {
        setIsVisible(true);
      }
    };

    runDiagnosis();
  }, [shouldShow]);

  if (!shouldShow || !diagnosis) {
    return null;
  }

  const hasIssues = diagnosis.issues.length > 0 || (appTest && !appTest.success);
  const hasWarnings = diagnosis.warnings.length > 0;

  return (
    <>
      {/* Botón flotante para mostrar/ocultar el debugger */}
      <button
        onClick={() => setIsVisible(!isVisible)}
        className={`fixed bottom-4 right-4 z-50 w-12 h-12 rounded-full shadow-lg transition-all duration-300 ${
          hasIssues 
            ? 'bg-red-500 hover:bg-red-600 animate-pulse' 
            : hasWarnings 
            ? 'bg-yellow-500 hover:bg-yellow-600' 
            : 'bg-green-500 hover:bg-green-600'
        } text-white font-bold text-lg`}
        title="Apple Device Debugger"
      >
        🍎
      </button>

      {/* Panel de diagnóstico */}
      {isVisible && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-800">
                  🍎 Diagnóstico de Dispositivo Apple
                </h2>
                <button
                  onClick={() => setIsVisible(false)}
                  className="text-gray-500 hover:text-gray-700 text-2xl"
                >
                  ×
                </button>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Ejecutando diagnóstico...</p>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Información del dispositivo */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">📱 Información del Dispositivo</h3>
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Dispositivo Apple:</strong> {diagnosis.isAppleDevice ? '✅ Sí' : '❌ No'}</p>
                      <p><strong>Safari:</strong> {diagnosis.isSafari ? '✅ Sí' : '❌ No'}</p>
                      <p><strong>iOS:</strong> {diagnosis.isiOS ? '✅ Sí' : '❌ No'}</p>
                      <p><strong>User Agent:</strong> <code className="text-xs bg-gray-200 px-1 rounded">{navigator.userAgent}</code></p>
                      <p><strong>Viewport:</strong> {window.innerWidth}x{window.innerHeight}</p>
                      <p><strong>Pixel Ratio:</strong> {window.devicePixelRatio}</p>
                    </div>
                  </div>

                  {/* Problemas críticos */}
                  {diagnosis.issues.length > 0 && (
                    <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-red-800 mb-2">❌ Problemas Críticos</h3>
                      <ul className="text-sm text-red-700 space-y-1">
                        {diagnosis.issues.map((issue, index) => (
                          <li key={index}>• {issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Advertencias */}
                  {diagnosis.warnings.length > 0 && (
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-yellow-800 mb-2">⚠️ Advertencias</h3>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        {diagnosis.warnings.map((warning, index) => (
                          <li key={index}>• {warning}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Test de funcionalidad de la app */}
                  {appTest && (
                    <div className={`p-4 rounded-lg border ${
                      appTest.success 
                        ? 'bg-green-50 border-green-200' 
                        : 'bg-red-50 border-red-200'
                    }`}>
                      <h3 className={`font-semibold mb-2 ${
                        appTest.success ? 'text-green-800' : 'text-red-800'
                      }`}>
                        {appTest.success ? '✅ Test de Funcionalidad' : '❌ Test de Funcionalidad'}
                      </h3>
                      {appTest.success ? (
                        <p className="text-sm text-green-700">La aplicación funciona correctamente</p>
                      ) : (
                        <ul className="text-sm text-red-700 space-y-1">
                          {appTest.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}

                  {/* Recomendaciones */}
                  {diagnosis.recommendations.length > 0 && (
                    <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                      <h3 className="font-semibold text-blue-800 mb-2">💡 Recomendaciones</h3>
                      <ul className="text-sm text-blue-700 space-y-1">
                        {diagnosis.recommendations.map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Acciones de depuración */}
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold text-gray-800 mb-2">🔧 Acciones de Depuración</h3>
                    <div className="space-y-2">
                      <button
                        onClick={() => {
                          console.clear();
                          console.log('🍎 Diagnóstico completo:', diagnosis);
                          console.log('🧪 Test de app:', appTest);
                        }}
                        className="bg-blue-500 text-white px-3 py-1 rounded text-sm hover:bg-blue-600"
                      >
                        Exportar a Consola
                      </button>
                      
                      <button
                        onClick={() => {
                          const data = {
                            timestamp: new Date().toISOString(),
                            userAgent: navigator.userAgent,
                            diagnosis,
                            appTest,
                            url: window.location.href
                          };
                          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `apple-device-debug-${Date.now()}.json`;
                          a.click();
                          URL.revokeObjectURL(url);
                        }}
                        className="bg-green-500 text-white px-3 py-1 rounded text-sm hover:bg-green-600 ml-2"
                      >
                        Descargar Reporte
                      </button>
                      
                      <button
                        onClick={() => {
                          window.location.reload();
                        }}
                        className="bg-orange-500 text-white px-3 py-1 rounded text-sm hover:bg-orange-600 ml-2"
                      >
                        Recargar Página
                      </button>
                    </div>
                  </div>

                  {/* Información adicional para soporte */}
                  <div className="bg-gray-50 p-4 rounded-lg text-xs text-gray-600">
                    <p><strong>Para soporte técnico, incluye esta información:</strong></p>
                    <p>Timestamp: {new Date().toISOString()}</p>
                    <p>URL: {window.location.href}</p>
                    <p>Problemas: {diagnosis.issues.length}</p>
                    <p>Advertencias: {diagnosis.warnings.length}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AppleDeviceDebugger;