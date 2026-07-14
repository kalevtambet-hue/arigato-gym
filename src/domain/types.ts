import type { RepMode } from '../db/types';

export type ProgressionTarget = {
  repMode: RepMode;
  targetSets: number;
  successesRequired?: number;
  targetRepsMin: number;
  targetRepsMax: number;
  currentWeight: number;
  weightStep: number;
};

export type SessionSeed = {
  id: string;
  exerciseId: string;
  exerciseName: string;
  machineNumber: string;
  targetSets: number;
  successesRequired: number;
  repMode: RepMode;
  targetRepsMin: number;
  targetRepsMax: number;
  currentWeight: number;
  weightStep: number;
  sortOrder: number;
};
