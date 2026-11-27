import { Route, Routes } from "react-router-dom";
import { AdminLayout } from "./components/AdminLayout";
import { Layout } from "./components/Layout";
import AccountPage from "./pages/AccountPage";
import AdminAuditPage from "./pages/AdminAuditPage";
import AdminDashboardPage from "./pages/AdminDashboardPage";
import AdminSetupPage from "./pages/AdminSetupPage";
import AdminCollectionsPage from "./pages/admin/AdminCollectionsPage";
import AdminContentPage from "./pages/admin/AdminContentPage";
import AdminInventoryPage from "./pages/admin/AdminInventoryPage";
import AdminPageEditPage from "./pages/admin/AdminPageEditPage";
import AdminProductEditPage from "./pages/admin/AdminProductEditPage";
import AdminProductsPage from "./pages/admin/AdminProductsPage";
import AdminSettingsPage from "./pages/admin/AdminSettingsPage";
import AdminStaffPage from "./pages/admin/AdminStaffPage";
import AccountAddressesPage from "./pages/AccountAddressesPage";
import AccountOrdersPage from "./pages/AccountOrdersPage";
import AdminOrderPage from "./pages/admin/AdminOrderPage";
import AdminOrdersPage from "./pages/admin/AdminOrdersPage";
import AdminPaymentsPage from "./pages/admin/AdminPaymentsPage";
import AdminPromotionsPage from "./pages/admin/AdminPromotionsPage";
import CheckoutPage from "./pages/CheckoutPage";
import GiftStudioPage from "./pages/GiftStudioPage";
import OrderPage from "./pages/OrderPage";
import AccountBespokePage from "./pages/AccountBespokePage";
import AccountBookingsPage from "./pages/AccountBookingsPage";
import AdminAvailabilityPage from "./pages/admin/AdminAvailabilityPage";
import AdminBespokeDetailPage from "./pages/admin/AdminBespokeDetailPage";
import AdminBespokePage from "./pages/admin/AdminBespokePage";
import AdminBookingPage from "./pages/admin/AdminBookingPage";
import AdminBookingsPage from "./pages/admin/AdminBookingsPage";
import BespokePage from "./pages/BespokePage";
import BespokeRequestPage from "./pages/BespokeRequestPage";
import BookingsPage from "./pages/BookingsPage";
import BookingViewPage from "./pages/BookingViewPage";
import AdminAnalyticsPage from "./pages/admin/AdminAnalyticsPage";
import AdminCustomersPage, { AdminCustomerPage } from "./pages/admin/AdminCustomersPage";
import AdminGiftsPage from "./pages/admin/AdminGiftsPage";
import AdminReviewsPage from "./pages/admin/AdminReviewsPage";
import AdminShippingPage from "./pages/admin/AdminShippingPage";
import AdminSubscribersPage from "./pages/admin/AdminSubscribersPage";
import ContentPage from "./pages/ContentPage";
import { JournalPage, JournalPostPage } from "./pages/JournalPage";
import CartPage from "./pages/CartPage";
import CollectionPage from "./pages/CollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductPage from "./pages/ProductPage";
import RegisterPage from "./pages/RegisterPage";
import ShopPage from "./pages/ShopPage";
import WishlistPage from "./pages/WishlistPage";

const soon = (title: string, phase: string, body: string, whatsappTopic?: string) => (
  <ComingSoonPage title={title} phase={phase} body={body} whatsappTopic={whatsappTopic} />
);

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="shop" element={<ShopPage />} />
        <Route path="collections" element={<CollectionsPage />} />
        <Route path="collections/:slug" element={<CollectionPage />} />
        <Route path="product/:slug" element={<ProductPage />} />
        <Route path="cart" element={<CartPage />} />
        <Route path="contact" element={<ContactPage />} />

        <Route path="gift-studio" element={<GiftStudioPage />} />
        <Route path="bespoke" element={<BespokePage />} />
        <Route path="bespoke/request/:ref" element={<BespokeRequestPage />} />
        <Route path="bookings" element={<BookingsPage />} />
        <Route path="bookings/:ref" element={<BookingViewPage />} />
        <Route path="about" element={<ContentPage slug="about" fallback={soon("About us", "soon", "Our story will be shared here soon.")} />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="journal/:slug" element={<JournalPostPage />} />
        <Route path="faq" element={<ContentPage slug="faq" fallback={soon("Frequently asked questions", "soon", "Answers to common questions will appear here soon.", "I have a question.")} />} />
        <Route path="policies" element={<ContentPage slug="policies" fallback={soon("Policies", "soon", "Delivery, returns and privacy policies will be published here once the business confirms them.")} />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order/:number" element={<OrderPage />} />

        <Route path="account" element={<AccountPage />} />
        <Route path="account/login" element={<LoginPage />} />
        <Route path="account/register" element={<RegisterPage />} />
        <Route path="account/orders" element={<AccountOrdersPage />} />
        <Route path="account/wishlist" element={<WishlistPage />} />
        <Route path="account/addresses" element={<AccountAddressesPage />} />
        <Route path="account/bookings" element={<AccountBookingsPage />} />
        <Route path="account/bespoke" element={<AccountBespokePage />} />

        <Route path="admin/setup" element={<AdminSetupPage />} />
        <Route path="admin" element={<AdminLayout />}>
          <Route index element={<AdminDashboardPage />} />
          <Route path="audit" element={<AdminAuditPage />} />
          <Route path="products" element={<AdminProductsPage />} />
          <Route path="products/:id" element={<AdminProductEditPage />} />
          <Route path="collections" element={<AdminCollectionsPage />} />
          <Route path="inventory" element={<AdminInventoryPage />} />
          <Route path="content" element={<AdminContentPage />} />
          <Route path="content/:id" element={<AdminPageEditPage />} />
          <Route path="settings" element={<AdminSettingsPage />} />
          <Route path="staff" element={<AdminStaffPage />} />
          <Route path="orders" element={<AdminOrdersPage />} />
          <Route path="orders/:id" element={<AdminOrderPage />} />
          <Route path="payments" element={<AdminPaymentsPage />} />
          <Route path="bespoke" element={<AdminBespokePage />} />
          <Route path="bespoke/:id" element={<AdminBespokeDetailPage />} />
          <Route path="bookings" element={<AdminBookingsPage />} />
          <Route path="bookings/:id" element={<AdminBookingPage />} />
          <Route path="availability" element={<AdminAvailabilityPage />} />
          <Route path="gifts" element={<AdminGiftsPage />} />
          <Route path="shipping" element={<AdminShippingPage />} />
          <Route path="customers" element={<AdminCustomersPage />} />
          <Route path="customers/:id" element={<AdminCustomerPage />} />
          <Route path="reviews" element={<AdminReviewsPage />} />
          <Route path="subscribers" element={<AdminSubscribersPage />} />
          <Route path="analytics" element={<AdminAnalyticsPage />} />
          <Route path="promotions" element={<AdminPromotionsPage />} />
          <Route path="*" element={soon("Coming soon", "Phase 3 to 7", "This admin module is built in a later phase.")} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
