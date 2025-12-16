import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, User, AlertCircle, Loader, CheckCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";
import "./Register.css";

export default function Register() {
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const navigate = useNavigate();
  const { register } = useAuth();
  const toast = useToast();

  const validateForm = () => {
    const newErrors = {};

    if (!email) newErrors.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) newErrors.email = "Invalid email format";

    if (!username) newErrors.username = "Username is required";
    else if (username.length < 3) newErrors.username = "Username must be at least 3 characters";

    if (!password) newErrors.password = "Password is required";
    else if (password.length < 6) newErrors.password = "Password must be at least 6 characters";

    if (!confirmPassword) newErrors.confirmPassword = "Please confirm password";
    else if (password !== confirmPassword) newErrors.confirmPassword = "Passwords do not match";

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error("Please fix the errors above");
      return;
    }

    setLoading(true);

    try {
      await register(email, username, password, confirmPassword);
      toast.success("Account created successfully! Redirecting to dashboard...");
      navigate("/dashboard");
    } catch (err) {
      const errorMessage = err.response?.data?.error || "Registration failed";
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = password ? (
    password.length >= 8 ? "strong" : password.length >= 6 ? "medium" : "weak"
  ) : null;

  return (
    <div className="register-container min-h-screen flex items-center justify-center p-4">
      <div className="register-overlay"></div>
      <div className="w-full max-w-md register-content">
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
          <p className="text-slate-600 dark:text-slate-400 mt-2">Create your account</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-800 rounded-2xl shadow-lg shadow-slate-200/30 dark:shadow-none p-8 space-y-5">
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
                placeholder="........@gmail.com"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white text-slate-900 transition-all ${
                  errors.email
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-200 dark:border-slate-600 focus:ring-blue-500"
                }`}
                required
              />
            </div>
            {errors.email && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.email}
              </p>
            )}
          </div>

          {/* Username */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Username
            </label>
            <div className="relative">
              <User className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="__username__"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white text-slate-900 transition-all ${
                  errors.username
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-200 dark:border-slate-600 focus:ring-blue-500"
                }`}
                required
              />
            </div>
            {errors.username && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.username}
              </p>
            )}
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
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white text-slate-900 transition-all ${
                  errors.password
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-200 dark:border-slate-600 focus:ring-blue-500"
                }`}
                required
              />
            </div>
            {errors.password && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.password}
              </p>
            )}
            {password && (
              <div className="mt-2">
                <div className="flex items-center gap-2">
                  <div className="h-1 flex-1 rounded-full bg-slate-200 overflow-hidden">
                    <div
                      className={`h-full transition-all ${
                        passwordStrength === "weak"
                          ? "w-1/3 bg-red-500"
                          : passwordStrength === "medium"
                          ? "w-2/3 bg-yellow-500"
                          : "w-full bg-green-500"
                      }`}
                    ></div>
                  </div>
                  <span className={`text-xs font-medium ${
                    passwordStrength === "weak"
                      ? "text-red-500"
                      : passwordStrength === "medium"
                      ? "text-yellow-500"
                      : "text-green-500"
                  }`}>
                    {passwordStrength?.charAt(0).toUpperCase() + passwordStrength?.slice(1)}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Confirm Password */}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-3 text-slate-400 h-5 w-5" />
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className={`w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 bg-white text-slate-900 transition-all ${
                  errors.confirmPassword
                    ? "border-red-500 focus:ring-red-500"
                    : "border-slate-200 dark:border-slate-600 focus:ring-blue-500"
                }`}
                required
              />
              {password === confirmPassword && confirmPassword && (
                <CheckCircle className="absolute right-3 top-3 text-green-500 h-5 w-5" />
              )}
            </div>
            {errors.confirmPassword && (
              <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                <AlertCircle className="h-4 w-4" /> {errors.confirmPassword}
              </p>
            )}
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
                Creating account...
              </>
            ) : (
              "Create Account"
            )}
          </button>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200 dark:border-slate-600"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-white dark:bg-slate-800 text-slate-500">Already have an account?</span>
            </div>
          </div>

          {/* Sign In Link */}
          <Link
            to="/login"
            className="w-full border border-slate-200 dark:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-900 dark:text-white font-semibold py-2.5 rounded-lg transition-all duration-200 flex items-center justify-center"
          >
            Sign In
          </Link>
        </form>
      </div>
    </div>
  );
}
