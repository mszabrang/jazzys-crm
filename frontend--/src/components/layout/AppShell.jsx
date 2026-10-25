import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function AppShell({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(window.innerWidth >= 900);

  useEffect(() => {
    function handleResize() {
      setIsDesktop(window.innerWidth >= 900);
      if (window.innerWidth >= 900) {
        setSidebarOpen(false);
      }
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="app-shell">
      {isDesktop ? (
        <Sidebar forceOpen onClose={() => {}} />
      ) : (
        <>
          {sidebarOpen && (
            <div
              className="overlay"
              onClick={() => setSidebarOpen(false)}
            />
          )}
          {sidebarOpen && (
            <Sidebar onClose={() => setSidebarOpen(false)} />
          )}
        </>
      )}

      <div className="main">
        {!isDesktop && (
          <header className="topbar">
            <button
              type="button"
              className="icon-btn"
              onClick={() => setSidebarOpen(true)}
              aria-label="Open menu"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path
                  d="M3 6h16M3 11h16M3 16h16"
                  stroke="currentColor"
                  strokeWidth="1.8"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <span className="topbar__brand">Jazzy's RTW</span>
          </header>
        )}
        <main className="main-content">{children}</main>
      </div>
    </div>
  );
}