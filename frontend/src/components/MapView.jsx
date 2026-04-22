import { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import ZoomInIcon from '@mui/icons-material/ZoomIn'
import ZoomOutIcon from '@mui/icons-material/ZoomOut'
import CenterFocusStrongIcon from '@mui/icons-material/CenterFocusStrong'
import NorthWestIcon from '@mui/icons-material/NorthWest'
import NorthEastIcon from '@mui/icons-material/NorthEast'
import SouthWestIcon from '@mui/icons-material/SouthWest'
import SouthEastIcon from '@mui/icons-material/SouthEast'

const API_URL = 'http://localhost:8000'

function MapView({ selectedSnapshot, setSelectedSnapshot, snapshots }) {
  const [mapData, setMapData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [filterPlayer, setFilterPlayer] = useState('')
  const [filterAlliance, setFilterAlliance] = useState('')
  const [zoom, setZoom] = useState(1)
  const [viewCenter, setViewCenter] = useState({ x: 0, y: 0 }) // Centrum widoku w koordynatach mapy
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

  const filteredVillages = mapData?.villages.filter(v => {
    if (filterPlayer && !v.owner.toLowerCase().includes(filterPlayer.toLowerCase())) return false
    if (filterAlliance && !v.alliance.toLowerCase().includes(filterAlliance.toLowerCase())) return false
    return true
  })

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

  // Zoom controls
  const handleZoomIn = () => setZoom(prev => Math.min(prev * 1.5, 10))
  const handleZoomOut = () => setZoom(prev => Math.max(prev / 1.5, 1))
  const handleResetView = () => {
    setZoom(1)
    setViewCenter({ x: 0, y: 0 })
  }

  // Scroll wheel zoom
  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY
    const zoomFactor = delta > 0 ? 0.9 : 1.1
    setZoom(prev => Math.min(Math.max(prev * zoomFactor, 1), 10))
  }

  // Mouse drag to pan
  const handleMouseDown = (e) => {
    if (zoom > 1) {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseMove = (e) => {
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
  }

  const handleMouseUp = () => {
    setIsDragging(false)
  }

  const handleMouseLeave = () => {
    setIsDragging(false)
  }

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
          <div className="grid">
            <div>
              <input
                type="text"
                className="input"
                placeholder="Szukaj gracza (podświetli na czerwono)..."
                value={filterPlayer}
                onChange={(e) => setFilterPlayer(e.target.value)}
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
                  🔴 Podświetlono: {mapData.villages.filter(isHighlighted).length} wiosek
                </span>}
              </p>
              
              <div style={{ 
                background: '#0f172a', 
                padding: '2rem',
                borderRadius: '0.5rem',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                overflow: 'hidden',
                position: 'relative',
                cursor: isDragging ? 'grabbing' : (zoom > 1 ? 'grab' : 'default')
              }}>
                <style>
                  {`
                    @keyframes colorPulse {
                      0% { fill: #ef4444; }
                      33% { fill: #eab308; }
                      66% { fill: #22c55e; }
                      100% { fill: #ef4444; }
                    }
                    .highlighted-village {
                      animation: colorPulse 2s ease-in-out infinite;
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

                        {/* Wioski - najpierw zwykłe, potem podświetlone */}
                        {mapData.villages.filter(v => !isHighlighted(v)).map((village, idx) => {
                          // Sprawdź czy wioska jest w filtrze alliance
                          if (filterAlliance && !village.alliance.toLowerCase().includes(filterAlliance.toLowerCase())) {
                            return null
                          }

                          const x = coordToPixel(village.x)
                          const y = coordToPixel(village.y, true)
                          const color = village.is_capital ? '#fbbf24' : '#3b82f6'
                          const baseSize = Math.min(8, Math.max(3, village.population / 100))
                          const size = baseSize / zoom
                          
                          return (
                            <g key={`normal-${idx}`}>
                              <circle
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
                            </g>
                          )
                        })}

                        {/* Podświetlone wioski gracza - rysowane na końcu (na wierzchu) */}
                        {mapData.villages.filter(v => isHighlighted(v)).map((village, idx) => {
                          // Sprawdź czy wioska jest w filtrze alliance
                          if (filterAlliance && !village.alliance.toLowerCase().includes(filterAlliance.toLowerCase())) {
                            return null
                          }

                          const x = coordToPixel(village.x)
                          const y = coordToPixel(village.y, true)
                          const baseSize = Math.min(8, Math.max(3, village.population / 100))
                          const size = baseSize / zoom
                          
                          return (
                            <g key={`highlighted-${idx}`}>
                              <circle
                                cx={x}
                                cy={y}
                                r={size}
                                opacity="0.9"
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
                              {/* Dodatkowy marker dla stolicy */}
                              {village.is_capital && (
                                <circle
                                  cx={x}
                                  cy={y}
                                  r={size * 0.3}
                                  fill="#fbbf24"
                                  opacity="1"
                                />
                              )}
                            </g>
                          )
                        })}
                      </g>
                    </g>
                  </g>
                </svg>
              </div>

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
