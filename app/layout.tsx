import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "PocketWiseAI - AI-Powered Personal Finance",
  description: "Manage your finances with AI-powered insights, budget tracking, and bill management",
  // Icons are now handled by icon.tsx and apple-icon.tsx files
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
        {/* Icons are now handled automatically by Next.js via icon.tsx and apple-icon.tsx */}
      </head>
      <body className="font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
