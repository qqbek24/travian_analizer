import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import './App.css'
import Upload from './components/Upload'
import MapView from './components/MapView'
import Dashboard from './components/Dashboard'
import PlayerStats from './components/PlayerStats'
import PlayerList from './components/PlayerList'
import Comparison from './components/Comparison'
import InactivePlayers from './components/InactivePlayers'

function App() {
  const [snapshots, setSnapshots] = useState([])
  const [selectedSnapshot, setSelectedSnapshot] = useState('')
  const [inactiveOverlays, setInactiveOverlays] = useState([])

  const OVERLAY_PALETTE = ['#f97316','#06b6d4','#a855f7','#84cc16','#ec4899','#14b8a6','#e879f9','#facc15','#3b82f6','#22c55e']

  const handleInactiveOverlayToggle = (list) => {
    setInactiveOverlays(prev => {
      const exists = prev.find(o => o.id === list.id)
      if (exists) {
        return prev.filter(o => o.id !== list.id)
      }
      const data = list.data || {}
      const villages = []
      ;(data.inactive_players || []).forEach(p =>
        (p.villages || []).forEach(v => villages.push({ x: v.x, y: v.y, label: p.player_name }))
      )
      ;(data.disappeared_players || []).forEach(p =>
        (p.villages || []).forEach(v => villages.push({ x: v.x, y: v.y, label: p.player_name }))
      )
      ;(data.disappeared_villages || []).forEach(v =>
        villages.push({ x: v.x, y: v.y, label: v.village_name || v.owner || '?' })
      )
      return [...prev, {
        id: list.id,
        name: list.name,
        color: OVERLAY_PALETTE[prev.length % OVERLAY_PALETTE.length],
        villages,
        center_x: list.center_x,
        center_y: list.center_y,
        radius: list.radius
      }]
    })
  }

  return (
    <Router>
      <div className="app">
        <nav className="navbar">
          <div className="nav-brand">
            <h1>🏰 Travian Analyzer</h1>
          </div>
          <div className="nav-links">
            <Link to="/">Upload</Link>
            <Link to="/map">Mapa</Link>
            <Link to="/dashboard">Dashboard</Link>
            <Link to="/player">Gracz</Link>
            <Link to="/players">Lista Graczy</Link>
            <Link to="/compare">Porównaj</Link>
            <Link to="/inactive">Nieaktywni</Link>
          </div>
        </nav>

        <main className="main-content">
          <Routes>
            <Route path="/" element={
              <Upload 
                snapshots={snapshots} 
                setSnapshots={setSnapshots}
                setSelectedSnapshot={setSelectedSnapshot}
              />
            } />
            <Route path="/map" element={
              <MapView 
                selectedSnapshot={selectedSnapshot}
                setSelectedSnapshot={setSelectedSnapshot}
                snapshots={snapshots}
                inactiveOverlays={inactiveOverlays}
              />
            } />
            <Route path="/dashboard" element={
              <Dashboard 
                selectedSnapshot={selectedSnapshot}
                snapshots={snapshots}
                setSelectedSnapshot={setSelectedSnapshot}
              />
            } />
            <Route path="/player" element={
              <PlayerStats 
                selectedSnapshot={selectedSnapshot}
                snapshots={snapshots}
              />
            } />
            <Route path="/players" element={
              <PlayerList 
                selectedSnapshot={selectedSnapshot}
                setSelectedSnapshot={setSelectedSnapshot}
                snapshots={snapshots}
              />
            } />
            <Route path="/compare" element={
              <Comparison 
                snapshots={snapshots}
              />
            } />
            <Route path="/inactive" element={
              <InactivePlayers
                inactiveOverlays={inactiveOverlays}
                onInactiveOverlayToggle={handleInactiveOverlayToggle}
              />
            } />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
