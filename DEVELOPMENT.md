# Travian Analyzer - Development Notes

## Opis Kolumn w map.sql

Plik `map.sql` z Travian zawiera następujące kolumny w VALUES():

1. **id** (int) - Unikalne ID wioski
2. **x** (int) - Współrzędna X (-200 do 200)
3. **y** (int) - Współrzędna Y (-200 do 200)
4. **tribe** (int) - Typ plemienia:
   - 1 = Romans (Rzymianie)
   - 2 = Teutons (Germanie)
   - 3 = Gauls (Galowie)
   - 4 = Nature (Natura/Natars)
   - 5 = Natars (NPC)
   - 6 = Egipcjanie
   - 7 = Hunowie
   - 8 = Spartanie
5. **player_id** (int) - ID gracza/timestamp
6. **village_name** (string) - Nazwa wioski
7. **owner_id** (int) - ID właściciela
8. **owner_name** (string) - Nick gracza
9. **alliance_id** (int) - ID sojuszu
10. **alliance_tag** (string) - Tag sojuszu (skrót)
11. **population** (int) - Populacja wioski ⭐ WAŻNE
12. **region** (string) - Nazwa regionu (Caledonia, Hyperborea, etc.)
13. **is_capital** (bool) - Czy to główna wioska
14. **is_city** (bool) - Czy to miasto
15. **is_harbor** (bool) - Czy to port
16. **wonder** (int) - Level cudu świata (0 = brak)

## Metryki Rozwoju Gracza

### Podstawowe:
- **Całkowita populacja** - suma pop wszystkich wiosek
- **Liczba wiosek** - ile wiosek posiada
- **Średnia populacja** - total_pop / villages
- **Największa wioska** - max(population)

### Zaawansowane:
- **Tempo wzrostu** - (pop_new - pop_old) / days
- **Efektywność** - avg_pop / villages (czy rozwija równomiernie)
- **Ekspansja** - nowe wioski między snapshotami
- **Koncentracja** - odległość między wioskami (spread)

## TODO: Przyszłe Funkcje

### Backend
- [ ] SQLite/PostgreSQL zamiast in-memory storage
- [ ] Automatyczny import z URL (jeśli serwer udostępnia)
- [ ] Background jobs dla dużych plików
- [ ] Rate limiting i security
- [ ] WebSocket dla real-time updates

### Frontend
- [ ] Dark/Light mode toggle
- [ ] Export do PDF/Excel
- [ ] Zaawansowane filtry (plemię, region, range populacji)
- [ ] Heatmapa zagęszczenia
- [ ] Linie połączeń między wioskami tego samego gracza
- [ ] Timeline slider dla historii
- [ ] Notifications system
- [ ] Mobile responsive design

### Analityka
- [ ] Predykcja rozwoju (ML)
- [ ] Wykrywanie nieaktywnych graczy
- [ ] Analiza sojuszy (who's growing fastest)
- [ ] Optimal farming targets (inactive villages nearby)
- [ ] War statistics (territory control)

## Performance Notes

### Backend Optimization:
- Parser SQL: ~5000 wiosek/sekundę
- Memory usage: ~50MB na 10k wiosek
- API response: <100ms dla większości endpointów

### Bottlenecks:
- Duże pliki SQL (>50k linii) - rozważ streaming
- Filtrowanie mapy po stronie klienta - przenieść do API
- Chart.js rendering dla >1000 punktów - użyć canvas pooling

## Przykładowe Zapytania

### Znajdź najbliższych sąsiadów:
```python
def find_neighbors(village, radius=10):
    return [v for v in villages 
            if abs(v.x - village.x) <= radius 
            and abs(v.y - village.y) <= radius]
```

### Top graczy w regionie:
```python
def top_in_region(region, limit=10):
    regional = [v for v in villages if v.region == region]
    by_player = group_by_player(regional)
    return sorted(by_player, key=lambda x: x.population)[:limit]
```

### Wykryj farming targets:
```python
def find_farms(player_village, max_distance=20):
    neighbors = find_neighbors(player_village, max_distance)
    return [v for v in neighbors 
            if v.owner_name == 'Natars' or v.population < 100]
```

## Database Schema (Future)

```sql
CREATE TABLE snapshots (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE villages (
    id INTEGER,
    snapshot_id INTEGER REFERENCES snapshots(id),
    x INTEGER,
    y INTEGER,
    tribe INTEGER,
    player_id INTEGER,
    village_name VARCHAR(255),
    owner_id INTEGER,
    owner_name VARCHAR(255),
    alliance_id INTEGER,
    alliance_tag VARCHAR(50),
    population INTEGER,
    region VARCHAR(100),
    is_capital BOOLEAN,
    is_city BOOLEAN,
    is_harbor BOOLEAN,
    wonder INTEGER,
    PRIMARY KEY (id, snapshot_id)
);

CREATE INDEX idx_villages_owner ON villages(owner_name, snapshot_id);
CREATE INDEX idx_villages_position ON villages(x, y, snapshot_id);
CREATE INDEX idx_villages_alliance ON villages(alliance_tag, snapshot_id);
```

## Testing

### Backend Tests:
```powershell
cd backend
pytest tests/
```

### Frontend Tests:
```powershell
cd frontend
npm test
```

### API Load Test:
```powershell
# Użyj Apache Bench lub k6
ab -n 1000 -c 10 http://localhost:8000/snapshots
```

## Deployment

### Backend (Docker):
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Frontend (Nginx):
```bash
npm run build
# Deploy dist/ folder to Nginx/Vercel/Netlify
```

---

**Last Updated:** 2026-04-22
