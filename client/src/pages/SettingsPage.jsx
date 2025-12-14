import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import Settings from "../components/Settings";

export default function SettingsPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-white to-slate-100 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_15%_0%,rgba(59,130,246,0.15),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_85%_100%,rgba(168,85,247,0.12),transparent_45%)]" />
      <main className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Settings"
        description="Customize your dashboard and preferences"
        icon={SettingsIcon}
        breadcrumb={<Breadcrumb />}
      />
      <div className="px-4 py-8 sm:px-6">
        <Settings />
      </div>
      </main>
    </div>
  );
}
