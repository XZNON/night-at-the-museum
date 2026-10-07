import { afterAll, describe, it, expect } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { SketchRouteModel, type SketchRouteSession } from '../src/gameplay/sketch-model';
import { idleControls, type Controls } from '../src/gameplay/controller';
import { sketchLayerThreeWalls as route } from '../src/levels/unfinished-sketch-layer3';
import { sketchTuning } from '../src/levels/unfinished-sketch';
import { sketchLayerTwo } from '../src/levels/unfinished-sketch-layer2';
import { climb, L } from './sketch-layer3-climb';
const fresh=()=>new SketchRouteModel(route,sketchTuning);
const tick=(m:SketchRouteModel,input:Partial<Controls>={})=>m.update(1/60,{...idleControls(),...input});
const rows:unknown[]=[];
afterAll(()=>{mkdirSync('docs/validation/sketch-s4/s4a',{recursive:true});writeFileSync('docs/validation/sketch-s4/s4a/unit-measurements.json',JSON.stringify(rows,null,2));});

// Complete route feasibility uses inputs/commands only (tests/sketch-layer3-climb.ts).
const sizeOf=(id:string)=>route.mechanisms.find(m=>m.id===id)!.size;
const kickRise=(route.wall!.kickVertical!**2)/(2*25);
const summary=(r:ReturnType<typeof climb>)=>({complete:r.m.completed,budget:r.m.nailBudget,log:r.log});
/** Run right from the spawn, past the pickup, and stand still. */
const runPastPickup=(m:SketchRouteModel)=>{for(let f=0;f<200&&m.controller.body.x<8.6;f++)tick(m,{axis:1});for(let f=0;f<20;f++)tick(m);};

describe('S4A three-nail criss-cross climb',()=>{
  it('the third nail is picked up on the arrival ground and resets with the section',()=>{
    const m=fresh();tick(m);expect(m.nailBudget).toBe(2);expect(m.pickupCollected).toBe(false);
    m.place('l3-wall-a-pin');m.place('l3-wall-b-pin');
    expect(m.targetViews().find(v=>v.id==='l3-wall-c-pin')!.reason).toBe('Both nails are placed. Press Q.');
    runPastPickup(m);expect(m.pickupCollected).toBe(true);expect(m.nailBudget).toBe(3);expect(m.availableNails).toBe(1);
    expect(m.hud().nails).toBe('2/3 placed · 1 available');
    // From the ground C is out of reach: the third nail is spent from the wall.
    expect(m.place('l3-wall-c-pin')).toBe(false);expect(m.availableNails).toBe(1);
    tick(m,{restartPressed:true});expect(m.nailBudget).toBe(2);expect(m.pickupCollected).toBe(false);expect(m.session.queue).toEqual([]);
    // A fall also restarts the section without the third nail.
    runPastPickup(m);expect(m.nailBudget).toBe(3);
    for(let f=0;f<240&&m.recoveryRemaining<=0;f++)tick(m,{axis:1});expect(m.recoveryRemaining).toBeGreaterThan(0);
    for(let f=0;f<30;f++)tick(m);expect(m.nailBudget).toBe(2);expect(m.controller.body.x).toBe(4.2);
    // The scene-free bays and earlier routes have no pickup: always two nails.
    const two=new SketchRouteModel(sketchLayerTwo,sketchTuning);for(let f=0;f<120;f++)tick(two,{axis:-1});expect(two.nailBudget).toBe(2);
  });

  it('neutral input completes A-F with up to 70 frames (~1.17 s) of waiting on every wall',()=>{
    for(const dwell of[0,10,20,30,40,50,60,70]){const r=climb({dwell});expect(r.m.completed,`${dwell}: ${r.log.join(' ')}`).toBe(true);
      // Pin-ahead: C rides the third nail, then each Q frees a board two behind.
      expect(r.log.filter(x=>x.startsWith('pin')||x==='Q').join(' ')).toBe('pinc Q pind Q pine Q pinf Q');rows.push({dwell,...summary(r)});}
    rows.push({beyondWindow:[80,90].map(dwell=>({dwell,complete:climb({dwell}).m.completed}))});
    rows.push({doubleEntry:[0,30,50,60].map(dwell=>({dwell,complete:climb({dwell,entry:'double'}).m.completed}))});
  });

  it('a kick reaches the far wall even while the old wall direction is held (the earlier cancel)',()=>{
    for(const dwell of[0,30,60]){const r=climb({dwell,hold:'into'});expect(r.m.completed,r.log.join(' ')).toBe(true);}
    for(const dwell of[0,20,40]){const r=climb({dwell,hold:'away'});expect(r.m.completed,r.log.join(' ')).toBe(true);}
    // Without the section's wall feel the same held input never reaches B.
    const r=climb({hold:'into',field:{...route,wall:undefined}});expect(r.log.some(x=>/^b/.test(x)),r.log.join(' ')).toBe(false);
    rows.push({holdInto:[0,30,60,80].map(dwell=>({dwell,complete:climb({dwell,hold:'into'}).m.completed}))});
  });

  it('a catch grips still for 0.9 s, then slides at 2 u/s',()=>{
    const m=fresh();tick(m);m.place('l3-wall-a-pin');runPastPickup(m);
    for(let f=0;f<90&&m.move.state!=='wall-slide';f++)tick(m,{axis:1,jumpHeld:true,jumpPressed:f===0,jumpReleased:f===0});
    expect(m.move.state).toBe('wall-slide');const caught=m.controller.body.y;
    for(let f=0;f<52;f++)tick(m);expect(m.controller.body.y).toBeCloseTo(caught,6);
    for(let f=0;f<48;f++)tick(m);const fell=caught-m.controller.body.y;
    expect(fell).toBeGreaterThan(1.2);expect(fell).toBeLessThan(2*(100/60-0.9)+0.01);rows.push({grip:{caught,afterGrip:m.controller.body.y,fell}});
  });

  it('Space pressed on touching the next wall, still rising, kicks as soon as the catch starts',()=>{
    const run=(field=route)=>{const m=new SketchRouteModel(field,sketchTuning);tick(m);m.place('l3-wall-a-pin');m.place('l3-wall-b-pin');
      for(let f=0;f<200&&m.controller.body.x<8.6;f++)tick(m,{axis:1});
      for(let f=0;f<90&&m.move.state!=='wall-slide';f++)tick(m,{axis:1,jumpHeld:true,jumpPressed:f===0,jumpReleased:f===0});
      tick(m,{jumpPressed:true,jumpHeld:true});
      // Rising against B: the press arrives before the slide can begin.
      let pressed=false;const kicks:string[]=[];
      for(let f=0;f<60;f++){const b=m.controller.body;const touching=b.vy>0.5&&Math.abs(b.x-7.6)<0.02;
        const press=touching&&!pressed;if(press)pressed=true;const before=m.move.state;tick(m,{jumpPressed:press,jumpHeld:press});
        if(before!=='wall-slide'&&m.controller.body.vy>10&&pressed)kicks.push(`kick at ${f}`);}
      return{pressed,kicks,end:{...m.controller.body},state:m.move.state};};
    const buffered=run();expect(buffered.pressed).toBe(true);expect(buffered.kicks.length).toBeGreaterThan(0);
    const without=run({...route,wall:{...route.wall,kickBuffer:0}});expect(without.pressed).toBe(true);expect(without.kicks).toEqual([]);
    rows.push({kickBuffer:{buffered,without}});
  });

  it('alternation reaches every board in order; placed + available equals three',()=>{
    const r=climb();const walls=r.log.filter(x=>/^[a-f]\d/.test(x)).map(x=>x[0]);
    expect([...new Set(walls)]).toEqual(L);for(let i=1;i<walls.length;i++)expect(walls[i]).not.toBe(walls[i-1]);
    expect(r.m.completed).toBe(true);
  });

  it('from A, the third nail can already ink C (reach 11), so the board ahead is ready before B',()=>{
    const m=fresh();tick(m);m.place('l3-wall-a-pin');m.place('l3-wall-b-pin');runPastPickup(m);
    for(let f=0;f<90&&m.move.state!=='wall-slide';f++)tick(m,{axis:1,jumpHeld:true,jumpPressed:f===0,jumpReleased:f===0});
    expect(m.move.wall).toBe('l3-wall-a');const c=m.targetViews().find(v=>v.id==='l3-wall-c-pin')!;
    expect(c.reason).toBe('');expect(c.distance).toBeLessThan(11);expect(c.distance).toBeGreaterThan(sketchTuning.placementReach);
    tick(m);m.place('l3-wall-c-pin');expect(m.availableNails).toBe(0);
    expect(m.targetViews().find(v=>v.id==='l3-wall-d-pin')!.reason).toBe('All 3 nails are placed. Press Q.');
    rows.push({reachFromA:c.distance});
  });

  it('omitting any one board fails physically, without pin counters',()=>{
    for(const omit of L)expect(climb({omit}).m.completed,omit).toBe(false);
  });

  it('records whether the climb is still possible without the pickup (two nails)',()=>{
    const r=climb({pickup:false});expect(r.log).not.toContain('pickup');rows.push({withoutPickup:summary(r)});
    expect(climb().log).toContain('pickup');
  });

  it('conservative skip margins from the authored geometry',()=>{
    const v=(id:string)=>{const m=route.mechanisms.find(x=>x.id===`l3-wall-${id}`)!;return{bottom:m.centre.y-m.size.height/2,top:m.centre.y+m.size.height/2+m.travel.y};};
    const jump=4.49,height=1.25,ground=24.4,ledge=route.legs[0].exitBounds.y;
    const margins={
      groundToB:v('b').bottom-(ground+jump+height),
      sameColumnGaps:[['a','c'],['b','d'],['c','e'],['d','f']].map(([lo,hi])=>v(hi).bottom-v(lo).top),
      topToTopTwoAbove:Math.min(...[0,1,2,3].map(i=>v(L[i+2]).top-route.mechanisms.find(x=>x.id===`l3-wall-${L[i]}`)!.travel.y-v(L[i]).top))-jump,
      dKickToETop:v('e').top-route.mechanisms.find(x=>x.id==='l3-wall-e')!.travel.y-(v('d').top+kickRise),
      dJumpToLedge:ledge-(v('d').top+jump),
    };
    expect(margins.groundToB).toBeGreaterThan(0.25);for(const g of margins.sameColumnGaps)expect(g).toBeGreaterThan(0);
    expect(margins.topToTopTwoAbove).toBeGreaterThan(1.5);expect(margins.dKickToETop).toBeGreaterThan(0.5);expect(margins.dJumpToLedge).toBeGreaterThan(0.25);
    rows.push({kickRise,conservativeSkipMargins:margins});
  });

  it('B cannot be caught from the arrival ground, so A is always the first wall',()=>{
    for(const start of[7.8,8.4,9]) for(const second of[10,14,18,24]){
      const m=fresh();tick(m);m.enqueue({type:'place',targetId:'l3-wall-b-pin'});tick(m);
      for(let f=0;f<200&&m.controller.body.x<start;f++)tick(m,{axis:1});
      for(let f=0;f<80;f++){const p=f===0||f===second;tick(m,{axis:-1,jumpHeld:true,jumpPressed:p,jumpReleased:p});expect(m.move.state).toBe('normal');}
    }
  });

  it('no nails/repeated air presses cannot reach B or the endpoint, and measures the jump ceiling',()=>{
    let maximum=0;for(const delay of[16,22,26,30,36]){const m=fresh();tick(m);let peak=24.4;
      for(let f=0;f<160;f++){tick(m,{axis:1,jumpHeld:true,jumpPressed:f===0||f===delay||f===delay+20||f===delay+40,jumpReleased:true});peak=Math.max(peak,m.controller.body.y);if(m.recoveryRemaining)break;}
      maximum=Math.max(maximum,peak);expect(m.completed).toBe(false);expect(m.move.state).not.toBe('wall-slide');rows.push({noNailJumpDelay:delay,peak,end:{...m.controller.body}});
    }expect(maximum-24.4).toBeLessThan(4.5);rows.push({measuredDoubleJumpCeiling:maximum-24.4});
  });

  it('real same-wall recontact cannot replenish a spent kick or air jump',()=>{
    const m=fresh();tick(m);tick(m);m.enqueue({type:'place',targetId:'l3-wall-a-pin'});
    for(let f=0;f<120;f++){tick(m,{axis:1,jumpHeld:true,jumpPressed:f===24||f===50,jumpReleased:f===24||f===50});if(m.move.state==='wall-slide')break;}
    expect(m.move.wall).toBe('l3-wall-a');const top=m.mechanismView().find(v=>v.id==='l3-wall-a')!.y+sizeOf('l3-wall-a').height/2;
    tick(m,{axis:-1,jumpPressed:true,jumpHeld:true});for(let f=0;f<4;f++)tick(m,{axis:-1});
    for(let f=0;f<120;f++){tick(m,{axis:m.controller.body.vy<0&&m.controller.body.y<top-0.06?1:0});if(m.move.state==='wall-slide')break;}
    expect(m.move.wall).toBe('l3-wall-a');expect(m.move.wallTransfer).toBe(false);expect(m.controller.body.grounded).toBe(false);
    const before={...m.controller.body};tick(m,{jumpPressed:true,jumpHeld:true});expect(m.controller.body.vy).toBeLessThanOrEqual(0);expect(m.controller.airJumpAvailable).toBe(false);
    rows.push({sameWallRecontact:{before,after:{...m.controller.body},motion:{...m.move}}});
  });

  it('only grounded exit commits; terminal R/fall/re-entry stays there (unit boundary fixtures)',()=>{
    const m=fresh();m.controller.respawn(16,49.6);m.controller.body.vy=3;tick(m);expect(m.completed).toBe(false);
    m.controller.respawn(16,49.5);tick(m);expect(m.stage).toBe('exit');expect(m.completed).toBe(true);expect(m.sectionId).toBe('l3-walls');
    m.enqueue({type:'place',targetId:'l3-wall-a-pin'});tick(m,{restartPressed:true,jumpPressed:true});expect(m.controller.body).toMatchObject({x:17,y:49.5,vx:0,vy:0});expect(m.session.queue).toEqual([]);
    m.controller.respawn(24,44.9);tick(m);for(let i=0;i<23;i++)tick(m);expect(m.completed).toBe(true);expect(m.controller.body.y).toBe(49.5);
    const n=fresh();n.restoreSession(m.session);expect(n.completed).toBe(true);expect(n.controller.body.y).toBe(49.5);n.restartAdventure();expect(n.controller.body.x).toBe(4.2);expect(n.completed).toBe(false);
  });

  it('traversal/recovery restores entrance; bad ownership/stages are refused; R wins over pending commands',()=>{
    const m=fresh();tick(m);m.enqueue({type:'place',targetId:'l3-wall-a-pin'});tick(m);expect(m.placedCount).toBe(1);
    const n=fresh();n.restoreSession(m.session);expect(n.availableNails).toBe(2);expect(n.routeTime).toBe(0);expect(n.controller.body.y).toBe(24.4);
    for(const bad of[{...m.session,routeId:'layer-2'},{...m.session,routeId:undefined},{...m.session,stage:'arrival'},{...m.session,stage:'transit'},{...m.session,elapsed:NaN},{...m.session,legId:'layer-2'}]){n.restoreSession(bad as SketchRouteSession);expect(n.stage).toBe('traversal');expect(n.availableNails).toBe(2);}
    n.restoreSession(new SketchRouteModel(sketchLayerTwo,sketchTuning).session);expect(n.controller.body.x).toBe(4.2);
    m.enqueue({type:'recall'});m.enqueue({type:'place',targetId:'l3-wall-b-pin'});tick(m,{restartPressed:true,jumpPressed:true});expect(m.session.queue).toEqual([]);expect(m.move.state).toBe('normal');expect(m.routeTime).toBe(0);expect(m.place('l2-freeze-a')).toBe(false);
  });

  it('recalling current support removes wall contact and resumes its captured phase (unit fixture)',()=>{
    const m=fresh();tick(m);m.place('l3-wall-a-pin');const before=m.mechanismView().find(v=>v.id==='l3-wall-a')!;for(let i=0;i<60;i++)tick(m);
    m.controller.respawn(before.x-before.width/2-0.65,before.y);m.controller.body.vy=-1;tick(m);expect(m.move.state).toBe('wall-slide');expect(m.hud().motion).toContain('Wall slide');
    m.enqueue({type:'recall'});tick(m);expect(m.move.state).toBe('normal');expect(m.walls.some(w=>w.id==='l3-wall-a')).toBe(false);expect(m.availableNails).toBe(2);expect(Math.abs(m.mechanismView().find(v=>v.id==='l3-wall-a')!.y-before.y)).toBeLessThan(0.01);
  });
});
