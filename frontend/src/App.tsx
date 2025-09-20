import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/user/DashboardPage';
import BuyPage from './pages/user/BuyPage';
import CheckoutPage from './pages/user/CheckoutPage';
import LicensesPage from './pages/user/LicensesPage';
import ProfilePage from './pages/user/ProfilePage';
import SettingsPage from './pages/user/SettingsPage';
import LoginPage from './pages/auth/LoginPage';
import RegisterPage from './pages/auth/RegisterPage';
import AdminLoginPage from './pages/auth/AdminLoginPage';
import ForgotPasswordPage from './pages/auth/ForgotPasswordPage';
import AdminDashboard from './pages/admin/AdminDashboard';
import UsersPage from './pages/admin/UsersPage';
import ProductsPage from './pages/admin/ProductsPage';
import AdminWalletsPage from './pages/admin/AdminWalletsPage';
import AdminOrdersPage from './pages/admin/AdminOrdersPage';
import AdminLicensesPage from './pages/admin/AdminLicensesPage';
import AdminProfilePage from './pages/admin/AdminProfilePage';
import UserReferralsPage from './pages/user/UserReferralsPage';
import UserWithdrawalsPage from './pages/user/UserWithdrawalsPage';
import AdminReferralsPage from './pages/admin/AdminReferralsPage';
import AdminWithdrawalsPage from './pages/admin/AdminWithdrawalsPage';
import AdminSettingsPage from './pages/admin/AdminSettingsPage';
import AdminBonusesPage from './pages/admin/AdminBonusesPage';
import AdminTelegramPage from './pages/admin/AdminTelegramPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import ContactPage from './pages/user/ContactPage';
import ProtectedRoute from './components/auth/ProtectedRoute';




// Main App Component
const AppContent: React.FC = () => {
  return (
    <Routes>
      {/* Landing Page */}
      <Route path="/" element={<LandingPage />} />
      
      {/* Authentication Routes */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/admin/login" element={<AdminLoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      
      {/* Legal Pages */}
      <Route path="/terms" element={<TermsPage />} />
      <Route path="/privacy" element={<PrivacyPage />} />
      
      {/* User Routes */}
      <Route
        path="/user/dashboard"
        element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/buy"
        element={
          <ProtectedRoute>
            <BuyPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/checkout/:orderId"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/checkout"
        element={
          <ProtectedRoute>
            <CheckoutPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/licenses"
        element={
          <ProtectedRoute>
            <LicensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/licenses/:id"
        element={
          <ProtectedRoute>
            <LicensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/profile"
        element={
          <ProtectedRoute>
            <ProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/settings"
        element={
          <ProtectedRoute>
            <SettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/referrals"
        element={
          <ProtectedRoute>
            <UserReferralsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/withdrawals"
        element={
          <ProtectedRoute>
            <UserWithdrawalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/user/contact"
        element={
          <ProtectedRoute>
            <ContactPage />
          </ProtectedRoute>
        }
      />
      
      {/* Admin Routes */}
      <Route
        path="/admin/dashboard"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminDashboard />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <ProtectedRoute adminOnly={true}>
            <UsersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/products"
        element={
          <ProtectedRoute adminOnly={true}>
            <ProductsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/wallets"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminWalletsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/orders"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminOrdersPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/licenses"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminLicensesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/referrals"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminReferralsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/withdrawals"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminWithdrawalsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/bonuses"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminBonusesPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/profile"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminProfilePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/settings"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminSettingsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin/telegram"
        element={
          <ProtectedRoute adminOnly={true}>
            <AdminTelegramPage />
          </ProtectedRoute>
        }
      />
      
      {/* Default Routes */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;