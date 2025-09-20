// Utilidades para diagnosticar problemas específicos en dispositivos Apple (Safari/iOS)
import React from 'react';

export interface AppleDeviceIssues {
  isAppleDevice: boolean;
  isSafari: boolean;
  isiOS: boolean;
  issues: string[];
  warnings: string[];
  recommendations: string[];
}

export function diagnoseAppleDeviceIssues(): AppleDeviceIssues {
  const userAgent = navigator.userAgent;
  const issues: string[] = [];
  const warnings: string[] = [];
  const recommendations: string[] = [];

  // Detectar dispositivo Apple
  const isAppleDevice = /Mac|iPhone|iPad|iPod/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  const isiOS = /iPhone|iPad|iPod/.test(userAgent);

  console.log('🍎 Apple Device Debug Info:', {
    userAgent,
    isAppleDevice,
    isSafari,
    isiOS,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      devicePixelRatio: window.devicePixelRatio
    }
  });

  // 1. Verificar soporte de Clipboard API
  if (!navigator.clipboard) {
    issues.push('Clipboard API no disponible');
    recommendations.push('Usar fallback para copiar texto');
  } else if (!window.isSecureContext) {
    warnings.push('Clipboard API requiere contexto seguro (HTTPS)');
    recommendations.push('Asegurar que el sitio use HTTPS');
  }

  // 2. Verificar soporte de cookies
  try {
    document.cookie = 'test=1; SameSite=None; Secure';
    const cookieSupported = document.cookie.includes('test=1');
    if (!cookieSupported && isSafari) {
      issues.push('Cookies bloqueadas o no soportadas');
      recommendations.push('Verificar configuración de cookies en Safari');
    }
    // Limpiar cookie de prueba
    document.cookie = 'test=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
  } catch (error) {
    issues.push('Error al verificar soporte de cookies');
  }

  // 3. Verificar localStorage
  try {
    localStorage.setItem('test', 'value');
    const stored = localStorage.getItem('test');
    if (stored !== 'value') {
      issues.push('localStorage no funciona correctamente');
    }
    localStorage.removeItem('test');
  } catch (error) {
    issues.push('localStorage bloqueado o no disponible');
    if (isiOS) {
      recommendations.push('En iOS, localStorage puede estar deshabilitado en modo privado');
    }
  }

  // 4. Verificar sessionStorage
  try {
    sessionStorage.setItem('test', 'value');
    const stored = sessionStorage.getItem('test');
    if (stored !== 'value') {
      issues.push('sessionStorage no funciona correctamente');
    }
    sessionStorage.removeItem('test');
  } catch (error) {
    issues.push('sessionStorage bloqueado o no disponible');
  }

  // 5. Verificar fetch API
  if (!window.fetch) {
    issues.push('Fetch API no disponible');
    recommendations.push('Usar polyfill para fetch');
  }

  // 6. Verificar soporte de CSS moderno
  const supportsBackdropFilter = CSS.supports('backdrop-filter', 'blur(10px)');
  if (!supportsBackdropFilter && isSafari) {
    warnings.push('backdrop-filter puede no funcionar correctamente');
    recommendations.push('Usar fallbacks para efectos de vidrio');
  }

  // 7. Verificar viewport meta tag
  const viewportMeta = document.querySelector('meta[name="viewport"]');
  if (!viewportMeta && isiOS) {
    issues.push('Meta tag viewport faltante');
    recommendations.push('Agregar <meta name="viewport" content="width=device-width, initial-scale=1.0">');
  }

  // 8. Verificar problemas específicos de iOS
  if (isiOS) {
    // Verificar si está en modo standalone (PWA)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    if (isStandalone) {
      warnings.push('Aplicación ejecutándose en modo standalone (PWA)');
    }

    // Verificar orientación
    if (window.orientation !== undefined) {
      warnings.push(`Orientación del dispositivo: ${window.orientation}°`);
    }
  }

  // 9. Verificar problemas de CORS
  if (window.location.protocol === 'file:') {
    issues.push('Aplicación ejecutándose desde file:// - CORS bloqueado');
    recommendations.push('Servir la aplicación desde un servidor HTTP');
  }

  // 10. Verificar soporte de ES6+
  try {
    eval('const test = () => {}; class Test {}');
  } catch (error) {
    issues.push('Soporte limitado de ES6+');
    recommendations.push('Usar transpilación para compatibilidad');
  }

  return {
    isAppleDevice,
    isSafari,
    isiOS,
    issues,
    warnings,
    recommendations
  };
}

// Función para mostrar el diagnóstico en consola
export function logAppleDeviceDiagnosis() {
  const diagnosis = diagnoseAppleDeviceIssues();
  
  console.group('🍎 Diagnóstico de Dispositivo Apple');
  
  if (diagnosis.isAppleDevice) {
    console.log('✅ Dispositivo Apple detectado');
    console.log(`📱 Safari: ${diagnosis.isSafari ? 'Sí' : 'No'}`);
    console.log(`📱 iOS: ${diagnosis.isiOS ? 'Sí' : 'No'}`);
  } else {
    console.log('ℹ️ No es un dispositivo Apple');
  }

  if (diagnosis.issues.length > 0) {
    console.group('❌ Problemas encontrados:');
    diagnosis.issues.forEach(issue => console.error(`• ${issue}`));
    console.groupEnd();
  }

  if (diagnosis.warnings.length > 0) {
    console.group('⚠️ Advertencias:');
    diagnosis.warnings.forEach(warning => console.warn(`• ${warning}`));
    console.groupEnd();
  }

  if (diagnosis.recommendations.length > 0) {
    console.group('💡 Recomendaciones:');
    diagnosis.recommendations.forEach(rec => console.info(`• ${rec}`));
    console.groupEnd();
  }

  console.groupEnd();
  
  return diagnosis;
}

// Función para crear un fallback de clipboard para Safari
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  try {
    // Intentar usar la API moderna primero
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    
    // Fallback para Safari/iOS
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    const successful = document.execCommand('copy');
    document.body.removeChild(textArea);
    
    return successful;
  } catch (error) {
    console.error('Error al copiar al portapapeles:', error);
    return false;
  }
}

// Hook para detectar problemas de Apple automáticamente
export function useAppleDeviceDetection() {
  const [diagnosis, setDiagnosis] = React.useState<AppleDeviceIssues | null>(null);
  
  React.useEffect(() => {
    const result = diagnoseAppleDeviceIssues();
    setDiagnosis(result);
    
    // Log automático en desarrollo
    if (process.env.NODE_ENV === 'development') {
      logAppleDeviceDiagnosis();
    }
  }, []);
  
  return diagnosis;
}

// Función para verificar si la aplicación está funcionando correctamente
export async function testAppFunctionality(): Promise<{success: boolean, errors: string[]}> {
  const errors: string[] = [];
  
  try {
    // Test 1: Verificar que React está funcionando
    if (!window.React && !document.getElementById('root')?.children.length) {
      errors.push('React no se ha montado correctamente');
    }
    
    // Test 2: Verificar que las rutas funcionan
    if (!window.location.pathname) {
      errors.push('Routing no funciona correctamente');
    }
    
    // Test 3: Verificar conectividad básica
    try {
      const response = await fetch('/api/health', { method: 'GET' });
      if (!response.ok) {
        errors.push('API no responde correctamente');
      }
    } catch (fetchError) {
      errors.push('No se puede conectar con la API');
    }
    
    return {
      success: errors.length === 0,
      errors
    };
  } catch (error) {
    errors.push(`Error general: ${error}`);
    return {
      success: false,
      errors
    };
  }
}