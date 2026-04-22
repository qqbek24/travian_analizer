from fastapi import FastAPI, UploadFile, File, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from typing import List, Dict, Any
import re
from datetime import datetime
from pydantic import BaseModel
from sqlalchemy.orm import Session
from database import get_db, DBSnapshot, DBVillage

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
            "GET /alliances/{snapshot_name} - Alliance stats"
        ]
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
