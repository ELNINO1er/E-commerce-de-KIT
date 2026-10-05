from PIL import Image, ImageDraw, ImageFont, ImageFilter
from pathlib import Path
import math, subprocess
root=Path(r'C:\wamp64\www\kic-main')
out=root/'publicite-kic'/'KIC-publicite-animee-v2.mp4'
ff=r'C:\Users\omcg2\AppData\Roaming\Python\Python312\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'
audio=root/'.tmp-video-analysis'/'audio.wav'
W,H,FPS=720,1280,30
DUR=36.0
BROWN=(31,14,9); BROWN2=(58,27,16); YELLOW=(250,190,31); CREAM=(255,248,238); MUTED=(215,188,169)
FB=r'C:\Windows\Fonts\arialbd.ttf'; FR=r'C:\Windows\Fonts\arial.ttf'
def font(s,b=True): return ImageFont.truetype(FB if b else FR,s)
def clamp(x,a=0,b=1): return max(a,min(b,x))
def ease(x): x=clamp(x); return 1-(1-x)**3
def ease_out_back(x):
    x=clamp(x); c1=1.70158; c3=c1+1
    return 1+c3*(x-1)**3+c1*(x-1)**2
def fit(img,box):
    z=img.copy().convert('RGBA'); z.thumbnail(box,Image.Resampling.LANCZOS); return z
def alpha_paste(base,layer,xy): base.paste(layer,(int(xy[0]),int(xy[1])),layer)
def text_layer(text,f,fill,stroke=0,stroke_fill=BROWN,spacing=6,align='center'):
    dummy=ImageDraw.Draw(Image.new('RGBA',(10,10)))
    b=dummy.multiline_textbbox((0,0),text,font=f,spacing=spacing,align=align,stroke_width=stroke)
    width=max(1,int(math.ceil(b[2]-b[0]+20)))
    height=max(1,int(math.ceil(b[3]-b[1]+20)))
    layer=Image.new('RGBA',(width,height),(0,0,0,0)); d=ImageDraw.Draw(layer)
    d.multiline_text((int(10-b[0]),int(10-b[1])),text,font=f,fill=fill,spacing=spacing,align=align,stroke_width=stroke,stroke_fill=stroke_fill)
    return layer
def centered(base,layer,y,xoff=0): alpha_paste(base,layer,((W-layer.width)//2+xoff,y))
def product_asset(path,box=(590,590)):
    return fit(Image.open(root/path),box)
products=[
 ('img/beurre-cacao-pub.png','BEURRE DE\nCACAO','CHOCOLATERIE • PÂTISSERIE','1 KG • 40 €'),
 ('img/poudre-cacao-pub.png','POUDRE DE\nCACAO','BOISSONS • DESSERTS • GLACES','1 KG • 15 €'),
 ('img/masse-cacao-pub.png','MASSE DE\nCACAO','CHOCOLATS • GANACHES','1 KG • 25 €'),
 ('img/infusion-cacao-01.png','INFUSION DE\nCACAO','UNE BOISSON CHAUDE AROMATIQUE','15 SACHETS • 12 €'),
 ('img/jus-cacao.jpg','JUS DE\nCACAO','FRAIS • FRUITÉ • ORIGINAL','250 ML • 4,50 €')]
assets=[product_asset(p[0]) for p in products]
logo=fit(Image.open(root/'img/Logo KIC 01.png'),(310,310))

def decorations(im,t,light=False):
    d=ImageDraw.Draw(im); color=BROWN if light else YELLOW
    for i in range(7):
        x=(70+i*113+int(t*28*(1 if i%2==0 else -1)))%(W+80)-40
        y=75+(i*173)%1080
        r=4+(i%3)*2
        d.regular_polygon((x,y,r),4,rotation=45,fill=color)

def scene_hook(local):
    im=Image.new('RGB',(W,H),BROWN); decorations(im,local)
    d=ImageDraw.Draw(im); d.rectangle((0,0,W,18),fill=YELLOW)
    # fast kinetic words
    lines=[('VOUS CHERCHEZ',font(48),CREAM,-1),('LE CACAO',font(95),YELLOW,1),('AUTREMENT ?',font(72),CREAM,-1)]
    ys=[270,395,530]
    for idx,(txt,f,col,direction) in enumerate(lines):
        p=ease((local-idx*.22)/.65); lay=text_layer(txt,f,col)
        x=(W-lay.width)//2 + direction*(1-p)*760
        alpha_paste(im,lay,(x,ys[idx]))
    p=ease_out_back((local-1.1)/.7)
    if p>0:
        z=max(1,int(logo.width*p)); l=logo.resize((z,z),Image.Resampling.LANCZOS)
        alpha_paste(im,l,((W-z)//2,700+(1-p)*180))
    sub=text_layer('KIC • KONAN INDUSTRIE ET CHOCOLATERIE',font(22),MUTED)
    centered(im,sub,1060+int((1-ease((local-1.7)/.6))*120))
    return im

def scene_product(local,index):
    im=Image.new('RGB',(W,H),BROWN); decorations(im,local+index)
    d=ImageDraw.Draw(im); d.rectangle((0,0,W,18),fill=YELLOW)
    d.text((36,40),'KIC • CACAO PROFESSIONNEL',font=font(20),fill=YELLOW)
    asset=assets[index]
    # product flies in, overshoots and slowly floats/zooms
    p=ease_out_back(local/.75)
    scale=(0.72+0.28*p)*(1+0.015*math.sin(local*2.8))
    aw=max(1,int(asset.width*scale)); ah=max(1,int(asset.height*scale)); prod=asset.resize((aw,ah),Image.Resampling.LANCZOS)
    x=(W-aw)//2 + int((1-p)*(750 if index%2==0 else -750))
    y=120+int(12*math.sin(local*2.4))
    shadow=Image.new('RGBA',(aw,max(60,int(ah*.13))),(0,0,0,0)); sd=ImageDraw.Draw(shadow); sd.ellipse((30,10,aw-30,shadow.height-5),fill=(0,0,0,110)); shadow=shadow.filter(ImageFilter.GaussianBlur(18))
    alpha_paste(im,shadow,(x,y+ah-35)); alpha_paste(im,prod,(x,y))
    # yellow diagonal wipe accent
    q=ease((local-.35)/.55); d.polygon([(0,770),(int(W*q),735),(int(W*q),755),(0,790)],fill=YELLOW)
    title=text_layer(products[index][1],font(57),CREAM,spacing=2)
    centered(im,title,790+int((1-ease((local-.55)/.55))*180))
    sub=text_layer(products[index][2],font(22),MUTED)
    centered(im,sub,965+int((1-ease((local-.8)/.5))*100))
    pr=ease_out_back((local-1.05)/.55)
    if pr>0:
        price=text_layer(products[index][3],font(36),BROWN)
        bw=int((price.width+55)*pr); bh=int(72*pr)
        if bw>2 and bh>2:
            x0=(W-bw)//2; y0=1060+(72-bh)//2
            d.rounded_rectangle((x0,y0,x0+bw,y0+bh),radius=max(1,int(32*pr)),fill=YELLOW)
            if pr>.55: centered(im,price,1072)
    return im

def scene_benefits(local):
    im=Image.new('RGB',(W,H),YELLOW); decorations(im,local,True); d=ImageDraw.Draw(im)
    title=text_layer('POURQUOI\nCHOISIR KIC ?',font(67),BROWN,spacing=2); centered(im,title,150-int((1-ease(local/.7))*180))
    items=['PRODUITS CACAO SÉLECTIONNÉS','SOLUTIONS POUR PROFESSIONNELS','LIVRAISON FRANCE & EUROPE']
    for i,txt in enumerate(items):
        p=ease_out_back((local-.7-i*.35)/.65); y=555+i*155; x=int(-660+(725*p))
        d.rounded_rectangle((x,y,x+590,y+105),radius=25,fill=CREAM)
        lay=text_layer(txt,font(24),BROWN); alpha_paste(im,lay,(x+(590-lay.width)//2,y+37))
    return im

def scene_cta(local):
    im=Image.new('RGB',(W,H),BROWN); decorations(im,local); d=ImageDraw.Draw(im); d.rectangle((0,0,W,18),fill=YELLOW)
    p=ease_out_back(local/.65); z=max(1,int(230*p*(1+.025*math.sin(local*4)))); l=logo.resize((z,z),Image.Resampling.LANCZOS); alpha_paste(im,l,((W-z)//2,95))
    title=text_layer('PRÊT À\nCOMMANDER ?',font(72),CREAM,spacing=3); centered(im,title,420+int((1-ease((local-.3)/.6))*160))
    # typewriter website
    full='kic-fr.com'; n=int(clamp((local-1.05)/1.0)*len(full)); web=text_layer(full[:n],font(48),YELLOW); centered(im,web,720)
    wp=text_layer('WHATSAPP\n+33 7 45 90 87 78',font(35),CREAM,spacing=7); centered(im,wp,830+int((1-ease((local-1.25)/.6))*150))
    bp=ease_out_back((local-1.65)/.55)
    if bp>0:
        bw=int(500*bp); x=(W-bw)//2; d.rounded_rectangle((x,1050,x+bw,1145),radius=45,fill=YELLOW)
        if bp>.6:
            t=text_layer('CONTACTEZ KIC',font(31),BROWN); centered(im,t,1080)
    return im

scene_len=DUR/8
cmd=[ff,'-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(audio),'-map','0:v:0','-map','1:a:0','-c:v','libx264','-preset','medium','-crf','20','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',str(DUR),'-movflags','+faststart',str(out),'-y']
proc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for frame in range(int(DUR*FPS)):
    t=frame/FPS; idx=min(7,int(t/scene_len)); local=t-idx*scene_len
    if idx==0: im=scene_hook(local)
    elif 1<=idx<=5: im=scene_product(local,idx-1)
    elif idx==6: im=scene_benefits(local)
    else: im=scene_cta(local)
    # scene transition flash/wipe
    edge=local
    if edge<.22 and idx>0:
        cover=int(W*(1-edge/.22)); ov=Image.new('RGB',(cover,H),YELLOW if idx%2 else BROWN)
        im.paste(ov,(W-cover,0))
    proc.stdin.write(im.tobytes())
proc.stdin.close(); code=proc.wait()
if code: raise SystemExit(code)
print(out, out.stat().st_size)
