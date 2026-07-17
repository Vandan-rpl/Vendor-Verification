import "./App.css";
import { BrowserRouter as Router, Routes, Route, useLocation } from "react-router-dom";
import Login from "./Pages/Login";
import Navbar from "./Components/Navbar";
import { Toaster } from "react-hot-toast";
import Dashboard from "./Pages/Dashboard";
import VendorResponse from "./Pages/VendorResponse";
import VendorUpload from "./Pages/VendorUpload";
import VerifyPage from "./Pages/VerifyPage";
import ProtectedRoute from "./Components/protectedRoutes";

function AppLayout() {
  const location = useLocation();

  // Only hide the navbar on the public vendor-facing verify page
  const isVerifyPage = location.pathname.startsWith("/verify/");

  return (
    <>
      {!isVerifyPage && <Navbar />}
      <Toaster />

      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />

        <Route
          path="/responses"
          element={
            <ProtectedRoute>
              <VendorResponse />
            </ProtectedRoute>
          }
        />

        <Route
          path="/uploadVendor"
          element={
            <ProtectedRoute>
              <VendorUpload />
            </ProtectedRoute>
          }
        />

        <Route path="/login" element={<Login />} />
        <Route path="/verify/:token" element={<VerifyPage />} />
      </Routes>
    </>
  );
}

function App() {
  return (
    <Router>
      <AppLayout />
    </Router>
  );
}

export default App;