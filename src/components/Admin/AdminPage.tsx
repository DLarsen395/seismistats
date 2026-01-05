/**
 * Admin Page
 *
 * Database administration and seeding controls
 */

import { DatabaseSeedingPanel } from './DatabaseSeedingPanel';
import { useIsApiMode } from '../Charts/useChartData';

export function AdminPage() {
  const isApiMode = useIsApiMode();

  return (
    <div className="absolute inset-0 overflow-y-auto bg-slate-900 text-white">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-sm border-b border-slate-700 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">SeismiStats Admin</h1>
              <p className="text-slate-400 text-sm">Database & System Settings</p>
            </div>
            <div className="flex items-center gap-2">
              {isApiMode ? (
                <span className="flex items-center gap-1 text-sm text-green-400">
                  <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></span>
                  V2 API Connected
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-yellow-400">
                  <span className="w-2 h-2 bg-yellow-400 rounded-full"></span>
                  V1 Mode (Client-side)
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        {isApiMode ? (
          <div className="space-y-8">
            {/* Database Seeding */}
            <DatabaseSeedingPanel />

            {/* Additional admin panels can go here */}
            <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-6 border border-slate-700">
              <h2 className="text-xl font-semibold text-white flex items-center gap-2 mb-4">
                <span className="text-2xl">ℹ️</span>
                About Database Seeding
              </h2>
              <div className="prose prose-invert prose-sm max-w-none text-slate-300">
                <p>
                  The SeismiStats database ships empty to keep the repository size small.
                  Use the seeding controls above to populate it with historical earthquake data from USGS.
                </p>
                <h4 className="text-white mt-4">Recommendations:</h4>
                <ul className="text-slate-400">
                  <li>
                    <strong>Quick start:</strong> Seed "Last 3 Months" with M2.5+ for a fast demo (~5 minutes)
                  </li>
                  <li>
                    <strong>Full experience:</strong> Seed "Last Year" with M2.5+ for comprehensive data (~30 minutes)
                  </li>
                  <li>
                    <strong>Research use:</strong> Seed multiple years with lower magnitude threshold as needed
                  </li>
                </ul>
                <h4 className="text-white mt-4">Notes:</h4>
                <ul className="text-slate-400">
                  <li>Seeding runs in the background - you can navigate away and return</li>
                  <li>Progress is saved - cancelling preserves already-fetched data</li>
                  <li>The 5-minute auto-sync keeps data current after initial seeding</li>
                  <li>Lower magnitudes = exponentially more events (M0 has 10x more than M3)</li>
                </ul>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 text-center">
            <span className="text-4xl mb-4 block">⚠️</span>
            <h2 className="text-xl font-semibold text-yellow-300 mb-2">V2 API Not Connected</h2>
            <p className="text-slate-400">
              Admin features require the V2 API server. Make sure:
            </p>
            <ul className="text-slate-400 mt-4 text-left max-w-md mx-auto">
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                API server is running (docker compose up)
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                VITE_USE_API=true in environment
              </li>
              <li className="flex items-center gap-2">
                <span className="text-yellow-500">•</span>
                VITE_API_URL points to the API server
              </li>
            </ul>
          </div>
        )}
      </main>
    </div>
  );
}
