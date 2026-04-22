import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom'
import { useState } from 'react'
import './App.css'
import Upload from './components/Upload'
import MapView from './components/MapView'
import Dashboard from './components/Dashboard'
import PlayerStats from './components/PlayerStats'
import PlayerList from './components/PlayerList'
import Comparison from './components/Comparison'

function App() {
  const [snapshots, setSnapshots] = useState([])
  const [selectedSnapshot, setSelectedSnapshot] = useState('')

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
          </Routes>
        </main>
      </div>
    </Router>
  )
}

export default App
