import { useState, useEffect, useRef, useMemo, useCallback, useDeferredValue } from 'react'
import axios from 'axios'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import NorthWestIcon from '@mui/icons-material/NorthWest'
import NorthEastIcon from '@mui/icons-material/NorthEast'
import SouthWestIcon from '@mui/icons-material/SouthWest'
import SouthEastIcon from '@mui/icons-material/SouthEast'
import MapViewCanvas from './MapViewCanvas'
import MapViewLeaflet from './MapViewLeaflet'

const API_URL = 'http://localhost:8000'

const PALETTE = ['#f97316','#06b6d4','#a855f7','#84cc16','#ec4899','#14b8a6','#e879f9','#facc15','#3b82f6','#22c55e']

function MapView({ selectedSnapshot, setSelectedSnapshot, snapshots }) {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterPlayers, setFilterPlayers] = useState([])
  const [filterPlayerInput, setFilterPlayerInput] = useState('')
  const [filterAlliances, setFilterAlliances] = useState([])
  const [filterAllianceInput, setFilterAllianceInput] = useState('')
  const [hoveredTag, setHoveredTag] = useState(null)
  const [renderType, setRenderType] = useState('svg') // 'svg', 'canvas', 'leaflet'
  const [zoom, setZoom] = useState(1)
  const [viewCenter, setViewCenter] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const svgRef = useRef(null)

  useEffect(() => {
    if (selectedSnapshot) {
      loadMapData()
    }
  }, [selectedSnapshot])

  const loadMapData = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/map/${selectedSnapshot}`)
      setMapData(response.data)
    } catch (error) {
      console.error('Błąd ładowania mapy:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrowanie wiosek - multi-tag z kolorami per tag
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

      // Priorytet: gracz > sojusz
      const playerIdx = playerTagsLower.findIndex(t => ownerL.includes(t))
      if (playerIdx !== -1) {
        const colorIdx = (filterAlliances.length + playerIdx) % PALETTE.length
        tagged.push({ ...village, tagColor: PALETTE[colorIdx], tagType: 'player', tagLabel: filterPlayers[playerIdx] })
        return
      }

      const allianceIdx = allianceTagsLower.findIndex(t => allianceL.includes(t))
      if (allianceIdx !== -1) {
        const colorIdx = allianceIdx % PALETTE.length
        tagged.push({ ...village, tagColor: PALETTE[colorIdx], tagType: 'alliance', tagLabel: filterAlliances[allianceIdx] })
        return
      }

      if (!hasFilters) normal.push(village)
    })

    return { normalVillages: normal, taggedVillages: tagged }
  }, [mapData, filterPlayers, filterAlliances])

  const filteredVillages = useMemo(() => {
    return [...normalVillages, ...taggedVillages]
  }, [normalVillages, taggedVillages])

  // Konwersja koordynatów mapy do pikseli
  const mapSize = 600
  const MAP_MIN = -200
  const MAP_MAX = 200
  const MAP_RANGE = MAP_MAX - MAP_MIN

  const coordToPixel = (coord, isY = false) => {
    const normalized = (coord - MAP_MIN) / MAP_RANGE
    const pixel = normalized * mapSize
    return isY ? mapSize - pixel : pixel // Odwróć Y
  }

  // Zoom controls z useCallback
  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev * 1.5, 10)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev / 1.5, 1)), [])
  const handleResetView = useCallback(() => {
    setZoom(1)
    setViewCenter({ x: 0, y: 0 })
  }, [])

  // Scroll wheel zoom - blokuje scrollowanie strony
  const handleWheel = useCallback((e) => {
    e.preventDefault()
    e.stopPropagation()
    const delta = e.deltaY
    const zoomFactor = delta > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 1), 10))
  }, [])

  // Dodaj native event listener aby wymusić preventDefault
  useEffect(() => {
    const svg = svgRef.current
    if (svg) {
      const wheelHandler = (e) => {
        e.preventDefault()
        e.stopPropagation()
      }
      svg.addEventListener('wheel', wheelHandler, { passive: false })
      return () => svg.removeEventListener('wheel', wheelHandler)
    }
  }, [])

  // Mouse drag to pan z useCallback
  const handleMouseDown = useCallback((e) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [zoom])

  const handleMouseMove = useCallback((e) => {
    if (isDragging && zoom > 1) {
      const dx = (e.clientX - dragStart.x) / zoom
      const dy = (e.clientY - dragStart.y) / zoom
      
      // Konwertuj piksele na koordynaty mapy
      const mapDx = (dx / mapSize) * MAP_RANGE
      const mapDy = -(dy / mapSize) * MAP_RANGE
      
      setViewCenter(prev => ({
        x: Math.max(MAP_MIN, Math.min(MAP_MAX, prev.x - mapDx)),
        y: Math.max(MAP_MIN, Math.min(MAP_MAX, prev.y - mapDy))
      }))
      
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }, [isDragging, zoom, dragStart])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleMouseLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  // Szybki zoom na ćwiartki
  const zoomToQuadrant = (quadrant) => {
    setZoom(2) // Zoom 2x
    switch(quadrant) {
      case 'NW': // North-West (góra-lewo)
        setViewCenter({ x: -100, y: 100 })
        break
      case 'NE': // North-East (góra-prawo)
        setViewCenter({ x: 100, y: 100 })
        break
      case 'SW': // South-West (dół-lewo)
        setViewCenter({ x: -100, y: -100 })
        break
      case 'SE': // South-East (dół-prawo)
        setViewCenter({ x: 100, y: -100 })
        break
    }
  }

  return (
    <div className="card">
      <h2>🗺️ Mapa Świata</h2>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
          Wybierz snapshot:
        </label>
        <select 
          className="select"
          value={selectedSnapshot}
          onChange={(e) => setSelectedSnapshot(e.target.value)}
        >
          <option value="">-- Wybierz snapshot --</option>
          {snapshots.map(s => (
            <option key={s.name} value={s.name}>{s.name}</option>
          ))}
        </select>
      </div>

      {selectedSnapshot && (
        <>
          {/* Wybór typu renderowania */}
          <div style={{ marginBottom: '2rem' }}>
            <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
              Typ renderowania mapy:
            </label>
            <select 
              className="select"
              value={renderType}
              onChange={(e) => setRenderType(e.target.value)}
              style={{ maxWidth: '400px' }}
            >
              <option value="svg">SVG (Domyślny - dobry dla małych map)</option>
              <option value="canvas">Canvas 2D API (Szybszy dla dużych map)</option>
              <option value="leaflet">React Leaflet (Interaktywna mapa)</option>
            </select>
          </div>

          <div className="grid">
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Gracze (Enter = dodaj):</label>
              <div style={{ minHeight: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem', alignContent: 'flex-start' }}>
                {filterPlayers.map((tag, i) => (
                  <span key={tag + i} style={{ background: PALETTE[(filterAlliances.length + i) % PALETTE.length], color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                    {tag}
                    <button onClick={() => setFilterPlayers(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, lineHeight: 1, fontSize: '1rem' }}>×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="input"
                placeholder="Nazwa gracza..."
                value={filterPlayerInput}
                onChange={(e) => setFilterPlayerInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filterPlayerInput.trim()) {
                    setFilterPlayers(prev => [...prev, filterPlayerInput.trim()])
                    setFilterPlayerInput('')
                  }
                }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8', fontSize: '0.875rem' }}>Sojusze (Enter = dodaj):</label>
              <div style={{ minHeight: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '0.5rem', alignContent: 'flex-start' }}>
                {filterAlliances.map((tag, i) => (
                  <span key={tag + i} style={{ background: PALETTE[i % PALETTE.length], color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', whiteSpace: 'nowrap' }}>
                    {tag}
                    <button onClick={() => setFilterAlliances(prev => prev.filter((_, idx) => idx !== i))} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#fff', padding: 0, lineHeight: 1, fontSize: '1rem' }}>×</button>
                  </span>
                ))}
              </div>
              <input
                type="text"
                className="input"
                placeholder="Tag sojuszu..."
                value={filterAllianceInput}
                onChange={(e) => setFilterAllianceInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && filterAllianceInput.trim()) {
                    setFilterAlliances(prev => [...prev, filterAllianceInput.trim()])
                    setFilterAllianceInput('')
                  }
                }}
              />
            </div>
          </div>

          {/* Kontrolki Zoomu */}
          <div style={{ 
            marginTop: '1rem', 
            marginBottom: '1rem',
            display: 'flex',
            gap: '1rem',
            alignItems: 'center',
            flexWrap: 'wrap'
          }}>
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
              <button 
                className="button"
                onClick={handleZoomOut}
                disabled={zoom <= 1}
                style={{ 
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ZoomOutIcon style={{ fontSize: '1.2rem' }} />
                Oddal
              </button>
              <span style={{ 
                color: '#94a3b8', 
                minWidth: '80px',
                textAlign: 'center',
                background: '#1e293b',
                padding: '0.5rem',
                borderRadius: '0.25rem'
              }}>
                Zoom: {zoom.toFixed(1)}x
              </span>
              <button 
                className="button"
                onClick={handleZoomIn}
                disabled={zoom >= 10}
                style={{ 
                  padding: '0.5rem 1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <ZoomInIcon style={{ fontSize: '1.2rem' }} />
                Przybliż
              </button>
              <button 
                className="button"
                onClick={handleResetView}
                style={{ 
                  padding: '0.5rem 1rem', 
                  marginLeft: '0.5rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem'
                }}
              >
                <CenterFocusStrongIcon style={{ fontSize: '1.2rem' }} />
                Reset
              </button>
            </div>

            {/* Szybki zoom na ćwiartki */}
            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginLeft: 'auto' }}>
              <span style={{ color: '#94a3b8', marginRight: '0.5rem' }}>Szybki zoom:</span>
              <button 
                className="button"
                onClick={() => zoomToQuadrant('NW')}
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Północny-Zachód"
              >
                <NorthWestIcon style={{ fontSize: '1rem' }} />
              </button>
              <button 
                className="button"
                onClick={() => zoomToQuadrant('NE')}
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Północny-Wschód"
              >
                <NorthEastIcon style={{ fontSize: '1rem' }} />
              </button>
              <button 
                className="button"
                onClick={() => zoomToQuadrant('SW')}
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Południowy-Zachód"
              >
                <SouthWestIcon style={{ fontSize: '1rem' }} />
              </button>
              <button 
                className="button"
                onClick={() => zoomToQuadrant('SE')}
                style={{ 
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.875rem',
                  display: 'flex',
                  alignItems: 'center'
                }}
                title="Południowy-Wschód"
              >
                <SouthEastIcon style={{ fontSize: '1rem' }} />
              </button>
            </div>
          </div>

          {loading ? (
            <div className="loading">Ładowanie mapy...</div>
          ) : mapData ? (
            <div>
              <p style={{ color: '#94a3b8', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
                <span>Pokazuje {filteredVillages?.length || 0} z {mapData.villages.length} wiosek</span>
                {filterAlliances.map((tag, i) => {
                  const count = taggedVillages.filter(v => v.tagType === 'alliance' && v.tagLabel === tag).length
                  return <span key={tag + i} style={{ color: PALETTE[i % PALETTE.length] }}>■ {tag}: {count}</span>
                })}
                {filterPlayers.map((tag, i) => {
                  const count = taggedVillages.filter(v => v.tagType === 'player' && v.tagLabel === tag).length
                  return <span key={tag + i} style={{ color: PALETTE[(filterAlliances.length + i) % PALETTE.length] }}>● {tag}: {count}</span>
                })}
              </p>
              
              {/* Renderowanie różnych typów map */}
              {renderType === 'canvas' ? (
                <MapViewCanvas
                  mapData={mapData}
                  filterPlayers={filterPlayers}
                  filterAlliances={filterAlliances}
                  hoveredTag={hoveredTag}
                  zoom={zoom}
                  setZoom={setZoom}
                  viewCenter={viewCenter}
                  setViewCenter={setViewCenter}
                />
              ) : renderType === 'leaflet' ? (
                <MapViewLeaflet
                  mapData={mapData}
                  filterPlayers={filterPlayers}
                  filterAlliances={filterAlliances}
                  hoveredTag={hoveredTag}
                  zoom={zoom}
                  setZoom={setZoom}
                  viewCenter={viewCenter}
                  setViewCenter={setViewCenter}
                />
              ) : (
              /* SVG Rendering (default) */
              <div style={{ 
                background: '#0f172a', 
                padding: '2rem',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                position: 'relative',
                cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default'),
                touchAction: 'none' // Blokuje standardowe gesty touch (scroll, pinch-zoom)
              }}>
                <style>
                  {`
                    @keyframes playerPulse {
                      0%, 100% { stroke-width: 2; opacity: 0.8; }
                      50% { stroke-width: 4; opacity: 0.25; }
                    }
                    .player-village {
                      animation: playerPulse 1.5s ease-in-out infinite;
                    }
                    @keyframes hoverRingPulse {
                      0%, 100% { stroke-opacity: 1; stroke-width: 3; }
                      50% { stroke-opacity: 0.2; stroke-width: 6; }
                    }
                    .hover-ring {
                      animation: hoverRingPulse 0.6s ease-in-out infinite;
                    }
                  `}
                </style>

                <svg 
                  ref={svgRef}
                  width={mapSize + 40} 
                  height={mapSize + 40}
                  style={{ border: '2px solid #334155' }}
                  viewBox={`0 0 ${mapSize + 40} ${mapSize + 40}`}
                  onWheel={handleWheel}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseLeave}
                >
                  <defs>
                    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                      <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#1e293b" strokeWidth="0.5"/>
                    </pattern>
                  </defs>
                  
                  {/* Główna grupa z transformacją zoom */}
                  <g transform={`translate(${mapSize/2 + 20}, ${mapSize/2 + 20})`}>
                    <g transform={`scale(${zoom})`}>
                      <g transform={`translate(${-coordToPixel(viewCenter.x)}, ${-coordToPixel(viewCenter.y, true)})`}>
                        
                        {/* Siatka */}
                        <rect 
                          width={mapSize} 
                          height={mapSize} 
                          fill="url(#grid)" 
                          x="0" 
                          y="0"
                          transform="translate(-20, -20)"
                        />
                        
                        {/* Osie */}
                        <line 
                          x1={0} 
                          y1={coordToPixel(0, true)} 
                          x2={mapSize} 
                          y2={coordToPixel(0, true)} 
                          stroke="#334155" 
                          strokeWidth={2 / zoom} 
                        />
                        <line 
                          x1={coordToPixel(0)} 
                          y1={0} 
                          x2={coordToPixel(0)} 
                          y2={mapSize} 
                          stroke="#334155" 
                          strokeWidth={2 / zoom} 
                        />
                        
                        {/* Linie ćwiartek */}
                        <line 
                          x1={coordToPixel(-100)} 
                          y1={0} 
                          x2={coordToPixel(-100)} 
                          y2={mapSize} 
                          stroke="#1e293b" 
                          strokeWidth={1 / zoom}
                          strokeDasharray="5,5"
                        />
                        <line 
                          x1={coordToPixel(100)} 
                          y1={0} 
                          x2={coordToPixel(100)} 
                          y2={mapSize} 
                          stroke="#1e293b" 
                          strokeWidth={1 / zoom}
                          strokeDasharray="5,5"
                        />
                        <line 
                          x1={0} 
                          y1={coordToPixel(-100, true)} 
                          x2={mapSize} 
                          y2={coordToPixel(-100, true)} 
                          stroke="#1e293b" 
                          strokeWidth={1 / zoom}
                          strokeDasharray="5,5"
                        />
                        <line 
                          x1={0} 
                          y1={coordToPixel(100, true)} 
                          x2={mapSize} 
                          y2={coordToPixel(100, true)} 
                          stroke="#1e293b" 
                          strokeWidth={1 / zoom}
                          strokeDasharray="5,5"
                        />
                        
                        {/* Etykiety koordynatów co 50 jednostek */}
                        {[-200, -150, -100, -50, 50, 100, 150, 200].map(coord => (
                          <g key={`label-${coord}`}>
                            {/* Etykiety osi X (góra) */}
                            <text
                              x={coordToPixel(coord)}
                              y="-5"
                              fill="#94a3b8"
                              fontSize={10 / zoom}
                              textAnchor="middle"
                              opacity="0.8"
                            >
                              {coord}
                            </text>
                            {/* Etykiety osi Y (lewo) */}
                            <text
                              x="-5"
                              y={coordToPixel(coord, true)}
                              fill="#94a3b8"
                              fontSize={10 / zoom}
                              textAnchor="end"
                              dominantBaseline="middle"
                              opacity="0.8"
                            >
                              {coord}
                            </text>
                          </g>
                        ))}

                        {/* Wioski: (1) zwykłe (2) sojusz (3) gracz */}
                        {normalVillages.map((village, idx) => {
                          const x = coordToPixel(village.x)
                          const y = coordToPixel(village.y, true)
                          const color = village.is_capital ? '#fbbf24' : '#3b82f6'
                          const baseSize = Math.min(8, Math.max(3, village.population / 100))
                          const size = baseSize / zoom
                          
                          return (
                            <circle
                              key={`normal-${village.x}-${village.y}`}
                              cx={x}
                              cy={y}
                              r={size}
                              fill={color}
                              opacity="0.7"
                              style={{ cursor: 'pointer' }}
                            >
                              <title>
                                {village.name} ({village.x}|{village.y}){'\n'}
                                {village.owner} {village.alliance ? `[${village.alliance}]` : ''}{'\n'}
                                Pop: {village.population}
                              </title>
                            </circle>
                          )
                        })}

                        {/* Tagowane wioski - nieaktywne (przyciemnione gdy coś jest hoveredTag) */}
                        {taggedVillages
                          .filter(v => !(hoveredTag && v.tagType === hoveredTag.type && v.tagLabel === hoveredTag.label))
                          .map((village) => {
                          const x = coordToPixel(village.x)
                          const y = coordToPixel(village.y, true)
                          const baseSize = Math.min(8, Math.max(3, village.population / 100))
                          const size = baseSize / zoom
                          const isPlayer = village.tagType === 'player'
                          const dimmed = hoveredTag !== null

                          return (
                            <g key={`tagged-${village.x}-${village.y}`}>
                              <circle
                                cx={x} cy={y} r={size}
                                fill={village.tagColor}
                                opacity={dimmed ? 0.2 : 0.95}
                                stroke={village.is_capital ? '#fbbf24' : village.tagColor}
                                strokeWidth={village.is_capital ? 2 / zoom : 1 / zoom}
                                style={{ cursor: 'pointer' }}
                              >
                                <title>{isPlayer ? '●' : '■'} [{village.tagLabel}] {village.name} ({village.x}|{village.y}){'\n'}{village.owner} {village.alliance ? `[${village.alliance}]` : ''}{'\n'}Pop: {village.population}{village.is_capital ? '\n👑 STOLICA' : ''}</title>
                              </circle>
                              {isPlayer && !dimmed && (
                                <circle cx={x} cy={y} r={size * 1.6} fill="none" stroke={village.tagColor} className="player-village" />
                              )}
                            </g>
                          )
                        })}

                        {/* Podświetlone (hover z legendy) - rysowane na wierzchu, kolor czerwony */}
                        {hoveredTag && taggedVillages
                          .filter(v => v.tagType === hoveredTag.type && v.tagLabel === hoveredTag.label)
                          .map((village) => {
                          const x = coordToPixel(village.x)
                          const y = coordToPixel(village.y, true)
                          const baseSize = Math.min(8, Math.max(3, village.population / 100))
                          const size = baseSize / zoom * 1.4

                          return (
                            <g key={`hover-${village.x}-${village.y}`}>
                              <circle
                                cx={x} cy={y} r={size}
                                fill="#ef4444"
                                opacity="1"
                                stroke="#ffffff"
                                strokeWidth={1.5 / zoom}
                                style={{ cursor: 'pointer' }}
                              >
                                <title>[{village.tagLabel}] {village.name} ({village.x}|{village.y}){'\n'}{village.owner} {village.alliance ? `[${village.alliance}]` : ''}{'\n'}Pop: {village.population}{village.is_capital ? '\n👑 STOLICA' : ''}</title>
                              </circle>
                              <circle cx={x} cy={y} r={size * 1.8} fill="none" stroke="#ef4444" className="hover-ring" />
                            </g>
                          )
                        })}
                      </g>
                    </g>
                  </g>
                </svg>

                {/* Badge informujący o SVG */}
                <div style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  background: 'rgba(59, 130, 246, 0.9)',
                  color: 'white',
                  padding: '0.5rem 1rem',
                  borderRadius: '0.25rem',
                  fontSize: '0.875rem',
                  fontWeight: 'bold',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                }}>
                  ✨ SVG Rendering
                </div>
              </div>
              )}

              {/* Legenda - wspólna dla wszystkich rendererów */}
              <div style={{ marginTop: '1rem', display: 'flex', gap: '1rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%' }}></div>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Zwykła wioska</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#fbbf24', borderRadius: '50%' }}></div>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Stolica</span>
                </div>
                {filterAlliances.map((tag, i) => (
                  <div
                    key={tag + i}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', background: hoveredTag?.label === tag && hoveredTag?.type === 'alliance' ? 'rgba(239,68,68,0.15)' : 'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={() => setHoveredTag({ type: 'alliance', label: tag })}
                    onMouseLeave={() => setHoveredTag(null)}
                  >
                    <div style={{ width: '12px', height: '12px', background: hoveredTag?.label === tag && hoveredTag?.type === 'alliance' ? '#ef4444' : PALETTE[i % PALETTE.length], borderRadius: '2px', transition: 'background 0.15s' }}></div>
                    <span style={{ color: hoveredTag?.label === tag && hoveredTag?.type === 'alliance' ? '#ef4444' : PALETTE[i % PALETTE.length], fontSize: '0.875rem', fontWeight: '500' }}>■ {tag}</span>
                  </div>
                ))}
                {filterPlayers.map((tag, i) => (
                  <div
                    key={tag + i}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', padding: '0.2rem 0.4rem', borderRadius: '0.25rem', background: hoveredTag?.label === tag && hoveredTag?.type === 'player' ? 'rgba(239,68,68,0.15)' : 'transparent', transition: 'background 0.15s' }}
                    onMouseEnter={() => setHoveredTag({ type: 'player', label: tag })}
                    onMouseLeave={() => setHoveredTag(null)}
                  >
                    <div style={{ width: '12px', height: '12px', background: hoveredTag?.label === tag && hoveredTag?.type === 'player' ? '#ef4444' : PALETTE[(filterAlliances.length + i) % PALETTE.length], borderRadius: '50%', boxShadow: `0 0 6px ${hoveredTag?.label === tag && hoveredTag?.type === 'player' ? '#ef4444' : PALETTE[(filterAlliances.length + i) % PALETTE.length]}`, transition: 'background 0.15s' }}></div>
                    <span style={{ color: hoveredTag?.label === tag && hoveredTag?.type === 'player' ? '#ef4444' : PALETTE[(filterAlliances.length + i) % PALETTE.length], fontSize: '0.875rem', fontWeight: '500' }}>● {tag} (pulsuje)</span>
                  </div>
                ))}
              </div>

              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem',
                background: '#1e293b',
                borderRadius: '0.5rem',
                borderLeft: '3px solid #3b82f6'
              }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                  💡 <strong>Wskazówki:</strong> Użyj scroll myszy nad mapą aby zoomować. Po przybliżeniu przeciągaj mapę myszką.
                  Wpisz nazwę gracza lub tag sojuszu i naciśnij Enter, aby dodać tag. Każdy tag ma osobny kolor. Kliknij × na tagu, aby go usunąć.
                  Przyciski NW/NE/SW/SE szybko przybliżają odpowiednią ćwiartkę.
                </p>
              </div>
            </div>
          ) : (
            <div className="loading">Wybierz snapshot aby zobaczyć mapę</div>
          )}
        </>
      )}
    </div>
  )
}

export default MapView
