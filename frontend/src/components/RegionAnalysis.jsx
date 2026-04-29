import { useState, useEffect, useMemo } from 'react'
import axios from 'axios'

const API_URL = '/api'

// Paleta kolorów dla regionów na mapie
const REGION_COLORS = [
  '#f97316','#06b6d4','#a855f7','#84cc16','#ec4899',
  '#14b8a6','#facc15','#3b82f6','#ef4444','#22c55e',
  '#f43f5e','#8b5cf6','#0ea5e9','#d97706','#10b981'
]

function RegionAnalysis({ selectedSnapshot, onRegionOverlayChange }) {
  const [regionData, setRegionData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [topAlliancesMode, setTopAlliancesMode] = useState('5') // 'all' | '5'
  const [expandedRegion, setExpandedRegion] = useState(null)
  const [showOnMap, setShowOnMap] = useState(false)
  const [highlightedRegion, setHighlightedRegion] = useState(null)

  const topN = topAlliancesMode === '5' ? 5 : 0

  useEffect(() => {
    if (selectedSnapshot) {
      loadRegions()
    }
  }, [selectedSnapshot, topAlliancesMode])

  // Propaguj overlay do mapy
  useEffect(() => {
    if (!onRegionOverlayChange) return
    if (!showOnMap || !regionData) {
      onRegionOverlayChange(null)
      return
    }
    // Buduj mapę region -> kolor
    const regionColors = {}
    regionData.regions.forEach((r, idx) => {
      regionColors[r.region] = REGION_COLORS[idx % REGION_COLORS.length]
    })
    onRegionOverlayChange({ show: true, regionColors, highlightedRegion })
  }, [showOnMap, regionData, highlightedRegion])

  const loadRegions = async () => {
    if (!selectedSnapshot) return
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/regions/${selectedSnapshot}`, {
        params: { top_alliances: topN }
      })
      setRegionData(response.data)
    } catch (err) {
      console.error('Błąd ładowania regionów:', err)
    } finally {
      setLoading(false)
    }
  }

  const regionColors = useMemo(() => {
    if (!regionData) return {}
    const map = {}
    regionData.regions.forEach((r, idx) => {
      map[r.region] = REGION_COLORS[idx % REGION_COLORS.length]
    })
    return map
  }, [regionData])

  if (!selectedSnapshot) {
    return (
      <div style={{ color: '#94a3b8', padding: '1rem' }}>Wybierz snapshot aby zobaczyć analizę regionów.</div>
    )
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>🗺️ Analiza regionów</h3>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <label style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Podstawa %:</label>
          <select
            className="select"
            value={topAlliancesMode}
            onChange={e => setTopAlliancesMode(e.target.value)}
            style={{ maxWidth: '220px', fontSize: '0.875rem', padding: '0.4rem 0.6rem' }}
          >
            <option value="all">Cała populacja regionu</option>
            <option value="5">Top 5 sojuszy w regionie</option>
          </select>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', color: '#94a3b8', fontSize: '0.875rem' }}>
          <input
            type="checkbox"
            checked={showOnMap}
            onChange={e => setShowOnMap(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          Pokaż na mapie
        </label>
      </div>

      {loading && <div className="loading">Ładowanie danych regionów...</div>}

      {regionData && !loading && (
        <div>
          {/* Legenda regionów */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
            {regionData.regions.map((r, idx) => (
              <span
                key={r.region}
                style={{
                  background: regionColors[r.region] + '33',
                  border: `2px solid ${regionColors[r.region]}`,
                  color: regionColors[r.region],
                  padding: '0.2rem 0.7rem',
                  borderRadius: '1rem',
                  fontSize: '0.8rem',
                  cursor: 'pointer',
                  fontWeight: (expandedRegion === r.region || highlightedRegion === r.region) ? 700 : 400,
                  outline: highlightedRegion === r.region ? `2px solid ${regionColors[r.region]}` : 'none',
                  outlineOffset: '2px',
                  boxShadow: highlightedRegion === r.region ? `0 0 8px ${regionColors[r.region]}88` : 'none'
                }}
                onClick={() => {
                  setExpandedRegion(expandedRegion === r.region ? null : r.region)
                  setHighlightedRegion(highlightedRegion === r.region ? null : r.region)
                }}
              >
                {r.region}
              </span>
            ))}
          </div>

          {/* Tabela regionów */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.875rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #334155' }}>
                  <th style={thStyle}>Region</th>
                  <th style={thStyle}>Pop. całkowita</th>
                  <th style={thStyle}>Wioski</th>
                  <th style={thStyle}>Top sojusze (% udziału)</th>
                </tr>
              </thead>
              <tbody>
                {regionData.regions.map((r) => (
                  <>
                    <tr
                      key={r.region}
                      style={{
                        borderBottom: '1px solid #1e293b',
                        background: expandedRegion === r.region ? '#1e293b' : 'transparent',
                        cursor: 'pointer'
                      }}
                      onClick={() => setExpandedRegion(expandedRegion === r.region ? null : r.region)}
                    >
                      <td style={{ ...tdStyle, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{
                          width: '10px', height: '10px', borderRadius: '2px',
                          background: regionColors[r.region], display: 'inline-block', flexShrink: 0
                        }} />
                        <strong style={{ color: '#e2e8f0' }}>{r.region}</strong>
                      </td>
                      <td style={tdStyle}>{r.total_population.toLocaleString()}</td>
                      <td style={tdStyle}>{r.total_villages}</td>
                      <td style={tdStyle}>
                        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                          {r.alliances.slice(0, 5).map(a => (
                            <span key={a.tag} style={{ fontSize: '0.75rem', color: '#94a3b8' }}>
                              <strong style={{ color: '#e2e8f0' }}>[{a.tag}]</strong> {a.percent}%
                            </span>
                          ))}
                        </div>
                      </td>
                    </tr>

                    {/* Rozwinięty widok regionu */}
                    {expandedRegion === r.region && (
                      <tr key={`${r.region}-detail`}>
                        <td colSpan={4} style={{ padding: '0.75rem 1rem', background: '#0f172a' }}>
                          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginBottom: '0.5rem' }}>
                            Podstawa populacji do % : <strong style={{ color: '#e2e8f0' }}>{r.base_population.toLocaleString()}</strong>
                            {topAlliancesMode === '5' && <span style={{ color: '#f97316' }}> (top 5 sojuszy)</span>}
                          </div>
                          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                            <thead>
                              <tr style={{ borderBottom: '1px solid #334155' }}>
                                <th style={thSmall}>Sojusz</th>
                                <th style={thSmall}>Populacja</th>
                                <th style={thSmall}>Wioski</th>
                                <th style={thSmall}>Gracze</th>
                                <th style={thSmall}>% udziału</th>
                              </tr>
                            </thead>
                            <tbody>
                              {r.alliances.map(a => (
                                <tr key={a.tag} style={{ borderBottom: '1px solid #1e293b' }}>
                                  <td style={tdSmall}><strong style={{ color: '#e2e8f0' }}>[{a.tag}]</strong></td>
                                  <td style={tdSmall}>{a.population.toLocaleString()}</td>
                                  <td style={tdSmall}>{a.villages}</td>
                                  <td style={tdSmall}>{a.members}</td>
                                  <td style={tdSmall}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                      <div style={{
                                        height: '8px', borderRadius: '4px',
                                        width: `${Math.min(a.percent, 100)}%`,
                                        background: regionColors[r.region],
                                        minWidth: '4px', maxWidth: '120px'
                                      }} />
                                      <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{a.percent}%</span>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}

const thStyle = {
  padding: '0.5rem 0.75rem',
  textAlign: 'left',
  color: '#94a3b8',
  fontWeight: 600,
  fontSize: '0.75rem',
  textTransform: 'uppercase',
  letterSpacing: '0.05em'
}

const tdStyle = {
  padding: '0.5rem 0.75rem',
  color: '#94a3b8'
}

const thSmall = { ...thStyle, fontSize: '0.7rem', padding: '0.3rem 0.5rem' }
const tdSmall = { ...tdStyle, padding: '0.3rem 0.5rem', fontSize: '0.8rem' }

export default RegionAnalysis
