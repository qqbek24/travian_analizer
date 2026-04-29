import { useState } from 'react'
import axios from 'axios'
import DeleteIcon from '@mui/icons-material/Delete'
import DeleteSweepIcon from '@mui/icons-material/DeleteSweep'
import RefreshIcon from '@mui/icons-material/Refresh'

const API_URL = '/api'

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
  const deleteSnapshot = async (snapshotName) => {
    if (!window.confirm(`Czy na pewno chcesz usunąć snapshot "${snapshotName}"?`)) {
      return
    }
    
    try {
      await axios.delete(`${API_URL}/snapshot/${snapshotName}`)
      setMessage({ type: 'success', text: `Snapshot "${snapshotName}" został usunięty` })
      loadSnapshots()
      if (setSelectedSnapshot) {
        setSelectedSnapshot(null)
      }
    } catch (error) {
      console.error('Błąd usuwania snapshot:', error)
      setMessage({ type: 'error', text: 'Błąd usuwania snapshot' })
    }
  }
  
  const deleteAllSnapshots = async () => {
    if (!window.confirm(`Czy na pewno chcesz usunąć WSZYSTKIE snapshoty (${snapshots.length})? Ta operacja jest nieodwracalna!`)) {
      return
    }
    
    try {
      const response = await axios.delete(`${API_URL}/snapshots/all`)
      setMessage({ type: 'success', text: response.data.message })
      loadSnapshots()
      if (setSelectedSnapshot) {
        setSelectedSnapshot(null)
      }
    } catch (error) {
      console.error('Błąd usuwania wszystkich snapshots:', error)
      setMessage({ type: 'error', text: 'Błąd usuwania snapshots' })
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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ color: '#94a3b8', margin: 0 }}>Załadowane snapshoty:</h3>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button 
              className="btn" 
              onClick={loadSnapshots} 
              style={{ padding: '0.5rem 1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <RefreshIcon sx={{ fontSize: 18 }} /> Odśwież
            </button>
            {snapshots.length > 0 && (
              <button 
                className="btn" 
                onClick={deleteAllSnapshots}
                style={{ 
                  padding: '0.5rem 1rem', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '0.5rem',
                  background: '#dc2626',
                  borderColor: '#b91c1c'
                }}
              >
                <DeleteSweepIcon sx={{ fontSize: 18 }} /> Usuń wszystkie
              </button>
            )}
          </div>
        </div>
        
        {snapshots.length === 0 ? (
          <p style={{ color: '#64748b', marginTop: '1rem' }}>
            Brak załadowanych plików. Upload pierwszy plik SQL.
          </p>
        ) : (
          <div className="grid" style={{ marginTop: '1.5rem' }}>
            {snapshots.map((snapshot) => (
              <div key={snapshot.name} className="stat-card" style={{ position: 'relative' }}>
                <button
                  onClick={() => deleteSnapshot(snapshot.name)}
                  style={{
                    position: 'absolute',
                    top: '0.5rem',
                    right: '0.5rem',
                    background: '#dc2626',
                    border: '1px solid #b91c1c',
                    borderRadius: '0.25rem',
                    padding: '0.25rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'white',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#b91c1c'}
                  onMouseLeave={(e) => e.target.style.background = '#dc2626'}
                  title="Usuń snapshot"
                >
                  <DeleteIcon sx={{ fontSize: 18 }} />
                </button>
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
