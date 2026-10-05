export interface MuseumPose { x: number; z: number; yaw: number }
export const museum = {
  id: 'museum', width: 12, depth: 12, height: 4.5, wallThickness: 0.2,
  speed: 3.5, eyeHeight: 1.65, radius: 0.3, interactionRange: 3.5, lookSensitivity: 0.003,
  spawn: { x: 0, z: 2, yaw: 0 } satisfies MuseumPose,
  returnPose: { x: -2.8, z: -2.7, yaw: 0 } satisfies MuseumPose,
  artworks: [
    { id: 'royal-supper', x: -2.8, y: 2, z: -5.82, width: 2.8, height: 1.8, label: 'Royal Supper' },
    { id: 'masterpiece', x: 2.6, y: 2, z: -5.82, width: 3.2, height: 2.1, label: 'The Garden Before Dawn' },
  ],
  targets: { pear: { left: 33, top: 42, width: 12, height: 22 }, sun: { left: 73, top: 14, width: 16, height: 25 } },
} as const;
