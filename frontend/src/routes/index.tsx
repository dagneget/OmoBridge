import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import AuthLayout from '../components/layout/AuthLayout';
import DashboardLayout from '../components/layout/DashboardLayout';
import ErrorBoundary from '../components/common/ErrorBoundary';
import RoleGuard from './RoleGuard';
import { Roles, getDefaultDashboardRoute } from '../features/auth/roleHelpers';
import { useAuthStore } from '../features/auth/authStore';

// Lazy-loaded Public Pages
const HomePage = lazy(() => import('../pages/public/HomePage'));
const ProductsPage = lazy(() => import('../pages/public/ProductsPage'));
const ProductDetailsPage = lazy(() => import('../pages/public/ProductDetailsPage'));
const TourismPage = lazy(() => import('../pages/public/TourismPage'));
const ServicesPage = lazy(() => import('../pages/public/ServicesPage'));
const ExperienceDetailsPage = lazy(() => import('../pages/public/ExperienceDetailsPage'));
const HotelsPage = lazy(() => import('../pages/public/HotelsPage'));
const GuidesPage = lazy(() => import('../pages/public/GuidesPage'));
const TransportPage = lazy(() => import('../pages/public/TransportPage'));
const SafetyGuidelinesPage = lazy(() => import('../pages/public/SafetyGuidelinesPage'));
const TestimonialsPage = lazy(() => import('../pages/public/TestimonialsPage'));
const ContactPage = lazy(() => import('../pages/public/ContactPage'));
const BookingPage = lazy(() => import('../pages/public/BookingPage'));
const CartPage = lazy(() => import('../pages/public/CartPage'));
const CheckoutPage = lazy(() => import('../pages/public/CheckoutPage'));
const AboutPage = lazy(() => import('../pages/public/AboutPage'));
const OfflinePage = lazy(() => import('../pages/public/OfflinePage'));
const DesignTokensPage = lazy(() => import('../pages/public/DesignTokensPage'));
const NotFoundPage = lazy(() => import('../pages/public/NotFoundPage'));
const JoinPage = lazy(() => import('../pages/public/JoinPage'));
const OrdersPage = lazy(() => import('../pages/account/OrdersPage'));
const OrderDetailPage = lazy(() => import('../pages/account/OrderDetailPage'));
const AccountPage = lazy(() => import('../pages/account/AccountPage'));

// Lazy-loaded Auth Pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterBuyerPage = lazy(() => import('../pages/auth/RegisterBuyerPage'));
const RegisterProducerPage = lazy(() => import('../pages/auth/RegisterProducerPage'));
const RegisterEnterprisePage = lazy(() => import('../pages/auth/RegisterEnterprisePage'));
const RegisterDeliveryPage = lazy(() => import('../pages/auth/RegisterDeliveryPage'));
const RegisterGuidePage = lazy(() => import('../pages/auth/RegisterGuidePage'));
const ForbiddenPage = lazy(() => import('../pages/auth/ForbiddenPage'));

// Lazy-loaded Trace & Tracking
const PublicTracePage = lazy(() => import('../pages/trace/PublicTracePage'));
const LiveTrackingPage = lazy(() => import('../pages/tracking/LiveTrackingPage'));

// Lazy-loaded Dashboard Pages
const EnterpriseDashboardPage = lazy(() => import('../pages/dashboard/EnterpriseDashboardPage'));
const FarmerDashboardPage = lazy(() => import('../pages/dashboard/FarmerDashboardPage'));
const DeliveryDashboardPage = lazy(() => import('../pages/dashboard/DeliveryDashboardPage'));
const GuideDashboardPage = lazy(() => import('../pages/dashboard/GuideDashboardPage'));
const AdminDashboardPage = lazy(() => import('../pages/dashboard/AdminDashboardPage'));

const PageLoader = () => (
  <div className="flex items-center justify-center min-h-[50vh]">
    <div className="w-10 h-10 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
  </div>
);

function DashboardIndexRedirect() {
  const { user } = useAuthStore();
  const destination = getDefaultDashboardRoute(user?.roles);
  return <Navigate to={destination} replace />;
}

export default function AppRoutes() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleForbidden = () => {
      navigate('/forbidden');
    };
    window.addEventListener('omobridge:auth-forbidden', handleForbidden);
    return () => window.removeEventListener('omobridge:auth-forbidden', handleForbidden);
  }, [navigate]);

  return (
    <ErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Storefront Layout */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/products" element={<ProductsPage />} />
            <Route path="/products/:id" element={<ProductDetailsPage />} />
            <Route path="/tourism" element={<TourismPage />} />
            <Route path="/tourism/:id" element={<ExperienceDetailsPage />} />
            <Route path="/services" element={<ServicesPage />} />
            <Route path="/experiences/:id" element={<ExperienceDetailsPage />} />
            <Route path="/hotels" element={<HotelsPage />} />
            <Route path="/guides" element={<GuidesPage />} />
            <Route path="/transport" element={<TransportPage />} />
            <Route path="/safety-guidelines" element={<SafetyGuidelinesPage />} />
            <Route path="/testimonials" element={<TestimonialsPage />} />
            <Route path="/contact" element={<ContactPage />} />
            <Route path="/booking" element={<BookingPage />} />
            <Route path="/cart" element={<CartPage />} />
            <Route path="/checkout" element={<CheckoutPage />} />
            <Route path="/account/orders" element={<OrdersPage />} />
            <Route path="/account/orders/:id" element={<OrderDetailPage />} />
            <Route path="/about" element={<AboutPage />} />
            <Route path="/trace/:token" element={<PublicTracePage />} />
            <Route path="/track/:token" element={<LiveTrackingPage />} />
            <Route path="/design-tokens" element={<DesignTokensPage />} />
            <Route path="/offline" element={<OfflinePage />} />
            <Route path="/forbidden" element={<ForbiddenPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/register" element={<JoinPage />} />
            <Route
              path="/account"
              element={
                <RoleGuard>
                  <AccountPage />
                </RoleGuard>
              }
            />
          </Route>

          {/* Authentication Layout */}
          <Route element={<AuthLayout />}>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/auth/login" element={<LoginPage />} />
            <Route path="/register/buyer" element={<RegisterBuyerPage />} />
            <Route path="/auth/register/buyer" element={<RegisterBuyerPage />} />
            <Route path="/register/producer" element={<RegisterProducerPage />} />
            <Route path="/auth/register/producer" element={<RegisterProducerPage />} />
            <Route path="/register/enterprise" element={<RegisterEnterprisePage />} />
            <Route path="/auth/register/enterprise" element={<RegisterEnterprisePage />} />
            <Route path="/register/delivery" element={<RegisterDeliveryPage />} />
            <Route path="/auth/register/delivery" element={<RegisterDeliveryPage />} />
            <Route path="/register/guide" element={<RegisterGuidePage />} />
            <Route path="/auth/register/guide" element={<RegisterGuidePage />} />
          </Route>

          {/* Role-Aware Protected Dashboard Layout */}
          <Route element={<RoleGuard />}>
            <Route element={<DashboardLayout />}>
              <Route path="/dashboard" element={<DashboardIndexRedirect />} />
              <Route
                path="/dashboard/enterprise"
                element={
                  <RoleGuard allowedRoles={[Roles.MICRO_ENTERPRISE, Roles.SYSTEM_ADMIN]}>
                    <EnterpriseDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/enterprise/*"
                element={
                  <RoleGuard allowedRoles={[Roles.MICRO_ENTERPRISE, Roles.SYSTEM_ADMIN]}>
                    <EnterpriseDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/farmer"
                element={
                  <RoleGuard allowedRoles={[Roles.PRODUCER_FARMER, Roles.SYSTEM_ADMIN]}>
                    <FarmerDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/farmer/*"
                element={
                  <RoleGuard allowedRoles={[Roles.PRODUCER_FARMER, Roles.SYSTEM_ADMIN]}>
                    <FarmerDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/delivery"
                element={
                  <RoleGuard allowedRoles={[Roles.DELIVERY_PROVIDER, Roles.SYSTEM_ADMIN]}>
                    <DeliveryDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/delivery/*"
                element={
                  <RoleGuard allowedRoles={[Roles.DELIVERY_PROVIDER, Roles.SYSTEM_ADMIN]}>
                    <DeliveryDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/guide"
                element={
                  <RoleGuard allowedRoles={[Roles.TOUR_GUIDE, Roles.SYSTEM_ADMIN]}>
                    <GuideDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/guide/*"
                element={
                  <RoleGuard allowedRoles={[Roles.TOUR_GUIDE, Roles.SYSTEM_ADMIN]}>
                    <GuideDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/admin"
                element={
                  <RoleGuard allowedRoles={[Roles.SYSTEM_ADMIN, Roles.TOURISM_AUTHORITY]}>
                    <AdminDashboardPage />
                  </RoleGuard>
                }
              />
              <Route
                path="/dashboard/admin/*"
                element={
                  <RoleGuard allowedRoles={[Roles.SYSTEM_ADMIN, Roles.TOURISM_AUTHORITY]}>
                    <AdminDashboardPage />
                  </RoleGuard>
                }
              />
            </Route>
          </Route>

          {/* 404 Not Found Catch-All */}
          <Route path="*" element={<PublicLayout />}>
            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </ErrorBoundary>
  );
}
