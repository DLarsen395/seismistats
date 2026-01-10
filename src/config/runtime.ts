/**
 * Runtime configuration helper
 * 
 * In development, uses Vite's import.meta.env
 * In production Docker, uses window.__RUNTIME_CONFIG__ (injected at container start)
 */

interface RuntimeConfig {
  VITE_API_URL: string;
  VITE_USE_API: boolean;
  VITE_PUBLIC_MODE: boolean;
}

declare global {
  interface Window {
    __RUNTIME_CONFIG__?: RuntimeConfig;
  }
}

/**
 * Get a configuration value, checking runtime config first, then Vite env
 */
function getConfig(): RuntimeConfig {
  // Check for runtime config (Docker production)
  if (typeof window !== 'undefined' && window.__RUNTIME_CONFIG__) {
    return window.__RUNTIME_CONFIG__;
  }
  
  // Fall back to Vite environment variables (development)
  return {
    VITE_API_URL: import.meta.env.VITE_API_URL || 'http://localhost:3000',
    VITE_USE_API: import.meta.env.VITE_USE_API === 'true',
    VITE_PUBLIC_MODE: import.meta.env.VITE_PUBLIC_MODE === 'true',
  };
}

// Export individual config values
const config = getConfig();

export const API_URL = config.VITE_API_URL;
export const USE_API = config.VITE_USE_API;
export const PUBLIC_MODE = config.VITE_PUBLIC_MODE;

// Also export the whole config for debugging
export const runtimeConfig = config;
