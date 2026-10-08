export interface MuseumPose { x: number; z: number; yaw: number }
export const museum = {
  id: 'museum', width: 12, depth: 12, height: 4.5, wallThickness: 0.2,
  speed: 3.5, eyeHeight: 1.65, radius: 0.3, interactionRange: 3.5, lookSensitivity: 0.003,
  // Near the entrance wall, so the masterpiece and both side frames are in view on arrival.
  spawn: { x: 0, z: 4.6, yaw: 0 } satisfies MuseumPose,
  // Back from Royal Supper: in front of its frame on the right wall, facing it.
  returnPose: { x: 2.7, z: -1.5, yaw: -Math.PI / 2 } satisfies MuseumPose,
  // In front of the Sketch frame on the left wall, facing it.
  sketchReturnPose: { x: -2.7, z: -1.5, yaw: Math.PI / 2 } satisfies MuseumPose,
  // `facing` turns a frame about Y: 0 hangs it on the back wall, π/2 on the left wall facing +x, −π/2 on the right wall facing −x.
  // The masterpiece is the room's centrepiece, facing the entrance; the two adventures flank it on the side walls.
  artworks: [
    { id: 'royal-supper', x: 5.82, y: 2, z: -1.5, facing: -Math.PI / 2, width: 2.8, height: 1.8, label: 'Royal Supper' },
    { id: 'masterpiece', x: 0, y: 2.15, z: -5.82, facing: 0, width: 4.6, height: 2.6, label: 'The Garden Before Dawn' },
    { id: 'unfinished-sketch', x: -5.82, y: 2, z: -1.5, facing: Math.PI / 2, width: 2.8, height: 1.8, label: 'Unfinished Sketch' },
  ],
  targets: { pear: { left: 40, top: 37.15, width: 5.7, height: 12.65 }, sun: { left: 78.4, top: 24, width: 5.3, height: 8.5 } },
} as const;
