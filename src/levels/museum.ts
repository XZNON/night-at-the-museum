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
  targets: { pear: { left: 40, top: 37.15, width: 5.7, height: 12.65 }, sun: { left: 78.4, top: 24, width: 5.3, height: 8.5 } },
} as const;
