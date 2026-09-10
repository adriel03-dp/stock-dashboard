import React from "react";
import { Settings as SettingsIcon } from "lucide-react";
import Breadcrumb from "../components/Breadcrumb";
import PageHeader from "../components/PageHeader";
import Settings from "../components/Settings";

export default function SettingsPage() {
  return (
    <div className="page-content">
      <div className="mx-auto w-full max-w-7xl">
      <PageHeader
        title="Settings"
        description="Customize your dashboard and preferences"
        icon={SettingsIcon}
        breadcrumb={<Breadcrumb />}
      />
      <div className="px-4 py-8 sm:px-6">
        <Settings />
      </div>
      </div>
    </div>
  );
}
