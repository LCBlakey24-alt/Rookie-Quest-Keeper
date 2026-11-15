#!/usr/bin/env python3
"""Rookie Quest Keeper V6: editable and ink-friendly editions; 2014/2024."""
from __future__ import annotations
import json, math, os
from collections import Counter
from pathlib import Path
import fitz
from PIL import Image, ImageDraw

ROOT=Path('/mnt/data')
STUB=(ROOT/'build_rqk_sheet_v3.py').read_text()
# Reuse the already-approved v3 drawn header, color system, Cinzel/Inter fonts.
# Stop before pages / file-generation side effects.
exec(compile(STUB[:STUB.index('def page1(')],str(ROOT/'build_rqk_sheet_v3.py'),'exec'))

FIELD_REG=[]; ED=None; PAGE_NO=0; DOC=None; MONO=False

# Monochrome edition is rendered as actual vector greyscale before the PDF fields
# are placed. Avoid rasterising: the widgets must remain editable.
ORIG_GRAD_LINE=grad_line
def grad_line(p,x,y,length,height=2,mono=False):
    return ORIG_GRAD_LINE(p,x,y,length,height,mono=MONO)
ORIG_GRADIENT=gradient
def gradient(t,mono=False):
    return (0.36,0.36,0.36) if MONO else ORIG_GRADIENT(t)
# Smaller type is used only for compact field labels; values stay at 8-10 pt.
SMALL=6.35

# Keep the website's Dusk Sky/Neon Coast style but label the new form correctly.
def header(p,mono,name,n):
    sky_strip(p,0,76,0,.50,mono)
    backdrop_motif(p,-45,18,112,mono,False,.18)
    backdrop_motif(p,489,18,108,mono,False,.20)
    backdrop_motif(p,603,38,70,mono,True,.15)
    fg=INK if mono else WHITE
    muted=MUTED if mono else (.79,.84,.90)
    badge=str(ROOT/('rqk_badge_redraw_mono.png' if mono else 'rqk_badge_redraw_colour.png'))
    p.insert_image(fitz.Rect(26,2,84,73),filename=badge,keep_proportion=True,overlay=True)
    text(p,99,17,'ROOKIE QUEST KEEPER',6.8,muted,'InterB')
    text(p,98,44,name.upper(),16.5,fg,'Cinzel')
    text(p,99,61,f'EDITABLE A4 CHARACTER SHEET  /  5E {ED} EDITION',7.0,muted,'Inter')
    grad_line(p,0,74,W,2.0,mono)

def footer(p,mono,name,n):
    sky_strip(p,814,H-814,.77,1,mono)
    grad_line(p,0,813,W,1.4,mono)
    fg=INK if mono else WHITE
    subtle=MUTED if mono else (.79,.84,.9)
    text(p,28,830,'ROOKIE QUEST KEEPER',7.2,fg,'Cinzel')
    text(p,221,829,'FILL ONLINE   /   SAVE   /   PRINT',6.4,subtle,'Inter')
    text_end(p,W-28,830,f'{n:02d} / 07',8.0,fg,'InterB')

def page(name,idx):
    global PAGE_NO
    PAGE_NO=idx
    p=DOC.new_page(width=W,height=H)
    for nm,fp in [('Cinzel',CINZ),('CinzelR',CINZR),('Inter',INTER),('InterB',INTERB)]:
        p.insert_font(fontname=nm,fontfile=fp)
    header(p,MONO,name,idx)
    footer(p,MONO,name,idx)
    return p

def section(p,x,y,w,h,name,tag=''):
    poly_panel(p,x,y,w,h,LINE,WHITE)
    grad_line(p,x+10,y+1,w-20,1.5)
    little_hex(p,x+15,y+16,4.1,False,False)
    text(p,x+25,y+20,name.upper(),8.5,INK,'Cinzel')
    if tag:
        text_end(p,x+w-10,y+19,tag.upper(),5.9,MUTED,'InterB')
    line(p,x+9,y+26,x+w-9,y+26,LINE,.55)
    return y+30

def l(p,x,y,s,sz=SMALL):text(p,x,y,s.upper(),sz,MUTED,'InterB')

def field(p,name,x,y,w,h=17,label_=None,fontsize=8.6,multiline=False,align=0,description='',line_only=False):
    """Place a named AcroForm text field; y is TOP of editable rectangle."""
    if label_ is not None:
        l(p,x,y-4,label_)
    if line_only: line(p,x,y+h-.6,x+w,y+h-.6,LINE,.6)
    else:
        rect(p,x,y,w,h,stroke=LINE,sw=.56,fill=WHITE)
    wid=fitz.Widget()
    wid.field_type=fitz.PDF_WIDGET_TYPE_TEXT
    wid.field_name=name
    wid.field_label=description or label_ or name
    wid.field_value=''
    wid.rect=fitz.Rect(x+1,y+.2,x+w-1,y+h-.2)
    wid.text_color=INK
    wid.text_font='Helv'
    wid.text_fontsize=fontsize
    wid.text_format=align
    wid.border_width=0
    wid.fill_color=None
    if multiline:
        wid.field_flags=fitz.PDF_TX_FIELD_IS_MULTILINE
    p.add_widget(wid)
    FIELD_REG.append({'name':name,'edition':ED,'page':PAGE_NO,'type':'text','rect':[round(x,1),round(y,1),round(w,1),round(h,1)],'description':description or label_ or name})

def checkhex(p,name,cx,cy,r=5.3,caption=None,description=''):
    hexpath(p,cx,cy,r,r,VIOLET,.83,None,.85)
    wid=fitz.Widget();wid.field_type=fitz.PDF_WIDGET_TYPE_CHECKBOX
    wid.field_name=name;wid.field_label=description or name
    wid.field_value='Off';wid.rect=fitz.Rect(cx-3.6,cy-3.6,cx+3.6,cy+3.6)
    wid.border_width=0;wid.border_color=WHITE;wid.fill_color=WHITE
    wid.text_color=INK
    p.add_widget(wid)
    if caption is not None: tcenter(p,cx,cy+12,str(caption),6,MUTED,'InterB')
    FIELD_REG.append({'name':name,'edition':ED,'page':PAGE_NO,'type':'checkbox','rect':[round(cx-3.6,1),round(cy-3.6,1),7.2,7.2], 'description':description or name})

def small_fields(p,prefix,labels,x,y,width,height=18,gap=6):
    ww=(width-gap*(len(labels)-1))/len(labels)
    for i,(key,title_) in enumerate(labels):
        xx=x+i*(ww+gap)
        l(p,xx,y-3,title_)
        field(p,f'{prefix}.{key}',xx,y+1,ww,height-3,fontsize=9)

def lined_multiline(p,name,x,y,w,h,label_=None,rows=4):
    if label_:l(p,x,y,label_)
    for j in range(1,rows+1):
        yy=y+7+j*(h-7)/(rows+0.5)
        line(p,x,yy,x+w,yy,LINE,.48)
    field(p,name,x,y+7,w,h-7,fontsize=8,multiline=True,description=label_ or name,line_only=True)

def colhead(p,headers,cols,y):
    for h,x in zip(headers,cols):l(p,x,y,h,6.05)

ABILS=[('str','STR'),('dex','DEX'),('con','CON'),('int','INT'),('wis','WIS'),('cha','CHA')]
SKILLS=[('acrobatics','Acrobatics','DEX'),('animal_handling','Animal Handling','WIS'),('arcana','Arcana','INT'),('athletics','Athletics','STR'),('deception','Deception','CHA'),('history','History','INT'),('insight','Insight','WIS'),('intimidation','Intimidation','CHA'),('investigation','Investigation','INT'),('medicine','Medicine','WIS'),('nature','Nature','INT'),('perception','Perception','WIS'),('performance','Performance','CHA'),('persuasion','Persuasion','CHA'),('religion','Religion','INT'),('sleight_of_hand','Sleight of Hand','DEX'),('stealth','Stealth','DEX'),('survival','Survival','WIS')]

def do_page1():
    p=page('Character / play sheet',1)
    section(p,27,86,541,88,'Identity','ALL YOUR EVERY-TURN INFORMATION')
    l(p,39,116,'Character name');field(p,'identity.name',39,120,208,19,fontsize=10.1)
    l(p,255,116,'Class / subclass');field(p,'identity.class',255,120,181,19)
    l(p,444,116,'Level');field(p,'identity.level',444,120,50,19)
    l(p,502,116,'XP');field(p,'identity.xp',502,120,54,19)
    second=[(39,97,'Player','identity.player'),(144,113,'Species / race','identity.species'),(265,142,'Background','identity.background'),(415,141,'Alignment / notes','identity.alignment')]
    for x,w,s,k in second:l(p,x,145,s);field(p,k,x,149,w,17)

    text(p,31,190,'ABILITIES',9,INK,'Cinzel')
    text_end(p,565,190,'SCORE  /  MODIFIER  /  SAVE BONUS  /  PROFICIENT HEX',6.3,MUTED,'InterB')
    for i,(key,title_) in enumerate(ABILS):
        cx=67+i*91.5;cy=244;rad=43.2
        hexpath(p,cx,cy,rad,46,gradient(i/5),1.1,WHITE,1)
        tcenter(p,cx,215,title_,8.1,INK,'Cinzel')
        l(p,cx-24,227,'Score',5.4);field(p,f'abilities.{key}.score',cx-1,219,23,18,fontsize=9.3,align=1)
        l(p,cx-24,250,'Mod',5.5);field(p,f'abilities.{key}.modifier',cx-1,242,23,18,fontsize=9.3,align=1)
        l(p,cx-24,274,'Save',5.5);field(p,f'abilities.{key}.save_bonus',cx-1,264,23,18,fontsize=8.8,align=1)
        checkhex(p,f'abilities.{key}.save_proficient',cx+31,247,4.35,description=f'{title_} saving throw proficient')

    section(p,27,291,541,60,'Defence / initiative / magic')
    row=[('ac','AC',52),('initiative','Initiative',70),('speed','Speed (ft)',77),('proficiency_bonus','Prof bonus',75),('passive_perception','Passive Per.',82),('spell_save_dc','Spell DC',75)]
    xpos=38
    for key,lbl,w in row:
        l(p,xpos,320,lbl,6.0);field(p,'combat.'+key,xpos,325,w,16,fontsize=8.5,align=1);xpos+=w+10
    checkhex(p,'combat.inspiration',543,329,6.1,description=('Heroic Inspiration' if ED=='2024' else 'Inspiration'))
    l(p,524,345,('Heroic' if ED=='2024' else 'Insp.'),5.8)

    section(p,27,358,238,438,'Skills / proficiencies','P = PROF.  E = EXPERTISE')
    l(p,40,399,'SKILL');l(p,199,399,'BONUS')
    l(p,214,391,'P',5.8);l(p,246,391,'E',5.8)
    for i,(key,sk,ab) in enumerate(SKILLS):
        yy=415+i*18.0
        labeltxt=f'{sk} ({ab})'
        text(p,40,yy,labeltxt,7.55,INK,'Inter')
        field(p,f'skills.{key}.bonus',179,yy-12,31,14,fontsize=8.0,align=1)
        checkhex(p,f'skills.{key}.proficient',220,yy-5,3.8,description=f'{sk} proficiency')
        checkhex(p,f'skills.{key}.expertise',247,yy-5,3.8,description=f'{sk} expertise')
    l(p,40,751,'Languages');field(p,'identity.languages',40,755,98,28,multiline=True,fontsize=7.8)
    l(p,145,751,'Tools / other training');field(p,'identity.training',145,755,106,28,multiline=True,fontsize=7.8)

    section(p,274,358,294,130,'Hit points / hit dice / survival')
    for x,w,key,lbl in [(286,59,'max_hp','Max HP'),(351,59,'current_hp','Current'),(416,57,'temp_hp','Temp HP')]:
        l(p,x,390,lbl);field(p,f'combat.{key}',x,395,w,17,fontsize=9.7,align=1)
    l(p,479,390,'Hit die');field(p,'combat.hit_dice.type',479,395,37,17,fontsize=8.5)
    l(p,522,390,'Left/total');field(p,'combat.hit_dice.remaining',522,395,17,17,fontsize=8.4);text(p,542,409,'/',7,MUTED,'Inter');field(p,'combat.hit_dice.total',549,395,12,17,fontsize=8.2)
    l(p,286,425,'Death saves');l(p,370,425,'Success',5.8);l(p,459,425,'Failure',5.8)
    for j in range(1,4):
        checkhex(p,f'combat.death_saves.success.{j}',415+(j-1)*13,421,5.0)
        checkhex(p,f'combat.death_saves.failure.{j}',511+(j-1)*13,421,5.0)
    l(p,286,453,'Exhaustion (fill from left)');
    for j in range(1,7):checkhex(p,f'combat.exhaustion.level.{j}',455+(j-1)*19,451,6.0,caption=str(j))
    l(p,286,479,'Conditions');field(p,'combat.conditions',349,465,208,17,fontsize=7.7,description='Currently active conditions')

    section(p,274,494,294,158,'Attacks / weapons','FIVE QUICK ENTRIES')
    colhead(p,['Attack / weapon','Hit','Damage / type','Range'],[286,395,432,513],535)
    for i in range(1,6):
        yy=540+(i-1)*20.6
        field(p,f'attacks.{i}.name',286,yy,103,18,fontsize=7.8)
        field(p,f'attacks.{i}.attack_bonus',395,yy,31,18,fontsize=8,align=1)
        field(p,f'attacks.{i}.damage',432,yy,75,18,fontsize=7.2)
        field(p,f'attacks.{i}.range',513,yy,43,18,fontsize=7.2)

    section(p,274,659,294,137,'At-a-glance / actions','DETAILED RULES ON OTHER PAGES')
    l(p,286,704,'Spell atk');field(p,'combat.spell_attack_bonus',352,691,45,18)
    l(p,409,704,'Passive Insight');field(p,'combat.passive_insight',485,691,70,18)
    for k,title_,yy in [('action','Action',724),('bonus_action','Bonus action',748),('reaction','Reaction',771)]:
        l(p,286,yy+13,title_,6.35)
        field(p,f'combat.quick.{k}',362,yy,195,20,fontsize=8.0)
    return p

def do_page2():
    p=page('Combat / resources',2)
    section(p,27,88,541,230,'Attack list / action details','INCLUDE RANGE, PROPERTIES, MASTERY (IF APPLICABLE)')
    colhead(p,['Attack / weapon','To hit','Damage / type','Range / mastery / notes'],[41,230,295,411],128)
    for i in range(1,11):
        y=136+(i-1)*16.6
        for key,x,w,size in [('name',41,181,7.9),('attack_bonus',230,57,8.2),('damage',295,108,7.9),('properties',411,143,7.5)]:
            field(p,f'combat.details.attacks.{i}.{key}',x,y,w,15.5,fontsize=size)
    l(p,41,304,'Other attacks / special interactions');field(p,'combat.details.extra_attack_notes',238,290,315,18,fontsize=8)

    section(p,27,328,541,171,'Class resources / limited uses','FREEFORM: KI, RAGE, WILD SHAPE, PACT MAGIC, ETC.')
    colhead(p,['Resource','Current','Maximum','Reset / note'],[41,280,354,425],367)
    for i in range(1,7):
        y=374+(i-1)*19.2
        for key,x,w in [('name',41,231),('current',280,65),('maximum',354,63),('recharge',425,129)]:
            field(p,f'resources.{i}.{key}',x,y,w,17,fontsize=8)

    section(p,27,510,264,154,'Action / bonus action options')
    lined_multiline(p,'combat.action_options',41,546,236,100,'List your useful actions and bonus actions',4)
    section(p,302,510,266,154,'Reactions / special attacks')
    lined_multiline(p,'combat.reaction_options',317,546,237,100,'Triggers, effects and limits',4)
    section(p,27,673,541,122,'Defences / senses / current effects')
    for x,w,key,lbl in [(41,119,'resistances','Resistances'),(170,119,'immunities','Immunities'),(299,119,'vulnerabilities','Vulnerabilities'),(427,127,'senses','Senses')]:
        l(p,x,711,lbl);field(p,f'combat.{key}',x,716,w,21,fontsize=8)
    lined_multiline(p,'combat.notes',41,743,513,43,'Other ongoing effects or combat notes',2)
    return p

def do_page3():
    p=page('Spellbook / magic',3)
    section(p,27,88,541,93,'Spellcasting profile / focus')
    row=[(41,93,'casting_ability','Ability'),(142,93,'save_dc','Save DC'),(243,93,'attack_bonus','Attack bonus'),(344,91,'prepared_count','Prepared #'),(443,111,'spell_focus','Focus / component pouch')]
    for x,w,k,lbl in row:l(p,x,132,lbl);field(p,f'magic.{k}',x,138,w,19)
    section(p,27,190,541,120,'Spell slot tracking','FILL IN TOTAL / EXPENDED FOR EACH LEVEL')
    for i in range(1,10):
        col=(i-1)%3;row=(i-1)//3; x=41+col*178; y=227+row*25
        l(p,x,y+10,f'LEVEL {i}',6.4)
        field(p,f'magic.slots.{i}.total',x+60,y,44,20,fontsize=8.9,align=1)
        text(p,x+109,y+15,'/',8.0,MUTED,'Inter')
        field(p,f'magic.slots.{i}.spent',x+122,y,42,20,fontsize=8.9,align=1)
    section(p,27,319,541,375,'Prepared / known spells','ONE LINE PER SPELL; ADD EXTRA PAGES IF NEEDED')
    l(p,41,356,'LVL');l(p,71,356,'SPELL');l(p,265,356,'RANGE / NOTES')
    l(p,304,356,'LVL');l(p,334,356,'SPELL');l(p,493,356,'NOTES')
    for i in range(1,25):
        col=(i-1)//12;row=(i-1)%12;x=41+col*263;y=364+row*25.1
        field(p,f'magic.spells.{i}.level',x,y,25,21,fontsize=8,align=1)
        field(p,f'magic.spells.{i}.name',x+30,y,156 if col==0 else 150,21,fontsize=8)
        field(p,f'magic.spells.{i}.notes',x+190 if col==0 else x+185,y,60 if col==0 else 65,21,fontsize=7.5)
    section(p,27,702,541,93,'Concentration / pact magic / special magic')
    l(p,41,740,'Concentration spell');field(p,'magic.concentration.current',41,746,169,22)
    l(p,219,740,'Pact slots left / total');field(p,'magic.pact.remaining',219,746,50,22);field(p,'magic.pact.total',276,746,47,22)
    l(p,336,740,'Special spell notes');field(p,'magic.special_notes',336,746,217,34,multiline=True)
    return p

def do_page4():
    p=page('Inventory / equipment',4)
    section(p,27,88,541,85,'Currency / valuables')
    for i,(key,label_) in enumerate([('cp','Copper'),('sp','Silver'),('ep','Electrum'),('gp','Gold'),('pp','Platinum')]):
        x=41+i*103;l(p,x,128,label_);field(p,'currency.'+key,x,134,94,23)
    section(p,27,183,541,373,'Equipment / carried items','SPACE FOR 17 ENTRIES')
    colhead(p,['Item / description','Quantity','Weight','Location / details'],[41,296,362,418],220)
    for i in range(1,18):
        y=228+(i-1)*18.6
        for key,x,w in [('name',41,245),('quantity',296,57),('weight',362,47),('notes',418,136)]:
            field(p,f'inventory.items.{i}.{key}',x,y,w,17.0,fontsize=8)
    section(p,27,568,541,84,'Attuned items','USUALLY THREE, UNLESS A FEATURE CHANGES THAT LIMIT')
    for i in range(1,4):
        x=41+(i-1)*174;l(p,x,605,f'Attuned item {i}');field(p,f'inventory.attunement.{i}',x,612,165,26)
    section(p,27,663,541,131,'Treasure / carrying capacity / storage')
    l(p,41,701,'Carry weight');field(p,'inventory.carry_weight',41,708,83,20)
    l(p,131,701,'Carrying capacity');field(p,'inventory.capacity',131,708,116,20)
    l(p,256,701,'Storage / stash');field(p,'inventory.storage',256,708,299,20)
    lined_multiline(p,'inventory.treasure_notes',41,740,513,42,'Treasures, parcels, valuables, or other notes',2)
    return p

def do_page5():
    p=page('Features / story',5)
    section(p,27,88,541,166,'Character portrait / physical details')
    # Portrait hex is deliberately a drawable region for paper, and a text field for asset URL
    hexpath(p,100,175,55,57,LINE,.8,None,.75)
    tcenter(p,100,178,'PORTRAIT',6.9,MUTED,'InterB')
    l(p,172,132,'Age / height / build');field(p,'story.appearance.age_height',172,137,179,19)
    l(p,362,132,'Eyes / hair');field(p,'story.appearance.eyes_hair',362,137,191,19)
    l(p,172,169,'Appearance / distinguishing features');field(p,'story.appearance.description',172,174,382,41,multiline=True)
    l(p,172,222,'Portrait image reference');field(p,'story.appearance.portrait_url',172,228,381,18,fontsize=7.8)

    section(p,27,265,541,179,'Features / traits / feats','EFFECTS AND USAGE DETAILS')
    for i in range(1,8):
        y=306+(i-1)*19.0
        field(p,f'features.{i}.name',41,y,174,18,fontsize=8)
        field(p,f'features.{i}.effect',226,y,326,18,fontsize=8)
    section(p,27,456,541,145,'Personality / motivations')
    for i,(key,lbl) in enumerate([('traits','Traits'),('ideals','Ideals'),('bonds','Bonds'),('flaws','Flaws')]):
        x=41+(i%2)*263;y=492+(i//2)*51
        l(p,x,y,lbl);field(p,f'story.{key}',x,y+5,250,38,multiline=True,fontsize=8)
    section(p,27,612,541,182,'Backstory / connections / allies')
    lined_multiline(p,'story.backstory',41,647,513,70,'Backstory / character-defining events',3)
    lined_multiline(p,'story.allies',41,730,513,49,'Allies, rivals, factions and relationships',2)
    return p

def do_page6():
    p=page('Adventure journal',6)
    section(p,27,88,541,82,'Campaign / session')
    for x,w,key,lbl in [(41,175,'campaign','Campaign'),(225,102,'session','Session / date'),(336,103,'location','Location'),(448,105,'quest','Current quest')]:
        l(p,x,127,lbl);field(p,f'journal.{key}',x,133,w,21)
    section(p,27,181,541,420,'Session notes / discoveries','TYPE DIRECTLY OR WRITE BY HAND')
    for i in range(1,3):
        # Two large independent fields work better than one immense AcroForm field on mobile
        y=219+(i-1)*182
        lined_multiline(p,f'journal.notes.{i}',41,y,512,172,None,8)
    section(p,27,612,541,182,'Goals / milestones / follow-up')
    lined_multiline(p,'journal.quests',41,650,512,64,'Quests / leads / unresolved questions',3)
    lined_multiline(p,'journal.milestones',41,733,512,44,'Milestones / plans before next session',2)
    return p

COND_2014 = [
    ('Blinded','No sight; sight-based checks fail. Attacks against you have advantage; your attacks have disadvantage.'),
    ('Charmed','Cannot attack or harm the charmer; charmer has advantage on social checks with you.'),
    ('Deafened','Cannot hear; hearing-based checks fail.'),
    ('Frightened','Disadvantage on checks and attacks while fear source is in sight; cannot willingly approach it.'),
    ('Grappled','Speed is 0; no benefit from Speed bonuses. Ends if grappler is incapacitated or you move beyond reach.'),
    ('Incapacitated','Cannot take actions or reactions.'),
    ('Invisible','Cannot be seen without special sense/magic; attacks against you have disadvantage, yours advantage.'),
    ('Paralyzed','Incapacitated; cannot move or speak; fail STR/DEX saves; attacks against you advantage; close hits crit.'),
    ('Petrified','Incapacitated; no movement; attacks vs you advantage; fail STR/DEX saves; resist all damage; immune to poison and disease.'),
    ('Poisoned','Disadvantage on attack rolls and ability checks.'),
    ('Prone','Crawl or spend half Speed to stand. Your attacks have disadvantage; close attacks vs you advantage.'),
    ('Restrained','Speed 0; attacks against you advantage; yours disadvantage; disadvantage on DEX saves.'),
    ('Stunned','Incapacitated; cannot move; faltering speech; fail STR/DEX saves; attacks against you advantage.'),
    ('Unconscious','Incapacitated, prone, cannot move/speak, unaware; fail STR/DEX saves; attacks vs you advantage; close hits crit.')]
COND_2024 = [
    ('Blinded','Cannot see; sight-based checks fail. Attacks against you have advantage; yours disadvantage.'),
    ('Charmed','Cannot attack/harm charmer. Charmer has advantage on social checks with you.'),
    ('Deafened','Cannot hear; hearing-based checks fail.'),
    ('Frightened','Disadvantage on checks and attacks while fear source in sight; cannot willingly approach it.'),
    ('Grappled','Speed 0; disadvantage attacking creatures other than grappler; grappler may drag or carry you.'),
    ('Incapacitated','Cannot act, take bonus actions or reactions; concentration ends; cannot speak; initiative disadvantage.'),
    ('Invisible','Advantage on initiative; concealment; your attacks advantage, attacks vs you disadvantage unless seen.'),
    ('Paralyzed','Incapacitated; Speed 0; fail STR/DEX saves; attacks vs you advantage, close hits crit.'),
    ('Petrified','Incapacitated; Speed 0; fail STR/DEX saves; attacks vs you advantage; resist all damage; immune to Poisoned condition.'),
    ('Poisoned','Disadvantage on ability checks and attack rolls.'),
    ('Prone','Crawl or spend half Speed standing; your attacks disadvantage; attacks within 5 ft vs you advantage, farther attacks disadvantage.'),
    ('Restrained','Speed 0; attacks against you advantage; yours disadvantage; disadvantage on DEX saves.'),
    ('Stunned','Incapacitated; fail STR/DEX saves; attacks against you advantage.'),
    ('Unconscious','Incapacitated and prone; drop held items; Speed 0; fail STR/DEX saves; attacks advantage, close hits crit.')]

def wrap_text(p,tx,max_w,fontsize=7.3):
    f=fitz.Font(fontfile=INTER)
    words=tx.split();lines=[];cur=''
    for word in words:
        nxt=(cur+' '+word).strip()
        if f.text_length(nxt,fontsize=fontsize)<=max_w:cur=nxt
        else:
            if cur:lines.append(cur)
            cur=word
    if cur:lines.append(cur)
    return lines

def do_page7():
    p=page('Rules / condition reference',7)
    section(p,27,87,541,95,f'Exhaustion / {ED} rules','CUMULATIVE: FILL ONE HEX PER LEVEL ON PAGE 1')
    if ED=='2014':
        effects=['1: Disadvantage on ability checks', '2: Speed halved', '3: Disadvantage on attacks and saves',
                 '4: Hit point maximum halved','5: Speed reduced to 0','6: Death']
        for j,s in enumerate(effects):
            xx=41+(j%2)*260; yy=124+(j//2)*17
            hexpath(p,xx+4,yy-3,4.5,4.5,VIOLET,.65)
            text(p,xx+18,yy,s,8.15,INK,'Inter')
        text(p,41,177,'Recovery: a Long Rest removes 1 level if you have eaten and drunk.',7.1,MUTED,'Inter')
    else:
        text(p,41,125,'Each exhaustion level: -2 to every D20 Test and -5 ft. to Speed.',9.6,INK,'InterB')
        text(p,41,144,'Effects stack; Speed minimum 0. Level 6 = death. Long Rest removes 1 level.',8.8,INK,'Inter')
        text(p,41,162,'Examples: level 2 = -4 D20 Tests / -10 ft.; level 5 = -10 / -25 ft.',8.0,MUTED,'Inter')
    section(p,27,193,541,506,'Condition quick reference','SUMMARY ONLY - REFER TO FULL RULES FOR EDGE CASES')
    conds=COND_2014 if ED=='2014' else COND_2024
    # 2 columns x 7 rows. Each 68 points, headline + ~3 lines content.
    for i,(name,desc) in enumerate(conds):
        col=i//7; row=i%7;x=40+col*264; yy=234+row*65.3
        hexpath(p,x+5,yy+2,4.2,4.2,VIOLET,.65)
        text(p,x+17,yy+5,name.upper(),8.0,INK,'InterB')
        for k,linetxt in enumerate(wrap_text(p,desc,242,7.35)[:4]):
            text(p,x+2,yy+19+k*11,linetxt,7.35,INK,'Inter')
        line(p,x,yy+59,x+243,yy+59,LINE,.42)
    section(p,27,709,541,88,'Quick formulae / source credit')
    text(p,40,741,'Ability mod = floor((score - 10) / 2).  Spell save DC = 8 + prof + casting mod + bonuses.',7.8,INK,'Inter')
    text(p,40,754,'Concentration check after damage: CON save DC 10 or half damage (down), whichever is higher.',7.6,INK,'Inter')
    if ED == '2014':
        attribution = ('This work includes material taken from the System Reference Document 5.1 '
          '(“SRD 5.1”) by Wizards of the Coast LLC and available at '
          'https://dnd.wizards.com/resources/systems-reference-document. '
          'The SRD 5.1 is licensed under the Creative Commons Attribution 4.0 International License '
          'available at https://creativecommons.org/licenses/by/4.0/legalcode.')
    else:
        attribution = ('This work includes material from the System Reference Document 5.2.1 '
          '(“SRD 5.2.1”) by Wizards of the Coast LLC, available at '
          'https://www.dndbeyond.com/srd. The SRD 5.2.1 is licensed under the '
          'Creative Commons Attribution 4.0 International License, available at '
          'https://creativecommons.org/licenses/by/4.0/legalcode.')
    # Attribution is intentionally visible and text-selectable, not metadata-only.
    # Original reference descriptions are adaptations of SRD rules, not exact rules text.
    for j, ln in enumerate(wrap_text(p, attribution, 512, 6.1)):
        text(p,40,766+j*8.2,ln,6.1,MUTED,'Inter')
    return p

PAGES=[do_page1,do_page2,do_page3,do_page4,do_page5,do_page6,do_page7]

def create(edition,mono=False):
    global DOC, ED, FIELD_REG, MONO, INK, MUTED, LINE, VIOLET, PINK, BLUE, GRAY
    ED=edition;MONO=mono;FIELD_REG=[];DOC=fitz.open()
    if MONO:
        INK=(.13,.13,.13);MUTED=(.39,.39,.39);LINE=(.65,.65,.65)
        VIOLET=(.36,.36,.36);PINK=BLUE=VIOLET;GRAY=VIOLET
    else:
        INK=(30/255,45/255,62/255);MUTED=(102/255,122/255,145/255);LINE=(194/255,207/255,222/255)
        VIOLET=(176/255,77/255,255/255);PINK=(255/255,61/255,139/255);BLUE=(79/255,179/255,255/255);GRAY=(80/255,80/255,80/255)
    for fn in PAGES:fn()
    DOC.set_metadata({'title':f'Rookie Quest Keeper - Interactive Character Sheet ({edition} edition) V6',
        'author':'Rookie Quest Keeper','subject':'Seven-page A4 fillable 5E-compatible character sheet: AcroForm fields, printable and editable'})
    variant='BW' if MONO else 'Colour'
    target=ROOT/f'RQK_Character_Sheet_V6_{edition}_{variant}_Editable.pdf'
    DOC.save(target,garbage=4,deflate=True)
    # Fields layout is the stable handoff contract for the online character data exporter.
    schema={'edition':edition,'version':'6.0','page_size':'A4','format':'AcroForm',
       'description':'Named editable AcroForm fields for handwritten, tablet and future Keeper website exports; proposed schema not yet wired to live account data.',
       'source_urls':[
        'https://www.dndbeyond.com/srd',
        'https://dnd.wizards.com/resources/systems-reference-document',
        'https://creativecommons.org/licenses/by/4.0/legalcode'],
       'value_rules':{
          'checkbox':'Set checked widget to its on_state; otherwise Off',
          'exhaustion':'For numeric exhaustion N, check combat.exhaustion.level.1 through level.N, leaving remaining unchecked.',
          'ability_modifier':'floor((ability_score - 10) / 2)',
          'proficiency_bonus_by_level':'2 (1-4), 3 (5-8), 4 (9-12), 5 (13-16), 6 (17-20), barring special rules',
          'spell_save_dc':'8 + spellcasting ability modifier + proficiency bonus + other applicable bonuses',
          'spell_attack_bonus':'spellcasting ability modifier + proficiency bonus + applicable bonuses',
          'expertise':'Generally doubles proficiency bonus for relevant proficient skills; special features may differ',
          'hit_dice':'Store type, remaining and total separately; multiclass characters with multiple types should specify them on page 2.',
          '2014_long_rest':'Regains up to half of total Hit Dice (minimum one)',
          '2024_long_rest':'Regains all spent Hit Point Dice',
          '2014_inspiration':'Inspiration', '2024_inspiration':'Heroic Inspiration',
       },'fields':FIELD_REG}
    sfile=ROOT/f'RQK_Character_Sheet_V6_{edition}_Field_Map.json'
    sfile.write_text(json.dumps(schema,indent=2,ensure_ascii=False))
    print(edition,variant,len(DOC),len(FIELD_REG),'fields',os.path.getsize(target),'bytes')
    pix=DOC[0].get_pixmap(matrix=fitz.Matrix(1.6,1.6),alpha=False)
    pix.save(ROOT/f'RQK_Character_Sheet_V6_{edition}_{variant}_Page_1.png')
    images=[]
    for pg in DOC:
        pix=pg.get_pixmap(matrix=fitz.Matrix(.87,.87),alpha=False)
        im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
        im.thumbnail((430,610));images.append(im)
    out=Image.new('RGB',(4*448+18,2*630+18),(236,240,246)); dr=ImageDraw.Draw(out)
    for n,im in enumerate(images):
        x=18+(n%4)*448;y=18+(n//4)*630
        out.paste(im,(x,y));dr.rectangle((x,y,x+im.width,y+im.height),outline=(188,201,216),width=2)
    out.save(ROOT/f'RQK_Character_Sheet_V6_{edition}_{variant}_Overview.jpg',quality=90)
    DOC.close()

if __name__=='__main__':
    for edition in ('2014','2024'):
        for mono in (False,True):create(edition,mono)