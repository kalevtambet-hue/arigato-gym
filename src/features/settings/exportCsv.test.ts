import { describe, expect, it } from 'vitest';
import { parseCsv, toCsv } from './exportCsv';

describe('toCsv', () => {
  it('serializes row objects into CSV text with a header row', () => {
    expect(toCsv([{ name: 'Leg Press', machineNumber: '17' }])).toContain('name,machineNumber');
  });
});

describe('parseCsv', () => {
  it('parses CSV back into row objects', () => {
    const rows = parseCsv('name,machineNumber\nLeg Press,17');
    expect(rows[0]).toEqual({ name: 'Leg Press', machineNumber: '17' });
  });
});
