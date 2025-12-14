import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, AlertCircle, Loader } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import "./Login.css";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await login(email, password);
      toast.success("Login successful! Welcome back to StockDash");
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Login failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container min-h-screen flex items-center justify-center p-4">
      <div className="login-overlay"></div>
      <div className="w-full max-w-md login-content">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="rounded-xl bg-gradient-to-br from-blue-500 via-blue-600 to-violet-600 p-3 shadow-lg">
              <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10.5 1.5H5a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8.5M10 1v6h6M11 12H9M11 15H9" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">StockDash</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Sign in to your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/30 dark:shadow-none p-8 space-y-6">
          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="____@gmail.com"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="password"
                className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-slate-700 dark:text-white"
                required
              />
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-500 via-blue-600 to-violet-600 hover:from-blue-600 hover:to-violet-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader className="h-5 w-5 animate-spin" />
                Signing in...
              </>
            ) : (
              "Sign In"
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">Don't have an account?</span>
            </div>
          </div>

          {/* Sign Up Link */}
          <Link
            to="/register"
            className="w-full border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            Create Account
          </Link>
        </form>
      </div>
    </div>
  );
}
