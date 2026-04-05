export {};

declare global {
  interface Game {
    dice3d?: Dice3D;
  }

  namespace foundry.dice.terms.RollTerm {
    interface Options {
      rollOrder?: number | null | undefined;
    }
  }
}

declare class Dice3D {
  /**
   * Helper function to detect the end of a 3D animation for a message
   */
  waitFor3DAnimationByMessageID(targetMessageId: string): Promise<boolean>;
}
