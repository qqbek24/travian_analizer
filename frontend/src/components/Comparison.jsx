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
      const response = await axios.post(`${API_URL}/compare`, null, {
        params: {
          snapshot1,
          snapshot2,
          player_name: playerName
        }
      })
      setComparison(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Błąd porównania')
      setComparison(null)
    } finally {
      setLoading(false)
    }
  }

  const chartData = comparison ? {
    labels: ['Przed', 'Po'],
    datasets: [
      {
        label: 'Populacja',
        data: [comparison.old_data.population, comparison.new_data.population],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.5)',
        tension: 0.4,
      },
      {
        label: 'Liczba wiosek',
        data: [comparison.old_data.villages, comparison.new_data.villages],
        borderColor: '#8b5cf6',
        backgroundColor: 'rgba(139, 92, 246, 0.5)',
        tension: 0.4,
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
            <Line data={chartData} options={chartOptions} />
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
