import type { Metadata } from "next";
import "./globals.css"; // Keep Tailwind CSS imports
import React from 'react'; // Explicitly import React
import ThemeToggle from '@/components/ThemeToggle';

export const metadata: Metadata = {
  title: "Mission Control", // Updated title
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
        {/* Floating Left Sidebar */}
        <aside className="w-64 bg-sidebar backdrop-blur-xl p-4 fixed h-[calc(100vh-2rem)] top-4 left-4 z-50 rounded-3xl border border-border-custom shadow-[0_8px_32px_0_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between mb-10 px-2">
            <div className="text-xl font-semibold tracking-tighter">Mission Control</div>
            <ThemeToggle />
          </div>
          <nav className="h-full">
            <ul className="space-y-1.5">
              <li className="mb-2">
                <a href="/" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="Go to the main dashboard">
                  Dashboard
                </a>
              </li>
              <li className="mb-2">
                <a href="/projects" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="View and manage your projects">
                  Projects
                </a>
              </li>
              <li className="mb-2">
                <a href="/memory" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="Access your long-term and daily memories">
                  Memory
                </a>
              </li>
              <li className="mb-2">
                <a href="/docs" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="LLM-maintained project documentation and browser">
                  Docs
                </a>
              </li>
              <li className="mb-2">
                <a href="/calendar" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="View your calendar and schedule">
                  Calendar
                </a>
              </li>
              <li className="mb-2">
                <a href="/tasks" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="Manage your tasks and to-do lists">
                  Tasks
                </a>
              </li>
              <li className="mb-2">
                <a href="/team" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="See an overview of your team and agents">
                  Team Overview
                </a>
              </li>
              <li className="mb-2">
                <a href="/ops" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="Manage and monitor operations">
                  Ops Control
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="Access available tools and integrations">
                  Tools
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="flex items-center p-2 text-foreground hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-blue-500 rounded-2xl transition-all" title="Adjust application settings">
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="min-h-screen pl-72 pr-8 py-12">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
