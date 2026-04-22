# 🚀 QUICKSTART - Zarządzanie Dockerem

## 📋 Dostępne Skrypty

### Podstawowe Operacje
- **`start.bat`** - Uruchom wszystkie kontenery
- **`stop.bat`** - Zatrzymaj wszystkie kontenery
- **`restart.bat`** - Restart wszystkich kontenerów
- **`status.bat`** - Sprawdź status kontenerów

### Przebudowywanie
- **`rebuild-backend.bat`** - Przebuduj tylko backend
- **`rebuild-frontend.bat`** - Przebuduj tylko frontend
- **`rebuild-all.bat`** - Przebuduj wszystko od zera

### Logi i Debugowanie
- **`logs-backend.bat`** - Wyświetl logi backendu
- **`logs-frontend.bat`** - Wyświetl logi frontendu

### Czyszczenie
- **`clean.bat`** - Usuń wszystkie kontenery i obrazy

---

## 🎯 Szybki Start

1. **Pierwsze uruchomienie:**
   ```bat
   start.bat
   ```

2. **Otwórz aplikację:**
   - Frontend: http://localhost:3000
   - Backend: http://localhost:8000
   - API Docs: http://localhost:8000/docs

3. **Po zmianach w kodzie backendu:**
   ```bat
   rebuild-backend.bat
   ```

4. **Po zmianach w kodzie frontendu:**
   ```bat
   rebuild-frontend.bat
   ```

5. **Jeśli coś nie działa:**
   ```bat
   rebuild-all.bat
   ```

---

## 📊 Sprawdzanie Statusu

```bat
status.bat
```

Pokaże:
- Które kontenery działają
- Użycie CPU i pamięci
- Porty i sieci

---

## 🔧 Debugowanie

### Wyświetl logi na żywo:
```bat
logs-backend.bat    # Backend logs
logs-frontend.bat   # Frontend logs
```

### Wejdź do kontenera:
```powershell
docker exec -it travian-backend /bin/bash
docker exec -it travian-frontend /bin/sh
```

### Sprawdź sieć:
```powershell
docker network inspect travian_travian-network
```

---

## 🧹 Czyszczenie

### Usuń wszystko:
```bat
clean.bat
```

### Ręczne czyszczenie:
```powershell
docker-compose down -v              # Usuń kontenery i volumeny
docker-compose down --rmi all       # Usuń kontenery i obrazy
docker system prune -a              # Wyczyść wszystko w Dockerze
```

---

## ⚙️ Wymagania

- **Docker Desktop** dla Windows
- **Docker Compose** (wbudowany w Docker Desktop)

Sprawdź instalację:
```powershell
docker --version
docker-compose --version
```

---

## 📝 Notatki

### Hot Reload
- **Backend**: Automatyczny reload przy zmianach w kodzie (uvicorn --reload)
- **Frontend**: Automatyczny reload przy zmianach w kodzie (Vite HMR)

### Volumeny
- Backend: `./backend:/app` - kod jest montowany na żywo
- Frontend: `./frontend:/app` - kod jest montowany na żywo
- Frontend node_modules: `/app/node_modules` - pozostają w kontenerze

### Porty
- Backend: `8000` (FastAPI + Uvicorn)
- Frontend: `3000` (Vite Dev Server)

### Sieć
- Obydwa kontenery są w tej samej sieci: `travian-network`
- Backend jest dostępny dla frontendu jako: `http://backend:8000`

---

## 🐛 Rozwiązywanie Problemów

### Port już zajęty:
```powershell
# Sprawdź co używa portu 8000 lub 3000:
netstat -ano | findstr :8000
netstat -ano | findstr :3000

# Zabij proces:
taskkill /PID <PID> /F
```

### Kontenery nie startują:
```bat
clean.bat
rebuild-all.bat
```

### "Cannot connect to Docker daemon":
- Upewnij się, że Docker Desktop jest uruchomiony
- Sprawdź w zasobniku systemowym (tray)

### Problemy z cache:
```bat
rebuild-all.bat
```

Używa `--no-cache` co wymusza przebudowanie od zera.

---

## 🚀 Pro Tips

1. **Zawsze używaj start.bat** zamiast ręcznego `docker-compose up`
2. **Używaj rebuild-*.bat** gdy zmieniasz dependencies (requirements.txt, package.json)
3. **Sprawdzaj logi** gdy coś nie działa: `logs-backend.bat` / `logs-frontend.bat`
4. **Nie zapomnij o Docker Desktop** - musi być uruchomiony!

---

## 📞 Pomoc

Jeśli masz problemy:
1. Sprawdź `status.bat`
2. Sprawdź logi: `logs-backend.bat` / `logs-frontend.bat`
3. Spróbuj: `rebuild-all.bat`
4. Ostateczność: `clean.bat` + `start.bat`
