import { useState, useEffect, useMemo, useCallback } from 'react'
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
import MapViewSVG from './MapViewSVG'
import RegionAnalysis from './RegionAnalysis'
import RaidListManager from './RaidListManager'

const API_URL = '/api'

const PALETTE = ['#f97316','#06b6d4','#a855f7','#84cc16','#ec4899','#14b8a6','#e879f9','#facc15','#3b82f6','#22c55e']

function MapView({ selectedSnapshot, setSelectedSnapshot, snapshots, inactiveOverlays = [] }) {
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
  const [regionOverlay, setRegionOverlay] = useState(null)
  const [raidList, setRaidList] = useState(null)
  const [activeTab, setActiveTab] = useState(null) // null | 'regions' | 'raids'

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

      // When region overlay is active, always show non-tagged villages (so they can be colored by region)
      if (!hasFilters || regionOverlay?.show) normal.push(village)
    })

    return { normalVillages: normal, taggedVillages: tagged }
  }, [mapData, filterPlayers, filterAlliances, regionOverlay])

  const filteredVillages = useMemo(() => {
    return [...normalVillages, ...taggedVillages]
  }, [normalVillages, taggedVillages])

  // Zoom controls z useCallback
  const handleZoomIn = useCallback(() => setZoom(prev => Math.min(prev * 1.5, 10)), [])
  const handleZoomOut = useCallback(() => setZoom(prev => Math.max(prev / 1.5, 1)), [])
  const handleResetView = useCallback(() => {
    setZoom(1)
    setViewCenter({ x: 0, y: 0 })
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
                  regionOverlay={regionOverlay}
                  raidList={raidList}
                  inactiveOverlays={inactiveOverlays}
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
                  regionOverlay={regionOverlay}
                  raidList={raidList}
                  inactiveOverlays={inactiveOverlays}
                />
              ) : (
              <MapViewSVG
                mapData={mapData}
                normalVillages={normalVillages}
                taggedVillages={taggedVillages}
                hoveredTag={hoveredTag}
                zoom={zoom}
                setZoom={setZoom}
                viewCenter={viewCenter}
                setViewCenter={setViewCenter}
                regionOverlay={regionOverlay}
                raidList={raidList}
                inactiveOverlays={inactiveOverlays}
              />
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

          {/* Tabs: Regiony / Grabieże */}
          <div style={{ marginTop: '2rem', borderBottom: '1px solid #334155', display: 'flex', gap: '0' }}>
            {[['regions', '🌍 Analiza regionów'], ['raids', '🗡️ Listy grabieży']].map(([key, label]) => (
              <button
                key={key}
                onClick={() => setActiveTab(activeTab === key ? null : key)}
                style={{
                  padding: '0.6rem 1.5rem',
                  background: activeTab === key ? '#1e3a5f' : 'transparent',
                  border: 'none',
                  borderBottom: activeTab === key ? '2px solid #3b82f6' : '2px solid transparent',
                  color: activeTab === key ? '#e2e8f0' : '#94a3b8',
                  cursor: 'pointer',
                  fontSize: '0.9rem',
                  fontWeight: activeTab === key ? 600 : 400,
                  transition: 'all 0.15s'
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {activeTab === 'regions' && (
            <RegionAnalysis
              selectedSnapshot={selectedSnapshot}
              onRegionOverlayChange={setRegionOverlay}
            />
          )}

          {activeTab === 'raids' && (
            <RaidListManager
              selectedSnapshot={selectedSnapshot}
              onRaidListChange={setRaidList}
            />
          )}
        </>
      )}
    </div>
  )
}

export default MapView
