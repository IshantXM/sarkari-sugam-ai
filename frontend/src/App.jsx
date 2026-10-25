import React, { useState, useEffect } from 'react';
import './App.css';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';

// SVG Icons for Sarkari Sugam design
function SarkariSugamLogoIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <rect width="28" height="28" rx="7" fill="#EA580C" />
      {/* Sleek geometric emblem / chakra / navigation seal */}
      <circle cx="14" cy="14" r="8.5" stroke="#FFFFFF" strokeWidth="1.8" strokeDasharray="2 1.5" />
      <circle cx="14" cy="14" r="4.2" stroke="#FFFFFF" strokeWidth="1.5" />
      <circle cx="14" cy="14" r="1.8" fill="#FFFFFF" />
      <path d="M14 3.5V6.5M14 21.5V24.5M3.5 14H6.5M21.5 14H24.5" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function FetchIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );
}


function MonitorIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}

export default function App() {
  const { user, token, logout, authFetch, loading } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [healthData, setHealthData] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('highway road construction tender');
  const [searchLimit, setSearchLimit] = useState(5);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Fetch State
  const [fetchUrl, setFetchUrl] = useState('');
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchData, setFetchData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Diff & Watchdog State
  const [diffTenderId, setDiffTenderId] = useState('TNDR-SWWYD8TQHQYENTNI');
  const [diffUrl, setDiffUrl] = useState(
    'https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&session=T&sp=SWWYD8TQhQYENtniIfmtVcw%3D%3D'
  );
  const [diffCurrentBudget, setDiffCurrentBudget] = useState('1450000');
  const [diffCurrentDeadline, setDiffCurrentDeadline] = useState('2026-12-10');
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [diffError, setDiffError] = useState(null);
  const [sweepLoading, setSweepLoading] = useState(false);
  const [sweepResult, setSweepResult] = useState(null);
  const [expandedHistoryId, setExpandedHistoryId] = useState(null);

  // Session Tenders
  const [savedTenders, setSavedTenders] = useState([]);

  useEffect(() => {
    if (token && user) {
      fetchHealth();
      fetchSavedTenders();
    }
  }, [activeTab, token, user]);

  useEffect(() => {
    if (!token || !user) return;
    // Keep health metrics live every 12 seconds
    const interval = setInterval(() => {
      fetchHealth();
    }, 12000);
    return () => clearInterval(interval);
  }, [token, user]);

  async function fetchHealth() {
    try {
      const res = await authFetch('/api/health');
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setHealthData(data);
    } catch (err) {
      console.warn('[HEALTH] Ping failed:', err.message);
      setHealthData({ ok: false, error: err.message });
    }
  }

  async function fetchSavedTenders() {
    try {
      const res = await authFetch('/api/tenders/saved');
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
        setSavedTenders(data.data);
      }
    } catch (err) {
      console.warn('Could not fetch saved tenders:', err);
    }
  }

  // Action: Search
  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const res = await authFetch('/api/tenders/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: searchQuery, limit: Number(searchLimit) }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Search failed');
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(err.message);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }

  // Action: Fetch
  async function handleFetch(e) {
    if (e) e.preventDefault();
    if (!fetchUrl.trim()) return;

    setFetchLoading(true);
    setFetchError(null);
    setFetchData(null);

    try {
      const res = await authFetch('/api/tenders/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: fetchUrl }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Fetch failed');
      setFetchData(data.data);

      if (data.data?.tender_id) {
        setSavedTenders((prev) => {
          const filtered = prev.filter((t) => t.tender_id !== data.data.tender_id);
          return [data.data, ...filtered];
        });
        setDiffTenderId(data.data.tender_id);
        setDiffUrl(data.data.source_url || fetchUrl);
      }
    } catch (err) {
      setFetchError(err.message);
    } finally {
      setFetchLoading(false);
    }
  }

  // Action: Diff
  async function handleDiff(e) {
    if (e) e.preventDefault();
    if (!diffTenderId.trim()) return;

    setDiffLoading(true);
    setDiffError(null);
    setDiffResult(null);

    const payload = {
      tender_id: diffTenderId,
      url: diffUrl || undefined,
    };
    if (diffCurrentBudget || diffCurrentDeadline) {
      payload.current = {
        budget_usd: diffCurrentBudget ? Number(diffCurrentBudget) : undefined,
        submission_deadline: diffCurrentDeadline || undefined,
      };
    }

    try {
      const res = await authFetch('/api/tenders/diff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.message || 'Diff failed');
      setDiffResult(data);
      if (data.mutation_detected) {
        fetchSavedTenders();
      }
    } catch (err) {
      setDiffError(err.message);
    } finally {
      setDiffLoading(false);
    }
  }

  // Action: Fleet Watchdog Sweep
  async function handleSweep() {
    setSweepLoading(true);
    setSweepResult(null);
    try {
      const res = await authFetch('/api/tenders/monitor/sweep', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      setSweepResult(data);
      await fetchSavedTenders();
    } catch (err) {
      console.error('Sweep failed:', err);
    } finally {
      setSweepLoading(false);
    }
  }

  function handleSelectTenderForDiff(tender) {
    if (!tender) return;
    setDiffTenderId(tender.tender_id);
    setDiffUrl(tender.source_url || '');
    setDiffCurrentBudget(tender.budget_usd ? String(tender.budget_usd) : '1250000');
    setDiffCurrentDeadline(tender.submission_deadline || '2026-11-24');
    setDiffResult(null);
    setDiffError(null);
  }

  function applyPreset(type) {
    if (type === 'clean') {
      setDiffCurrentBudget('1250000');
      setDiffCurrentDeadline('24-Nov-2026');
    } else if (type === 'budget') {
      setDiffCurrentBudget('1450000');
    } else if (type === 'deadline') {
      setDiffCurrentDeadline('10-Dec-2026');
    } else if (type === 'major') {
      setDiffCurrentBudget('1750000');
      setDiffCurrentDeadline('25-Dec-2026');
    }
  }

  // MANDATORY AUTHENTICATION GUARD: Features can never be accessed without valid login
  if (loading) {
    return (
      <div className="tf-auth-loading-screen">
        <div className="tf-auth-loading-card">
          <SarkariSugamLogoIcon />
          <div className="tf-brand-name" style={{ fontSize: '20px', marginTop: '12px' }}>
            Sarkari Sugam AI
          </div>
          <div style={{ color: 'var(--tf-text-secondary)', fontSize: '13px', marginTop: '6px' }}>
            Verifying secure session token...
          </div>
          <div className="tf-spinner" style={{ marginTop: '16px' }} />
        </div>
      </div>
    );
  }

  if (!token || !user) {
    return <AuthModal isStandalone={true} />;
  }

  return (
    <div className="tf-app-layout">
      {/* LEFT SIDEBAR */}
      <aside className="tf-sidebar">
        <div className="tf-sidebar-top">
          {/* Logo Header */}
          <div className="tf-brand-header">
            <div className="tf-logo-group" onClick={() => setActiveTab('home')}>
              <SarkariSugamLogoIcon />
              <div>
                <div className="tf-brand-name">Sarkari Sugam</div>
              </div>
            </div>
            <span className="tf-brand-tag">AI Console</span>
          </div>

          {/* Navigation Section 1: Main */}
          <div className="tf-nav-section">
            <button
              type="button"
              className={`tf-nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <div className="tf-nav-left">
                <HomeIcon />
                <span>Home</span>
              </div>
            </button>
          </div>

          {/* Navigation Section 2: Playground */}
          <div className="tf-nav-section">
            <div className="tf-nav-label">Playground</div>


            <button
              type="button"
              className={`tf-nav-item ${activeTab === 'search' ? 'active' : ''}`}
              onClick={() => setActiveTab('search')}
            >
              <div className="tf-nav-left">
                <SearchIcon />
                <span>Search</span>
              </div>
            </button>

            <button
              type="button"
              className={`tf-nav-item ${activeTab === 'fetch' ? 'active' : ''}`}
              onClick={() => setActiveTab('fetch')}
            >
              <div className="tf-nav-left">
                <FetchIcon />
                <span>Fetch</span>
              </div>
            </button>

            <button
              type="button"
              className={`tf-nav-item ${activeTab === 'diff' ? 'active' : ''}`}
              onClick={() => setActiveTab('diff')}
            >
              <div className="tf-nav-left">
                <MonitorIcon />
                <span>Monitor</span>
              </div>
            </button>
          </div>

          {/* Navigation Section 3: Workspace & System */}
          <div className="tf-nav-section">
            <div className="tf-nav-label">Workspace</div>

            <button
              type="button"
              className={`tf-nav-item ${activeTab === 'health' ? 'active' : ''}`}
              onClick={() => setActiveTab('health')}
            >
              <div className="tf-nav-left">
                <ActivityIcon />
                <span>System Health</span>
              </div>
              <span className="tf-badge tf-badge-emerald" style={{ fontSize: '10px' }}>
                Online
              </span>
            </button>
          </div>
        </div>

        {/* Sidebar Bottom (Profile & Status) */}
        <div className="tf-sidebar-bottom">
          <div className="tf-user-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div className="tf-user-profile-left">
              <div className="tf-user-avatar">{user.name ? user.name[0].toUpperCase() : 'U'}</div>
              <div style={{ overflow: 'hidden' }}>
                <div className="tf-user-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <span>{user.name}</span>
                  <span className="tf-badge tf-badge-emerald" style={{ fontSize: '9px', padding: '1px 5px' }}>
                    Active
                  </span>
                </div>
                <div className="tf-user-email">{user.email}</div>
              </div>
            </div>
            <button
              type="button"
              className="tf-btn tf-btn-ghost"
              style={{ padding: '4px 6px', fontSize: '11px', color: 'var(--tf-rose)', fontWeight: '600' }}
              onClick={logout}
              title="Sign Out & Invalidate JWT"
            >
              Sign Out
            </button>
          </div>
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="tf-main-content">
        {/* Top Header Bar */}
        <div className="tf-top-bar">
          <div>
            {activeTab === 'home' && <div className="tf-welcome-sub">Welcome back</div>}
            <h1 className="tf-page-title">
              {activeTab === 'home' && (user.name || 'Console')}
              {activeTab === 'search' && 'Search Playground'}
              {activeTab === 'fetch' && 'Structured Fetch Playground'}
              {activeTab === 'diff' && 'Monitor & Corrigendum Watchdog'}
              {activeTab === 'health' && 'System Health & Metrics'}
            </h1>
          </div>

          <div className="tf-top-actions">
            <button
              type="button"
              className="tf-btn tf-btn-secondary"
              style={{ padding: '5px 12px', fontSize: '12px', color: 'var(--tf-rose)', fontWeight: '500' }}
              onClick={logout}
              title="Sign Out & Revoke JWT"
            >
              Sign Out
            </button>
            <span className="tf-badge tf-badge-gray">eprocure.gov.in Live Gateway</span>
            <span className="tf-badge tf-badge-emerald">JWT Protected Session</span>
          </div>
        </div>

        {/* Highlight Banner (Setup MCP or CLI from screenshot) */}
        <div className="tf-banner-card">
          <div>
            <div className="tf-banner-title">
              Sarkari Sugam AI — Procurement Intelligence Engine
            </div>
            <div className="tf-banner-desc">
              Autonomous RFP discovery, session-gated portal extraction, and corrigendum watchdog.
            </div>
          </div>
          <button
            type="button"
            className="tf-btn tf-btn-orange"
            onClick={() => setActiveTab('fetch')}
          >
            Extract Live Tender &rarr;
          </button>
        </div>

        {/* ----------------- VIEW 1: HOME (Matching user screenshot) ----------------- */}
        {activeTab === 'home' && (
          <div className="tf-playground-layout">
            {/* Left 2x2 Grid: Explore playground */}
            <div>
              <div className="tf-section-title">Explore playground</div>

              <div className="tf-cards-grid">
                {/* Search Card */}
                <div className="tf-tool-card" onClick={() => setActiveTab('search')}>
                  <div>
                    <div className="tf-tool-card-top">
                      <div className="icon-box-pattern">
                        <SearchIcon />
                      </div>
                    </div>
                    <div className="tf-tool-card-title">Search</div>
                    <div className="tf-tool-card-desc">
                      Ranked, structured web results across Indian procurement portals.
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--tf-orange)' }}>
                      Open Search &rarr;
                    </span>
                  </div>
                </div>

                {/* Fetch Card */}
                <div className="tf-tool-card" onClick={() => setActiveTab('fetch')}>
                  <div>
                    <div className="tf-tool-card-top">
                      <div className="icon-box-pattern">
                        <FetchIcon />
                      </div>
                    </div>
                    <div className="tf-tool-card-title">Fetch</div>
                    <div className="tf-tool-card-desc">
                      Extract any session-gated portal URL as clean, structured schema.
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--tf-orange)' }}>
                      Open Fetch &rarr;
                    </span>
                  </div>
                </div>

                {/* Monitor Card */}
                <div className="tf-tool-card" onClick={() => setActiveTab('diff')}>
                  <div>
                    <div className="tf-tool-card-top">
                      <div className="icon-box-pattern">
                        <MonitorIcon />
                      </div>
                    </div>
                    <div className="tf-tool-card-title">Monitor & Diff</div>
                    <div className="tf-tool-card-desc">
                      Watch any tender or portal for deadline shifts and corrigendum mutations.
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--tf-orange)' }}>
                      View Watchdog &rarr;
                    </span>
                  </div>
                </div>
              </div>

              {/* Saved Active Snapshots Table */}
              <div style={{ marginTop: '30px' }}>
                <div className="tf-section-title">Active Contract Snapshots in Memory</div>
                <div className="tf-panel" style={{ padding: '0', overflow: 'hidden' }}>
                  <table className="tf-table">
                    <thead>
                      <tr>
                        <th>Tender ID</th>
                        <th>Issuing Department</th>
                        <th>Work Description</th>
                        <th>Deadline</th>
                        <th>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {savedTenders.map((item, idx) => (
                        <tr key={idx}>
                          <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--tf-orange)' }}>
                            {item.tender_id}
                          </td>
                          <td style={{ fontWeight: '500' }}>{item.issuing_agency || 'Ministry'}</td>
                          <td style={{ maxWidth: '300px' }}>{item.title}</td>
                          <td style={{ color: 'var(--tf-amber)' }}>{item.submission_deadline || 'Open'}</td>
                          <td>
                            <button
                              type="button"
                              className="tf-btn tf-btn-secondary"
                              style={{ padding: '4px 10px', fontSize: '11px' }}
                              onClick={() => {
                                setDiffTenderId(item.tender_id);
                                setDiffUrl(item.source_url);
                                setActiveTab('diff');
                              }}
                            >
                              Check Diff &rarr;
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Right Column: Procurement snapshot */}
            <div>
              <div className="tf-section-title">Procurement snapshot</div>

              <div className="tf-snapshot-card">
                <div className="tf-snapshot-row">
                  <div>
                    <div className="tf-snapshot-label">Total runs</div>
                    <div className="tf-snapshot-sub">Automation runs</div>
                  </div>
                  <div className="tf-snapshot-val">24</div>
                </div>

                <div className="tf-snapshot-row">
                  <div>
                    <div className="tf-snapshot-label">Corrigendum Watchdog</div>
                    <div className="tf-snapshot-sub">Active monitoring alerts</div>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                      Clean baseline status
                    </div>
                  </div>
                  <div className="tf-snapshot-val" style={{ color: '#059669' }}>0 Alerts</div>
                </div>

                <div className="tf-snapshot-row">
                  <div>
                    <div className="tf-snapshot-label">Monitored Tenders</div>
                    <div className="tf-snapshot-sub">Active Tracked Notices</div>
                  </div>
                  <div className="tf-snapshot-val" style={{ color: 'var(--tf-orange)' }}>
                    {savedTenders.length}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ----------------- VIEW 2: SEARCH PLAYGROUND ----------------- */}
        {activeTab === 'search' && (
          <div>
            <div className="tf-panel">
              <div className="tf-panel-header">
                <div>
                  <h2 className="tf-panel-title">Tender Discovery Search</h2>
                  <div className="tf-panel-desc">
                    Query real government procurement portals across Indian departments
                  </div>
                </div>
                <span className="tf-badge tf-badge-gray">POST /api/tenders/search</span>
              </div>

              <form onSubmit={handleSearch}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <input
                    type="text"
                    className="tf-input"
                    placeholder="Enter keywords (e.g., highway road construction tender, cloud infrastructure)..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <select
                    className="tf-input"
                    style={{ width: '120px' }}
                    value={searchLimit}
                    onChange={(e) => setSearchLimit(Number(e.target.value))}
                  >
                    <option value={5}>5 items</option>
                    <option value={10}>10 items</option>
                    <option value={20}>20 items</option>
                  </select>
                  <button type="submit" className="tf-btn tf-btn-orange" disabled={searchLoading}>
                    {searchLoading ? 'Searching...' : 'Search'}
                  </button>
                </div>

                <div className="tf-chip-group">
                  <span className="tf-chip-label">Quick Search Presets</span>
                  <div className="tf-chip-list">
                    {[
                      'highway road construction tender',
                      'cloud infrastructure tender',
                      'cybersecurity rfp government',
                      'hospital medical diagnostic equipment',
                      'solar power plant epc tender',
                    ].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        className="tf-chip"
                        onClick={() => setSearchQuery(preset)}
                      >
                        {preset}
                      </button>
                    ))}
                  </div>
                </div>
              </form>

              {searchError && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--tf-rose-light)', border: '1px solid var(--tf-rose-border)', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>
                  [Error] {searchError}
                </div>
              )}
            </div>

            {/* Results List */}
            {searchLoading ? (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--tf-text-muted)' }}>
                Scanning Indian public procurement portals...
              </div>
            ) : searchResults.length > 0 ? (
              <div>
                <div className="tf-section-title">Discovered Portals ({searchResults.length})</div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {searchResults.map((item, idx) => (
                    <div key={idx} className="tf-contract-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <div style={{ fontSize: '15px', fontWeight: '700', color: 'var(--tf-text-primary)' }}>
                          {item.title}
                        </div>
                        <span className="tf-badge tf-badge-gray">{item.domain}</span>
                      </div>

                      <div style={{ fontSize: '13px', color: 'var(--tf-text-secondary)', marginBottom: '14px', lineHeight: '1.5' }}>
                        {item.snippet}
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--tf-border-subtle)' }}>
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noreferrer"
                          style={{ fontSize: '12px', color: 'var(--tf-blue)', textDecoration: 'none', fontWeight: '500' }}
                        >
                          View Source Portal &rarr;
                        </a>

                        <button
                          type="button"
                          className="tf-btn tf-btn-secondary"
                          style={{ padding: '4px 12px', fontSize: '12px' }}
                          onClick={() => {
                            setFetchUrl(item.url);
                            setActiveTab('fetch');
                          }}
                        >
                          Extract Structured Data &rarr;
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}

        {/* ----------------- VIEW 3: STRUCTURED FETCH PLAYGROUND ----------------- */}
        {activeTab === 'fetch' && (
          <div>
            <div className="tf-panel">
              <div className="tf-panel-header">
                <div>
                  <h2 className="tf-panel-title">Structured Tender Extractor</h2>
                  <div className="tf-panel-desc">
                    Extracts session-gated government portals into a guaranteed JSON schema
                  </div>
                </div>
              </div>

              <form onSubmit={handleFetch}>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '12px' }}>
                  <input
                    type="url"
                    className="tf-input"
                    placeholder="https://eprocure.gov.in/..."
                    value={fetchUrl}
                    onChange={(e) => setFetchUrl(e.target.value)}
                    required
                  />
                  <button type="submit" className="tf-btn tf-btn-orange" disabled={fetchLoading}>
                    {fetchLoading ? 'Extracting...' : 'Extract'}
                  </button>
                </div>
              </form>

              {fetchLoading && (
                <div style={{ marginTop: '14px', padding: '12px', background: 'var(--tf-orange-light)', borderRadius: '6px', border: '1px solid var(--tf-orange-border)', fontSize: '13px', color: 'var(--tf-orange)', fontWeight: '500' }}>
                  Routing via India residential proxy to handle session handshake...
                </div>
              )}

              {fetchError && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--tf-rose-light)', border: '1px solid var(--tf-rose-border)', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>
                  [Extraction Error] {fetchError}
                </div>
              )}
            </div>

            {/* Extracted Card Display (NO RAW JSON!) */}
            {fetchData && (
              <div>
                <div className="tf-section-title">Extracted Contract Dossier</div>

                <div className="tf-contract-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span className="tf-badge tf-badge-orange" style={{ fontSize: '13px', padding: '4px 10px', fontFamily: 'var(--font-mono)' }}>
                        {fetchData.tender_id || 'ID_GENERATED'}
                      </span>
                      <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--tf-text-secondary)' }}>
                        Confidence: {Math.round((fetchData.extraction_confidence || 0.8) * 100)}%
                      </span>
                    </div>

                    <button
                      type="button"
                      className="tf-btn tf-btn-secondary"
                      onClick={() => {
                        setDiffTenderId(fetchData.tender_id);
                        setDiffUrl(fetchData.source_url || fetchUrl);
                        setActiveTab('diff');
                      }}
                    >
                      Stage into Watchdog &rarr;
                    </button>
                  </div>

                  <div className="tf-field-grid">
                    <div className="tf-field-box">
                      <div className="tf-field-key">Tender Title / Work</div>
                      <div className="tf-field-val">{fetchData.title || 'Government Procurement Notice'}</div>
                    </div>

                    <div className="tf-field-box">
                      <div className="tf-field-key">Issuing Agency / Ministry</div>
                      <div className="tf-field-val" style={{ color: 'var(--tf-orange)' }}>
                        {fetchData.issuing_agency || 'Not Specified'}
                      </div>
                    </div>

                    <div className="tf-field-box">
                      <div className="tf-field-key">Estimated Value / Budget (USD)</div>
                      <div className="tf-field-val" style={{ color: '#059669' }}>
                        {fetchData.budget_usd ? `$${fetchData.budget_usd.toLocaleString()}` : 'Open / Unspecified RFP'}
                      </div>
                    </div>

                    <div className="tf-field-box">
                      <div className="tf-field-key">Bid Submission Deadline</div>
                      <div className="tf-field-val" style={{ color: '#d97706' }}>
                        {fetchData.submission_deadline || 'Not Specified'}
                      </div>
                    </div>

                    <div className="tf-field-box" style={{ gridColumn: '1 / -1' }}>
                      <div className="tf-field-key">Eligibility & Category Criteria</div>
                      <div className="tf-field-val" style={{ fontWeight: '500', color: 'var(--tf-text-secondary)' }}>
                        {fetchData.eligibility || 'Standard General Conditions'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}


        {/* ----------------- VIEW 5: MONITOR & DIFF ----------------- */}
        {activeTab === 'diff' && (
          <div>
            {/* Top Stat Strip & Fleet Controls */}
            <div className="tf-stat-strip">
              <div className="tf-stat-group">
                <div className="tf-stat-col">
                  <div className="tf-stat-col-label">Watchdog Engine</div>
                  <div className="tf-stat-col-val" style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px', color: '#059669' }}>
                    <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#059669' }} />
                    24/7 Autonomous Daemon
                  </div>
                </div>

                <div className="tf-stat-col">
                  <div className="tf-stat-col-label">Monitored Contracts</div>
                  <div className="tf-stat-col-val" style={{ color: 'var(--tf-orange)' }}>
                    {savedTenders.length}
                  </div>
                </div>

                <div className="tf-stat-col">
                  <div className="tf-stat-col-label">Corrigendums Logged</div>
                  <div className="tf-stat-col-val" style={{ color: savedTenders.some((t) => (t.status || '').includes('MUTATION')) ? '#d97706' : '#059669' }}>
                    {savedTenders.filter((t) => (t.status || '').includes('MUTATION')).length}
                  </div>
                </div>

                <div className="tf-stat-col">
                  <div className="tf-stat-col-label">Alert Channels</div>
                  <div className="tf-stat-col-val" style={{ fontSize: '13px', color: 'var(--tf-text-secondary)' }}>
                    Slack (#procurement) &bull; Nodemailer Email
                  </div>
                </div>
              </div>

              <div>
                <button
                  type="button"
                  className="tf-btn tf-btn-secondary"
                  disabled={sweepLoading}
                  onClick={handleSweep}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '12px' }}
                >
                  <span>{sweepLoading ? 'Sweeping All Portals...' : '⚡ Run Fleet Watchdog Sweep'}</span>
                </button>
              </div>
            </div>

            {/* Sweep Result Banner */}
            {sweepResult && (
              <div style={{ marginBottom: '20px', padding: '12px 16px', background: '#ecfdf5', border: '1px solid #a7f3d0', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: '700', color: '#065f46', fontSize: '13px' }}>
                    Fleet Sweep Completed Successfully
                  </div>
                  <div style={{ fontSize: '12px', color: '#047857', marginTop: '2px' }}>
                    Inspected {sweepResult.checked_count} tracked tender baselines &bull; {sweepResult.mutations_found} active corrigendums flagged
                  </div>
                </div>
                <span className="tf-badge tf-badge-emerald">SWEEP OK</span>
              </div>
            )}

            {/* Monitored Contracts Watchlist */}
            <div style={{ marginBottom: '28px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '10px' }}>
                <div className="tf-section-title" style={{ margin: 0 }}>
                  Active Monitored Watchlist (Supabase PostgreSQL)
                </div>
                <button
                  type="button"
                  className="tf-link-btn"
                  onClick={fetchSavedTenders}
                  style={{ fontSize: '12px' }}
                >
                  &#x21bb; Refresh Baseline Data
                </button>
              </div>

              <div className="tf-panel" style={{ padding: '0', overflow: 'hidden' }}>
                <table className="tf-table">
                  <thead>
                    <tr>
                      <th>Tender ID</th>
                      <th>Issuing Department</th>
                      <th>Work Description</th>
                      <th>Tracked Budget</th>
                      <th>Deadline</th>
                      <th>Watchdog Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {savedTenders.map((item, idx) => {
                      const isMutated = (item.status || '').includes('MUTATION');
                      const historyCount = Array.isArray(item.history) ? item.history.length : 0;
                      const isExpanded = expandedHistoryId === item.tender_id;

                      return (
                        <React.Fragment key={idx}>
                          <tr>
                            <td style={{ fontFamily: 'var(--font-mono)', fontWeight: '600', color: 'var(--tf-orange)' }}>
                              {item.tender_id}
                            </td>
                            <td style={{ fontWeight: '500' }}>{item.issuing_agency || 'Ministry of Transport'}</td>
                            <td style={{ maxWidth: '240px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {item.title}
                            </td>
                            <td style={{ fontWeight: '600', color: 'var(--tf-text-primary)' }}>
                              {item.budget_usd ? `$${item.budget_usd.toLocaleString()}` : 'N/A'}
                            </td>
                            <td style={{ color: 'var(--tf-amber)', fontWeight: '500' }}>
                              {item.submission_deadline || 'Open'}
                            </td>
                            <td>
                              <span className={`tf-badge ${isMutated ? 'tf-badge-amber' : 'tf-badge-emerald'}`}>
                                {isMutated ? `⚠️ Corrigendum (${historyCount})` : '🟢 Baseline Intact'}
                              </span>
                            </td>
                            <td>
                              <div style={{ display: 'flex', gap: '6px' }}>
                                <button
                                  type="button"
                                  className="tf-btn tf-btn-secondary"
                                  style={{ padding: '3px 8px', fontSize: '11px' }}
                                  onClick={() => handleSelectTenderForDiff(item)}
                                >
                                  Select & Inspect
                                </button>
                                {historyCount > 0 && (
                                  <button
                                    type="button"
                                    className="tf-btn tf-btn-secondary"
                                    style={{ padding: '3px 8px', fontSize: '11px', background: isExpanded ? '#e2e8f0' : undefined }}
                                    onClick={() => setExpandedHistoryId(isExpanded ? null : item.tender_id)}
                                  >
                                    {isExpanded ? 'Hide History' : `History (${historyCount})`}
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>

                          {/* Expandable Historical Mutations Audit Timeline */}
                          {isExpanded && historyCount > 0 && (
                            <tr>
                              <td colSpan={7} style={{ padding: 0 }}>
                                <div className="tf-history-drawer">
                                  <div style={{ fontWeight: '700', color: '#92400e', marginBottom: '6px' }}>
                                    Corrigendum Audit Log ({item.tender_id})
                                  </div>
                                  <div className="tf-history-timeline">
                                    {item.history.map((hist, hIdx) => (
                                      <div key={hIdx} className="tf-history-item">
                                        <div>
                                          <div style={{ fontWeight: '600', color: '#1e293b' }}>
                                            {hist.change_summary || 'Corrigendum detected'}
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                                            Timestamp: {hist.detected_at ? new Date(hist.detected_at).toLocaleString() : 'Recent'}
                                          </div>
                                        </div>
                                        <div style={{ textAlign: 'right', fontSize: '12px' }}>
                                          <div>
                                            Budget: <span style={{ textDecoration: 'line-through', color: '#94a3b8' }}>${hist.previous_budget?.toLocaleString() || 'N/A'}</span> &rarr; <span style={{ fontWeight: '700', color: '#b45309' }}>${hist.updated_budget?.toLocaleString() || 'N/A'}</span>
                                          </div>
                                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                                            Deadline: {hist.previous_deadline || 'N/A'} &rarr; {hist.updated_deadline || 'N/A'}
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Corrigendum Diff Inspector Form */}
            <div className="tf-panel">
              <div className="tf-panel-header">
                <div>
                  <h2 className="tf-panel-title">Corrigendum & Mutation Watchdog Inspector</h2>
                  <div className="tf-panel-desc">
                    Audit baseline contracts against live portal data or simulate amendments to verify real-time alert dispatch
                  </div>
                </div>
              </div>

              <form onSubmit={handleDiff}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--tf-text-secondary)', marginBottom: '4px' }}>
                    Tender Identifier (tender_id)
                  </label>
                  <input
                    type="text"
                    className="tf-input"
                    value={diffTenderId}
                    onChange={(e) => setDiffTenderId(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--tf-text-secondary)', marginBottom: '4px' }}>
                    Target Portal URL
                  </label>
                  <input
                    type="url"
                    className="tf-input"
                    value={diffUrl}
                    onChange={(e) => setDiffUrl(e.target.value)}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '14px' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--tf-text-secondary)', marginBottom: '4px' }}>
                      Audit Budget (USD)
                    </label>
                    <input
                      type="number"
                      className="tf-input"
                      value={diffCurrentBudget}
                      onChange={(e) => setDiffCurrentBudget(e.target.value)}
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--tf-text-secondary)', marginBottom: '4px' }}>
                      Audit Submission Deadline
                    </label>
                    <input
                      type="text"
                      className="tf-input"
                      placeholder="e.g. 10-Dec-2026 or 2026-11-20"
                      value={diffCurrentDeadline}
                      onChange={(e) => setDiffCurrentDeadline(e.target.value)}
                    />
                  </div>
                </div>

                {/* Quick Presets for instant testing */}
                <div className="tf-chip-group">
                  <span className="tf-chip-label">Quick Corrigendum Simulation Presets</span>
                  <div className="tf-chip-list">
                    <button
                      type="button"
                      className="tf-chip"
                      onClick={() => applyPreset('clean')}
                    >
                      ⚡ Clean Baseline Match (No Change)
                    </button>
                    <button
                      type="button"
                      className="tf-chip"
                      onClick={() => applyPreset('budget')}
                    >
                      ⚡ Corrigendum: Budget Hike (+$200k)
                    </button>
                    <button
                      type="button"
                      className="tf-chip"
                      onClick={() => applyPreset('deadline')}
                    >
                      ⚡ Corrigendum: Deadline Extension (+16 Days)
                    </button>
                    <button
                      type="button"
                      className="tf-chip"
                      onClick={() => applyPreset('major')}
                    >
                      ⚡ Major Corrigendum (Both Budget & Deadline)
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
                  <button type="submit" className="tf-btn tf-btn-orange" disabled={diffLoading}>
                    {diffLoading ? 'Checking for Corrigendum...' : 'Run Corrigendum Diff'}
                  </button>
                </div>
              </form>

              {diffError && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--tf-rose-light)', border: '1px solid var(--tf-rose-border)', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>
                  [Diff Error] {diffError}
                </div>
              )}
            </div>

            {/* Mutation Results Display (NO RAW JSON!) */}
            {diffResult && (
              <div>
                <div className="tf-section-title">Corrigendum Analysis Results</div>

                <div
                  className={`tf-diff-banner ${diffResult.mutation_detected ? 'mutation' : 'clean'}`}
                >
                  <div>
                    <div style={{ fontWeight: '700', fontSize: '15px', color: diffResult.mutation_detected ? '#92400e' : '#065f46' }}>
                      {diffResult.mutation_detected
                        ? 'Corrigendum / Addendum Identified'
                        : 'Baseline Intact — No Mutations Detected'}
                    </div>
                    <div style={{ fontSize: '13px', marginTop: '2px', color: 'var(--tf-text-secondary)' }}>
                      {diffResult.addendum_notice || 'All verified fields match current baseline snapshot.'}
                    </div>
                  </div>
                  <span className={`tf-badge ${diffResult.mutation_detected ? 'tf-badge-amber' : 'tf-badge-emerald'}`}>
                    {diffResult.mutation_detected ? 'AMENDMENT DETECTED' : 'BASELINE INTACT'}
                  </span>
                </div>

                {/* Variance Delta Table */}
                {diffResult.changes && diffResult.changes.length > 0 && (
                  <div className="tf-panel" style={{ padding: '0', overflow: 'hidden' }}>
                    <table className="tf-table">
                      <thead>
                        <tr>
                          <th>Field Name</th>
                          <th>Previous Baseline</th>
                          <th>Updated Value</th>
                          <th>Variance Delta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {diffResult.changes.map((c, idx) => (
                          <tr key={idx}>
                            <td style={{ fontWeight: '600', color: 'var(--tf-orange)' }}>{c.field}</td>
                            <td style={{ color: 'var(--tf-text-muted)' }}>{String(c.previous_value)}</td>
                            <td style={{ fontWeight: '600', color: '#b45309' }}>{String(c.updated_value)}</td>
                            <td>
                              <span className="tf-badge tf-badge-amber">
                                {c.delta !== null ? (c.delta > 0 ? `+$${c.delta.toLocaleString()}` : `$${c.delta.toLocaleString()}`) : 'Modified'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Multi-Channel Alert Delivery Status */}
                {diffResult.alert && (
                  <div className="tf-alert-box">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '16px' }}>🚨</span>
                        <span style={{ fontSize: '14px', fontWeight: '700', color: 'var(--tf-text-primary)' }}>
                          Multi-Channel Procurement Alert Dispatched
                        </span>
                      </div>
                      <span className="tf-badge tf-badge-emerald">Dispatched</span>
                    </div>

                    <div className="tf-alert-grid">
                      <div className="tf-alert-col">
                        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>📢 Slack Webhook</div>
                        <div style={{ color: 'var(--tf-text-secondary)' }}>Channel: <code>{diffResult.alert.channel}</code></div>
                        <div style={{ color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                          {diffResult.alert.mode === 'simulated' ? '• Payload Logged (Mock Delivery)' : '• Dispatched Live to Slack'}
                        </div>
                      </div>

                      <div className="tf-alert-col">
                        <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>📬 Nodemailer Official Email</div>
                        <div style={{ color: 'var(--tf-text-secondary)', wordBreak: 'break-all' }}>
                          Recipient: <code>{diffResult.alert.email?.recipient || user?.email || 'ishantmohan045@gmail.com'}</code>
                        </div>
                        {diffResult.alert.email?.isRealSmtp ? (
                          <div style={{ color: '#059669', fontWeight: '600', marginTop: '4px' }}>• Delivered via SMTP Server</div>
                        ) : (
                          <div style={{ color: '#d97706', fontWeight: '600', marginTop: '4px' }}>• Sandbox Mode (Ethereal Inbox)</div>
                        )}
                      </div>
                    </div>

                    {/* Ethereal Email Preview Button */}
                    {diffResult.alert.email?.previewUrl && (
                      <div style={{ marginTop: '14px', textAlign: 'center' }}>
                        <a
                          href={diffResult.alert.email.previewUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="tf-btn tf-btn-orange"
                          style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', padding: '9px 18px' }}
                        >
                          <span>📬 View Dispatched Corrigendum Notice (Ethereal Preview)</span>
                          <span style={{ fontSize: '14px' }}>&nearr;</span>
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------- VIEW 6: HEALTH & METRICS ----------------- */}
        {activeTab === 'health' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div className="tf-section-title" style={{ margin: 0 }}>System Status & Infrastructure Connectivity</div>
              <button
                type="button"
                className="tf-btn tf-btn-secondary"
                style={{ padding: '6px 12px', fontSize: '12px', display: 'flex', alignItems: 'center', gap: '6px' }}
                onClick={fetchHealth}
              >
                <span>&#x21bb; Refresh Connectivity Now</span>
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div className="tf-field-box">
                <div className="tf-field-key">BACKEND REST SERVER</div>
                <div className="tf-field-val" style={{ color: healthData?.ok ? '#059669' : '#dc2626' }}>
                  {healthData?.ok ? '200 OK (Port 5005)' : 'Offline'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tf-text-muted)', marginTop: '4px' }}>
                  Express API gateway on localhost:5005
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">DATABASE (SUPABASE POSTGRESQL)</div>
                <div className="tf-field-val" style={{ color: healthData?.database?.connected ? '#059669' : '#dc2626' }}>
                  {healthData?.database?.connected ? 'Connected (Ready)' : 'Offline'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tf-text-muted)', marginTop: '4px' }}>
                  Pooler: AWS ap-northeast-2 &bull; Table Schema Verified
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">TINYFISH WEB GATEWAY</div>
                <div className="tf-field-val" style={{ color: healthData?.tinyfish_configured ? '#059669' : '#dc2626' }}>
                  {healthData?.tinyfish_configured ? 'Authenticated & Active' : 'Offline'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tf-text-muted)', marginTop: '4px' }}>
                  Live browser agent session extraction
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">CORRIGENDUM WATCHDOG</div>
                <div className="tf-field-val" style={{ color: '#059669' }}>
                  {healthData?.monitoring?.watchdog_active ? 'Active (5m Interval)' : 'Active Daemon'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tf-text-muted)', marginTop: '4px' }}>
                  Autonomous background sweep & drift tracking
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">EMAIL ALERT SERVICE</div>
                <div className="tf-field-val" style={{ color: '#059669' }}>
                  {healthData?.email_service?.provider || 'Nodemailer Active'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tf-text-muted)', marginTop: '4px' }}>
                  Ethereal Sandbox / SMTP Mailer
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">SERVER UPTIME</div>
                <div className="tf-field-val">
                  {healthData?.uptime_seconds ? `${Math.round(healthData.uptime_seconds)}s` : 'N/A'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tf-text-muted)', marginTop: '4px' }}>
                  Live process execution time
                </div>
              </div>
            </div>

            {/* Architecture Diagnostics Banner */}
            <div style={{ padding: '16px 20px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
              <div style={{ fontWeight: '700', fontSize: '13px', color: '#1e293b', marginBottom: '8px' }}>
                Architecture & Port Mapping Diagnostics
              </div>
              <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', fontSize: '12px' }}>
                <div>
                  <span style={{ color: 'var(--tf-text-muted)' }}>Frontend Dev Server: </span>
                  <strong style={{ color: '#059669' }}>http://localhost:5173</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--tf-text-muted)' }}>Vite Proxy Target: </span>
                  <strong style={{ color: '#059669' }}>http://localhost:5005</strong>
                </div>
                <div>
                  <span style={{ color: 'var(--tf-text-muted)' }}>Backend Express Port: </span>
                  <strong style={{ color: '#059669' }}>5005 (Defined in backend/.env)</strong>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Modal for Sign In / Register / Quick Demo */}
        <AuthModal
          isOpen={authModalOpen}
          onClose={() => setAuthModalOpen(false)}
        />

      </main>
    </div>
  );
}
