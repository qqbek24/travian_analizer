# Travian Analyzer - Szybki Start

## 🚀 Uruchomienie w 5 minut

### 1. Backend (Terminal 1)

```powershell
cd C:\Users\qqbek\Downloads\travian-analyzer\backend

# Stwórz środowisko wirtualne Python
python -m venv venv

# Aktywuj środowisko
.\venv\Scripts\Activate

# Zainstaluj zależności
pip install -r requirements.txt

# Uruchom backend
python main.py
```

✅ Backend działa na: http://localhost:8000  
📚 API Docs: http://localhost:8000/docs

---

### 2. Frontend (Terminal 2)

```powershell
cd C:\Users\qqbek\Downloads\travian-analyzer\frontend

# Zainstaluj zależności Node.js
npm install

# Uruchom aplikację React
npm run dev
```

✅ Frontend działa na: http://localhost:3000

---

### 3. Użycie

1. **Otwórz przeglądarkę**: http://localhost:3000
2. **Upload pliku**: Wgraj plik `map.sql` (masz w Downloads)
3. **Przeglądaj**: 
   - 🗺️ **Mapa** - Zobacz wszystkie wioski
   - 📊 **Dashboard** - Statystyki i rankingi
   - 👤 **Gracze** - Wyszukaj gracza po nicku
   - 📈 **Porównaj** - Dodaj drugi plik i porównaj rozwój

---

## 📋 Wymagania

- **Python 3.9+**
- **Node.js 18+**
- **npm** lub **yarn**

---

## 🎯 Pierwsze Kroki

### Testuj z istniejącym plikiem:
```powershell
# Backend już działa, więc w aplikacji:
# 1. Kliknij "Upload"
# 2. Wybierz C:\Users\qqbek\Downloads\map.sql
# 3. Nazwij snapshot: "Test 22.04.2026"
# 4. Upload!
```

### Sprawdź API bez frontendu:
```powershell
# Po uploaderze możesz testować API:
curl http://localhost:8000/snapshots
curl http://localhost:8000/players/Test%2022.04.2026?limit=10
```

---

## ❓ Problemy?

### Backend nie startuje:
```powershell
# Sprawdź Python:
python --version  # Powinno być 3.9+

# Reinstaluj pakiety:
pip install --upgrade -r requirements.txt
```

### Frontend nie startuje:
```powershell
# Sprawdź Node:
node --version  # Powinno być 18+

# Wyczyść cache:
rm -rf node_modules package-lock.json
npm install
```

### CORS Error:
Backend i frontend muszą działać jednocześnie. Sprawdź czy oba serwery są uruchomione.

---

## 🎉 Gotowe!

Teraz masz działające narzędzie do analizy Travian! 

**Następne kroki:**
- Upload więcej plików map.sql z różnych dat
- Porównuj rozwój graczy
- Analizuj sojusze
- Planuj strategie!
