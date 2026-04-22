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

function MapView({ selectedSnapshot, setSelectedSnapshot, snapshots }) {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterPlayer, setFilterPlayer] = useState('')
  const [filterPlayerInput, setFilterPlayerInput] = useState('') // Input bez debounce
  const [filterAlliance, setFilterAlliance] = useState('')
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

  // Debounce dla wyszukiwania gracza (500ms - zwiększone z 300ms dla lepszej płynności)
  useEffect(() => {
    const timer = setTimeout(() => {
      setFilterPlayer(filterPlayerInput)
    }, 500)
    return () => clearTimeout(timer)
  }, [filterPlayerInput])

  // Deferred value dla smoother UI podczas wpisywania
  const deferredFilterPlayer = useDeferredValue(filterPlayer)

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

  // Zoptymalizowane filtrowanie wiosek z useMemo
  const { normalVillages, highlightedVillages } = useMemo(() => {
    if (!mapData?.villages) return { normalVillages: [], highlightedVillages: [] }

    const filterPlayerLower = deferredFilterPlayer.toLowerCase()
    const filterAllianceLower = filterAlliance.toLowerCase()

    const normal = []
    const highlighted = []

    mapData.villages.forEach(village => {
      // Filtr alliance
      if (filterAllianceLower && !village.alliance.toLowerCase().includes(filterAllianceLower)) {
        return
      }

      // Sprawdź czy podświetlona
      const isPlayerMatch = filterPlayerLower && village.owner.toLowerCase().includes(filterPlayerLower)
      
      if (isPlayerMatch) {
        highlighted.push(village)
      } else {
        normal.push(village)
      }
    })

    return { normalVillages: normal, highlightedVillages: highlighted }
  }, [mapData, deferredFilterPlayer, filterAlliance])

  const filteredVillages = useMemo(() => {
    return [...normalVillages, ...highlightedVillages]
  }, [normalVillages, highlightedVillages])

  // Sprawdź czy wioska należy do przefiltrowanego gracza
  const isHighlighted = (village) => {
    if (!filterPlayer) return false
    return village.owner.toLowerCase().includes(filterPlayer.toLowerCase())
  }

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
            <div>
              <input
                type="text"
                className="input"
                placeholder="Szukaj gracza (podświetli na czerwono)..."
                value={filterPlayerInput}
                onChange={(e) => setFilterPlayerInput(e.target.value)}
              />
            </div>
            <div>
              <input
                type="text"
                className="input"
                placeholder="Filtruj po sojuszu..."
                value={filterAlliance}
                onChange={(e) => setFilterAlliance(e.target.value)}
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
              <p style={{ color: '#94a3b8', marginBottom: '1rem' }}>
                Pokazuje {filteredVillages?.length || 0} z {mapData.villages.length} wiosek
                {filterPlayer && <span style={{ color: '#ef4444', marginLeft: '1rem' }}>
                  🔴 Podświetlono: {highlightedVillages.length} wiosek
                </span>}
              </p>
              
              {/* Renderowanie różnych typów map */}
              {renderType === 'canvas' ? (
                <MapViewCanvas
                  mapData={mapData}
                  filterPlayer={deferredFilterPlayer}
                  filterAlliance={filterAlliance}
                  zoom={zoom}
                  setZoom={setZoom}
                  viewCenter={viewCenter}
                  setViewCenter={setViewCenter}
                />
              ) : renderType === 'leaflet' ? (
                <MapViewLeaflet
                  mapData={mapData}
                  filterPlayer={deferredFilterPlayer}
                  filterAlliance={filterAlliance}
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
                    @keyframes highlightPulse {
                      0%, 100% { 
                        stroke: #dc2626; 
                        stroke-width: 3;
                      }
                      50% { 
                        stroke: #f97316;
                        stroke-width: 4;
                      }
                    }
                    .highlighted-village {
                      animation: highlightPulse 1.5s ease-in-out infinite;
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

                        {/* Wioski - najpierw zwykłe, potem podświetlone */}
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

                        {/* Podświetlone wioski gracza - z pulsującym obramowaniem */}
                        {highlightedVillages.map((village, idx) => {
                          const x = coordToPixel(village.x)
                          const y = coordToPixel(village.y, true)
                          const baseSize = Math.min(8, Math.max(3, village.population / 100))
                          const size = baseSize / zoom
                          const fillColor = village.is_capital ? '#fbbf24' : '#3b82f6'
                          
                          return (
                            <g key={`highlighted-${village.x}-${village.y}`}>
                              {/* Główna kropka */}
                              <circle
                                cx={x}
                                cy={y}
                                r={size}
                                fill={fillColor}
                                opacity="0.9"
                                style={{ cursor: 'pointer' }}
                              />
                              {/* Pulsujące obramowanie */}
                              <circle
                                cx={x}
                                cy={y}
                                r={size * 1.5}
                                fill="none"
                                className="highlighted-village"
                                style={{ cursor: 'pointer' }}
                              >
                                <title>
                                  🔴 {village.name} ({village.x}|{village.y}){'\n'}
                                  {village.owner} {village.alliance ? `[${village.alliance}]` : ''}{'\n'}
                                  Pop: {village.population}
                                  {village.is_capital ? '\n👑 STOLICA' : ''}
                                </title>
                              </circle>
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
              <div style={{ marginTop: '1rem', display: 'flex', gap: '2rem', justifyContent: 'center', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#3b82f6', borderRadius: '50%' }}></div>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Zwykła wioska</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ width: '12px', height: '12px', background: '#fbbf24', borderRadius: '50%' }}></div>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Stolica</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <div style={{ 
                    width: '12px', 
                    height: '12px', 
                    borderRadius: '50%',
                    background: 'linear-gradient(120deg, #ef4444 0%, #eab308 50%, #22c55e 100%)',
                    animation: 'colorPulse 2s ease-in-out infinite'
                  }}></div>
                  <span style={{ 
                    color: '#94a3b8', 
                    fontSize: '0.875rem', 
                    fontWeight: '500',
                    background: 'linear-gradient(120deg, #ef4444, #eab308, #22c55e)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent'
                  }}>
                    Wyszukany gracz (migające kolory)
                  </span>
                </div>
              </div>

              <div style={{ 
                marginTop: '1.5rem', 
                padding: '1rem',
                background: '#1e293b',
                borderRadius: '0.5rem',
                borderLeft: '3px solid #3b82f6'
              }}>
                <p style={{ color: '#94a3b8', fontSize: '0.875rem', margin: 0 }}>
                  💡 <strong>Wskazówki:</strong> Użyj scroll myszy nad mapą aby zoomować. 
                  Po przybliżeniu przeciągaj mapę myszką. 
                  Wpisz nazwę gracza aby podświetlić jego wioski migającymi kolorami (czerwony → żółty → zielony).
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
