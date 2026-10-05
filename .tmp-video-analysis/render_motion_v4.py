from PIL import Image,ImageDraw,ImageFont,ImageFilter
from pathlib import Path
import math,subprocess
R=Path(r'C:\wamp64\www\kic-main'); I=R/'img'; O=R/'publicite-kic'/'KIC-publicite-motion-v4.mp4'
FF=r'C:\Users\omcg2\AppData\Roaming\Python\Python312\site-packages\imageio_ffmpeg\binaries\ffmpeg-win-x86_64-v7.1.exe'; A=R/'.tmp-video-analysis'/'audio.wav'
W,H,FPS,DUR=720,1280,30,36; Y=(255,211,0); K=(12,12,10); WH=(255,252,240)
def F(n): return ImageFont.truetype(r'C:\Windows\Fonts\arialbd.ttf',n)
def cl(v): return max(0,min(1,v))
def eo(v): v=cl(v); return 1-(1-v)**3
def back(v): v=cl(v); return 1+2.70158*(v-1)**3+1.70158*(v-1)**2
def L(s,n,c,sp=2):
 d=ImageDraw.Draw(Image.new('RGBA',(2,2))); q=d.multiline_textbbox((0,0),s,font=F(n),spacing=sp,align='center')
 z=Image.new('RGBA',(int(q[2]-q[0]+12),int(q[3]-q[1]+12)),(0,0,0,0)); ImageDraw.Draw(z).multiline_text((6-q[0],6-q[1]),s,font=F(n),fill=c,spacing=sp,align='center'); return z
def put(im,z,x,y): im.paste(z,(int(x),int(y)),z)
def cen(im,z,y): put(im,z,(W-z.width)//2,y)
def cv(im,w=W,h=H,zoom=1):
 im=im.convert('RGB'); s=max(w/im.width,h/im.height)*zoom; im=im.resize((int(im.width*s),int(im.height*s)),Image.Resampling.LANCZOS)
 return im.crop(((im.width-w)//2,(im.height-h)//2,(im.width+w)//2,(im.height+h)//2))
def rs(im,w): return im.resize((w,int(im.height*w/im.width)),Image.Resampling.LANCZOS)
def cut(im):
 im=im.convert('RGBA'); p=im.load()
 for y in range(im.height):
  for x in range(im.width):
   r,g,b,a=p[x,y]; m=min(r,g,b); p[x,y]=(r,g,b,max(0,int((255-m)*8.5)) if m>225 else a)
 return im.crop(im.getbbox())
def dots(im,t,dark=False):
 d=ImageDraw.Draw(im); c=Y if dark else K
 for i in range(9): d.regular_polygon(((i*97+int(t*(35+i*2)))%(W+40)-20,(95+i*139)%H,3+i%3),4,45,fill=c)
def wipe(a,b,p):
 m=Image.new('L',(W,H)); d=ImageDraw.Draw(m); e=int((W+360)*eo(p)-360); d.polygon([(-360,0),(e,0),(e+360,H),(-360,H)],fill=255); return Image.composite(b,a,m)
names=['beurre-cacao-pub.png','poudre-cacao-pub.png','masse-cacao-pub.png','infusion-cacao-01.png','jus-cacao.jpg','kic-cat-beurre.jpg','kic-cat-poudre.jpg','kic-cat-pate.jpg']
P={n:Image.open(I/n) for n in names}; logo=Image.open(I/'logo-kic-konan-transparent-v2.png').convert('RGBA'); inf=cut(P[names[3]]); juice=cut(P[names[4]])
def hook(t):
 im=Image.new('RGB',(W,H),K); dots(im,t,1)
 rows=[('VOUS',0,92),('CHERCHEZ',.3,92),('LE CACAO',.65,112),('AUTREMENT ?',1,86)]
 for i,(s,delay,n) in enumerate(rows):
  p=eo((t-delay)/.42); z=L(s,n,Y if i==2 else WH); x=(-z.width-30)+(W+z.width)*p if i%2==0 else W+30-(W+z.width)*p
  if p>.995:x=(W-z.width)//2
  put(im,z,x,190+i*145)
 p=back((t-1.45)/.6); z=rs(logo,max(2,int(245*p))); put(im,z,(W-z.width)//2,790+130*(1-p)); cen(im,L('KONAN INDUSTRIE ET CHOCOLATERIE',22,WH),1120); return im
def promise(t):
 im=Image.new('RGB',(W,H),Y); dots(im,t)
 for i,(s,n,y,side) in enumerate([('DU CACAO',82,210,-1),('IVOIRIEN',112,350,1),('PENSÉ POUR',70,530,-1),('VOS CRÉATIONS',70,640,1)]):
  p=eo((t-i*.16)/.5); z=L(s,n,K); put(im,z,(W-z.width)//2+side*(1-p)*800,y)
 d=ImageDraw.Draw(im); p=eo((t-.75)/.8)
 for i in range(6):
  x=80+i*90; h=int((90+i*48)*cl(p-i*.06)); d.rectangle((x,1080-h,x+54,1080),fill=K)
 cen(im,L('QUALITÉ • GOÛT • SAVOIR-FAIRE',24,K),1145); return im
def mosaic(t):
 im=Image.new('RGB',(W,H),Y); src=[P[names[0]],P[names[1]],P[names[2]],P[names[5]],P[names[6]],P[names[7]]]; co=[(-50,30),(255,0),(550,55),(0,520),(360,500),(170,850)]
 for i,(s,(tx,ty)) in enumerate(zip(src,co)):
  w,h=(300,470) if i<3 else (360,300); pan=cv(s,w+50,h+50,1.05).crop((25,25,25+w,25+h)); p=back((t-i*.1)/.62); sx=-500 if i%2==0 else 900; im.paste(pan,(int(sx+(tx-sx)*p),int(ty+160*(1-p))))
 d=ImageDraw.Draw(im); z=L('5 PRODUITS.  UNE PASSION.',45,Y); p=eo((t-.85)/.6); x=-z.width-50+(W+z.width+15)*p; d.rectangle((x-20,1100,x+z.width+20,1185),fill=K); put(im,z,x,1118); return im
def product(t,i):
 dat=[(names[0],'BEURRE DE CACAO','1 KG • 40 €'),(names[1],'POUDRE DE CACAO','1 KG • 15 €'),(names[2],'MASSE DE CACAO','1 KG • 25 €')]; n,title,price=dat[i]
 im=cv(P[n],W,H,1.015+.018*t); sh=Image.new('RGBA',(W,H),(0,0,0,0)); d=ImageDraw.Draw(sh); d.rectangle((0,0,W,H),fill=(0,0,0,18)); d.rectangle((0,790,W,H),fill=(0,0,0,150)); im=Image.alpha_composite(im.convert('RGBA'),sh).convert('RGB')
 z=L(title,62,WH); p=eo(t/.5); put(im,z,-z.width+(40+z.width)*p,865); q=back((t-.3)/.5); pr=L(price,41,K); d=ImageDraw.Draw(im); ww=int((pr.width+62)*q)
 if ww>3:d.rounded_rectangle((40,1035,40+ww,1122),radius=40,fill=Y)
 if q>.7:put(im,pr,70,1058)
 put(im,L('KIC • CACAO DE CÔTE D’IVOIRE',22,Y),40,1160); return im
def duo(t):
 im=Image.new('RGB',(W,H),Y); dots(im,t); cen(im,L('ENCORE PLUS\nDE SAVEURS',70,K),75)
 for i,(a,x,title,price) in enumerate([(inf,-10,'INFUSION CACAO','12 €'),(juice,360,'JUS DE CACAO','4,50 €')]):
  p=back((t-.2-i*.15)/.65); z=rs(a,max(2,int(390*p))); put(im,z,x+(390-z.width)//2,330+(560-z.height)//2+10*math.sin(t*3+i)); cenx=x+195
  q=L(title,31,K); put(im,q,cenx-q.width//2,925); d=ImageDraw.Draw(im); d.rounded_rectangle((x+75,1010,x+315,1088),radius=35,fill=K); q=L(price,34,Y); put(im,q,cenx-q.width//2,1032)
 return im
def benefits(t):
 im=Image.new('RGB',(W,H),Y); dots(im,t); cen(im,L('POURQUOI KIC ?',80,K),95); d=ImageDraw.Draw(im)
 for i,(num,s) in enumerate([('01','CACAO SÉLECTIONNÉ'),('02','PRIX CLAIRS'),('03','COMMANDE RAPIDE'),('04','LIVRAISON')]):
  p=eo((t-.2-i*.17)/.55); y=340+i*175; x=-650+690*p; d.rectangle((x,y,x+620,y+118),fill=K); put(im,L(num,30,Y),x+20,y+36); put(im,L(s,31,WH),x+100,y+35)
 return im
def cta(t):
 im=Image.new('RGB',(W,H),K); dots(im,t,1); p=back(t/.55); z=rs(logo,max(2,int(300*p))); put(im,z,(W-z.width)//2,65)
 for i,(s,n,c,y) in enumerate([('PRÊT À',80,WH,420),('COMMANDER ?',86,Y,535),('kic-fr.com',52,WH,760)]):
  q=eo((t-.2-i*.18)/.5); z=L(s,n,c); put(im,z,(W-z.width)//2,y+130*(1-q))
 s='+33 7 45 90 87 78'; n=int(cl((t-1)/.9)*len(s)); cen(im,L(s[:n],40,WH),900); d=ImageDraw.Draw(im); q=back((t-1.45)/.55); ww=int(520*q)
 if ww>3:d.rounded_rectangle(((W-ww)//2,1020,(W+ww)//2,1130),radius=50,fill=Y)
 if q>.7:cen(im,L('WHATSAPP • COMMANDEZ',29,K),1058)
 return im
S=[(0,3,hook),(3,6,promise),(6,10,mosaic),(10,13,lambda t:product(t,0)),(13,16,lambda t:product(t,1)),(16,19,lambda t:product(t,2)),(19,23,duo),(23,28,benefits),(28,36,cta)]
cmd=[FF,'-hide_banner','-loglevel','error','-f','rawvideo','-pix_fmt','rgb24','-s',f'{W}x{H}','-r',str(FPS),'-i','-','-i',str(A),'-map','0:v','-map','1:a','-c:v','libx264','-preset','slow','-crf','16','-pix_fmt','yuv420p','-c:a','aac','-b:a','192k','-t',str(DUR),'-movflags','+faststart','-y',str(O)]
p=subprocess.Popen(cmd,stdin=subprocess.PIPE)
for f in range(FPS*DUR):
 t=f/FPS; i=next(i for i,s in enumerate(S) if s[0]<=t<s[1]); st,en,fn=S[i]; local=t-st; im=fn(local)
 if i and local<.38:
  pst,pen,pfn=S[i-1]; im=wipe(pfn(pen-pst+local),im,local/.38)
 p.stdin.write(im.convert('RGB').tobytes())
p.stdin.close(); code=p.wait()
if code: raise SystemExit(code)
print(O,O.stat().st_size)
