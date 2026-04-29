import { useState, useEffect } from 'react'
import axios from 'axios'

const API_URL = '/api'

function RaidListManager({ selectedSnapshot, onRaidListChange }) {
  const [raidLists, setRaidLists] = useState([])
  const [activeListId, setActiveListId] = useState(null)
  const [showOnMap, setShowOnMap] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [editMode, setEditMode] = useState(false) // edytujemy aktywną listę
  const [snackbar, setSnackbar] = useState('')

  // Formularz tworzenia
  const [newName, setNewName] = useState('')
  const [newHomeX, setNewHomeX] = useState('')
  const [newHomeY, setNewHomeY] = useState('')

  // Dodawanie celów manualnie
  const [addX, setAddX] = useState('')
  const [addY, setAddY] = useState('')
  const [addNote, setAddNote] = useState('')

  // Wyszukiwanie wioski (z snapshotu)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])

  // Import z listy nieaktywnych
  const [inactiveLists, setInactiveLists] = useState([])
  const [selectedInactiveId, setSelectedInactiveId] = useState('')

  useEffect(() => {
    loadLists()
    loadInactiveLists()
  }, [])

  const loadLists = async () => {
    try {
      const res = await axios.get(`${API_URL}/raid-lists`)
      setRaidLists(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const loadInactiveLists = async () => {
    try {
      const res = await axios.get(`${API_URL}/inactive-lists`)
      setInactiveLists(res.data)
    } catch (e) {
      console.error(e)
    }
  }

  const activeList = raidLists.find(l => l.id === activeListId) || null

  // Propagate to map
  useEffect(() => {
    if (!onRaidListChange) return
    if (!showOnMap || !activeList) {
      onRaidListChange(null)
      return
    }
    onRaidListChange({
      show: true,
      homeX: activeList.home_x,
      homeY: activeList.home_y,
      targets: activeList.targets
    })
  }, [showOnMap, activeList])

  const showMsg = (msg) => {
    setSnackbar(msg)
    setTimeout(() => setSnackbar(''), 3000)
  }

  const handleCreate = async () => {
    if (!newName.trim()) { showMsg('Podaj nazwę listy'); return }
    try {
      const res = await axios.post(`${API_URL}/raid-lists`, {
        name: newName.trim(),
        home_x: newHomeX !== '' ? parseInt(newHomeX) : null,
        home_y: newHomeY !== '' ? parseInt(newHomeY) : null,
        snapshot_name: selectedSnapshot || null,
        targets: []
      })
      setRaidLists(prev => [res.data, ...prev])
      setActiveListId(res.data.id)
      setCreateOpen(false)
      setNewName(''); setNewHomeX(''); setNewHomeY('')
      showMsg('Lista utworzona')
    } catch (e) {
      showMsg(e.response?.data?.detail || 'Błąd tworzenia listy')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Usunąć tę listę?')) return
    try {
      await axios.delete(`${API_URL}/raid-lists/${id}`)
      setRaidLists(prev => prev.filter(l => l.id !== id))
      if (activeListId === id) {
        setActiveListId(null)
        if (onRaidListChange) onRaidListChange(null)
      }
      showMsg('Lista usunięta')
    } catch (e) {
      showMsg('Błąd usuwania')
    }
  }

  const updateTargets = async (newTargets) => {
    if (!activeList) return
    try {
      const res = await axios.patch(`${API_URL}/raid-lists/${activeList.id}`, { targets: newTargets })
      setRaidLists(prev => prev.map(l => l.id === res.data.id ? res.data : l))
    } catch (e) {
      showMsg('Błąd zapisu')
    }
  }

  const handleAddManual = async () => {
    if (addX === '' || addY === '') { showMsg('Podaj koordynaty X i Y'); return }
    const x = parseInt(addX), y = parseInt(addY)
    if (isNaN(x) || isNaN(y)) { showMsg('Nieprawidłowe koordynaty'); return }
    const newTarget = { x, y, note: addNote.trim(), name: '', owner: '', alliance: '', population: 0 }
    const updated = [...(activeList?.targets || []), newTarget]
    await updateTargets(updated)
    setAddX(''); setAddY(''); setAddNote('')
    showMsg(`Dodano cel (${x}|${y})`)
  }

  const handleRemoveTarget = async (idx) => {
    const updated = activeList.targets.filter((_, i) => i !== idx)
    await updateTargets(updated)
  }

  const handleSearchVillage = async () => {
    if (!selectedSnapshot || !searchQuery.trim()) return
    try {
      const res = await axios.get(`${API_URL}/map/${selectedSnapshot}`)
      const q = searchQuery.toLowerCase()
      const found = res.data.villages.filter(v =>
        v.name?.toLowerCase().includes(q) ||
        v.owner?.toLowerCase().includes(q) ||
        v.alliance?.toLowerCase().includes(q)
      ).slice(0, 20)
      setSearchResults(found)
    } catch (e) {
      showMsg('Błąd wyszukiwania')
    }
  }

  const handleAddFromSearch = async (village) => {
    const newTarget = {
      x: village.x, y: village.y,
      name: village.name || '',
      owner: village.owner || '',
      alliance: village.alliance || '',
      population: village.population || 0,
      note: ''
    }
    const updated = [...(activeList?.targets || []), newTarget]
    await updateTargets(updated)
    showMsg(`Dodano: ${village.name} (${village.x}|${village.y})`)
  }

  const handleSetAsHome = async (village) => {
    if (!activeList) return
    try {
      const res = await axios.patch(`${API_URL}/raid-lists/${activeList.id}`, {
        home_x: village.x,
        home_y: village.y
      })
      setRaidLists(prev => prev.map(l => l.id === res.data.id ? res.data : l))
      showMsg(`Ustawiono osadę startową: ${village.name} (${village.x}|${village.y})`)
    } catch (e) {
      showMsg('Błąd zapisu')
    }
  }

  // Import z listy nieaktywnych (villages podane jako tablica {x, y, ...})
  const handleImportFromInactive = async (inactiveData) => {
    if (!activeList || !inactiveData?.length) return
    const toAdd = inactiveData.map(v => ({
      x: v.x, y: v.y, name: v.village_name || v.name || '',
      owner: v.player_name || v.owner || '',
      alliance: v.alliance_tag || v.alliance || '',
      population: v.population || 0, note: 'z listy nieaktywnych'
    }))
    const updated = [...(activeList.targets || []), ...toAdd]
    await updateTargets(updated)
    showMsg(`Zaimportowano ${toAdd.length} wiosek`)
  }

  const handleImportSelectedInactiveList = async () => {
    if (!selectedInactiveId) { showMsg('Wybierz listę nieaktywnych'); return }
    try {
      const res = await axios.get(`${API_URL}/inactive-lists/${selectedInactiveId}`)
      const data = res.data?.data || {}
      const villages = []
      ;(data.inactive_players || []).forEach(p =>
        (p.villages || []).forEach(v => villages.push({ ...v, player_name: p.player_name, alliance: p.alliance }))
      )
      ;(data.disappeared_players || []).forEach(p =>
        (p.villages || []).forEach(v => villages.push({ ...v, player_name: p.player_name, alliance: p.alliance }))
      )
      if (!villages.length) { showMsg('Lista nie zawiera wiosek'); return }
      await handleImportFromInactive(villages)
    } catch (e) {
      showMsg('Błąd pobierania listy nieaktywnych')
    }
  }

  return (
    <div style={{ marginTop: '2rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
        <h3 style={{ color: '#e2e8f0', margin: 0 }}>🗡️ Listy grabieży</h3>

        <button className="button" onClick={() => setCreateOpen(!createOpen)}
          style={{ padding: '0.4rem 1rem', fontSize: '0.875rem', background: '#16a34a' }}>
          + Nowa lista
        </button>
      </div>

      {/* Tworzenie nowej listy */}
      {createOpen && (
        <div style={{
          background: '#1e293b', borderRadius: '0.5rem', padding: '1rem',
          marginBottom: '1rem', display: 'flex', flexDirection: 'column', gap: '0.75rem'
        }}>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div>
              <label style={labelStyle}>Nazwa listy</label>
              <input className="input" value={newName} onChange={e => setNewName(e.target.value)}
                placeholder="np. Farma NW" style={{ width: '180px' }} onKeyDown={e => e.key === 'Enter' && handleCreate()} />
            </div>
            <div>
              <label style={labelStyle}>Osada startowa X</label>
              <input className="input" type="number" value={newHomeX} onChange={e => setNewHomeX(e.target.value)}
                placeholder="np. -120" style={{ width: '100px' }} />
            </div>
            <div>
              <label style={labelStyle}>Y</label>
              <input className="input" type="number" value={newHomeY} onChange={e => setNewHomeY(e.target.value)}
                placeholder="np. 75" style={{ width: '100px' }} />
            </div>
            <button className="button" onClick={handleCreate}
              style={{ background: '#3b82f6', padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
              Utwórz
            </button>
            <button className="button" onClick={() => setCreateOpen(false)}
              style={{ background: '#334155', padding: '0.4rem 1rem', fontSize: '0.875rem' }}>
              Anuluj
            </button>
          </div>
        </div>
      )}

      {/* Lista istniejących list */}
      {raidLists.length === 0 && (
        <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Brak list grabieży. Utwórz nową.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {raidLists.map(list => (
          <div key={list.id} style={{
            background: activeListId === list.id ? '#1e3a5f' : '#1e293b',
            border: activeListId === list.id ? '1px solid #3b82f6' : '1px solid #334155',
            borderRadius: '0.5rem', padding: '0.75rem 1rem',
            cursor: 'pointer'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
              onClick={() => setActiveListId(activeListId === list.id ? null : list.id)}>
              <strong style={{ color: '#e2e8f0', flexGrow: 1 }}>{list.name}</strong>
              <span style={{ color: '#94a3b8', fontSize: '0.8rem' }}>
                {list.targets.length} cel{list.targets.length === 1 ? '' : list.targets.length < 5 ? 'e' : 'ów'}
              </span>
              {list.home_x != null && (
                <span style={{ color: '#facc15', fontSize: '0.8rem' }}>🏠 ({list.home_x}|{list.home_y})</span>
              )}
              {activeListId === list.id && (
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', cursor: 'pointer',
                  color: '#94a3b8', fontSize: '0.8rem' }} onClick={e => e.stopPropagation()}>
                  <input type="checkbox" checked={showOnMap} onChange={e => setShowOnMap(e.target.checked)}
                    style={{ cursor: 'pointer' }} />
                  Na mapie
                </label>
              )}
              <button
                onClick={e => { e.stopPropagation(); handleDelete(list.id) }}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: '0.1rem 0.3rem' }}
                title="Usuń listę"
              >×</button>
            </div>

            {/* Rozwinięty panel edycji aktywnej listy */}
            {activeListId === list.id && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid #334155', paddingTop: '1rem' }}>

                {/* Wyszukiwarka wiosek z snapshotu */}
                {selectedSnapshot && (
                  <div style={{ marginBottom: '1rem' }}>
                    <label style={labelStyle}>Szukaj wioski (nazwa/gracz/sojusz)</label>
                    <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem' }}>
                      <input className="input" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                        placeholder="np. Mirror, Dopey, R..." style={{ flexGrow: 1 }}
                        onKeyDown={e => e.key === 'Enter' && handleSearchVillage()} />
                      <button className="button" onClick={handleSearchVillage}
                        style={{ background: '#3b82f6', padding: '0.4rem 0.8rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        Szukaj
                      </button>
                    </div>
                    {searchResults.length > 0 && (
                      <div style={{
                        background: '#0f172a', border: '1px solid #334155',
                        borderRadius: '0.4rem', maxHeight: '200px', overflowY: 'auto'
                      }}>
                        {searchResults.map((v, i) => (
                          <div key={i} style={{
                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                            padding: '0.4rem 0.75rem', borderBottom: '1px solid #1e293b',
                            fontSize: '0.8rem', color: '#94a3b8'
                          }}>
                            <span style={{ flexGrow: 1 }}>
                              <strong style={{ color: '#e2e8f0' }}>{v.name}</strong> ({v.x}|{v.y}) — {v.owner}
                              {v.alliance ? ` [${v.alliance}]` : ''} Pop: {v.population}
                            </span>
                            <button className="button" onClick={() => handleAddFromSearch(v)}
                              style={{ background: '#16a34a', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                              + Cel
                            </button>
                            <button className="button" onClick={() => handleSetAsHome(v)}
                              style={{ background: '#d97706', padding: '0.2rem 0.5rem', fontSize: '0.75rem' }}>
                              🏠 Start
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Dodaj ręcznie przez koordynaty */}
                <div style={{ marginBottom: '1rem' }}>
                  <label style={labelStyle}>Dodaj cel ręcznie</label>
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                    <input className="input" type="number" value={addX} onChange={e => setAddX(e.target.value)}
                      placeholder="X" style={{ width: '80px' }} />
                    <input className="input" type="number" value={addY} onChange={e => setAddY(e.target.value)}
                      placeholder="Y" style={{ width: '80px' }} />
                    <input className="input" value={addNote} onChange={e => setAddNote(e.target.value)}
                      placeholder="Notatka (opcjonalna)" style={{ flexGrow: 1, minWidth: '150px' }}
                      onKeyDown={e => e.key === 'Enter' && handleAddManual()} />
                    <button className="button" onClick={handleAddManual}
                      style={{ background: '#16a34a', padding: '0.4rem 0.8rem', fontSize: '0.875rem' }}>
                      + Dodaj
                    </button>
                  </div>
                </div>

                {/* Import z listy nieaktywnych */}
                {inactiveLists.length > 0 && (
                  <div style={{ marginBottom: '1rem', background: '#0f172a', borderRadius: '0.4rem', padding: '0.75rem' }}>
                    <label style={labelStyle}>📋 Importuj z listy nieaktywnych</label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                      <select
                        value={selectedInactiveId}
                        onChange={e => setSelectedInactiveId(e.target.value)}
                        style={{
                          flexGrow: 1, background: '#1e293b', border: '1px solid #334155',
                          borderRadius: '0.375rem', color: '#e2e8f0', padding: '0.4rem 0.6rem',
                          fontSize: '0.875rem', minWidth: '180px'
                        }}
                      >
                        <option value="">— wybierz listę —</option>
                        {inactiveLists.map(l => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({(l.inactive_count || 0) + (l.disappeared_count || 0)} graczy)
                          </option>
                        ))}
                      </select>
                      <button className="button" onClick={handleImportSelectedInactiveList}
                        style={{ background: '#7c3aed', padding: '0.4rem 0.8rem', fontSize: '0.875rem', whiteSpace: 'nowrap' }}>
                        ⬇️ Importuj
                      </button>
                    </div>
                    {selectedInactiveId && (() => {
                      const lst = inactiveLists.find(l => l.id === parseInt(selectedInactiveId))
                      if (!lst) return null
                      const playerCount = (lst.inactive_count || 0) + (lst.disappeared_count || 0)
                      return (
                        <div style={{ marginTop: '0.4rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                          {lst.old_snapshot_name} → {lst.new_snapshot_name}
                          {lst.radius ? ` · promień ${lst.radius}` : ''}
                          {' · '}{playerCount} graczy
                        </div>
                      )
                    })()}
                  </div>
                )}

                {/* Lista celów */}
                {list.targets.length === 0 ? (
                  <div style={{ color: '#94a3b8', fontSize: '0.875rem' }}>Brak celów na liście.</div>
                ) : (
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid #334155' }}>
                        <th style={thSmall}>#</th>
                        <th style={thSmall}>Koordynaty</th>
                        <th style={thSmall}>Wioska</th>
                        <th style={thSmall}>Gracz</th>
                        <th style={thSmall}>Sojusz</th>
                        <th style={thSmall}>Pop</th>
                        <th style={thSmall}>Notatka</th>
                        <th style={thSmall}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {list.targets.map((t, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #1e293b' }}>
                          <td style={tdSmall}><span style={{ color: '#ef4444', fontWeight: 700 }}>{idx + 1}</span></td>
                          <td style={tdSmall}><strong style={{ color: '#e2e8f0' }}>({t.x}|{t.y})</strong></td>
                          <td style={tdSmall}>{t.name || '—'}</td>
                          <td style={tdSmall}>{t.owner || '—'}</td>
                          <td style={tdSmall}>{t.alliance ? `[${t.alliance}]` : '—'}</td>
                          <td style={tdSmall}>{t.population || '—'}</td>
                          <td style={tdSmall}><span style={{ color: '#f97316' }}>{t.note || ''}</span></td>
                          <td style={tdSmall}>
                            <button onClick={() => handleRemoveTarget(idx)}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1rem', padding: 0 }}>
                              ×
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Snackbar */}
      {snackbar && (
        <div style={{
          position: 'fixed', bottom: '1.5rem', left: '50%', transform: 'translateX(-50%)',
          background: '#1e293b', border: '1px solid #334155', borderRadius: '0.5rem',
          padding: '0.75rem 1.5rem', color: '#e2e8f0', fontSize: '0.875rem',
          zIndex: 99999, boxShadow: '0 4px 12px rgba(0,0,0,0.5)'
        }}>
          {snackbar}
        </div>
      )}
    </div>
  )
}

const labelStyle = { display: 'block', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.25rem' }
const thSmall = { padding: '0.3rem 0.5rem', textAlign: 'left', color: '#64748b', fontWeight: 600, fontSize: '0.7rem' }
const tdSmall = { padding: '0.3rem 0.5rem', color: '#94a3b8' }

export default RaidListManager
