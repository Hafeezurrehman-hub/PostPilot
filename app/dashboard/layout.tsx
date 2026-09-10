"use client";

import { ToastProvider } from "@/lib/toast-context";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
