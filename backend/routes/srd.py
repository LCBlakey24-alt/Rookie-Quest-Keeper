"""SRD data routes: spells, classes, races and feats under SRD 5.1 (CC BY 4.0)."""
from fastapi import APIRouter, HTTPException
from utils.helpers import load_srd_file
from typing import Optional

router = APIRouter()

@router.get("/srd/spells")
async def get_srd_spells(
    level: Optional[int] = None,
    school: Optional[str] = None,
    class_name: Optional[str] = None,
    search: Optional[str] = None
):
    """Get SRD spells with optional filtering"""
    data = load_srd_file('spells.json')
    if not data:
        return {"spells": [], "source": "SRD 5.1"}
    
    spells = data.get('spells', [])
    
    # Apply filters
    if level is not None:
        spells = [s for s in spells if s.get('level') == level]
    
    if school:
        spells = [s for s in spells if s.get('school', '').lower() == school.lower()]
    
    if class_name:
        class_lower = class_name.lower()
        spells = [s for s in spells if class_lower in [c.lower() for c in s.get('classes', [])]]
    
    if search:
        search_lower = search.lower()
        spells = [s for s in spells if search_lower in s.get('name', '').lower() or search_lower in s.get('description', '').lower()]
    
    return {
        "spells": spells,
        "count": len(spells),
        "source": "SRD 5.1 (CC BY 4.0)"
    }

@router.get("/srd/spells/{spell_name}")
async def get_srd_spell(spell_name: str):
    """Get a specific spell by name"""
    data = load_srd_file('spells.json')
    if not data:
        raise HTTPException(status_code=404, detail="Spell not found")
    
    spell_lower = spell_name.lower().replace('-', ' ').replace('_', ' ')
    for spell in data.get('spells', []):
        if spell.get('name', '').lower() == spell_lower:
            return spell
    
    raise HTTPException(status_code=404, detail="Spell not found")

@router.get("/srd/classes")
async def get_srd_classes():
    """Get all SRD classes with features"""
    data = load_srd_file('classes.json')
    if not data:
        return {"classes": [], "source": "SRD 5.1"}
    
    return {
        "classes": data.get('classes', []),
        "source": "SRD 5.1 (CC BY 4.0)"
    }

@router.get("/srd/classes/{class_name}")
async def get_srd_class(class_name: str):
    """Get a specific class by name"""
    data = load_srd_file('classes.json')
    if not data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    class_lower = class_name.lower()
    for cls in data.get('classes', []):
        if cls.get('name', '').lower() == class_lower:
            return cls
    
    raise HTTPException(status_code=404, detail="Class not found")

@router.get("/srd/races")
async def get_srd_races():
    """Get all SRD races"""
    data = load_srd_file('classes.json')  # Races are in the same file
    if not data:
        return {"races": [], "source": "SRD 5.1"}
    
    return {
        "races": data.get('races', []),
        "source": "SRD 5.1 (CC BY 4.0)"
    }

@router.get("/srd/feats")
async def get_srd_feats():
    """Get all SRD feats"""
    data = load_srd_file('classes.json')  # Feats are in the same file
    if not data:
        return {"feats": [], "source": "SRD 5.1"}
    
    return {
        "feats": data.get('feats', []),
        "source": "SRD 5.1 (CC BY 4.0)"
    }

@router.get("/srd/class-features/{class_name}/{level}")
async def get_class_features_at_level(class_name: str, level: int):
    """Get class features available at a specific level"""
    data = load_srd_file('classes.json')
    if not data:
        raise HTTPException(status_code=404, detail="Class not found")
    
    class_lower = class_name.lower()
    for cls in data.get('classes', []):
        if cls.get('name', '').lower() == class_lower:
            features = [f for f in cls.get('features', []) if f.get('level', 1) <= level]
            return {
                "class": cls.get('name'),
                "level": level,
                "features": features
            }
    
    raise HTTPException(status_code=404, detail="Class not found")


# ==================== MODULAR PROGRESSION SYSTEM ENDPOINTS ====================
