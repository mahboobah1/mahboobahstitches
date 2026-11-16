import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import { site } from "../config/site";
import { useStore } from "../context/StoreContext";
import { BagIcon, CloseIcon, HeartIcon, MenuIcon, SearchIcon, UserIcon } from "./Icons";
import { Logo } from "./Logo";

const nav = [
  { to: "/shop", label: "Shop" },
  { to: "/collections", label: "Collections" },
  { to: "/gift-studio", label: "Gift Studio" },
  { to: "/bespoke", label: "Bespoke" },
  { to: "/bookings", label: "Book a fitting" },
  { to: "/about", label: "About" },
];

export function Header() {
  const { count, wishlist } = useStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const navigate = useNavigate();
  const location = useLocation();
  const searchRef = useRef<HTMLInputElement>(null);

  // Close panels on navigation.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [location.pathname]);

  // Escape closes panels; lock page scroll while the mobile menu is open.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setMenuOpen(false);
        setSearchOpen(false);
      }
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = menuOpen ? "hidden" : "";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  useEffect(() => {
    if (searchOpen) searchRef.current?.focus();
  }, [searchOpen]);

  const submitSearch = (e: FormEvent) => {
    e.preventDefault();
    const term = q.trim();
    navigate(term ? `/shop?q=${encodeURIComponent(term)}` : "/shop");
    setSearchOpen(false);
  };

  const iconBtn = "relative flex h-11 w-11 items-center justify-center rounded-full text-royal hover:bg-royal/5";
  const badge =
    "absolute right-0.5 top-0.5 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-royal px-1 text-[11px] font-medium text-cream";

  return (
    <header className="sticky top-0 z-30 border-b border-gold/40 bg-cream/95 backdrop-blur" style={{ paddingTop: "env(safe-area-inset-top)" }}>
      <a href="#main" className="sr-only focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50 focus:bg-white focus:px-3 focus:py-2">
        Skip to content
      </a>
      <div className="bg-royal px-4 py-2 text-center text-xs text-cream">
        {site.demoMode ? "Demo preview: sample products only, not real stock. " : ""}
        {site.announcement}
      </div>

      <div className="wrap flex items-center justify-between gap-2 py-1.5">
        <button
          type="button"
          className={`${iconBtn} lg:hidden`}
          onClick={() => setMenuOpen(true)}
          aria-label="Open menu"
          aria-expanded={menuOpen}
          aria-controls="mobile-menu"
        >
          <MenuIcon />
        </button>

        <div className="lg:mr-4">
          <Logo className="h-14 w-auto lg:h-[4.25rem]" eager />
        </div>

        <nav aria-label="Main" className="hidden flex-1 items-center justify-center gap-7 lg:flex">
          {nav.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) =>
                `py-2 text-sm hover:text-gold-deep ${isActive ? "border-b border-gold" : ""}`
              }
            >
              {n.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center">
          <button type="button" className={iconBtn} onClick={() => setSearchOpen((s) => !s)} aria-label="Search" aria-expanded={searchOpen}>
            <SearchIcon />
          </button>
          <Link to="/account/wishlist" className={`${iconBtn} hidden sm:flex`} aria-label={`Wishlist, ${wishlist.length} saved`}>
            <HeartIcon />
            {wishlist.length > 0 && <span className={badge}>{wishlist.length}</span>}
          </Link>
          <Link to="/account" className={`${iconBtn} hidden sm:flex`} aria-label="My account">
            <UserIcon />
          </Link>
          <Link to="/cart" className={iconBtn} aria-label={`Cart, ${count} items`}>
            <BagIcon />
            {count > 0 && <span className={badge}>{count}</span>}
          </Link>
        </div>
      </div>

      {searchOpen && (
        <form onSubmit={submitSearch} role="search" className="border-t border-gold/30 bg-cream">
          <div className="wrap flex gap-2 py-3">
            <label htmlFor="site-search" className="sr-only">
              Search products
            </label>
            <input
              id="site-search"
              ref={searchRef}
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search abayas, jilbabs, gifts"
              className="field"
              maxLength={80}
            />
            <button type="submit" className="btn-primary">
              Search
            </button>
          </div>
        </form>
      )}

      {menuOpen && (
        <div id="mobile-menu" className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menu">
          <button type="button" className="absolute inset-0 bg-royal-deep/50" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
          <div className="absolute left-0 top-0 flex h-full w-[84%] max-w-sm flex-col overflow-y-auto bg-cream px-6 py-5">
            <div className="flex items-center justify-between">
              <Logo className="h-14 w-auto" />
              <button type="button" className={iconBtn} onClick={() => setMenuOpen(false)} aria-label="Close menu">
                <CloseIcon />
              </button>
            </div>
            <div className="stitch-x my-5" />
            <nav aria-label="Mobile" className="flex flex-col">
              {nav.map((n) => (
                <NavLink key={n.to} to={n.to} className="py-3 font-display text-2xl text-royal">
                  {n.label}
                </NavLink>
              ))}
            </nav>
            <div className="stitch-x my-5" />
            <div className="flex flex-col gap-1 text-sm">
              <Link to="/account/wishlist" className="py-2">
                Wishlist ({wishlist.length})
              </Link>
              <Link to="/account" className="py-2">
                My account
              </Link>
              <Link to="/journal" className="py-2">
                Journal
              </Link>
              <Link to="/contact" className="py-2">
                Contact
              </Link>
              <Link to="/faq" className="py-2">
                FAQ
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
