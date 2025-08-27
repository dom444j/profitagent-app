import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  Package, 
  ShoppingCart, 
  Users, 
  Settings, 
  LogOut,
  BarChart3,
  Wallet,
  Award,
  UserCheck,
  DollarSign,
  User,
  Gift
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import Grow5xLogo from '../ui/Grow5xLogo';

interface AdminSidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const navigation = [
    {
      name: 'Resumen',
      href: '/admin/dashboard',
      icon: BarChart3,
      current: location.pathname === '/admin/dashboard'
    },
    {
      name: 'Productos',
      href: '/admin/products',
      icon: Package,
      current: location.pathname === '/admin/products'
    },
    {
      name: 'Órdenes',
      href: '/admin/orders',
      icon: ShoppingCart,
      current: location.pathname === '/admin/orders'
    },
    {
      name: 'Usuarios',
      href: '/admin/users',
      icon: Users,
      current: location.pathname === '/admin/users'
    },
    {
      name: 'Licencias',
      href: '/admin/licenses',
      icon: Award,
      current: location.pathname === '/admin/licenses'
    },
    {
      name: 'Wallets',
      href: '/admin/wallets',
      icon: Wallet,
      current: location.pathname === '/admin/wallets'
    },
    {
      name: 'Referidos',
      href: '/admin/referrals',
      icon: UserCheck,
      current: location.pathname === '/admin/referrals'
    },
    {
      name: 'Retiros',
      href: '/admin/withdrawals',
      icon: DollarSign,
      current: location.pathname === '/admin/withdrawals'
    },
    {
      name: 'Bonos',
      href: '/admin/bonuses',
      icon: Gift,
      current: location.pathname === '/admin/bonuses'
    },
    {
      name: 'Perfil',
      href: '/admin/profile',
      icon: User,
      current: location.pathname === '/admin/profile'
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-gray-600 bg-opacity-75 z-20 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full min-h-0">
          {/* Logo */}
          <div className="flex items-center justify-center h-20 px-6 bg-gradient-to-r from-blue-600 to-indigo-600 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 animate-pulse"></div>
            <div className="relative flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
                <Grow5xLogo size="md" variant="white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">Grow5x</h1>
                <p className="text-xs text-blue-100">Admin Panel</p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 py-6 border-b border-slate-700/50">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-medium text-white">
                    {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
                  </span>
                </div>
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-white">
                  {user?.first_name && user?.last_name 
                    ? `${user.first_name} ${user.last_name}`
                    : user?.email
                  }
                </p>
                <p className="text-xs text-slate-300">
                  {user?.role === 'admin' ? 'Administrator' : 'Admin'}
                </p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-6 py-6 space-y-3 overflow-y-auto pr-2 scrollbar-blue overscroll-contain">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={onClose}
                  className={`
                    group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200
                    ${
                      item.current
                        ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border-r-4 border-blue-400 shadow-lg backdrop-blur-sm'
                        : 'text-slate-300 hover:bg-slate-700/50 hover:text-white hover:shadow-md'
                    }
                  `}
                >
                  <Icon className={`
                    mr-3 h-5 w-5 transition-colors
                    ${
                      item.current
                        ? 'text-blue-400'
                        : 'text-slate-400 group-hover:text-slate-200'
                    }
                  `} />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          {/* Bottom actions */}
          <div className="px-6 py-6 border-t border-slate-700/50 space-y-3">
            <Link
              to="/admin/settings"
              onClick={onClose}
              className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                location.pathname === '/admin/settings'
                  ? 'bg-gradient-to-r from-blue-500/20 to-indigo-500/20 text-blue-400 border-r-4 border-blue-400 shadow-lg backdrop-blur-sm'
                  : 'text-slate-300 hover:bg-slate-700/50 hover:text-white hover:shadow-md'
              }`}
            >
              <Settings className={`mr-3 h-5 w-5 ${
                location.pathname === '/admin/settings' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              Configuración
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full group flex items-center px-4 py-3 text-sm font-medium text-red-400 rounded-xl hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 hover:shadow-md"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-300" />
              Cerrar Sesión
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default AdminSidebar;