import { horaBogota } from "./format";

// La operación se ve en horario de oficina de Bogotá. Si se abre de noche,
// el reloj arranca a las 10:40 de ese mismo día y avanza en tiempo real.
let base = 0;
let arranque = 0;

export function iniciarReloj() {
  if (arranque) return;
  const real = Date.now();
  const h = horaBogota(real);
  base = h >= 8 && h <= 19 ? real : Math.round(real - (h - (10 + 40 / 60)) * 3600e3);
  arranque = real;
}

export function ahora() {
  if (!arranque) iniciarReloj();
  return base + (Date.now() - arranque);
}

export const iso = (ms = ahora()) => new Date(ms).toISOString();
