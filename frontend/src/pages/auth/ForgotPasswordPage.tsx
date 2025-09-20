import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Button from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { apiService } from '../../services/api';

const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    try {
      await apiService.post('/auth/forgot-password', { email });
      setMessage('Se ha enviado un mensaje a tu Telegram con instrucciones para recuperar tu contraseña.');
      setIsSuccess(true);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Error al procesar la solicitud. Verifica que tu email esté registrado y tengas Telegram configurado.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center p-4">
      <div className="absolute inset-0 opacity-20"></div>
      
      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mb-4 shadow-lg">
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-blue-200 bg-clip-text text-transparent mb-2">
            profitagent
          </h1>
          <p className="text-gray-300 text-sm">
            Recupera tu contraseña
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/20 p-8">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-white mb-2">Recuperar Contraseña</h2>
            <p className="text-gray-300 text-sm">
              Ingresa tu email y te enviaremos las instrucciones por Telegram
            </p>
          </div>

          {!isSuccess ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-200 mb-2">
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                    </svg>
                    Email
                  </div>
                </label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="tu@email.com"
                  required
                  className="w-full bg-white/5 border-white/20 text-white placeholder-gray-400 focus:border-blue-400 focus:ring-blue-400/20"
                />
              </div>

              {error && (
                <div className="p-3 rounded-lg border border-red-400/30 bg-red-500/10 text-red-300 text-sm">
                  {error}
                </div>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <LoadingSpinner size="sm" className="mr-2" />
                    <span>Enviando...</span>
                  </div>
                ) : (
                  'Enviar Instrucciones'
                )}
              </Button>
            </form>
          ) : (
            <div className="text-center space-y-4">
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-500/20 rounded-full mb-4">
                <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              
              <div className="p-4 rounded-lg border border-green-400/30 bg-green-500/10 text-green-300 text-sm">
                {message}
              </div>
              
              <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-400/30">
                <div className="flex items-center justify-center mb-2">
                  <svg className="w-5 h-5 text-blue-400 mr-2" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 0C5.374 0 0 5.373 0 12s5.374 12 12 12 12-5.373 12-12S18.626 0 12 0zm5.568 8.16c-.169 1.858-.896 6.728-.896 6.728-.896 6.728-1.268 7.928-1.268 7.928-.16.906-.576 1.056-.576 1.056s-.736.064-1.632-.576c-.896-.64-2.432-1.536-2.432-1.536s-2.752-1.792-3.712-2.432c-.96-.64-1.024-1.088-.576-1.728.448-.64 2.048-1.92 4.096-3.776 1.024-.928 2.24-2.112 2.56-2.432.32-.32.64-.128.384.192-.256.32-3.008 2.752-4.352 3.968-1.344 1.216-1.6 1.28-2.048 1.28s-1.216-.192-1.216-.192s-1.728-.576-2.432-.832c-.704-.256-1.28-.448-1.28-.448s-.448-.256-.192-.832c.256-.576.832-.832.832-.832s6.4-2.56 8.64-3.52c2.24-.96 2.24-.96 2.24-.96s.832-.32.832.192z"/>
                  </svg>
                  <span className="text-blue-300 text-sm font-medium">Revisa tu Telegram</span>
                </div>
                <p className="text-blue-200 text-xs">
                  Las instrucciones han sido enviadas a tu cuenta de Telegram asociada.
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 text-center">
            <Link
              to="/login"
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-300 hover:text-white transition-colors duration-200"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Volver al login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
