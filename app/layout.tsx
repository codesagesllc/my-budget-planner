import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Budget Planner - AI-Powered Personal Finance",
  description: "Manage your finances with AI-powered insights, budget tracking, and bill management",
  icons: {
    icon: '/dollar-icon.svg',
    shortcut: '/dollar-icon.svg',
    apple: '/dollar-icon.svg',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet" />
        <link rel="icon" href="/dollar-icon.svg" type="image/svg+xml" />
        <link rel="alternate icon" href="/favicon.ico" />
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
