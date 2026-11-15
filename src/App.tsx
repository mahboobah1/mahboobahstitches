import { Route, Routes } from "react-router-dom";
import { Layout } from "./components/Layout";
import CartPage from "./pages/CartPage";
import CollectionPage from "./pages/CollectionPage";
import CollectionsPage from "./pages/CollectionsPage";
import ComingSoonPage from "./pages/ComingSoonPage";
import ContactPage from "./pages/ContactPage";
import HomePage from "./pages/HomePage";
import NotFoundPage from "./pages/NotFoundPage";
import ProductPage from "./pages/ProductPage";
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
        <Route path="about" element={soon("About us", "Phase 7", "Our story will be written here by the owner.")} />
        <Route path="journal" element={soon("Journal", "Phase 7", "Style notes and news will appear here.")} />
        <Route path="journal/:slug" element={<NotFoundPage />} />
        <Route path="faq" element={soon("Frequently asked questions", "Phase 7", "Answers to common questions will appear here.", "I have a question.")} />
        <Route path="policies" element={soon("Policies", "Phase 7", "Delivery, returns and privacy policies will be published here once the business confirms them.")} />
        <Route path="checkout" element={soon("Checkout", "Phase 4", "Secure online payment is not switched on yet. Send your cart to us on WhatsApp to order.", "I would like to place an order.")} />

        <Route path="account" element={soon("My account", "Phase 2", "Sign-in and account pages arrive with the database.")} />
        <Route path="account/orders" element={soon("My orders", "Phase 4", "Order tracking arrives with online checkout.")} />
        <Route path="account/wishlist" element={<WishlistPage />} />
        <Route path="account/addresses" element={soon("My addresses", "Phase 4", "Saved addresses arrive with online checkout.")} />
        <Route path="account/bookings" element={soon("My bookings", "Phase 5", "Your appointments will be listed here.")} />

        {/* Admin is intentionally empty until real authentication exists (Phase 2). */}
        <Route path="admin/*" element={soon("Admin", "Phase 2 and 3", "The administration area is built after secure sign-in is in place. Nothing is exposed here.")} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}
