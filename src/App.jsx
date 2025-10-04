import { Routes, Route, Navigate } from "react-router-dom";
import { useContext } from "react";
import { UserContext } from "./context/UserContext.jsx";
import './index.css';

import Login from "./pages/Login.jsx";
import SignUp from "./pages/Signup.jsx";
import ExpensesPage from "./pages/ExpensesPage.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import NotFound from "./pages/Notfound.jsx";

export default function App() {
  const { user, loading } = useContext(UserContext);

  if (loading) return <div className="text-center mt-12">Loading...</div>;

  const isLoggedIn = !!user;

  // Public route: redirect logged-in users based on role
  const PublicRoute = ({ children }) => {
    if (!isLoggedIn) return children;
    return <Navigate to={user.role.toLowerCase() === "admin" ? "/admin" : "/expenses"} replace />;
  };

  // Protected route: redirect not logged-in users to /login
  const ProtectedRoute = ({ children }) => {
    return isLoggedIn ? children : <Navigate to="/login" replace />;
  };

  // Admin route: only allow admin users
  const AdminRoute = ({ children }) => {
    if (!isLoggedIn) return <Navigate to="/login" replace />;
    if (user.role.toLowerCase() !== "admin") return <Navigate to="/expenses" replace />;
    return children;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={
          <PublicRoute>
            <Login />
          </PublicRoute>
        }
      />
      <Route
        path="/signup"
        element={
          <PublicRoute>
            <SignUp />
          </PublicRoute>
        }
      />

      {/* Protected Routes */}
      <Route
        path="/expenses"
        element={
          <ProtectedRoute>
            <ExpensesPage />
          </ProtectedRoute>
        }
      />

      {/* Admin Routes */}
      <Route
        path="/admin"
        element={
          <AdminRoute>
            <AdminDashboard />
          </AdminRoute>
        }
      />

      {/* Catch-all 404 */}
      <Route
        path="*"
        element={<NotFound />}
      />
    </Routes>
  );
}
