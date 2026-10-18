import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import PublicLayout from '../components/layout/PublicLayout';
import AuthLayout from '../components/layout/AuthLayout';
import DashboardLayout from '../components/layout/DashboardLayout';
import ErrorBoundary from '../components/common/ErrorBoundary';

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

// Lazy-loaded Auth Pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const RegisterBuyerPage = lazy(() => import('../pages/auth/RegisterBuyerPage'));
const RegisterProducerPage = lazy(() => import('../pages/auth/RegisterProducerPage'));
const RegisterEnterprisePage = lazy(() => import('../pages/auth/RegisterEnterprisePage'));
const RegisterDeliveryPage = lazy(() => import('../pages/auth/RegisterDeliveryPage'));

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

export default function AppRoutes() {
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
            <Route path="/about" element={<AboutPage />} />
            <Route path="/trace/:token" element={<PublicTracePage />} />
            <Route path="/track/:token" element={<LiveTrackingPage />} />
            <Route path="/design-tokens" element={<DesignTokensPage />} />
            <Route path="/offline" element={<OfflinePage />} />
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
          </Route>

          {/* Role-Aware Dashboard Layout */}
          <Route element={<DashboardLayout />}>
            <Route path="/dashboard" element={<Navigate to="/dashboard/enterprise" replace />} />
            <Route path="/dashboard/enterprise" element={<EnterpriseDashboardPage />} />
            <Route path="/dashboard/enterprise/*" element={<EnterpriseDashboardPage />} />
            <Route path="/dashboard/farmer" element={<FarmerDashboardPage />} />
            <Route path="/dashboard/farmer/*" element={<FarmerDashboardPage />} />
            <Route path="/dashboard/delivery" element={<DeliveryDashboardPage />} />
            <Route path="/dashboard/delivery/*" element={<DeliveryDashboardPage />} />
            <Route path="/dashboard/guide" element={<GuideDashboardPage />} />
            <Route path="/dashboard/guide/*" element={<GuideDashboardPage />} />
            <Route path="/dashboard/admin" element={<AdminDashboardPage />} />
            <Route path="/dashboard/admin/*" element={<AdminDashboardPage />} />
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
