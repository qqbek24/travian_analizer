import { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Snackbar,
  CircularProgress,
  Chip,
  Card,
  CardContent,
  CardActions,
  Checkbox,
  TableSortLabel
} from '@mui/material';
import {
  Search as SearchIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
  Map as MapIcon,
  Info as InfoIcon,
  ArrowUpward as ArrowUpwardIcon,
  ArrowDownward as ArrowDownwardIcon
} from '@mui/icons-material';

const API_URL = "http://localhost:8000";

function InactivePlayers() {
  const [snapshots, setSnapshots] = useState([]);
  const [oldSnapshot, setOldSnapshot] = useState('');
  const [newSnapshot, setNewSnapshot] = useState('');
  const [centerX, setCenterX] = useState('');
  const [centerY, setCenterY] = useState('');
  const [radius, setRadius] = useState('');
  const [searchVillage, setSearchVillage] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [savedLists, setSavedLists] = useState([]);
  const [activeTab, setActiveTab] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [listName, setListName] = useState('');
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  const [selectedList, setSelectedList] = useState(null);
  
  // Sortowanie
  const [orderBy, setOrderBy] = useState('');
  const [order, setOrder] = useState('asc');
  
  // Zaznaczone wiersze
  const [selectedRows, setSelectedRows] = useState({
    inactive: [],
    disappeared_players: [],
    disappeared_villages: [],
    owner_changes: [],
    population_drops: []
  });

  useEffect(() => {
    loadSnapshots();
    loadSavedLists();
  }, []);

  const loadSnapshots = async () => {
    try {
      const response = await axios.get(`${API_URL}/snapshots`);
      setSnapshots(response.data.snapshots);
    } catch (error) {
      showSnackbar('Błąd ładowania snapshotów', 'error');
    }
  };

  const loadSavedLists = async () => {
    try {
      const response = await axios.get(`${API_URL}/inactive-lists`);
      setSavedLists(response.data);
    } catch (error) {
      showSnackbar('Błąd ładowania zapisanych list', 'error');
    }
  };

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const searchVillageByName = async () => {
    if (!newSnapshot || !searchVillage) {
      showSnackbar('Wybierz snapshot i wpisz nazwę wioski', 'warning');
      return;
    }

    try {
      const response = await axios.get(`${API_URL}/map/${newSnapshot}`);
      const villages = response.data.villages.filter(v => 
        v.village_name.toLowerCase().includes(searchVillage.toLowerCase())
      );
      setSearchResults(villages);
    } catch (error) {
      showSnackbar('Błąd wyszukiwania wioski', 'error');
    }
  };

  const selectVillage = (village) => {
    setCenterX(village.x.toString());
    setCenterY(village.y.toString());
    setSearchResults([]);
    setSearchVillage('');
    showSnackbar(`Wybrano wioskę: ${village.village_name} (${village.x}, ${village.y})`, 'success');
  };

  const analyzeInactive = async () => {
    if (!oldSnapshot || !newSnapshot) {
      showSnackbar('Wybierz oba snapshoty do porównania', 'warning');
      return;
    }

    setLoading(true);
    try {
      const payload = {
        old_snapshot: oldSnapshot,
        new_snapshot: newSnapshot
      };

      if (centerX && centerY && radius) {
        payload.center_x = parseInt(centerX);
        payload.center_y = parseInt(centerY);
        payload.radius = parseFloat(radius);
      }

      const response = await axios.post(`${API_URL}/analyze/inactive`, payload);
      setAnalysisResults(response.data);
      showSnackbar('Analiza zakończona pomyślnie', 'success');
    } catch (error) {
      showSnackbar('Błąd podczas analizy', 'error');
    } finally {
      setLoading(false);
    }
  };

  const saveList = async () => {
    if (!listName.trim()) {
      showSnackbar('Podaj nazwę listy', 'warning');
      return;
    }

    if (!analysisResults) {
      showSnackbar('Brak wyników do zapisania', 'warning');
      return;
    }

    // Sprawdź czy cokolwiek jest zaznaczone
    const totalSelected = Object.values(selectedRows).reduce((sum, arr) => sum + arr.length, 0);
    if (totalSelected === 0) {
      showSnackbar('Zaznacz przynajmniej jeden rekord', 'warning');
      return;
    }

    try {
      // Filtruj dane aby zapisać tylko zaznaczone rekordy
      const filteredData = {
        ...analysisResults,
        inactive_players: analysisResults.inactive_players.filter((_, idx) => 
          selectedRows.inactive.includes(idx)
        ),
        disappeared_players: analysisResults.disappeared_players.filter((_, idx) => 
          selectedRows.disappeared_players.includes(idx)
        ),
        disappeared_villages: analysisResults.disappeared_villages.filter((_, idx) => 
          selectedRows.disappeared_villages.includes(idx)
        ),
        owner_changes: analysisResults.owner_changes.filter((_, idx) => 
          selectedRows.owner_changes.includes(idx)
        ),
        population_drops: analysisResults.population_drops.filter((_, idx) => 
          selectedRows.population_drops.includes(idx)
        ),
        summary: {
          inactive_count: selectedRows.inactive.length,
          disappeared_players_count: selectedRows.disappeared_players.length,
          disappeared_villages_count: selectedRows.disappeared_villages.length,
          owner_changes_count: selectedRows.owner_changes.length,
          population_drops_count: selectedRows.population_drops.length
        }
      };

      const payload = {
        name: listName,
        old_snapshot: oldSnapshot,
        new_snapshot: newSnapshot,
        data: filteredData
      };

      if (centerX && centerY && radius) {
        payload.center_x = parseInt(centerX);
        payload.center_y = parseInt(centerY);
        payload.radius = parseFloat(radius);
      }

      await axios.post(`${API_URL}/inactive-lists`, payload);
      showSnackbar('Lista zapisana pomyślnie', 'success');
      setSaveDialogOpen(false);
      setListName('');
      loadSavedLists();
    } catch (error) {
      showSnackbar(error.response?.data?.detail || 'Błąd podczas zapisywania listy', 'error');
    }
  };

  const loadList = async (listId) => {
    try {
      const response = await axios.get(`${API_URL}/inactive-lists/${listId}`);
      const list = response.data;
      setSelectedList(list);
      setOldSnapshot(list.old_snapshot_name);
      setNewSnapshot(list.new_snapshot_name);
      setCenterX(list.center_x?.toString() || '');
      setCenterY(list.center_y?.toString() || '');
      setRadius(list.radius?.toString() || '');
      setAnalysisResults(list.data);
      showSnackbar(`Załadowano listę: ${list.name}`, 'success');
    } catch (error) {
      showSnackbar('Błąd ładowania listy', 'error');
    }
  };

  const deleteList = async (listId) => {
    if (!confirm('Czy na pewno chcesz usunąć tę listę?')) return;

    try {
      await axios.delete(`${API_URL}/inactive-lists/${listId}`);
      showSnackbar('Lista usunięta', 'success');
      loadSavedLists();
      if (selectedList?.id === listId) {
        setSelectedList(null);
        setAnalysisResults(null);
      }
    } catch (error) {
      showSnackbar('Błąd podczas usuwania listy', 'error');
    }
  };

  const recheckList = async (listId) => {
    if (!newSnapshot) {
      showSnackbar('Wybierz nowy snapshot do sprawdzenia', 'warning');
      return;
    }

    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/inactive-lists/${listId}/check`, null, {
        params: { new_snapshot: newSnapshot }
      });
      setAnalysisResults(response.data.analysis);
      showSnackbar('Lista sprawdzona ponownie', 'success');
    } catch (error) {
      showSnackbar('Błąd podczas sprawdzania listy', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Funkcje sortowania
  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const sortData = (data, comparator) => {
    const stabilizedThis = data.map((el, index) => [el, index]);
    stabilizedThis.sort((a, b) => {
      const order = comparator(a[0], b[0]);
      if (order !== 0) return order;
      return a[1] - b[1];
    });
    return stabilizedThis.map((el) => el[0]);
  };

  const getComparator = (order, orderBy) => {
    return order === 'desc'
      ? (a, b) => descendingComparator(a, b, orderBy)
      : (a, b) => -descendingComparator(a, b, orderBy);
  };

  const descendingComparator = (a, b, orderBy) => {
    if (b[orderBy] < a[orderBy]) return -1;
    if (b[orderBy] > a[orderBy]) return 1;
    return 0;
  };

  // Funkcje zaznaczania wierszy
  const getTabKey = (tabIndex) => {
    const keys = ['inactive', 'disappeared_players', 'disappeared_villages', 'owner_changes', 'population_drops'];
    return keys[tabIndex];
  };

  const handleSelectAllClick = (event, tabKey, data) => {
    if (event.target.checked) {
      setSelectedRows({
        ...selectedRows,
        [tabKey]: data.map((_, index) => index)
      });
    } else {
      setSelectedRows({
        ...selectedRows,
        [tabKey]: []
      });
    }
  };

  const handleRowClick = (tabKey, index) => {
    const currentSelected = selectedRows[tabKey];
    const selectedIndex = currentSelected.indexOf(index);
    let newSelected = [];

    if (selectedIndex === -1) {
      newSelected = newSelected.concat(currentSelected, index);
    } else if (selectedIndex === 0) {
      newSelected = newSelected.concat(currentSelected.slice(1));
    } else if (selectedIndex === currentSelected.length - 1) {
      newSelected = newSelected.concat(currentSelected.slice(0, -1));
    } else if (selectedIndex > 0) {
      newSelected = newSelected.concat(
        currentSelected.slice(0, selectedIndex),
        currentSelected.slice(selectedIndex + 1)
      );
    }

    setSelectedRows({
      ...selectedRows,
      [tabKey]: newSelected
    });
  };

  const isSelected = (tabKey, index) => selectedRows[tabKey].indexOf(index) !== -1;

  const renderTable = (data, columns, tabKey) => {
    if (!data || data.length === 0) {
      return (
        <Typography sx={{ p: 3, textAlign: 'center', color: '#94a3b8' }}>
          Brak danych
        </Typography>
      );
    }

    const sortedData = sortData(data, getComparator(order, orderBy));
    const numSelected = selectedRows[tabKey].length;
    const rowCount = data.length;

    return (
      <TableContainer 
        component={Paper} 
        sx={{ 
          backgroundColor: '#1e293b',
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
          borderRadius: '0.75rem',
          overflow: 'hidden'
        }}
      >
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: '#0f172a' }}>
              <TableCell padding="checkbox" sx={{ borderBottom: '1px solid #334155' }}>
                <Checkbox
                  sx={{ 
                    color: '#60a5fa',
                    '&.Mui-checked': { color: '#3b82f6' }
                  }}
                  indeterminate={numSelected > 0 && numSelected < rowCount}
                  checked={rowCount > 0 && numSelected === rowCount}
                  onChange={(e) => handleSelectAllClick(e, tabKey, data)}
                />
              </TableCell>
              {columns.map((col, idx) => (
                <TableCell 
                  key={idx} 
                  sx={{ 
                    color: '#e2e8f0',
                    fontWeight: 600,
                    borderBottom: '1px solid #334155'
                  }}
                  sortDirection={orderBy === col.field ? order : false}
                >
                  {col.field ? (
                    <TableSortLabel
                      active={orderBy === col.field}
                      direction={orderBy === col.field ? order : 'asc'}
                      onClick={() => handleRequestSort(col.field)}
                      sx={{
                        color: '#e2e8f0 !important',
                        '&:hover': { color: '#60a5fa !important' },
                        '&.Mui-active': { color: '#60a5fa !important' },
                        '& .MuiTableSortLabel-icon': { color: '#60a5fa !important' }
                      }}
                    >
                      {col.label}
                    </TableSortLabel>
                  ) : (
                    col.label
                  )}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {sortedData.map((row, idx) => {
              const isItemSelected = isSelected(tabKey, idx);
              return (
                <TableRow 
                  key={idx} 
                  hover
                  onClick={() => handleRowClick(tabKey, idx)}
                  selected={isItemSelected}
                  sx={{
                    cursor: 'pointer',
                    backgroundColor: isItemSelected ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                    '&:hover': {
                      backgroundColor: isItemSelected 
                        ? 'rgba(59, 130, 246, 0.25)' 
                        : 'rgba(148, 163, 184, 0.1)'
                    },
                    '& td': { 
                      borderBottom: '1px solid #334155',
                      color: '#cbd5e1'
                    }
                  }}
                >
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isItemSelected}
                      sx={{ 
                        color: '#60a5fa',
                        '&.Mui-checked': { color: '#3b82f6' }
                      }}
                    />
                  </TableCell>
                  {columns.map((col, colIdx) => (
                    <TableCell key={colIdx}>
                      {col.render ? col.render(row) : row[col.field]}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    );
  };

  const renderAnalysisResults = () => {
    if (!analysisResults) return null;

    // Pomocnicza funkcja do dodania kolumny odległości jeśli dane ją zawierają
    const addDistanceColumn = (columns, data) => {
      if (data && data.length > 0 && data[0].distance !== undefined) {
        return [...columns, { label: 'Odl.', field: 'distance' }];
      }
      return columns;
    };

    const tabs = [
      {
        label: `Nieaktywni (${analysisResults.summary?.inactive_count || 0})`,
        data: analysisResults.inactive_players,
        tabKey: 'inactive',
        columns: addDistanceColumn([
          { label: 'Gracz', field: 'player_name' },
          { label: 'Sojusz', field: 'alliance' },
          { label: 'Wioski', field: 'villages_count' },
          { label: 'Pop. (1)', field: 'old_population' },
          { label: 'Pop. (2)', field: 'new_population' }
        ], analysisResults.inactive_players)
      },
      {
        label: `Zniknęli gracze (${analysisResults.summary?.disappeared_players_count || 0})`,
        data: analysisResults.disappeared_players,
        tabKey: 'disappeared_players',
        columns: addDistanceColumn([
          { label: 'Gracz', field: 'player_name' },
          { label: 'Sojusz', field: 'alliance' },
          { label: 'Wioski (stare)', field: 'old_villages_count' },
          { label: 'Populacja (stara)', field: 'old_total_population' }
        ], analysisResults.disappeared_players)
      },
      {
        label: `Zniknęły wioski (${analysisResults.summary?.disappeared_villages_count || 0})`,
        data: analysisResults.disappeared_villages,
        tabKey: 'disappeared_villages',
        columns: addDistanceColumn([
          { label: 'Nazwa wioski', field: 'village_name' },
          { label: 'Właściciel', field: 'owner' },
          { label: 'Koordynaty', render: (row) => `(${row.x}, ${row.y})` },
          { label: 'Populacja', field: 'population' }
        ], analysisResults.disappeared_villages)
      },
      {
        label: `Zmiana właściciela (${analysisResults.summary?.owner_changes_count || 0})`,
        data: analysisResults.owner_changes,
        tabKey: 'owner_changes',
        columns: addDistanceColumn([
          { label: 'Koordynaty', render: (row) => `(${row.x}, ${row.y})` },
          { label: 'Stary właściciel', field: 'old_owner' },
          { label: 'Nowy właściciel', field: 'new_owner' },
          { label: 'Zmiana pop.', field: 'pop_change', render: (row) => row.pop_change > 0 ? `+${row.pop_change}` : row.pop_change }
        ], analysisResults.owner_changes)
      },
      {
        label: `Spadek populacji (${analysisResults.summary?.population_drops_count || 0})`,
        data: analysisResults.population_drops,
        tabKey: 'population_drops',
        columns: addDistanceColumn([
          { label: 'Gracz', field: 'player_name' },
          { label: 'Sojusz', field: 'alliance' },
          { label: 'Wioski', field: 'villages_count' },
          { label: 'Pop. (1)', field: 'old_population' },
          { label: 'Pop. (2)', field: 'new_population' },
          { label: 'Spadek', field: 'pop_change' }
        ], analysisResults.population_drops)
      }
    ];

    const currentTab = tabs[activeTab];
    const selectedCount = selectedRows[currentTab.tabKey]?.length || 0;

    return (
      <Box sx={{ mt: 3 }}>
        <Tabs 
          value={activeTab} 
          onChange={(e, v) => setActiveTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            backgroundColor: '#1e293b',
            borderRadius: '0.75rem 0.75rem 0 0',
            minHeight: '56px',
            '& .MuiTab-root': {
              color: '#94a3b8',
              fontSize: '0.9rem',
              fontWeight: 500,
              textTransform: 'none',
              minHeight: '56px',
              '&:hover': {
                color: '#cbd5e1',
                backgroundColor: 'rgba(148, 163, 184, 0.1)'
              },
              '&.Mui-selected': {
                color: '#60a5fa',
                fontWeight: 600
              }
            },
            '& .MuiTabs-indicator': {
              backgroundColor: '#60a5fa',
              height: '3px'
            }
          }}
        >
          {tabs.map((tab, idx) => (
            <Tab key={idx} label={tab.label} />
          ))}
        </Tabs>

        {selectedCount > 0 && (
          <Box 
            sx={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              backgroundColor: '#334155',
              px: 2,
              py: 1,
              borderRadius: '0 0 0.75rem 0.75rem'
            }}
          >
            <Typography sx={{ color: '#e2e8f0', fontSize: '0.9rem' }}>
              Zaznaczono: {selectedCount} {selectedCount === 1 ? 'rekord' : 'rekordów'}
            </Typography>
            <Button
              variant="contained"
              size="small"
              onClick={() => setSaveDialogOpen(true)}
              startIcon={<SaveIcon />}
              sx={{
                backgroundColor: '#3b82f6',
                '&:hover': { backgroundColor: '#2563eb' }
              }}
            >
              Zapisz zaznaczone
            </Button>
          </Box>
        )}

        <Box sx={{ mt: 2 }}>
          {renderTable(currentTab.data, currentTab.columns, currentTab.tabKey)}
        </Box>
      </Box>
    );
  };

  return (
    <Box sx={{ p: 3, backgroundColor: '#0f172a', minHeight: '100vh' }}>
      <Typography variant="h4" gutterBottom sx={{ color: '#60a5fa', fontWeight: 600 }}>
        Analiza Nieaktywnych Graczy
      </Typography>

      <Grid container spacing={3}>
        {/* Panel konfiguracji */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2, 
            backgroundColor: '#1e293b',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            borderRadius: '0.75rem'
          }}>
            <Typography variant="h6" gutterBottom sx={{ color: '#e2e8f0', fontWeight: 600 }}>
              Parametry analizy
            </Typography>

            <Grid container spacing={2}>
              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#94a3b8' }}>Stary snapshot</InputLabel>
                  <Select
                    value={oldSnapshot}
                    onChange={(e) => setOldSnapshot(e.target.value)}
                    label="Stary snapshot"
                    sx={{
                      color: '#e2e8f0',
                      backgroundColor: '#0f172a',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                      '& .MuiSvgIcon-root': { color: '#94a3b8' }
                    }}
                  >
                    {snapshots.map(s => (
                      <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={6}>
                <FormControl fullWidth>
                  <InputLabel sx={{ color: '#94a3b8' }}>Nowy snapshot</InputLabel>
                  <Select
                    value={newSnapshot}
                    onChange={(e) => setNewSnapshot(e.target.value)}
                    label="Nowy snapshot"
                    sx={{
                      color: '#e2e8f0',
                      backgroundColor: '#0f172a',
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
                      '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' },
                      '& .MuiSvgIcon-root': { color: '#94a3b8' }
                    }}
                  >
                    {snapshots.map(s => (
                      <MenuItem key={s.name} value={s.name}>{s.name}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>

              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom sx={{ mt: 2, color: '#cbd5e1' }}>
                  Filtr promienia (opcjonalnie)
                </Typography>
              </Grid>

              <Grid item xs={12}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    label="Szukaj wioski"
                    value={searchVillage}
                    onChange={(e) => setSearchVillage(e.target.value)}
                    size="small"
                    fullWidth
                    onKeyPress={(e) => e.key === 'Enter' && searchVillageByName()}
                    sx={{
                      '& .MuiInputLabel-root': { color: '#94a3b8' },
                      '& .MuiInputBase-root': { 
                        color: '#e2e8f0',
                        backgroundColor: '#0f172a'
                      },
                      '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                      '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
                      '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' }
                    }}
                  />
                  <IconButton 
                    onClick={searchVillageByName}
                    sx={{ 
                      color: '#60a5fa',
                      backgroundColor: '#0f172a',
                      '&:hover': { backgroundColor: '#334155' }
                    }}
                  >
                    <SearchIcon />
                  </IconButton>
                </Box>
                {searchResults.length > 0 && (
                  <Paper sx={{ 
                    mt: 1, 
                    maxHeight: 200, 
                    overflow: 'auto',
                    backgroundColor: '#0f172a',
                    border: '1px solid #334155'
                  }}>
                    {searchResults.map((v, idx) => (
                      <Box
                        key={idx}
                        sx={{ 
                          p: 1, 
                          cursor: 'pointer', 
                          '&:hover': { bgcolor: '#334155' },
                          borderBottom: idx < searchResults.length - 1 ? '1px solid #334155' : 'none'
                        }}
                        onClick={() => selectVillage(v)}
                      >
                        <Typography variant="body2" sx={{ color: '#e2e8f0' }}>
                          {v.village_name} ({v.x}, {v.y}) - {v.owner_name}
                        </Typography>
                      </Box>
                    ))}
                  </Paper>
                )}
              </Grid>

              <Grid item xs={4}>
                <TextField
                  label="X"
                  type="number"
                  value={centerX}
                  onChange={(e) => setCenterX(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                    '& .MuiInputBase-root': { 
                      color: '#e2e8f0',
                      backgroundColor: '#0f172a'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' }
                  }}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  label="Y"
                  type="number"
                  value={centerY}
                  onChange={(e) => setCenterY(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                    '& .MuiInputBase-root': { 
                      color: '#e2e8f0',
                      backgroundColor: '#0f172a'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' }
                  }}
                />
              </Grid>

              <Grid item xs={4}>
                <TextField
                  label="Promień"
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(e.target.value)}
                  size="small"
                  fullWidth
                  sx={{
                    '& .MuiInputLabel-root': { color: '#94a3b8' },
                    '& .MuiInputBase-root': { 
                      color: '#e2e8f0',
                      backgroundColor: '#0f172a'
                    },
                    '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
                    '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' }
                  }}
                />
              </Grid>

              <Grid item xs={12}>
                <Button
                  variant="contained"
                  onClick={analyzeInactive}
                  disabled={loading || !oldSnapshot || !newSnapshot}
                  fullWidth
                  startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                  sx={{
                    backgroundColor: '#3b82f6',
                    '&:hover': { backgroundColor: '#2563eb' },
                    '&:disabled': { backgroundColor: '#475569', color: '#94a3b8' },
                    py: 1.2,
                    fontSize: '1rem',
                    fontWeight: 600
                  }}
                >
                  {loading ? 'Analizuję...' : 'Analizuj'}
                </Button>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        {/* Panel zapisanych list */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ 
            p: 2,
            backgroundColor: '#1e293b',
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.3)',
            borderRadius: '0.75rem'
          }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography variant="h6" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                Zapisane listy
              </Typography>
              <IconButton 
                onClick={loadSavedLists} 
                size="small"
                sx={{ 
                  color: '#60a5fa',
                  '&:hover': { backgroundColor: '#334155' }
                }}
              >
                <RefreshIcon />
              </IconButton>
            </Box>

            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {savedLists.length === 0 ? (
                <Typography sx={{ color: '#94a3b8', textAlign: 'center', py: 3 }}>
                  Brak zapisanych list
                </Typography>
              ) : (
                savedLists.map(list => (
                  <Card key={list.id} sx={{ 
                    mb: 1.5,
                    backgroundColor: '#0f172a',
                    borderRadius: '0.5rem',
                    border: '1px solid #334155',
                    '&:hover': { borderColor: '#60a5fa' }
                  }}>
                    <CardContent sx={{ pb: 1 }}>
                      <Typography variant="subtitle1" sx={{ color: '#e2e8f0', fontWeight: 600 }}>
                        {list.name}
                      </Typography>
                      <Typography variant="body2" sx={{ color: '#94a3b8' }}>
                        {list.old_snapshot_name} → {list.new_snapshot_name}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b' }}>
                        {new Date(list.created_at).toLocaleString('pl-PL')}
                      </Typography>
                      {list.radius && (
                        <Chip
                          size="small"
                          label={`Promień: ${list.radius}`}
                          sx={{ 
                            ml: 1,
                            backgroundColor: '#334155',
                            color: '#e2e8f0',
                            fontSize: '0.75rem'
                          }}
                        />
                      )}
                    </CardContent>
                    <CardActions sx={{ pt: 0 }}>
                      <Button 
                        size="small" 
                        onClick={() => loadList(list.id)}
                        sx={{ 
                          color: '#60a5fa',
                          '&:hover': { backgroundColor: 'rgba(96, 165, 250, 0.1)' }
                        }}
                      >
                        Załaduj
                      </Button>
                      <Button
                        size="small"
                        onClick={() => recheckList(list.id)}
                        disabled={!newSnapshot}
                        sx={{ 
                          color: '#60a5fa',
                          '&:hover': { backgroundColor: 'rgba(96, 165, 250, 0.1)' },
                          '&:disabled': { color: '#475569' }
                        }}
                      >
                        Sprawdź ponownie
                      </Button>
                      <IconButton
                        size="small"
                        onClick={() => deleteList(list.id)}
                        sx={{ 
                          color: '#ef4444',
                          ml: 'auto',
                          '&:hover': { backgroundColor: 'rgba(239, 68, 68, 0.1)' }
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </CardActions>
                  </Card>
                ))
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Wyniki */}
        <Grid item xs={12}>
          {renderAnalysisResults()}
        </Grid>
      </Grid>

      {/* Dialog zapisu */}
      <Dialog 
        open={saveDialogOpen} 
        onClose={() => setSaveDialogOpen(false)}
        PaperProps={{
          sx: {
            backgroundColor: '#1e293b',
            backgroundImage: 'none',
            borderRadius: '0.75rem'
          }
        }}
      >
        <DialogTitle sx={{ color: '#e2e8f0', fontWeight: 600 }}>
          Zapisz listę
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label="Nazwa listy"
            fullWidth
            value={listName}
            onChange={(e) => setListName(e.target.value)}
            sx={{ 
              mt: 2,
              '& .MuiInputLabel-root': { color: '#94a3b8' },
              '& .MuiInputBase-root': { 
                color: '#e2e8f0',
                backgroundColor: '#0f172a'
              },
              '& .MuiOutlinedInput-notchedOutline': { borderColor: '#334155' },
              '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: '#60a5fa' },
              '& .Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: '#3b82f6' }
            }}
          />
          <Typography variant="caption" sx={{ color: '#94a3b8', display: 'block', mt: 1 }}>
            Zostaną zapisane tylko zaznaczone rekordy
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setSaveDialogOpen(false)}
            sx={{ color: '#94a3b8' }}
          >
            Anuluj
          </Button>
          <Button 
            onClick={saveList} 
            variant="contained"
            sx={{
              backgroundColor: '#3b82f6',
              '&:hover': { backgroundColor: '#2563eb' }
            }}
          >
            Zapisz
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
      >
        <Alert 
          severity={snackbar.severity} 
          onClose={() => setSnackbar({ ...snackbar, open: false })}
          sx={{
            backgroundColor: snackbar.severity === 'error' ? '#7f1d1d' : 
                            snackbar.severity === 'warning' ? '#78350f' : '#065f46',
            color: '#e2e8f0',
            '& .MuiAlert-icon': { color: '#e2e8f0' }
          }}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default InactivePlayers;
