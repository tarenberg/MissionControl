import type { Metadata } from "next";
import "./globals.css";
import React from 'react';
import ClientLayout from '@/components/ClientLayout';

export const metadata: Metadata = {
  title: "Mission Control",
  description: "Your personal Mission Control dashboard for custom tools.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background text-foreground font-sans relative overflow-x-hidden transition-colors duration-300">
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
