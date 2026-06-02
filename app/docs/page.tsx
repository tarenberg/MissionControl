"use client";

import React, { Suspense } from 'react';
import DocsBrowser from '../../components/DocsBrowser';

export default function DocsPage() {
  return (
    <div className="p-4 flex flex-col h-full">
      <Suspense fallback={
        <div className="flex-1 flex justify-center items-center h-full min-h-[400px]">
          <div className="animate-pulse flex flex-col items-center gap-4 text-muted font-bold text-sm uppercase tracking-widest">
            <span className="text-4xl animate-bounce">🧁</span>
            <span>Muffin is gathering your files...</span>
          </div>
        </div>
      }>
        <DocsBrowser />
      </Suspense>
    </div>
  );
}
