import fitz, math, os
from PIL import Image, ImageOps, ImageDraw

OUT='/mnt/data'
PAGESIZE=fitz.paper_size('a4')
W,H=PAGESIZE
CINZ='/usr/share/texlive/texmf-dist/fonts/truetype/ndiscovered/cinzel/Cinzel-Bold.ttf'
CINZR='/usr/share/texlive/texmf-dist/fonts/truetype/ndiscovered/cinzel/Cinzel-Regular.ttf'
INTER='/usr/share/fonts/opentype/inter/Inter-Regular.otf'
INTERB='/usr/share/fonts/opentype/inter/Inter-SemiBold.otf'
NAVY=(7/255,21/255,34/255)
NAVY2=(10/255,35/255,66/255)
INK=(30/255,45/255,62/255)
MUTED=(102/255,122/255,145/255)
LINE=(194/255,207/255,222/255)
PINK=(255/255,61/255,139/255)
VIOLET=(176/255,77/255,255/255)
BLUE=(79/255,179/255,255/255)
LITE=(244/255,248/255,252/255)
WHITE=(1,1,1)
GRAY=(80/255,80/255,80/255)

def mix(a,b,t):return tuple(a[i]*(1-t)+b[i]*t for i in range(3))
def gradient(t,mono=False):
 if mono:return GRAY
 return mix(PINK,VIOLET,t*2) if t<=.5 else mix(VIOLET,BLUE,(t-.5)*2)

def init_page(doc, mono, name, n):
 p=doc.new_page(width=W,height=H)
 p.insert_font(fontname='Cinzel',fontfile=CINZ)
 p.insert_font(fontname='CinzelR',fontfile=CINZR)
 p.insert_font(fontname='Inter',fontfile=INTER)
 p.insert_font(fontname='InterB',fontfile=INTERB)
 header(p,mono,name,n)
 # The source website clips background motifs to the viewport.
 # Cover their off-strip parts before the editable paper panels are drawn.
 rect(p,0,84,W,720,fill=WHITE)
 footer(p,mono,name,n)
 return p

def rect(p,x,y,w,h,fill=None,stroke=None,sw=1,opacity=1):
 s=p.new_shape();s.draw_rect(fitz.Rect(x,y,x+w,y+h));s.finish(color=stroke,fill=fill,width=sw,fill_opacity=opacity,stroke_opacity=opacity);s.commit()
def line(p,x1,y1,x2,y2,col=LINE,width=.7,opacity=1):
 s=p.new_shape();s.draw_line(fitz.Point(x1,y1),fitz.Point(x2,y2));s.finish(color=col,width=width,stroke_opacity=opacity);s.commit()
def text(p,x,y,s,size=8,col=INK,font='Inter'):
 p.insert_text(fitz.Point(x,y),str(s),fontname=font,fontsize=size,color=col)
def tcenter(p,x,y,s,size=8,col=INK,font='Inter'):
 f=fitz.Font(fontfile={'Cinzel':CINZ,'CinzelR':CINZR,'Inter':INTER,'InterB':INTERB}[font]); text(p,x-f.text_length(s,fontsize=size)/2,y,s,size,col,font)
def text_end(p,x,y,s,size=8,col=INK,font='Inter'):
 f=fitz.Font(fontfile={'Cinzel':CINZ,'CinzelR':CINZR,'Inter':INTER,'InterB':INTERB}[font]); text(p,x-f.text_length(s,fontsize=size),y,s,size,col,font)
def grad_line(p,x,y,length,height=2,mono=False):
 if mono:rect(p,x,y,length,height,fill=(.27,.27,.27));return
 for i in range(120):
  xx=x+length*i/120; rect(p,xx,y,length/120+.2,height,fill=gradient(i/119))
def hexpath(p,cx,cy,rx,ry,col=LINE,width=.9,fill=None,opacity=1):
 points=[]
 for j in range(6):
  th=-math.pi/2+j*math.pi/3
  points.append(fitz.Point(cx+rx*math.cos(th),cy+ry*math.sin(th)))
 s=p.new_shape();s.draw_polyline(points+[points[0]]);s.finish(color=col,fill=fill,width=width,stroke_opacity=opacity,fill_opacity=opacity);s.commit()
def little_hex(p,x,y,r,mono=False,fill=False):
 hexpath(p,x,y,r,r,GRAY if mono else VIOLET,1.15,(.85,.85,.85) if mono and fill else ((.95,.93,1) if fill else None),.9)
def wheel(p,cx,cy,r,mono=False,opacity=.24):
 c=GRAY if mono else BLUE
 for rr in (r,r*.66,r*.34):hexpath(p,cx,cy,rr,rr,c,.8,None,opacity)
 for i in range(6):
  ang=math.pi*i/3-math.pi/2
  line(p,cx+r*.38*math.cos(ang),cy+r*.38*math.sin(ang),cx+r*.93*math.cos(ang),cy+r*.93*math.sin(ang),c,.65,opacity)


# The header and footer use the SAME Dusk Sky stops and static
# HexBackdrop case / 80%-radius ring / half-size inner hex motif as the site.
SKY_STOPS = [
 (0,(10/255,35/255,66/255)),
 (.45,(13/255,33/255,71/255)),
 (.78,(42/255,27/255,79/255)),
 (1,(74/255,31/255,82/255)),
]
def sky(t):
 t=max(0,min(1,t))
 for i in range(len(SKY_STOPS)-1):
  a,ca=SKY_STOPS[i];b,cb=SKY_STOPS[i+1]
  if t<=b:
   return mix(ca,cb,(t-a)/(b-a))
 return SKY_STOPS[-1][1]

def sky_strip(p,y,h,top_t,bottom_t,mono=False):
 for i in range(85):
  yy=y+h*i/85
  t=top_t+(bottom_t-top_t)*(i+.5)/85
  c=(.968,.968,.968) if mono else sky(t)
  rect(p,0,yy,W,h/85+.5,fill=c)

def ring_circle(p,cx,cy,r,col,width=.65,opacity=.16):
 s=p.new_shape(); s.draw_circle(fitz.Point(cx,cy),r)
 s.finish(color=col,width=width,stroke_opacity=opacity);s.commit()

def backdrop_motif(p,cx,cy,r,mono=False,hot=False,opacity=.17):
 # This is the exact *shape construction* used by HexBackdrop.js:
 # full pointy hex, 0.8-radius circle, half-size hex rotated 30 deg.
 base=GRAY if mono else ((1,.42,.61) if hot else VIOLET)
 op=opacity*.69 if mono else opacity
 hexpath(p,cx,cy,r,r,base,.7,None,op)
 ring_circle(p,cx,cy,r*.8,base,.65,op*.55)
 # rotated inner hex: the website uses scale(0.5) rotate(30)
 pts=[]
 for i in range(6):
  ang=math.radians(-90+60*i+30)
  pts.append(fitz.Point(cx+.5*r*math.cos(ang),cy+.5*r*math.sin(ang)))
 s=p.new_shape();s.draw_polyline(pts+[pts[0]])
 s.finish(color=base,width=.65,stroke_opacity=op*.4);s.commit()

def make_badge_image(path,mono=False):
 # Faithful print-sized vector redraw of the current hex RQK badge
 # (the site has no available local PNG in this PDF workspace).
 # RQK wordmark, deep-navy fill, double pointy border, lettering on slopes.
 from PIL import ImageFont
 scale=3;w=300;h=350
 im=Image.new('RGBA',(w*scale,h*scale),(0,0,0,0)); d=ImageDraw.Draw(im)
 def pt(x,y):return (round(x*scale),round(y*scale))
 def colmix(a,b,t):return tuple(round(a[k]*(1-t)+b[k]*t) for k in range(3))+(255,)
 outer=[pt(*q) for q in [(150,3),(297,88),(297,263),(150,347),(3,263),(3,88)]]
 inner=[pt(*q) for q in [(150,64),(248,121),(248,231),(150,290),(52,231),(52,121)]]
 bg=(255,255,255,255) if mono else (10,21,46,255);d.polygon(outer,fill=bg)
 if mono:
  ends=[(32,32,32)]*7
 else:
  ends=[(255,176,102),(255,61,139),(176,77,255),(255,61,139),(255,176,102),(176,77,255),(255,176,102)]
 def colored_line(a,b,rgb1,rgb2,width):
  for j in range(60):
   t=j/60;u=(j+1)/60
   a0=(a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t)
   b0=(a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u)
   d.line((a0,b0),fill=colmix(rgb1,rgb2,t),width=width*scale,joint='curve')
 for j in range(6):colored_line(outer[j],outer[(j+1)%6],ends[j],ends[j+1],2)
 for j in range(6):colored_line(inner[j],inner[(j+1)%6],ends[(j+1)%6],ends[(j+2)%7],4)
 # Stylised, readable 3-letter mark rather than tiny legacy "RQK" text.
 fmark='/usr/share/fonts/truetype/dejavu/DejaVuSansCondensed-Bold.ttf'
 fr='/usr/share/texlive/texmf-dist/fonts/truetype/ndiscovered/cinzel/Cinzel-Bold.ttf'
 fm=ImageFont.truetype(fmark,88*scale)
 fl=ImageFont.truetype(fmark,20*scale)
 for word,xy,font,anchor in [('RQK',(150,191),fm,'mm'),('ROOKIE QUEST',(150,104),fl,'mm'),('KEEPER',(150,262),fl,'mm')]:
  box=d.textbbox(pt(*xy),word,font=font,anchor=anchor)
  m=Image.new('L',im.size,0); md=ImageDraw.Draw(m)
  md.text(pt(*xy),word,font=font,fill=255,anchor=anchor,stroke_width=0)
  gradient_im=Image.new('RGBA',im.size,0)
  g=ImageDraw.Draw(gradient_im)
  for x in range(box[0],box[2]):
   t=(x-box[0])/max(1,box[2]-box[0]); q=(32,32,32,255) if mono else colmix((255,176,102),(176,77,255),t)
   g.line([(x,max(0,box[1])),(x,min(im.height,box[3]))],fill=q,width=1)
  im.paste(gradient_im,(0,0),m)
 im.resize((600,700),Image.Resampling.LANCZOS).save(path,optimize=True)

def header(p,mono,name,n):
 sky_strip(p,0,84,0,.52,mono)
 # Static backdrop: five large motifs, often cropped by the header boundary.
 # No little hexagonal tiles or nested angular grids from the older design.
 backdrop_motif(p,-46,13,115,mono,False,.19)
 backdrop_motif(p,488,16,107,mono,False,.23)
 backdrop_motif(p,608,49,67,mono,True,.17)
 backdrop_motif(p,289,93,74,mono,False,.09)
 fg=INK if mono else WHITE
 muted=MUTED if mono else (.79,.84,.90)
 badge='/mnt/data/rqk_badge_redraw_'+('mono' if mono else 'colour')+'.png'
 if not os.path.isfile(badge):make_badge_image(badge,mono)
 p.insert_image(fitz.Rect(25,3,91,81),filename=badge,keep_proportion=True,overlay=True)
 text(p,107,19,'ROOKIE QUEST KEEPER',7.0,muted,'InterB')
 text(p,106,48,name.upper(),18.0,fg,'Cinzel')
 text(p,107,66,'PRINTABLE CHARACTER LEDGER    /    HANDWRITTEN EDITION',7.1,muted,'Inter')
 grad_line(p,0,81,W,2.3,mono)

def footer(p,mono,name,n):
 # Bottom portion of the real backdrop sky is dusk-purple.
 sky_strip(p,805,H-805,.70,1,mono)
 grad_line(p,0,804,W,1.8,mono)
 fg=INK if mono else WHITE
 subtle=MUTED if mono else (.79,.84,.9)
 text(p,29,823,'ROOKIE QUEST KEEPER',8,fg,'Cinzel')
 text(p,30,835,'HANDWRITTEN EDITION    •    KEEP THIS STORY YOURS',6.0,subtle,'Inter')
 text_end(p,W-29,829,f'{n:02d} / 06',9.0,fg,'InterB')

def poly_panel(p,x,y,w,h,col=LINE,fill=WHITE,mono=False):
 # angular, cut-corner panel to echo website's hexagonal UI
 k=8
 points=[fitz.Point(x+k,y),fitz.Point(x+w-k,y),fitz.Point(x+w,y+k),fitz.Point(x+w,y+h-k),fitz.Point(x+w-k,y+h),fitz.Point(x+k,y+h),fitz.Point(x,y+h-k),fitz.Point(x,y+k),fitz.Point(x+k,y)]
 s=p.new_shape();s.draw_polyline(points);s.finish(color=col,fill=fill,width=.85);s.commit()

def panel(p,x,y,w,h,label,mono=False,tag=None):
 poly_panel(p,x,y,w,h,mono=mono)
 grad_line(p,x+11,y+2,w-22,1.9,mono)
 little_hex(p,x+17,y+17,5,mono,True)
 text(p,x+29,y+21,label.upper(),9.5,INK,'Cinzel')
 if tag:text_end(p,x+w-14,y+20,tag,6.8,MUTED,'InterB')
 line(p,x+12,y+29,x+w-12,y+29,LINE,.6)
 return y+34

def label(p,x,y,s):text(p,x,y,s.upper(),6.9,MUTED,'InterB')
def inputline(p,x,y,w,labeltxt,baseline=17):
 label(p,x,y,labeltxt)
 line(p,x,y+baseline,x+w,y+baseline,LINE,.85)
def check(p,x,y,size=8):rect(p,x,y,size,size,stroke=INK,sw=.75)
def tiny_circle(p,cx,cy,r=3.2,mono=False):
 s=p.new_shape();s.draw_circle(fitz.Point(cx,cy),r);s.finish(color=GRAY if mono else MUTED,width=.8);s.commit()
def ruling(p,x,y,w,count,step=21):
 for i in range(count):line(p,x,y+i*step,x+w,y+i*step,LINE,.55)

def page1(doc,mono):
 p=init_page(doc,mono,'Character ledger',1)
 y=101; panel(p,27,y,541,102,'Identity',mono,'YOUR CHARACTER')
 # row 1
 for x,w,s in [(42,240,'Character name'),(295,111,'Class & subclass'),(421,130,'Level / XP')]:inputline(p,x,144,w,s)
 for x,w,s in [(42,117,'Player'),(171,117,'Ancestry / species'),(298,119,'Background'),(429,122,'Alignment / pronouns')]:inputline(p,x,181,w,s)
 text(p,28,222,'THE SIX ABILITIES',9.5,INK,'Cinzel')
 text_end(p,565,222,'SCORE  /  MODIFIER  /  SAVE (FILL DOT FOR PROFICIENCY)',6.6,MUTED,'InterB')
 abils=[('STR','STRENGTH'),('DEX','DEXTERITY'),('CON','CONSTITUTION'),('INT','INTELLIGENCE'),('WIS','WISDOM'),('CHA','CHARISMA')]
 for i,(abbr,name) in enumerate(abils):
  x=27+i*91.4;cx=x+42.5; cy=283;rx=41.3;ry=52
  hexpath(p,cx,cy,rx,ry,GRAY if mono else gradient(i/5),1.45,WHITE,1)
  tcenter(p,cx,249,abbr,9.5,INK,'Cinzel')
  # Character sheets must accommodate both the ability value and the modifier.
  rect(p,cx-16.5,254,33,22,stroke=LINE,sw=.85)
  tcenter(p,cx,284,'MOD',6.1,MUTED,'InterB')
  line(p,cx-14,295,cx+14,295,LINE,.8)
  tcenter(p,cx,308,'SAVE',6.0,MUTED,'InterB')
  line(p,cx-3,319,cx+17,319,LINE,.8)
  tiny_circle(p,cx-13,317,3.0,mono)  # fill this if proficient in the save
 panel(p,27,344,541,81,'Defences & movement',mono)
 widths=[104,101,104,105,95]
 xx=42
 for label_,w in zip(['Armour class','Initiative','Speed','Proficiency','Passive perception'],widths):
  inputline(p,xx,386,w-10,label_)
  xx+=w
 panel(p,27,436,541,92,'Hit points & survival',mono)
 for x,w,s in [(42,108,'HP maximum'),(160,107,'HP current'),(277,108,'Temporary HP'),(395,154,'Hit dice / total')]:inputline(p,x,474,w,s)
 label(p,42,508,'Death saves');text(p,120,508,'SUCCESS',7,INK,'InterB')
 for xx in (163,178,193):tiny_circle(p,xx,505,3.6,mono)
 text(p,261,508,'FAILURE',7,INK,'InterB')
 for xx in (304,319,334):tiny_circle(p,xx,505,3.6,mono)
 text(p,395,509,'INSPIRATION',7,INK,'InterB');check(p,474,501,9)
 panel(p,27,540,541,251,'Skills & training',mono,'TICK PROFICIENCY  /  WRITE BONUS')
 skills=['Acrobatics (DEX)','Animal Handling (WIS)','Arcana (INT)','Athletics (STR)','Deception (CHA)','History (INT)','Insight (WIS)','Intimidation (CHA)','Investigation (INT)','Medicine (WIS)','Nature (INT)','Perception (WIS)','Performance (CHA)','Persuasion (CHA)','Religion (INT)','Sleight of Hand (DEX)','Stealth (DEX)','Survival (WIS)']
 # 2 columns, 9 skills each
 for i,skill in enumerate(skills):
  col=i//9;row=i%9;x=42+col*263;yy=588+row*18
  check(p,x,yy-8,8);text(p,x+17,yy,skill,8.4,INK,'Inter');line(p,x+192,yy+2,x+241,yy+2,LINE,.75)
 line(p,298,578,298,754,LINE,.6)
 line(p,42,756,551,756,LINE,.7)
 inputline(p,42,768,243,'Languages',baseline=16)
 inputline(p,306,768,245,'Tools / other proficiencies',baseline=16)
 return p

def page2(doc,mono):
 p=init_page(doc,mono,'Combat & features',2)
 panel(p,27,101,541,178,'Attacks & weapons',mono,'STANDARD / SPECIAL / RANGED')
 labels=['Attack / weapon','Attack bonus','Damage & type','Range / properties']
 xx=[42,239,329,442]; ws=[183,78,99,109]
 for x,s in zip(xx,labels):label(p,x,145,s)
 for i in range(5):
  yy=169+i*20
  for x,w in zip(xx,ws):line(p,x,yy,x+w,yy,LINE,.7)
 panel(p,27,290,541,128,'Action economy',mono)
 cw=165
 for i,(name,tag) in enumerate([('Actions','YOUR TURN'),('Bonus actions','YOUR TURN'),('Reactions','ANY TURN')]):
  x=42+i*171
  text(p,x,337,name,9,INK,'InterB');text(p,x,350,tag,6.6,MUTED,'Inter')
  ruling(p,x,369,cw,3,16)
  if i<2:line(p,x+166,328,x+166,399,LINE,.7)
 panel(p,27,430,541,235,'Features & traits',mono)
 text(p,42,471,'CLASS & ANCESTRY FEATURES',7.1,MUTED,'InterB')
 text(p,309,471,'FEATS & SPECIAL ABILITIES',7.1,MUTED,'InterB')
 ruling(p,42,488,240,9,17.5)
 ruling(p,310,488,240,9,17.5)
 line(p,296,470,296,644,LINE,.7)
 panel(p,27,677,541,114,'Resources, rests & conditions',mono)
 inputline(p,42,719,98,'Hit dice remaining')
 inputline(p,152,719,119,'Long / short rest')
 inputline(p,285,719,124,'Exhaustion level')
 inputline(p,421,719,130,'Conditions')
 text(p,42,764,'TRACKED USES',7,MUTED,'InterB')
 for i in range(14):tiny_circle(p,146+i*23.6,761,3.8,mono)
 return p

def page3(doc,mono):
 p=init_page(doc,mono,'Spellbook',3)
 panel(p,27,101,541,90,'Spellcasting overview',mono)
 for x,w,s in [(42,150,'Spellcasting class / ability'),(211,97,'Spell save DC'),(324,105,'Spell attack bonus'),(447,104,'Prepared / known')]:inputline(p,x,143,w,s)
 text(p,43,179,'CONCENTRATION  /  RITUALS  /  COMPONENTS  /  SPELL FOCUS',6.8,MUTED,'InterB')
 panel(p,27,201,541,144,'Spell slot tracker',mono,'MARK AVAILABLE / EXPENDED')
 for idx in range(9):
  col=idx%3;row=idx//3;x=44+col*171;y=251+row*31
  text(p,x,y,f'LEVEL {idx+1}',7.5,INK,'InterB')
  for k in range(5):tiny_circle(p,x+84+k*14,y-3,3.2,mono)
  line(p,x,y+7,x+155,y+7,LINE,.5)
 panel(p,27,355,541,105,'Cantrips & at-will magic',mono)
 for i in range(2):
  x=42+i*265
  for j in range(3):line(p,x,404+j*17,x+243,404+j*17,LINE,.68)
 panel(p,27,471,541,320,'Known / prepared spells',mono,'LEVEL  /  SPELL  /  NOTES')
 for col in range(2):
  x=41+col*267
  label(p,x,517,'LVL');label(p,x+44,517,'Spell name / quick reminder')
  for j in range(13):
   yy=540+j*18
   line(p,x,yy,x+27,yy,LINE,.6)
   line(p,x+40,yy,x+245,yy,LINE,.6)
   if j%2==1:
    # tiny accent ticks on left of alternating row
    line(p,x+31,yy-4,x+36,yy-4,GRAY if mono else VIOLET,.8)
 if not mono:line(p,295,510,295,778,LINE,.6)
 return p

def page4(doc,mono):
 p=init_page(doc,mono,'Inventory',4)
 panel(p,27,101,541,89,'Currency & valuables',mono)
 vals=['COPPER','SILVER','ELECTRUM','GOLD','PLATINUM']
 for i,s in enumerate(vals):
  x=42+i*103
  label(p,x,147,s)
  line(p,x,173,x+85,173,LINE,.75)
 panel(p,27,201,541,358,'Equipment & carried items',mono,'TRACK WEIGHT IF YOUR TABLE USES IT')
 cols=[42,298,359,422]
 for x,s in zip(cols,['Item / description','Qty','Wt.','Location / notes']):label(p,x,246,s)
 for i in range(15):
  yy=268+i*18.4
  for x,w in zip(cols,[241,45,47,129]):line(p,x,yy,x+w,yy,LINE,.6)
 panel(p,27,570,541,96,'Attuned magical items',mono,'THREE SLOTS')
 for i in range(3):
  xx=42+i*172
  little_hex(p,xx+7,613,6,mono)
  inputline(p,xx+19,608,138,'Slot '+str(i+1))
 panel(p,27,677,541,114,'Treasure, storage & loot',mono)
 ruling(p,42,725,509,4,19)
 return p

def page5(doc,mono):
 p=init_page(doc,mono,'Character & story',5)
 panel(p,27,101,541,166,'Appearance & identity',mono)
 poly_panel(p,43,137,143,113,mono=mono)
 # faint avatar outline hex
 hexpath(p,114.5,193,42,43,LINE,1,None,.55)
 tcenter(p,114,240,'CHARACTER PORTRAIT',6.7,MUTED,'InterB')
 for x,yy,w,s in [(204,150,161,'Age / height / weight'),(380,150,170,'Eyes / hair / skin'),(204,191,346,'Distinguishing features'),(204,233,346,'Appearance & mannerisms')]:inputline(p,x,yy,w,s,15)
 panel(p,27,278,541,172,'Personality & motivations',mono)
 for i,lab in enumerate(['PERSONALITY TRAITS','IDEALS & BELIEFS','BONDS & CONNECTIONS']):
  xx=42+i*171
  text(p,xx,321,lab,6.8,MUTED,'InterB')
  ruling(p,xx,346,157,5,19)
  if i<2:line(p,xx+164,313,xx+164,431,LINE,.7)
 panel(p,27,461,541,199,'Backstory & turning points',mono)
 ruling(p,42,512,509,7,20)
 panel(p,27,672,541,119,'Allies, rivals & factions',mono)
 for i in range(4):
  yy=722+i*17
  line(p,42,yy,281,yy,LINE,.6)
  line(p,306,yy,551,yy,LINE,.6)
 label(p,42,711,'Name / affiliation');label(p,306,711,'Relationship / importance')
 return p

def page6(doc,mono):
 p=init_page(doc,mono,'Adventure notes',6)
 panel(p,27,101,541,96,'Campaign & session',mono,'QUESTS, CLUES, NAMES & PLACES')
 for x,w,s in [(42,145,'Campaign'),(199,103,'Session / date'),(313,110,'Location'),(435,116,'Party / quest')]:inputline(p,x,150,w,s)
 panel(p,27,209,541,449,'Session notes & discoveries',mono)
 ruling(p,42,255,508,21,18.6)
 panel(p,27,669,541,121,'Milestones, goals & follow-ups',mono)
 ruling(p,42,713,509,4,20)
 return p

def create(mono=False):
 global INK,MUTED,LINE
 if mono:
  INK=(.13,.13,.13)
  MUTED=(.42,.42,.42)
  LINE=(.79,.79,.79)
 doc=fitz.open()
 for fn in [page1,page2,page3,page4,page5,page6]:fn(doc,mono)
 doc.set_metadata({'title':'Rookie Quest Keeper - Printable Character Sheet (Version 3)'+(' Black and White' if mono else ' Colour'),
                   'author':'Rookie Quest Keeper','subject':'Six page A4 printable TTRPG character ledger'})
 path=os.path.join(OUT,'RQK_Character_Sheet_V3_'+('Black_White' if mono else 'Colour')+'.pdf')
 doc.save(path,garbage=4,deflate=True)
 print(path,os.path.getsize(path))
 return doc,path

doc,cp=create(False)
_,bp=create(True)
# Render first page and one overview image.
preview=os.path.join(OUT,'RQK_Character_Sheet_V3_Page_1.png')
pix=doc[0].get_pixmap(matrix=fitz.Matrix(2.1,2.1),alpha=False);pix.save(preview)
thumbs=[]
for pg in doc:
 pix=pg.get_pixmap(matrix=fitz.Matrix(1.1,1.1),alpha=False)
 im=Image.frombytes('RGB',(pix.width,pix.height),pix.samples)
 im.thumbnail((420,594))
 thumbs.append(im)
contact=Image.new('RGB',(420*3+24*4,594*2+24*3),(235,239,245))
for i,im in enumerate(thumbs):
 x=24+(i%3)*444;y=24+(i//3)*618
 contact.paste(im,(x,y))
 d=ImageDraw.Draw(contact);d.rectangle((x,y,x+im.width,y+im.height),outline=(186,199,213),width=2)
contact.save(os.path.join(OUT,'RQK_Character_Sheet_V3_Overview.jpg'),quality=91,subsampling=0)
print('PREVIEW',preview,contact.size)