import hashlib, json
from PIL import Image, ImageDraw, ImageFont
BG=(242,240,233); INK=(23,23,26); DIM=(154,151,141); MID=(85,83,77); ACC=(176,68,27); LINE=(217,213,201)
FONT='/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/IBMPlexMono-Regular.ttf'
FONTM='/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/IBMPlexMono-Medium.ttf'
WM=json.load(open('/tmp/wm.json'))
OUT='/workspace/deliverables/entropynet/'
seed=hashlib.sha256(b'entropynet').digest()
def bits(i): return hashlib.sha256(seed+bytes([i%256,i//256])).digest()[0]

def mark(size, bg=BG, frame=True):
    im=Image.new('RGBA',(size,size),bg+(255,) if bg else (0,0,0,0)); d=ImageDraw.Draw(im)
    N=7; pad=size*0.14; cell=(size-2*pad)/N
    if frame:
        w=max(1,round(size*0.022)); d.rectangle([size*0.06,size*0.06,size*0.94-1,size*0.94-1],outline=INK,width=w)
    for y in range(N):
        for x in range(N):
            v=bits(y*N+x)
            cx=pad+x*cell+cell/2; cy=pad+y*cell+cell/2
            if (x,y)==(3,3): s=cell*0.86; col=ACC
            else:
                lvl=[0.18,0.34,0.52,0.70][v%4]; s=cell*lvl; col=INK
            d.rectangle([cx-s/2,cy-s/2,cx+s/2,cy+s/2],fill=col)
    return im

def wordmark(d, x, y, cw, ch, color=INK):
    for r,line in enumerate(WM):
        for c,chr_ in enumerate(line):
            if chr_=='█': d.rectangle([x+c*cw, y+r*ch, x+(c+1)*cw-0.6, y+(r+1)*ch-0.6], fill=color)
    return len(max(WM,key=len))*cw, len(WM)*ch

def field(d, x0,y0,cols,rows,fs,font,salt=b''):
    ramp=' .·:-=+*#%'
    for r in range(rows):
        h=b''
        k=0
        while len(h)<cols: h+=hashlib.sha256(seed+salt+bytes([r,k])).digest(); k+=1
        for c in range(cols):
            v=h[c]; g=ramp[int(v/256*len(ramp))]
            col=ACC if v>244 else (INK if v>150 else DIM)
            d.text((x0+c*fs*0.6, y0+r*fs*1.15), g, font=font, fill=col)

def card(W,H,tag,scale=1.0,show_field=True,name=None):
    im=Image.new('RGB',(W,H),BG); d=ImageDraw.Draw(im)
    f=ImageFont.truetype(FONT,int(15*scale)); fm=ImageFont.truetype(FONTM,int(22*scale))
    m=int(40*scale)
    d.rectangle([m/2,m/2,W-m/2-1,H-m/2-1],outline=INK,width=max(1,int(2*scale)))
    if show_field:
        fs=int(15*scale); fnt=ImageFont.truetype(FONT,fs)
        field(d, m, H*0.56, int((W-2*m)/(fs*0.6)), max(3,int((H*0.44-m*1.4)/(fs*1.15))), fs, fnt, salt=name.encode() if name else b'')
    cols=len(max(WM,key=len)); cw=(W-2*m*1.6)/cols*0.82; chh=cw*1.9
    ww,wh=wordmark(d, m*1.6, H*0.14, cw, chh)
    d.text((m*1.6, H*0.14+wh+int(22*scale)), tag, font=fm, fill=INK)
    d.text((W-m*1.6, m*0.95), 'round · signed · chained', font=f, fill=MID, anchor='ra')
    d.text((m*1.6, m*0.95), '┌─ entropynet/v1', font=f, fill=MID)
    return im

m=mark(1024); m.save(OUT+'logo-1024.png')
mark(1024,bg=None).save(OUT+'logo-1024-transparent.png')
mark(400).convert('RGB').save(OUT+'x-pfp-400.png')
mark(180).convert('RGB').save(OUT+'apple-touch-icon.png')
fav=mark(256,frame=False)
for s in (16,32,48,192,512): mark(s*4,frame=False).resize((s,s),Image.LANCZOS).save(OUT+f'favicon-{s}.png')
fav.save(OUT+'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
card(1500,500,'public randomness every 3s · fair launches on solana',1.0,name='banner').save(OUT+'banner-1500x500.png')
card(1200,630,'public randomness every 3s · launches nobody can snipe',1.0,name='og').save(OUT+'og-1200x630.png')
card(1280,640,'verifiable randomness beacon + fair launchpad for solana',1.0,name='gh').save(OUT+'github-social-1280x640.png')
print('done')

def mark_ascii(size, bg=BG):
    im=Image.new('RGBA',(size,size),bg+(255,) if bg else (0,0,0,0)); d=ImageDraw.Draw(im)
    rows=['┌───────┐']+['│'+'%s'+'│']*5+['└───────┘']
    ramp='·:=+#%'
    fs=size/8.2; f=ImageFont.truetype(FONTM,int(fs))
    cw=fs*0.6; lh=fs*1.0
    W=9*cw; H=7*lh; x0=(size-W)/2; y0=(size-H)/2-fs*0.08
    for r in range(7):
        for c in range(9):
            if r in (0,6) or c in (0,8):
                ch=rows[0][c] if r==0 else rows[6][c] if r==6 else '│'
                if r in(0,6) and c not in(0,8): ch='─'
                col=INK
            else:
                if (r,c)==(3,4): ch='█'; col=ACC
                else:
                    v=bits(r*9+c); ch=ramp[v%len(ramp)]; col=INK if v%3 else MID
            d.text((x0+c*cw+cw/2, y0+r*lh+lh/2), ch, font=f, fill=col, anchor='mm')
    return im
mark_ascii(1024).save(OUT+'logo-1024.png')
mark_ascii(1024,bg=None).save(OUT+'logo-1024-transparent.png')
mark_ascii(400).convert('RGB').save(OUT+'x-pfp-400.png')
mark_ascii(180).convert('RGB').save(OUT+'apple-touch-icon.png')
print('ascii')
