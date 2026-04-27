"""
Moduł do analizy nieaktywnych graczy poprzez porównanie snapshotów
"""
from typing import List, Dict, Optional, Tuple
from sqlalchemy.orm import Session
from database import DBSnapshot, DBVillage
import math

def calculate_distance(x1: int, y1: int, x2: int, y2: int) -> float:
    """Oblicza odległość euklidesową między dwoma punktami"""
    return math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)

def get_villages_in_radius(
    db: Session,
    snapshot_name: str,
    center_x: int,
    center_y: int,
    radius: float
) -> List[DBVillage]:
    """Pobiera wioski w promieniu od punktu centralnego"""
    snapshot = db.query(DBSnapshot).filter(DBSnapshot.name == snapshot_name).first()
    if not snapshot:
        return []
    
    villages = db.query(DBVillage).filter(DBVillage.snapshot_id == snapshot.id).all()
    
    return [
        v for v in villages
        if calculate_distance(center_x, center_y, v.x, v.y) <= radius
    ]

def compare_snapshots(
    db: Session,
    old_snapshot: str,
    new_snapshot: str,
    center_x: Optional[int] = None,
    center_y: Optional[int] = None,
    radius: Optional[float] = None,
    excluded_players: Optional[set] = None
) -> Dict:
    """
    Porównuje dwa snapshoty i znajdzie nieaktywnych graczy
    
    Returns:
        {
            "inactive_players": [...],  # Gracze bez przyrostu populacji
            "disappeared_players": [...],  # Gracze którzy zniknęli
            "disappeared_villages": [...],  # Wioski które zniknęły
            "owner_changes": [...],  # Wioski które zmieniły właściciela
            "population_drops": [...]  # Spadki populacji
        }
    """
    old_snap = db.query(DBSnapshot).filter(DBSnapshot.name == old_snapshot).first()
    new_snap = db.query(DBSnapshot).filter(DBSnapshot.name == new_snapshot).first()
    
    if not old_snap or not new_snap:
        return {}
    
    # Pobierz wioski ze starszego snapshotu w promieniu - do określenia KTÓRYCH graczy analizować
    if center_x is not None and center_y is not None and radius is not None:
        old_villages_in_radius = get_villages_in_radius(db, old_snapshot, center_x, center_y, radius)
    else:
        old_villages_in_radius = db.query(DBVillage).filter(DBVillage.snapshot_id == old_snap.id).all()

    # Pobierz WSZYSTKIE wioski ze starszego snapshotu - do porównania populacji całego gracza
    old_villages_all = db.query(DBVillage).filter(DBVillage.snapshot_id == old_snap.id).all()

    # Zachowaj stare wioski (dla owner_changes / disappeared_villages) - tylko te z promienia
    old_villages = old_villages_in_radius

    # Pobierz wszystkie wioski z nowszego snapshotu
    new_villages_all = db.query(DBVillage).filter(DBVillage.snapshot_id == new_snap.id).all()
    
    # Mapy dla szybkiego dostępu
    new_by_coords = {(v.x, v.y): v for v in new_villages_all}
    new_by_village_id = {v.village_id: v for v in new_villages_all}
    
    # Gracze którzy mają przynajmniej jedną wioskę w promieniu (lub wszyscy jeśli brak promienia)
    players_in_radius = set(v.owner_name for v in old_villages_in_radius)

    # Grupuj WSZYSTKIE stare wioski po graczu (do analizy całkowitej populacji)
    old_by_player_all = {}
    for v in old_villages_all:
        if v.owner_name not in old_by_player_all:
            old_by_player_all[v.owner_name] = []
        old_by_player_all[v.owner_name].append(v)

    # old_by_player = tylko gracze z promienia, ale ich wszystkie wioski
    old_by_player = {name: vils for name, vils in old_by_player_all.items() if name in players_in_radius}

    # Wioski w promieniu per gracz (do obliczenia odległości najbliższej osady)
    old_in_radius_by_player = {}
    for v in old_villages_in_radius:
        if v.owner_name not in old_in_radius_by_player:
            old_in_radius_by_player[v.owner_name] = []
        old_in_radius_by_player[v.owner_name].append(v)

    # Grupuj nowe wioski po graczu
    new_by_player = {}
    for v in new_villages_all:
        if v.owner_name not in new_by_player:
            new_by_player[v.owner_name] = []
        new_by_player[v.owner_name].append(v)
    
    # Wyniki
    inactive_players = []
    disappeared_players = []
    disappeared_villages = []
    owner_changes = []
    population_drops = []
    
    def villages_sorted_by_distance(villages):
        """Sortuje wioski po odległości od centrum (nearest first), lub zostawia bez zmian"""
        if center_x is None or center_y is None:
            return villages
        return sorted(villages, key=lambda v: calculate_distance(center_x, center_y, v.x, v.y))

    def village_to_dict(v):
        return {"name": v.village_name, "x": v.x, "y": v.y, "population": v.population}

    # Analiza dla każdego gracza (old_by_player zawiera WSZYSTKIE wioski gracza, ale tylko graczy z promienia)
    for player_name, all_old_player_villages in old_by_player.items():
        # Całkowita populacja gracza ze WSZYSTKICH jego osad (poprawne porównanie)
        old_total_pop = sum(v.population for v in all_old_player_villages)

        # Odległość: bierzemy najbliższą osadę spośród tych WEWNĄTRZ promienia
        min_distance = None
        if center_x is not None and center_y is not None:
            radius_villages = old_in_radius_by_player.get(player_name, all_old_player_villages)
            distances = [calculate_distance(center_x, center_y, v.x, v.y) for v in radius_villages]
            min_distance = min(distances) if distances else None

        # Wioski posortowane: najpierw najbliższe centrum
        sorted_villages = villages_sorted_by_distance(all_old_player_villages)

        if player_name not in new_by_player:
            # Sprawdź, które wioski gracza naprawdę zniknęły z mapy (koordynaty nieobecne w nowym snapshoci)
            # Jeśli wioski zmieniły tylko właściciela, są już pokryte przez owner_changes
            truly_disappeared = [v for v in all_old_player_villages if (v.x, v.y) not in new_by_coords]

            if truly_disappeared:
                sorted_truly_disappeared = villages_sorted_by_distance(truly_disappeared)
                player_data = {
                    "player_name": player_name,
                    "alliance": all_old_player_villages[0].alliance_tag if all_old_player_villages else None,
                    "old_villages_count": len(truly_disappeared),
                    "old_total_population": sum(v.population for v in truly_disappeared),
                    "villages": [village_to_dict(v) for v in sorted_truly_disappeared]
                }
                if min_distance is not None:
                    player_data["distance"] = round(min_distance, 1)
                disappeared_players.append(player_data)
            # Jeśli wszystkie wioski gracza zmieniły właściciela → pokryte przez owner_changes, pomijamy
        else:
            new_player_villages = new_by_player[player_name]
            new_total_pop = sum(v.population for v in new_player_villages)
            
            # Porównanie całkowitej populacji gracza (wszystkie osady, nie tylko w promieniu)
            pop_change = new_total_pop - old_total_pop
            
            if pop_change == 0:
                # Brak przyrostu na żadnej osadzie - nieaktywny
                inactive_data = {
                    "player_name": player_name,
                    "alliance": all_old_player_villages[0].alliance_tag if all_old_player_villages else None,
                    "villages_count": len(all_old_player_villages),
                    "old_population": old_total_pop,
                    "new_population": new_total_pop,
                    "total_population": old_total_pop,
                    "pop_change": 0,
                    "villages": [village_to_dict(v) for v in sorted_villages]
                }
                if min_distance is not None:
                    inactive_data["distance"] = round(min_distance, 1)
                inactive_players.append(inactive_data)
            elif pop_change < 0:
                # Spadek populacji
                new_distances = None
                if center_x is not None and center_y is not None:
                    new_distances = [calculate_distance(center_x, center_y, v.x, v.y) for v in new_player_villages]
                    new_min_distance = min(new_distances) if new_distances else None
                
                drop_data = {
                    "player_name": player_name,
                    "alliance": all_old_player_villages[0].alliance_tag if all_old_player_villages else None,
                    "old_population": old_total_pop,
                    "new_population": new_total_pop,
                    "pop_change": pop_change,
                    "villages_count": len(new_player_villages)
                }
                if center_x is not None and center_y is not None and new_distances:
                    drop_data["distance"] = round(new_min_distance, 1)
                population_drops.append(drop_data)
    
    # Sprawdź zmiany właściciela i zniknięte wioski
    for old_village in old_villages:
        coords = (old_village.x, old_village.y)
        
        # Sprawdź po koordynatach
        if coords in new_by_coords:
            new_village = new_by_coords[coords]
            
            # Zmiana właściciela
            if new_village.owner_name != old_village.owner_name:
                change_data = {
                    "village_name": old_village.village_name,
                    "x": old_village.x,
                    "y": old_village.y,
                    "old_owner": old_village.owner_name,
                    "new_owner": new_village.owner_name,
                    "old_alliance": old_village.alliance_tag,
                    "new_alliance": new_village.alliance_tag,
                    "old_population": old_village.population,
                    "new_population": new_village.population,
                    "pop_change": new_village.population - old_village.population
                }
                if center_x is not None and center_y is not None:
                    change_data["distance"] = round(calculate_distance(center_x, center_y, old_village.x, old_village.y), 1)
                owner_changes.append(change_data)
        else:
            # Wioska zniknęła (sprawdź po village_id czy faktycznie)
            if old_village.village_id not in new_by_village_id:
                village_data = {
                    "village_name": old_village.village_name,
                    "x": old_village.x,
                    "y": old_village.y,
                    "owner": old_village.owner_name,
                    "alliance": old_village.alliance_tag,
                    "population": old_village.population
                }
                if center_x is not None and center_y is not None:
                    village_data["distance"] = round(calculate_distance(center_x, center_y, old_village.x, old_village.y), 1)
                disappeared_villages.append(village_data)
    
    # Pomiń graczy już zapisanych na listach (opcjonalne)
    if excluded_players:
        inactive_players = [p for p in inactive_players if p["player_name"] not in excluded_players]
        disappeared_players = [p for p in disappeared_players if p["player_name"] not in excluded_players]
        population_drops = [p for p in population_drops if p["player_name"] not in excluded_players]

    # Wyznacz first_seen dla każdego gracza z list nieaktywnych i znikniętych
    all_target_players = set(
        p["player_name"] for p in inactive_players + disappeared_players
    )
    first_seen_map = {}
    if all_target_players:
        rows = (
            db.query(DBVillage.owner_name, DBSnapshot.name)
            .join(DBSnapshot, DBVillage.snapshot_id == DBSnapshot.id)
            .filter(DBVillage.owner_name.in_(all_target_players))
            .order_by(DBVillage.owner_name, DBSnapshot.name)
            .all()
        )
        for owner_name, snap_name in rows:
            if owner_name not in first_seen_map:
                first_seen_map[owner_name] = snap_name

    for p in inactive_players + disappeared_players:
        p["first_seen"] = first_seen_map.get(p["player_name"])

    return {
        "old_snapshot": old_snapshot,
        "new_snapshot": new_snapshot,
        "center": {"x": center_x, "y": center_y} if center_x is not None else None,
        "radius": radius,
        "inactive_players": inactive_players,
        "disappeared_players": disappeared_players,
        "disappeared_villages": disappeared_villages,
        "owner_changes": owner_changes,
        "population_drops": population_drops,
        "summary": {
            "inactive_count": len(inactive_players),
            "disappeared_players_count": len(disappeared_players),
            "disappeared_villages_count": len(disappeared_villages),
            "owner_changes_count": len(owner_changes),
            "population_drops_count": len(population_drops)
        }
    }
