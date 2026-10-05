// Original geometric study shared by the frame and close-up. Replace through
// an art manifest after the camera/layout proof; no generated production art.
export function masterpieceStudy(restored: boolean): HTMLCanvasElement {
  const canvas = document.createElement('canvas'); canvas.width = 960; canvas.height = 600;
  const c = canvas.getContext('2d')!;
  c.fillStyle = '#363946'; c.fillRect(0, 0, 960, 600);
  c.fillStyle = '#646877'; c.beginPath(); c.moveTo(330, 400); c.lineTo(600, 160); c.lineTo(870, 400); c.fill();
  c.fillStyle = '#505260'; c.beginPath(); c.moveTo(500, 400); c.lineTo(760, 215); c.lineTo(960, 400); c.fill();
  c.fillStyle = restored ? '#617553' : '#4c5052'; c.beginPath(); c.ellipse(350, 590, 650, 200, 0, 0, Math.PI * 2); c.fill();
  c.fillStyle = restored ? '#917048' : '#60615e'; c.fillRect(244, 220, 25, 270);
  c.fillStyle = restored ? '#739663' : '#717775';
  for (const [x, y, r] of [[160, 210, 95], [260, 170, 110], [350, 230, 100]]) { c.beginPath(); c.arc(x!, y!, r!, 0, Math.PI * 2); c.fill(); }
  c.fillStyle = restored ? '#e5b955' : '#313638'; c.beginPath(); c.ellipse(373, 320, 44, 55, 0, 0, Math.PI * 2); c.fill();
  c.beginPath(); c.ellipse(373, 278, 23, 30, 0, 0, Math.PI * 2); c.fill();
  c.strokeStyle = '#aaa794'; c.lineWidth = 3; c.setLineDash([8, 6]); c.beginPath(); c.arc(778, 154, 53, 0, Math.PI * 2); c.stroke(); c.setLineDash([]);
  c.fillStyle = restored ? '#d1b69a' : '#919196'; c.beginPath(); c.arc(468, 425, 16, 0, Math.PI * 2); c.fill(); c.fillRect(455, 443, 26, 52);
  c.strokeStyle = '#959185'; c.lineWidth = 4; c.strokeRect(16, 16, 928, 568);
  return canvas;
}
