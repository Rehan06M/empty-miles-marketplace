
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { LandingPage } from "./pages/public/LandingPage";
import { DesignSystemPreview } from "./pages/public/DesignSystemPreview";

import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

import { ShipperDashboard } from "./pages/shipper/ShipperDashboard";
import { CarrierDashboard } from "./pages/carrier/CarrierDashboard";
import { AdminDashboard } from "./pages/admin/AdminDashboard";

import { MarketplaceScreen } from "./components/marketplace/MarketplaceScreen";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public pages */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Development dashboards */}
        <Route
          path="/demo/shipper"
          element={<ShipperDashboard />}
        />
        <Route
          path="/demo/carrier"
          element={<CarrierDashboard />}
        />
        <Route
          path="/demo/admin"
          element={<AdminDashboard />}
        />

        {/* Shipper marketplace */}
        <Route
          path="/demo/shipper/loads"
          element={<MarketplaceScreen screen="loads" />}
        />
        <Route
          path="/demo/shipper/matches"
          element={<MarketplaceScreen screen="matches" />}
        />
        <Route
          path="/demo/shipper/bookings"
          element={<MarketplaceScreen screen="bookings" />}
        />

        {/* Carrier marketplace */}
        <Route
          path="/demo/carrier/trucks"
          element={<MarketplaceScreen screen="trucks" />}
        />
        <Route
          path="/demo/carrier/empty-legs"
          element={<MarketplaceScreen screen="empty-legs" />}
        />
        <Route
          path="/demo/carrier/requests"
          element={<MarketplaceScreen screen="requests" />}
        />

        {/* Design system */}
        <Route
          path="/design-preview"
          element={<DesignSystemPreview />}
        />

        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
