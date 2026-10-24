import React, { useState, useEffect } from 'react';
import './App.css';

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
    let ignore = false;
    async function loadHealth() {
      try {
        const res = await fetch('/api/health');
        const data = await res.json();
        if (!ignore) {
          setHealthData(data);
        }
      } catch {
        if (!ignore) {
          setHealthData({ ok: false });
        }
      }
    }
    loadHealth();
    return () => {
      ignore = true;
    };
  }, []);



  // Action: Search
  async function handleSearch(e) {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setSearchError(null);

    try {
      const res = await fetch('/api/tenders/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/tenders/fetch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
      const res = await fetch('/api/tenders/diff', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

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
          <div className="tf-user-profile-row">
            <div className="tf-user-profile-left">
              <div className="tf-user-avatar">I</div>
              <div>
                <div className="tf-user-name">Ishant Mohan</div>
                <div className="tf-user-email">ishantmohan045@gmail.com</div>
              </div>
            </div>
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
              {activeTab === 'home' && "Ishant"}
              {activeTab === 'search' && 'Search Playground'}
              {activeTab === 'fetch' && 'Structured Fetch Playground'}
              {activeTab === 'diff' && 'Monitor & Corrigendum Watchdog'}
              {activeTab === 'health' && 'System Health & Metrics'}
            </h1>
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
                    <div className="tf-snapshot-sub">Active baselines in memory</div>
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
            <div className="tf-panel">
              <div className="tf-panel-header">
                <div>
                  <h2 className="tf-panel-title">Corrigendum & Mutation Watchdog</h2>
                  <div className="tf-panel-desc">
                    Re-fetches target and detects unannounced amendments, budget shifts, or deadline changes
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
                <div className="tf-field-key">TINYFISH WEB GATEWAY</div>
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


      </main>
    </div>
  );
}
