export type ActionTrackingData = {
  protocol: boolean;
  move: number;
  full: boolean;
  quick: boolean;
  reaction: boolean;
  free: boolean;
};

export type ActionType = keyof ActionTrackingData;
