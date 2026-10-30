
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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public website */}
        <Route path="/" element={<LandingPage />} />

        {/* Authentication UI */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Development previews — not protected routes */}
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

        {/* Design system preview */}
        <Route
          path="/design-preview"
          element={<DesignSystemPreview />}
        />

        {/* Fallback */}
        <Route
          path="*"
          element={<Navigate to="/" replace />}
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
