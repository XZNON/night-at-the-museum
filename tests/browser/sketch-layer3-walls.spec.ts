import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { traverseLayerOne } from './sketch-layer1-controls';

test.use({ headless: false });
const DIR = 'docs/validation/sketch-s4/s4a';
const URL = 'http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-3-walls';
type State = {
  body: {x:number;y:number;vx:number;vy:number;grounded:boolean}; paused:boolean; updateCount:number;
  canvasCount:number; geometryCount:number; textureCount:number;
  sketch: {stage:string;leg:string;completed:boolean;recovering:boolean;available:number;budget:number;pickup:boolean;elapsed:number;
    queue:{targetId:string}[]; motion:{state:string;wall:string;wallTransfer:boolean};
    camera:{x:number;y:number;width:number;height:number};
    targets:{id:string;x:number;y:number;reason:string;occupiedBy:string|null;screen:{x:number;y:number;visible:boolean}}[];
    boards:{id:string;top:number;bottom:number;left:number;right:number}[];
  };
};
const state = (page:Page) => page.evaluate(() => (window as unknown as {__curatorDebug:()=>State}).__curatorDebug());
let events:unknown[]=[];
async function record(page:Page, event:string) { events.push({event, url:page.url(), size:page.viewportSize(), state:await state(page)}); }
async function until(page:Page, predicate:(s:State)=>boolean, label:string, ms=8000) {
  const end=Date.now()+ms;
  while(Date.now()<end) {const s=await state(page); if(predicate(s)) return s; await page.waitForTimeout(12);}
  await record(page, `FAILED ${label}`); throw new Error(`Timeout ${label}: ${JSON.stringify(await state(page))}`);
}
async function open(page:Page) {await page.goto(URL);await expect(page.locator('#sketch-hud')).toBeVisible();await page.waitForTimeout(300);}
async function pin(page:Page, id:string) {
  const s=await state(page), t=s.sketch.targets.find(t=>t.id===id)!;
  expect(t.reason).toBe('');expect(t.screen.visible).toBe(true); await record(page,`pin ${id}`);
  for(const selector of['#sketch-hud .section-hint','#sketch-hud .sketch-status']) {
    const rect=await page.locator(selector).boundingBox();
    expect(rect && t.screen.x>rect.x && t.screen.x<rect.x+rect.width && t.screen.y>rect.y && t.screen.y<rect.y+rect.height,`${id} is readable outside ${selector}`).toBe(false);
  }
  await page.mouse.click(t.screen.x,t.screen.y);
  await until(page,s=>s.sketch.queue.some(q=>q.targetId===id),`placed ${id}`);
}
async function capture(page:Page,label:string,pause=false) {
  if(pause) {await page.keyboard.press('Escape');await expect(page.locator('#modal')).toBeVisible();await page.waitForTimeout(40);}
  await record(page,label);
  // Hide only the pause overlay for a capture of the frozen game; it has no input/state effect.
  await page.screenshot({path:`${DIR}/${label}-${page.viewportSize()!.width}.png`, ...(pause?{style:'#modal { visibility:hidden; } #sketch-hud[hidden] {display:block!important;}'}:{})});
  if(pause) {await page.locator('[data-action="resume"]').click();}
}
async function release(page:Page) {await page.keyboard.up('Space');await page.keyboard.up('KeyA');await page.keyboard.up('KeyD');}
async function entryA(page:Page) {
  await pin(page,'l3-wall-a-pin'); await page.keyboard.down('KeyD');
  // Running right crosses the third nail on the arrival ground.
  await until(page,s=>s.body.x>8.6,'safe launch');
  const picked=await state(page);expect(picked.sketch.pickup).toBe(true);expect(picked.sketch.budget).toBe(3);
  // One held jump: A's face catches the player at the top of the arc.
  await page.keyboard.down('Space');
  await until(page,s=>s.sketch.motion.state==='wall-slide','A contact');await release(page);
  expect((await state(page)).sketch.motion.wall).toBe('l3-wall-a');await record(page,'A left-face contact');
}
const LETTERS='abcdef';
async function hop(page:Page,key:'KeyA'|'KeyD') {
  // Off a board top: a held double jump toward the other column or the ledge.
  const tick=(await state(page)).updateCount;
  await page.keyboard.down(key);await page.keyboard.down('Space');
  await until(page,s=>s.updateCount>tick+10 && s.body.vy<=1.5,'hop apex');
  await page.keyboard.up('Space');await page.keyboard.down('Space');
  await until(page,s=>s.sketch.completed||s.sketch.recovering||s.sketch.motion.state==='wall-slide'||(s.body.grounded&&s.updateCount>tick+30),'hop landing');
  await release(page);
}
async function climb(page:Page,captures=true) {
  if(captures) await capture(page,'entrance'); await entryA(page);
  if(captures) await capture(page,'on-a',true);
  await pin(page,'l3-wall-b-pin');
  let reached=0;const pinned=new Set(['a','b']);const shots=new Set<string>();
  for(let step=0;step<40;step++) {
    let s=await state(page);
    if(s.sketch.completed) break;
    expect(s.sketch.recovering,'no fall during the climb').toBe(false);
    if(s.sketch.motion.state==='wall-slide') {
      const wall=s.sketch.motion.wall;reached=Math.max(reached,LETTERS.indexOf(wall.slice(-1)));
      // Q frees a nail only once the oldest is two boards behind the highest wall.
      const oldest=s.sketch.queue[0]?LETTERS.indexOf(s.sketch.queue[0].targetId.split('-')[2]):-1;
      if(s.sketch.available===0&&oldest>=0&&oldest<reached-1) {
        await page.keyboard.press('KeyQ');await until(page,s=>s.sketch.available===1,`recall ${LETTERS[oldest]}`);s=await state(page);
      }
      // Pin ahead: a free nail inks the next unpinned board in reach.
      const ahead=[...LETTERS].find((l,i)=>i>Math.max(1,reached)&&!pinned.has(l));
      if(s.sketch.available>0&&ahead&&s.sketch.targets.find(t=>t.id===`l3-wall-${ahead}-pin`)!.reason==='') {
        await pin(page,`l3-wall-${ahead}-pin`);pinned.add(ahead);
        const label=`pinned-${ahead}`;if(captures && ['c','e','f'].includes(ahead) && !shots.has(label)) {shots.add(label);await capture(page,label,true);}
      }
      await record(page,`kick from ${wall}`);
      // A plain Space press: the kick carries across with no direction held.
      await page.keyboard.press('Space');
      await until(page,s=>s.sketch.completed||s.sketch.recovering||s.body.grounded||(s.sketch.motion.state==='wall-slide'&&s.sketch.motion.wall!==wall),`after kick from ${wall}`);
    } else if(s.body.grounded) {
      await record(page,'board top');await hop(page,s.body.x<9||s.body.y>49?'KeyD':'KeyA');
    } else await page.waitForTimeout(12);
  }
  let s=await state(page);
  if(!s.sketch.completed) {await page.keyboard.down('KeyD');await until(page,s=>s.sketch.completed,'walk onto ledge');await release(page);s=await state(page);}
  expect([...pinned].sort().join('')).toBe('abcdef');expect(s.sketch.stage).toBe('exit');expect(s.sketch.available).toBe(2);
  await expect(page.locator('#sketch-endpoint')).toContainText('S4A endpoint');
  if(captures) await capture(page,'exit');
}
test.beforeAll(()=>mkdirSync(DIR,{recursive:true}));
test.beforeEach(()=>{events=[];});
test.afterEach(({},info)=>writeFileSync(`${DIR}/browser-${info.title.replace(/[^a-z0-9]+/gi,'-')}.json`,JSON.stringify({status:info.status,events},null,2)));
for(const size of [{width:1280,height:720},{width:960,height:540}]) {
  test(`S4A real wall traversal and terminal recovery ${size.width}`,async({page})=>{
    await page.setViewportSize(size);await page.addInitScript(()=>localStorage.setItem('last-curator.save.v1','s4a-sentinel'));
    await open(page);await climb(page);
    await page.keyboard.press('KeyR');await page.waitForTimeout(80);expect((await state(page)).body.y).toBe(49.5);
    await page.keyboard.down('KeyD');await until(page,s=>s.sketch.recovering,'terminal fall');await release(page);
    await until(page,s=>!s.sketch.recovering,'terminal recovery');expect((await state(page)).body.y).toBe(49.5);
    await page.waitForTimeout(80);const beforeResources=await state(page);
    await page.keyboard.press('Escape');await page.locator('[data-action="leave"]').click();await page.locator('[data-action="start"]').click();
    await expect(page.locator('#sketch-hud')).toBeVisible();await page.waitForTimeout(300);
    expect((await state(page)).body.y).toBe(49.5);expect((await state(page)).canvasCount).toBe(1);
    // Off-screen letter sprites upload lazily, so re-entry may hold fewer textures, never more.
    expect((await state(page)).textureCount).toBeLessThanOrEqual(beforeResources.textureCount);
    expect((await state(page)).geometryCount).toBeLessThanOrEqual(beforeResources.geometryCount+6);await record(page,'terminal re-entry resources');
    await page.keyboard.press('Escape');await page.locator('[data-action="replay"]').click();await page.waitForTimeout(350);
    expect((await state(page)).body.x).toBe(4.2);expect((await state(page)).sketch.completed).toBe(false);
    expect(await page.evaluate(()=>localStorage.getItem('last-curator.save.v1'))).toBe('s4a-sentinel');await record(page,'restart and save isolation');
  });
}
test('S4A slide pause actual blur resize retry and re-entry keep section ownership',async({page})=>{
  await open(page);await entryA(page);await expect(page.locator('#sketch-motion')).toContainText('Wall slide');
  await page.keyboard.press('Escape');await page.waitForTimeout(70);const paused=await state(page);
  await page.setViewportSize({width:960,height:540});await page.waitForTimeout(200);
  expect((await state(page)).body).toEqual(paused.body);expect((await state(page)).sketch.elapsed).toBe(paused.sketch.elapsed);
  await capture(page,'resize-slide');await page.locator('[data-action="resume"]').click();
  const cdp=await page.context().newCDPSession(page);await cdp.send('Emulation.setFocusEmulationEnabled',{enabled:false});await page.bringToFront();
  await page.keyboard.down('KeyD');const other=await page.context().newPage();await other.goto('about:blank');await other.bringToFront();
  await until(page,s=>s.paused,'actual tab blur');await page.waitForTimeout(80);const blur=await state(page);await page.waitForTimeout(180);
  expect((await state(page)).sketch.elapsed).toBe(blur.sketch.elapsed);expect((await state(page)).body).toEqual(blur.body);await record(page,'actual blur frozen');
  await other.close();await page.bringToFront();await release(page);
  await page.locator('[data-action="leave"]').click();await page.locator('[data-action="start"]').click();await page.waitForTimeout(350);
  let s=await state(page);expect(s.body.x).toBe(4.2);expect(s.sketch.available).toBe(2);expect(s.sketch.motion.state).toBe('normal');expect(s.canvasCount).toBe(1);await record(page,'slide re-entry');
  await entryA(page);await page.keyboard.down('Space');await page.keyboard.press('KeyQ');await page.keyboard.press('KeyR');await release(page);await page.waitForTimeout(100);
  s=await state(page);expect(s.body.x).toBe(4.2);expect(s.sketch.queue).toEqual([]);await record(page,'R with wall actions');
  await page.keyboard.down('KeyD');await until(page,s=>s.sketch.recovering,'local fall');await release(page);
  await page.keyboard.press('Escape');await page.locator('[data-action="leave"]').click();await page.locator('[data-action="start"]').click();await page.waitForTimeout(300);
  s=await state(page);expect(s.body.y).toBe(24.4);expect(s.sketch.available).toBe(2);expect(s.sketch.stage).toBe('traversal');await record(page,'re-entry during recovery');
});
test('S4A recalling current A or current B removes support and allows a local retry',async({page})=>{
  await open(page);await entryA(page);await page.keyboard.press('KeyQ');await until(page,s=>s.sketch.queue.length===0,'recall current A');
  expect((await state(page)).sketch.motion.state).toBe('normal');await record(page,'current A removed');
  await page.keyboard.press('KeyR');await page.waitForTimeout(120);await entryA(page);await pin(page,'l3-wall-b-pin');
  await page.keyboard.down('KeyA');await page.keyboard.press('Space');await until(page,s=>s.sketch.motion.wall==='l3-wall-b','B support');await release(page);
  await page.keyboard.press('KeyQ');await until(page,s=>s.sketch.queue.length===1,'recall old A');await page.keyboard.press('KeyQ');await until(page,s=>s.sketch.queue.length===0,'recall current B');
  expect((await state(page)).sketch.motion.state).toBe('normal');expect((await state(page)).sketch.available).toBe(3);await record(page,'current B removed');
  await page.keyboard.press('KeyR');await page.waitForTimeout(100);expect((await state(page)).body.x).toBe(4.2);
});
test('S4A no-nail jump-only attempts fall locally at both sizes; denied storage and production isolation',async({page})=>{
  for(const size of [{width:1280,height:720},{width:960,height:540}]) {
    await page.setViewportSize(size);await open(page);await page.keyboard.down('KeyD');await page.keyboard.down('Space');await page.waitForTimeout(400);
    await page.keyboard.up('Space');await page.keyboard.down('Space');await until(page,s=>s.sketch.recovering,'no-nail fall');await release(page);await record(page,'no-nail failure');
    await until(page,s=>!s.sketch.recovering,'local recovery');expect((await state(page)).body.x).toBe(4.2);expect((await state(page)).sketch.available).toBe(2);
  }
  await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new Error('denied');}}));await open(page);expect((await state(page)).sketch.stage).toBe('traversal');
  await page.goto(URL.replace(':5173',':4173'));await expect(page.locator('[data-action="start"]')).toBeVisible();expect(await page.evaluate(()=>('__curatorDebug' in window))).toBe(false);
});
test('S4A reduced motion completes through uninterrupted keys and clicks',async({page})=>{
  await page.emulateMedia({reducedMotion:'reduce'});await open(page);await climb(page,false);await record(page,'uninterrupted reduced motion full route');
});
test('affected S1 wall contacts and FIFO use real controls at both sizes',async({page})=>{
  for(const size of[{width:1280,height:720},{width:960,height:540}]) {
    await page.setViewportSize(size);await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=mechanics&bay=walls');await expect(page.locator('#sketch-hud')).toBeVisible();await page.waitForTimeout(350);
    await page.keyboard.down('KeyD');
    await until(page,s=>s.body.x>8.8,'S1 approach');await page.keyboard.up('KeyD');await page.waitForTimeout(150);
    const t=(await state(page)).sketch.targets.find(t=>t.id==='walls-freeze-a')!;expect(t.reason).toBe('');await page.mouse.click(t.screen.x,t.screen.y);
    await until(page,s=>s.sketch.queue.length===1,'S1 wall pin');
    // Jump beside the broad step; the pinned wall is reached through real collision.
    await page.keyboard.down('Space');await page.waitForTimeout(260);await page.keyboard.down('KeyD');await page.waitForTimeout(170);await page.keyboard.up('Space');await page.keyboard.down('Space');
    await until(page,s=>s.sketch.motion.state==='wall-slide','S1 pinned side contact');await release(page);
    await expect(page.locator('#sketch-motion')).toContainText('Wall slide');await record(page,'S1 real wall contact');
    await page.keyboard.press('Space');expect((await until(page,s=>s.sketch.motion.state==='normal','S1 wall kick')).sketch.motion.wallTransfer).toBe(false);
    await page.keyboard.press('KeyQ');await until(page,s=>s.sketch.queue.length===0,'S1 FIFO recall');expect((await state(page)).sketch.available).toBe(2);await record(page,'S1 kick and recall');
  }
});
test('affected isolated S2 full route retains its original endpoint',async({page})=>{
  await page.goto('http://127.0.0.1:5173/?scene=unfinished-sketch&study=layer-1');await expect(page.locator('#sketch-hud')).toBeVisible();await page.waitForTimeout(300);
  await traverseLayerOne(page);
  // S4L: the escalator is now a lift. Walk onto its deck, ride, step off right.
  await page.keyboard.down('KeyD');await until(page,s=>s.sketch.stage==='transit','S2 lift starts');await release(page);
  await until(page,s=>s.sketch.stage==='arrival','S2 lift arrival');await page.keyboard.down('KeyD');await until(page,s=>s.sketch.completed,'S2 original endpoint after stepping off');await release(page);
  await expect(page.locator('#sketch-endpoint')).toContainText('Slice 2 endpoint');await record(page,'S2 original endpoint');
});
