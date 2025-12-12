import React, { useEffect, useState } from "react";
import { Briefcase, Plus, X } from "lucide-react";
import { motion } from "framer-motion";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import Portfolio from "../components/Portfolio";
import { LoadingMessage, ErrorMessage } from "../components/SkeletonLoaders";
import { api } from "../utils/api";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../components/Toast";

export default function PortfolioPage() {
  const { token } = useAuth();
  const toast = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [formData, setFormData] = useState({ name: "", description: "" });
  const [creatingPortfolio, setCreatingPortfolio] = useState(false);

  const loadPortfolios = () => {
    if (!token) return;

    api.get("/portfolio", {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then((r) => {
        setItems(r.data || []);
        setError(null);
      })
      .catch((err) => {
        console.error("Failed to load portfolios", err);
        setError(err?.response?.data?.error || "Failed to load portfolios");
        setItems([]);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadPortfolios();
  }, [token]);

  const handleCreatePortfolio = async (e) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error("Portfolio name is required");
      return;
    }

    setCreatingPortfolio(true);

    try {
      await api.post("/portfolio", {
        name: formData.name,
        description: formData.description
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(`Portfolio "${formData.name}" created successfully!`);
      setFormData({ name: "", description: "" });
      setShowCreateForm(false);
      loadPortfolios();
    } catch (err) {
      const errorMessage = err?.response?.data?.error || "Failed to create portfolio";
      toast.error(errorMessage);
      console.error("Error creating portfolio:", err);
    } finally {
      setCreatingPortfolio(false);
    }
  };

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader
        title="Portfolios"
        description="Manage and track your investment portfolios"
        icon={Briefcase}
        breadcrumb={<Breadcrumb />}
        actions={
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-lg transition hover:shadow-lg"
          >
            <Plus className="h-4 w-4" />
            New Portfolio
          </motion.button>
        }
      />

      {/* Create Portfolio Modal */}
      {showCreateForm && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setShowCreateForm(false)}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-slate-900"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Create Portfolio</h2>
              <button
                onClick={() => setShowCreateForm(false)}
                className="rounded-lg p-1 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5 text-slate-500 dark:text-slate-400" />
              </button>
            </div>

            <form onSubmit={handleCreatePortfolio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Portfolio Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Tech Stocks, Growth Portfolio"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                  Description (Optional)
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Add notes about this portfolio..."
                  rows="3"
                  className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-slate-900 placeholder:text-slate-400 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 dark:border-slate-600 dark:bg-slate-800 dark:text-white dark:placeholder:text-slate-500 dark:focus:ring-blue-500/30"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-semibold text-slate-900 transition hover:bg-slate-50 dark:border-slate-600 dark:text-white dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingPortfolio}
                  className="flex-1 rounded-lg bg-gradient-to-r from-blue-500 to-violet-600 px-4 py-2.5 font-semibold text-white transition hover:shadow-lg disabled:opacity-50"
                >
                  {creatingPortfolio ? "Creating..." : "Create Portfolio"}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}

      {loading && <LoadingMessage />}
      {error && <ErrorMessage message={error} />}
      {!loading && !error && <Portfolio items={items} />}
    </div>
  );
}
