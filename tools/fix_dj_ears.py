from PIL import Image, ImageDraw
import numpy as np
from scipy import ndimage as ndi
im=Image.open('orig.webp').convert('RGBA'); W,H=im.size; S=4
a=np.array(im)
OUT=np.array([40,26,28,255]); WHITE=np.array([252,238,228,255]); RED=np.array([176,60,40,255])
C=lambda x: 0.0058*(x-280)**2+52-4
yy,xx=np.mgrid[0:H,0:W]
cupL=((xx-168)**2+(yy-100)**2)<53**2
cupR=((xx-398)**2+(yy-155)**2)<42**2
bracket=Image.new('L',(W,H),0); ImageDraw.Draw(bracket).polygon([(140,62),(146,46),(160,40),(176,40),(186,46),(188,62)],fill=255); bracket=np.array(bracket)>0
erase=(((xx>=172)&(xx<=430)&(yy<C(xx)))|((xx>=140)&(xx<172)&(yy<62)))&~cupL&~cupR&~bracket
rem=a.copy(); rem[erase,3]=0

def rounded(poly,R):
    m=Image.new('L',(W*S,H*S),0); ImageDraw.Draw(m).polygon([(x*S,y*S) for x,y in poly],fill=255); m=np.array(m)>0
    core=ndi.distance_transform_edt(m)>R*S
    return ndi.distance_transform_edt(~core)<=R*S
def ear(tip,bl,br):
    outer=rounded([tip,bl,br],7)
    white=ndi.distance_transform_edt(outer)>4.5*S
    bx=(bl[0]+br[0])/2; by=(bl[1]+br[1])/2
    lerp=lambda p,q,t:(p[0]+(q[0]-p[0])*t,p[1]+(q[1]-p[1])*t)
    t2=lerp(tip,(bx,by),0.30); b2=lerp(bl,br,0.22); b3=lerp(br,bl,0.22)
    b2=lerp(b2,tip,-0.05); b3=lerp(b3,tip,-0.05)
    inner=rounded([t2,b2,b3],6)&white
    img=np.zeros((H*S,W*S,4),np.uint8)
    img[outer]=OUT; img[white]=WHITE; img[inner]=RED
    return Image.fromarray(img).resize((W,H),Image.LANCZOS)
canvas=Image.new('RGBA',(W,H),(0,0,0,0))
earL=ear((226,2),(196,92),(292,64)); earR=ear((410,36),(326,74),(424,120))
earL.save('ear_l.png'); earR.save('ear_r.png')
canvas.alpha_composite(earL); canvas.alpha_composite(earR)
# band over the head (cups cover both ends)
band=Image.new('RGBA',(W*S,H*S),(0,0,0,0)); d=ImageDraw.Draw(band)
ctrl=[(158,74),(178,54),(205,46)]+[(x,C(x)-5) for x in range(262,408,6)]
from scipy.interpolate import CubicSpline
xs=np.array([p[0] for p in ctrl],float); ys=np.array([p[1] for p in ctrl],float)
cs=CubicSpline(xs,ys)
pts=[(x*S,float(cs(x))*S) for x in np.arange(158,406,2)]
def strip(points,width,offset=0.0):
    P=np.array(points,float); T=np.gradient(P,axis=0); T/=np.linalg.norm(T,axis=1,keepdims=True)
    N=np.stack([-T[:,1],T[:,0]],1)
    top=P+N*(offset+width/2); bot=P+N*(offset-width/2)
    return [tuple(p) for p in top]+[tuple(p) for p in bot[::-1]]
d.polygon(strip(pts,15*S),fill=(40,26,28,255))
d.polygon(strip(pts,7*S),fill=(62,52,74,255))
d.polygon(strip(pts,2.2*S,-2.6*S),fill=(150,80,230,255))
canvas.alpha_composite(band.resize((W,H),Image.LANCZOS))
canvas.alpha_composite(Image.fromarray(rem))
noears=Image.new('RGBA',(W,H),(0,0,0,0)); noears.alpha_composite(band.resize((W,H),Image.LANCZOS)); noears.alpha_composite(Image.fromarray(rem)); noears.save('body_noears.png')
canvas.save('fixed.webp','WEBP',quality=92,method=6)
c=Image.new('RGBA',(W,H),(60,50,90,255)); c.alpha_composite(canvas); c.crop((120,0,460,200)).resize((680,400)).save('preview.png')
c2=Image.new('RGBA',(W,H),(255,250,240,255)); c2.alpha_composite(canvas); c2.save('full_light.png')
