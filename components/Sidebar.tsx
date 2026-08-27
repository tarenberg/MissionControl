"use client";

import React, { useState } from 'react';
import ThemeToggle from './ThemeToggle';
import Logo from './Logo';
import Link from 'next/link';

export default function Sidebar() {
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <aside className={`bg-neo-bg p-6 fixed h-[calc(100vh-2.5rem)] top-5 left-5 z-50 rounded-[40px] border border-white/50 dark:border-white/5 shadow-neo-flat flex flex-col transition-all duration-500 ease-in-out ${isCollapsed ? 'w-24' : 'w-64'}`}>
      <button 
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3 top-10 w-8 h-8 neo-button rounded-full flex items-center justify-center text-[10px] z-[60] hover:neo-glow-blue active:neo-button-active transition-all"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? '→' : '←'}
      </button>

      <div className="flex flex-col items-center mb-10 px-2 relative">
        <div className={`absolute -top-2 transition-all duration-500 ${isCollapsed ? 'right-0 scale-75' : '-right-2'}`}>
          <ThemeToggle />
        </div>
        <div className={`transition-all duration-500 ${isCollapsed ? 'scale-75' : 'scale-100'}`}>
          <Logo />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto custom-scrollbar overflow-x-hidden">
        <ul className="space-y-3">
          {[
            { name: 'Dashboard', href: '/', icon: '🏠' },
            { name: 'Projects', href: '/projects', icon: '📁' },
            { name: 'Memory', href: '/memory', icon: '🧠' },
            { name: 'Docs', href: '/docs', icon: '📚' },
            { name: 'Calendar', href: '/calendar', icon: '📅' },
            { name: 'Tasks', href: '/tasks', icon: '✅' },
            { name: 'Art Tracker', href: '/art-tracker', icon: '🎨' },
            { name: 'Chronicles', href: '/journal', icon: '📓' },
            { name: 'Journey Sync', href: '/journey-sync', icon: '🗺️' },
            { name: 'Team', href: '/team', icon: '👥' },
            { name: 'Ops Control', href: '/ops', icon: '⚙️' },
            { name: 'VAT Chat', href: '/chat', icon: '💬' },
          ].map((item) => (
            <li key={item.name}>
              <Link 
                href={item.href} 
                className={`flex items-center gap-3 px-4 py-3 text-gray-600 dark:text-gray-400 font-bold text-[11px] uppercase tracking-widest neo-button hover:text-blue-600 dark:hover:text-blue-400 hover:neo-glow-blue active:neo-button-active ${isCollapsed ? 'justify-center px-0' : ''}`}
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
            <p className={`text-[8px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em] text-center transition-all duration-300 ${isCollapsed ? 'opacity-0 w-0 h-0 scale-0' : 'opacity-100 w-auto h-auto scale-100'}`}>
              OpenClaw v1.4.3 (NEO)
            </p>
            {isCollapsed && <p className="text-[10px] font-black text-blue-600 text-center animate-in fade-in zoom-in">v1.4</p>}
         </div>
      </div>

      <style jsx>{`
        aside {
          margin-left: ${isCollapsed ? '0' : '0'};
        }
        @media (max-width: 1024px) {
          aside {
            transform: translateX(${isCollapsed ? '-100%' : '0'});
            left: 0;
            top: 0;
            height: 100vh;
            border-radius: 0;
          }
        }
      `}</style>
      <script dangerouslySetInnerHTML={{
        __html: `
          function updatePadding() {
            if (window.innerWidth > 1024) {
              document.body.style.paddingLeft = '${isCollapsed ? '128px' : '288px'}';
            } else {
              document.body.style.paddingLeft = '0';
            }
          }
          window.addEventListener('resize', updatePadding);
          updatePadding();
        `
      }} />
    </aside>
  );
}
