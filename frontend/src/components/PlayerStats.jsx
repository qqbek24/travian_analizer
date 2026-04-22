import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function PlayerStats({ selectedSnapshot, snapshots }) {
  const [playerName, setPlayerName] = useState('')
  const [playerData, setPlayerData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const loadPlayerStats = async () => {
    if (!playerName || !selectedSnapshot) {
      setError('Wybierz snapshot i podaj nazwę gracza')
      return
    }

    setLoading(true)
    setError(null)
    
    try {
      const response = await axios.get(`${API_URL}/player/${selectedSnapshot}/${encodeURIComponent(playerName)}`)
      setPlayerData(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Gracz nie znaleziony')
      setPlayerData(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card">
      <h2>👤 Statystyki Gracza</h2>

      <div className="grid">
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
            Snapshot:
          </label>
          <select className="select" defaultValue={selectedSnapshot}>
            <option value="">-- Wybierz snapshot --</option>
            {snapshots.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
            Nazwa gracza:
          </label>
          <input
            type="text"
            className="input"
            placeholder="np. Theforce"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && loadPlayerStats()}
          />
        </div>
      </div>

      <button 
        className="btn" 
        onClick={loadPlayerStats}
        disabled={loading || !playerName || !selectedSnapshot}
        style={{ marginTop: '1rem' }}
      >
        {loading ? 'Ładowanie...' : 'Szukaj'}
      </button>

      {error && <div className="error">{error}</div>}

      {playerData && (
        <div style={{ marginTop: '2rem' }}>
          <div className="grid">
            <div className="stat-card">
              <h3>Gracz</h3>
              <div className="value">{playerData.player_name}</div>
            </div>
            <div className="stat-card">
              <h3>Sojusz</h3>
              <div className="value">{playerData.alliance || '-'}</div>
            </div>
            <div className="stat-card">
              <h3>Liczba Wiosek</h3>
              <div className="value">{playerData.total_villages}</div>
            </div>
            <div className="stat-card">
              <h3>Całkowita Populacja</h3>
              <div className="value">{playerData.total_population.toLocaleString()}</div>
            </div>
            <div className="stat-card">
              <h3>Średnia Populacja</h3>
              <div className="value">{Math.round(playerData.avg_population)}</div>
            </div>
            <div className="stat-card">
              <h3>Największa Wioska</h3>
              <div className="value">{playerData.largest_village}</div>
            </div>
          </div>

          <div style={{ marginTop: '2rem' }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '1rem' }}>
              Wioski Gracza
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                background: '#0f172a',
                borderRadius: '0.5rem'
              }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid #334155' }}>
                    <th style={{ padding: '1rem', textAlign: 'left', color: '#94a3b8' }}>Nazwa</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Pozycja</th>
                    <th style={{ padding: '1rem', textAlign: 'right', color: '#94a3b8' }}>Populacja</th>
                    <th style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8' }}>Stolica</th>
                  </tr>
                </thead>
                <tbody>
                  {playerData.villages
                    .sort((a, b) => b.population - a.population)
                    .map((village, idx) => (
                      <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                        <td style={{ padding: '1rem', color: '#cbd5e1', fontWeight: '500' }}>
                          {village.name}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center', color: '#94a3b8', fontFamily: 'monospace' }}>
                          ({village.x}|{village.y})
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'right', color: '#60a5fa', fontWeight: '600' }}>
                          {village.population}
                        </td>
                        <td style={{ padding: '1rem', textAlign: 'center' }}>
                          {village.is_capital && <span style={{ color: '#fbbf24' }}>⭐</span>}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default PlayerStats
