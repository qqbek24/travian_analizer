import { useState, useEffect } from 'react'
import axios from 'axios'
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement } from 'chart.js'
import { Bar, Pie } from 'react-chartjs-2'
import EmojiEventsIcon from '@mui/icons-material/EmojiEvents'
import GroupsIcon from '@mui/icons-material/Groups'
import PublicIcon from '@mui/icons-material/Public'
import TrendingUpIcon from '@mui/icons-material/TrendingUp'

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement)

const API_URL = 'http://localhost:8000'

function Dashboard({ selectedSnapshot, snapshots, setSelectedSnapshot }) {
  const [topPlayers, setTopPlayers] = useState([])
  const [alliances, setAlliances] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (selectedSnapshot) {
      loadData()
    }
  }, [selectedSnapshot])

  const loadData = async () => {
    setLoading(true)
    try {
      const [playersRes, alliancesRes] = await Promise.all([
        axios.get(`${API_URL}/players/${selectedSnapshot}?limit=20`),
        axios.get(`${API_URL}/alliances/${selectedSnapshot}`)
      ])
      
      setTopPlayers(playersRes.data.players)
      setAlliances(alliancesRes.data.alliances.slice(0, 10))
    } catch (error) {
      console.error('Błąd ładowania danych:', error)
    } finally {
      setLoading(false)
    }
  }

  const playersChartData = {
    labels: topPlayers.slice(0, 10).map(p => p.name),
    datasets: [
      {
        label: 'Populacja',
        data: topPlayers.slice(0, 10).map(p => p.population),
        backgroundColor: 'rgba(59, 130, 246, 0.8)',
      },
    ],
  }

  const alliancesChartData = {
    labels: alliances.map(a => a.tag),
    datasets: [
      {
        data: alliances.map(a => a.population),
        backgroundColor: [
          '#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
          '#06b6d4', '#6366f1', '#f97316', '#ef4444', '#84cc16'
        ],
      },
    ],
  }

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1'
        }
      },
    },
    scales: {
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#1e293b' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#1e293b' }
      }
    }
  }

  const pieOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'right',
        labels: {
          color: '#cbd5e1'
        }
      },
    },
  }

  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        marginBottom: '2rem'
      }}>
        <TrendingUpIcon style={{ fontSize: '2rem', color: '#60a5fa' }} />
        <h2 style={{ margin: 0 }}>Dashboard Statystyk</h2>
      </div>

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

      {loading ? (
        <div className="loading">Ładowanie statystyk...</div>
      ) : selectedSnapshot && topPlayers.length > 0 ? (
        <>
          <div className="grid">
            <div className="stat-card" style={{ 
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
              border: 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Najlepszy Gracz</h3>
                  <div className="value" style={{ fontSize: '1.5rem' }}>{topPlayers[0]?.name}</div>
                  <p style={{ color: '#cbd5e1', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {topPlayers[0]?.population.toLocaleString()} populacji
                  </p>
                </div>
                <EmojiEventsIcon style={{ fontSize: '3rem', color: '#fbbf24', opacity: 0.8 }} />
              </div>
            </div>
            <div className="stat-card" style={{ 
              background: 'linear-gradient(135deg, #581c87 0%, #8b5cf6 100%)',
              border: 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Najsilniejszy Sojusz</h3>
                  <div className="value" style={{ fontSize: '1.5rem' }}>{alliances[0]?.tag}</div>
                  <p style={{ color: '#cbd5e1', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    {alliances[0]?.members} członków
                  </p>
                </div>
                <GroupsIcon style={{ fontSize: '3rem', color: '#a78bfa', opacity: 0.8 }} />
              </div>
            </div>
            <div className="stat-card" style={{ 
              background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)',
              border: 'none'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Całkowita Populacja</h3>
                  <div className="value" style={{ fontSize: '1.5rem' }}>
                    {topPlayers.reduce((sum, p) => sum + p.population, 0).toLocaleString()}
                  </div>
                  <p style={{ color: '#cbd5e1', marginTop: '0.5rem', fontSize: '0.875rem' }}>
                    Top 20 graczy
                  </p>
                </div>
                <PublicIcon style={{ fontSize: '3rem', color: '#6ee7b7', opacity: 0.8 }} />
              </div>
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '1.5rem' }}>
              Top 10 Graczy według Populacji
            </h3>
            <Bar data={playersChartData} options={chartOptions} />
          </div>

          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '1.5rem' }}>
              Top 10 Sojuszy według Populacji
            </h3>
            <div style={{ maxWidth: '600px', margin: '0 auto' }}>
              <Pie data={alliancesChartData} options={pieOptions} />
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <EmojiEventsIcon /> Ranking Graczy
            </h3>
            <div style={{ 
              overflowX: 'auto',
              background: '#0f172a',
              borderRadius: '0.75rem',
              border: '1px solid #1e293b',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse'
              }}>
                <thead>
                  <tr style={{ 
                    borderBottom: '2px solid #334155',
                    background: '#1e293b'
                  }}>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      color: '#94a3b8',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>#</th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      color: '#94a3b8',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Gracz</th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'left', 
                      color: '#94a3b8',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Sojusz</th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'right', 
                      color: '#94a3b8',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Wioski</th>
                    <th style={{ 
                      padding: '1rem', 
                      textAlign: 'right', 
                      color: '#94a3b8',
                      fontWeight: '600',
                      fontSize: '0.875rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em'
                    }}>Populacja</th>
                  </tr>
                </thead>
                <tbody>
                  {topPlayers.map((player, idx) => (
                    <tr 
                      key={idx} 
                      style={{ 
                        borderBottom: '1px solid #1e293b',
                        transition: 'background-color 0.2s',
                        cursor: 'pointer'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ 
                        padding: '1rem', 
                        color: idx < 3 ? '#fbbf24' : '#64748b',
                        fontWeight: idx < 3 ? '700' : '400',
                        fontSize: idx < 3 ? '1.1rem' : '1rem'
                      }}>
                        {idx === 0 && '🥇'}
                        {idx === 1 && '🥈'}
                        {idx === 2 && '🥉'}
                        {idx > 2 && (idx + 1)}
                      </td>
                      <td style={{ 
                        padding: '1rem', 
                        color: '#cbd5e1', 
                        fontWeight: idx < 3 ? '600' : '500'
                      }}>{player.name}</td>
                      <td style={{ 
                        padding: '1rem', 
                        color: '#94a3b8'
                      }}>
                        {player.alliance ? (
                          <span style={{
                            background: '#1e293b',
                            padding: '0.25rem 0.75rem',
                            borderRadius: '0.375rem',
                            fontSize: '0.875rem',
                            border: '1px solid #334155'
                          }}>
                            {player.alliance}
                          </span>
                        ) : '-'}
                      </td>
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: '#cbd5e1'
                      }}>{player.villages}</td>
                      <td style={{ 
                        padding: '1rem', 
                        textAlign: 'right', 
                        color: '#60a5fa', 
                        fontWeight: '600',
                        fontSize: idx < 3 ? '1.1rem' : '1rem'
                      }}>
                        {player.population.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : (
        <div className="loading">Wybierz snapshot aby zobaczyć statystyki</div>
      )}
    </div>
  )
}

export default Dashboard
