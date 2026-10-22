# EntropyNet brand assets. python3 brand/make.py  -> /workspace/deliverables/entropynet/
import hashlib, json, os
from PIL import Image, ImageDraw, ImageFont
BG=(242,240,233); PAPER=(248,247,242); INK=(23,23,26); DIM=(167,163,149); MID=(85,83,77); ACC=(176,68,27); LINE=(217,213,201)
FD='/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/'
FONT=FD+'IBMPlexMono-Regular.ttf'; FONTM=FD+'IBMPlexMono-Medium.ttf'
HERE=os.path.dirname(os.path.abspath(__file__))
WM=json.load(open(os.path.join(HERE,'wordmark.json')))
OUT='/workspace/deliverables/entropynet/'; os.makedirs(OUT,exist_ok=True)
seed=hashlib.sha256(b'entropynet').digest()
def H(*a): return hashlib.sha256(seed+bytes(a)).digest()[0]

def boxchar(d,ch,x,y,cw,ch_h,col,w):
    """draw box-drawing glyphs as crisp lines on the cell grid"""
    cx,cy=x+cw/2,y+ch_h/2; L=(x,cy);R=(x+cw,cy);T=(cx,y);B=(cx,y+ch_h)
    segs={'─':[(L,R)],'━':[(L,R)],'│':[(T,B)],'┃':[(T,B)],'┌':[((cx,cy),R),((cx,cy),B)],'┐':[(L,(cx,cy)),((cx,cy),B)],
      '└':[((cx,cy),R),(T,(cx,cy))],'┘':[(L,(cx,cy)),(T,(cx,cy))],'┏':[((cx,cy),R),((cx,cy),B)],'┓':[(L,(cx,cy)),((cx,cy),B)],
      '┗':[((cx,cy),R),(T,(cx,cy))],'┛':[(L,(cx,cy)),(T,(cx,cy))]}
    dbl={'═':'h','║':'v','╗':'tr','╔':'tl','╝':'br','╚':'bl'}
    if ch in segs:
        for a,b in segs[ch]: d.line([a,b],fill=col,width=w)
        return True
    if ch in dbl:
        o=cw*0.16; k=dbl[ch]
        if k=='h':
            for dy in(-o,o): d.line([(x,cy+dy),(x+cw,cy+dy)],fill=col,width=w)
        elif k=='v':
            for dx in(-o,o): d.line([(cx+dx,y),(cx+dx,y+ch_h)],fill=col,width=w)
        else:
            for s in(-1,1):
                ox=o*s; oy=o*s if k in('tr','bl') else -o*s
                # corner: horizontal arm and vertical arm meeting at (cx+ox, cy+oy)
                px,py=cx+(ox if k in('tl','bl') else -ox)*1,cy+(oy)
                px,py=cx+ox,cy+oy
                hx = x+cw if k in('tl','bl') else x
                vy = y+ch_h if k in('tl','tr') else y
                d.line([(px,py),(hx,py)],fill=col,width=w); d.line([(px,py),(px,vy)],fill=col,width=w)
        return True
    return False

def wordmark(d,x,y,cw,chh,lw):
    k=0
    for r,line in enumerate(WM):
        for c,g in enumerate(line):
            X=x+c*cw; Y=y+r*chh
            if g=='█':
                k+=1; col=ACC if H(k)%37==0 else INK
                d.rectangle([X,Y,X+cw-0.5,Y+chh-0.5],fill=col)
            elif g!=' ': boxchar(d,g,X,Y,cw,chh,DIM,lw)
    return len(WM[0])*cw,len(WM)*chh

def field(d,x0,y0,cols,rows,cw,lh,font,salt):
    ramp='      ··:-+=*#%'
    for r in range(rows):
        for c in range(cols):
            v=hashlib.sha256(seed+salt+bytes([r,c%256,c//256])).digest()[0]
            g=ramp[int(v/256*len(ramp))]
            if g==' ': continue
            col=ACC if v>251 else (INK if v>150 else DIM)
            d.text((x0+c*cw+cw/2,y0+r*lh+lh/2),g,font=font,fill=col,anchor='mm')

def frame(d,x0,y0,x1,y1,lw,col=INK):
    d.rectangle([x0,y0,x1,y1],outline=col,width=lw)
    t=lw*5  # corner ticks outside
    for (cx,cy,sx,sy) in [(x0,y0,-1,-1),(x1,y0,1,-1),(x0,y1,-1,1),(x1,y1,1,1)]:
        d.line([(cx+sx*lw*3,cy),(cx+sx*(lw*3+t),cy)],fill=col,width=lw)
        d.line([(cx,cy+sy*lw*3),(cx,cy+sy*(lw*3+t))],fill=col,width=lw)

def label(d,x,y,text,font,fill,bg):
    bb=d.textbbox((x,y),text,font=font,anchor='lm'); d.rectangle([bb[0]-10,bb[1]-4,bb[2]+10,bb[3]+4],fill=bg)
    d.text((x,y),text,font=font,fill=fill,anchor='lm')
def labelr(d,x,y,text,font,fill,bg):
    bb=d.textbbox((x,y),text,font=font,anchor='rm'); d.rectangle([bb[0]-10,bb[1]-4,bb[2]+10,bb[3]+4],fill=bg)
    d.text((x,y),text,font=font,fill=fill,anchor='rm')

def card(W,H_,tag,name):
    im=Image.new('RGB',(W,H_),BG); d=ImageDraw.Draw(im)
    s=W/1500; m=int(44*s); lw=max(2,int(2*s))
    fs=int(15*s); f=ImageFont.truetype(FONT,fs); fm=ImageFont.truetype(FONTM,int(17*s))
    # field band at bottom
    cw=fs*0.62; lh=fs*1.2
    fy=H_*0.66; rows=int((H_-m-fy-12*s)/lh); cols=int((W-2*m-24*s)/cw)
    field(d,m+12*s,fy,cols,rows,cw,lh,f,name.encode())
    d.line([(m,fy-14*s),(W-m,fy-14*s)],fill=LINE,width=1)
    frame(d,m,m,W-m,H_-m,lw)
    label(d,m+22*s,m,'entropynet/v1',f,MID,BG); labelr(d,W-m-22*s,m,'[*] sealed front-ends',f,ACC,BG)
    label(d,m+22*s,H_-m,'est. oct 21 2026',f,MID,BG); labelr(d,W-m-22*s,H_-m,'2-of-3 · solana mainnet',f,MID,BG)
    cols=len(WM[0]); wcw=(W-2*m-120*s)/cols; wch=wcw*1.55
    ww,wh=wordmark(d,(W-cols*wcw)/2,m+48*s,wcw,wch,max(1,int(1.6*s)))
    d.text((W/2,m+48*s+wh+30*s),tag,font=fm,fill=INK,anchor='mm')
    return im

def mark(size,bg=BG,frame_on=True):
    S=4; Z=size*S
    im=Image.new('RGBA',(Z,Z),bg+(255,) if bg else (0,0,0,0)); d=ImageDraw.Draw(im)
    lw=max(S,round(Z*0.026))
    if frame_on:
        a=Z*0.10; b=Z*0.90; d.rectangle([a,a,b,b],outline=INK,width=lw)
        # inner hairline
        i=Z*0.155; d.rectangle([i,i,Z-i,Z-i],outline=INK,width=max(S,lw//3))
    N=7; pad=Z*(0.22 if frame_on else 0.08); cell=(Z-2*pad)/N
    for y in range(N):
        for x in range(N):
            cx=pad+x*cell+cell/2; cy=pad+y*cell+cell/2
            if (x,y)==(3,3):
                r=cell*0.5; d.rectangle([cx-r,cy-r,cx+r,cy+r],fill=ACC); continue
            v=H(y*N+x); lvl=[0.16,0.30,0.46,0.64,0.80][v%5]
            if x in(2,4) and y in (2,4): lvl=0.30
            r=cell*lvl/2; d.rectangle([cx-r,cy-r,cx+r,cy+r],fill=INK)
    return im.resize((size,size),Image.LANCZOS)

mark(1024).save(OUT+'logo-1024.png')
mark(1024,bg=None).save(OUT+'logo-1024-transparent.png')
mark(400).convert('RGB').save(OUT+'x-pfp-400.png')
mark(180).convert('RGB').save(OUT+'apple-touch-icon.png')
for s in (16,32,48,192,512): mark(s,frame_on=s>=48).convert('RGB').save(OUT+f'favicon-{s}.png')
mark(64,frame_on=False).save(OUT+'favicon.ico',sizes=[(16,16),(32,32),(48,48)])
card(1500,500,'sign everything · trust no server · verified in your browser','banner').save(OUT+'banner-1500x500.png')
card(1200,630,'a website that stays safe even when its server is hacked','og').save(OUT+'og-1200x630.png')
card(1280,640,'sealed front-ends on solana · 2-of-3 signed · browser-verified','gh').save(OUT+'github-social-1280x640.png')
print('ok')
