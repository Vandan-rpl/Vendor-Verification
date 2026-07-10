import { Navigate } from "react-router-dom";
import { useAuth } from "../Context/authContext"; // adjust the path

const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;