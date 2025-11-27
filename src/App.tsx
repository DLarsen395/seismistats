import { MapContainer } from './components/Map/MapContainer';
import { useEventData } from './hooks/useEventData';

function App() {
  const { events, isLoading, error } = useEventData();

  if (error) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        backgroundColor: '#111827'
      }}>
        <div style={{ textAlign: 'center', padding: '2rem' }} className="glass-panel">
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#dc2626', marginBottom: '1rem' }}>
            Error Loading Events
          </h1>
          <p style={{ color: '#9ca3af' }}>{error}</p>
          <button 
            onClick={() => window.location.reload()}
            style={{ 
              marginTop: '1rem', 
              padding: '0.5rem 1rem', 
              backgroundColor: '#3b82f6', 
              color: 'white', 
              borderRadius: '0.5rem',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center', 
        height: '100vh',
        backgroundColor: '#111827'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div className="animate-spin" style={{ 
            width: '4rem', 
            height: '4rem', 
            border: '2px solid transparent',
            borderBottomColor: '#3b82f6',
            borderRadius: '50%',
            margin: '0 auto 1rem'
          }}></div>
          <p style={{ fontSize: '1.25rem', color: '#9ca3af' }}>Loading ETS Events...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <header style={{ 
        backgroundColor: '#1f2937', 
        padding: '1rem 1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold', color: 'white', margin: 0 }}>
            ETS Events Visualization
          </h1>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>
            {events.length.toLocaleString()} events loaded
          </div>
        </div>
      </header>
      
      <main style={{ flex: 1, position: 'relative' }}>
        <MapContainer events={events} />
      </main>
    </div>
  );
}

export default App;
