import { useState, useEffect } from 'react'
import axios from 'axios'
import SearchIcon from '@mui/icons-material/Search'
import ArrowUpwardIcon from '@mui/icons-material/ArrowUpward'
import ArrowDownwardIcon from '@mui/icons-material/ArrowDownward'
import NavigateBeforeIcon from '@mui/icons-material/NavigateBefore'
import NavigateNextIcon from '@mui/icons-material/NavigateNext'
import FirstPageIcon from '@mui/icons-material/FirstPage'
import LastPageIcon from '@mui/icons-material/LastPage'
import PeopleIcon from '@mui/icons-material/People'

const API_URL = '/api'

function PlayerList({ selectedSnapshot, setSelectedSnapshot, snapshots }) {
  const [players, setPlayers] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortBy, setSortBy] = useState('population') // population, name, villages
  const [sortOrder, setSortOrder] = useState('desc') // asc, desc
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 50

  useEffect(() => {
    if (selectedSnapshot) {
      loadPlayers()
    }
  }, [selectedSnapshot])

  const loadPlayers = async () => {
    setLoading(true)
    try {
      const response = await axios.get(`${API_URL}/players/${selectedSnapshot}?limit=10000`)
      setPlayers(response.data.players)
      setCurrentPage(1)
    } catch (error) {
      console.error('Błąd ładowania graczy:', error)
    } finally {
      setLoading(false)
    }
  }

  // Filtrowanie
  const filteredPlayers = players.filter(player => {
    const searchLower = searchTerm.toLowerCase()
    return (
      player.name.toLowerCase().includes(searchLower) ||
      (player.alliance && player.alliance.toLowerCase().includes(searchLower))
    )
  })

  // Sortowanie
  const sortedPlayers = [...filteredPlayers].sort((a, b) => {
    let compareA, compareB
    
    switch(sortBy) {
      case 'name':
        compareA = a.name.toLowerCase()
        compareB = b.name.toLowerCase()
        break
      case 'villages':
        compareA = a.villages
        compareB = b.villages
        break
      case 'population':
      default:
        compareA = a.population
        compareB = b.population
        break
    }

    if (sortOrder === 'asc') {
      return compareA > compareB ? 1 : -1
    } else {
      return compareA < compareB ? 1 : -1
    }
  })

  // Paginacja
  const totalPages = Math.ceil(sortedPlayers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const currentPlayers = sortedPlayers.slice(startIndex, endIndex)

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(column)
      setSortOrder('desc')
    }
  }

  const SortIcon = ({ column }) => {
    if (sortBy !== column) return null
    return sortOrder === 'asc' ? 
      <ArrowUpwardIcon style={{ fontSize: '1rem' }} /> : 
      <ArrowDownwardIcon style={{ fontSize: '1rem' }} />
  }

  return (
    <div className="card">
      <div style={{ 
        display: 'flex', 
        alignItems: 'center', 
        gap: '0.75rem',
        marginBottom: '2rem'
      }}>
        <PeopleIcon style={{ fontSize: '2rem', color: '#60a5fa' }} />
        <h2 style={{ margin: 0 }}>Lista Wszystkich Graczy</h2>
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

      {selectedSnapshot && (
        <>
          {/* Wyszukiwanie */}
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ 
              position: 'relative',
              maxWidth: '500px'
            }}>
              <SearchIcon style={{ 
                position: 'absolute', 
                left: '1rem', 
                top: '50%', 
                transform: 'translateY(-50%)',
                color: '#64748b',
                fontSize: '1.25rem'
              }} />
              <input
                type="text"
                className="input"
                placeholder="Szukaj po nazwie gracza lub sojuszu..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  setCurrentPage(1)
                }}
                style={{ 
                  paddingLeft: '3rem',
                  fontSize: '1rem'
                }}
              />
            </div>
          </div>

          {loading ? (
            <div className="loading">Ładowanie listy graczy...</div>
          ) : (
            <>
              {/* Statystyki */}
              <div style={{ 
                marginBottom: '1.5rem',
                display: 'flex',
                gap: '2rem',
                flexWrap: 'wrap',
                alignItems: 'center'
              }}>
                <div>
                  <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                    Pokazuje {startIndex + 1}-{Math.min(endIndex, sortedPlayers.length)} z {sortedPlayers.length} graczy
                  </span>
                  {searchTerm && (
                    <span style={{ color: '#60a5fa', fontSize: '0.875rem', marginLeft: '1rem' }}>
                      (wyszukiwanie aktywne)
                    </span>
                  )}
                </div>
              </div>

              {/* Tabela */}
              <div style={{ 
                overflowX: 'auto',
                background: '#0f172a',
                borderRadius: '0.75rem',
                border: '1px solid #1e293b',
                boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.3)',
                marginBottom: '1.5rem'
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
                      }}>
                        Ranking
                      </th>
                      <th 
                        onClick={() => handleSort('name')}
                        style={{ 
                          padding: '1rem', 
                          textAlign: 'left', 
                          color: '#94a3b8',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          userSelect: 'none',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.5rem'
                        }}
                      >
                        Gracz <SortIcon column="name" />
                      </th>
                      <th style={{ 
                        padding: '1rem', 
                        textAlign: 'left', 
                        color: '#94a3b8',
                        fontWeight: '600',
                        fontSize: '0.875rem',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                      }}>
                        Sojusz
                      </th>
                      <th 
                        onClick={() => handleSort('villages')}
                        style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          color: '#94a3b8',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          Wioski <SortIcon column="villages" />
                        </div>
                      </th>
                      <th 
                        onClick={() => handleSort('population')}
                        style={{ 
                          padding: '1rem', 
                          textAlign: 'right', 
                          color: '#94a3b8',
                          fontWeight: '600',
                          fontSize: '0.875rem',
                          textTransform: 'uppercase',
                          letterSpacing: '0.05em',
                          cursor: 'pointer',
                          userSelect: 'none'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '0.5rem' }}>
                          Populacja <SortIcon column="population" />
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentPlayers.map((player, idx) => {
                      const globalRank = startIndex + idx + 1
                      return (
                        <tr 
                          key={idx} 
                          style={{ 
                            borderBottom: '1px solid #1e293b',
                            transition: 'background-color 0.2s'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                        >
                          <td style={{ 
                            padding: '1rem', 
                            color: '#64748b',
                            fontWeight: '500'
                          }}>
                            #{globalRank}
                          </td>
                          <td style={{ 
                            padding: '1rem', 
                            color: '#cbd5e1', 
                            fontWeight: '500'
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
                            ) : (
                              <span style={{ color: '#475569' }}>-</span>
                            )}
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
                            fontWeight: '600'
                          }}>
                            {player.population.toLocaleString()}
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginacja */}
              {totalPages > 1 && (
                <div style={{ 
                  display: 'flex', 
                  justifyContent: 'center', 
                  alignItems: 'center',
                  gap: '1rem',
                  marginTop: '2rem'
                }}>
                  <button
                    className="button"
                    onClick={() => setCurrentPage(1)}
                    disabled={currentPage === 1}
                    style={{ 
                      padding: '0.5rem',
                      minWidth: 'auto',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Pierwsza strona"
                  >
                    <FirstPageIcon />
                  </button>
                  <button
                    className="button"
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    style={{ 
                      padding: '0.5rem',
                      minWidth: 'auto',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Poprzednia strona"
                  >
                    <NavigateBeforeIcon />
                  </button>
                  
                  <span style={{ color: '#cbd5e1', fontSize: '0.875rem', minWidth: '120px', textAlign: 'center' }}>
                    Strona {currentPage} z {totalPages}
                  </span>
                  
                  <button
                    className="button"
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    style={{ 
                      padding: '0.5rem',
                      minWidth: 'auto',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Następna strona"
                  >
                    <NavigateNextIcon />
                  </button>
                  <button
                    className="button"
                    onClick={() => setCurrentPage(totalPages)}
                    disabled={currentPage === totalPages}
                    style={{ 
                      padding: '0.5rem',
                      minWidth: 'auto',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                    title="Ostatnia strona"
                  >
                    <LastPageIcon />
                  </button>
                </div>
              )}

              {/* Szybkie przejście do strony */}
              {totalPages > 5 && (
                <div style={{ 
                  marginTop: '1.5rem',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '1rem'
                }}>
                  <label style={{ color: '#94a3b8', fontSize: '0.875rem' }}>
                    Przejdź do strony:
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value)
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page)
                      }
                    }}
                    style={{
                      width: '80px',
                      padding: '0.5rem',
                      background: '#1e293b',
                      border: '1px solid #334155',
                      borderRadius: '0.375rem',
                      color: '#cbd5e1',
                      textAlign: 'center'
                    }}
                  />
                </div>
              )}

              {sortedPlayers.length === 0 && (
                <div style={{ 
                  textAlign: 'center', 
                  padding: '3rem',
                  color: '#64748b'
                }}>
                  <SearchIcon style={{ fontSize: '3rem', marginBottom: '1rem', opacity: 0.5 }} />
                  <p>Nie znaleziono graczy pasujących do kryteriów wyszukiwania.</p>
                </div>
              )}
            </>
          )}
        </>
      )}

      {!selectedSnapshot && (
        <div className="loading">Wybierz snapshot aby zobaczyć listę graczy</div>
      )}
    </div>
  )
}

export default PlayerList
