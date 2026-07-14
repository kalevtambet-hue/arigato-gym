import type { RepMode } from '../db/types';

export function isDurationMode(mode: RepMode) {
  return mode === 'duration-fixed' || mode === 'duration-range';
}

export function isFixedMode(mode: RepMode) {
  return mode === 'fixed' || mode === 'duration-fixed';
}

export function isRangeMode(mode: RepMode) {
  return mode === 'range' || mode === 'duration-range';
}

export function formatTarget(mode: RepMode, min: number, max: number, weight: number) {
  if (mode === 'range') {
    return `${min}-${max} x ${weight} kg`;
  }

  if (mode === 'fixed') {
    return `${min} x ${weight} kg`;
  }

  if (mode === 'duration-range') {
    return `${min}-${max} min`;
  }

  return `${min} min`;
}

export function formatResultValue(mode: RepMode, value: number) {
  return isDurationMode(mode) ? `${value} min` : `${value}`;
}

export function getSuccessValue(mode: RepMode, min: number, max: number) {
  return isRangeMode(mode) ? max : min;
}
