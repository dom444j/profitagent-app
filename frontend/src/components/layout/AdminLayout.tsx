import React, { useState } from 'react';
import { Menu, Search } from 'lucide-react';
import AdminSidebar from './AdminSidebar';
import NotificationCenter from '../NotificationCenter';
import { useAuth } from '../../contexts/AuthContext';

interface AdminLayoutProps {
  children: React.ReactNode;
  title?: string;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children, title }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <AdminSidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Main content */}
      <div className="flex-1 lg:ml-64">
        {/* Top header */}
        <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-md shadow-lg border-b border-blue-200/50">
          <div className="px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between h-16">
              {/* Left side */}
              <div className="flex items-center">
                {/* Mobile menu button */}
                <button
                  type="button"
                  className="lg:hidden -ml-0.5 -mt-0.5 h-12 w-12 inline-flex items-center justify-center rounded-xl text-slate-500 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 transition-all duration-200"
                  onClick={() => setSidebarOpen(true)}
                >
                  <span className="sr-only">Open sidebar</span>
                  <Menu className="h-6 w-6" />
                </button>
                
                {/* Page title */}
                {title && (
                  <h1 className="ml-2 sm:ml-4 text-lg sm:text-xl lg:text-2xl font-bold bg-gradient-to-r from-slate-800 to-blue-700 bg-clip-text text-transparent truncate">
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
                      <Search className="h-5 w-5 text-blue-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Buscar..."
                      className="block w-full pl-10 pr-3 py-2 border border-blue-200 rounded-xl leading-5 bg-white/70 backdrop-blur-sm placeholder-blue-400 focus:outline-none focus:placeholder-blue-300 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm transition-all duration-200"
                    />
                  </div>
                </div>

                {/* Mobile search button */}
                <button className="lg:hidden p-2 text-blue-500 hover:text-blue-600 hover:bg-blue-50 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded-xl transition-all duration-200">
                  <span className="sr-only">Search</span>
                  <Search className="h-5 w-5" />
                </button>

                {/* Notifications */}
                <NotificationCenter className="" />

                {/* User menu */}
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <div className="h-10 w-10 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg">
                      <span className="text-sm font-medium text-white">
                        {user?.first_name?.[0] || user?.email?.[0]?.toUpperCase() || 'A'}
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
                    <div className="text-xs text-blue-600">
                      {user?.role === 'admin' ? 'Administrator' : 'Admin'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-y-auto min-h-[calc(100vh-4rem)]">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default AdminLayout;