import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import LoadingSpinner from '../ui/LoadingSpinner';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <LoadingSpinner size="lg" text="Cargando..." />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Si se requiere acceso de admin y el usuario no es admin
  if (adminOnly && user.role !== 'admin') {
    return <Navigate to="/user/dashboard" replace />;
  }

  // Los administradores pueden acceder a cualquier ruta
  // Solo redirigir usuarios normales que intenten acceder a rutas de admin

  return <>{children}</>;
};

export default ProtectedRoute;