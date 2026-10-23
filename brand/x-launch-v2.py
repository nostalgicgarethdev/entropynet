import json,hashlib,os
from PIL import Image,ImageDraw,ImageFont
S=2
INK=(23,23,26);BG=(242,240,233);PAPER=(248,247,242);ACC=(176,68,27)
MID=(120,118,112);FAINT=(214,211,202);FAINT2=(226,223,215)
FD="/usr/share/fonts/truetype/sand-box/google/IBM Plex Mono/"
def F(w,sz): return ImageFont.truetype(FD+f"IBMPlexMono-{w}.ttf",int(sz*S))
WM=json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),"wordmark.json")))
def h(*a): return hashlib.sha256(b"entropynet-6861"+repr(a).encode()).digest()[0]
def s(v): return int(v*S)

def texture(d,x0,y0,x1,y1,sz,salt):
    f=F("Regular",sz); cw=sz*0.6; lh=sz*1.25; chars=" .·:-=+*#%"
    r=0;y=y0
    while y+lh<=y1:
        c=0;x=x0
        while x+cw<=x1:
            v=h(salt,r,c)
            if v>110:
                ch=chars[v%len(chars)]; col=ACC if v>253 else (FAINT if v>190 else FAINT2)
                d.text((s(x),s(y)),ch,font=f,fill=col)
            c+=1;x+=cw
        r+=1;y+=lh

def wordmark(d,x,y,cw,chh):
    for r,line in enumerate(WM):
        for c,ch in enumerate(line):
            X=s(x+c*cw);Y=s(y+r*chh)
            if ch=="█": d.rectangle([X,Y,X+s(cw)-1,Y+s(chh)-1],fill=INK)
            elif ch!=" ": d.rectangle([X+s(cw)*0.25,Y+s(chh)*0.25,X+s(cw)*0.75,Y+s(chh)*0.75],fill=FAINT)
    return len(WM[0])*cw, len(WM)*chh

def mark(d,x,y,z):
    d.rectangle([s(x),s(y),s(x+z),s(y+z)],outline=INK,width=s(1.6))
    cell=(z-z*0.2)/7; o=z*0.1
    for i in range(7):
        for j in range(7):
            cx=x+o+cell*(i+.5);cy=y+o+cell*(j+.5)
            if i==3 and j==3: r=cell*.42;d.rectangle([s(cx-r),s(cy-r),s(cx+r),s(cy+r)],fill=ACC);continue
            lv=[.15,.3,.5,.7][h("m",i,j)%4]; r=cell*lv/2
            d.rectangle([s(cx-r),s(cy-r),s(cx+r),s(cy+r)],fill=INK)

def T(d,x,y,t,w,sz,col=INK,anchor="la"): d.text((s(x),s(y)),t,font=F(w,sz),fill=col,anchor=anchor)
def tw(d,t,w,sz): b=d.textbbox((0,0),t,font=F(w,sz)); return (b[2]-b[0])/S

def browser(d,x,y,w,hh,sz=15):
    lh=sz*1.62; hh=34+18+9*lh+4+lh*3.2+10+lh*1.6+sz*1.6+14
    # offset shadow (hard, print-style)
    d.rectangle([s(x+8),s(y+8),s(x+w+8),s(y+hh+8)],fill=INK)
    d.rectangle([s(x),s(y),s(x+w),s(y+hh)],fill=PAPER,outline=INK,width=s(1.6))
    bar=34
    d.line([s(x),s(y+bar),s(x+w),s(y+bar)],fill=INK,width=s(1.2))
    for i in range(3): d.rectangle([s(x+14+i*16),s(y+12),s(x+24+i*16),s(y+22)],outline=INK,width=s(1.2))
    ux=x+78; d.rectangle([s(ux),s(y+8),s(x+w-14),s(y+26)],outline=FAINT,width=s(1))
    T(d,ux+8,y+17,"https://phpnet.xyz","Regular",12,MID,"lm")
    T(d,x+w-22,y+17,"sealed","SemiBold",12,ACC,"rm"); q=x+w-22-tw(d,"sealed","SemiBold",12)-14; d.rectangle([s(q),s(y+13),s(q+8),s(y+21)],fill=ACC)
    lh=sz*1.62; cx=x+22; cy=y+bar+18
    L=[("$ phpnet verify --release 5b47a8252b…","Medium",INK),
       ("",None,None),
       ("  manifest   sha256 · 15 files","Regular",MID),
       ("  signers    2 of 3","Regular",MID,"SIG"),
       ("  anchor     solana mainnet · beacon 6861","Regular",MID),
       ("",None,None),
       ("  ✓ index.html     sealed","Regular",INK),
       ("  ✓ vendor.js      sealed","Regular",INK),
       ("  ✓ wallet.js      sealed","Regular",INK)]
    for it in L:
        t,wt,c=it[:3]
        if t: T(d,cx,cy,t,wt,sz,c)
        if len(it)>3:
            q=cx+tw(d,t+"   ","Regular",sz); a=sz*0.62
            for k in range(3):
                X=q+k*(a+7);Y=cy+sz*0.35
                d.rectangle([s(X),s(Y),s(X+a),s(Y+a)],fill=INK if k<2 else None,outline=INK,width=s(1.2))
        cy+=lh
    # rejected block
    cy+=4; bh=lh*3.2
    d.rectangle([s(x+12),s(cy-8),s(x+w-12),s(cy-8+bh)],fill=INK)
    T(d,cx,cy,"    app.js         BLOCKED","Bold",sz,(242,240,233))
    a=sz*0.6;X=cx+sz*1.2;Y=cy+sz*0.4
    d.line([s(X),s(Y),s(X+a),s(Y+a)],fill=ACC,width=s(2.2));d.line([s(X+a),s(Y),s(X),s(Y+a)],fill=ACC,width=s(2.2))
    T(d,cx,cy+lh,"    expected  sha256:5b47a8…  (sealed)","Regular",sz-1,(190,188,180))
    T(d,cx,cy+lh*2,"    served    sha256:e91c0f…  (unsigned)","Regular",sz-1,(232,140,100))
    cy+=bh+10
    T(d,cx,cy,"  script never ran. wallet untouched.","Italic",sz,ACC)
    cy+=lh*1.6
    d.line([s(x+12),s(cy-6),s(x+w-12),s(cy-6)],fill=FAINT,width=s(1))
    T(d,cx,cy+4,"sw: enforcing · 3 sealed · 1 blocked","Regular",sz-3,MID)
    T(d,x+w-22,cy+4,"seal 2Mh6Tj…fEi","Regular",sz-3,MID,"ra")
    return cy+sz*1.6-y

def steps(d,x,y,w,sz=13):
    st=[("01","hash","every file"),("02","sign","2-of-3 keys"),("03","anchor","solana mainnet"),("04","verify","in the browser")]
    cw=w/4
    d.line([s(x),s(y),s(x+w),s(y)],fill=INK,width=s(1.2))
    for i,(n,a,b) in enumerate(st):
        X=x+i*cw
        if i: d.line([s(X),s(y),s(X),s(y+52)],fill=FAINT,width=s(1))
        T(d,X+(10 if i else 0),y+10,n,"Regular",sz-2,ACC)
        T(d,X+(10 if i else 0)+24,y+8,a,"SemiBold",sz+2,INK)
        T(d,X+(10 if i else 0),y+32,b,"Regular",sz-1,MID)

def header(d,W,m):
    mark(d,m,m,30)
    T(d,m+44,m+15,"PHPNET","Bold",14,INK,"lm")
    T(d,m+44+tw(d,"PHPNET ","Bold",14),m+15,"/ sealed front-ends","Regular",14,MID,"lm")
    T(d,W-m,m+15,"LAUNCH · SOLANA MAINNET · BEACON 6861","Regular",13,MID,"rm")
    d.line([s(m),s(m+46),s(W-m),s(m+46)],fill=INK,width=s(1.2))

def footer(d,W,H,m,mid=True):
    y=H-m-14
    d.line([s(m),s(y-22),s(W-m),s(y-22)],fill=INK,width=s(1.2))
    T(d,m,y,"phpnet.xyz","SemiBold",16,INK,"lm")
    T(d,W-m,y,"github.com/nostalgicgarethdev/entropynet","Regular",15,INK,"rm")
    if mid: T(d,W/2,y,"release 5b47a8252b… · sealed","Regular",13,MID,"mm")

def headline(d,x,y,sz):
    T(d,x,y,"a hacked server","Bold",sz)
    T(d,x,y+sz*1.12,"can deploy.","Bold",sz)
    T(d,x,y+sz*2.24,"it can't sign.","Bold",sz,ACC)
    return y+sz*3.36

def wide(W,H):
    im=Image.new("RGB",(s(W),s(H)),BG); d=ImageDraw.Draw(im); m=56
    texture(d,830,m+60,W-m,H-m-60,13,"w")
    header(d,W,m)
    y=headline(d,m,m+92,70)
    T(d,m,y+26,"phpnet seals every release on solana.","Regular",19,INK)
    T(d,m,y+54,"the browser refuses anything that isn't signed.","Regular",19,MID)
    wordmark(d,m,y+132,7.6,10.4)
    steps(d,m,H-m-150,720)
    browser(d,870,m+110,W-m-870-16,540)
    footer(d,W,H,m)
    return im

def square(W,H):
    im=Image.new("RGB",(s(W),s(H)),BG); d=ImageDraw.Draw(im); m=56
    texture(d,m,470,W-m,H-m-150,13,"q")
    header(d,W,m)
    y=headline(d,m,m+84,66)
    T(d,m,y+20,"phpnet seals every release on solana.","Regular",18,INK)
    T(d,m,y+46,"the browser refuses anything that isn't signed.","Regular",18,MID)
    browser(d,m+24,y+96,W-2*m-48-8,400,13)
    steps(d,m,H-m-132,W-2*m)
    footer(d,W,H,m,False)
    return im

out="/workspace/deliverables/phpnet/"
def save(im,W,H,n): im.resize((W,H),Image.LANCZOS).save(out+n)
a=wide(1600,900); save(a,1600,900,"x-launch-1600x900.png"); save(a,1200,675,"x-launch-1200x675.png")
save(square(1080,1080),1080,1080,"x-launch-1080x1080.png")
