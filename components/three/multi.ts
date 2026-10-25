import * as THREE from "three";
import { lienzoTexto, sombraSuave, texturaHoja } from "./kit";

// Una multifuncional de oficina hecha con geometría: gabinete con bandejas de papel,
// cuerpo, bahía de salida donde caen las hojas, escáner con tapa, alimentador,
// panel con pantalla, luz de estado y el anillo que marca cada aviso de vida.

export type Luz = "lista" | "trabajando" | "error" | "aviso" | "apagada";

export interface Multi {
  grupo: THREE.Group;
  luz: (l: Luz) => void;
  pantalla: (titulo: string, sub?: string, fondo?: string) => void;
  hojaSale: () => void;
  hojaEntra: () => void;
  pila: (n: number) => void;
  cajon: (abierto: number) => void;
  papel: (hay: boolean) => void;
  apagada: (si: boolean) => void;
  latido: () => void;
  update: (dt: number, t: number) => void;
}

const COLOR_LUZ: Record<Luz, number> = { lista: 0x1f9d63, trabajando: 0x2f5bea, error: 0xd64545, aviso: 0xd98e04, apagada: 0x3a404c };

export function crearMulti(track: <T extends { dispose: () => void }>(x: T) => T, opts: { color?: boolean; acento?: number; escala?: number } = {}): Multi {
  const g = new THREE.Group();
  const W = 1;
  const D = 0.8;
  const blanco = track(new THREE.MeshLambertMaterial({ color: 0xf3f4f7 }));
  const gris = track(new THREE.MeshLambertMaterial({ color: 0xcdd3dd }));
  const grisOscuro = track(new THREE.MeshLambertMaterial({ color: 0x8d96a6 }));
  const panelMat = track(new THREE.MeshPhongMaterial({ color: 0x1b2236, shininess: 60, specular: 0x445066 }));
  const bahiaMat = track(new THREE.MeshLambertMaterial({ color: 0x5d6678 }));
  const papelMat = track(new THREE.MeshLambertMaterial({ color: 0xfbfbf8 }));
  const acento = track(new THREE.MeshLambertMaterial({ color: opts.acento ?? (opts.color ? 0x2f5bea : 0x8d96a6) }));

  const caja = (w: number, h: number, d: number, m: THREE.Material, x: number, y: number, z: number, padre: THREE.Object3D = g) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
    mesh.position.set(x, y, z);
    padre.add(mesh);
    return mesh;
  };

  // gabinete con dos bandejas de papel
  caja(W, 0.5, D, gris, 0, 0.25, 0);
  caja(W - 0.06, 0.2, 0.03, blanco, 0, 0.13, D / 2 + 0.012);
  caja(0.32, 0.025, 0.03, grisOscuro, 0, 0.18, D / 2 + 0.04);
  const bandeja = new THREE.Group();
  g.add(bandeja);
  caja(W - 0.06, 0.2, 0.03, blanco, 0, 0.37, D / 2 + 0.012, bandeja);
  caja(0.32, 0.025, 0.03, grisOscuro, 0, 0.42, D / 2 + 0.04, bandeja);
  const resma = caja(W - 0.16, 0.1, D - 0.12, papelMat, 0, 0.37, 0, bandeja);
  caja(0.05, 0.05, 0.02, acento, -W / 2 + 0.1, 0.37, D / 2 + 0.03, bandeja);

  // cuerpo y bahía de salida
  caja(W, 0.28, D, blanco, 0, 0.64, 0);
  caja(W * 0.28, 0.17, D, blanco, W / 2 - W * 0.14, 0.865, 0);
  caja(W * 0.72, 0.17, 0.07, gris, -W * 0.14, 0.865, -D / 2 + 0.035);
  caja(W * 0.66, 0.012, D * 0.78, bahiaMat, -W * 0.15, 0.786, 0.02);
  caja(W * 0.72, 0.012, 0.08, acento, -W * 0.14, 0.95, D / 2 - 0.04);

  // escáner, tapa y alimentador
  caja(W, 0.18, D, blanco, 0, 1.04, 0);
  caja(W, 0.03, D * 0.96, gris, 0, 1.145, -0.01);
  caja(W * 0.68, 0.07, D * 0.5, gris, -0.06, 1.195, -0.1);
  caja(W * 0.5, 0.012, D * 0.34, papelMat, -0.06, 1.236, -0.12);

  // panel con pantalla
  const panel = new THREE.Group();
  panel.position.set(0.24, 1.2, D / 2 + 0.03);
  panel.rotation.x = 0.55;
  g.add(panel);
  caja(0.44, 0.035, 0.27, panelMat, 0, 0, 0, panel);
  const lienzo = lienzoTexto(256, 150);
  track(lienzo.tex);
  const pantallaMesh = new THREE.Mesh(new THREE.PlaneGeometry(0.38, 0.22), track(new THREE.MeshBasicMaterial({ map: lienzo.tex, toneMapped: false })));
  pantallaMesh.rotation.x = -Math.PI / 2;
  pantallaMesh.position.set(0, 0.019, 0);
  panel.add(pantallaMesh);

  // luz de estado
  const luzMat = track(new THREE.MeshBasicMaterial({ color: COLOR_LUZ.lista, toneMapped: false }));
  caja(0.2, 0.02, 0.012, luzMat, -0.3, 1.0, D / 2 + 0.004);

  // pila de hojas impresas en la bahía
  const pilaMesh = caja(0.36, 0.01, 0.46, papelMat, -W * 0.15, 0.797, 0.03);
  pilaMesh.visible = false;

  // hojas en camino a la bahía
  const hojaGeo = new THREE.PlaneGeometry(0.36, 0.46).rotateX(-Math.PI / 2);
  const hojaMat = track(new THREE.MeshLambertMaterial({ map: texturaHoja(), side: THREE.DoubleSide }));
  const vuelo: { m: THREE.Mesh; p: number; entra: boolean }[] = [];
  for (let i = 0; i < 6; i++) {
    const m = new THREE.Mesh(hojaGeo, hojaMat);
    m.visible = false;
    g.add(m);
    vuelo.push({ m, p: 1, entra: false });
  }

  // anillo de aviso de vida
  const anilloMat = track(new THREE.MeshBasicMaterial({ color: 0x1f9d63, transparent: true, opacity: 0, depthWrite: false }));
  const anillo = new THREE.Mesh(new THREE.RingGeometry(0.78, 0.84, 56).rotateX(-Math.PI / 2), anilloMat);
  anillo.position.y = 0.012;
  g.add(anillo);

  const sombra = sombraSuave(1.9, 1.6, 0.32);
  sombra.position.y = 0.004;
  g.add(sombra);

  let enPila = 0;
  let luz: Luz = "lista";
  let apagadaYa = false;
  let cajonObj = 0;
  let cajonAct = 0;
  let pulsoT = 1;

  const ponerPila = () => {
    pilaMesh.visible = enPila > 0;
    const h = Math.min(0.08, 0.004 + enPila * 0.0035);
    pilaMesh.scale.y = h / 0.01;
    pilaMesh.position.y = 0.792 + h / 2;
  };

  const m: Multi = {
    grupo: g,
    luz: (l) => {
      luz = l;
      luzMat.color.setHex(COLOR_LUZ[l]);
      anilloMat.color.setHex(l === "error" ? 0xd64545 : l === "trabajando" ? 0x2f5bea : 0x1f9d63);
    },
    pantalla: (titulo, sub = "", fondo = "#1b2236") => lienzo.pintar(titulo, sub, fondo),
    hojaSale: () => {
      const libre = vuelo.find((v) => v.p >= 1);
      if (!libre) {
        enPila++;
        ponerPila();
        return;
      }
      libre.p = 0;
      libre.entra = false;
      libre.m.visible = true;
    },
    hojaEntra: () => {
      const libre = vuelo.find((v) => v.p >= 1);
      if (!libre) return;
      libre.p = 0;
      libre.entra = true;
      libre.m.visible = true;
    },
    pila: (n) => {
      enPila = n;
      ponerPila();
    },
    cajon: (a) => (cajonObj = a),
    papel: (hay) => (resma.visible = hay),
    apagada: (si) => {
      apagadaYa = si;
      blanco.color.setHex(si ? 0xd9dce2 : 0xf3f4f7);
      gris.color.setHex(si ? 0xb4bac4 : 0xcdd3dd);
      if (si) {
        lienzo.pintar("", "", "#0d1018");
        luzMat.color.setHex(COLOR_LUZ.apagada);
      }
    },
    latido: () => {
      if (!apagadaYa) pulsoT = 0;
    },
    update: (dt, t) => {
      cajonAct += (cajonObj - cajonAct) * (1 - Math.exp(-6 * dt));
      bandeja.position.z = cajonAct * 0.34;
      if (!apagadaYa) {
        const parpadea = luz === "trabajando" || luz === "error";
        luzMat.color.setHex(parpadea && Math.sin(t * 9) < -0.2 ? 0x2a303c : COLOR_LUZ[luz]);
      }
      pulsoT = Math.min(1, pulsoT + dt / 1.6);
      anillo.scale.setScalar(1 + pulsoT * 0.85);
      anilloMat.opacity = pulsoT >= 1 ? 0 : (1 - pulsoT) * 0.55;
      vuelo.forEach((v) => {
        if (v.p >= 1) return;
        v.p = Math.min(1, v.p + dt / (v.entra ? 0.7 : 0.85));
        const e = v.p;
        if (v.entra) {
          // la hoja del escáner entra por el alimentador
          v.m.position.set(-0.06, 1.25 - e * 0.04, -0.12 - e * 0.12);
          v.m.rotation.set(0, 0, 0);
          v.m.scale.setScalar(0.9);
          if (v.p >= 1) v.m.visible = false;
          return;
        }
        // sale del cuerpo hacia el frente y se asienta sobre la pila
        const z = -0.32 + Math.min(1, e * 1.3) * 0.36;
        const y = 0.87 - Math.max(0, e - 0.6) * 0.18 - Math.sin(Math.min(1, e * 1.3) * Math.PI) * 0.01;
        v.m.position.set(-W * 0.15, Math.max(y, 0.8 + enPila * 0.0035), z);
        v.m.rotation.set(Math.sin(e * Math.PI) * -0.18, 0, Math.sin(e * 6) * 0.02);
        v.m.scale.setScalar(1);
        if (v.p >= 1) {
          v.m.visible = false;
          enPila++;
          ponerPila();
        }
      });
    },
  };
  m.pantalla("Lista", "", "#17402f");
  if (opts.escala) g.scale.setScalar(opts.escala);
  return m;
}
