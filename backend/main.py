from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any, Optional
import re
import json
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, DBSnapshot, DBVillage, DBInactiveList
from inactive_analyzer import compare_snapshots as analyze_inactive_players

app = FastAPI(title="Travian Map Analyzer")

# CORS dla React
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Pydantic Models
class Village(BaseModel):
    id: int
    x: int
    y: int
    tribe: int
    player_id: int
    village_name: str
    owner_id: int
    owner_name: str
    alliance_id: int
    alliance_tag: str
    population: int
    region: str
    is_capital: bool
    is_city: bool
    is_harbor: bool
    wonder: int

class PlayerStats(BaseModel):
    player_name: str
    total_villages: int
    total_population: int
    avg_population: float
    largest_village: int
    alliance: str
    villages: List[Dict[str, Any]]

class ComparisonResult(BaseModel):
    player_name: str
    old_data: Dict[str, Any]
    new_data: Dict[str, Any]
    growth: Dict[str, Any]

class AnalyzeInactiveRequest(BaseModel):
    old_snapshot: str
    new_snapshot: str
    center_x: Optional[int] = None
    center_y: Optional[int] = None
    radius: Optional[float] = None
    exclude_saved: bool = False

class InactiveListCreate(BaseModel):
    name: str
    old_snapshot: str
    new_snapshot: str
    center_x: Optional[int] = None
    center_y: Optional[int] = None
    radius: Optional[float] = None
    data: Dict[str, Any]

class InactiveListResponse(BaseModel):
    id: int
    name: str
    created_at: Optional[datetime] = None
    old_snapshot_name: str
    new_snapshot_name: str
    center_x: Optional[int]
    center_y: Optional[int]
    radius: Optional[float]
    data: Dict[str, Any]

    class Config:
        from_attributes = True

class InactiveListUpdate(BaseModel):
    data: Dict[str, Any]

# Helper functions
def parse_sql_line(line: str) -> Village | None:
    """Parse pojedynczej linii INSERT INTO"""
    match = re.search(r"VALUES \((.*?)\);", line)
    if not match:
        return None
    
    values = match.group(1)
    # Parse wartości z uwzględnieniem stringów w apostrofach
    parts = []
    current = []
    in_string = False
    
    for char in values:
        if char == "'" and (not current or current[-1] != '\\'):
            in_string = not in_string
        elif char == ',' and not in_string:
            parts.append(''.join(current).strip())
            current = []
            continue
        current.append(char)
    parts.append(''.join(current).strip())
    
    if len(parts) < 16:
        return None
    
    try:
        return Village(
            id=int(parts[0]),
            x=int(parts[1]),
            y=int(parts[2]),
            tribe=int(parts[3]),
            player_id=int(parts[4]),
            village_name=parts[5].strip("'"),
            owner_id=int(parts[6]),
            owner_name=parts[7].strip("'"),
            alliance_id=int(parts[8]),
            alliance_tag=parts[9].strip("'"),
            population=int(parts[10]),
            region=parts[11].strip("'"),
            is_capital=parts[12] == 'TRUE',
            is_city=parts[13] == 'TRUE',
            is_harbor=parts[14] == 'TRUE',
            wonder=int(parts[15])
        )
    except (ValueError, IndexError) as e:
        print(f"Error parsing line: {e}")
        return None

# API Endpoints
@app.post("/upload")
async def upload_snapshot(
    file: UploadFile = File(...), 
    snapshot_name: str | None = None,
    db: Session = Depends(get_db)
):
    """Upload pliku SQL i zapisanie snapshot"""
    if not file.filename.endswith('.sql'):
        raise HTTPException(status_code=400, detail="Tylko pliki .sql są dozwolone")
    
    content = await file.read()
    lines = content.decode('utf-8', errors='ignore').split('\n')
    
    villages = []
    for line in lines:
        if line.strip().startswith('INSERT INTO'):
            village = parse_sql_line(line)
            if village:
                villages.append(village)
    
    snapshot_key = snapshot_name or datetime.now().isoformat()
    
    # Sprawdź czy snapshot już istnieje
    existing = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot_key).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Snapshot '{snapshot_key}' już istnieje")
    
    # Stwórz snapshot w bazie
    db_snapshot = DBSnapshot(
        name=snapshot_key,
        created_at=datetime.now().isoformat(),
        villages_count=len(villages)
    )
    db.add(db_snapshot)
    db.commit()
    db.refresh(db_snapshot)
    
    # Dodaj wioski
    for village in villages:
        db_village = DBVillage(
            snapshot_id=db_snapshot.id,
            village_id=village.id,
            x=village.x,
            y=village.y,
            tribe=village.tribe,
            player_id=village.player_id,
            village_name=village.village_name,
            owner_id=village.owner_id,
            owner_name=village.owner_name,
            alliance_id=village.alliance_id,
            alliance_tag=village.alliance_tag,
            population=village.population,
            region=village.region,
            is_capital=village.is_capital,
            is_city=village.is_city,
            is_harbor=village.is_harbor,
            wonder=village.wonder
        )
        db.add(db_village)
    
    db.commit()
    
    return {
        "snapshot_name": snapshot_key,
        "villages_count": len(villages),
        "message": f"Przetworzono {len(villages)} wiosek"
    }

@app.get("/snapshots")
async def list_snapshots(db: Session = Depends(get_db)):
    """Lista wszystkich snapshot'ów"""
    snapshots = db.query(DBSnapshot).all()
    
    result = []
    for snapshot in snapshots:
        players = db.query(DBVillage.owner_name).filter(
            DBVillage.snapshot_id == snapshot.id
        ).distinct().count()
        
        result.append({
            "name": snapshot.name,
            "created_at": snapshot.created_at,
            "villages_count": snapshot.villages_count,
            "players_count": players
        })
    
    return {"snapshots": result}

@app.get("/map/{snapshot_name}")
async def get_map_data(snapshot_name: str, db: Session = Depends(get_db)):
    """Pobierz dane do wizualizacji mapy"""
    snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot_name).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot nie znaleziony")
    
    villages = db.query(DBVillage).filter(DBVillage.snapshot_id == snapshot.id).all()
    
    return {
        "villages": [
            {
                "x": v.x,
                "y": v.y,
                "name": v.village_name,
                "owner": v.owner_name,
                "alliance": v.alliance_tag,
                "population": v.population,
                "is_capital": v.is_capital
            }
            for v in villages
        ]
    }

@app.get("/player/{snapshot_name}/{player_name}")
async def get_player_stats(
    snapshot_name: str, 
    player_name: str,
    db: Session = Depends(get_db)
) -> PlayerStats:
    """Statystyki konkretnego gracza"""
    snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot_name).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot nie znaleziony")
    
    player_villages = db.query(DBVillage).filter(
        DBVillage.snapshot_id == snapshot.id,
        DBVillage.owner_name == player_name
    ).all()
    
    if not player_villages:
        raise HTTPException(status_code=404, detail="Gracz nie znaleziony")
    
    total_pop = sum(v.population for v in player_villages)
    
    return PlayerStats(
        player_name=player_name,
        total_villages=len(player_villages),
        total_population=total_pop,
        avg_population=total_pop / len(player_villages),
        largest_village=max(v.population for v in player_villages),
        alliance=player_villages[0].alliance_tag,
        villages=[
            {
                "name": v.village_name,
                "x": v.x,
                "y": v.y,
                "population": v.population,
                "is_capital": v.is_capital
            }
            for v in player_villages
        ]
    )

@app.get("/players/{snapshot_name}")
async def get_top_players(
    snapshot_name: str, 
    limit: int = 50,
    db: Session = Depends(get_db)
):
    """Top graczy według populacji"""
    snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot_name).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot nie znaleziony")
    
    villages = db.query(DBVillage).filter(DBVillage.snapshot_id == snapshot.id).all()
    player_stats = {}
    
    for v in villages:
        if v.owner_name not in player_stats:
            player_stats[v.owner_name] = {
                "name": v.owner_name,
                "alliance": v.alliance_tag,
                "villages": 0,
                "population": 0
            }
        player_stats[v.owner_name]["villages"] += 1
        player_stats[v.owner_name]["population"] += v.population
    
    sorted_players = sorted(
        player_stats.values(),
        key=lambda x: x["population"],
        reverse=True
    )[:limit]
    
    return {"players": sorted_players}

@app.post("/compare")
async def compare_snapshots(
    snapshot1: str, 
    snapshot2: str, 
    player_name: str,
    db: Session = Depends(get_db)
) -> ComparisonResult:
    """Porównaj rozwój gracza pomiędzy dwoma snapshot'ami"""
    snap1 = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot1).first()
    snap2 = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot2).first()
    
    if not snap1 or not snap2:
        raise HTTPException(status_code=404, detail="Snapshot nie znaleziony")
    
    old_villages = db.query(DBVillage).filter(
        DBVillage.snapshot_id == snap1.id,
        DBVillage.owner_name == player_name
    ).all()
    
    new_villages = db.query(DBVillage).filter(
        DBVillage.snapshot_id == snap2.id,
        DBVillage.owner_name == player_name
    ).all()
    
    if not old_villages or not new_villages:
        raise HTTPException(status_code=404, detail="Gracz nie znaleziony w snapshot'ach")
    
    old_pop = sum(v.population for v in old_villages)
    new_pop = sum(v.population for v in new_villages)
    
    return ComparisonResult(
        player_name=player_name,
        old_data={
            "villages": len(old_villages),
            "population": old_pop,
            "avg_population": old_pop / len(old_villages)
        },
        new_data={
            "villages": len(new_villages),
            "population": new_pop,
            "avg_population": new_pop / len(new_villages)
        },
        growth={
            "villages": len(new_villages) - len(old_villages),
            "population": new_pop - old_pop,
            "population_percent": ((new_pop - old_pop) / old_pop * 100) if old_pop > 0 else 0
        }
    )

@app.get("/player-history/{player_name}")
async def get_player_history(
    player_name: str,
    db: Session = Depends(get_db)
):
    """Historia gracza we wszystkich snapshotach (posortowane po nazwie)"""
    snapshots = db.query(DBSnapshot).order_by(DBSnapshot.name).all()

    history = []
    for snapshot in snapshots:
        villages = db.query(DBVillage).filter(
            DBVillage.snapshot_id == snapshot.id,
            DBVillage.owner_name == player_name
        ).all()

        if villages:
            total_pop = sum(v.population for v in villages)
            history.append({
                "snapshot": snapshot.name,
                "population": total_pop,
                "villages": len(villages)
            })

    return {"player_name": player_name, "history": history}


@app.get("/alliances/{snapshot_name}")
async def get_alliance_stats(snapshot_name: str, db: Session = Depends(get_db)):
    """Statystyki sojuszy"""
    snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot_name).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail="Snapshot nie znaleziony")
    
    villages = db.query(DBVillage).filter(DBVillage.snapshot_id == snapshot.id).all()
    alliance_stats = {}
    
    for v in villages:
        if not v.alliance_tag:
            continue
        if v.alliance_tag not in alliance_stats:
            alliance_stats[v.alliance_tag] = {
                "tag": v.alliance_tag,
                "members": set(),
                "villages": 0,
                "population": 0
            }
        alliance_stats[v.alliance_tag]["members"].add(v.owner_name)
        alliance_stats[v.alliance_tag]["villages"] += 1
        alliance_stats[v.alliance_tag]["population"] += v.population
    
    result = [
        {
            "tag": stats["tag"],
            "members": len(stats["members"]),
            "villages": stats["villages"],
            "population": stats["population"]
        }
        for stats in alliance_stats.values()
    ]
    
    return {"alliances": sorted(result, key=lambda x: x["population"], reverse=True)}

@app.delete("/snapshot/{snapshot_name}")
async def delete_snapshot(snapshot_name: str, db: Session = Depends(get_db)):
    """Usuń konkretny snapshot z bazy danych"""
    snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot_name).first()
    
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot '{snapshot_name}' nie istnieje")
    
    db.delete(snapshot)
    db.commit()
    
    return {
        "message": f"Snapshot '{snapshot_name}' został usunięty",
        "deleted_snapshot": snapshot_name
    }

@app.delete("/snapshots/all")
async def delete_all_snapshots(db: Session = Depends(get_db)):
    """Usuń wszystkie snapshoty z bazy danych"""
    count = db.query(DBSnapshot).count()
    
    if count == 0:
        return {"message": "Brak snapshotów do usunięcia", "deleted_count": 0}
    
    db.query(DBSnapshot).delete()
    db.commit()
    
    return {
        "message": f"Usunięto wszystkie snapshoty ({count})",
        "deleted_count": count
    }

@app.post("/analyze/inactive")
async def analyze_inactive(request: AnalyzeInactiveRequest, db: Session = Depends(get_db)):
    """Analizuj nieaktywnych graczy między dwoma snapshotami (bez zapisywania)"""
    # Sprawdź czy snapshoty istnieją
    old_snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == request.old_snapshot).first()
    new_snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == request.new_snapshot).first()
    
    if not old_snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot '{request.old_snapshot}' nie istnieje")
    if not new_snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot '{request.new_snapshot}' nie istnieje")
    
    # Zbierz nazwy graczy już zapisanych na listach (jeśli exclude_saved=True)
    excluded_players = None
    if request.exclude_saved:
        all_lists = db.query(DBInactiveList).all()
        excluded_players = set()
        for lst in all_lists:
            lst_data = json.loads(lst.data) if lst.data else {}
            for category in ("inactive_players", "disappeared_players", "population_drops"):
                for entry in lst_data.get(category, []):
                    if "player_name" in entry:
                        excluded_players.add(entry["player_name"])

    # Wykonaj analizę
    result = analyze_inactive_players(
        db,
        request.old_snapshot,
        request.new_snapshot,
        request.center_x,
        request.center_y,
        request.radius,
        excluded_players
    )
    
    return result

@app.post("/inactive-lists", response_model=InactiveListResponse)
async def create_inactive_list(request: InactiveListCreate, db: Session = Depends(get_db)):
    """Zapisz wyniki analizy jako nazwaną listę"""
    # Sprawdź czy nazwa nie jest zajęta
    existing = db.query(DBInactiveList).filter(DBInactiveList.name == request.name).first()
    if existing:
        raise HTTPException(status_code=400, detail=f"Lista o nazwie '{request.name}' już istnieje")
    
    # Zapisz listę
    new_list = DBInactiveList(
        name=request.name,
        created_at=datetime.now().isoformat(),
        old_snapshot_name=request.old_snapshot,
        new_snapshot_name=request.new_snapshot,
        center_x=request.center_x,
        center_y=request.center_y,
        radius=request.radius,
        data=json.dumps(request.data)
    )
    
    db.add(new_list)
    db.commit()
    db.refresh(new_list)
    
    # Konwertuj data z JSON string na dict
    response_data = {k: v for k, v in new_list.__dict__.items() if not k.startswith('_')}
    response_data['data'] = json.loads(new_list.data) if new_list.data else {}
    
    return InactiveListResponse(**response_data)

@app.get("/inactive-lists", response_model=List[InactiveListResponse])
async def get_inactive_lists(db: Session = Depends(get_db)):
    """Pobierz wszystkie zapisane listy nieaktywnych graczy"""
    lists = db.query(DBInactiveList).order_by(DBInactiveList.created_at.desc()).all()
    
    result = []
    for lst in lists:
        response_data = {k: v for k, v in lst.__dict__.items() if not k.startswith('_')}
        response_data['data'] = json.loads(lst.data) if lst.data else {}
        result.append(InactiveListResponse(**response_data))
    
    return result

@app.get("/inactive-lists/{list_id}", response_model=InactiveListResponse)
async def get_inactive_list(list_id: int, db: Session = Depends(get_db)):
    """Pobierz konkretną listę nieaktywnych graczy"""
    lst = db.query(DBInactiveList).filter(DBInactiveList.id == list_id).first()
    
    if not lst:
        raise HTTPException(status_code=404, detail=f"Lista o ID {list_id} nie istnieje")
    
    response_data = {k: v for k, v in lst.__dict__.items() if not k.startswith('_')}
    response_data['data'] = json.loads(lst.data) if lst.data else {}
    
    return InactiveListResponse(**response_data)

@app.patch("/inactive-lists/{list_id}", response_model=InactiveListResponse)
async def update_inactive_list_data(list_id: int, request: InactiveListUpdate, db: Session = Depends(get_db)):
    """Zaktualizuj dane zapisanej listy nieaktywnych graczy"""
    lst = db.query(DBInactiveList).filter(DBInactiveList.id == list_id).first()

    if not lst:
        raise HTTPException(status_code=404, detail=f"Lista o ID {list_id} nie istnieje")

    lst.data = json.dumps(request.data)
    db.commit()
    db.refresh(lst)

    response_data = {k: v for k, v in lst.__dict__.items() if not k.startswith('_')}
    response_data['data'] = json.loads(lst.data)

    return InactiveListResponse(**response_data)

@app.post("/inactive-lists/{list_id}/check")
async def recheck_inactive_list(list_id: int, new_snapshot: str, db: Session = Depends(get_db)):
    """Sprawdź ponownie zapisaną listę z nowym snapshotem"""
    # Pobierz listę
    lst = db.query(DBInactiveList).filter(DBInactiveList.id == list_id).first()
    if not lst:
        raise HTTPException(status_code=404, detail=f"Lista o ID {list_id} nie istnieje")
    
    # Sprawdź czy nowy snapshot istnieje
    snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == new_snapshot).first()
    if not snapshot:
        raise HTTPException(status_code=404, detail=f"Snapshot '{new_snapshot}' nie istnieje")
    
    # Wykonaj analizę z tymi samymi parametrami ale nowym snapshotem
    result = analyze_inactive_players(
        db,
        lst.new_snapshot_name,  # Poprzedni "nowy" staje się "starym"
        new_snapshot,
        lst.center_x,
        lst.center_y,
        lst.radius
    )
    
    return {
        "list_name": lst.name,
        "old_snapshot": lst.new_snapshot_name,
        "new_snapshot": new_snapshot,
        "analysis": result
    }

@app.delete("/inactive-lists/{list_id}")
async def delete_inactive_list(list_id: int, db: Session = Depends(get_db)):
    """Usuń zapisaną listę nieaktywnych graczy"""
    lst = db.query(DBInactiveList).filter(DBInactiveList.id == list_id).first()
    
    if not lst:
        raise HTTPException(status_code=404, detail=f"Lista o ID {list_id} nie istnieje")
    
    list_name = lst.name
    db.delete(lst)
    db.commit()
    
    return {
        "message": f"Lista '{list_name}' została usunięta",
        "deleted_id": list_id
    }

@app.get("/")
async def root():
    return {
        "message": "Travian Map Analyzer API",
        "version": "2.0.0 - SQLite Edition",
        "database": "SQLite with persistent storage",
        "endpoints": [
            "POST /upload - Upload SQL file",
            "GET /snapshots - List all snapshots",
            "GET /map/{snapshot_name} - Get map data",
            "GET /player/{snapshot_name}/{player_name} - Player stats",
            "GET /players/{snapshot_name} - Top players",
            "POST /compare - Compare snapshots",
            "GET /alliances/{snapshot_name} - Alliance stats",
            "DELETE /snapshot/{snapshot_name} - Delete specific snapshot",
            "DELETE /snapshots/all - Delete all snapshots",
            "POST /analyze/inactive - Analyze inactive players",
            "POST /inactive-lists - Save inactive list",
            "GET /inactive-lists - Get all inactive lists",
            "GET /inactive-lists/{id} - Get specific inactive list",
            "POST /inactive-lists/{id}/check - Recheck list with new snapshot",
            "DELETE /inactive-lists/{id} - Delete inactive list"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
