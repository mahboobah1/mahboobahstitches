import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { CatalogueProvider } from "./context/CatalogueContext";
import { SiteProvider } from "./context/SiteContext";
import { StoreProvider } from "./context/StoreContext";
import "./styles/index.css";

createRoot(document.getElementById("root") as HTMLElement).render(
  <StrictMode>
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "") || "/"}>
      <SiteProvider>
        <AuthProvider>
          <CatalogueProvider>
            <StoreProvider>
              <App />
            </StoreProvider>
          </CatalogueProvider>
        </AuthProvider>
      </SiteProvider>
    </BrowserRouter>
  </StrictMode>,
);
