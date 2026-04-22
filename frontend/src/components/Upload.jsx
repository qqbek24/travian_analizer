import { useState } from 'react'
import axios from 'axios'

const API_URL = 'http://localhost:8000'

function Upload({ snapshots, setSnapshots, setSelectedSnapshot }) {
  const [file, setFile] = useState(null)
  const [snapshotName, setSnapshotName] = useState('')
  const [uploading, setUploading] = useState(false)
  const [message, setMessage] = useState(null)

  const handleFileChange = (e) => {
    setFile(e.target.files[0])
  }

  const handleUpload = async () => {
    if (!file) {
      setMessage({ type: 'error', text: 'Wybierz plik SQL' })
      return
    }

    const formData = new FormData()
    formData.append('file', file)
    if (snapshotName) {
      formData.append('snapshot_name', snapshotName)
    }

    setUploading(true)
    setMessage(null)

    try {
      const response = await axios.post(`${API_URL}/upload`, formData, {
        params: { snapshot_name: snapshotName || undefined }
      })
      
      setMessage({ 
        type: 'success', 
        text: `✓ ${response.data.message}`
      })
      
      // Odśwież listę snapshot'ów
      const snapshotsResponse = await axios.get(`${API_URL}/snapshots`)
      setSnapshots(snapshotsResponse.data.snapshots)
      
      // Ustaw jako aktywny
      setSelectedSnapshot(response.data.snapshot_name)
      
      // Reset formularza
      setFile(null)
      setSnapshotName('')
      document.querySelector('input[type="file"]').value = ''
      
    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: `✗ Błąd: ${error.response?.data?.detail || error.message}` 
      })
    } finally {
      setUploading(false)
    }
  }

  const loadSnapshots = async () => {
    try {
      const response = await axios.get(`${API_URL}/snapshots`)
      setSnapshots(response.data.snapshots)
    } catch (error) {
      console.error('Błąd ładowania snapshot\'ów:', error)
    }
  }

  return (
    <div className="card">
      <h2>📤 Upload pliku SQL</h2>
      
      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
          Nazwa snapshot (opcjonalnie):
        </label>
        <input
          type="text"
          className="input"
          placeholder="np. 2026-04-22 wieczór"
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
        />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', color: '#94a3b8' }}>
          Plik SQL (map.sql):
        </label>
        <input
          type="file"
          accept=".sql"
          onChange={handleFileChange}
          style={{ 
            color: '#cbd5e1',
            padding: '0.75rem',
            border: '2px dashed #334155',
            borderRadius: '0.5rem',
            width: '100%',
            cursor: 'pointer'
          }}
        />
      </div>

      <button 
        className="btn" 
        onClick={handleUpload}
        disabled={uploading || !file}
      >
        {uploading ? 'Wysyłanie...' : 'Upload i Analizuj'}
      </button>

      {message && (
        <div className={message.type}>
          {message.text}
        </div>
      )}

      <div style={{ marginTop: '3rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h3 style={{ color: '#94a3b8' }}>Załadowane snapshoty:</h3>
          <button className="btn" onClick={loadSnapshots} style={{ padding: '0.5rem 1rem' }}>
            🔄 Odśwież
          </button>
        </div>
        
        {snapshots.length === 0 ? (
          <p style={{ color: '#64748b', marginTop: '1rem' }}>
            Brak załadowanych plików. Upload pierwszy plik SQL.
          </p>
        ) : (
          <div className="grid" style={{ marginTop: '1.5rem' }}>
            {snapshots.map((snapshot) => (
              <div key={snapshot.name} className="stat-card">
                <h3>{snapshot.name}</h3>
                <div style={{ marginTop: '0.5rem', color: '#cbd5e1' }}>
                  <p>🏰 Wioski: {snapshot.villages_count}</p>
                  <p>👥 Gracze: {snapshot.players_count}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Upload
