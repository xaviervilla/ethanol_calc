// Pure math for the ethanol blend calculator.
// No DOM, no localStorage — safe to import in Node for unit testing.

// Explorer ST fixed tank size (gallons). Gasoline ethanol is assumed 10% and hidden.
const TANK_SIZE = 20.2;
const PUMP_ETHANOL = 10;
const RESOLUTION = 0.001; // gallon step size for the iterative fill simulation

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n));
}

function fmt(n) {
  return String(Math.round(n));
}

/**
 * Simulate filling the rest of the tank to hit the target ethanol mix.
 *
 * Mirrors the TunePlus algorithm: starting from the current fuel level and
 * current blend, the tank is topped off one 0.001 gallon slug at a time. Each
 * slug is either E85 or pump gas (10% ethanol), chosen to nudge the running
 * mix toward the target.
 *
 * @param {number} currentFillLevel - Fuel already in tank, 0-100 percent
 * @param {number} targetMix - Target blend ethanol percent (30 or 50)
 * @param {number} currentMix - Current ethanol percent in the fuel already in tank, 0-100
 * @param {number} e85EthanolContent - Ethanol percent of the E85 being added
 * @returns {{E85Added: number, PumpAdded: number, ResultingMix: number}}
 */
function calculateMix(currentFillLevel, targetMix, currentMix, e85EthanolContent) {
  // Clamp inputs defensively so the function is safe even if called directly.
  currentFillLevel = clamp(currentFillLevel, 0, 100);
  targetMix = clamp(targetMix, 0, 100);
  currentMix = clamp(currentMix, 0, 100);
  e85EthanolContent = clamp(e85EthanolContent, 0, 100);

  let gallons = TANK_SIZE * (currentFillLevel / 100);
  let mix = currentMix;
  let e85Added = 0;
  let pumpAdded = 0;

  while (TANK_SIZE - gallons > 0) {
    const addE85 = mix < targetMix;
    const content = addE85 ? e85EthanolContent : PUMP_ETHANOL;
    const nextGallons = gallons + RESOLUTION;
    mix = (gallons * mix + RESOLUTION * content) / nextGallons;
    gallons = nextGallons;
    if (addE85) {
      e85Added += RESOLUTION;
    } else {
      pumpAdded += RESOLUTION;
    }
  }

  return {
    E85Added: e85Added,
    PumpAdded: pumpAdded,
    ResultingMix: mix,
  };
}

export {
  TANK_SIZE,
  PUMP_ETHANOL,
  RESOLUTION,
  clamp,
  fmt,
  calculateMix,
};
