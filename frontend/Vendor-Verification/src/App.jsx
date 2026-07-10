import "./App.css";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Login from "./Pages/Login";
import Navbar from "./Components/Navbar";
import { Toaster } from "react-hot-toast";
import Dashboard from "./Pages/Dashboard";
import VendorResponse from "./Pages/VendorResponse";
import VendorUpload from "./Pages/VendorUpload";
import ProtectedRoute from "./Components/protectedRoutes";

function App() {
  return (
    <>
      <Router>
        <Navbar />
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
        </Routes>
      </Router>
    </>
  );
}

export default App;
