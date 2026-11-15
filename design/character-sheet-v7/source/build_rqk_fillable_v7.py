#!/usr/bin/env python3
"""Rookie Quest Keeper V7: exact logo; rebuilt Play + Actions pages; 2014/2024 editable A4."""
from pathlib import Path
import os, json, math
import fitz
from PIL import Image, ImageDraw
import build_rqk_fillable_v6 as v6

ROOT=Path('/mnt/data')
LOGO=ROOT/'RQK_Official_Logo_Print_Optimized.png'
LOGO_MONO=ROOT/'RQK_Official_Logo_Mono_Print_Optimized.png'
assert LOGO.is_file(), 'Official uploaded badge missing'

# The original V6 helpers are retained so all later pages stay properly editable.
# New layouts have different field positions/names for actions and shared quick summaries.
def header(p,mono,name,n):
    v6.sky_strip(p,0,76,0,.50,mono)
    v6.backdrop_motif(p,-45,18,112,mono,False,.18)
    v6.backdrop_motif(p,487,17,107,mono,False,.20)
    v6.backdrop_motif(p,604,38,75,mono,True,.16)
    # The user's exact full-colour RQK badge, not the earlier approximation.
    p.insert_image(fitz.Rect(27,1,89,74),filename=str(LOGO_MONO if mono else LOGO),keep_proportion=True,overlay=True)
    fg=v6.INK if mono else v6.WHITE
    muted=v6.MUTED if mono else (.79,.84,.9)
    v6.text(p,102,17,'ROOKIE QUEST KEEPER',6.85,muted,'InterB')
    title='ACTIONS / BONUS / REACTIONS' if n==2 else name.upper()
    title_size=13.3 if n==2 else 16.4
    v6.text(p,101,44,title,title_size,fg,'Cinzel')
    v6.text(p,102,61,f'EDITABLE A4 CHARACTER SHEET  /  5E {v6.ED} EDITION',7.0,muted,'Inter')
    v6.grad_line(p,0,74,v6.W,2.0,mono)

def footer(p,mono,name,n):
    v6.sky_strip(p,814,v6.H-814,.77,1,mono)
    v6.grad_line(p,0,813,v6.W,1.4,mono)
    fg=v6.INK if mono else v6.WHITE
    subtle=v6.MUTED if mono else (.8,.85,.91)
    v6.text(p,28,830,'ROOKIE QUEST KEEPER',7.2,fg,'Cinzel')
    v6.text(p,223,829,'EDIT   /   SAVE   /   PRINT',6.6,subtle,'Inter')
    v6.text_end(p,v6.W-28,830,f'{n:02d} / 08',8,fg,'InterB')

def compact_stat(p,x,key,label,width):
    v6.l(p,x,346,label,5.9)
    v6.field(p,key,x,350,width,19,fontsize=9,align=1)

def page1():
    p=v6.page('Character / play sheet',1)
    v6.section(p,27,86,541,87,'Identity','CHARACTER DETAILS')
    top=[(39,207,'Character name','identity.name'),(254,184,'Class / subclass','identity.class'),(447,49,'Level','identity.level'),(504,52,'XP','identity.xp')]
    for x,w,label,key in top:
        v6.l(p,x,115,label);v6.field(p,key,x,121,w,18,fontsize=9)
    below=[(39,96,'Player','identity.player'),(143,113,'Species / race','identity.species'),(264,142,'Background','identity.background'),(414,142,'Alignment','identity.alignment')]
    for x,w,label,key in below:
        v6.l(p,x,145,label);v6.field(p,key,x,151,w,15,fontsize=8.6)

    v6.text(p,31,189,'ABILITIES / SAVING THROWS',9,v6.INK,'Cinzel')
    v6.text_end(p,564,188,'SCORE  /  MOD  /  SAVE  /  PROFICIENT',6.05,v6.MUTED,'InterB')
    for i,(key,title) in enumerate(v6.ABILS):
        cx=68+i*91.35;cy=244.0
        v6.hexpath(p,cx,cy,43,50,v6.gradient(i/5),1.05,v6.WHITE,1)
        v6.tcenter(p,cx,212.3,title,8.35,v6.INK,'Cinzel')
        for j,(fld,label) in enumerate([('score','Score'),('modifier','Mod'),('save_bonus','Save')]):
            y=221+j*20.5
            v6.l(p,cx-23,y+13,label,5.55)
            v6.field(p,f'abilities.{key}.{fld}',cx+1,y,24,16,fontsize=8.7,align=1)
        v6.checkhex(p,f'abilities.{key}.save_proficient',cx+31,269.0,4.0,
                    description=f'{title} save proficiency')

    v6.section(p,27,297,541,80,'Core numbers','ALL YOUR COMMON ROLLS AT A GLANCE')
    core=[(39,49,'combat.ac','Armour class'),(96,50,'combat.initiative','Initiative'),
          (154,49,'combat.speed','Base spd'),(211,51,'combat.proficiency_bonus','Prof bonus'),
          (317,58,'combat.passive_perception','Pass. Per.'),
          (383,57,'combat.passive_insight','Pass. Ins.'),
          (448,56,'combat.spell_save_dc','Spell DC'),(512,43,'combat.spell_attack_bonus','Spell atk')]
    for x,w,k,lbl in core:compact_stat(p,x,k,lbl,w)
    v6.l(p,268,346,'H. Insp.' if v6.ED=='2024' else 'Insp.',5.8)
    v6.checkhex(p,'combat.inspiration',292,359,5.7,
                description='Heroic Inspiration' if v6.ED=='2024' else 'Inspiration')

    # Skills panel occupies the complete left side; 18 full skill rows.
    v6.section(p,27,387,251,410,'Skills / proficiencies','P = PROF.   E = EXPERTISE')
    v6.l(p,39,424,'Skill',5.9);v6.l(p,192,424,'Bonus',5.65)
    v6.l(p,232,424,'P',5.8);v6.l(p,258,424,'E',5.8)
    for i,(key,name,ability) in enumerate(v6.SKILLS):
        baseline=444+i*17.8
        v6.text(p,39,baseline,f'{name} ({ability})',7.12,v6.INK,'Inter')
        v6.field(p,f'skills.{key}.bonus',190,baseline-12,30,14,fontsize=7.8,align=1)
        v6.checkhex(p,f'skills.{key}.proficient',237,baseline-5,3.8,description=f'{name}: proficient')
        v6.checkhex(p,f'skills.{key}.expertise',262,baseline-5,3.8,description=f'{name}: expertise')
    v6.l(p,40,762,'Languages',5.75)
    v6.l(p,151,762,'Tools / training',5.75)
    v6.field(p,'identity.languages',40,767,103,18,fontsize=7.5)
    v6.field(p,'identity.training',151,767,114,18,fontsize=7.5)

    v6.section(p,287,387,281,150,'HP / survival',('EXH: -2 D20 / -5 FT EACH' if v6.ED=='2024' else 'EXH: SEE CUMULATIVE RULES P8'))
    first=[(299,52,'combat.max_hp','Max HP'),(356,52,'combat.current_hp','Current'),
           (413,49,'combat.temp_hp','Temp'),(469,42,'combat.hit_dice.type','Hit die')]
    for x,w,k,lbl in first:
        v6.l(p,x,425,lbl,5.9);v6.field(p,k,x,430,w,17,fontsize=8.8,align=1)
    v6.l(p,516,424,'Left/total',5.2)
    v6.field(p,'combat.hit_dice.remaining',516,430,18,17,fontsize=8,align=1)
    v6.text(p,537,443,'/',7,v6.MUTED,'Inter')
    v6.field(p,'combat.hit_dice.total',546,430,13,17,fontsize=8,align=1)
    v6.l(p,299,465,'Death saves',6.0)
    v6.l(p,365,465,'Success',5.45);v6.l(p,467,465,'Failure',5.45)
    for i in range(1,4):
        v6.checkhex(p,f'combat.death_saves.success.{i}',416+(i-1)*14,461.5,5)
        v6.checkhex(p,f'combat.death_saves.failure.{i}',518+(i-1)*14,461.5,5)
    v6.l(p,299,486,'Exhaustion',6)
    for i in range(1,7):v6.checkhex(p,f'combat.exhaustion.level.{i}',437+(i-1)*23,483,5.3,caption=i)
    v6.l(p,299,521,'Conditions',5.8)
    v6.field(p,'combat.conditions',356,508,202,19,fontsize=7.9)

    v6.section(p,287,546,281,179,'Attacks / weapons','FIVE QUICK ENTRIES')
    for lab,x in [('Weapon / attack',299),('Hit',404),('Damage / type',439),('Range',520)]:
        v6.l(p,x,584,lab,5.7)
    for i in range(1,6):
        y=591+(i-1)*24.3
        for key,x,w,size in [('name',299,99,7.8),('attack_bonus',404,29,8),
                             ('damage',439,75,7.6),('range',520,38,7.0)]:
            v6.field(p,f'attacks.{i}.{key}',x,y,w,20,fontsize=size,align=1 if key=='attack_bonus' else 0)

    v6.section(p,287,735,281,62,'Active effects / defences','NOT YOUR ACTION LIST')
    v6.l(p,299,769,'Concentrating on',5.65)
    v6.l(p,410,769,'Resist / immunity notes',5.65)
    v6.field(p,'combat.concentration_summary',299,773,103,17,fontsize=7.8)
    v6.field(p,'combat.defences_summary',410,773,148,17,fontsize=7.55)
    return p

def action_grid(p,area,rows,first_y,prefix,has_trigger=False):
    # Columns: name / activation or trigger / range / effect / remaining / total.
    label_y=first_y-6
    if has_trigger:
        columns=[('name',40,119,7.8),('trigger',165,116,7.0),('range',287,41,7.35),
                 ('effect',335,133,7.0),('usage',475,77,7.5)]
        labels=[('Ability / reaction',40),('Trigger',165),('Range',287),('Effect / notes',335),('Cost / uses',475)]
    else:
        columns=[('name',40,122,7.8),('requirement',169,70,7.45),('range',246,49,7.35),
                 ('effect',301,168,7.0),('usage',475,77,7.5)]
        labels=[('Ability / action',40),('Requirement',169),('Range',246),('Effect / notes',301),('Cost / uses',475)]
    for lab,x in labels:v6.l(p,x,label_y,lab,5.8)
    for i in range(1,rows+1):
        y=first_y+3+(i-1)*25.6
        for key,x,w,size in columns:
            v6.field(p,f'{prefix}.{i}.{key}',x,y,w,21,fontsize=size,
                     multiline=key in ('trigger','effect'))

def page2():
    p=v6.page('Actions / bonus / reactions',2)
    v6.section(p,27,86,541,228,'Actions','YOUR CHARACTER-SPECIFIC ACTION OPTIONS')
    action_grid(p,None,6,137,'actions.action')
    v6.section(p,27,323,541,186,'Bonus actions','OPTIONS THAT USE YOUR BONUS ACTION')
    action_grid(p,None,4,373,'actions.bonus')
    v6.section(p,27,519,541,164,'Reactions','TRIGGERS AND WHAT THEY DO')
    action_grid(p,None,4,568,'actions.reaction',has_trigger=True)

    v6.section(p,27,693,264,105,'Common action types','EDITION-APPROPRIATE')
    if v6.ED=='2024':
        actions=['Attack','Dash','Disengage','Dodge','Help','Hide','Influence','Magic','Ready','Search','Study','Utilize']
    else:
        actions=['Attack','Cast a Spell','Dash','Disengage','Dodge','Help','Hide','Ready','Search','Use an Object']
    for idx,act in enumerate(actions):
        col=idx//6;row=idx%6
        v6.little_hex(p,39+col*132,732+row*10.6,3.05)
        v6.text(p,47+col*132,735+row*10.6,act,6.55,v6.INK,'Inter')
    v6.section(p,301,693,267,105,'Resource / uses tracker')
    for label,x in [('Ability',313),('Left',432),('Max',464),('Recharge',497)]:v6.l(p,x,733,label,5.75)
    for i in range(1,4):
        y=739+(i-1)*18
        for key,x,w in [('name',313,111),('remaining',432,25),('total',464,25),('recharge',497,58)]:
            v6.field(p,f'actions.resources.{i}.{key}',x,y,w,15.5,fontsize=7.4)
    return p

def checkhex(p,name,cx,cy,r=5.3,caption=None,description=''):
    # Hex remains visible under editable checkbox; don't paint white over the icon.
    v6.hexpath(p,cx,cy,r,r,v6.VIOLET,1.0,None,1)
    widget=fitz.Widget()
    widget.field_type=fitz.PDF_WIDGET_TYPE_CHECKBOX
    widget.field_name=name
    widget.field_label=description or name
    widget.field_value='Off'
    widget.rect=fitz.Rect(cx-3.4,cy-3.4,cx+3.4,cy+3.4)
    widget.border_width=0
    widget.border_color=None
    widget.fill_color=None
    widget.text_color=v6.INK
    p.add_widget(widget)
    if caption is not None:v6.tcenter(p,cx,cy+11,str(caption),6.0,v6.MUTED,'InterB')
    v6.FIELD_REG.append({'name':name,'edition':v6.ED,'page':v6.PAGE_NO,
        'type':'checkbox','rect':[round(cx-3.4,1),round(cy-3.4,1),6.8,6.8],
        'description':description or name})

v6.checkhex=checkhex
def advanced_page():
    p=v6.page('Expanded combat / resources',3)
    v6.section(p,27,86,541,246,'Expanded attack list','RANGE, DAMAGE TYPE AND PROPERTIES')
    for label,x in [('Attack / weapon',41),('To hit',227),('Damage / type',290),('Range / mastery / effects',410)]:
        v6.l(p,x,126,label,5.8)
    for i in range(1,11):
        y=134+(i-1)*18.25
        for key,x,w,size in [('name',41,178,7.8),('attack_bonus',227,55,8),
                             ('damage',290,110,7.6),('properties',410,143,7.35)]:
            v6.field(p,f'combat.details.attacks.{i}.{key}',x,y,w,16.4,fontsize=size)
    v6.section(p,27,342,541,166,'Class resources / limited uses','MORE DETAIL THAN THE ACTIONS PAGE')
    for label,x in [('Resource / ability',41),('Left',285),('Max',359),('Recharge / note',425)]:
        v6.l(p,x,381,label,5.8)
    for i in range(1,7):
        y=388+(i-1)*18.5
        for key,x,w in [('name',41,236),('current',285,64),('maximum',359,58),('recharge',425,128)]:
            v6.field(p,f'resources.{i}.{key}',x,y,w,16,fontsize=8)
    v6.section(p,27,519,541,120,'Resistances / immunities / senses')
    for x,w,key,label in [(41,119,'resistances','Resistances'),(170,119,'immunities','Immunities'),
                          (299,119,'vulnerabilities','Vulnerabilities'),(427,71,'senses','Special senses'),
                          (505,49,'passive_investigation','Pass. Invest.')]:
        v6.l(p,x,557,label,5.2 if key=='passive_investigation' else 5.7)
        v6.field(p,f'combat.{key}',x,564,w,24,fontsize=7.8)
    v6.l(p,41,603,'Multiclass Hit Dice by type',5.7)
    v6.field(p,'combat.hit_dice.breakdown',41,610,157,20,fontsize=7.9)
    v6.l(p,211,603,'Defensive features / special effects',5.7)
    v6.field(p,'combat.defensive_features',211,610,343,20,fontsize=7.6)
    v6.section(p,27,650,541,149,'Combat notes / situational modifiers')
    v6.l(p,42,685,'Extra attacks / mastery notes',5.8)
    v6.field(p,'combat.details.extra_attack_notes',220,674,332,21,fontsize=7.9)
    v6.lined_multiline(p,'combat.notes',42,706,509,75,'Ongoing effects, combat tactics, critical notes',4)
    return p

_base_page=v6.page
def page_with_shift(name,idx):
    if name in ['Character / play sheet','Actions / bonus / reactions','Expanded combat / resources']:
        return _base_page(name,idx)
    return _base_page(name,idx+1 if idx>=3 else idx)
v6.page=page_with_shift

# Improve a 2014 Prone condition summary: ranged attacks from >5 ft against a
# prone target have disadvantage, in addition to nearby attack advantage.
v6.COND_2014=[(name, ('Crawl or spend half Speed standing; your attacks disadvantage; attackers within 5 ft advantage, farther attackers disadvantage.' if name=='Prone' else desc)) for name,desc in v6.COND_2014]

v6.header=header
v6.footer=footer
v6.do_page1=page1
v6.do_page2=page2
v6.PAGES=[page1,page2,advanced_page,v6.do_page3,v6.do_page4,v6.do_page5,v6.do_page6,v6.do_page7]

def create(edition,mono=False):
    v6.ED=edition;v6.MONO=mono;v6.FIELD_REG=[];v6.DOC=fitz.open()
    if mono:
        v6.INK=(.13,.13,.13);v6.MUTED=(.39,.39,.39);v6.LINE=(.65,.65,.65)
        v6.VIOLET=(.36,.36,.36);v6.PINK=v6.BLUE=v6.GRAY=v6.VIOLET
    else:
        v6.INK=(30/255,45/255,62/255);v6.MUTED=(102/255,122/255,145/255)
        v6.LINE=(194/255,207/255,222/255);v6.VIOLET=(176/255,77/255,255/255)
        v6.PINK=(255/255,61/255,139/255);v6.BLUE=(79/255,179/255,255/255);v6.GRAY=(.31,.31,.31)
    for fun in v6.PAGES: fun()
    doc=v6.DOC
    doc.set_metadata({'title':f'Rookie Quest Keeper - Interactive Character Sheet ({edition} edition) V7',
                      'author':'Rookie Quest Keeper',
                      'subject':'8-page editable 5e compatible character sheet with dedicated actions page'})
    variant='BW' if mono else 'Colour'
    target=ROOT/f'RQK_Character_Sheet_V7_{edition}_{variant}_Editable.pdf'
    doc.save(target,garbage=4,deflate=True)
    schema={'edition':edition,'version':'7.0','page_size':'A4','format':'AcroForm',
            'details':'V7 contains dedicated Actions page 2, Expanded Combat page 3, then Spells, Equipment, Features, Journal and Rules. Eight pages; revised schema.',
            'fields':v6.FIELD_REG}
    if not mono: (ROOT/f'RQK_Character_Sheet_V7_{edition}_Field_Map.json').write_text(json.dumps(schema,indent=2))
    if not mono:
        pix=doc[0].get_pixmap(matrix=fitz.Matrix(1.75,1.75),alpha=False)
        pix.save(ROOT/f'RQK_Character_Sheet_V7_{edition}_Page_1.png')
        pix=doc[1].get_pixmap(matrix=fitz.Matrix(1.75,1.75),alpha=False)
        pix.save(ROOT/f'RQK_Character_Sheet_V7_{edition}_Page_2.png')
        mosaic=Image.new('RGB',(4*455+20,2*660+20),(234,239,247))
        draw=ImageDraw.Draw(mosaic)
        for i,page in enumerate(doc):
            px=page.get_pixmap(matrix=fitz.Matrix(.87,.87),alpha=False)
            im=Image.frombytes('RGB',(px.width,px.height),px.samples)
            im.thumbnail((430,620))
            x=18+(i%4)*455;y=18+(i//4)*660
            mosaic.paste(im,(x,y));draw.rectangle([x,y,x+im.width,y+im.height],outline=(176,186,208),width=2)
        mosaic.save(ROOT/f'RQK_Character_Sheet_V7_{edition}_All_Pages.jpg',quality=91)
    count=len(v6.FIELD_REG);pages=len(doc)
    doc.close()
    print(f'{edition} {variant} V7 pages={pages} fields={count} file={target}')
    return target

if __name__=='__main__':
    for e in ('2014','2024'):
        for mono in (False,True):create(e,mono)