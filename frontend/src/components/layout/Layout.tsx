import React, { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import Sidebar from './Sidebar';
import NotificationCenter from '../NotificationCenter';
import { useAuth } from '../../contexts/AuthContext';

interface LayoutProps {
  children: React.ReactNode;
  title?: string;
}

const Layout: React.FC<LayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="h-screen bg-gray-50 flex overflow-hidden">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top header */}
        <div className="flex-shrink-0 bg-white/80 backdrop-blur-md shadow-lg border-b border-emerald-200/50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Left side */}
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  type="button"
                  className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-emerald-500 transition-all duration-200"
                  onClick={() => setSidebarOpen(true)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Menu className="h-6 w-6" />
                </button>
                
                {/* Page title */}
                {title && (
                  <h1 className="ml-2 sm:ml-4 text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-emerald-700 bg-clip-text text-transparent truncate">
                    {title}
                  </h1>
                )}
              </div>

              {/* Right side */}
              <div className="flex items-center space-x-2 sm:space-x-4">
                {/* Search */}
                <div className="hidden lg:block">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-emerald-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Search..."
                      className="block w-full pl-10 pr-3 py-2 border border-emerald-200 rounded-xl leading-5 bg-white/70 backdrop-blur-sm placeholder-emerald-400 focus:outline-none focus:placeholder-emerald-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 sm:text-sm transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Mobile search button */}
                <button className="lg:hidden p-2 text-emerald-500 hover:text-emerald-600 hover:bg-emerald-50 focus:outline-none focus:ring-2 focus:ring-emerald-500 rounded-xl transition-all duration-200">
                  <span className="sr-only">Search</span>
                  <Search className="h-5 w-5" />
                </button>

                {/* Notifications */}
                <NotificationCenter className="" />

                {/* User menu */}
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 flex items-center justify-center shadow-lg">
                      <span className="text-sm font-medium text-white">
                        {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'U'}
                      </span>
                    </div>
                  </div>
                  <div className="hidden sm:block ml-2 lg:ml-3">
                    <div className="text-sm font-medium text-slate-800 truncate max-w-32 lg:max-w-none">
                      {user?.first_name && user?.last_name 
                        ? `${user.first_name} ${user.last_name}`
                        : user?.email
                      }
                    </div>
                    <div className="text-xs text-emerald-600">
                      {user?.role === 'admin' ? 'Administrator' : 'Investor'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-emerald-50 to-teal-100">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export { Layout };
export default Layout;