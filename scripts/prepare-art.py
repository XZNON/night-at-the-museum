"""Local crop/registration/export of inspected DreamLayer sources, never generation."""
from pathlib import Path
from PIL import Image, ImageEnhance, ImageDraw, ImageFilter, ImageOps
import numpy as np
import json, hashlib

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/'asset-sources/manifest.json'
m=json.loads(MANIFEST.read_text())

def export(asset_id, output, size, shadow=False, opaque=False):
    a=next(a for a in m['assets'] if a['id']==asset_id)
    if a['status'] not in ['generated','prepared','integrated']: raise ValueError('Source not delivered')
    im=Image.open(ROOT/a['sourcePath']).convert('RGBA')
    notes=[]
    if shadow:
        # The inspected standing-pose baseline extends beyond both boots.
        # Remove only those side pixels, preserving the boots and their baseline.
        alpha=im.getchannel('A')
        for y in range(1890,im.height):
            for x in range(im.width):
                if x<882 or x>1248: alpha.putpixel((x,y),0)
        im.putalpha(alpha); notes.append('Removed standing-pose baseline shadow outside boots below source y1890.')
    crop=None
    if asset_id=='royal-supper.background':
        crop=(0,0,im.width,790)
        im=im.crop(crop)
        notes.append('Kept only palace and far-side diner strip; excluded erroneous modern foreground figures and near table edge below source y790.')
        alpha=Image.new('L',im.size,255)
        fade=Image.linear_gradient('L').rotate(180).resize((im.width,80))
        alpha.paste(fade,(0,im.height-80)); im.putalpha(alpha)
        notes.append('Authored 80-pixel lower-edge fade into the scene background.')
    if not opaque:
        crop=im.getchannel('A').point(lambda x:255 if x>16 else 0).getbbox()
        if not crop: raise ValueError('Empty cutout')
        im=im.crop(crop); notes.append('Trimmed transparent margins with alpha threshold 16; retained feathered edges.')
    im.thumbnail(size,Image.Resampling.LANCZOS)
    path=ROOT/output; path.parent.mkdir(parents=True,exist_ok=True)
    if output.endswith('.webp'): im.save(path,quality=88)
    else: im.save(path,optimize=True)
    a.update(status='prepared',runtimePath=output,preparedPixelSize={'width':im.width,'height':im.height},
             preparationNotes=' '.join(notes)+' Local proportional Lanczos resize; original preserved.',
             runtimeSha256=hashlib.sha256(path.read_bytes()).hexdigest(),cropBox=crop)
    print(asset_id, '=>',output,im.size)

export('player.idle','public/assets/player/idle.png',(256,256),shadow=True)
# Locally authored registered poses, derived from the same DreamLayer cutout.
# They are not claimed to be separately generated or a DreamLayer animation.
player=Image.open(ROOT/'public/assets/player/idle.png').convert('RGBA')
frames={}
idle=Image.new('RGBA',(128,272)); idle.alpha_composite(player,((128-player.width)//2,8)); frames['idle']=idle
upper=player.crop((0,0,player.width,214))
leg=player.crop((24,208,player.width,256))
for name,angle in [('walk-a',-9),('walk-b',9)]:
    frame=Image.new('RGBA',(128,272))
    for rotation,brightness in [(-angle,.72),(angle,1)]:
        layer=Image.new('RGBA',(128,64)); layer.alpha_composite(leg,(15+24,0))
        layer=layer.rotate(rotation,Image.Resampling.BICUBIC,center=(64,4))
        layer=ImageEnhance.Brightness(layer).enhance(brightness)
        frame.alpha_composite(layer,(0,216))
    frame.alpha_composite(upper,(15,8))
    # Keep the authored ground baseline fixed across all grounded frames.
    frame.paste((0,0,0,0),(0,264,128,272)); frames[name]=frame
frames['jump']=idle.rotate(-6,Image.Resampling.BICUBIC,center=(64,140))
for name,im in frames.items():
    path=ROOT/f'public/assets/player/{name}.png'; im.save(path,optimize=True)
    if name=='idle': a=next(a for a in m['assets'] if a['id']=='player.idle')
    else:
        asset_id=f'player.{name}'
        a=next((a for a in m['assets'] if a['id']==asset_id),None)
        if a is None:
            a=dict(id=asset_id,world='shared',provider='DreamLayer',operation='local_pose_composite',
                   sourcePath='asset-sources/production/player-idle-cutout.png',referenceIds=['player.idle'],
                   executionId=None,creditsSpent=0,approved=False)
            m['assets'].append(a)
    a.update(status='prepared',runtimePath=path.relative_to(ROOT).as_posix(),preparedPixelSize={'width':128,'height':272},
             runtimeSha256=hashlib.sha256(path.read_bytes()).hexdigest(),
             preparationNotes='Inspected DreamLayer cutout; locally authored pose, common 128x272 canvas, foot baseline y264. No separate generation credit.')
sheet=Image.new('RGB',(512,300),'#4c3037'); draw=ImageDraw.Draw(sheet)
for i,(name,im) in enumerate(frames.items()): sheet.paste(im,(i*128,20),im); draw.text((i*128+40,3),name,fill='#ffe3bc')
sheet.save(ROOT/'asset-sources/production/player-pose-review.png')
if any(a['id']=='royal-supper.background' and a['status'] in ['generated','prepared','integrated'] for a in m['assets']):
    export('royal-supper.background','public/assets/supper/background.webp',(1600,1600),opaque=True)
if any(a['id']=='royal-supper.bread.cutout' and a['status'] in ['generated','prepared','integrated'] for a in m['assets']):
    export('royal-supper.bread.cutout','public/assets/supper/bread.png',(640,320))
else:
    a=next(a for a in m['assets'] if a['id']=='royal-supper.bread')
    source=Image.open(ROOT/a['sourcePath']).convert('RGB')
    im=source.crop((500,690,2070,1080)).resize((640,256),Image.Resampling.LANCZOS)
    crust=source.crop((650,460,1700,540)).resize((640,18),Image.Resampling.LANCZOS)
    im.paste(crust,(0,0)); im.paste(ImageEnhance.Brightness(crust).enhance(.6),(0,238))
    side=ImageEnhance.Brightness(crust.crop((280,0,298,18)).resize((12,256))).enhance(.7)
    im.paste(side,(0,0)); im.paste(side,(628,0))
    im.save(ROOT/'public/assets/supper/bread.png')
    a.update(status='prepared',runtimePath='public/assets/supper/bread.png',preparedPixelSize={'width':640,'height':256},
             cropBox=[500,690,2070,1080],preparationNotes='Local painted bread cross-section crop plus source-crust border for flat authored rectangular landings. Cutout service was unavailable; opaque texture and authored crust cap align to collision.',
             runtimeSha256=hashlib.sha256((ROOT/'public/assets/supper/bread.png').read_bytes()).hexdigest())
# Aligned masterpiece, masks and matching pear use one approved source image.
master=Image.open(ROOT/'asset-sources/references/masterpiece.png').convert('RGB')
pear_box=(1024,535,1170,717)
pear=master.crop(pear_box).convert('RGBA')
rgb=np.array(pear)[:,:,:3].astype(float)
warm=(rgb[:,:,0]-rgb[:,:,1]>8)&(rgb[:,:,1]-rgb[:,:,2]>8)&(rgb[:,:,0]>40)
mask=Image.fromarray((warm*255).astype('uint8')).filter(ImageFilter.MaxFilter(3)).filter(ImageFilter.MinFilter(3))
ImageDraw.floodfill(mask,(55,100),128)
mask=Image.fromarray((np.array(mask)==128).astype('uint8')*255)
ImageDraw.Draw(mask).line([(36,0),(42,10),(45,25),(44,38)],fill=255,width=3)
mask=mask.filter(ImageFilter.GaussianBlur(.6)); pear.putalpha(mask)
pear.thumbnail((128,160),Image.Resampling.LANCZOS)
path=ROOT/'public/assets/restoration'; path.mkdir(parents=True,exist_ok=True)
pear.save(path/'pear.png')
full=master.resize((1600,900),Image.Resampling.LANCZOS)
grey=ImageEnhance.Brightness(ImageOps.grayscale(full).convert('RGB')).enhance(.72)
pear_mask=Image.new('L',full.size)
pear_mask.paste(mask.resize((round((pear_box[2]-pear_box[0])*.625),round((pear_box[3]-pear_box[1])*.625)),Image.Resampling.LANCZOS),(round(pear_box[0]*.625),round(pear_box[1]*.625)))
sun_mask=Image.new('L',full.size); ImageDraw.Draw(sun_mask).ellipse((1255,216,1340,292),fill=255)
sun_mask=sun_mask.filter(ImageFilter.GaussianBlur(1))
garden_mask=Image.new('L',full.size); ImageDraw.Draw(garden_mask).rectangle((0,0,1000,900),fill=255)
garden_mask=garden_mask.filter(ImageFilter.GaussianBlur(55))
faded=grey.copy(); faded.paste(Image.new('RGB',full.size,'#31383a'),(0,0),pear_mask)
faded.paste(Image.new('RGB',full.size,'#383b42'),(0,0),sun_mask)
restored=Image.composite(full,faded,garden_mask)
restored.paste(Image.new('RGB',full.size,'#383b42'),(0,0),sun_mask)
for name,im in [('damaged',faded),('pear-restored',restored),('complete',full)]: im.save(path/(name+'.webp'),quality=91)
pear_mask.save(path/'pear-mask.png'); sun_mask.save(path/'sun-mask.png'); garden_mask.save(path/'garden-mask.png')
entrance=Image.open(ROOT/'asset-sources/references/banquet-v5.png').convert('RGB'); entrance.thumbnail((1600,900)); entrance.save(ROOT/'public/assets/supper/entrance.webp',quality=90)
for asset_id,rel,refs,notes in [
    ('restoration.pear','public/assets/restoration/pear.png',['masterpiece.reference'],'Locally authored feathered pear silhouette at source box 1024,535,1170,717. Same pixels/shape in world and inventory.'),
    ('masterpiece.damaged','public/assets/restoration/damaged.webp',['masterpiece.reference'],'Aligned grayscale base with authored pear/sun silhouettes.'),
    ('masterpiece.pear-restored','public/assets/restoration/pear-restored.webp',['masterpiece.reference'],'Same canvas; pear/tree/garden region coloured using authored feathered garden mask; sun remains missing.'),
    ('masterpiece.complete','public/assets/restoration/complete.webp',['masterpiece.reference'],'Approved reference resized; aligned full composition retained for later sun restoration.'),
    ('masterpiece.pear-mask','public/assets/restoration/pear-mask.png',['masterpiece.reference'],'Authored aligned pear alpha mask.'),
    ('masterpiece.sun-mask','public/assets/restoration/sun-mask.png',['masterpiece.reference'],'Authored aligned sun region mask; no mountain scene asset generated.'),
    ('masterpiece.garden-mask','public/assets/restoration/garden-mask.png',['masterpiece.reference'],'Authored aligned first-stage colour restoration mask.'),
    ('royal-supper.entrance','public/assets/supper/entrance.webp',['banquet.reference.v5'],'Approved banquet reference resized for the existing museum frame; room geometry unchanged.')]:
    a=next((a for a in m['assets'] if a['id']==asset_id),None)
    if a is None:
        a=dict(id=asset_id,world='masterpiece' if asset_id.startswith(('masterpiece.','restoration.')) else 'royal-supper',provider='DreamLayer',operation='local_preparation',referenceIds=refs,sourcePath='asset-sources/references/masterpiece.png' if refs[0]=='masterpiece.reference' else 'asset-sources/references/banquet-v5.png',executionId=None,creditsSpent=0,approved=False)
        m['assets'].append(a)
    file=ROOT/rel; im=Image.open(file)
    a.update(status='prepared',runtimePath=rel,preparedPixelSize={'width':im.width,'height':im.height},preparationNotes=notes,runtimeSha256=hashlib.sha256(file.read_bytes()).hexdigest())
MANIFEST.write_text(json.dumps(m,indent=2)+'\n')
