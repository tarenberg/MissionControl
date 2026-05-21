'use client';

import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';

interface CollapsibleCodeBlockProps {
  code: string;
  language?: string;
}

export default function CollapsibleCodeBlock({ code, language = 'javascript' }: CollapsibleCodeBlockProps) {
  const lineCount = code.split('\n').length;
  const shouldCollapse = lineCount > 10;
  const [isCollapsed, setIsCollapsed] = useState(shouldCollapse);
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy code block:', err);
    }
  };

  return (
    <div className="my-3 rounded-2xl overflow-hidden border border-zinc-800/60 bg-[#121214] shadow-inner-soft transition-all duration-300">
      {/* Code Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-zinc-900/80 border-b border-zinc-800/40 text-xs text-zinc-400 font-mono">
        <span>{language.toUpperCase()}</span>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors duration-150 shadow-soft"
          >
            {copied ? (
              <>
                <Check size={12} className="text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Copied!</span>
              </>
            ) : (
              <>
                <Copy size={12} />
                <span>Copy</span>
              </>
            )}
          </button>
          
          {shouldCollapse && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-zinc-800/50 hover:bg-zinc-800 text-zinc-300 hover:text-white transition-colors duration-150 shadow-soft"
            >
              {isCollapsed ? (
                <>
                  <ChevronDown size={12} />
                  <span>Expand</span>
                </>
              ) : (
                <>
                  <ChevronUp size={12} />
                  <span>Collapse</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Code Body */}
      <div
        className="transition-all duration-300 ease-in-out font-mono text-sm leading-relaxed overflow-x-auto text-zinc-200"
        style={{
          maxHeight: isCollapsed ? '160px' : '800px',
        }}
      >
        <pre className="p-4 bg-transparent whitespace-pre">
          <code>{code}</code>
        </pre>
      </div>

      {isCollapsed && (
        <div className="h-8 bg-gradient-to-t from-[#121214] to-transparent pointer-events-none -mt-8 relative z-10" />
      )}
    </div>
  );
}
