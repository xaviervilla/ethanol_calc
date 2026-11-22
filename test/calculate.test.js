import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  TANK_SIZE,
  PUMP_ETHANOL,
  RESOLUTION,
  calculateMix,
} from '../calc.js';

const TOLERANCE = 0.05; // gallon tolerance for added amounts
const MIX_TOLERANCE = 0.1; // percent tolerance for resulting mix

describe('calculateMix', () => {
  it('adds nothing when the tank is already full', () => {
    const res = calculateMix(100, 30, 30, 85);
    assert.strictEqual(res.E85Added, 0);
    assert.strictEqual(res.PumpAdded, 0);
    assert.strictEqual(res.ResultingMix, 30);
  });

  it('adds nothing when tank is full regardless of target', () => {
    const res = calculateMix(100, 50, 30, 85);
    assert.strictEqual(res.E85Added, 0);
    assert.strictEqual(res.PumpAdded, 0);
    assert.strictEqual(res.ResultingMix, 30);
  });

  it('fills an empty tank to target using a mix of E85 and pump gas', () => {
    const res = calculateMix(0, 30, 10, 85);
    // Tank is empty, so ~20.2 gallons total added to fill it
    assert.ok(res.E85Added + res.PumpAdded > TANK_SIZE - 0.1);
    assert.ok(res.E85Added + res.PumpAdded < TANK_SIZE + 0.1);
    assert.ok(res.E85Added > 0, 'should add some E85 when below target');
    assert.ok(res.PumpAdded > 0, 'oscillation adds pump gas too when filling full tank');
    assert.ok(Math.abs(res.ResultingMix - 30) < MIX_TOLERANCE, 'resulting mix should be near target');
  });

  it('fills an empty tank to target using a mix of E85 and pump gas when above target', () => {
    const res = calculateMix(0, 30, 50, 85);
    assert.ok(res.E85Added + res.PumpAdded > TANK_SIZE - 0.1);
    assert.ok(res.E85Added + res.PumpAdded < TANK_SIZE + 0.1);
    assert.ok(res.PumpAdded > 0, 'should add some pump gas when above target');
    assert.ok(res.E85Added > 0, 'oscillation adds E85 too when filling full tank');
    assert.ok(Math.abs(res.ResultingMix - 30) < MIX_TOLERANCE, 'resulting mix should be near target');
  });

  it('fills only the empty portion of a partially full tank', () => {
    const res = calculateMix(50, 30, 10, 85);
    const emptySpace = TANK_SIZE * 0.5;
    assert.ok(res.E85Added + res.PumpAdded > emptySpace - 0.1);
    assert.ok(res.E85Added + res.PumpAdded < emptySpace + 0.1);
    assert.ok(Math.abs(res.ResultingMix - 30) < MIX_TOLERANCE);
  });

  it('reaches E50 target from below using E85', () => {
    const res = calculateMix(0, 50, 10, 85);
    assert.ok(Math.abs(res.ResultingMix - 50) < MIX_TOLERANCE);
    assert.ok(res.E85Added > 0);
  });

  it('reaches E30 target from above using pump gas', () => {
    const res = calculateMix(0, 30, 80, 85);
    assert.ok(Math.abs(res.ResultingMix - 30) < MIX_TOLERANCE);
    assert.ok(res.PumpAdded > 0);
  });

  it('respects custom E85 ethanol content', () => {
    const res85 = calculateMix(0, 30, 10, 85);
    const res70 = calculateMix(0, 30, 10, 70);
    // Lower E85 content means more volume needed to reach same target
    assert.ok(res70.E85Added > res85.E85Added, 'lower E85 content requires more volume');
  });

  it('clamps unsafe inputs without crashing', () => {
    const res = calculateMix(150, 30, 30, 85); // fill level > 100
    assert.strictEqual(res.E85Added, 0);
    assert.strictEqual(res.PumpAdded, 0);

    const res2 = calculateMix(-50, 30, 30, 85); // fill level < 0
    assert.ok(res2.E85Added + res2.PumpAdded > TANK_SIZE - 0.1);

    const res3 = calculateMix(0, 200, 30, 85); // target > 100
    assert.ok(Math.abs(res3.ResultingMix - 100) < MIX_TOLERANCE || res3.ResultingMix <= 100);
  });

  it('total added never exceeds tank empty space by more than one resolution step', () => {
    const cases = [
      [0, 30, 10, 85],
      [25, 50, 20, 85],
      [75, 30, 50, 85],
      [100, 30, 30, 85],
      [0, 50, 80, 70],
    ];
    for (const [fuel, target, current, e85] of cases) {
      const res = calculateMix(fuel, target, current, e85);
      const emptySpace = TANK_SIZE * (1 - fuel / 100);
      const totalAdded = res.E85Added + res.PumpAdded;
      assert.ok(
        totalAdded >= emptySpace - RESOLUTION,
        `total added ${totalAdded} should be >= empty space ${emptySpace} - resolution`
      );
      assert.ok(
        totalAdded <= emptySpace + RESOLUTION,
        `total added ${totalAdded} should be <= empty space ${emptySpace} + resolution`
      );
    }
  });

  it('is deterministic — same inputs produce same outputs', () => {
    const a = calculateMix(25, 30, 10, 85);
    const b = calculateMix(25, 30, 10, 85);
    assert.deepStrictEqual(a, b);
  });
});
