
import {
  BrowserRouter,
  Navigate,
  Route,
  Routes,
} from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ProtectedRoute } from "./routes/ProtectedRoute";

import { LandingPage } from "./pages/public/LandingPage";
import { DesignSystemPreview } from "./pages/public/DesignSystemPreview";

import { LoginPage } from "./pages/auth/LoginPage";
import { RegisterPage } from "./pages/auth/RegisterPage";

import { ShipperDashboard } from "./pages/shipper/ShipperDashboard";
import { CarrierDashboard } from "./pages/carrier/CarrierDashboard";
import { AdminDashboard } from "./pages/admin/AdminDashboard";

import { MarketplaceScreen } from "./components/marketplace/MarketplaceScreen";
import { RouteMapPage } from "./pages/maps/RouteMapPage";
import { ShipperLoadsPage } from "./pages/shipper/ShipperLoadsPage";

function ShipperOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["SHIPPER"]}>
      {children}
    </ProtectedRoute>
  );
}

function CarrierOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["CARRIER"]}>
      {children}
    </ProtectedRoute>
  );
}

function AdminOnly({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ProtectedRoute allowedRoles={["ADMIN"]}>
      {children}
    </ProtectedRoute>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public landing page */}
          <Route path="/" element={<LandingPage />} />

          {/* Authentication */}
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />

          {/* Authenticated shipper workspace */}
          <Route
            path="/app/shipper"
            element={
              <ShipperOnly>
                <ShipperDashboard />
              </ShipperOnly>
            }
          />
          <Route
            path="/app/shipper/loads"
            element={
              <ShipperOnly>
                <ShipperLoadsPage />
              </ShipperOnly>
            }
          />
          <Route
            path="/app/shipper/map"
            element={
              <ShipperOnly>
                <RouteMapPage role="shipper" />
              </ShipperOnly>
            }
          />
          <Route
            path="/app/shipper/matches"
            element={
              <ShipperOnly>
                <MarketplaceScreen screen="matches" />
              </ShipperOnly>
            }
          />
          <Route
            path="/app/shipper/bookings"
            element={
              <ShipperOnly>
                <MarketplaceScreen screen="bookings" />
              </ShipperOnly>
            }
          />

          {/* Authenticated carrier workspace */}
          <Route
            path="/app/carrier"
            element={
              <CarrierOnly>
                <CarrierDashboard />
              </CarrierOnly>
            }
          />
          <Route
            path="/app/carrier/trucks"
            element={
              <CarrierOnly>
                <MarketplaceScreen screen="trucks" />
              </CarrierOnly>
            }
          />
          <Route
            path="/app/carrier/empty-legs"
            element={
              <CarrierOnly>
                <MarketplaceScreen screen="empty-legs" />
              </CarrierOnly>
            }
          />
          <Route
            path="/app/carrier/map"
            element={
              <CarrierOnly>
                <RouteMapPage role="carrier" />
              </CarrierOnly>
            }
          />
          <Route
            path="/app/carrier/requests"
            element={
              <CarrierOnly>
                <MarketplaceScreen screen="requests" />
              </CarrierOnly>
            }
          />

          {/* Authenticated admin workspace */}
          <Route
            path="/app/admin"
            element={
              <AdminOnly>
                <AdminDashboard />
              </AdminOnly>
            }
          />

          {/* Existing public development previews */}
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

          <Route
            path="/design-preview"
            element={<DesignSystemPreview />}
          />

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
