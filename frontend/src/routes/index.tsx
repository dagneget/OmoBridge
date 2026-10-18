import { Routes, Route } from 'react-router-dom';
import HomePage from '../pages/public/HomePage';
import ProductsPage from '../pages/public/ProductsPage';
import ProductDetailsPage from '../pages/public/ProductDetailsPage';
import TourismPage from '../pages/public/TourismPage';
import ServicesPage from '../pages/public/ServicesPage';
import ExperienceDetailsPage from '../pages/public/ExperienceDetailsPage';
import HotelsPage from '../pages/public/HotelsPage';
import GuidesPage from '../pages/public/GuidesPage';
import TransportPage from '../pages/public/TransportPage';
import SafetyGuidelinesPage from '../pages/public/SafetyGuidelinesPage';
import TestimonialsPage from '../pages/public/TestimonialsPage';
import ContactPage from '../pages/public/ContactPage';
import BookingPage from '../pages/public/BookingPage';
import CartPage from '../pages/public/CartPage';
import CheckoutPage from '../pages/public/CheckoutPage';
import AboutPage from '../pages/public/AboutPage';
import NotFoundPage from '../pages/public/NotFoundPage';
import DesignTokensPage from '../pages/public/DesignTokensPage';

import LoginPage from '../pages/auth/LoginPage';
import RegisterProducerPage from '../pages/auth/RegisterProducerPage';
import RegisterEnterprisePage from '../pages/auth/RegisterEnterprisePage';
import RegisterDeliveryPage from '../pages/auth/RegisterDeliveryPage';

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public Pages */}
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
      <Route path="/design-tokens" element={<DesignTokensPage />} />

      {/* Auth Pages */}
      <Route path="/login" element={<LoginPage />} />
      <Route path="/auth/login" element={<LoginPage />} />
      <Route path="/auth/register/producer" element={<RegisterProducerPage />} />
      <Route path="/auth/register/enterprise" element={<RegisterEnterprisePage />} />
      <Route path="/auth/register/delivery" element={<RegisterDeliveryPage />} />

      {/* Catch-all */}
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
