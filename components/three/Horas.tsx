"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { damp, montar, sombraSuave } from "./kit";

export interface Hora {
  etiqueta: string;
  ok: number;
  mal: number;
  curso: number;
}

// Hojas por hora en columnas 3D: azul lo que la impresora confirmó, rojo lo que se detuvo
// o no salió, celeste lo que todavía va en camino.
export default function Horas({ datos }: { datos: Hora[] }) {
  const ref = useRef<HTMLDivElement | null>(null);
  const datosRef = useRef(datos);
  datosRef.current = datos;
  const api = useRef<((d: Hora[]) => void) | null>(null);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const k = montar(mount, { dpr: 1.5 });
    if (!k) return;
    const { scene, renderer, track, small } = k;
    if (!small) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    const camera = new THREE.PerspectiveCamera(30, k.size().w / k.size().h, 0.1, 60);
    const n = datosRef.current.length || 14;
    const ancho = n * 0.9;
    k.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc5cee0, 1.4));
    const sol = new THREE.DirectionalLight(0xffffff, 1.1);
    sol.position.set(-3, 8, 6);
    scene.add(sol);

    const base = new THREE.Mesh(new THREE.BoxGeometry(ancho + 0.8, 0.1, 1.6), track(new THREE.MeshLambertMaterial({ color: 0xeef1f6 })));
    base.position.y = -0.05;
    scene.add(base);
    const som = sombraSuave(ancho + 3, 3.4, 0.14);
    som.position.y = -0.35;
    scene.add(som);

    const geo = track(new THREE.BoxGeometry(0.56, 1, 0.56));
    geo.translate(0, 0.5, 0);
    const mats = {
      ok: track(new THREE.MeshLambertMaterial({ color: 0x2f5bea })),
      mal: track(new THREE.MeshLambertMaterial({ color: 0xd64545 })),
      curso: track(new THREE.MeshLambertMaterial({ color: 0x8fd3e8 })),
    };
    const columnas = Array.from({ length: n }, (_, i) => {
      const g = new THREE.Group();
      g.position.x = -ancho / 2 + 0.45 + i * 0.9;
      scene.add(g);
      const ok = new THREE.Mesh(geo, mats.ok);
      const mal = new THREE.Mesh(geo, mats.mal);
      const curso = new THREE.Mesh(geo, mats.curso);
      g.add(ok, mal, curso);
      return { ok, mal, curso, act: { ok: 0.001, mal: 0.001, curso: 0.001 }, obj: { ok: 0.001, mal: 0.001, curso: 0.001 } };
    });

    const poner = (d: Hora[]) => {
      const max = Math.max(1, ...d.map((x) => x.ok + x.mal + x.curso));
      columnas.forEach((c, i) => {
        const h = d[i] ?? { ok: 0, mal: 0, curso: 0 };
        c.obj.ok = Math.max(0.001, (h.ok / max) * 3);
        c.obj.mal = Math.max(0.001, (h.mal / max) * 3);
        c.obj.curso = Math.max(0.001, (h.curso / max) * 3);
      });
    };
    api.current = poner;
    poner(datosRef.current);

    let ptr = 0;
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      ptr = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    let cur = 0;
    k.loop((dt) => {
      cur = damp(cur, ptr, 2.5, dt);
      const { w, h } = k.size();
      const dist = Math.max(6, (ancho + 1.4) / (2 * Math.tan((15 * Math.PI) / 180) * (w / h)));
      camera.position.set(cur * 1.4, dist * 0.34 + 0.6, dist);
      camera.lookAt(0, 1.25, 0);
      columnas.forEach((c) => {
        (["ok", "mal", "curso"] as const).forEach((key) => (c.act[key] = damp(c.act[key], c.obj[key], 4, dt)));
        c.ok.scale.set(1, c.act.ok, 1);
        c.mal.scale.set(1, c.act.mal, 1);
        c.mal.position.y = c.act.ok;
        c.curso.scale.set(1, c.act.curso, 1);
        c.curso.position.y = c.act.ok + c.act.mal;
        c.ok.visible = c.act.ok > 0.01;
        c.mal.visible = c.act.mal > 0.01;
        c.curso.visible = c.act.curso > 0.01;
      });
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      api.current = null;
      k.dispose();
    };
  }, []);

  useEffect(() => {
    api.current?.(datos);
  }, [datos]);

  return <div ref={ref} className="horas-canvas" aria-hidden="true" />;
}
