/* global React, ReactDOM */
const { useState, useEffect, useRef, useMemo } = React;

const REGIONS = window.MYRTAVIA_REGIONS;

// ─── Iconography ─────────────────────────────────────────────────────────────
const PinIcon = ({ type, size = 16 }) => {
  const s = size;
  const stroke = '#1a1208';
  const sw = 1.1;
  if (type === 'city') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16">
        <path d="M3 13 L3 7 L5 5 L5 7 L7 5 L7 7 L9 5 L9 7 L11 5 L11 7 L13 7 L13 13 Z"
              fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
        <rect x="7" y="9.5" width="2" height="3.5" fill={stroke}/>
      </svg>
    );
  }
  if (type === 'ruins') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16">
        <path d="M2 13 L2 8 L3.5 6 L3.5 13 Z M5 13 L5 5 L6 4 L6 11 L7 11 L7 13 Z M9 13 L9 11 L10 11 L10 5 L11.5 7 L11.5 13 Z M13 13 L13 9 L14 8 L14 13 Z"
              fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }
  if (type === 'dungeon') {
    return (
      <svg width={s} height={s} viewBox="0 0 16 16">
        <path d="M8 2 L9.2 6 L13.5 6 L10 8.6 L11.3 12.8 L8 10.2 L4.7 12.8 L6 8.6 L2.5 6 L6.8 6 Z"
              fill="currentColor" stroke={stroke} strokeWidth={sw} strokeLinejoin="round"/>
      </svg>
    );
  }
  // landmark
  return (
    <svg width={s} height={s} viewBox="0 0 16 16">
      <circle cx="8" cy="8" r="5" fill="currentColor" stroke={stroke} strokeWidth={sw}/>
      <circle cx="8" cy="8" r="1.7" fill={stroke}/>
    </svg>
  );
};

// Decorative filigree corner — SVG, 4 orientations via rotate prop
const FiligreeCorner = ({ size = 38, rotate = 0 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40"
       style={{ transform: `rotate(${rotate}deg)`, color: 'var(--gold)' }}>
    <path
      d="M2 2 L18 2 M2 2 L2 18 M2 2 Q10 4 12 10 Q14 14 18 14 M2 2 Q4 10 10 12 Q14 14 14 18"
      fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round"/>
    <circle cx="14" cy="14" r="1.2" fill="currentColor"/>
  </svg>
);

const Filigreed = ({ children, style }) => (
  <div className="filigreed" style={style}>
    <FiligreeCorner rotate={0}   />
    <FiligreeCorner rotate={90}  />
    <FiligreeCorner rotate={-90} />
    <FiligreeCorner rotate={180} />
    {children}
  </div>
);

// ─── Threat dots ─────────────────────────────────────────────────────────────
const ThreatDots = ({ level }) => (
  <span className="threat">
    {[1,2,3,4,5].map(i => (
      <span key={i} className={`threat-dot ${i <= level ? 'on' : ''}`} />
    ))}
  </span>
);

// ─── Side Panel ──────────────────────────────────────────────────────────────
const SidePanel = ({ region, onClose, onPoiHover, hoveredPoi, onExplore }) => {
  const open = !!region;
  return (
    <aside className={`side-panel ${open ? 'open' : ''}`}
           aria-hidden={!open}>
      {region && (
        <Filigreed style={{ height: '100%' }}>
          <div className="panel-inner">
            <button className="panel-close" onClick={onClose} aria-label="Close">
              <svg width="14" height="14" viewBox="0 0 14 14">
                <path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </button>

            <div className="panel-eyebrow">Region {String(REGIONS.findIndex(r=>r.id===region.id)+1).padStart(2,'0')} of {String(REGIONS.length).padStart(2,'0')}</div>
            <h2 className="panel-title">{region.name}</h2>
            <div className="panel-epithet">— {region.epithet} —</div>

            <div className="panel-divider"><span/></div>

            <p className="panel-blurb">{region.blurb}</p>

            <dl className="panel-meta">
              <div><dt>Ruler</dt><dd>{region.ruler}</dd></div>
              <div><dt>Climate</dt><dd>{region.climate}</dd></div>
              <div><dt>Population</dt><dd>{region.population}</dd></div>
              <div><dt>Threat</dt><dd><ThreatDots level={region.threat}/></dd></div>
            </dl>

            <div className="panel-section">
              <div className="panel-section-title">Points of Interest</div>
              <ul className="poi-list">
                {region.pois.map(p => (
                  <li key={p.id}
                      className={hoveredPoi === p.id ? 'hover' : ''}
                      onMouseEnter={() => onPoiHover(p.id)}
                      onMouseLeave={() => onPoiHover(null)}>
                    <span className={`poi-list-icon type-${p.type}`}>
                      <PinIcon type={p.type} size={13}/>
                    </span>
                    <div>
                      <div className="poi-list-name">{p.name}</div>
                      <div className="poi-list-note">{p.note}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            {region.detailMap && (
              <button className="explore-btn" onClick={() => onExplore(region.id)}>
                <span className="explore-btn-label">Explore {region.name}</span>
                <span className="explore-btn-sub">Open detailed map</span>
                <svg width="16" height="16" viewBox="0 0 16 16">
                  <path d="M3 8 L13 8 M9 4 L13 8 L9 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            )}
            {!region.detailMap && (
              <div className="explore-pending">Detailed map forthcoming…</div>
            )}

            <div className="panel-section">
              <div className="panel-section-title">Adventure Hooks</div>
              <ul className="hooks-list">
                {region.hooks.map((h, i) => (
                  <li key={i}>
                    <span className="hook-marker">§</span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </Filigreed>
      )}
    </aside>
  );
};

// ─── Legend ──────────────────────────────────────────────────────────────────
const Legend = ({ open, onClose }) => {
  if (!open) return null;
  const items = [
    { type: 'city',     label: 'Settlement / stronghold' },
    { type: 'ruins',    label: 'Ruin / forgotten site' },
    { type: 'dungeon',  label: 'Dungeon / hazard' },
    { type: 'landmark', label: 'Landmark / waypoint' },
  ];
  return (
    <div className="legend">
      <Filigreed>
        <div className="legend-inner">
          <button className="panel-close legend-close" onClick={onClose} aria-label="Close legend">
            <svg width="11" height="11" viewBox="0 0 14 14"><path d="M2 2 L12 12 M12 2 L2 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
          <div className="legend-title">Cartographer's Key</div>
          <ul>
            {items.map(it => (
              <li key={it.type}>
                <span className={`legend-icon type-${it.type}`}><PinIcon type={it.type} size={13}/></span>
                <span>{it.label}</span>
              </li>
            ))}
          </ul>
          <div className="legend-foot">Click any region to read its entry. Hover a pin for its name.</div>
        </div>
      </Filigreed>
    </div>
  );
};

// ─── Scale bar ───────────────────────────────────────────────────────────────
const ScaleBar = () => (
  <div className="scale-bar">
    <div className="scale-label">0 — 100 — 200 leagues</div>
    <div className="scale-ticks">
      <span/><span/><span/>
    </div>
  </div>
);

// ─── Mini-map ────────────────────────────────────────────────────────────────
const MiniMap = ({ active, onPick }) => {
  return (
    <div className="mini-map">
      <div className="mini-map-label">Atlas</div>
      <div className="mini-map-frame">
        <img src="map.png" alt="" draggable="false"/>
        <svg className="mini-overlay" viewBox="0 0 100 54.13" preserveAspectRatio="none">
          {REGIONS.map(r => (
            <polygon
              key={r.id}
              points={r.polygon.split(' ').map(p => {
                const [x,y] = p.split(',').map(Number);
                return `${x},${y*0.5413}`;
              }).join(' ')}
              className={`mini-region ${active === r.id ? 'active' : ''}`}
              onClick={() => onPick(r.id)}
            />
          ))}
        </svg>
      </div>
    </div>
  );
};

// ─── Toggles ─────────────────────────────────────────────────────────────────
const TopRightControls = ({ night, onToggleNight, legendOpen, onToggleLegend }) => (
  <div className="top-controls">
    <button className={`ctrl ${legendOpen ? 'on' : ''}`} onClick={onToggleLegend} title="Cartographer's key">
      <svg width="16" height="16" viewBox="0 0 16 16">
        <path d="M2 3 H14 M2 7 H14 M2 11 H10" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
      </svg>
      <span>Key</span>
    </button>
    <button className={`ctrl ${night ? 'on' : ''}`} onClick={onToggleNight} title="Toggle day / night">
      {night ? (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <path d="M11.5 9.5 A5 5 0 1 1 6.5 4.5 A4 4 0 0 0 11.5 9.5 Z" fill="currentColor"/>
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16">
          <circle cx="8" cy="8" r="3" fill="currentColor"/>
          {[0,45,90,135,180,225,270,315].map(a => {
            const r = a * Math.PI/180;
            return <line key={a} x1={8+Math.cos(r)*5} y1={8+Math.sin(r)*5} x2={8+Math.cos(r)*7} y2={8+Math.sin(r)*7} stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>;
          })}
        </svg>
      )}
      <span>{night ? 'Night' : 'Day'}</span>
    </button>
  </div>
);

// ─── Main map ────────────────────────────────────────────────────────────────
const MyrtaviaMap = () => {
  const [selectedId, setSelectedId] = useState(null);
  const [hoveredId, setHoveredId] = useState(null);
  const [hoveredPoi, setHoveredPoi] = useState(null);
  const [legendOpen, setLegendOpen] = useState(true);
  const [night, setNight] = useState(false);
  const [showIntro, setShowIntro] = useState(true);
  const [view, setView] = useState('world'); // 'world' | regionId
  const [shownRegion, setShownRegion] = useState(null); // kept rendered during exit anim
  const [zoomFocus, setZoomFocus] = useState({ x: 50, y: 50 });
  const [signInOpen, setSignInOpen] = useState(false);
  const [placingMarker, setPlacingMarker] = useState(null); // { icon, scope }
  const [pendingMarker, setPendingMarker] = useState(null); // { icon, scope, x, y }
  const mapRef = useRef(null);

  const startPlacement = (icon, scope) => {
    setPendingMarker(null);
    setPlacingMarker({ icon, scope });
  };
  const cancelPlacement = () => setPlacingMarker(null);
  const handlePlace = (x, y) => {
    if (!placingMarker) return;
    setPendingMarker({ ...placingMarker, x, y });
    setPlacingMarker(null);
  };
  const cancelNote = () => setPendingMarker(null);
  const saveNote = (text) => {
    const user = window.MyrtaviaStore.getUser();
    if (!user || !pendingMarker || !text.trim()) return;
    window.MyrtaviaStore.addMarker({
      scope: pendingMarker.scope,
      x: pendingMarker.x,
      y: pendingMarker.y,
      icon: pendingMarker.icon,
      text: text.trim(),
      userId: user.id,
      userName: user.name,
      userColor: user.color,
    });
    setPendingMarker(null);
  };

  // Compute polygon centroid for zoom focus
  const focusFor = (regionId) => {
    const r = REGIONS.find(x => x.id === regionId);
    if (!r) return { x: 50, y: 50 };
    const pts = r.polygon.split(' ').map(p => p.split(',').map(Number));
    const cx = pts.reduce((s, [x]) => s + x, 0) / pts.length;
    const cy = pts.reduce((s, [, y]) => s + y, 0) / pts.length;
    return { x: cx, y: cy };
  };

  const explore = (regionId) => {
    const r = REGIONS.find(x => x.id === regionId);
    if (!r || !r.detailMap) return;
    setSelectedId(null);            // close side panel
    setPlacingMarker(null);
    setPendingMarker(null);
    setShownRegion(r);
    setZoomFocus(focusFor(regionId));
    // Defer to next frame so CSS transition catches the class change
    requestAnimationFrame(() => setView(regionId));
  };

  const backToWorld = () => {
    setPlacingMarker(null);
    setPendingMarker(null);
    setView('world');
    // unmount region layer after exit anim completes
    setTimeout(() => setShownRegion(null), 850);
  };

  const selected = REGIONS.find(r => r.id === selectedId);

  useEffect(() => {
    const t = setTimeout(() => setShowIntro(false), 2400);
    return () => clearTimeout(t);
  }, []);

  const inRegion = view !== 'world';
  const mapInnerStyle = { transformOrigin: `${zoomFocus.x}% ${zoomFocus.y}%` };

  // Esc to back-out / deselect / cancel placement
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        if (pendingMarker) { setPendingMarker(null); return; }
        if (placingMarker) { setPlacingMarker(null); return; }
        if (inRegion) backToWorld();
        else if (selectedId) setSelectedId(null);
        else if (legendOpen) setLegendOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selectedId, legendOpen, inRegion, placingMarker, pendingMarker]);

  return (
    <div className={`stage ${night ? 'night' : 'day'} ${selected ? 'panel-open' : ''} ${inRegion ? 'in-region' : ''} ${placingMarker ? 'placing' : ''}`}>
      <div className="vignette" />

      <div className="map-wrap" ref={mapRef}>
        <div className="map-inner" style={mapInnerStyle}>
          <img className="map-img" src="map.png" alt="Map of Myrtavia" draggable="false"/>

          {/* Region polygons (interactive) */}
          <svg className="region-layer" viewBox="0 0 100 100" preserveAspectRatio="none">
            <defs>
              <filter id="region-glow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.8"/>
              </filter>
            </defs>
            {REGIONS.map(r => {
              const state = selectedId === r.id ? 'selected' : hoveredId === r.id ? 'hover' : 'idle';
              return (
                <polygon
                  key={r.id}
                  points={r.polygon}
                  className={`region region-${state}`}
                  onMouseEnter={() => setHoveredId(r.id)}
                  onMouseLeave={() => setHoveredId(null)}
                  onClick={() => setSelectedId(r.id === selectedId ? null : r.id)}
                />
              );
            })}
          </svg>

          {/* POI pins */}
          <div className="pins">
            {REGIONS.flatMap(r => r.pois.filter(p => !p.hideOnWorld).map(p => {
              const dimmed = selectedId && selectedId !== r.id;
              const active = selectedId === r.id;
              const linked = hoveredPoi === p.id;
              return (
                <div key={p.id}
                     className={`pin type-${p.type} ${dimmed ? 'dim' : ''} ${active ? 'active' : ''} ${linked ? 'linked' : ''}`}
                     style={{ left: `${p.x}%`, top: `${p.y}%` }}
                     onMouseEnter={() => setHoveredPoi(p.id)}
                     onMouseLeave={() => setHoveredPoi(null)}
                     onClick={(e) => { e.stopPropagation(); setSelectedId(r.id); }}
                >
                  <span className="pin-dot"><PinIcon type={p.type} size={11}/></span>
                  <span className="pin-label">{p.name}</span>
                </div>
              );
            }))}
          </div>

          {/* User markers + placement layer */}
          <window.MarkerLayer
            scope="world"
            placingMarker={placingMarker}
            pendingMarker={pendingMarker}
            onPlace={handlePlace}
            onSaveNote={saveNote}
            onCancelNote={cancelNote}
          />

          {/* Region hover label tooltip */}
          {hoveredId && hoveredId !== selectedId && (() => {
            const r = REGIONS.find(x => x.id === hoveredId);
            return (
              <div className="region-hover-label"
                   style={{ left: `${r.labelAt.x}%`, top: `${r.labelAt.y}%` }}>
                <div className="rhl-name">{r.name}</div>
                <div className="rhl-sub">{r.epithet} · click to read</div>
              </div>
            );
          })()}
        </div>
      </div>

      <TopRightControls
        night={night}
        onToggleNight={() => setNight(n => !n)}
        legendOpen={legendOpen}
        onToggleLegend={() => setLegendOpen(o => !o)}
      />

      {!inRegion && (
        <div className="add-marker-slot world">
          <window.AddMarkerControl
            scope="world"
            placingActive={placingMarker && placingMarker.scope === 'world'}
            onStartPlacement={startPlacement}
            onCancelPlacement={cancelPlacement}
            onRequestSignIn={() => setSignInOpen(true)}
          />
        </div>
      )}

      <div className="auth-slot">
        <window.AuthBadge onOpenSignIn={() => setSignInOpen(true)} />
      </div>

      {signInOpen && (
        <window.SignInModal onClose={() => setSignInOpen(false)} />
      )}

      <Legend open={legendOpen} onClose={() => setLegendOpen(false)} />

      <div className="bottom-controls">
        <ScaleBar />
        <MiniMap active={selectedId} onPick={(id) => setSelectedId(id)} />
      </div>

      <SidePanel
        region={selected}
        onClose={() => setSelectedId(null)}
        onPoiHover={setHoveredPoi}
        hoveredPoi={hoveredPoi}
        onExplore={explore}
      />

      {shownRegion && (
        <RegionView
          region={shownRegion}
          onBack={backToWorld}
          inRegion={inRegion}
          onSignIn={() => setSignInOpen(true)}
          placingMarker={placingMarker}
          pendingMarker={pendingMarker}
          onStartPlacement={startPlacement}
          onCancelPlacement={cancelPlacement}
          onPlace={handlePlace}
          onSaveNote={saveNote}
          onCancelNote={cancelNote}
        />
      )}

      <window.PlacementBanner
        placingMarker={placingMarker}
        onCancel={cancelPlacement}
      />

      {showIntro && (
        <div className="intro">
          <div className="intro-text">
            <div className="intro-eyebrow">— A Cartographer's Account —</div>
            <div className="intro-main">Myrtavia</div>
            <div className="intro-sub">Six realms. Click any to begin.</div>
          </div>
        </div>
      )}
    </div>
  );
};

ReactDOM.createRoot(document.getElementById('root')).render(<MyrtaviaMap />);
