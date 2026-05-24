"use client";

import React, { useState, useEffect } from 'react';
import Sidebar from './Sidebar';
import dynamic from 'next/dynamic';
import Link from 'next/link';

const ChatPopup = dynamic(() => import('./Chat/ChatPopupV3'), { ssr: false });

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Auto-collapse sidebar on smaller screens on mount
  useEffect(() => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setIsCollapsed(true);
    }
  }, []);

  // Block Ctrl + Wheel zoom and pinch-to-zoom (standard browser "resize" behaviors)
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
      }
    };
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        e.preventDefault();
      }
    };

    window.addEventListener('wheel', handleWheel, { passive: false });
    window.addEventListener('touchstart', handleTouchStart, { passive: false });
    
    return () => {
      window.removeEventListener('wheel', handleWheel);
      window.removeEventListener('touchstart', handleTouchStart);
    };
  }, []);

  return (
    <div className="flex min-h-screen">
      {/* Mobile Backdrop */}
      {!isCollapsed && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity duration-300"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      {/* Mobile Hamburger Trigger Button (Visible only on mobile/tablet when sidebar is collapsed) */}
      {isCollapsed && (
        <button
          onClick={() => setIsCollapsed(false)}
          className="fixed top-4 left-4 z-45 p-3 rounded-2xl bg-neo-bg border border-white/50 dark:border-white/5 shadow-neo-flat lg:hidden flex items-center justify-center cursor-pointer hover:neo-glow-blue active:scale-95 transition-all text-gray-600 dark:text-gray-400 font-bold"
          aria-label="Open Navigation"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      )}

      {/* Sidebar with state control */}
      <aside className={`bg-neo-bg p-6 fixed z-50 flex flex-col transition-all duration-500 ease-in-out
        lg:h-[calc(100vh-2.5rem)] lg:top-5 lg:left-5 lg:rounded-[40px] lg:border lg:border-white/50 lg:dark:border-white/5 lg:shadow-neo-flat
        max-lg:h-screen max-lg:top-0 max-lg:left-0 max-lg:rounded-none max-lg:border-r max-lg:border-white/10 max-lg:shadow-2xl
        ${isCollapsed 
          ? 'w-24 max-lg:w-64 max-lg:-translate-x-full' 
          : 'w-64 max-lg:w-64 max-lg:translate-x-0'
        }
      `}>
        <button 
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-4 max-lg:-right-8 top-1/2 -translate-y-1/2 w-8 h-12 bg-neo-bg rounded-r-2xl flex items-center justify-center text-[10px] z-[60] border border-white/20 dark:border-white/5 border-l-0 shadow-[4px_0_10px_rgba(0,0,0,0.2)] hover:neo-glow-blue transition-all group cursor-pointer"
        >
          <span className="group-hover:scale-125 transition-transform font-black text-gray-500 dark:text-gray-400 group-hover:text-blue-600">
            {isCollapsed ? '→' : '←'}
          </span>
        </button>

        <div className={`flex flex-col items-center mb-4 px-2 relative transition-all duration-500 ${isCollapsed ? 'mb-6' : 'mb-4'}`}>
          <div className={`absolute -top-2 transition-all duration-500 ${isCollapsed ? 'right-0 scale-75' : '-right-2'}`}>
            <ThemeToggleWrapper />
          </div>
          <div className={`transition-all duration-500 ${isCollapsed ? 'scale-75' : 'scale-100'}`}>
            <LogoWrapper />
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
          <ul className="space-y-1.5">
            {[
              { name: 'Dashboard', href: '/', icon: '🏠' },
              { name: 'Projects', href: '/projects', icon: '📁' },
              { name: 'Memory', href: '/memory', icon: '🧠' },
              { name: 'Docs', href: '/docs', icon: '📚' },
              { name: 'Calendar', href: '/calendar', icon: '📅' },
              { name: 'Tasks', href: '/tasks', icon: '✅' },
              { name: 'Art Tracker', href: '/art-tracker', icon: '🎨' },
              { name: 'Chronicles', href: '/journal', icon: '📓' },
              { name: 'Team', href: '/team', icon: '👥' },
              { name: 'Ops Control', href: '/ops', icon: '⚙️' },
              { name: 'VAT Chat', href: '/chat', icon: '💬' },
            ].map((item) => (
              <li key={item.name}>
                <Link 
                  href={item.href} 
                  className={`flex items-center gap-3 px-4 py-2.5 text-gray-600 dark:text-gray-400 font-bold text-[11px] uppercase tracking-widest neo-button hover:text-blue-600 dark:hover:text-blue-400 hover:neo-glow-blue active:neo-button-active ${isCollapsed ? 'justify-center px-0' : ''}`}
                  title={isCollapsed ? item.name : ''}
                >
                  <span className={`text-sm group-hover:drop-shadow-[0_0_12px_rgba(59,130,246,1)] group-hover:scale-120 transition-all duration-300 z-10 ${isCollapsed ? 'text-xl' : ''}`}>{item.icon}</span>
                  {!isCollapsed && <span className="relative z-10 truncate">{item.name}</span>}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
        
        <div className="mt-auto pt-6 border-t border-gray-300/30 dark:border-gray-700/30">
           <div className="neo-pressed p-4 rounded-3xl overflow-hidden min-h-[50px] flex items-center justify-center">
              <div className="flex flex-col items-center">
                <p className={`text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-center transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 h-0 scale-0' : 'opacity-100 w-auto h-auto scale-100'}`}>
                  OpenClaw v1.4.3 (NEO)
                </p>
                <p className="text-[6px] text-blue-500/50 font-mono mt-1">Ref: 2026-05-18 13:54</p>
              </div>
              {isCollapsed && <p className="text-[10px] font-black text-blue-600 text-center animate-in fade-in zoom-in">v1.4</p>}
           </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className={`flex-1 min-h-screen py-6 px-4 lg:py-12 lg:pr-8 transition-all duration-500 ease-in-out ${isCollapsed ? 'lg:pl-32' : 'lg:pl-72'}`}>
        <div className="w-full">
          {children}
        </div>
      </main>
      <ChatPopup />
      {/* <VoiceInterface /> */}
    </div>
  );
}

// Small wrappers to avoid direct server component usage in client layout if needed, 
// though ThemeToggle and Logo are already imported in layout.tsx.
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';

function ThemeToggleWrapper() { return <ThemeToggle />; }
function LogoWrapper() { return <Logo />; }
