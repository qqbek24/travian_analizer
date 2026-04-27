import { useState } from 'react'
import axios from 'axios'
import { Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend } from 'chart.js'
import { Line } from 'react-chartjs-2'

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend)

const API_URL = 'http://localhost:8000'

function Comparison({ snapshots }) {
  const [snapshot1, setSnapshot1] = useState('')
  const [snapshot2, setSnapshot2] = useState('')
  const [playerName, setPlayerName] = useState('')
  const [comparison, setComparison] = useState(null)
  const [history, setHistory] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const compareSnapshots = async () => {
    if (!snapshot1 || !snapshot2 || !playerName) {
      setError('Wypełnij wszystkie pola')
      return
    }

    setLoading(true)
    setError(null)

    try {
      const [compResponse, histResponse] = await Promise.all([
        axios.post(`${API_URL}/compare`, null, {
          params: { snapshot1, snapshot2, player_name: playerName }
        }),
        axios.get(`${API_URL}/player-history/${encodeURIComponent(playerName)}`)
      ])
      setComparison(compResponse.data)

      // Filtruj historię do snapshotów między snapshot1 a snapshot2 (włącznie)
      const allHistory = histResponse.data.history
      const names = snapshots.map(s => s.name).sort()
      const idx1 = names.indexOf(snapshot1)
      const idx2 = names.indexOf(snapshot2)
      const [fromIdx, toIdx] = idx1 <= idx2 ? [idx1, idx2] : [idx2, idx1]
      const rangeNames = new Set(names.slice(fromIdx, toIdx + 1))
      setHistory(allHistory.filter(h => rangeNames.has(h.snapshot)))
    } catch (err) {
      setError(err.response?.data?.detail || 'Błąd porównania')
      setComparison(null)
      setHistory(null)
    } finally {
      setLoading(false)
    }
  }

  const chartData = history && history.length > 0 ? {
    labels: history.map(h => h.snapshot),
    datasets: [
      {
        label: 'Populacja',
        data: history.map(h => h.population),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
      },
      {
        label: 'Liczba wiosek',
        data: history.map(h => h.villages),
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.3,
        pointRadius: 5,
        pointHoverRadius: 7,
        yAxisID: 'y2',
      },
    ],
  } : null

  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        labels: {
          color: '#cbd5e1'
        }
      },
      tooltip: {
        callbacks: {
          label: (ctx) => {
            const label = ctx.dataset.label
            const value = ctx.parsed.y
            if (ctx.datasetIndex === 0) {
              const idx = ctx.dataIndex
              const prev = idx > 0 ? history[idx - 1].population : null
              const diff = prev !== null ? (value - prev > 0 ? `+${(value - prev).toLocaleString()}` : `${(value - prev).toLocaleString()}`) : ''
              return `${label}: ${value.toLocaleString()}${diff ? `  (${diff})` : ''}`
            }
            return `${label}: ${value}`
          }
        }
      }
    },
    scales: {
      y: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#1e293b' },
        title: { display: true, text: 'Populacja', color: '#94a3b8' }
      },
      y2: {
        position: 'right',
        ticks: { color: '#8b5cf6' },
        grid: { drawOnChartArea: false },
        title: { display: true, text: 'Wioski', color: '#8b5cf6' }
      },
      x: {
        ticks: { color: '#94a3b8' },
        grid: { color: '#1e293b' }
      }
    }
  }

  return (
    <div className="card">
      <h2>📈 Porównanie Rozwoju</h2>

      <div className="grid">
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
            Snapshot Starszy:
          </label>
          <select 
            className="select"
            value={snapshot1}
            onChange={(e) => setSnapshot1(e.target.value)}
          >
            <option value="">-- Wybierz --</option>
            {snapshots.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
            Snapshot Nowszy:
          </label>
          <select 
            className="select"
            value={snapshot2}
            onChange={(e) => setSnapshot2(e.target.value)}
          >
            <option value="">-- Wybierz --</option>
            {snapshots.map(s => (
              <option key={s.name} value={s.name}>{s.name}</option>
            ))}
          </select>
        </div>
      </div>

      <div style={{ marginTop: '1rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
          Nazwa Gracza:
        </label>
        <input
          type="text"
          className="input"
          placeholder="np. Theforce"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && compareSnapshots()}
        />
      </div>

      <button 
        className="btn" 
        onClick={compareSnapshots}
        disabled={loading || !snapshot1 || !snapshot2 || !playerName}
        style={{ marginTop: '1rem' }}
      >
        {loading ? 'Porównywanie...' : 'Porównaj'}
      </button>

      {error && <div className="error">{error}</div>}

      {comparison && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ color: '#60a5fa', marginBottom: '1.5rem' }}>
            Wyniki dla: {comparison.player_name}
          </h3>

          <div className="grid">
            <div className="stat-card">
              <h3>Wzrost Populacji</h3>
              <div className="value" style={{ 
                color: comparison.growth.population > 0 ? '#10b981' : '#ef4444' 
              }}>
                {comparison.growth.population > 0 ? '+' : ''}{comparison.growth.population.toLocaleString()}
              </div>
              <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
                {comparison.growth.population_percent > 0 ? '+' : ''}
                {comparison.growth.population_percent.toFixed(1)}%
              </p>
            </div>
            <div className="stat-card">
              <h3>Nowe Wioski</h3>
              <div className="value" style={{ 
                color: comparison.growth.villages > 0 ? '#10b981' : '#ef4444' 
              }}>
                {comparison.growth.villages > 0 ? '+' : ''}{comparison.growth.villages}
              </div>
            </div>
            <div className="stat-card">
              <h3>Populacja Przed</h3>
              <div className="value">{comparison.old_data.population.toLocaleString()}</div>
              <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
                {comparison.old_data.villages} wiosek
              </p>
            </div>
            <div className="stat-card">
              <h3>Populacja Po</h3>
              <div className="value">{comparison.new_data.population.toLocaleString()}</div>
              <p style={{ color: '#94a3b8', marginTop: '0.5rem' }}>
                {comparison.new_data.villages} wiosek
              </p>
            </div>
          </div>

          <div style={{ marginTop: '3rem' }}>
            <h3 style={{ color: '#60a5fa', marginBottom: '1.5rem' }}>
              Wykres Rozwoju
            </h3>
            {chartData
              ? <Line data={chartData} options={chartOptions} />
              : <p style={{ color: '#94a3b8' }}>Brak danych historycznych do wykresu</p>
            }
          </div>

          {comparison.growth.population > 0 ? (
            <div className="success" style={{ marginTop: '2rem' }}>
              ✓ Gracz się rozwija! Przyrost populacji o {comparison.growth.population_percent.toFixed(1)}%
            </div>
          ) : (
            <div className="error" style={{ marginTop: '2rem' }}>
              ⚠ Gracz stracił populację o {Math.abs(comparison.growth.population_percent).toFixed(1)}%
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default Comparison
