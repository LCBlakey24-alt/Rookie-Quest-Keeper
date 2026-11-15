from pathlib import Path
from itertools import combinations
import json,fitz,math
ROOT=Path('/mnt/data')
EXAMPLE={
 'identity.name':'Mira Fenwalker','identity.class':'Cleric / Life','identity.level':'5',
 'identity.player':'Mira','identity.species':'Human','identity.background':'Acolyte','identity.xp':'6500',
 'abilities.str.score':'12','abilities.str.modifier':'+1','abilities.str.save_bonus':'+1',
 'abilities.dex.score':'14','abilities.dex.modifier':'+2','abilities.dex.save_bonus':'+2',
 'abilities.con.score':'16','abilities.con.modifier':'+3','abilities.con.save_bonus':'+3',
 'abilities.int.score':'10','abilities.int.modifier':'+0','abilities.int.save_bonus':'+0',
 'abilities.wis.score':'18','abilities.wis.modifier':'+4','abilities.wis.save_bonus':'+7',
 'abilities.cha.score':'12','abilities.cha.modifier':'+1','abilities.cha.save_bonus':'+4',
 'abilities.wis.save_proficient':True,'abilities.cha.save_proficient':True,
 'combat.ac':'18','combat.initiative':'+2','combat.speed':'30',
 'combat.proficiency_bonus':'+3','combat.passive_perception':'17',
 'combat.passive_insight':'14','combat.passive_investigation':'10','combat.spell_save_dc':'15','combat.spell_attack_bonus':'+7',
 'combat.inspiration':True,'combat.max_hp':'43','combat.current_hp':'26','combat.temp_hp':'0',
 'combat.hit_dice.type':'d8','combat.hit_dice.remaining':'3','combat.hit_dice.total':'5',
 'combat.death_saves.success.1':True,'combat.exhaustion.level.1':True,'combat.exhaustion.level.2':True,
 'combat.conditions':'Poisoned','combat.concentration_summary':'Bless',
 'skills.perception.bonus':'+7','skills.perception.proficient':True,
 'attacks.1.name':'Mace','attacks.1.attack_bonus':'+4',
 'attacks.1.damage':'1d6+1 bludgeoning','attacks.1.range':'5 ft',
 'actions.action.1.name':'Cast Cure Wounds','actions.action.1.requirement':'1 action',
 'actions.action.1.effect':'1d8 + spell modifier','actions.action.1.usage':'1 slot',
 'actions.bonus.1.name':'Healing Word','actions.bonus.1.usage':'1 slot',
 'actions.reaction.1.name':'Opportunity Attack','actions.reaction.1.trigger':'Enemy leaves reach',
 'actions.resources.1.name':'Channel Divinity','actions.resources.1.remaining':'1',
 'actions.resources.1.total':'2','actions.resources.1.recharge':'Rest',
 'combat.details.attacks.1.name':'Mace','combat.details.attacks.1.attack_bonus':'+4',
 'combat.details.attacks.1.damage':'1d6+1 bludgeon',
 'combat.hit_dice.breakdown':'5d8 Cleric',
 'resources.1.name':'Channel Divinity','resources.1.current':'1','resources.1.maximum':'2',
 'magic.casting_ability':'Wisdom','magic.save_dc':'15','magic.attack_bonus':'+7',
 'magic.spells.1.name':'Guidance','magic.spells.1.level':'0',
 'magic.spells.2.name':'Cure Wounds','magic.spells.2.level':'1',
 'inventory.items.1.name':'Mace','inventory.items.1.quantity':'1',
 'currency.gp':'25','features.1.name':'Channel Divinity',
 'story.backstory':'A traveller who wants to help people.',
 'journal.notes.1':'An old friend gave us a strange map.'
}
results=[]
for e in ('2014','2024'):
 for mode in ('Colour','BW'):
  path=ROOT/f'RQK_Character_Sheet_V7_{e}_{mode}_Editable.pdf'
  assert path.is_file() and path.stat().st_size>500000,path
  d=fitz.open(path)
  assert len(d)==8,(path,len(d))
  assert 'V7' in d.metadata['title'] and f'({e} edition)' in d.metadata['title']
  fields=[(idx,w) for idx,p in enumerate(d) for w in (p.widgets() or [])]
  assert len(fields)==504,(e,mode,len(fields))
  assert len({w.field_name for _,w in fields})==504
  widget_overlaps=[]
  field_by_name={w.field_name:w for _,w in fields}
  for i,p in enumerate(d):
   widgets=list(p.widgets() or [])
   for w in widgets:
    assert p.rect.contains(w.rect) and w.rect.width>=5 and w.rect.height>=5,(w.field_name,w.rect)
   for a,b in combinations(widgets,2):
    r=a.rect & b.rect
    if not r.is_empty and r.get_area()>0.5:
     widget_overlaps.append((i+1,a.field_name,b.field_name,round(r.get_area(),2)))
  assert not widget_overlaps,widget_overlaps[:10]
  # Page 1 has no small quick actions / bonus / reactions: their editable grid is on page 2
  f1={w.field_name for w in d[0].widgets() or []}
  f2={w.field_name for w in d[1].widgets() or []}
  f3={w.field_name for w in d[2].widgets() or []}
  assert not any(x.startswith('combat.quick') for x in f1)
  assert {'actions.action.1.name','actions.bonus.1.name','actions.reaction.1.name'}.issubset(f2)
  assert 'combat.details.attacks.10.name' in f3
  assert 'magic.spells.24.name' in {w.field_name for w in d[3].widgets() or []}
  assert 'journal.notes.2' in {w.field_name for w in d[6].widgets() or []}
  txt8=d[7].get_text()
  assert (f'SRD 5.1' if e=='2014' else 'SRD 5.2.1') in txt8
  assert 'Creative Commons Attribution 4.0' in txt8
  assert 'farther attackers disadvantage' in txt8 if e=='2014' else 'immune to Poisoned condition' in txt8
  txt2=d[1].get_text()
  assert 'Cast a Spell' in txt2 if e=='2014' else 'Utilize' in txt2 and 'Influence' in txt2
  assert '01 / 08' in d[0].get_text() and '08 / 08' in d[7].get_text()
  assert set(EXAMPLE).issubset(field_by_name),set(EXAMPLE)-set(field_by_name)
  for page in d:
   for w in page.widgets() or []:
    if w.field_name in EXAMPLE:
     value=EXAMPLE[w.field_name]
     w.field_value=w.on_state() if value is True else str(value)
     w.update()
  out=ROOT/f'RQK_Character_Sheet_V7_{e}_{mode}_Filled_Example.pdf'
  d.save(out,garbage=4,deflate=True)
  d.close()
  v=fitz.open(out);actual={w.field_name:w.field_value for p in v for w in p.widgets() or []}
  assert actual['identity.name']=='Mira Fenwalker'
  assert actual['actions.action.1.usage']=='1 slot'
  assert actual['combat.exhaustion.level.1']!='Off'
  assert actual['combat.exhaustion.level.2']!='Off'
  assert actual['combat.exhaustion.level.3']=='Off'
  assert actual['combat.inspiration']!='Off'
  assert len(v)==8 and v.is_form_pdf==504
  if e=='2024' and mode=='Colour':
   for pn in (0,1,2,7):v[pn].get_pixmap(matrix=fitz.Matrix(1.6,1.6)).save(ROOT/f'RQK_V7_FILLED_2024_p{pn+1}.png')
  v.close()
  results.append(dict(edition=e,mode=mode,pages=8,fields=504,form_persisted=True,widget_overlaps=0,pdf_kb=round(path.stat().st_size/1024)))
  print(e,mode,'8 pages; 502 unique fields; no widget overlaps; fills persist')
(ROOT/'RQK_V7_QA_Results.json').write_text(json.dumps(results,indent=2))
print('ALL TESTS PASSED')