import { useState, useCallback } from 'react';
import { MapContainer } from './components/Map/MapContainer';
import { PlaybackControls } from './components/Controls/PlaybackControls';
import { SideControls } from './components/Controls/SideControls';
import { DataRangeSelector } from './components/Controls/DataRangeSelector';
import { Legend } from './components/Controls/Legend';
import { EventStats } from './components/Controls/EventStats';
import { MobileInfoPanel } from './components/Controls/MobileInfoPanel';
import { useEventData } from './hooks/useEventData';
import { usePlayback, type ETSEventWithOpacity } from './hooks/usePlayback';
import { useIsMobileDevice } from './hooks/useIsMobile';

function App() {
  const { events, isLoading, error } = useEventData();
  const [filteredEvents, setFilteredEvents] = useState<ETSEventWithOpacity[]>([]);
  const isMobileDevice = useIsMobileDevice();
  
  // Track if we've ever had events loaded (derived state, not effect-based)
  const hasLoadedOnce = events.length > 0 || filteredEvents.length > 0;

  const handleFilteredEventsChange = useCallback((newEvents: ETSEventWithOpacity[]) => {
    setFilteredEvents(newEvents);
  }, []);

  const { currentTime, startTime, endTime, rangeStart, rangeEnd, showAllEvents } = usePlayback({ 
    events, 
    onFilteredEventsChange: handleFilteredEventsChange 
  });

  // Use all events or filtered events based on mode
  const displayEvents = showAllEvents ? events.map(e => ({ ...e, opacity: 0.8 })) : filteredEvents;

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

  // Show full-page loading only on initial load
  if (isLoading && !hasLoadedOnce) {
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
        padding: isMobileDevice ? '0.5rem 0.75rem' : '1rem 1.5rem',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        zIndex: 10
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1 style={{ 
            fontSize: isMobileDevice ? '1rem' : '1.5rem', 
            fontWeight: 'bold', 
            color: 'white', 
            margin: 0 
          }}>
            {isMobileDevice ? 'ETS Events' : 'ETS Events Visualization'}
          </h1>
          <div style={{ fontSize: isMobileDevice ? '0.75rem' : '0.875rem', color: '#9ca3af' }}>
            {events.length.toLocaleString()} events
          </div>
        </div>
      </header>
      
      <main style={{ flex: 1, position: 'relative' }}>
        <MapContainer events={displayEvents} />
        
        {/* Loading overlay for data refresh */}
        {isLoading && hasLoadedOnce && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(17, 24, 39, 0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
          }}>
            <div style={{ textAlign: 'center' }}>
              <div className="animate-spin" style={{ 
                width: '3rem', 
                height: '3rem', 
                border: '3px solid transparent',
                borderTopColor: '#3b82f6',
                borderRadius: '50%',
                margin: '0 auto 0.75rem'
              }}></div>
              <p style={{ fontSize: '1rem', color: '#9ca3af' }}>Loading events...</p>
            </div>
          </div>
        )}
        
        <DataRangeSelector isLoading={isLoading} />
        <Legend />
        <EventStats 
          events={events}
          visibleCount={displayEvents.length}
          isPlaying={!showAllEvents}
        />
        {isMobileDevice && (
          <MobileInfoPanel 
            events={events}
            visibleCount={displayEvents.length}
          />
        )}
        <PlaybackControls 
          currentTime={currentTime}
          startTime={startTime}
          endTime={endTime}
          rangeStart={rangeStart}
          rangeEnd={rangeEnd}
          eventCount={displayEvents.length}
          totalEvents={events.length}
        />
        <SideControls />
      </main>
    </div>
  );
}

export default App;
