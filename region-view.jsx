/* global React */
const { useState: useStateR, useEffect: useEffectR } = React;

// Region detail view — full-bleed map with interactive hotspots + notes
function RegionView({ region, onBack, inRegion, onSignIn, placingMarker, pendingMarker, onStartPlacement, onCancelPlacement, onPlace, onSaveNote, onCancelNote }) {
  const [hoveredHotspot, setHoveredHotspot] = useStateR(null);
  const [selectedHotspot, setSelectedHotspot] = useStateR(null);

  // subscribe to store so post-its update when notes change
  const store = window.useMyrtaviaStore();

  // close pinned card on Esc (handled by parent for back; this is for card close)
  useEffectR(() => {
    if (!selectedHotspot) return;
    const onKey = (e) => { if (e.key === 'Escape') { e.stopPropagation(); setSelectedHotspot(null); } };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [selectedHotspot]);

  if (!region || !region.detail) return null;

  const hover = region.detail.hotspots.find(h => h.id === hoveredHotspot);
  const selected = region.detail.hotspots.find(h => h.id === selectedHotspot);
  const active = selected || hover;

  return (
    <div className={`region-view ${inRegion ? 'showing' : 'leaving'}`}>
      <div className="region-view-inner">
        <img className="region-map" src={region.detailMap} alt={`Map of ${region.name}`} draggable="false"/>

        <div className="region-hotspots">
          {region.detail.hotspots.map(h => {
            const noteCount = store.getNotes(region.id, h.id).length;
            return (
              <button
                key={h.id}
                className={`hotspot type-${h.type}
                  ${hoveredHotspot === h.id ? 'hover' : ''}
                  ${selectedHotspot === h.id ? 'selected' : ''}
                  ${noteCount > 0 ? 'has-notes' : ''}`}
                style={{ left: `${h.x}%`, top: `${h.y}%` }}
                onMouseEnter={() => setHoveredHotspot(h.id)}
                onMouseLeave={() => setHoveredHotspot(null)}
                onClick={() => setSelectedHotspot(selectedHotspot === h.id ? null : h.id)}
                aria-label={h.name}
              >
                <span className="hotspot-ring"></span>
                <span className="hotspot-dot"></span>
                <window.NotePostits regionId={region.id} poiId={h.id} />
              </button>
            );
          })}
        </div>

        {/* Floating info card */}
        {active && (
          <div
            className={`hotspot-card ${selected ? 'pinned' : ''}`}
            style={{
              left: `${active.x}%`,
              top: `${active.y}%`,
              transform: active.y > 70
                ? 'translate(-50%, calc(-100% - 22px))'
                : 'translate(-50%, 22px)',
            }}
            onMouseEnter={() => { if (!selected) setHoveredHotspot(active.id); }}
          >
            <div className="hotspot-card-type">{
              {city:'Settlement', ruins:'Ruin', dungeon:'Hazard', landmark:'Landmark'}[active.type]
            }</div>
            <div className="hotspot-card-name">{active.name}</div>
            <div className="hotspot-card-blurb">{active.blurb}</div>

            {selected ? (
              <window.HotspotNotes
                regionId={region.id}
                poiId={selected.id}
                onSignIn={onSignIn}
              />
            ) : (
              (() => {
                const c = store.getNotes(region.id, active.id).length;
                if (c === 0) return null;
                return (
                  <div className="hotspot-card-notes-hint">
                    {c} campaign note{c > 1 ? 's' : ''} pinned · click to read
                  </div>
                );
              })()
            )}

            {selected && (
              <button className="hotspot-card-close" onClick={() => setSelectedHotspot(null)} aria-label="Close">×</button>
            )}
          </div>
        )}
        {/* User markers layer (rendered above hotspots so they're clickable) */}
        <window.MarkerLayer
          scope={region.id}
          placingMarker={placingMarker}
          pendingMarker={pendingMarker}
          onPlace={onPlace}
          onSaveNote={onSaveNote}
          onCancelNote={onCancelNote}
        />

      </div>

      {/* Back / breadcrumb */}
      <div className="region-topbar">
        <button className="back-btn" onClick={onBack}>
          <svg width="14" height="14" viewBox="0 0 14 14">
            <path d="M9 2 L4 7 L9 12" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>Atlas of Myrtavia</span>
        </button>
        <div className="region-crumb">
          <span className="crumb-sep">/</span>
          <span className="crumb-name">{region.name}</span>
          <span className="crumb-epithet">— {region.epithet}</span>
        </div>
        <div className="region-topbar-spacer"></div>
        <window.AddMarkerControl
          scope={region.id}
          placingActive={placingMarker && placingMarker.scope === region.id}
          onStartPlacement={onStartPlacement}
          onCancelPlacement={onCancelPlacement}
          onRequestSignIn={onSignIn}
          variant="in-region"
        />
      </div>
    </div>
  );
}

window.RegionView = RegionView;
