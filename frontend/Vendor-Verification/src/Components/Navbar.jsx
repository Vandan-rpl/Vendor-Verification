import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../Context/authContext";

function Navbar() {
  const { isAuthenticated, logout, loading } = useAuth();
  const navigate = useNavigate();

  if (loading) return null;

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <nav className="bg-slate-900 text-white shadow-lg border-b border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo / Title */}
          <div className="flex-shrink-0">
            <h1 className="text-xl font-bold tracking-tight bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Vendor Verification
            </h1>
          </div>

          {/* Navigation Links */}
          {isAuthenticated ? (
            <div className="hidden md:block">
              <ul className="flex space-x-8 text-sm font-medium">
                <li>
                  <Link
                    to="/"
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-md transition-colors duration-200"
                  >
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link
                    to="/uploadVendor"
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-md transition-colors duration-200"
                  >
                    Upload Vendors
                  </Link>
                </li>
                <li>
                  <Link
                    to="/responses"
                    className="text-slate-300 hover:text-white hover:bg-slate-800 px-3 py-2 rounded-md transition-colors duration-200"
                  >
                    Responses
                  </Link>
                </li>
              </ul>
            </div>
          ) : (
            <></>
          )}

          {/* Action Button (Login/Logout) */}
          <div>
            {isAuthenticated ? (
              <button
                className="bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border border-red-500/20 hover:border-transparent"
                onClick={handleLogout}
              >
                Logout
              </button>
            ) : (
              <Link
                className="bg-red-500/10 text-red-400 hover:bg-red-600 hover:text-white px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 cursor-pointer border border-red-500/20 hover:border-transparent"
                to="/login"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
