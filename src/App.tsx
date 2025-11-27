import { MapContainer } from './components/Map/MapContainer';
import { useEventData } from './hooks/useEventData';

function App() {
  const { events, isLoading, error } = useEventData();

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 glass-panel max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Events</h1>
          <p className="text-gray-700 dark:text-gray-300">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-smooth"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-xl text-gray-600 dark:text-gray-400">Loading ETS Events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col">
      <header className="bg-white dark:bg-gray-800 shadow-md z-10 px-6 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
            ETS Events Visualization
          </h1>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {events.length.toLocaleString()} events loaded
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        <MapContainer events={events} />
      </main>
    </div>
  );
}

export default App;
