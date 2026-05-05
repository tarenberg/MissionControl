"use client";
import React, { useRef } from 'react';

const Logo = () => {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleMouseEnter = () => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play();
    }
  };

  return (
    <div 
      className="relative w-24 h-24 overflow-hidden rounded-3xl border border-border-custom bg-black mx-auto mb-6 transition-transform duration-500 ease-out hover:scale-[1.25] cursor-pointer active:scale-110"
      onMouseEnter={handleMouseEnter}
    >
      <video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover scale-150 pointer-events-none"
      >
        <source src="/logo-animated.mp4" type="video/mp4" />
      </video>
    </div>
  );
};

export default Logo;
