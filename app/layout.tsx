import type { Metadata } from "next";
import "./globals.css"; // Keep Tailwind CSS imports
import React from 'react'; // Explicitly import React

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
      <body className="flex min-h-screen bg-gray-50 text-gray-900 font-sans">
        {/* Left Sidebar */}
        <aside className="w-64 bg-white p-4 fixed h-full border-r border-gray-200">
          <div className="text-2xl font-bold text-gray-900 mb-8">Mission Control</div>
          <nav>
            <ul>
              <li className="mb-2">
                <a href="/" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="Go to the main dashboard">
                  Dashboard
                </a>
              </li>
              <li className="mb-2">
                <a href="/projects" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="View and manage your projects">
                  Projects
                </a>
              </li>
              <li className="mb-2">
                <a href="/memory" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="Access your long-term and daily memories">
                  Memory
                </a>
              </li>
              <li className="mb-2">
                <a href="/docs" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="LLM-maintained project documentation and browser">
                  Docs
                </a>
              </li>
              <li className="mb-2">
                <a href="/calendar" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="View your calendar and schedule">
                  Calendar
                </a>
              </li>
              <li className="mb-2">
                <a href="/tasks" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="Manage your tasks and to-do lists">
                  Tasks
                </a>
              </li>
              <li className="mb-2">
                <a href="/team" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="See an overview of your team and agents">
                  Team Overview
                </a>
              </li>
              <li className="mb-2">
                <div className="flex items-center justify-between p-2 text-gray-400 cursor-not-allowed rounded-md" title="Coming Soon">
                  <span>🎨 Art Tracker</span>
                  <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded">Coming Soon</span>
                </div>
              </li>
              <li className="mb-2">
                <a href="/ops" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="Manage and monitor operations">
                  Ops Control
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="Access available tools and integrations">
                  Tools
                </a>
              </li>
              <li className="mb-2">
                <a href="#" className="flex items-center p-2 text-gray-600 hover:bg-gray-100 hover:text-gray-900 rounded-md" title="Adjust application settings">
                  Settings
                </a>
              </li>
            </ul>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 ml-64 p-8">
          {children}
        </main>
      </body>
    </html>
  );
}
