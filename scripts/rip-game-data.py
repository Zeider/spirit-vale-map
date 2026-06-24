#!/usr/bin/env python3
"""Rip current game data straight from the Spirit Vale Demo Unity assets.

The vendored base44/spiritvalemarket data lags the live game (wrong drop/craft
zones, empty skill effects). The game stores its data as ScriptableObjects in
`sharedassets0.assets`; this extracts it so we can vendor *current* data.

Manual step (NOT part of `npm run data`): needs the Steam install + UnityPy.
    pip install UnityPy
    python scripts/rip-game-data.py
Writes JSON into data/raw-game/ ; the JS pipeline reads those vendored files.

IL2CPP strips MonoBehaviour typetrees, so we parse the raw serialized bytes:
strings are length-prefixed + 4-byte aligned; many magnitudes are encoded
right in the key (e.g. `MatkWeapon_3_Book` = Magic Atk +3 with a Book).
"""
import UnityPy, struct, json, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ASSET = Path(r"C:\Program Files (x86)\Steam\steamapps\common\SpiritVale Demo\SpiritVale_Data\sharedassets0.assets")
OUT = ROOT / "data" / "raw-game"

def raw_of(obj):
    f = getattr(obj, "get_raw_data", None)
    try: return f() if f else b""
    except Exception: return b""

def strings_of(raw, limit=64):
    """All length-prefixed printable-ASCII strings in an object's raw bytes, in order."""
    out, i, n = [], 0, len(raw)
    while i < n - 4 and len(out) < limit:
        ln = struct.unpack_from("<i", raw, i)[0]
        if 1 <= ln <= 220 and i + 4 + ln <= n:
            s = raw[i+4:i+4+ln]
            if all(32 <= b < 127 for b in s):
                out.append(s.decode()); i += 4 + ln; i = (i + 3) & ~3; continue
        i += 1
    return out

_norm = lambda s: re.sub(r"[^a-z0-9]", "", s.lower())

# Effect/stat token: `Stat_<number>` optionally `_<Filter>` — e.g. SummonAtkMult_1, MatkWeapon_3_Book.
EFFECT = re.compile(r"^([A-Za-z]+)_(-?\d+(?:\.\d+)?)(?:_([A-Za-z]+))?$")
def parse_effect(s):
    m = EFFECT.match(s)
    if not m: return None
    v = float(m.group(2)); v = int(v) if v == int(v) else v
    return {"stat": m.group(1), "value": v, **({"filter": m.group(3)} if m.group(3) else {})}

def load_env():
    if not ASSET.exists():
        sys.exit(f"asset not found: {ASSET}\nIs the Spirit Vale Demo installed?")
    print(f"loading {ASSET.name} ...")
    return UnityPy.load(str(ASSET))

def match_objects(env, norm_to_id, want_idx=6):
    """Map each known id -> the game object whose OWN name appears earliest
    (the real object; artifacts that merely reference a name have it deep)."""
    best = {}
    for obj in env.objects:
        if obj.type.name != "MonoBehaviour": continue
        strs = strings_of(raw_of(obj))
        if not strs: continue
        cand = [(i, norm_to_id[_norm(s)]) for i, s in enumerate(strs) if _norm(s) in norm_to_id]
        if not cand: continue
        idx, key = min(cand)
        if idx >= want_idx: continue
        if key not in best or idx < best[key][0]:
            best[key] = (idx, strs)
    return {k: v[1] for k, v in best.items()}

# `Skills` tokens are internal skill-id references on active skills, not stat bonuses.
NOISE_STATS = {"Skills"}

def rip_skills(env):
    known = json.load(open(ROOT / "src" / "data" / "classes.json", encoding="utf-8"))["skills"]
    norm_to_id = {_norm(s["name"]): sid for sid, s in known.items()}
    matched = match_objects(env, norm_to_id)
    out = {}
    for sid, strs in matched.items():
        effects = [e for s in strs if (e := parse_effect(s)) and e["stat"] not in NOISE_STATS]
        desc = max((s for s in strs if " " in s and not EFFECT.match(s)), key=len, default="")
        out[sid] = {"description": desc, "effects": effects}
    OUT.mkdir(parents=True, exist_ok=True)
    json.dump(out, open(OUT / "skills.json", "w", encoding="utf-8"), indent=1, ensure_ascii=False)
    n_eff = sum(1 for v in out.values() if v["effects"])
    print(f"skills.json: {len(out)}/{len(known)} matched, {n_eff} with effects")

if __name__ == "__main__":
    env = load_env()
    rip_skills(env)
    print("done.")
