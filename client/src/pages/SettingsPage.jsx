import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import Settings from "../components/Settings";

export default function SettingsPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-950">
      <PageHeader
        title="Settings"
        description="Customize your dashboard and preferences"
        icon={SettingsIcon}
        breadcrumb={<Breadcrumb />}
      />
      <Settings />
    </div>
  );
}
