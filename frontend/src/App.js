import React from 'react';
import './App.css';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { SettingsProvider } from './contexts/SettingsContext';
import { CartProvider } from './contexts/CartContext'
import { PaymentProvider } from './contexts/PaymentContext'
import { UserAbonnementProvider } from './contexts/UserAbonnementContext'
import { ResourceViewerProvider } from './contexts/ResourceViewerContext'
import { LoadingProvider } from './contexts/LoadingContext'
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Browse from './pages/Browse';
import CreateMemorial from './pages/CreateMemorial';
import MemorialDetailNew from './pages/MemorialDetailNew';
import MemorialManagement from './components/MemorialManagement'
import { Toaster } from './components/ui/toaster';

// Admin imports
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import DashboardHome from './pages/admin/DashboardHome';
import SiteSettings from './pages/admin/SiteSettings';
import LayoutSettings from './pages/admin/LayoutSettings';
import FormFields from './pages/admin/FormFields';
import Users from './pages/admin/Users';
import Memorials from './pages/admin/Memorials';
import Abonnements from './pages/admin/Abonnements'
import ProtectedRoute from './components/ProtectedRoute';
import Cart from './components/Cart'

// User imports
import UserLogin from './pages/UserLogin';
import UserProfile from './pages/UserProfile';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <AuthProvider>
          <SettingsProvider>
          <PaymentProvider>
            <CartProvider>
              <ResourceViewerProvider>
                <LoadingProvider>
                  <Routes>
                      {/* Admin Routes */}
                      <Route path="/admin/login" element={<AdminLogin />} />
                      <Route
                        path="/admin/*"
                        element={
                          <ProtectedRoute adminOnly>
                            <AdminDashboard />
                          </ProtectedRoute>
                        }
                      >
                        <Route path="dashboard" element={<DashboardHome />} />
                        <Route path="site-settings" element={<SiteSettings />} />
                        <Route path="layout-settings" element={<LayoutSettings />} />
                        <Route path="form-fields" element={<FormFields />} />
                        <Route path="users" element={<Users />} />
                        <Route path="memorials" element={<Memorials />} />
                        <Route path='abonnements' element={<Abonnements />} />
                      </Route>

                      {/* User Routes */}
                      <Route path="/login" element={<UserLogin />} />
                      <Route
                        path="/profile"
                        element={
                          <ProtectedRoute managerOnly>
                            <UserAbonnementProvider>
                              <Header />
                              <UserProfile />
                              <Footer />
                            </UserAbonnementProvider>
                          </ProtectedRoute>
                        }
                      />

                      <Route
                        path="/management/memorial/:id"
                        element={
                          <ProtectedRoute managerOnly={true}>
                            <UserAbonnementProvider>
                              <Header />
                              <MemorialManagement />
                              <Footer />
                            </UserAbonnementProvider>
                          </ProtectedRoute>
                        }
                      />

                      {/* Public Routes */}
                      <Route
                        path="/*"
                        element={
                          <>
                            <Header />
                            <Routes>
                              <Route path="/" element={<Home />} />
                              <Route path="/browse" element={<Browse />} />
                              <Route path="/create" element={<CreateMemorial />} />
                              <Route path="/memorial/:id" element={<MemorialDetailNew />} />
                              <Route path="/cart/:abonnementId" element={<Cart />} />
                            </Routes>
                            <Footer />
                          </>
                        }
                      />
                    </Routes>
                </LoadingProvider>
              </ResourceViewerProvider>
              <Toaster />
            </CartProvider>
          </PaymentProvider>
          </SettingsProvider>
        </AuthProvider>
      </BrowserRouter>
    </div>
  );
}

export default App;
