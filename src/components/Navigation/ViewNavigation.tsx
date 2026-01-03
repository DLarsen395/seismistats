/**
 * Navigation component for switching between app views
 * Styled as a toggle/pill switch
 */

import type { AppView } from '../../types/earthquake';

interface ViewNavigationProps {
  currentView: AppView;
  onViewChange: (view: AppView) => void;
}

export function ViewNavigation({ currentView, onViewChange }: ViewNavigationProps) {
  const views: { id: AppView; label: string; icon: string }[] = [
    { id: 'ets-events', label: 'ETS Events', icon: '🌊' },
    { id: 'earthquake-charts', label: 'Earthquake Charts', icon: '📊' },
  ];

  return (
    <nav
      style={{
        display: 'inline-flex',
        padding: '2px',
        backgroundColor: 'rgba(31, 41, 55, 0.9)',
        borderRadius: '6px',
        border: '1px solid rgba(75, 85, 99, 0.5)',
      }}
    >
      {views.map((view) => (
        <button
          key={view.id}
          onClick={() => onViewChange(view.id)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.25rem',
            padding: '0.25rem 0.625rem',
            fontSize: '0.8rem',
            fontWeight: currentView === view.id ? '600' : '400',
            color: currentView === view.id ? 'white' : '#9ca3af',
            backgroundColor: currentView === view.id
              ? '#3b82f6'
              : 'transparent',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            transition: 'all 0.15s ease',
            whiteSpace: 'nowrap',
          }}
          onMouseEnter={(e) => {
            if (currentView !== view.id) {
              e.currentTarget.style.backgroundColor = 'rgba(75, 85, 99, 0.5)';
              e.currentTarget.style.color = '#d1d5db';
            }
          }}
          onMouseLeave={(e) => {
            if (currentView !== view.id) {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#9ca3af';
            }
          }}
        >
          <span style={{ fontSize: '0.875rem' }}>{view.icon}</span>
          <span>{view.label}</span>
        </button>
      ))}
    </nav>
  );
}
