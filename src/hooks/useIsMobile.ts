import { useState, useEffect, useSyncExternalStore } from 'react';

// Check if device is mobile/tablet (based on screen size or touch capability)
const getIsMobileDevice = () => {
  if (typeof window === 'undefined') return false;
  // Consider it a mobile device if:
  // 1. Screen width is less than 1024px (tablets and phones), OR
  // 2. It's a touch device with width less than 1200px
  const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
  const isSmallScreen = window.innerWidth < 1024;
  const isMediumTouchScreen = isTouchDevice && window.innerWidth < 1200;
  return isSmallScreen || isMediumTouchScreen;
};

// Get initial value safely (works in SSR too)
const getSnapshot = (breakpoint: number) => () => {
  if (typeof window === 'undefined') return false;
  return window.innerWidth < breakpoint;
};

const getServerSnapshot = () => false;

export const useIsMobile = (breakpoint: number = 768) => {
  // Use useSyncExternalStore for reliable updates
  const subscribe = (callback: () => void) => {
    window.addEventListener('resize', callback);
    window.addEventListener('orientationchange', callback);
    return () => {
      window.removeEventListener('resize', callback);
      window.removeEventListener('orientationchange', callback);
    };
  };

  return useSyncExternalStore(
    subscribe,
    getSnapshot(breakpoint),
    getServerSnapshot
  );
};

// Hook to detect if we're on a mobile/tablet device (regardless of orientation)
export const useIsMobileDevice = () => {
  const [isMobileDevice, setIsMobileDevice] = useState(() => getIsMobileDevice());

  useEffect(() => {
    const checkDevice = () => {
      setIsMobileDevice(getIsMobileDevice());
    };

    window.addEventListener('resize', checkDevice);
    window.addEventListener('orientationchange', () => {
      setTimeout(checkDevice, 100);
    });
    
    return () => {
      window.removeEventListener('resize', checkDevice);
      window.removeEventListener('orientationchange', checkDevice);
    };
  }, []);

  return isMobileDevice;
};

// Simple hook for components that use inline state (for backwards compatibility)
export const useIsMobileSimple = (breakpoint: number = 768) => {
  const [isMobile, setIsMobile] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.innerWidth < breakpoint;
  });

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < breakpoint);
    };

    // Listen for both resize and orientation change
    window.addEventListener('resize', checkMobile);
    window.addEventListener('orientationchange', checkMobile);
    
    // Also check after a small delay for orientation changes
    const handleOrientationChange = () => {
      setTimeout(checkMobile, 100);
    };
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('orientationchange', checkMobile);
      window.removeEventListener('orientationchange', handleOrientationChange);
    };
  }, [breakpoint]);

  return isMobile;
};
