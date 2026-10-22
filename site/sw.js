(()=>{var v=(t,e,n)=>()=>{if(n)throw n[0];try{return t&&(e=t(t=0)),e}catch(s){throw n=[s],s}};var It=(t,e)=>()=>{try{return e||t((e={exports:{}}).exports,e),e.exports}catch(n){throw e=0,n}};function zt(t,e){return t?Zt(e.hashable).then(e.finish):e.finish(Pt(e.hashable))}var m,V,tt,et,vt,X,B,wt,Dt,P,D,W,f,xt,S,z,O,mt,st,C,bt,ot,Tt,rt,nt,Bt,E,kt,pt,Ot,Vt,Z,Zt,Pt,At,Kt,Lt,yt,K,I,Mt,gt,Nt,Ht=v(()=>{m=2n**255n-19n,V=2n**252n+27742317777372353535851937790883648493n,tt=0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an,et=0x6666666666666666666666666666666666666666666666666666666666666658n,vt=37095705934669439343138083508754565189542113879843219016388785533085940283555n,X={a:-1n,d:vt,p:m,n:V,h:8,Gx:tt,Gy:et},B=(t="")=>{throw new Error(t)},wt=t=>typeof t=="string",Dt=t=>t instanceof Uint8Array||ArrayBuffer.isView(t)&&t.constructor.name==="Uint8Array",P=(t,e)=>!Dt(t)||typeof e=="number"&&e>0&&t.length!==e?B("Uint8Array of valid length expected"):t,D=t=>new Uint8Array(t),W=(t,e)=>P(wt(t)?ot(t):D(P(t)),e),f=(t,e=m)=>{let n=t%e;return n>=0n?n:e+n},xt=t=>t instanceof S?t:B("Point expected"),S=class t{constructor(e,n,s,o){this.ex=e,this.ey=n,this.ez=s,this.et=o}static fromAffine(e){return new t(e.x,e.y,1n,f(e.x*e.y))}static fromHex(e,n=!1){let{d:s}=X;e=W(e,32);let o=e.slice(),r=e[31];o[31]=r&-129;let c=rt(o);n&&!(0n<=c&&c<2n**256n)&&B("bad y coord 1"),!n&&!(0n<=c&&c<m)&&B("bad y coord 2");let a=f(c*c),h=f(a-1n),x=f(s*a+1n),{isValid:l,value:i}=Ot(h,x);l||B("bad y coordinate 3");let u=(i&1n)===1n,p=(r&128)!==0;return!n&&i===0n&&p&&B("bad y coord 3"),p!==u&&(i=f(-i)),new t(i,c,1n,f(i*c))}get x(){return this.toAffine().x}get y(){return this.toAffine().y}equals(e){let{ex:n,ey:s,ez:o}=this,{ex:r,ey:c,ez:a}=xt(e),h=f(n*a),x=f(r*o),l=f(s*a),i=f(c*o);return h===x&&l===i}is0(){return this.equals(O)}negate(){return new t(f(-this.ex),this.ey,this.ez,f(-this.et))}double(){let{ex:e,ey:n,ez:s}=this,{a:o}=X,r=f(e*e),c=f(n*n),a=f(2n*f(s*s)),h=f(o*r),x=e+n,l=f(f(x*x)-r-c),i=h+c,u=i-a,p=h-c,y=f(l*u),g=f(i*p),w=f(l*p),A=f(u*i);return new t(y,g,A,w)}add(e){let{ex:n,ey:s,ez:o,et:r}=this,{ex:c,ey:a,ez:h,et:x}=xt(e),{a:l,d:i}=X,u=f(n*c),p=f(s*a),y=f(r*i*x),g=f(o*h),w=f((n+s)*(c+a)-u-p),A=f(g-y),F=f(g+y),b=f(p-l*u),L=f(w*A),H=f(F*b),T=f(w*b),k=f(A*F);return new t(L,H,k,T)}mul(e,n=!0){if(e===0n)return n===!0?B("cannot multiply by 0"):O;if(typeof e=="bigint"&&0n<e&&e<V||B("invalid scalar, must be < L"),!n&&this.is0()||e===1n)return this;if(this.equals(z))return Nt(e).p;let s=O,o=z;for(let r=this;e>0n;r=r.double(),e>>=1n)e&1n?s=s.add(r):n&&(o=o.add(r));return s}multiply(e){return this.mul(e)}clearCofactor(){return this.mul(BigInt(X.h),!1)}isSmallOrder(){return this.clearCofactor().is0()}isTorsionFree(){let e=this.mul(V/2n,!1).double();return V%2n&&(e=e.add(this)),e.is0()}toAffine(){let{ex:e,ey:n,ez:s}=this;if(this.equals(O))return{x:0n,y:1n};let o=Bt(s,m);return f(s*o)!==1n&&B("invalid inverse"),{x:f(e*o),y:f(n*o)}}toRawBytes(){let{x:e,y:n}=this.toAffine(),s=Tt(n);return s[31]|=e&1n?128:0,s}toHex(){return st(this.toRawBytes())}};S.BASE=new S(tt,et,1n,f(tt*et));S.ZERO=new S(0n,1n,1n,0n);({BASE:z,ZERO:O}=S),mt=(t,e)=>t.toString(16).padStart(e,"0"),st=t=>Array.from(P(t)).map(e=>mt(e,2)).join(""),C={_0:48,_9:57,A:65,F:70,a:97,f:102},bt=t=>{if(t>=C._0&&t<=C._9)return t-C._0;if(t>=C.A&&t<=C.F)return t-(C.A-10);if(t>=C.a&&t<=C.f)return t-(C.a-10)},ot=t=>{let e="hex invalid";if(!wt(t))return B(e);let n=t.length,s=n/2;if(n%2)return B(e);let o=D(s);for(let r=0,c=0;r<s;r++,c+=2){let a=bt(t.charCodeAt(c)),h=bt(t.charCodeAt(c+1));if(a===void 0||h===void 0)return B(e);o[r]=a*16+h}return o},Tt=t=>ot(mt(t,64)).reverse(),rt=t=>BigInt("0x"+st(D(P(t)).reverse())),nt=(...t)=>{let e=D(t.reduce((s,o)=>s+P(o).length,0)),n=0;return t.forEach(s=>{e.set(s,n),n+=s.length}),e},Bt=(t,e)=>{(t===0n||e<=0n)&&B("no inverse n="+t+" mod="+e);let n=f(t,e),s=e,o=0n,r=1n,c=1n,a=0n;for(;n!==0n;){let h=s/n,x=s%n,l=o-c*h,i=r-a*h;s=n,n=x,o=c,r=a,c=l,a=i}return s===1n?f(o,e):B("no inverse")},E=(t,e)=>{let n=t;for(;e-- >0n;)n*=n,n%=m;return n},kt=t=>{let n=t*t%m*t%m,s=E(n,2n)*n%m,o=E(s,1n)*t%m,r=E(o,5n)*o%m,c=E(r,10n)*r%m,a=E(c,20n)*c%m,h=E(a,40n)*a%m,x=E(h,80n)*h%m,l=E(x,80n)*h%m,i=E(l,10n)*r%m;return{pow_p_5_8:E(i,2n)*t%m,b2:n}},pt=19681161376707505956807079304988542015446066515923890162744021073123829784752n,Ot=(t,e)=>{let n=f(e*e*e),s=f(n*n*e),o=kt(t*s).pow_p_5_8,r=f(t*n*o),c=f(e*r*r),a=r,h=f(r*pt),x=c===t,l=c===f(-t),i=c===f(-t*pt);return x&&(r=a),(l||i)&&(r=h),(f(r)&1n)===1n&&(r=f(-r)),{isValid:x||l,value:r}},Vt=t=>f(rt(t),V),Zt=(...t)=>K.sha512Async(...t),Pt=(...t)=>typeof Z=="function"?Z(...t):B("etc.sha512Sync not set");At={zip215:!0},Kt=(t,e,n,s=At)=>{t=W(t,64),e=W(e),n=W(n,32);let{zip215:o}=s,r,c,a,h,x=new Uint8Array;try{r=S.fromHex(n,o),c=S.fromHex(t.slice(0,32),o),a=rt(t.slice(32,64)),h=z.mul(a,!1),x=nt(c.toRawBytes(),r.toRawBytes(),e)}catch{}return{hashable:x,finish:i=>{if(h==null||!o&&r.isSmallOrder())return!1;let u=Vt(i);return c.add(r.mul(u,!1)).add(h.negate()).clearCofactor().is0()}}},Lt=(t,e,n,s=At)=>zt(!1,Kt(t,e,n,s)),yt=()=>typeof globalThis=="object"&&"crypto"in globalThis?globalThis.crypto:void 0,K={bytesToHex:st,hexToBytes:ot,concatBytes:nt,mod:f,invert:Bt,randomBytes:(t=32)=>{let e=yt();return(!e||!e.getRandomValues)&&B("crypto.getRandomValues must be defined"),e.getRandomValues(D(t))},sha512Async:async(...t)=>{let e=yt(),n=e&&e.subtle;n||B("etc.sha512Async or crypto.subtle must be defined");let s=nt(...t);return D(await n.digest("SHA-512",s.buffer))},sha512Sync:void 0};Object.defineProperties(K,{sha512Sync:{configurable:!1,get(){return Z},set(t){Z||(Z=t)}}});I=8,Mt=()=>{let t=[],e=256/I+1,n=z,s=n;for(let o=0;o<e;o++){s=n,t.push(s);for(let r=1;r<2**(I-1);r++)s=s.add(n),t.push(s);n=s.double()}return t},Nt=t=>{let e=gt||(gt=Mt()),n=(l,i)=>{let u=i.negate();return l?u:i},s=O,o=z,r=1+256/I,c=2**(I-1),a=BigInt(2**I-1),h=2**I,x=BigInt(I);for(let l=0;l<r;l++){let i=l*c,u=Number(t&a);t>>=x,u>c&&(u-=h,t+=1n);let p=i,y=i+Math.abs(u)-1,g=l%2!==0,w=u<0;u===0?o=o.add(n(g,e[p])):s=s.add(n(w,e[y]))}return{p:s,f:o}}});function Wt(t){return t instanceof Uint8Array||ArrayBuffer.isView(t)&&t.constructor.name==="Uint8Array"}function ct(t,...e){if(!Wt(t))throw new Error("Uint8Array expected");if(e.length>0&&!e.includes(t.length))throw new Error("Uint8Array expected of length "+e+", got length="+t.length)}function it(t,e=!0){if(t.destroyed)throw new Error("Hash instance has been destroyed");if(e&&t.finished)throw new Error("Hash#digest() has already been called")}function Et(t,e){ct(t);let n=e.outputLen;if(t.length<n)throw new Error("digestInto() expects output buffer of length at least "+n)}var ft=v(()=>{});function j(t){return new DataView(t.buffer,t.byteOffset,t.byteLength)}function Yt(t){if(typeof t!="string")throw new Error("utf8ToBytes expected string, got "+typeof t);return new Uint8Array(new TextEncoder().encode(t))}function at(t){return typeof t=="string"&&(t=Yt(t)),ct(t),t}function St(t){let e=s=>t().update(at(s)).digest(),n=t();return e.outputLen=n.outputLen,e.blockLen=n.blockLen,e.create=()=>t(),e}var Y,ht=v(()=>{ft();Y=class{clone(){return this._cloneInto()}}});function jt(t,e,n,s){if(typeof t.setBigUint64=="function")return t.setBigUint64(e,n,s);let o=BigInt(32),r=BigInt(4294967295),c=Number(n>>o&r),a=Number(n&r),h=s?4:0,x=s?0:4;t.setUint32(e+h,c,s),t.setUint32(e+x,a,s)}var q,_t=v(()=>{ft();ht();q=class extends Y{constructor(e,n,s,o){super(),this.blockLen=e,this.outputLen=n,this.padOffset=s,this.isLE=o,this.finished=!1,this.length=0,this.pos=0,this.destroyed=!1,this.buffer=new Uint8Array(e),this.view=j(this.buffer)}update(e){it(this);let{view:n,buffer:s,blockLen:o}=this;e=at(e);let r=e.length;for(let c=0;c<r;){let a=Math.min(o-this.pos,r-c);if(a===o){let h=j(e);for(;o<=r-c;c+=o)this.process(h,c);continue}s.set(e.subarray(c,c+a),this.pos),this.pos+=a,c+=a,this.pos===o&&(this.process(n,0),this.pos=0)}return this.length+=e.length,this.roundClean(),this}digestInto(e){it(this),Et(e,this),this.finished=!0;let{buffer:n,view:s,blockLen:o,isLE:r}=this,{pos:c}=this;n[c++]=128,this.buffer.subarray(c).fill(0),this.padOffset>o-c&&(this.process(s,0),c=0);for(let i=c;i<o;i++)n[i]=0;jt(s,o-8,BigInt(this.length*8),r),this.process(s,0);let a=j(e),h=this.outputLen;if(h%4)throw new Error("_sha2: outputLen should be aligned to 32bit");let x=h/4,l=this.get();if(x>l.length)throw new Error("_sha2: outputLen bigger than state");for(let i=0;i<x;i++)a.setUint32(4*i,l[i],r)}digest(){let{buffer:e,outputLen:n}=this;this.digestInto(e);let s=e.slice(0,n);return this.destroy(),s}_cloneInto(e){e||(e=new this.constructor),e.set(...this.get());let{blockLen:n,buffer:s,length:o,finished:r,destroyed:c,pos:a}=this;return e.length=o,e.pos=a,e.finished=r,e.destroyed=c,o%n&&e.buffer.set(s),e}}});function Ut(t,e=!1){return e?{h:Number(t&J),l:Number(t>>dt&J)}:{h:Number(t>>dt&J)|0,l:Number(t&J)|0}}function qt(t,e=!1){let n=new Uint32Array(t.length),s=new Uint32Array(t.length);for(let o=0;o<t.length;o++){let{h:r,l:c}=Ut(t[o],e);[n[o],s[o]]=[r,c]}return[n,s]}function he(t,e,n,s){let o=(e>>>0)+(s>>>0);return{h:t+n+(o/2**32|0)|0,l:o|0}}var J,dt,Jt,Qt,$t,te,ee,ne,se,oe,re,ce,ie,fe,ae,de,le,ue,xe,be,pe,ye,d,Ct=v(()=>{J=BigInt(4294967295),dt=BigInt(32);Jt=(t,e)=>BigInt(t>>>0)<<dt|BigInt(e>>>0),Qt=(t,e,n)=>t>>>n,$t=(t,e,n)=>t<<32-n|e>>>n,te=(t,e,n)=>t>>>n|e<<32-n,ee=(t,e,n)=>t<<32-n|e>>>n,ne=(t,e,n)=>t<<64-n|e>>>n-32,se=(t,e,n)=>t>>>n-32|e<<64-n,oe=(t,e)=>e,re=(t,e)=>t,ce=(t,e,n)=>t<<n|e>>>32-n,ie=(t,e,n)=>e<<n|t>>>32-n,fe=(t,e,n)=>e<<n-32|t>>>64-n,ae=(t,e,n)=>t<<n-32|e>>>64-n;de=(t,e,n)=>(t>>>0)+(e>>>0)+(n>>>0),le=(t,e,n,s)=>e+n+s+(t/2**32|0)|0,ue=(t,e,n,s)=>(t>>>0)+(e>>>0)+(n>>>0)+(s>>>0),xe=(t,e,n,s,o)=>e+n+s+o+(t/2**32|0)|0,be=(t,e,n,s,o)=>(t>>>0)+(e>>>0)+(n>>>0)+(s>>>0)+(o>>>0),pe=(t,e,n,s,o,r)=>e+n+s+o+r+(t/2**32|0)|0,ye={fromBig:Ut,split:qt,toBig:Jt,shrSH:Qt,shrSL:$t,rotrSH:te,rotrSL:ee,rotrBH:ne,rotrBL:se,rotr32H:oe,rotr32L:re,rotlSH:ce,rotlSL:ie,rotlBH:fe,rotlBL:ae,add:he,add3L:de,add3H:le,add4L:ue,add4H:xe,add5H:pe,add5L:be},d=ye});var ge,we,G,R,lt,Ft,Gt=v(()=>{_t();Ct();ht();[ge,we]=d.split(["0x428a2f98d728ae22","0x7137449123ef65cd","0xb5c0fbcfec4d3b2f","0xe9b5dba58189dbbc","0x3956c25bf348b538","0x59f111f1b605d019","0x923f82a4af194f9b","0xab1c5ed5da6d8118","0xd807aa98a3030242","0x12835b0145706fbe","0x243185be4ee4b28c","0x550c7dc3d5ffb4e2","0x72be5d74f27b896f","0x80deb1fe3b1696b1","0x9bdc06a725c71235","0xc19bf174cf692694","0xe49b69c19ef14ad2","0xefbe4786384f25e3","0x0fc19dc68b8cd5b5","0x240ca1cc77ac9c65","0x2de92c6f592b0275","0x4a7484aa6ea6e483","0x5cb0a9dcbd41fbd4","0x76f988da831153b5","0x983e5152ee66dfab","0xa831c66d2db43210","0xb00327c898fb213f","0xbf597fc7beef0ee4","0xc6e00bf33da88fc2","0xd5a79147930aa725","0x06ca6351e003826f","0x142929670a0e6e70","0x27b70a8546d22ffc","0x2e1b21385c26c926","0x4d2c6dfc5ac42aed","0x53380d139d95b3df","0x650a73548baf63de","0x766a0abb3c77b2a8","0x81c2c92e47edaee6","0x92722c851482353b","0xa2bfe8a14cf10364","0xa81a664bbc423001","0xc24b8b70d0f89791","0xc76c51a30654be30","0xd192e819d6ef5218","0xd69906245565a910","0xf40e35855771202a","0x106aa07032bbd1b8","0x19a4c116b8d2d0c8","0x1e376c085141ab53","0x2748774cdf8eeb99","0x34b0bcb5e19b48a8","0x391c0cb3c5c95a63","0x4ed8aa4ae3418acb","0x5b9cca4f7763e373","0x682e6ff3d6b2b8a3","0x748f82ee5defb2fc","0x78a5636f43172f60","0x84c87814a1f0ab72","0x8cc702081a6439ec","0x90befffa23631e28","0xa4506cebde82bde9","0xbef9a3f7b2c67915","0xc67178f2e372532b","0xca273eceea26619c","0xd186b8c721c0c207","0xeada7dd6cde0eb1e","0xf57d4f7fee6ed178","0x06f067aa72176fba","0x0a637dc5a2c898a6","0x113f9804bef90dae","0x1b710b35131c471b","0x28db77f523047d84","0x32caab7b40c72493","0x3c9ebe0a15c9bebc","0x431d67c49c100d4c","0x4cc5d4becb3e42b6","0x597f299cfc657e2a","0x5fcb6fab3ad6faec","0x6c44198c4a475817"].map(t=>BigInt(t))),G=new Uint32Array(80),R=new Uint32Array(80),lt=class extends q{constructor(){super(128,64,16,!1),this.Ah=1779033703,this.Al=-205731576,this.Bh=-1150833019,this.Bl=-2067093701,this.Ch=1013904242,this.Cl=-23791573,this.Dh=-1521486534,this.Dl=1595750129,this.Eh=1359893119,this.El=-1377402159,this.Fh=-1694144372,this.Fl=725511199,this.Gh=528734635,this.Gl=-79577749,this.Hh=1541459225,this.Hl=327033209}get(){let{Ah:e,Al:n,Bh:s,Bl:o,Ch:r,Cl:c,Dh:a,Dl:h,Eh:x,El:l,Fh:i,Fl:u,Gh:p,Gl:y,Hh:g,Hl:w}=this;return[e,n,s,o,r,c,a,h,x,l,i,u,p,y,g,w]}set(e,n,s,o,r,c,a,h,x,l,i,u,p,y,g,w){this.Ah=e|0,this.Al=n|0,this.Bh=s|0,this.Bl=o|0,this.Ch=r|0,this.Cl=c|0,this.Dh=a|0,this.Dl=h|0,this.Eh=x|0,this.El=l|0,this.Fh=i|0,this.Fl=u|0,this.Gh=p|0,this.Gl=y|0,this.Hh=g|0,this.Hl=w|0}process(e,n){for(let b=0;b<16;b++,n+=4)G[b]=e.getUint32(n),R[b]=e.getUint32(n+=4);for(let b=16;b<80;b++){let L=G[b-15]|0,H=R[b-15]|0,T=d.rotrSH(L,H,1)^d.rotrSH(L,H,8)^d.shrSH(L,H,7),k=d.rotrSL(L,H,1)^d.rotrSL(L,H,8)^d.shrSL(L,H,7),_=G[b-2]|0,U=R[b-2]|0,M=d.rotrSH(_,U,19)^d.rotrBH(_,U,61)^d.shrSH(_,U,6),Q=d.rotrSL(_,U,19)^d.rotrBL(_,U,61)^d.shrSL(_,U,6),N=d.add4L(k,Q,R[b-7],R[b-16]),$=d.add4H(N,T,M,G[b-7],G[b-16]);G[b]=$|0,R[b]=N|0}let{Ah:s,Al:o,Bh:r,Bl:c,Ch:a,Cl:h,Dh:x,Dl:l,Eh:i,El:u,Fh:p,Fl:y,Gh:g,Gl:w,Hh:A,Hl:F}=this;for(let b=0;b<80;b++){let L=d.rotrSH(i,u,14)^d.rotrSH(i,u,18)^d.rotrBH(i,u,41),H=d.rotrSL(i,u,14)^d.rotrSL(i,u,18)^d.rotrBL(i,u,41),T=i&p^~i&g,k=u&y^~u&w,_=d.add5L(F,H,k,we[b],R[b]),U=d.add5H(_,A,L,T,ge[b],G[b]),M=_|0,Q=d.rotrSH(s,o,28)^d.rotrBH(s,o,34)^d.rotrBH(s,o,39),N=d.rotrSL(s,o,28)^d.rotrBL(s,o,34)^d.rotrBL(s,o,39),$=s&r^s&a^r&a,Rt=o&c^o&h^c&h;A=g|0,F=w|0,g=p|0,w=y|0,p=i|0,y=u|0,{h:i,l:u}=d.add(x|0,l|0,U|0,M|0),x=a|0,l=h|0,a=r|0,h=c|0,r=s|0,c=o|0;let ut=d.add3L(M,N,Rt);s=d.add3H(ut,U,Q,$),o=ut|0}({h:s,l:o}=d.add(this.Ah|0,this.Al|0,s|0,o|0)),{h:r,l:c}=d.add(this.Bh|0,this.Bl|0,r|0,c|0),{h:a,l:h}=d.add(this.Ch|0,this.Cl|0,a|0,h|0),{h:x,l}=d.add(this.Dh|0,this.Dl|0,x|0,l|0),{h:i,l:u}=d.add(this.Eh|0,this.El|0,i|0,u|0),{h:p,l:y}=d.add(this.Fh|0,this.Fl|0,p|0,y|0),{h:g,l:w}=d.add(this.Gh|0,this.Gl|0,g|0,w|0),{h:A,l:F}=d.add(this.Hh|0,this.Hl|0,A|0,F|0),this.set(s,o,r,c,a,h,x,l,i,u,p,y,g,w,A,F)}roundClean(){G.fill(0),R.fill(0)}destroy(){this.buffer.fill(0),this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0)}},Ft=St(()=>new lt)});var me=It(()=>{Ht();Gt();K.sha512Sync=(...t)=>Ft(K.concatBytes(...t));self.__ed={verify:(t,e,n)=>Lt(t,e,n)}});me();})();
/*! Bundled license information:

@noble/ed25519/index.js:
  (*! noble-ed25519 - MIT License (c) 2019 Paul Miller (paulmillr.com) *)

@noble/hashes/esm/utils.js:
  (*! noble-hashes - MIT License (c) 2022 Paul Miller (paulmillr.com) *)
*/

// entropynet verifier: a service worker that refuses any page, script or style the team didn't sign.
// POLICY is pinned in this file. A release is accepted only if `threshold` of these keys signed it.
const POLICY = {"threshold":2,"signers":["J5nybktmcYMC1mgviFTPVBsDEBqDQ48of1597ouQF6BC","FjmNawh7JvwBCbjzLZaVPVBeVnHKLTNyeUAoDDe7cGza","GfMBzPB48BERdyaxhMRUsHVnDntX3MgL29rALBzed8UM"]};
const SPEC = 'entropynet-seal/v1';
const RELEASE = '/seal/release.json';
const BLOCK = '/__entropynet/blocked';
const CHECKED = new Set(['document', 'script', 'style', 'worker', 'sharedworker', 'serviceworker', 'iframe', 'frame', 'manifest', '']);
const enc = new TextEncoder();
const hex = (b) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
const unhex = (h) => new Uint8Array(h.match(/../g).map(x => parseInt(x, 16)));
const sha = async (d) => hex(await crypto.subtle.digest('SHA-256', typeof d === 'string' ? enc.encode(d) : d));
const A58 = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
function b58(s) { let n = 0n; for (const c of s) n = n * 58n + BigInt(A58.indexOf(c)); let h = n.toString(16); if (h.length % 2) h = '0' + h; const o = h === '0' ? [] : [...unhex(h)]; for (const c of s) { if (c !== '1') break; o.unshift(0); } return new Uint8Array(o); }

async function edVerify(pubB58, sigHex, msg) {
  const pub = b58(pubB58), sig = unhex(sigHex), m = enc.encode(msg);
  try { const k = await crypto.subtle.importKey('raw', pub, { name: 'Ed25519' }, false, ['verify']); return await crypto.subtle.verify({ name: 'Ed25519' }, k, sig, m); }
  catch { try { return self.__ed.verify(sig, m, pub); } catch { return false; } }
}
const filesRoot = (files) => sha(Object.entries(files).sort(([a], [b]) => (a < b ? -1 : 1)).map(([p, h]) => `${p} ${h}\n`).join(''));
const releaseId = (r) => sha([SPEC, r.files_root, r.beacon.round, r.beacon.randomness, r.created, r.prev || ''].join('\n'));

async function validate(r) {
  if (!r || r.spec !== SPEC || !r.files) return { ok: false, why: 'not a sealed release' };
  if (await filesRoot(r.files) !== r.files_root) return { ok: false, why: 'file list does not match its root hash' };
  if (await releaseId(r) !== r.id) return { ok: false, why: 'release id does not match its contents' };
  const good = new Set();
  for (const s of r.signatures || []) if (POLICY.signers.includes(s.signer) && !good.has(s.signer) && await edVerify(s.signer, s.sig, `${SPEC}:${r.id}`)) good.add(s.signer);
  if (good.size < POLICY.threshold) return { ok: false, why: `only ${good.size} of the ${POLICY.threshold} required team signatures` };
  return { ok: true, signers: [...good] };
}

// ---------- state ----------
let current = null, lastCheck = 0, events = [];
const store = () => caches.open('entropynet-seal-v1');
async function loadCurrent() { if (current) return current; const r = await (await store()).match('/__entropynet/current'); current = r ? await r.json() : null; return current; }
async function saveCurrent(s) { current = s; await (await store()).put('/__entropynet/current', new Response(JSON.stringify(s))); }

// Fetch the published release. Accept it only if it is valid AND (first visit, same release, or a newer valid release).
async function refresh(force) {
  const cur = await loadCurrent();
  if (!force && cur && Date.now() - lastCheck < 30000) return cur;
  lastCheck = Date.now();
  let r; try { r = await (await fetch(RELEASE, { cache: 'no-store' })).json(); } catch { return cur; }
  if (cur && r.id === cur.release.id) { if (r.anchor && !cur.release.anchor) { cur.release.anchor = r.anchor; await saveCurrent(cur); anchorCheck(); } return cur; }
  const v = await validate(r);
  if (!v.ok) { await alarm({ kind: 'bad-release', path: RELEASE, detail: v.why, got: r && r.id }); return cur; }
  if (cur && !(r.created > cur.release.created)) { await alarm({ kind: 'rollback', path: RELEASE, detail: 'an older release was offered', got: r.id }); return cur; }
  const next = { release: r, signers: v.signers, accepted_at: Date.now(), first_visit: !cur, previous: cur ? cur.release.id : null, anchor_status: 'checking' };
  await saveCurrent(next); anchorCheck();
  return next;
}
async function anchorCheck() {
  const cur = await loadCurrent(); if (!cur) return;
  const a = cur.release.anchor; if (!a) { cur.anchor_status = 'not anchored yet'; return saveCurrent(cur); }
  const rpc = a.cluster === 'devnet' ? 'https://api.devnet.solana.com' : 'https://api.mainnet-beta.solana.com';
  try {
    const j = await (await fetch(rpc, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTransaction', params: [a.tx, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0, commitment: 'confirmed' }] }) })).json();
    const found = j.result && !j.result.meta.err && JSON.stringify(j.result.transaction).includes(`release=${cur.release.id}`);
    cur.anchor_status = found ? 'confirmed on ' + a.cluster : 'NOT FOUND on ' + a.cluster;
  } catch { cur.anchor_status = 'could not reach ' + a.cluster; }
  await saveCurrent(cur); broadcast({ type: 'status' });
}

// ---------- tamper alarm: signed evidence ----------
let evKey;
async function alarm(e) {
  e.time = Date.now(); e.release = current ? current.release.id : null; e.test = String(e.path || '').startsWith('/tamper-test/');
  events.unshift(e); events = events.slice(0, 20); broadcast({ type: 'tamper', event: e });
  try {
    evKey = evKey || await crypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
    const body = JSON.stringify({ ...e, origin: self.location.origin, ua: navigator.userAgent.slice(0, 120) });
    const sig = hex(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, evKey.privateKey, enc.encode(body)));
    const pub = hex(await crypto.subtle.exportKey('raw', evKey.publicKey));
    await fetch('/api/tamper', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ evidence: body, sig, pub }) });
  } catch {}
}
async function broadcast(m) { for (const c of await self.clients.matchAll({ includeUncontrolled: true })) c.postMessage(m); }

// ---------- block screen ----------
const cut = (h) => { h = String(h || ''); return h.length > 40 ? h.slice(0, 20) + '…' + h.slice(-8) : h; };
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
function blockPage(q) {
  const test = q.get('test') === '1';
  return new Response(`<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>blocked · entropynet seal</title>
<style>body{margin:0;background:#17171a;color:#f2f0e9;font:14px/1.6 ui-monospace,Menlo,monospace;display:grid;place-items:center;min-height:100vh}pre{margin:24px;white-space:pre-wrap;max-width:760px;overflow-wrap:anywhere}b{color:#e0673b}a{color:#f2f0e9}i{color:#9a978d;font-style:normal}</style>
<pre>┌──────────────────────────────────────────────────────────┐
│  <b>BLOCKED</b> · this file is not what the team signed          │
└──────────────────────────────────────────────────────────┘

<i>visitor@${esc(self.location.host)}:~</i> <b>[blocked]</b>
<i>$</i> entropynet verify ${esc(q.get('path'))}

[*]    file      ${esc(q.get('path'))}
[*]    sealed    ${esc(cut(q.get('want')))}
<b>[fire]</b> served    ${esc(cut(q.get('got')))}
[*]    release   ${esc(cut(q.get('rel')))}
<b>[OK]</b>   result    stopped before it ran · reported

Your browser stopped it before it ran. ${test ? '<b>This was the tamper test:</b> the server really did serve a swapped file (a harmless fake "drainer"), and the seal refused it.' : 'The server is sending code the team never signed. Do not connect a wallet here. The incident has been reported to the public tamper feed.'}

<i>// entropynet seal · checked in your browser, not by the server</i>
${test ? '<a href="/#seal" target="_top">← back to the site</a>' : '<i>this page stays blocked until the server sends the signed files again.</i>'}
</pre>`, { status: 451, headers: { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' } });
}

// ---------- fetch interception ----------
self.addEventListener('install', (e) => { e.waitUntil(self.skipWaiting()); });
self.addEventListener('activate', (e) => { e.waitUntil((async () => { await self.clients.claim(); await refresh(true); })()); });
self.addEventListener('message', (e) => {
  if (e.data && e.data.type === 'status') e.waitUntil((async () => { const s = await refresh(false); e.source.postMessage({ type: 'status', state: s && { id: s.release.id, files_root: s.release.files_root, created: s.release.created, beacon: s.release.beacon, signers: s.signers, threshold: POLICY.threshold, policy: POLICY.signers, files: Object.keys(s.release.files).length, anchor: s.release.anchor, anchor_status: s.anchor_status, first_visit: s.first_visit, previous: s.previous }, events }); })());
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin || e.request.method !== 'GET') return;
  if (url.pathname === BLOCK) return e.respondWith(blockPage(url.searchParams));
  if (url.pathname.startsWith('/api/') || url.pathname === RELEASE || url.pathname === '/sw.js') return;
  e.respondWith(guard(e));
});

async function guard(e) {
  const req = e.request, url = new URL(req.url);
  const s = await refresh(req.mode === 'navigate');
  if (!s) return fetch(req);   // no valid release could be loaded: fail open, but say so in the UI (see FAQ)
  const key = url.pathname.endsWith('/') ? url.pathname + 'index.html' : url.pathname;
  // navigations to unsealed paths fall back to a sealed shell: /s/<slug> -> /s/index.html (sealed mini-sites), else /index.html
  const shell = url.pathname.startsWith('/s/') && s.release.files['/s/index.html'] ? '/s/index.html' : '/index.html';
  const want = s.release.files[key] || (req.mode === 'navigate' ? s.release.files[shell] : undefined);
  const dest = req.mode === 'navigate' ? 'document' : req.destination;
  const res = await fetch(req.mode === 'navigate' ? new Request(url.origin + (s.release.files[key] ? key : shell), { cache: 'no-cache' }) : new Request(req, { cache: 'no-cache' }));
  if (!want) {
    if (!CHECKED.has(dest) || !res.ok) return res;
    return block(e, { path: key, want: 'not in the sealed release', got: 'unsigned file', dest });
  }
  const buf = await res.arrayBuffer();
  const got = await sha(buf);
  if (got === want) { const h = new Headers(res.headers); h.delete('content-encoding'); h.delete('content-length'); return new Response(buf, { status: res.status, statusText: res.statusText, headers: h }); }
  return block(e, { path: key, want, got, dest, size: buf.byteLength, excerpt: new TextDecoder().decode(buf.slice(0, 300)) });
}

async function block(e, d) {
  const cur = await loadCurrent();
  await alarm({ kind: 'mismatch', path: d.path, expected: d.want, got: d.got, size: d.size, excerpt: d.excerpt });
  const q = new URLSearchParams({ path: d.path, want: d.want, got: d.got, rel: cur ? cur.release.id : '', test: d.path.startsWith('/tamper-test/') ? '1' : '0' });
  if (d.dest === 'document') return blockPage(q);
  // A sub-resource was swapped: stop it and take the whole tab to the block screen.
  const c = e.clientId && await self.clients.get(e.clientId);
  if (c && c.navigate) c.navigate(BLOCK + '?' + q).catch(() => {});
  return new Response('/* blocked by entropynet seal */', { status: 451, headers: { 'content-type': d.dest === 'style' ? 'text/css' : 'text/javascript' } });
}

// The SW can't police its own updates. It watches for them and raises the alarm.
setInterval(async () => {
  const cur = await loadCurrent(); if (!cur || !cur.release.files['/sw.js']) return;
  try { const b = await (await fetch('/sw.js', { cache: 'no-store' })).arrayBuffer(); const h = await sha(b); if (h !== cur.release.files['/sw.js']) alarm({ kind: 'verifier-changed', path: '/sw.js', expected: cur.release.files['/sw.js'], got: h }); } catch {}
}, 60000);
