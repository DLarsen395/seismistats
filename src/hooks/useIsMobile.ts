import { useState, useEffect, useSyncExternalStore } from 'react';

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
