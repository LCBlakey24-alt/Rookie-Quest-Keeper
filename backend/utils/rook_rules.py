"""Deterministic rules knowledge for Rook generation and review.

The goal is not to replace a full rules compendium. These fragments give Rook
stable design guardrails that are safe to reuse across chat, draft generation,
homebrew review, and future encounter builders.
"""

from __future__ import annotations

from typing import Any, Dict, List

ROOK_MONSTER_DESIGN_RULES = """
ROOK CREATURE / MONSTER DESIGN RULES:
- Treat Challenge Rating (CR) as a rough encounter-design estimate, never a guarantee of difficulty. Party size, terrain, resources, surprise, objectives, and action economy can move difficulty dramatically.
- Review offensive pressure and defensive durability separately before deciding whether a CR feels plausible.
- Offensive pressure includes expected damage per round, attack bonus or save DC, number of attacks/targets, range, rider effects, control, and how reliably the creature can deliver its damage.
- Defensive durability includes hit points, Armor Class, resistances/immunities, regeneration, avoidance, mobility, escape tools, and effects that deny attacks.
- Action economy matters. One solo creature taking one meaningful action can underperform against a full party even when its raw numbers look high. Boss-style creatures need enough meaningful decisions, reactions, movement, minions, phases, or other ways to stay relevant without simply inflating damage.
- Avoid large one-hit damage spikes against low-level parties unless the GM explicitly asks for a lethal or horror-style threat. Prefer readable pressure spread across attacks or turns.
- Every attack should clearly state: attack name, attack bonus or saving throw, reach/range where relevant, target count, damage dice, damage modifier, and damage type.
- Multiattack should explicitly say how many attacks are made and which attacks can be used.
- Saving-throw features should clearly state the ability, DC, effect on a failure, and what happens on a success.
- Recharge, limited-use, reaction, aura, ongoing-damage, summon, and transformation mechanics must state their trigger and limit clearly.
- A creature should normally have one clear combat identity. Add extra mechanics only when they reinforce that identity or create a useful tactical choice.
- Prefer a small number of memorable abilities over a long list of marginal ones.
- If a generated creature uses a CR, label that CR as Rook's estimate until the GM has reviewed it in the actual encounter context.
- Respect the campaign's selected rules edition and uploaded/custom rules when provided. Do not silently mix 2014 and 2024 terminology or mechanics.
""".strip()

ROOK_ENCOUNTER_DESIGN_RULES = """
ROOK ENCOUNTER DESIGN RULES:
- Start with the encounter's purpose: defeat, survive, escape, protect, interrupt, negotiate, retrieve, race, or hold a position.
- Use CR only as one input. Also review number of enemy turns, party size, party level, current resources, terrain, surprise, reinforcements, hazards, and alternate objectives.
- Give enemies a simple tactical intention: hold ground, isolate a target, protect a leader, retreat, delay, flank, harass at range, or force movement.
- Avoid requiring the GM to run too many unique stat blocks at once. Reuse roles and group similar enemies when possible.
- Boss encounters should have a reason the party cannot solve the fight by simply surrounding one target and repeating basic attacks.
- Always surface unusual victory conditions and encounter-changing mechanics before combat starts so the GM can actually run them.
""".strip()


def monster_design_fragment() -> str:
    return f"{ROOK_MONSTER_DESIGN_RULES}\n\n{ROOK_ENCOUNTER_DESIGN_RULES}"


def _cr_number(value: Any) -> float | None:
    raw = str(value or "").strip()
    if not raw:
        return None
    fractions = {"1/8": 0.125, "1/4": 0.25, "1/2": 0.5}
    if raw in fractions:
        return fractions[raw]
    try:
        return float(raw)
    except (TypeError, ValueError):
        return None


def review_creature_draft(data: Dict[str, Any]) -> List[str]:
    """Return conservative deterministic review notes for a generated creature.

    These are warning heuristics rather than a CR calculator. They deliberately
    avoid pretending that a single table can prove encounter balance.
    """

    warnings: List[str] = []
    name = str(data.get("name") or "This creature")
    cr = _cr_number(data.get("cr"))

    try:
        hp = int(data.get("hp") or 0)
    except (TypeError, ValueError):
        hp = 0
    try:
        ac = int(data.get("ac") or 0)
    except (TypeError, ValueError):
        ac = 0

    abilities = str(data.get("abilities") or "").strip()

    if cr is None:
        warnings.append("Add or review the Challenge Rating before using this creature in encounter planning.")
    if hp <= 0:
        warnings.append("Hit points are missing or invalid.")
    if ac <= 0:
        warnings.append("Armor Class is missing or invalid.")
    elif ac > 24:
        warnings.append(f"{name} has very high AC ({ac}); check whether the party can hit it reliably.")
    if not abilities:
        warnings.append("No attacks or combat abilities are defined yet.")
    elif "d" not in abilities.lower():
        warnings.append("The combat text does not appear to include damage dice; add field-ready attack damage before running it.")

    if cr is not None:
        if cr <= 1 and hp > 100:
            warnings.append("Durability looks unusually high for a CR 1-or-lower estimate; review the CR or intended role.")
        if cr <= 4 and ac > 20:
            warnings.append("AC is unusually demanding for a low-CR estimate; check the expected party attack bonuses.")
        if cr >= 5 and hp and hp < 25:
            warnings.append("This creature may be very fragile for its CR estimate unless it relies on mobility, avoidance, or a deliberate glass-cannon role.")
        if cr >= 5 and abilities and "multiattack" not in abilities.lower() and "recharge" not in abilities.lower():
            warnings.append("For a mid/high-CR creature, review its action economy; one basic action per round may underperform against a full party.")

    warnings.append("CR is a first-pass estimate only; review this creature in the actual party and encounter context before play.")
    return warnings
