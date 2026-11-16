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

        <Route path="gift-studio" element={soon("Gift Studio", "Phase 6", "Build a gift from prayer dresses, mats and packaging, with a personal message. Until then, tell us what you have in mind.", "I would like help choosing a gift.")} />
        <Route path="bespoke" element={soon("Bespoke tailoring", "Phase 5", "The custom-order form arrives soon. Until then, message us your design idea and measurements.", "I would like a custom-made outfit.")} />
        <Route path="bookings" element={soon("Book a fitting", "Phase 5", "Online appointment booking arrives soon. Until then, message us to arrange a time.", "I would like to book a consultation or fitting.")} />
        <Route path="about" element={<ContentPage slug="about" fallback={soon("About us", "soon", "Our story will be shared here soon.")} />} />
        <Route path="journal" element={<JournalPage />} />
        <Route path="journal/:slug" element={<JournalPostPage />} />
        <Route path="faq" element={<ContentPage slug="faq" fallback={soon("Frequently asked questions", "soon", "Answers to common questions will appear here soon.", "I have a question.")} />} />
        <Route path="policies" element={<ContentPage slug="policies" fallback={soon("Policies", "soon", "Delivery, returns and privacy policies will be published here once the business confirms them.")} />} />
        <Route path="checkout" element={soon("Checkout", "Phase 4", "Secure online payment is not switched on yet. Send your cart to us on WhatsApp to order.", "I would like to place an order.")} />

        <Route path="account" element={<AccountPage />} />
        <Route path="account/login" element={<LoginPage />} />
        <Route path="account/register" element={<RegisterPage />} />
        <Route path="account/orders" element={soon("My orders", "Phase 4", "Order tracking arrives with online checkout.")} />
        <Route path="account/wishlist" element={<WishlistPage />} />
        <Route path="account/addresses" element={soon("My addresses", "Phase 4", "Saved addresses arrive with online checkout.")} />
        <Route path="account/bookings" element={soon("My bookings", "Phase 5", "Your appointments will be listed here.")} />

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
          <Route path="*" element={soon("Coming soon", "Phase 3 to 7", "This admin module is built in a later phase.")} />
        </Route>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
