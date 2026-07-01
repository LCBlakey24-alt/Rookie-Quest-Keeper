import React, { useMemo, useState } from "react";
import { toast } from "sonner";
import { AlertTriangle, Search, Wand2 } from "lucide-react";

import { deriveCharacterSnapshot } from "@/data/deriveCharacterSnapshot";
import {
  SPELLCASTING_CLASSES,
  getMulticlassSpellSlots,
} from "@/data/spellDatabase";

const ABILITY_LABELS = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const normalizeName = (value = "") =>
  String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const abilityMod = (score = 10) => Math.floor((Number(score || 10) - 10) / 2);
const formatBonus = (value) =>
  Number(value) >= 0 ? `+${Number(value)}` : `${Number(value)}`;
const toArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);
const hasItems = (value = {}) => Object.keys(value || {}).length > 0;

function normaliseSpell(spell, fallbackLevel = null) {
  if (!spell)
    return {
      name: "Unknown Spell",
      level: fallbackLevel,
      school: "",
      description: "",
    };
  if (typeof spell === "string")
    return { name: spell, level: fallbackLevel, school: "", description: "" };
  return {
    ...spell,
    name: spell.name || spell.spell_name || spell.title || "Unknown Spell",
    level: spell.level ?? spell.spell_level ?? fallbackLevel,
    school: spell.school || spell.type || "",
    description: spell.description || spell.desc || spell.summary || "",
  };
}

function uniqueSpells(spells = [], fallbackLevel = null) {
  const seen = new Set();
  return toArray(spells)
    .map((spell) => normaliseSpell(spell, fallbackLevel))
    .filter((spell) => {
      const key = normalizeName(spell.name);
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function getClassLevels(character = {}) {
  const fromMap = character?.multiclass_levels || character?.class_levels || {};
  const entries = Object.entries(fromMap).filter(
    ([, level]) => Number(level) > 0,
  );
  if (entries.length)
    return Object.fromEntries(
      entries.map(([cls, level]) => [cls, Number(level) || 0]),
    );

  const fromArray = (character?.classes || [])
    .map((cls) => [
      cls?.name || cls?.class_name || cls?.character_class,
      Number(cls?.level) || 0,
    ])
    .filter(([cls, level]) => cls && level > 0);
  if (fromArray.length) return Object.fromEntries(fromArray);

  return character?.character_class
    ? { [character.character_class]: Number(character?.level || 1) || 1 }
    : {};
}

function canonicalSpellClass(className = "") {
  return (
    Object.keys(SPELLCASTING_CLASSES).find(
      (cls) => normalizeName(cls) === normalizeName(className),
    ) || className
  );
}

function classHasSpellcasting(character = {}, className = "") {
  const canonical = canonicalSpellClass(className);
  const info = SPELLCASTING_CLASSES[canonical];
  if (!info) return false;
  const classLevels = getClassLevels(character);
  const level = Number(classLevels[className] ?? classLevels[canonical] ?? 0);
  if (level <= 0) return false;
  if (info.halfCaster && level < 2) return false;
  if (info.subclassOnly) {
    const subclass =
      character?.subclass ||
      (character?.classes || []).find(
        (cls) =>
          normalizeName(
            cls?.name || cls?.class_name || cls?.character_class,
          ) === normalizeName(canonical),
      )?.subclass ||
      "";
    return (
      level >= 3 && normalizeName(subclass) === normalizeName(info.subclassOnly)
    );
  }
  return true;
}

function spellLevelLabel(level) {
  if (Number(level) === 0) return "Cantrip";
  if (!level && level !== 0) return "Spell";
  return `Level ${level}`;
}

function groupByLevel(spells = []) {
  return spells.reduce((groups, spell) => {
    const key = String(Number(spell.level || 0));
    return { ...groups, [key]: [...(groups[key] || []), spell] };
  }, {});
}

function normaliseSlotKeys(slots = {}) {
  return Object.fromEntries(
    Object.entries(slots || {}).map(([level, count]) => [
      String(level),
      Number(count) || 0,
    ]),
  );
}

function lowestUsableSlot(slots = {}, remaining = {}, spellLevel = 1) {
  const keys = Array.from(
    new Set([...Object.keys(slots || {}), ...Object.keys(remaining || {})]),
  )
    .map(Number)
    .filter((level) => level >= Number(spellLevel || 1))
    .sort((a, b) => a - b);
  return (
    keys.find((level) => Number(remaining[level] ?? slots[level] ?? 0) > 0) ||
    null
  );
}

function SpellSlots({ slots = {}, remaining = {}, onChangeSlots }) {
  const [savingLevel, setSavingLevel] = useState("");
  const keys = Array.from(
    new Set([...Object.keys(slots || {}), ...Object.keys(remaining || {})]),
  )
    .filter((key) => Number(key) > 0)
    .sort((a, b) => Number(a) - Number(b));

  const updateLevel = async (level, delta) => {
    if (!onChangeSlots || savingLevel) return;
    const total = Number(slots[level] ?? 0);
    const current = Number(remaining[level] ?? total);
    const next = Math.max(0, Math.min(total, current + delta));
    if (next === current) return;
    setSavingLevel(level);
    const ok = await onChangeSlots({ ...(remaining || {}), [level]: next });
    if (ok !== false)
      toast.success(
        delta < 0
          ? `Level ${level} slot spent`
          : `Level ${level} slot restored`,
      );
    setSavingLevel("");
  };

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
      <div className="clean-sheet-spell-section-heading">
        <h2>Spell Slots</h2>
        <span>{keys.length ? "Tap Spend or Restore" : "No slot data"}</span>
      </div>
      {keys.length > 0 ? (
        <div className="clean-sheet-slot-grid">
          {keys.map((level) => {
            const total = Number(slots[level] ?? 0);
            const left = Number(remaining[level] ?? total);
            return (
              <div key={level} className="clean-sheet-slot-card">
                <span>Level {level}</span>
                <strong>
                  {left}/{total}
                </strong>
                <div
                  className="clean-sheet-slot-pips"
                  aria-label={`Level ${level} slots`}
                >
                  {Array.from({ length: total }).map((_, index) => (
                    <i key={index} className={index < left ? "filled" : ""} />
                  ))}
                </div>
                <div className="clean-sheet-slot-actions">
                  <button
                    type="button"
                    onClick={() => updateLevel(level, -1)}
                    disabled={savingLevel === level || left <= 0}
                  >
                    Spend
                  </button>
                  <button
                    type="button"
                    onClick={() => updateLevel(level, 1)}
                    disabled={savingLevel === level || left >= total}
                  >
                    Restore
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <p className="clean-sheet-muted">
          This character has no spell slots saved yet.
        </p>
      )}
    </section>
  );
}

function SpellCard({ spell, prepared, cantrip, onCast, onConcentrate }) {
  const [expanded, setExpanded] = useState(false);
  const hasDescription = Boolean(spell.description);
  const concentrationLikely = /concentration/i.test(spell.description || "");

  return (
    <article
      className={`clean-sheet-spell-card ${prepared ? "prepared" : ""} ${cantrip ? "cantrip" : ""}`}
    >
      <div className="clean-sheet-spell-card-top">
        <span className="clean-sheet-spell-level">
          {spellLevelLabel(spell.level)}
        </span>
        {prepared && <span className="clean-sheet-spell-state">Prepared</span>}
      </div>
      <strong>{spell.name}</strong>
      {spell.school && <em>{spell.school}</em>}
      {hasDescription && (
        <p>
          {expanded
            ? spell.description
            : `${spell.description.slice(0, 130)}${spell.description.length > 130 ? "…" : ""}`}
        </p>
      )}
      <div className="clean-sheet-spell-actions">
        <button type="button" onClick={() => onCast(spell)}>
          {cantrip ? "Use Cantrip" : "Cast"}
        </button>
        {concentrationLikely && (
          <button type="button" onClick={() => onConcentrate(spell)}>
            Concentrate
          </button>
        )}
        {hasDescription && (
          <button type="button" onClick={() => setExpanded((prev) => !prev)}>
            {expanded ? "Less" : "More"}
          </button>
        )}
      </div>
    </article>
  );
}

function SpellGroup({
  title,
  spells,
  preparedNames,
  emptyText,
  onCast,
  onConcentrate,
}) {
  const grouped = groupByLevel(spells);
  const levels = Object.keys(grouped).sort((a, b) => Number(a) - Number(b));

  return (
    <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
      <div className="clean-sheet-spell-section-heading">
        <h2>{title}</h2>
        <span>
          {spells.length} spell{spells.length === 1 ? "" : "s"}
        </span>
      </div>
      {spells.length ? (
        levels.map((level) => (
          <div
            key={`${title}-${level}`}
            className="clean-sheet-spell-level-group"
          >
            <h3>{spellLevelLabel(level)}</h3>
            <div className="clean-sheet-spell-grid">
              {grouped[level].map((spell) => (
                <SpellCard
                  key={`${title}-${spell.name}`}
                  spell={spell}
                  cantrip={Number(spell.level || 0) === 0}
                  prepared={preparedNames.has(normalizeName(spell.name))}
                  onCast={onCast}
                  onConcentrate={onConcentrate}
                />
              ))}
            </div>
          </div>
        ))
      ) : (
        <p className="clean-sheet-muted">{emptyText}</p>
      )}
    </section>
  );
}

export default function CleanSpellsTab({ character, onCharacterUpdate }) {
  const [spellSearch, setSpellSearch] = useState("");
  const snapshot = useMemo(() => deriveCharacterSnapshot(character), [character]);
  const classLevels = useMemo(() => {
    const snapshotLevels = snapshot.identity?.classLevels || {};
    return hasItems(snapshotLevels) ? snapshotLevels : getClassLevels(character);
  }, [character, snapshot.identity?.classLevels]);
  const slotMath = useMemo(
    () => snapshot.spellcasting?.multiclass || getMulticlassSpellSlots(classLevels, character),
    [classLevels, character, snapshot.spellcasting?.multiclass],
  );
  const proficiencyBonus =
    snapshot.proficiencyBonus ||
    Number(character?.proficiency_bonus) ||
    2 + Math.floor(((Number(character?.level) || 1) - 1) / 4);
  const spellcastingRows = useMemo(
    () =>
      Object.entries(classLevels)
        .map(([className, level]) => {
          const canonical = canonicalSpellClass(className);
          const info = SPELLCASTING_CLASSES[canonical];
          if (!info || !classHasSpellcasting(character, className)) return null;
          const modifier = abilityMod(character?.[info.ability]);
          return {
            className: canonical,
            level,
            ability: info.ability,
            abilityLabel: ABILITY_LABELS[info.ability] || info.ability,
            saveDc: 8 + proficiencyBonus + modifier,
            attackBonus: proficiencyBonus + modifier,
            castingType: info.pactMagic
              ? "Pact Magic"
              : info.type === "prepared"
                ? "Prepared"
                : "Known",
          };
        })
        .filter(Boolean),
    [character, classLevels, proficiencyBonus],
  );

  const primaryCaster = spellcastingRows[0];
  const savedSlots = normaliseSlotKeys(character?.spell_slots || {});
  const derivedSlots = normaliseSlotKeys(slotMath?.slots || {});
  const pactSlots = slotMath?.pactMagic
    ? { [String(slotMath.pactMagic.level)]: slotMath.pactMagic.slots }
    : {};
  const effectiveSlots = hasItems(savedSlots)
    ? savedSlots
    : hasItems(derivedSlots)
      ? derivedSlots
      : pactSlots;
  const savedRemaining = normaliseSlotKeys(character?.spell_slots_remaining || {});
  const effectiveRemaining = hasItems(savedRemaining) ? savedRemaining : effectiveSlots;
  const hasPactMagic = Boolean(slotMath?.pactMagic);
  const spellWarnings = useMemo(() => {
    const warnings = [...(snapshot.warnings || [])];
    if (spellcastingRows.length && !hasItems(effectiveSlots)) warnings.push("Spellcaster has no derived or saved spell slot data.");
    if (hasPactMagic && hasItems(savedSlots)) warnings.push("Warlock/Pact Magic has saved slot data. Check it still matches the derived pact slot level after levelling.");
    if (spellcastingRows.length && !character?.cantrips_known?.length && !character?.cantrips?.length && !character?.spells_known?.length && !character?.known_spells?.length && !character?.spellbook?.length && !character?.spells_prepared?.length && !character?.prepared_spells?.length) {
      warnings.push("Caster has spellcasting math but no saved spell list yet.");
    }
    return warnings;
  }, [snapshot.warnings, spellcastingRows.length, effectiveSlots, hasPactMagic, savedSlots, character]);

  const cantrips = uniqueSpells(
    character?.cantrips_known || character?.cantrips,
    0,
  );
  const known = uniqueSpells(
    character?.spells_known || character?.known_spells || character?.spellbook,
    null,
  );
  const prepared = uniqueSpells(
    character?.spells_prepared || character?.prepared_spells,
    null,
  );
  const preparedNames = new Set(
    prepared.map((spell) => normalizeName(spell.name)),
  );
  const primaryClass = canonicalSpellClass(character?.character_class || character?.class_name || "");
  const isPreparedCaster = primaryCaster?.castingType === "Prepared";
  const isWizard = primaryClass === "Wizard";
  const knownWithoutPrepared = known.filter(
    (spell) => !preparedNames.has(normalizeName(spell.name)),
  );
  const secondaryLeveled = isPreparedCaster ? knownWithoutPrepared : known;
  const secondaryTitle = isWizard ? "Spellbook" : isPreparedCaster ? "Known Spells" : "Known Spells";
  const secondaryEmpty = isWizard
    ? "No spellbook entries found."
    : "No known spells found.";
  const lowerSearch = spellSearch.trim().toLowerCase();
  const filterSpells = (spells) =>
    !lowerSearch
      ? spells
      : spells.filter((spell) =>
          `${spell.name} ${spell.school} ${spell.description}`
            .toLowerCase()
            .includes(lowerSearch),
        );

  const handleSlotChange = async (nextRemaining) => {
    if (!onCharacterUpdate) return false;
    const normalisedRemaining = Object.fromEntries(
      Object.entries(nextRemaining || {}).map(([level, count]) => [
        String(level),
        Number(count) || 0,
      ]),
    );
    return onCharacterUpdate(
      { spell_slots_remaining: normalisedRemaining },
      { error: "Could not update spell slots" },
    );
  };

  const castSpell = async (spell) => {
    const level = Number(spell.level || 0);
    if (level <= 0) {
      toast.success(`${spell.name} used`, {
        description: "Cantrips do not spend spell slots.",
      });
      return;
    }

    const slotLevel = lowestUsableSlot(
      effectiveSlots,
      effectiveRemaining,
      level,
    );
    if (!slotLevel) {
      toast.error(`No level ${level}+ spell slots left`, {
        description:
          "Restore slots after a rest or spend manually if your table rules differ.",
      });
      return;
    }

    const nextRemaining = {
      ...(effectiveRemaining || {}),
      [slotLevel]: Math.max(
        0,
        Number(
          effectiveRemaining[slotLevel] ?? effectiveSlots[slotLevel] ?? 0,
        ) - 1,
      ),
    };
    const ok = await handleSlotChange(nextRemaining);
    if (ok !== false)
      toast.success(`${spell.name} cast`, {
        description: `Spent a level ${slotLevel} spell slot.`,
      });
  };

  const concentrateOn = async (spell) => {
    if (!onCharacterUpdate) return;
    const ok = await onCharacterUpdate(
      { concentrating_on: spell.name },
      { error: "Could not set concentration" },
    );
    if (ok !== false) toast.success(`Concentrating on ${spell.name}`);
  };

  return (
    <div className="clean-sheet-grid clean-sheet-spells-tab">
      <section className="clean-sheet-panel clean-sheet-wide clean-spell-board clean-spell-summary-board">
        <div className="clean-sheet-spellcasting-heading">
          <div>
            <h2>Spellcasting</h2>
            <p>
              Cast spells, spend slots, and check your spell math from the
              player sheet.
            </p>
          </div>
          <span>{spellcastingRows.length ? "Caster" : "No caster data"}</span>
        </div>
        <div className="clean-sheet-spell-summary">
          <div>
            <span>Ability</span>
            <strong>
              {character?.spellcasting_ability
                ? ABILITY_LABELS[character.spellcasting_ability] ||
                  character.spellcasting_ability
                : primaryCaster?.abilityLabel || "—"}
            </strong>
          </div>
          <div>
            <span>Save DC</span>
            <strong>
              {character?.spell_save_dc || primaryCaster?.saveDc || "—"}
            </strong>
          </div>
          <div>
            <span>Attack</span>
            <strong>
              {character?.spell_attack_bonus !== undefined
                ? formatBonus(character.spell_attack_bonus)
                : primaryCaster
                  ? formatBonus(primaryCaster.attackBonus)
                  : "—"}
            </strong>
          </div>
          <div>
            <span>Known/Prepared</span>
            <strong>
              {known.length}/{prepared.length}
            </strong>
          </div>
        </div>
        <label className="clean-sheet-spell-search">
          <Search size={16} />
          <input
            value={spellSearch}
            onChange={(event) => setSpellSearch(event.target.value)}
            placeholder="Search spells…"
          />
        </label>
      </section>

      <section className="clean-sheet-panel clean-sheet-wide clean-spell-board clean-spell-snapshot-board">
        <div className="clean-sheet-spell-section-heading">
          <h2>Spell Readiness</h2>
          <span>{snapshot.identity.edition} rules</span>
        </div>
        <div className="clean-sheet-spell-summary clean-sheet-spell-readiness-grid">
          <div><span>Primary</span><strong>{snapshot.spellcasting?.primary || primaryClass || "—"}</strong></div>
          <div><span>Caster Blocks</span><strong>{snapshot.spellcasting?.blocks?.length || spellcastingRows.length}</strong></div>
          <div><span>Slot Source</span><strong>{hasItems(savedSlots) ? "Saved" : hasItems(derivedSlots) ? "Derived" : hasPactMagic ? "Pact" : "None"}</strong></div>
          <div><span>Pact Magic</span><strong>{hasPactMagic ? `L${slotMath.pactMagic.level} × ${slotMath.pactMagic.slots}` : "—"}</strong></div>
        </div>
        {!!spellWarnings.length && (
          <div className="clean-sheet-spell-warning">
            <AlertTriangle size={15} />
            <span>{spellWarnings[0]}</span>
          </div>
        )}
      </section>

      {spellcastingRows.length > 0 && (
        <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
          <div className="clean-sheet-spell-section-heading">
            <h2>Caster Details</h2>
            <span>
              {Object.keys(classLevels).length > 1
                ? "Multiclass"
                : "Single class"}
            </span>
          </div>
          <div className="clean-sheet-caster-grid">
            {spellcastingRows.map((row) => (
              <article key={row.className} className="clean-sheet-caster-card">
                <div className="clean-sheet-caster-card-title">
                  <strong>{row.className}</strong>
                  <span>Level {row.level}</span>
                </div>
                <div className="clean-sheet-caster-stats">
                  <div>
                    <span>Ability</span>
                    <strong>{row.abilityLabel}</strong>
                  </div>
                  <div>
                    <span>Save DC</span>
                    <strong>{row.saveDc}</strong>
                  </div>
                  <div>
                    <span>Attack</span>
                    <strong>{formatBonus(row.attackBonus)}</strong>
                  </div>
                  <div>
                    <span>Style</span>
                    <strong>{row.castingType}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <SpellSlots
        slots={effectiveSlots}
        remaining={effectiveRemaining}
        onChangeSlots={handleSlotChange}
      />

      {slotMath?.pactMagic && (
        <section className="clean-sheet-panel clean-sheet-wide clean-spell-board">
          <div className="clean-sheet-spell-section-heading">
            <h2>Pact Magic</h2>
            <span>Warlock</span>
          </div>
          <div className="clean-sheet-pact-card">
            <div>
              <span>Slots</span>
              <strong>{slotMath.pactMagic.slots}</strong>
            </div>
            <div>
              <span>Slot Level</span>
              <strong>{slotMath.pactMagic.level}</strong>
            </div>
            <p>
              Warlock pact slots refresh separately at most tables, usually on a
              short rest.
            </p>
          </div>
        </section>
      )}

      <SpellGroup
        title="Cantrips"
        spells={filterSpells(cantrips)}
        preparedNames={preparedNames}
        emptyText="No cantrips found on this character."
        onCast={castSpell}
        onConcentrate={concentrateOn}
      />
      {isPreparedCaster && (
        <SpellGroup
          title="Prepared Spells"
          spells={filterSpells(prepared)}
          preparedNames={preparedNames}
          emptyText="No prepared spells found. Edit the character or prepare spells after a rest."
          onCast={castSpell}
          onConcentrate={concentrateOn}
        />
      )}
      <SpellGroup
        title={secondaryTitle}
        spells={filterSpells(secondaryLeveled)}
        preparedNames={preparedNames}
        emptyText={secondaryEmpty}
        onCast={castSpell}
        onConcentrate={concentrateOn}
      />

      {!cantrips.length && !known.length && !prepared.length && (
        <section className="clean-sheet-panel clean-sheet-wide clean-spell-board clean-spell-empty">
          <Wand2 size={22} />
          <h2>No spells saved yet</h2>
          <p>
            This character has caster info but no spell list saved. Use Edit
            Character to add cantrips and levelled spells.
          </p>
        </section>
      )}
    </div>
  );
}
