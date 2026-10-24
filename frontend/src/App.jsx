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

function AgentIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
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
  const { user, token, logout } = useAuth();
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('home');
  const [healthData, setHealthData] = useState(null);
  const [showJsonInspector, setShowJsonInspector] = useState(false);
  const [lastRawResponse, setLastRawResponse] = useState(null);

  // Search State
  const [searchQuery, setSearchQuery] = useState('highway road construction tender');
  const [searchLimit, setSearchLimit] = useState(5);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState(null);

  // Fetch State
  const [fetchUrl, setFetchUrl] = useState(
    'https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&session=T&sp=SWWYD8TQhQYENtniIfmtVcw%3D%3D'
  );
  const [fetchLoading, setFetchLoading] = useState(false);
  const [fetchData, setFetchData] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  // Agent State
  const [agentUrl, setAgentUrl] = useState('https://eprocure.gov.in/eprocure/app');
  const [agentTask, setAgentTask] = useState(
    'Navigate active tenders, inspect open RFPs, and extract contract notices with IDs and deadlines.'
  );
  const [agentLoading, setAgentLoading] = useState(false);
  const [agentResult, setAgentResult] = useState(null);
  const [agentError, setAgentError] = useState(null);

  // Diff State
  const [diffTenderId, setDiffTenderId] = useState('TNDR-SWWYD8TQHQYENTNI');
  const [diffUrl, setDiffUrl] = useState(
    'https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&session=T&sp=SWWYD8TQhQYENtniIfmtVcw%3D%3D'
  );
  const [diffCurrentBudget, setDiffCurrentBudget] = useState('500000');
  const [diffCurrentDeadline, setDiffCurrentDeadline] = useState('2026-11-20');
  const [diffLoading, setDiffLoading] = useState(false);
  const [diffResult, setDiffResult] = useState(null);
  const [diffError, setDiffError] = useState(null);

  // Session Tenders
  const [savedTenders, setSavedTenders] = useState([
    {
      tender_id: 'TNDR-SWWYD8TQHQYENTNI',
      title: 'Improvement of SH 52 from Anparu Siddapura, Thirthahalli Kundapura, Udupi Dist.',
      issuing_agency: 'EE NH Division Shivamogga - MoRTH',
      budget_usd: 1250000,
      submission_deadline: '24-Nov-2026',
      eligibility: 'Works Category, Open Tender',
      source_url:
        'https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&session=T&sp=SWWYD8TQhQYENtniIfmtVcw%3D%3D',
      extraction_confidence: 0.85,
    },
  ]);

  useEffect(() => {
    fetchHealth();
    fetchSavedTenders();
  }, []);

  async function fetchHealth() {
    try {
      const res = await fetch('/api/health');
      const data = await res.json();
      setHealthData(data);
      setLastRawResponse({ endpoint: 'GET /api/health', status: res.status, data });
    } catch {
      setHealthData({ ok: false });
    }
  }

  async function fetchSavedTenders() {
    try {
      const res = await fetch('/api/tenders/saved');
      const data = await res.json();
      if (data.status === 'success' && Array.isArray(data.data) && data.data.length > 0) {
        setSavedTenders(data.data);
      }
    } catch (err) {
      console.warn('Could not fetch saved tenders from MongoDB:', err);
    }
  }



  // Action: Search
  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);
    const start = performance.now();

    try {
      const res = await fetch('/api/tenders/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ query: searchQuery, limit: Number(searchLimit) }),
      });
      const data = await res.json();
      setLastRawResponse({
        endpoint: 'POST /api/tenders/search',
        status: res.status,
        durationMs: Math.round(performance.now() - start),
        data,
      });

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
    const start = performance.now();

    try {
      const res = await fetch('/api/tenders/fetch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: fetchUrl }),
      });
      const data = await res.json();
      setLastRawResponse({
        endpoint: 'POST /api/tenders/fetch',
        status: res.status,
        durationMs: Math.round(performance.now() - start),
        data,
      });

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

  // Action: Agent
  async function handleAgent(e) {
    if (e) e.preventDefault();
    if (!agentUrl.trim()) return;

    setAgentLoading(true);
    setAgentError(null);
    setAgentResult(null);
    const start = performance.now();

    try {
      const res = await fetch('/api/tenders/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ url: agentUrl, task: agentTask }),
      });
      const data = await res.json();
      setLastRawResponse({
        endpoint: 'POST /api/tenders/agent',
        status: res.status,
        durationMs: Math.round(performance.now() - start),
        data,
      });

      if (!res.ok) throw new Error(data.message || 'Agent run failed');
      setAgentResult(data);
    } catch (err) {
      setAgentError(err.message);
    } finally {
      setAgentLoading(false);
    }
  }

  // Action: Diff
  async function handleDiff(e) {
    if (e) e.preventDefault();
    if (!diffTenderId.trim()) return;

    setDiffLoading(true);
    setDiffError(null);
    setDiffResult(null);
    const start = performance.now();

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
      const res = await fetch('/api/tenders/diff', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      setLastRawResponse({
        endpoint: 'POST /api/tenders/diff',
        status: res.status,
        durationMs: Math.round(performance.now() - start),
        data,
      });

      if (!res.ok) throw new Error(data.message || 'Diff failed');
      setDiffResult(data);
    } catch (err) {
      setDiffError(err.message);
    } finally {
      setDiffLoading(false);
    }
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
              className={`tf-nav-item ${activeTab === 'agent' ? 'active' : ''}`}
              onClick={() => setActiveTab('agent')}
            >
              <div className="tf-nav-left">
                <AgentIcon />
                <span>Agent</span>
              </div>
              <span className="tf-badge tf-badge-orange" style={{ fontSize: '10px' }}>
                Autonomous
              </span>
            </button>

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
              <span className="tf-badge tf-badge-orange" style={{ fontSize: '10px' }}>
                Live
              </span>
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
          {user ? (
            <div className="tf-user-profile-row" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div className="tf-user-profile-left">
                <div className="tf-user-avatar">{user.name ? user.name[0].toUpperCase() : 'U'}</div>
                <div style={{ overflow: 'hidden' }}>
                  <div className="tf-user-name" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{user.name}</span>
                    <span className="tf-badge tf-badge-emerald" style={{ fontSize: '9px', padding: '1px 5px' }}>
                      {user.role === 'PROCUREMENT_OFFICER' ? 'OFFICER' : 'VENDOR'}
                    </span>
                  </div>
                  <div className="tf-user-email">{user.email}</div>
                </div>
              </div>
              <button
                type="button"
                className="tf-btn tf-btn-ghost"
                style={{ padding: '4px 6px', fontSize: '11px', color: 'var(--tf-text-muted)' }}
                onClick={logout}
                title="Sign Out"
              >
                Logout
              </button>
            </div>
          ) : (
            <button
              type="button"
              className="tf-btn tf-btn-orange"
              style={{ width: '100%', fontSize: '12px', padding: '8px 10px', justifyContent: 'center' }}
              onClick={() => setAuthModalOpen(true)}
            >
              Sign In / Select Role &rarr;
            </button>
          )}
        </div>
      </aside>

      {/* MAIN CONTENT AREA */}
      <main className="tf-main-content">
        {/* Top Header Bar */}
        <div className="tf-top-bar">
          <div>
            <div className="tf-welcome-sub">Welcome back</div>
            <h1 className="tf-page-title">
              {activeTab === 'home' && "Ishant's console"}
              {activeTab === 'search' && 'Search Playground'}
              {activeTab === 'fetch' && 'Structured Fetch Playground'}
              {activeTab === 'agent' && 'Web Agent Playground'}
              {activeTab === 'diff' && 'Monitor & Corrigendum Watchdog'}
              {activeTab === 'health' && 'System Health & Metrics'}
            </h1>
          </div>

          <div className="tf-top-actions">
            <button
              type="button"
              className="tf-btn tf-btn-secondary"
              style={{ padding: '5px 12px', fontSize: '12px' }}
              onClick={() => setAuthModalOpen(true)}
            >
              {user ? 'Switch Role' : 'Sign In'}
            </button>
            <span className="tf-badge tf-badge-gray" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#059669', display: 'inline-block' }}></span>
              MongoDB Synced
            </span>
            <span className="tf-badge tf-badge-emerald">System Online</span>
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

                {/* Agent Card */}
                <div className="tf-tool-card active-accent" onClick={() => setActiveTab('agent')}>
                  <div>
                    <div className="tf-tool-card-top">
                      <div className="icon-box-pattern">
                        <AgentIcon />
                      </div>
                      <span className="tf-badge tf-badge-orange">Autonomous</span>
                    </div>
                    <div className="tf-tool-card-title">Agent</div>
                    <div className="tf-tool-card-desc">
                      An autonomous agent that drives the browser through complex procurement portals.
                    </div>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ fontSize: '12px', fontWeight: '600', color: 'var(--tf-orange)' }}>
                      Launch Agent &rarr;
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
                      <span className="tf-badge tf-badge-orange">New</span>
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
                    <div className="tf-snapshot-sub">MongoDB Database Records</div>
                  </div>
                  <div className="tf-snapshot-val" style={{ color: 'var(--tf-orange)' }}>
                    {savedTenders.length}
                  </div>
                </div>

                <div className="tf-snapshot-row">
                  <div>
                    <div className="tf-snapshot-label">MongoDB Database</div>
                    <div className="tf-snapshot-sub">localhost:27017</div>
                    <div style={{ fontSize: '11px', color: '#059669', fontWeight: '600', marginTop: '4px' }}>
                      Sarkari-Sugam-AI
                    </div>
                  </div>
                  <span className="tf-badge tf-badge-emerald">Connected</span>
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
                <span className="tf-badge tf-badge-gray">POST /api/tenders/fetch</span>
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

                <div className="tf-chip-group">
                  <span className="tf-chip-label">Test Real Procurement Notices</span>
                  <div className="tf-chip-list">
                    <button
                      type="button"
                      className="tf-chip highlight"
                      onClick={() =>
                        setFetchUrl(
                          'https://eprocure.gov.in/eprocure/app?component=%24DirectLink&page=FrontEndViewTender&service=direct&session=T&sp=SWWYD8TQhQYENtniIfmtVcw%3D%3D'
                        )
                      }
                    >
                      eprocure.gov.in (MoRTH Highway SH-52 - Live Test)
                    </button>
                    <button
                      type="button"
                      className="tf-chip"
                      onClick={() => setFetchUrl('https://example.com')}
                    >
                      example.com (Fast Sanity Check)
                    </button>
                  </div>
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

        {/* ----------------- VIEW 4: AGENT PLAYGROUND ----------------- */}
        {activeTab === 'agent' && (
          <div>
            <div className="tf-panel">
              <div className="tf-panel-header">
                <div>
                  <h2 className="tf-panel-title">Autonomous Web Execution Agent</h2>
                  <div className="tf-panel-desc">
                    Multi-step browser execution with automated login and navigation
                  </div>
                </div>
                <span className="tf-badge tf-badge-gray">POST /api/tenders/agent</span>
              </div>

              <form onSubmit={handleAgent}>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--tf-text-secondary)', marginBottom: '4px' }}>
                    Target Portal URL
                  </label>
                  <input
                    type="url"
                    className="tf-input"
                    value={agentUrl}
                    onChange={(e) => setAgentUrl(e.target.value)}
                    required
                  />
                </div>

                <div style={{ marginBottom: '14px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--tf-text-secondary)', marginBottom: '4px' }}>
                    Goal Prompt
                  </label>
                  <textarea
                    className="tf-input"
                    rows={2}
                    value={agentTask}
                    onChange={(e) => setAgentTask(e.target.value)}
                    required
                  />
                </div>

                <div className="tf-chip-group">
                  <span className="tf-chip-label">Goal Presets</span>
                  <div className="tf-chip-list">
                    {[
                      'Navigate active tenders and extract open contracts with title, ID, and deadline',
                      'Inspect tender documents and extract technical eligibility requirements',
                      'Check for recent addendum or corrigendum uploads on the dashboard',
                    ].map((p, i) => (
                      <button key={i} type="button" className="tf-chip" onClick={() => setAgentTask(p)}>
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
                  <button type="submit" className="tf-btn tf-btn-orange" disabled={agentLoading}>
                    {agentLoading ? 'Executing Autonomous Steps...' : 'Launch Agent'}
                  </button>
                </div>
              </form>

              {agentError && (
                <div style={{ marginTop: '12px', padding: '10px 14px', background: 'var(--tf-rose-light)', border: '1px solid var(--tf-rose-border)', borderRadius: '6px', color: '#991b1b', fontSize: '13px' }}>
                  [Agent Error] {agentError}
                </div>
              )}
            </div>

            {/* Agent Steps & Extracted Data (NO RAW JSON!) */}
            {agentResult && (
              <div>
                <div className="tf-section-title">Autonomous Execution Trace</div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <div className="tf-field-box">
                    <div className="tf-field-key">TOTAL DURATION</div>
                    <div className="tf-field-val" style={{ fontSize: '18px', color: 'var(--tf-orange)' }}>
                      {(agentResult.duration_ms / 1000).toFixed(1)}s
                    </div>
                  </div>
                  <div className="tf-field-box">
                    <div className="tf-field-key">PAGES VISITED</div>
                    <div className="tf-field-val" style={{ fontSize: '18px', color: '#059669' }}>
                      {agentResult.pages_visited || agentResult.execution_steps?.length || 1}
                    </div>
                  </div>
                </div>

                <div className="tf-contract-card">
                  <div style={{ fontWeight: '600', marginBottom: '10px' }}>Recorded Step Execution</div>
                  <div className="tf-step-list">
                    {agentResult.execution_steps?.map((step, idx) => (
                      <div key={idx} className="tf-step-item">
                        <div className="tf-step-badge">{step.step || idx + 1}</div>
                        <div style={{ flex: 1, fontWeight: '500' }}>{step.action}</div>
                        <span className="tf-badge tf-badge-emerald">{step.status || 'DONE'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ----------------- VIEW 5: MONITOR & DIFF ----------------- */}
        {activeTab === 'diff' && (
          <div>
            <div className="tf-panel">
              <div className="tf-panel-header">
                <div>
                  <h2 className="tf-panel-title">Corrigendum & Mutation Watchdog</h2>
                  <div className="tf-panel-desc">
                    Re-fetches target and detects unannounced amendments, budget shifts, or deadline changes
                  </div>
                </div>
                <span className="tf-badge tf-badge-gray">POST /api/tenders/diff</span>
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
                      Simulated Baseline Budget (USD)
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
                      Simulated Baseline Deadline
                    </label>
                    <input
                      type="date"
                      className="tf-input"
                      value={diffCurrentDeadline}
                      onChange={(e) => setDiffCurrentDeadline(e.target.value)}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
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
                <div className="tf-section-title">Corrigendum Analysis</div>

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
                    {diffResult.mutation_detected ? 'AMENDMENT' : 'STABLE'}
                  </span>
                </div>

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
                                {c.delta !== null ? `$${c.delta.toLocaleString()}` : 'Modified'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ----------------- VIEW 6: HEALTH & METRICS ----------------- */}
        {activeTab === 'health' && (
          <div>
            <div className="tf-section-title">System Status & Connectivity</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
              <div className="tf-field-box">
                <div className="tf-field-key">BACKEND SERVER</div>
                <div className="tf-field-val" style={{ color: healthData?.ok ? '#059669' : '#dc2626' }}>
                  {healthData?.ok ? '200 OK (Port 5000)' : 'Offline'}
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">MONGODB DATABASE</div>
                <div className="tf-field-val" style={{ color: healthData?.mongodb?.connected ? '#059669' : '#dc2626' }}>
                  {healthData?.mongodb?.connected ? 'Connected (Port 27017)' : 'Disconnected'}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--tf-text-muted)', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                  mongodb://localhost:27017/Sarkari%20Sugam-AI
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">PORTAL AGENT ENGINE</div>
                <div className="tf-field-val" style={{ color: healthData?.tinyfish_configured ? '#059669' : '#dc2626' }}>
                  {healthData?.tinyfish_configured ? 'Authenticated & Active' : 'Offline'}
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">EXECUTION MODE</div>
                <div className="tf-field-val" style={{ color: healthData?.demo_mode ? '#d97706' : '#2563eb' }}>
                  {healthData?.demo_mode ? 'Fallback Simulator' : 'Live Autonomous Browser'}
                </div>
              </div>

              <div className="tf-field-box">
                <div className="tf-field-key">SERVER UPTIME</div>
                <div className="tf-field-val">
                  {healthData?.uptime_seconds ? `${Math.round(healthData.uptime_seconds)}s` : 'N/A'}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Auth Modal for Sign In / Register / Quick Demo */}
        <AuthModal isOpen={authModalOpen} onClose={() => setAuthModalOpen(false)} />

        {/* Optional Collapsed Developer Drawer */}
        <div style={{ marginTop: '40px', borderTop: '1px solid var(--tf-border)', paddingTop: '16px' }}>
          <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}
            onClick={() => setShowJsonInspector(!showJsonInspector)}
          >
            <span style={{ fontSize: '11px', fontWeight: '600', color: 'var(--tf-text-muted)', textTransform: 'uppercase' }}>
              Developer Payload Inspector (Optional)
            </span>
            <span style={{ fontSize: '12px', color: 'var(--tf-orange)', fontWeight: '500' }}>
              {showJsonInspector ? 'Hide raw JSON' : 'Show raw JSON'}
            </span>
          </div>

          {showJsonInspector && lastRawResponse && (
            <div style={{ marginTop: '10px', padding: '16px', background: '#ffffff', border: '1px solid var(--tf-border)', borderRadius: '8px' }}>
              <div style={{ fontSize: '12px', fontWeight: '600', marginBottom: '8px', color: 'var(--tf-text-secondary)' }}>
                {lastRawResponse.endpoint} ({lastRawResponse.status})
              </div>
              <pre style={{ fontSize: '12px', color: 'var(--tf-text-primary)', overflowX: 'auto' }}>
                {JSON.stringify(lastRawResponse.data, null, 2)}
              </pre>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
