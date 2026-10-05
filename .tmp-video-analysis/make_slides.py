from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import textwrap
root=Path(r'C:\wamp64\www\kic-main')
out=root/'publicite-kic'
out.mkdir(exist_ok=True)
W,H=720,1280
BROWN=(31,14,9); BROWN2=(60,28,16); YELLOW=(250,190,31); CREAM=(255,248,238); MUTED=(214,188,169)
font_b=r'C:\Windows\Fonts\arialbd.ttf'; font_r=r'C:\Windows\Fonts\arial.ttf'
def font(size,bold=True): return ImageFont.truetype(font_b if bold else font_r,size)
def fit(img,box):
    img=img.convert('RGBA'); img.thumbnail(box,Image.Resampling.LANCZOS); return img
def center_text(draw,txt,y,f,fill,spacing=8):
    box=draw.multiline_textbbox((0,0),txt,font=f,align='center',spacing=spacing)
    x=(W-(box[2]-box[0]))//2; draw.multiline_text((x,y),txt,font=f,fill=fill,align='center',spacing=spacing)
counter = 1
def slide(path,title,subtitle='',price='',badge='KIC • CACAO PROFESSIONNEL'):
    global counter
    counter += 1
    im=Image.new('RGB',(W,H),BROWN); d=ImageDraw.Draw(im)
    d.rectangle((0,0,W,18),fill=YELLOW); d.text((48,48),badge,font=font(22),fill=YELLOW)
    if path:
        p=root/path
        product=fit(Image.open(p),(620,650))
        shadow=Image.new('RGBA',product.size,(0,0,0,0)); sh=ImageDraw.Draw(shadow); sh.ellipse((30,product.height-70,product.width-30,product.height-10),fill=(0,0,0,100)); shadow=shadow.filter(ImageFilter.GaussianBlur(18))
        x=(W-product.width)//2; y=155+(650-product.height)//2
        im.paste(shadow,(x,y+30),shadow); im.paste(product,(x,y),product)
    center_text(d,title.upper(),850,font(58),CREAM)
    if subtitle: center_text(d,subtitle,1000,font(27,False),MUTED,6)
    if price:
        tw=d.textbbox((0,0),price,font=font(45)); x=(W-(tw[2]-tw[0]))//2
        d.rounded_rectangle((x-28,1110,x+(tw[2]-tw[0])+28,1188),radius=34,fill=YELLOW)
        d.text((x,1124),price,font=font(45),fill=BROWN)
    im.save(out/f'{counter:02d}-slide.png',quality=95)
# 1 hook
im=Image.new('RGB',(W,H),BROWN); d=ImageDraw.Draw(im); d.rectangle((0,0,W,22),fill=YELLOW)
logo=fit(Image.open(root/'img/Logo KIC 01.png'),(330,330)); im.paste(logo,((W-logo.width)//2,130),logo if logo.mode=='RGBA' else None)
center_text(d,'LE CACAO\nAUTREMENT',540,font(82),CREAM,8); center_text(d,'Des ingrédients sélectionnés\npour vos créations',770,font(30,False),MUTED,8)
d.rounded_rectangle((155,980,565,1065),radius=42,fill=YELLOW); center_text(d,'DÉCOUVREZ KIC',997,font(30),BROWN)
im.save(out/'01-slide.png')
slide(Path('img/beurre-cacao-pub.png'),'Beurre de cacao','Chocolaterie • Pâtisserie • Transformation','1 kg • 40 €')
slide(Path('img/poudre-cacao-pub.png'),'Poudre de cacao','Boissons • Desserts • Glaces • Biscuits','1 kg • 15 €')
slide(Path('img/masse-cacao-pub.png'),'Masse de cacao','Chocolats • Ganaches • Couvertures','1 kg • 25 €')
slide(Path('img/infusion-cacao-01.png'),'Infusion de cacao','Une boisson chaude aromatique','15 sachets • 12 €')
slide(Path('img/jus-cacao.jpg'),'Jus de cacao','Frais • Fruité • Original','250 ml • 4,50 €')
# benefits
im=Image.new('RGB',(W,H),YELLOW); d=ImageDraw.Draw(im)
center_text(d,'POURQUOI\nCHOISIR KIC ?',150,font(68),BROWN)
for i,t in enumerate(['PRODUITS CACAO SÉLECTIONNÉS','SOLUTIONS POUR PROFESSIONNELS','LIVRAISON FRANCE & EUROPE']):
    y=520+i*145; d.rounded_rectangle((65,y,655,y+100),radius=24,fill=CREAM); center_text(d,t,y+31,font(25),BROWN)
im.save(out/'07-slide.png')
# CTA
im=Image.new('RGB',(W,H),BROWN); d=ImageDraw.Draw(im); d.rectangle((0,0,W,20),fill=YELLOW)
logo=fit(Image.open(root/'img/Logo KIC 01.png'),(260,260)); im.paste(logo,((W-logo.width)//2,100),logo if logo.mode=='RGBA' else None)
center_text(d,'PRÊT À\nCOMMANDER ?',430,font(75),CREAM)
center_text(d,'kic-fr.com',710,font(45),YELLOW); center_text(d,'WhatsApp\n+33 7 45 90 87 78',805,font(37),CREAM)
d.rounded_rectangle((120,1040,600,1135),radius=44,fill=YELLOW); center_text(d,'CONTACTEZ KIC',1068,font(31),BROWN)
im.save(out/'08-slide.png')
print('slides',len(list(out.glob('slide-*.png'))))
