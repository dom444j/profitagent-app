import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  ShoppingCart, 
  FileText, 
  DollarSign, 
  Settings, 
  LogOut,
  User,
  CreditCard,
  Users,
  MessageCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import ProFitAgentLogo from '../ui/ProFitAgentLogo';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const { logout, user } = useAuth();

  const navigation = [
    {
      name: 'Dashboard',
      href: '/user/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/user/dashboard'
    },
    {
      name: 'Buy License',
      href: '/user/buy',
      icon: ShoppingCart,
      current: location.pathname === '/user/buy'
    },
    {
      name: 'Checkout',
      href: '/user/checkout',
      icon: CreditCard,
      current: location.pathname === '/user/checkout'
    },
    {
      name: 'My Licenses',
      href: '/user/licenses',
      icon: FileText,
      current: location.pathname === '/user/licenses'
    },
    {
      name: 'Withdrawals',
      href: '/user/withdrawals',
      icon: DollarSign,
      current: location.pathname === '/user/withdrawals'
    },
    {
      name: 'Profile',
      href: '/user/profile',
      icon: User,
      current: location.pathname === '/user/profile'
    },
    {
      name: 'Referrals',
      href: '/user/referrals',
      icon: Users,
      current: location.pathname === '/user/referrals'
    },
    {
      name: 'Contacto',
      href: '/user/contact',
      icon: MessageCircle,
      current: location.pathname === '/user/contact'
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
        fixed inset-y-0 left-0 z-30 w-64 bg-gradient-to-b from-gray-900 via-slate-900 to-gray-900 shadow-2xl transform transition-transform duration-300 ease-in-out border-r border-gray-700/50
        lg:translate-x-0 lg:relative lg:inset-auto lg:h-screen
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center px-6 py-6 bg-gradient-to-r from-slate-900 to-gray-900 relative overflow-hidden flex-shrink-0">
            <div className="absolute inset-0 bg-gradient-to-r from-slate-800/30 to-gray-800/30"></div>
            <div className="relative flex items-center space-x-3">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg border border-blue-400/30">
                <ProFitAgentLogo size="lg" variant="white" className="text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">ProFitAgent</h1>
                <p className="text-xs text-gray-300">AI Arbitrage Platform</p>
              </div>
            </div>
          </div>

          {/* User info */}
          <div className="px-6 py-6 border-b border-slate-700/50 flex-shrink-0">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center shadow-lg">
                  <span className="text-sm font-medium text-white">
                    {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
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
                  {user?.role === 'admin' ? 'Administrator' : 'Usuario'}
                </p>
              </div>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto scrollbar-dark" style={{
            scrollbarWidth: 'thin',
            scrollbarColor: '#475569 #1e293b'
          }}>
            {/* Navigation */}
            <nav className="px-6 py-6 space-y-3">
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
                          ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border-r-4 border-blue-400 shadow-lg backdrop-blur-sm'
                          : 'text-slate-300 hover:bg-blue-800/30 hover:text-white hover:shadow-md'
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
          </div>

          {/* Bottom actions - Fixed at bottom */}
          <div className="px-6 py-6 border-t border-slate-700/50 space-y-3 flex-shrink-0">
            <Link
              to="/user/settings"
              onClick={onClose}
              className={`group flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 ${
                location.pathname === '/user/settings'
                  ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 text-blue-400 border-r-4 border-blue-400 shadow-lg backdrop-blur-sm'
                  : 'text-slate-300 hover:bg-blue-800/30 hover:text-white hover:shadow-md'
              }`}
            >
              <Settings className={`mr-3 h-5 w-5 ${
                location.pathname === '/user/settings' ? 'text-blue-400' : 'text-slate-400 group-hover:text-slate-200'
              }`} />
              Settings
            </Link>
            
            <button
              onClick={handleLogout}
              className="w-full group flex items-center px-4 py-3 text-sm font-medium text-red-400 rounded-xl hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 hover:shadow-md"
            >
              <LogOut className="mr-3 h-5 w-5 text-red-400 group-hover:text-red-300" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Sidebar;

