"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { damp, montar } from "./kit";
import { crearMulti, type Luz, type Multi } from "./multi";

export interface Puesto {
  id: string;
  nombre: string;
  estado: string;
  color: boolean;
  nueva: boolean;
  vaciando?: number;
}

const luzDe = (e: string): Luz => (e === "lista" ? "lista" : e === "imprimiendo" ? "trabajando" : e === "sin papel" || e === "atasco" ? "error" : e === "sin señal" ? "apagada" : "aviso");
const fondo: Record<Luz, string> = { lista: "#17402f", trabajando: "#1d3a8a", error: "#6b1d1d", aviso: "#5a3c06", apagada: "#0d1018" };

// Las impresoras de un punto, una al lado de la otra, cada una con su aviso de vida.
export default function Fila({ puestos, elegida }: { puestos: Puesto[]; elegida?: string }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const estado = useRef({ puestos, elegida });
  estado.current = { puestos, elegida };
  const rehacer = useRef<(() => void) | null>(null);
  const clave = puestos.map((p) => p.id).join("|");

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const k = montar(mount, { dpr: 1.5 });
    if (!k) return;
    const { scene, renderer, track, small } = k;
    if (!small) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    const camera = new THREE.PerspectiveCamera(30, k.size().w / k.size().h, 0.1, 60);
    k.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc6cfe0, 1.35));
    const sol = new THREE.DirectionalLight(0xffffff, 1.2);
    sol.position.set(-4, 8, 6);
    scene.add(sol);

    const lista = estado.current.puestos.slice(0, 5);
    const sep = 1.75;
    const ancho = Math.max(1, lista.length) * sep;
    const piso = new THREE.Mesh(new THREE.BoxGeometry(ancho + 1, 0.1, 2.4), track(new THREE.MeshLambertMaterial({ color: 0xeef1f6 })));
    piso.position.y = -0.05;
    scene.add(piso);
    const marcaMat = track(new THREE.MeshBasicMaterial({ color: 0x2f5bea, transparent: true, opacity: 0.0, depthWrite: false }));
    const marca = new THREE.Mesh(new THREE.RingGeometry(0.95, 1.02, 64).rotateX(-Math.PI / 2), marcaMat);
    marca.position.y = 0.006;
    scene.add(marca);

    const multis: { m: Multi; id: string; estado: string }[] = lista.map((p, i) => {
      const m = crearMulti(track, { color: p.color, acento: p.nueva ? 0x2f5bea : 0xd9772b });
      m.grupo.position.set(-ancho / 2 + sep / 2 + i * sep, 0, 0);
      m.grupo.rotation.y = -0.18 + i * 0.04;
      scene.add(m.grupo);
      return { m, id: p.id, estado: "" };
    });

    const sincronizar = () => {
      const { puestos } = estado.current;
      multis.forEach((x) => {
        const p = puestos.find((y) => y.id === x.id);
        if (!p) return;
        const firma = `${p.estado}|${p.vaciando ?? ""}|${p.nombre}`;
        if (firma === x.estado) return;
        x.estado = firma;
        const l = luzDe(p.estado);
        x.m.apagada(p.estado === "sin señal");
        x.m.luz(l);
        x.m.cajon(p.estado === "sin papel" ? 0.8 : 0);
        x.m.papel(p.estado !== "sin papel");
        if (p.estado !== "sin señal") x.m.pantalla(p.vaciando ? "Cambiando" : p.estado === "lista" ? "Lista" : p.estado.charAt(0).toUpperCase() + p.estado.slice(1), p.vaciando ? `faltan ${p.vaciando}` : p.nombre, fondo[l]);
      });
    };
    rehacer.current = sincronizar;
    sincronizar();

    const onHoja = (e: Event) => {
      const id = (e as CustomEvent).detail as string;
      multis.find((x) => x.id === id)?.m.hojaSale();
    };
    window.addEventListener("bandeja:hoja", onHoja);
    let ptr = 0;
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      ptr = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let cur = 0;
    let latido = 0.4;
    let mx = 0;
    k.loop((dt, t) => {
      cur = damp(cur, ptr, 2.4, dt);
      const { w, h } = k.size();
      const dist = Math.max(3.6, (ancho + 0.8) / (2 * Math.tan((15 * Math.PI) / 180) * (w / h))) * 1.04;
      camera.position.set(cur * 0.9, dist * 0.36 + 0.5, dist);
      camera.lookAt(0, 0.66, 0);
      latido -= dt;
      if (latido <= 0) {
        multis.forEach((x, i) => !x.estado.startsWith("sin señal") && window.setTimeout(() => x.m.latido(), i * 220));
        latido = 3;
      }
      const sel = multis.find((x) => x.id === estado.current.elegida);
      marcaMat.opacity = damp(marcaMat.opacity, sel ? 0.75 : 0, 6, dt);
      if (sel) mx = damp(mx, sel.m.grupo.position.x, 8, dt);
      marca.position.x = mx;
      marca.scale.setScalar(1 + Math.sin(t * 3) * 0.02);
      multis.forEach((x) => {
        const arriba = x.id === estado.current.elegida ? 0.06 : 0;
        x.m.grupo.position.y = damp(x.m.grupo.position.y, arriba, 6, dt);
        x.m.update(dt, t);
      });
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("bandeja:hoja", onHoja);
      window.removeEventListener("pointermove", onMove);
      rehacer.current = null;
      k.dispose();
    };
  }, [clave]);

  useEffect(() => {
    rehacer.current?.();
  }, [puestos, elegida]);

  return <div ref={ref} className="fila-canvas" aria-hidden="true" />;
}
