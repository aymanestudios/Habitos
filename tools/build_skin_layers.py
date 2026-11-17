# Genera las capas animadas (public/skins/<código>/) y las siluetas (public/skins/sil/) de cada skin.
# Necesita Pillow, numpy y scipy. Los polígonos de orejas/cola/corona se ajustan a mano (rutas de /tmp: adaptar).
from PIL import Image, ImageDraw
import numpy as np, json, os, secrets, shutil
from scipy import ndimage as ndi
SRC='/tmp/skins'; OUT='/home/claude/App-Habitos-Duolingo/public/skins'
meta={m['file']:m for m in json.load(open(SRC+'/meta.json'))}
# parts: poly (global px), pivot, anim, z ('back'|'front'), dir
SPECS={
 'da84f6836f.webp':dict(body='breathe',parts=[
   dict(poly=[(0,255),(125,255),(126,330),(140,345),(143,400),(140,440),(0,440)],pivot=(140,350),anim='tail',z='back',dir=1),
   dict(poly=[(132,80),(140,62),(148,42),(160,20),(180,6),(200,4),(220,14),(238,26),(238,32),(200,48),(170,64),(150,78)],pivot=(185,58),anim='ear',z='front',dir=1),
   dict(poly=[(384,82),(400,82),(420,90),(430,110),(433,140),(426,165),(433,180),(426,193),(405,186),(392,176),(385,140)],pivot=(388,150),anim='ear',z='front',dir=-1,delay=0.6)],
   deco={2:'twinkle',3:'planet',4:'twinkle',5:'twinkle'}),
 'fb94fd82ab.webp':dict(body='swimbody',parts=[
   dict(poly=[(0,120),(148,120),(150,190),(135,225),(118,265),(100,300),(92,330),(0,330)],pivot=(145,230),anim='tail',z='back',dir=-1),
   dict(poly=[(190,112),(198,80),(210,45),(230,15),(250,5),(265,8),(290,30),(312,52),(270,70),(230,90),(205,108)],pivot=(255,88),anim='ear',z='front',dir=1)],
   deco={2:'bubble',3:'bubble',4:'bubble',5:'bubble',6:'bubble',7:'bubble',8:'fish'}),
 'e1969c542c.webp':dict(body='bounce',parts=[],deco={2:'pulse',3:'pulse',4:'pulse',5:'pulse'}),
 'ee4f8edd93.webp':dict(body='beat',body_src='/tmp/djfix/body_noears.png',extra_back=[
   ('/tmp/djfix/ear_l.png',(244,80),1,0.0),('/tmp/djfix/ear_r.png',(372,98),-1,0.8)],parts=[
   dict(poly=[(0,195),(80,195),(90,210),(105,228),(118,245),(110,262),(100,282),(80,305),(70,330),(68,360),(0,360)],pivot=(100,270),anim='tail',z='back',dir=1)],
   deco={2:'note',3:'note',4:'note'}),
 'c688da4ae1.webp':dict(body='breathe',parts=[
   dict(poly=[(0,255),(92,255),(96,300),(98,345),(84,372),(64,402),(44,426),(30,450),(0,450)],pivot=(95,345),anim='tail',z='back',dir=1),
   dict(poly=[(75,175),(78,120),(84,85),(100,76),(130,80),(155,88),(150,97),(125,128),(100,160),(88,182)],pivot=(115,150),anim='ear',z='front',dir=1),
   dict(poly=[(255,92),(262,72),(285,60),(310,58),(325,70),(338,100),(342,125),(348,140),(335,147),(320,120),(300,100),(275,93)],pivot=(305,112),anim='ear',z='front',dir=-1,delay=1.1),
   dict(poly=[(116,0),(266,0),(266,100),(116,100)],pivot=(190,92),anim='crown',z='front',dir=1,color='gold')],
   deco={2:'twinkle',3:'twinkle',4:'twinkle',5:'twinkle'}),
}
def crop_layer(arr,mask,pad=2):
    ys,xs=np.where(mask)
    y0,y1=max(0,ys.min()-pad),min(arr.shape[0],ys.max()+pad+1); x0,x1=max(0,xs.min()-pad),min(arr.shape[1],xs.max()+pad+1)
    out=arr.copy(); out[~mask,3]=0
    return Image.fromarray(out[y0:y1,x0:x1]),(x0,y0,x1-x0,y1-y0)
SIL={'da84f6836f':'c96c42e985','fb94fd82ab':'a14523f246','e1969c542c':'aa668b2cc0','ee4f8edd93':'cfa17371c9','c688da4ae1':'07416e3023'}
summary={}
for f,spec in SPECS.items():
    code=f[:-5]; m=meta[f]; W,H=m['w'],m['h']
    arr=np.array(Image.open(f'{SRC}/{f}').convert('RGBA'))
    body=np.array(Image.open(spec['body_src']).convert('RGBA')) if spec.get('body_src') else arr.copy()
    al=arr[...,3]>30
    lab,n=ndi.label(ndi.binary_dilation(al,iterations=2))
    d=os.path.join(OUT,code); shutil.rmtree(d,ignore_errors=True); os.makedirs(d)
    layers=[]; k=0
    def add(img,box,anim,z,pivot=None,dir=1,delay=0.0):
        global k
        name=f'l{len(layers)}.webp'; img.save(os.path.join(d,name),'WEBP',quality=90,method=6)
        x,y,w,h=box
        ox=50 if pivot is None else round((pivot[0]-x)/w*100,1); oy=50 if pivot is None else round((pivot[1]-y)/h*100,1)
        layers.append(dict(src=name,x=round(x/W*100,2),y=round(y/H*100,2),w=round(w/W*100,2),h=round(h/H*100,2),anim=anim,z=z,ox=ox,oy=oy,dir=dir,delay=delay))
    # decos
    decos=[]
    for ci,anim in spec['deco'].items():
        cm=ndi.binary_dilation(lab==ci,iterations=1)&(arr[...,3]>0)
        img,box=crop_layer(arr,cm); body[cm,3]=0
        decos.append((img,box,anim,ci))
    # parts
    fronts=[];backs=[]
    for i,p in enumerate(spec['parts']):
        pm=Image.new('L',(W,H),0); ImageDraw.Draw(pm).polygon(p['poly'],fill=255); pm=np.array(pm)>0
        if p.get('color')=='gold':
            r,g,b=[arr[...,i].astype(int) for i in range(3)]
            gold=(r>200)&(g>150)&(b<140)&((r-g)<85)&(arr[...,3]>100)&pm
            lab2,n2=ndi.label(gold); sizes=ndi.sum(gold,lab2,range(1,n2+1))
            gold=np.isin(lab2,[i+1 for i,v in enumerate(sizes) if v>40])
            gold=ndi.binary_fill_holes(ndi.binary_closing(gold,iterations=3))
            pm=ndi.binary_dilation(gold,iterations=4)&pm&(arr[...,3]>0)
        lay=ndi.binary_dilation(pm,iterations=6)&(arr[...,3]>0)
        img,box=crop_layer(arr,lay)
        body[pm,3]=0
        (backs if p['z']=='back' else fronts).append((img,box,p))
    for img,box,p in backs: add(img,box,p['anim'],'back',p['pivot'],p.get('dir',1),p.get('delay',0))
    for path,pivot,dr,dl in spec.get('extra_back',[]):
        e=np.array(Image.open(path).convert('RGBA')); img,box=crop_layer(e,e[...,3]>0)
        add(img,box,'ear','back',pivot,dr,dl)
    bm=body[...,3]>0; bimg,bbox=crop_layer(body,bm,0); add(bimg,bbox,'none','body')
    for img,box,p in fronts: add(img,box,p['anim'],'front',p['pivot'],p.get('dir',1),p.get('delay',0))
    for j,(img,box,anim,ci) in enumerate(decos): add(img,box,anim,'deco',None,1 if j%2==0 else -1,round(j*0.37%1.6,2))
    man=dict(w=W,h=H,body=spec['body'],layers=layers)
    json.dump(man,open(os.path.join(d,'manifest.json'),'w'))
    summary[code]=len(layers)
    # silhouette: white shape (the app darkens it with CSS)
    sil=np.zeros_like(arr); sil[...,:3]=255; sil[...,3]=arr[...,3]
    s=Image.fromarray(sil); s.thumbnail((260,260),Image.LANCZOS)
    tok=SIL.get(code) or secrets.token_hex(5); os.makedirs(os.path.join(OUT,'sil'),exist_ok=True)
    s.save(os.path.join(OUT,'sil',tok+'.webp'),'WEBP',quality=85,method=6)
    summary[code]=(len(layers),'sil/'+tok+'.webp')
json.dump(summary,open('summary.json','w')); print(summary)
