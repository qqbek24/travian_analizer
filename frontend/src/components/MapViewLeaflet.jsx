import React, { useEffect, useState, useMemo, memo } from 'react'
import { MapContainer, TileLayer, CircleMarker, Circle, Popup, Tooltip, Polyline, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'

// Custom component to add coordinate labels
function CoordinateLabels() {
  const map = useMap()
  
  useEffect(() => {
    // Create custom pane for labels
    if (!map.getPane('coordinateLabels')) {
      const pane = map.createPane('coordinateLabels')
      pane.style.zIndex = 400
      pane.style.pointerEvents = 'none'
    }
    
    const labels = []
    
    // Create labels for coordinates every 50 units
    for (let coord = -200; coord <= 200; coord += 50) {
      if (coord === 0) continue
      
      // X-axis labels (top)
      const xLabel = L.marker([coord, -210], {
        icon: L.divIcon({
          className: 'coord-label',
          html: `<div style="color: #94a3b8; font-size: 11px; text-align: center; white-space: nowrap;">${coord}</div>`,
          iconSize: [30, 20]
        }),
        pane: 'coordinateLabels'
      }).addTo(map)
      labels.push(xLabel)
      
      // Y-axis labels (left)
      const yLabel = L.marker([-210, coord], {
        icon: L.divIcon({
          className: 'coord-label',
          html: `<div style="color: #94a3b8; font-size: 11px; text-align: right; white-space: nowrap;">${coord}</div>`,
          iconSize: [30, 20]
        }),
        pane: 'coordinateLabels'
      }).addTo(map)
      labels.push(yLabel)
    }
    
    return () => {
      labels.forEach(label => map.removeLayer(label))
    }
  }, [map])
  
  return null
}

// Component to update map view when viewCenter or zoom changes
function MapUpdater({ center, zoom }) {
  const map = useMap()
  
  useEffect(() => {
    map.setView(center, zoom)
  }, [center, zoom, map])
  
  return null
}

const PALETTE = ['#f97316','#06b6d4','#a855f7','#84cc16','#ec4899','#14b8a6','#e879f9','#facc15','#3b82f6','#22c55e']

const MapViewLeaflet = memo(function MapViewLeaflet({ mapData, filterPlayers = [], filterAlliances = [], hoveredTag = null, zoom, setZoom, viewCenter, setViewCenter, regionOverlay = null, raidList = null, inactiveOverlays = [] }) {
  const leafletCenter = useMemo(() => [viewCenter.y, viewCenter.x], [viewCenter])
  const leafletZoom = useMemo(() => Math.max(1, Math.min(5, 3 + (zoom - 1) * 0.5)), [zoom])
  
  const handleResetView = () => {
    setZoom(1)
    setViewCenter({ x: 0, y: 0 })
  }

  const { normalVillages, taggedVillages } = useMemo(() => {
    if (!mapData?.villages) return { normalVillages: [], taggedVillages: [] }

    const playerTagsLower = filterPlayers.map(t => t.toLowerCase())
    const allianceTagsLower = filterAlliances.map(t => t.toLowerCase())
    const hasFilters = playerTagsLower.length > 0 || allianceTagsLower.length > 0

    const normal = []
    const tagged = []

    mapData.villages.forEach(village => {
      const ownerL = village.owner.toLowerCase()
      const allianceL = village.alliance.toLowerCase()

      const playerIdx = playerTagsLower.findIndex(t => ownerL.includes(t))
      if (playerIdx !== -1) {
        tagged.push({ ...village, tagColor: PALETTE[(filterAlliances.length + playerIdx) % PALETTE.length], tagType: 'player', tagLabel: filterPlayers[playerIdx] })
        return
      }

      const allianceIdx = allianceTagsLower.findIndex(t => allianceL.includes(t))
      if (allianceIdx !== -1) {
        tagged.push({ ...village, tagColor: PALETTE[allianceIdx % PALETTE.length], tagType: 'alliance', tagLabel: filterAlliances[allianceIdx] })
        return
      }

      if (!hasFilters || regionOverlay?.show) normal.push(village)
    })

    return { normalVillages: normal, taggedVillages: tagged }
  }, [mapData, filterPlayers, filterAlliances, regionOverlay])

  // Memoize normal villages — no hoveredTag dep, won't re-render on hover
  const normalMarkers = useMemo(() => {
    const hasOverlays = taggedVillages.length > 0 || raidList?.show || inactiveOverlays.length > 0
    return normalVillages.map(village => {
      const regionColor = regionOverlay?.show && regionOverlay.regionColors && village.region
        ? regionOverlay.regionColors[village.region]
        : null
      const isHighlighted = regionColor && regionOverlay?.highlightedRegion === village.region
      const color = regionColor ?? (village.is_capital ? '#fbbf24' : '#3b82f6')
      const radius = regionColor ? 3 : Math.min(8, Math.max(3, village.population / 100))
      const fillOpacity = regionColor ? (isHighlighted ? 1.0 : (hasOverlays ? 0.4 : 0.8)) : 0.7
      return (
        <CircleMarker
          key={`normal-${village.x}-${village.y}`}
          center={[village.y, village.x]}
          radius={radius}
          pathOptions={{ fillColor: color, fillOpacity, color: isHighlighted ? '#fff' : color, weight: isHighlighted ? 1 : 0.5, opacity: 0.8 }}
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
            <div style={{ fontSize: '0.875rem' }}>
              <strong>{village.name}</strong> ({village.x}|{village.y})<br />
              {village.owner} {village.alliance ? `[${village.alliance}]` : ''}<br />
              Pop: {village.population}{village.is_capital && <> 👑</>}
            </div>
          </Tooltip>
        </CircleMarker>
      )
    })
  }, [normalVillages, regionOverlay, taggedVillages.length, raidList?.show, inactiveOverlays.length])

  // Memoize non-hovered tagged — only changes when hoveredTag goes null↔non-null
  const hasHoveredTag = hoveredTag != null
  const taggedMarkers = useMemo(() => (
    taggedVillages
      .filter(v => !(hoveredTag && v.tagType === hoveredTag.type && v.tagLabel === hoveredTag.label))
      .map(village => {
        const isPlayer = village.tagType === 'player'
        return (
          <CircleMarker
            key={`tagged-${village.x}-${village.y}`}
            center={[village.y, village.x]}
            radius={Math.min(8, Math.max(3, village.population / 100))}
            pathOptions={{
              fillColor: village.tagColor,
              fillOpacity: hasHoveredTag ? 0.25 : 0.95,
              color: village.is_capital ? '#fbbf24' : village.tagColor,
              weight: isPlayer ? 3 : 1.5,
              opacity: hasHoveredTag ? 0.3 : 1
            }}
            className={isPlayer ? 'leaflet-pulsing-marker' : ''}
          >
            <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
              <div style={{ fontSize: '0.875rem' }}>
                <strong style={{ color: village.tagColor }}>[{village.tagLabel}] {village.name}</strong> ({village.x}|{village.y})<br />
                {village.owner} {village.alliance ? `[${village.alliance}]` : ''}<br />
                Pop: {village.population}{village.is_capital && <> 👑</>}
              </div>
            </Tooltip>
          </CircleMarker>
        )
      })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ), [taggedVillages, hasHoveredTag])

  // Memoize hovered villages — small set, fast re-render
  const hoveredMarkers = useMemo(() => {
    if (!hoveredTag) return null
    return taggedVillages
      .filter(v => v.tagType === hoveredTag.type && v.tagLabel === hoveredTag.label)
      .map(village => (
        <CircleMarker
          key={`hovered-${village.x}-${village.y}`}
          center={[village.y, village.x]}
          radius={Math.min(8, Math.max(3, village.population / 100)) * 1.5}
          pathOptions={{ fillColor: '#ef4444', fillOpacity: 1, color: '#ffffff', weight: 2, opacity: 1 }}
          className="leaflet-hovered-marker"
        >
          <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
            <div style={{ fontSize: '0.875rem' }}>
              <strong style={{ color: '#ef4444' }}>[{village.tagLabel}] {village.name}</strong> ({village.x}|{village.y})<br />
              {village.owner} {village.alliance ? `[${village.alliance}]` : ''}<br />
              Pop: {village.population}{village.is_capital && <> 👑</>}
            </div>
          </Tooltip>
        </CircleMarker>
      ))
  }, [hoveredTag, taggedVillages])

  return (
    <div style={{ 
      background: '#0f172a', 
      padding: '2rem',
      borderRadius: '0.5rem',
      overflow: 'hidden',
      position: 'relative',
      height: '950px'
    }}>
      <MapContainer 
        center={[0, 0]}
        zoom={1.5} 
        bounds={[[-200, -200], [200, 200]]}
        boundsOptions={{ padding: [30, 30] }}
        maxBounds={[[-250, -250], [250, 250]]}
        style={{ 
          height: '100%', 
          width: '100%',
          background: '#1e293b',
          borderRadius: '4px',
          border: '2px solid #334155'
        }}
        minZoom={1}
        maxZoom={5}
        crs={L.CRS.Simple}
        scrollWheelZoom={true}
        doubleClickZoom={false}
      >
        <MapUpdater center={leafletCenter} zoom={leafletZoom} />
        <CoordinateLabels />
        
        {/* Dark tile layer simulation */}
        <TileLayer
          url=""
          attribution=""
        />
        
        {/* Osie główne */}
        <Polyline 
          positions={[[0, -200], [0, 200]]} 
          pathOptions={{ color: '#334155', weight: 2, opacity: 0.8 }}
        />
        <Polyline 
          positions={[[-200, 0], [200, 0]]} 
          pathOptions={{ color: '#334155', weight: 2, opacity: 0.8 }}
        />
        
        {/* Linie ćwiartek */}
        <Polyline 
          positions={[[0, -100], [0, 100]]} 
          pathOptions={{ color: '#1e293b', weight: 1, opacity: 0.5, dashArray: '5,5' }}
        />
        <Polyline 
          positions={[[-100, 0], [100, 0]]} 
          pathOptions={{ color: '#1e293b', weight: 1, opacity: 0.5, dashArray: '5,5' }}
        />

        {/* Normal villages — memoized, no hover dep */}
        {normalMarkers}

        {/* Inactive overlays */}
        {inactiveOverlays.map(overlay => (
          <React.Fragment key={`ioverlay-${overlay.id}`}>
            {overlay.center_x != null && overlay.center_y != null && overlay.radius != null && (
              <Circle
                center={[overlay.center_y, overlay.center_x]}
                radius={overlay.radius * 111000 / 400}
                pathOptions={{ color: overlay.color, weight: 1.5, fillOpacity: 0, dashArray: '8,4', opacity: 0.7 }}
              />
            )}
            {overlay.villages.map((v, idx) => (
              <CircleMarker key={idx} center={[v.y, v.x]} radius={5}
                pathOptions={{ fillColor: overlay.color, fillOpacity: 0.85, color: '#fff', weight: 0.5 }}>
                <Tooltip direction="top" offset={[0, -6]} opacity={0.95}>
                  <span>{overlay.name}: {v.label} ({v.x}|{v.y})</span>
                </Tooltip>
              </CircleMarker>
            ))}
          </React.Fragment>
        ))}

        {/* Raid list overlay */}
        {raidList?.show && raidList.targets?.map((target, idx) => (
          <CircleMarker key={`raid-${idx}`} center={[target.y, target.x]} radius={7}
            pathOptions={{ fillColor: '#ef4444', fillOpacity: 0.9, color: '#ffffff', weight: 1.5 }}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95} permanent={false}>
              <span>#{idx + 1} 🗡️ {target.name || ''} ({target.x}|{target.y}){target.owner ? ` — ${target.owner}` : ''}{target.alliance ? ` [${target.alliance}]` : ''}</span>
            </Tooltip>
          </CircleMarker>
        ))}

        {/* Raid home marker */}
        {raidList?.show && raidList.homeX != null && raidList.homeY != null && (
          <CircleMarker center={[raidList.homeY, raidList.homeX]} radius={8}
            pathOptions={{ fillColor: '#facc15', fillOpacity: 1, color: '#ffffff', weight: 1.5 }}>
            <Tooltip direction="top" offset={[0, -8]} opacity={0.95}>
              <span>🏠 Start: ({raidList.homeX}|{raidList.homeY})</span>
            </Tooltip>
          </CircleMarker>
        )}

        {/* Tagged (dimmed) — memoized on !!hoveredTag, not specific tag */}
        {taggedMarkers}
        {/* Hovered villages — small fast set */}
        {hoveredMarkers}
      </MapContainer>

      {/* CSS for pulsing animation */}
      <style>
        {`
          @keyframes leaflet-pulse {
            0%, 100% {
              stroke: #16a34a;
              stroke-width: 3;
              stroke-opacity: 1;
            }
            50% {
              stroke: #4ade80;
              stroke-width: 5;
              stroke-opacity: 0.7;
            }
          }
          .leaflet-pulsing-marker {
            animation: leaflet-pulse 1.5s ease-in-out infinite;
          }
          @keyframes leaflet-hover-pulse {
            0%, 100% { stroke-opacity: 1; stroke-width: 2; }
            50% { stroke-opacity: 0.3; stroke-width: 6; }
          }
          .leaflet-hovered-marker {
            animation: leaflet-hover-pulse 0.6s ease-in-out infinite;
          }
        `}
      </style>
      
      <div style={{
        position: 'absolute',
        top: '1rem',
        right: '1rem',
        background: 'rgba(15, 23, 42, 0.9)',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        border: '1px solid #334155',
        color: '#10b981',
        fontSize: '0.875rem',
        fontWeight: '600',
        zIndex: 1000
      }}>
        🗺️ React Leaflet
      </div>
      
      {/* Przycisk Reset View */}
      <button
        onClick={handleResetView}
        style={{
          position: 'absolute',
          top: '4rem',
          right: '1rem',
          background: '#1e293b',
          border: '1px solid #334155',
          borderRadius: '0.5rem',
          padding: '0.5rem 1rem',
          color: '#94a3b8',
          fontSize: '0.875rem',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '0.5rem',
          zIndex: 1000,
          transition: 'all 0.2s'
        }}
        onMouseEnter={(e) => {
          e.target.style.background = '#334155'
          e.target.style.color = '#e2e8f0'
        }}
        onMouseLeave={(e) => {
          e.target.style.background = '#1e293b'
          e.target.style.color = '#94a3b8'
        }}
        title="Wyśrodkuj mapę"
      >
        <CenterFocusStrongIcon sx={{ fontSize: 18 }} />
        Reset
      </button>
    </div>
  )
})

export default MapViewLeaflet
