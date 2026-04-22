# 🏰 Travian Map Analyzer

Profesjonalne narzędzie do analizy plików `map.sql` z gry Travian. Śledź rozwój graczy, wizualizuj mapy świata i porównuj snapshoty w czasie.

## ✨ Funkcje

- 📤 **Upload plików SQL** - Importuj pliki map.sql bezpośrednio z serwera Travian
- � **Trwałe przechowywanie** - Wszystkie snapshoty zapisywane w bazie SQLite
- 🗺️ **Interaktywna mapa** - Wizualizacja wszystkich wiosek na mapie świata
- 📊 **Dashboard statystyk** - Rankingi graczy, sojusze, wykresy Chart.js
- 👤 **Szczegóły gracza** - Pełne statystyki dowolnego gracza
- 📈 **Porównanie czasowe** - Analizuj rozwój między snapshotami
- 🔍 **Filtrowanie** - Szukaj po graczu, sojuszu, regionie
- 🐳 **Docker** - Łatwe uruchomienie z pełną izolacją

## 🎯 Struktura Danych

Plik `map.sql` zawiera wiersze w formacie:
```sql
INSERT INTO `x_world` VALUES (
  1,              -- ID wioski
  -200,           -- Pozycja X
  200,            -- Pozycja Y
  5,              -- Typ plemienia (1=Romans, 2=Teutons, 3=Gauls, etc.)
  1,              -- ID gracza
  'Natars',       -- Nazwa wioski
  1,              -- ID właściciela
  'Natars',       -- Nick właściciela
  0,              -- ID sojuszu
  '',             -- Tag sojuszu
  8,              -- Populacja ⭐
  'Caledonia',    -- Region
  TRUE,           -- Główna wioska (stolica)
  FALSE,          -- Miasto
  FALSE,          -- Port
  0               -- Cud świata
);
```

## 🚀 Szybki Start

### 🐳 Docker (Zalecane)

```powershell
# Uruchom wszystko jedną komendą
docker-start.bat

# Lub z folderu QUICKSTART
cd QUICKSTART
.\start.bat
```

**Aplikacja dostępna na:**
- Frontend: **http://localhost:3000**
- Backend: **http://localhost:8000**
- API Docs: **http://localhost:8000/docs**

📖 Więcej: Zobacz [DOCKER.md](DOCKER.md) i [QUICKSTART/README.md](QUICKSTART/README.md)

---

### ⚙️ Tradycyjne Uruchomienie

#### Backend (FastAPI)

```powershell
cd backend

# Stwórz wirtualne środowisko
python -m venv venv
.\venv\Scripts\Activate

# Zainstaluj zależności
pip install -r requirements.txt

# Uruchom serwer
python main.py
```

Backend będzie dostępny na: **http://localhost:8000**

API dokumentacja: **http://localhost:8000/docs**

#### Frontend (React)

```powershell
cd frontend

# Zainstaluj zależności
npm install

# Uruchom aplikację
npm run dev
```

Frontend będzie dostępny na: **http://localhost:3000**

## 📡 API Endpoints

### Upload
```http
POST /upload
```
Upload pliku SQL i utworzenie nowego snapshotu.

### Mapa
```http
GET /map/{snapshot_name}
```
Pobierz wszystkie wioski do wizualizacji mapy.

### Top Gracze
```http
GET /players/{snapshot_name}?limit=50
```
Lista najlepszych graczy według populacji.

### Statystyki Gracza
```http
GET /player/{snapshot_name}/{player_name}
```
Szczegółowe statystyki pojedynczego gracza.

### Porównanie
```http
POST /compare?snapshot1=X&snapshot2=Y&player_name=Z
```
Porównaj rozwój gracza między dwoma snapshotami.

### Sojusze
```http
GET /alliances/{snapshot_name}
```
Statystyki wszystkich sojuszy.

### Lista Snapshotów
```http
GET /snapshots
```
Lista wszystkich załadowanych snapshotów.

## 🎨 Technologie

### Backend
- **FastAPI** - Nowoczesny framework REST API
- **Pydantic** - Walidacja danych
- **Uvicorn** - ASGI server

### Frontend
- **React 18** - UI framework
- **Vite** - Build tool
- **React Router** - Routing
- **Chart.js** - Wykresy i wizualizacje
- **Axios** - HTTP client

## 📊 Przykłady Użycia

### 1. Analiza rozwoju gracza
1. Upload pliku `map.sql` z datą (np. "2026-04-22 wieczór")
2. Za tydzień upload kolejnego pliku (np. "2026-04-29 wieczór")
3. Przejdź do zakładki "Porównaj"
4. Wybierz oba snapshoty i nazwę gracza
5. Zobacz wzrost populacji, nowe wioski, tempo rozwoju

### 2. Monitorowanie sojuszu
1. Upload aktualnego map.sql
2. Przejdź do Dashboard
3. Zobacz statystyki sojuszy
4. Sprawdź rozmieszczenie wiosek na mapie

### 3. Analiza konkurencji
1. W zakładce "Gracze" wpisz nick przeciwnika
2. Zobacz jego wioski i populację
3. Sprawdź położenie na mapie
4. Planuj ataki na podstawie lokalizacji

## 🔧 Konfiguracja

### Backend (.env)
```env
BACKEND_PORT=8000
CORS_ORIGINS=http://localhost:3000,http://localhost:5173
```

### Frontend
Edytuj `API_URL` w komponentach jeśli backend działa na innym porcie.

## � Przechowywanie Danych

- **Baza danych**: SQLite (trwałe przechowywanie)
- **Lokalizacja**: Docker Volume `travian-data`  
- **Persystencja**: Dane zachowane po restarcie
- **Backup**: `docker cp travian-backend:/app/data/travian.db ./backup.db`

📖 Szczegóły: Zobacz [DATA_STORAGE.md](DATA_STORAGE.md)

## 📚 Dokumentacja

- [DOCKER.md](DOCKER.md) - Instrukcje Docker i kontenery
- [DATA_STORAGE.md](DATA_STORAGE.md) - Zarządzanie danymi i snapshotami  
- [QUICKSTART/README.md](QUICKSTART/README.md) - Szybkie skrypty zarządzania
- [DEVELOPMENT.md](DEVELOPMENT.md) - Notatki deweloperskie

## 🛠️ Stack Technologiczny

**Backend:**
- FastAPI (Python)
- SQLAlchemy (ORM)
- SQLite (Database)
- Uvicorn (ASGI Server)

**Frontend:**
- React 18
- Vite
- Chart.js
- React Router

**DevOps:**
- Docker & Docker Compose
- Multi-stage builds
- Volume persistence

## �📈 Roadmap

- [x] ✅ **Baza danych** - SQLite z trwałym przechowywaniem (GOTOWE!)
- [ ] **PostgreSQL** - Upgrade dla dużych serwerów
- [ ] **Eksport danych** - CSV, Excel, PDF
- [ ] **Zaawansowane filtrowanie** - Według typu plemienia, regionu
- [ ] **Heatmapa** - Wizualizacja gęstości populacji
- [ ] **Powiadomienia** - Alerty gdy gracz buduje wioskę/gubi populację
- [ ] **Historia** - Wykresy liniowe rozwoju w czasie (więcej niż 2 snapshoty)
- [ ] **Multi-user** - Logowanie i własne konta
- [ ] **API Key** - Autoryzacja zapytań

## 🐛 Znane Ograniczenia

- Parser SQL zakłada standardowy format Travian
- Brak obsługi niektórych specjalnych znaków w nazwach (HTML entities)

## 📝 Licencja

MIT License - Użyj jak chcesz!

## 🤝 Współpraca

Masz pomysły na ulepszenia? Pull requesty mile widziane!

## ⚡ Szybkie Komendy

```powershell
# Backend
cd backend
python main.py

# Frontend  
cd frontend
npm run dev

# Build produkcyjny
cd frontend
npm run build
```

---

**Autor:** Stworzono dla analizy serwerów Travian  
**Wersja:** 1.0.0  
**Data:** Kwiecień 2026
