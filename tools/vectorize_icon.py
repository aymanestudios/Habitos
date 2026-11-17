import sys  # uso: python3 tools/vectorize_icon.py icono_original.png
import numpy as np, cv2
from PIL import Image
src=np.array(Image.open(sys.argv[1]).convert('RGB')).astype(float)
pal={'bg':(250,250,228),'orange':(228,124,4),'light':(250,220,135),'dorange':(180,90,5),'brown':(55,28,4)}
names=list(pal);P=np.array([pal[n] for n in names],float)
d=((src[:,:,None,:]-P[None,None])**2).sum(-1);lab=d.argmin(-1)
S=4
def mask(ids,dil=0,sig=1.3):
    m=np.isin(lab,[names.index(i) for i in ids]).astype(np.uint8)*255
    m=cv2.medianBlur(m,5)
    if dil: m=cv2.dilate(m,np.ones((3,3),np.uint8),iterations=dil)
    m=cv2.resize(m,None,fx=S,fy=S,interpolation=cv2.INTER_CUBIC)
    m=cv2.GaussianBlur(m,(0,0),S*sig)
    return (m>127).astype(np.uint8)
def path(m):
    cs,h=cv2.findContours(m,cv2.RETR_CCOMP,cv2.CHAIN_APPROX_NONE)
    out=[]
    for c in cs:
        if cv2.contourArea(c)<S*S*6: continue
        c=cv2.approxPolyDP(c,1.0,True)[:,0,:].astype(float)/S
        n=len(c)
        if n<3: continue
        # smooth closed curve via midpoints quadratic
        mids=(c+np.roll(c,-1,0))/2
        s=f"M{mids[-1][0]:.2f} {mids[-1][1]:.2f}"
        for i in range(n): s+=f"Q{c[i][0]:.2f} {c[i][1]:.2f} {mids[i][0]:.2f} {mids[i][1]:.2f}"
        out.append(s+"Z")
    return ''.join(out)
hexc=lambda c:'#%02X%02X%02X'%c
layers=[('orange',['orange','light','dorange','brown'],0,2.4),('dorange',['dorange'],1,1.6),('light',['light'],1,1.6),('brown',['brown'],0,1.3)]
body=''.join(f'<path fill="{hexc(pal[n])}" fill-rule="evenodd" d="{path(mask(ids,dl,sg))}"/>' for n,ids,dl,sg in layers)
# bounding box of head
ys,xs=np.where(lab!=0);x0,x1,y0,y1=xs.min(),xs.max(),ys.min(),ys.max()
print(x0,x1,y0,y1)
open('./body.txt','w').write(body)
open('./bbox.txt','w').write(f"{x0} {y0} {x1} {y1}")
