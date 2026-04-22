# 🐳 Docker - Instrukcja Użycia

## ✅ Wymagania

Upewnij się, że masz zainstalowane:
- **Docker Desktop** (pobierz z https://www.docker.com/products/docker-desktop/)
- Docker Desktop musi być **uruchomiony**

Sprawdź instalację:
```powershell
docker --version
docker-compose --version
```

---

## 🚀 Szybkie Uruchomienie

### Metoda 1: Główny skrypt
```bat
docker-start.bat
```

### Metoda 2: Z folderu QUICKSTART
```bat
cd QUICKSTART
start.bat
```

### Metoda 3: Ręcznie
```powershell
docker-compose up -d
```

---

## 📋 Dostępne Skrypty (w folderze QUICKSTART/)

| Skrypt | Opis |
|--------|------|
| **start.bat** | Uruchom wszystkie kontenery |
| **stop.bat** | Zatrzymaj wszystkie kontenery |
| **restart.bat** | Restart wszystkich kontenerów |
| **rebuild-backend.bat** | Przebuduj tylko backend |
| **rebuild-frontend.bat** | Przebuduj tylko frontend |
| **rebuild-all.bat** | Przebuduj wszystko od zera |
| **logs-backend.bat** | Wyświetl logi backendu |
| **logs-frontend.bat** | Wyświetl logi frontendu |
| **status.bat** | Sprawdź status kontenerów |
| **clean.bat** | Usuń wszystkie kontenery i obrazy |

---

## 🔧 Kiedy Używać Którego Skryptu?

### Pierwsze uruchomienie:
```bat
QUICKSTART\start.bat
```

### Po zmianach w kodzie Python (backend):
```bat
QUICKSTART\rebuild-backend.bat
```

### Po zmianach w kodzie React (frontend):
```bat
QUICKSTART\rebuild-frontend.bat
```

### Po zmianach w dependencies (requirements.txt lub package.json):
```bat
QUICKSTART\rebuild-all.bat
```

### Gdy coś nie działa jak powinno:
```bat
QUICKSTART\clean.bat
QUICKSTART\start.bat
```

### Sprawdzenie czy wszystko działa:
```bat
QUICKSTART\status.bat
```

---

## 🌐 Dostęp do Aplikacji

Po uruchomieniu aplikacja jest dostępna pod:
- **Frontend**: http://localhost:3000
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs

---

## 🔥 Hot Reload

Obydwa kontenery mają włączony **hot reload**:
- **Backend**: Uvicorn automatycznie restartuje przy zmianach w `.py`
- **Frontend**: Vite HMR automatycznie odświeża przeglądarkę

Edytuj kod lokalnie, zmiany są natychmiast widoczne w kontenerach!

---

## 📝 Struktura Projektu

```
travian_analizer/
├── docker-compose.yml       # Konfiguracja Dockera
├── docker-start.bat         # Szybki start
├── QUICKSTART/              # 🎯 Wszystkie skrypty zarządzania
│   ├── start.bat
│   ├── stop.bat
│   ├── rebuild-all.bat
│   └── ...
├── backend/
│   ├── Dockerfile           # Obraz backendu
│   ├── .dockerignore
│   └── main.py
└── frontend/
    ├── Dockerfile           # Obraz frontendu
    ├── .dockerignore
    └── src/
```

---

## 🐛 Rozwiązywanie Problemów

### "Cannot connect to Docker daemon"
- Uruchom **Docker Desktop**
- Poczekaj aż się całkowicie załaduje (ikona w zasobniku systemowym)

### Port już zajęty (8000 lub 3000)
```powershell
# Znajdź proces:
netstat -ano | findstr :8000

# Zabij proces:
taskkill /PID <PID> /F
```

### Kontenery nie startują
```bat
cd QUICKSTART
clean.bat
rebuild-all.bat
```

### Frontend nie widzi backendu
- Sprawdź czy oba kontenery działają: `status.bat`
- Sprawdź logi: `logs-backend.bat` / `logs-frontend.bat`
- Restart: `restart.bat`

### Zmiany w kodzie nie są widoczne
- Backend: `rebuild-backend.bat`
- Frontend: `rebuild-frontend.bat`
- Obydwa: `rebuild-all.bat`

---

## 📖 Więcej Informacji

Zobacz [QUICKSTART/README.md](QUICKSTART/README.md) dla szczegółowej dokumentacji.

---

## ⚡ Porównanie: Docker vs Tradycyjne Uruchomienie

### Tradycyjne (stare skrypty):
```bat
start-backend.bat    # Python venv + pip install
start-frontend.bat   # npm install + npm run dev
```
- ✅ Prostsze dla początkujących
- ❌ Wymaga Python + Node.js lokalnie
- ❌ Problemy z różnicami środowisk

### Docker (nowe skrypty):
```bat
QUICKSTART\start.bat
```
- ✅ Działa identycznie wszędzie
- ✅ Nie potrzeba Python/Node lokalnie
- ✅ Łatwy deployment na serwer
- ✅ Pełna izolacja
- ❌ Wymaga Docker Desktop

---

## 🎯 Rekomendacja

**Używaj Docker** dla:
- Produkcji / deployment
- Pracy w zespole
- Gdy chcesz uniknąć "works on my machine"

**Używaj tradycyjnego** dla:
- Szybkiego prototypowania
- Gdy nie masz Dockera

Obydwie metody działają równolegle! 🚀
