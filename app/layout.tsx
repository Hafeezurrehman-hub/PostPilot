import type { Metadata } from "next";
import "./globals.css";
import ToastProvider from "@/components/ToastProvider";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"),
  title: {
    default: "PostPilot — One post, every platform",
    template: "%s · PostPilot",
  },
  description: "Create one post, publish everywhere — Instagram, Facebook, Twitter/X, and LinkedIn.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "PostPilot",
  },
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    title: "PostPilot — One post, every platform",
    description: "Create one post, publish everywhere — Instagram, Facebook, Twitter/X, and LinkedIn.",
    images: ["/og-image.png"],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "PostPilot — One post, every platform",
    description: "Create one post, publish it everywhere.",
    images: ["/og-image.png"],
  },
};

export const viewport = {
  themeColor: "#4338ca",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">
        {children}
        <ToastProvider />
      </body>
    </html>
  );
}