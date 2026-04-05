export {};

declare global {
  interface Game {
    dice3d?: Dice3D;
  }
}

declare class Dice3D {
  /**
   * Helper function to detect the end of a 3D animation for a message
   */
  waitFor3DAnimationByMessageID(targetMessageId: string): Promise<boolean>;
}
