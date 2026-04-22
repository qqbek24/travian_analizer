# 💾 Zarządzanie Danymi - Travian Analyzer  

## 📦 Jak są przechowywane snapshoty?

Aplikacja używa **bazy danych SQLite** do trwałego przechowywania wszystkich wgranych snapshotów.

### 🗄️ Lokalizacja Bazy Danych  

Baza danych znajduje się w:
```
Docker Volume: travian_analizer_travian-data
Ścieżka w kontenerze: /app/data/travian.db
```

### ✅ Trwałość Danych

- 💾 **Dane są zachowywane** nawet po restarcie aplikacji
- 🔄 **Dane przetrwają** restart kontenera Docker
- 📁 **Volume jest persystentny** - dane nie znikną

### 🔍 Struktura Bazy

#### Tabela: `snapshots`
- `id` - Unikalny identyfikator
- `name` - Nazwa snapshota (np. "22-04-2026")  
- `created_at` - Data utworzenia
- `villages_count` - Liczba wiosek

#### Tabela: `villages`
- Wszystkie informacje o wioskach
- Powiązane ze snapshotem przez `snapshot_id`
- Indeksowane po `owner_name` dla szybkiego wyszukiwania

---

## 🎯 Przykładowy Workflow

### Krok 1: Wgraj pierwszy snapshot
```
1. Otwórz: http://localhost:3000
2. Upload: map.sql  
3. Nazwa: "Poniedziałek 21-04"
4. Kliknij Upload
```

### Krok 2: Poczekaj tydzień, wgraj drugi
```
1. Upload: map.sql (nowy plik)
2. Nazwa: "Poniedziałek 28-04"  
3. Kliknij Upload
```

### Krok 3: Porównaj rozwój
```
1. Przejdź do zakładki "Porównanie"
2. Wybierz snapshot 1: "Poniedziałek 21-04"
3. Wybierz snapshot 2: "Poniedziałek 28-04"
4. Wpisz nick gracza
5. Zobacz wzrost populacji, nowe wioski itd.
```

---

## 📊 Śledzenie Rozwoju  

### Co możesz śledzić w czasie?

- **Populacja gracza** - jak rośnie tydzień do tygodnia
- **Liczba wiosek** - ile nowych wiosek zdobył
- **Ekspansja terytorialna** - gdzie się rozwija
- **Ranking** - pozycja w rankingu
- **Sojusze** - zmiany w sojuszach

### Strategiczne Pytania:

- Kto najszybciej rośnie?
- Którzy gracze są nieaktywni? (0 wzrostu)
- Czy sojusz ABC się rozrasta?
- Jakie są najbardziej zagęszczone regiony?

---

## 🗑️ Usuwanie Snapshotów  

### Przez API (curl/Postman):
```powershell
curl -X DELETE http://localhost:8000/snapshot/{snapshot_name}
```

### Ręczne czyszczenie całej bazy:
```powershell
# Zatrzymaj backend
docker-compose stop backend

# Usuń volume z danymi
docker volume rm travian_analizer_travian-data

# Uruchom ponownie (utworzy nową, pustą bazę)
docker-compose up -d backend
```

---

## 📥 Export/Backup Bazy Danych

### Backup bazy:
```powershell
# Skopiuj bazę z kontenera na dysk
docker cp travian-backend:/app/data/travian.db ./backup_travian.db
```

### Restore bazy:
```powershell
# Skopiuj bazę z dysku do kontenera
docker cp ./backup_travian.db travian-backend:/app/data/travian.db

# Restart backendu
docker restart travian-backend
```

---

## 🔬 Inspekcja Bazy Danych

### Wejdź do kontenera:
```powershell
docker exec -it travian-backend /bin/bash
```

### SQLite CLI:
```bash
# W kontenerze:
apt-get update && apt-get install -y sqlite3
sqlite3 /app/data/travian.db

# Przykładowe zapytania:
.tables                                    # Pokaż tabele
SELECT * FROM snapshots;                   # Wszystkie snapshoty
SELECT COUNT(*) FROM villages;             # Liczba wiosek
SELECT name, villages_count FROM snapshots;  # Podsumowanie
```

---  

##QUICKSTART/README.md) - Instrukcje uruchamiania

### Frontend:
- Znajduje się lokalnie w `frontend/src/`
- Hot-reload włączony (Vite HMR)  
- Edytuj kod, zmiany są natychmiastowe

### Backend:
- Znajduje się lokalnie w `backend/main.py` i `backend/database.py`
- Hot-reload włączony (Uvicorn --reload)
- Edytuj kod, backend automatycznie się restartuje

### Baza Danych:
- **Backup regularnie!** (docker cp)
- Volume jest trwały, ale bezpieczeństwo przede wszystkim

---

## 📞 Problemy?

### "Snapshot już istnieje"
- Każda nazwa musi być unikalna
- Użyj innej nazwy lub usuń stary snapshot

### "Dane zniknęły po restarcie"
- Sprawdź czy volume istnieje: `docker volume ls | findstr travian`
- Sprawdź logi: `docker logs travian-backend`

### "Baza jest wolna"
- SQLite jest wystarczająco szybkie dla tysięcy wiosek
- Jeśli masz >100k wiosek, rozważ PostgreSQL

---

## 🚀 Upgrade do PostgreSQL (Przyszłość)

Jeśli aplikacja urośnie, można łatwo przełączyć się na PostgreSQL:

```yaml
# docker-compose.yml
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: travian
      POSTGRES_USER: admin
      POSTGRES_PASSWORD: secret
    volumes:
      - postgres-data:/var/lib/postgresql/data
```

Trzeba będzie tylko zmienić `DATABASE_URL` w `backend/database.py`.

---

**Teraz Twoje dane są bezpieczne i trwałe! 🎉**
