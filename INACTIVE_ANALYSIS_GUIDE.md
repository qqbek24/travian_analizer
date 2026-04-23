# Analiza Nieaktywnych Graczy - Przewodnik

## 📋 Przegląd

System analizy nieaktywnych graczy pozwala na porównywanie dwóch snapshot'uw i wykrywanie:
- ✅ **Nieaktywnych graczy** - brak przyrostu populacji
- ✅ **Zniknął graczy** - gracze którzy całkowicie zniknęli  
- ✅ **Zniknęły wioski** - wioski które przestały istnieć
- ✅ **Zmiana właściciela** - wioski które zostały przejęte
- ✅ **Spadek populacji** - gracze którzy stracili populację

## 🚀 Jak używać

### 1. Przejdź do zakładki "Nieaktywni"
Kliknij link "Nieaktywni" w nawigacji głównej aplikacji

### 2. Wybierz snapshoty do porównania
- **Stary snapshot** - wcześniejszy stan (np. z wczoraj)
- **Nowy snapshot** - nowszy stan (np. dzisiejszy)

### 3. (Opcjonalnie) Filtruj po promieniu

#### Znajdź swoją wioskę:
1. Wpisz nazwę swojej wioski w polu "Szukaj wioski"
2. Naciśnij Enter lub kliknij ikonę lupy
3. Wybierz swoją wioskę z listy wyników
4. Koordynaty zostaną automatycznie wypełnione

#### Ustaw promień:
- Wpisz liczbę pól (np. 50 = 50 pól od twojej wioski)
- Zostanąwiertulkowane tylko wioski w tym obszarze

### 4. Analizuj
Kliknij przycisk **"Analizuj"** 

### 5. Przeglądaj wyniki
Wyniki są podzielone na 5 zakładek:
- **Nieaktywni** - Gracze bez przyrostu populacji (potencjalne cele)
- **Zniknęli gracze** - Gracze którzy całkowicie zniknęli z mapy
- **Zniknęły wioski** - Wioski które przestały istnieć
- **Zmiana właściciela** - Wioski które zmieniły właściciela (przejęcia)
- **Spadek populacji** - Gracze którzy stracili populację

### 6. Zapisz wyniki
1. Kliknij **"Zapisz wyniki"**
2. Podaj nazwę listy (np. "Sąsiedzi 22.04")
3. Kliknij **"Zapisz"**

### 7. Zarządzaj zapisanymi listami
W panelu "Zapisane listy" możesz:
- **Załaduj** - Przywróć zapisane wyniki
- **Sprawdź ponownie** - Porównaj z nowym snapshotem (sprawdź czy się coś zmieniło)
- **Usuń** - Skasuj listę

## 🎯 API Endpoints

### POST /analyze/inactive
Wykonaj analizę bez zapisywania

**Request:**
```json
{
  "old_snapshot": "2026-04-22T21:42:03.471858",
  "new_snapshot": "2026-04-22T22:04:59.096113",
  "center_x": 0,  // opcjonalnie
  "center_y": 0,   // opcjonalnie
  "radius": 50     // opcjonalnie
}
```

**Response:**
```json
{
  "old_snapshot": "...",
  "new_snapshot": "...",
  "center": {"x": 0, "y": 0},
  "radius": 50,
  "inactive_players": [...],
  "disappeared_players": [...],
  "disappeared_villages": [...],
  "owner_changes": [...],
  "population_drops": [...],
  "summary": {
    "inactive_count": 15,
    "disappeared_players_count": 3,
    "disappeared_villages_count": 8,
    "owner_changes_count": 12,
    "population_drops_count": 5
  }
}
```

### POST /inactive-lists
Zapisz analizę jako nazwaną listę

**Request:**
```json
{
  "name": "Moja lista",
  "old_snapshot": "...",
  "new_snapshot": "...",
  "center_x": 0,
  "center_y": 0,
  "radius": 50,
  "data": { /* wyniki z analyze/inactive */ }
}
```

### GET /inactive-lists
Pobierz wszystkie zapisane listy

### GET /inactive-lists/{id}
Pobierz konkretną listę

### POST /inactive-lists/{id}/check?new_snapshot=xxx
Sprawdź zapisaną listę z nowym snapshotem

### DELETE /inactive-lists/{id}
Usuń zapisaną listę

## 💡 Przykłady użycia

### Scenariusz 1: Szukanie farmów w okolicy
1. Znajdź swoją stolicę w wyszukiwaniu
2. Ustaw promień na 20-30 pól
3. Analizuj z ostatnich 2 dni
4. Sprawdź zakładkę "Nieaktywni" - to są potencjalne farmy!

### Scenariusz 2: Monitoring susjadów
1. Zapisz analizę jako "Sąsiedzi - tydzień 1"
2. Po tygodniu użyj "Sprawdź ponownie"
3. Zobacz kto przestał się rozwijać

### Scenariusz 3: Analiza całego serwera
1. NIE ustawiaj promienia (puste pole)
2. Analizuj cały serwer
3. Zobacz największe spadki populacji w zakładce "Spadek populacji"

## 🔧 Struktura techniczna

### Backend
- `backend/inactive_analyzer.py` - logika porównań
- `backend/database.py` - model DBInactiveList
- `backend/main.py` - endpointy API

### Frontend
- `frontend/src/components/InactivePlayers.jsx` - główny komponent UI
- `frontend/src/App.jsx` - routing (`/inactive`)

### Baza danych
Tabela `inactive_lists`:
- id (PK)
- name (nazwa listy)
- created_at (data utworzenia)
- old_snapshot_name, new_snapshot_name
- center_x, center_y, radius (parametry filtra)
- data (JSON z wynikami)

## 📝 Notatki

- Snapshoty są porównywane po `village_id` i koordynatach
- Filtr promienia używa odległości euklidesowej
- Nieaktywny gracz = 0 przyrostu populacji między snapshotami
- Zmiana właściciela = te same koordynaty, inny owner_name

---

**Utworzono:** 2026-04-23  
**Wersja:** 1.0.0  
**Status:** ✅ Działająca (Backend + Frontend + Database)
