"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { damp, montar, sombraSuave } from "./kit";
import { crearMulti, type Multi } from "./multi";

export type EstadoMaquina = "lista" | "recibiendo" | "codigo" | "imprimiendo" | "sin papel" | "atasco" | "impreso" | "apagada" | "pausada";

interface Props {
  estado: EstadoMaquina;
  hojas: number;
  total: number;
  nombre: string;
  trabajo?: string;
  color?: boolean;
}

// La máquina de cerca: lo que pasa en el local mientras el celular espera.
export default function Maquina(props: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const multi = useRef<Multi | null>(null);
  const previo = useRef({ hojas: 0, trabajo: "", estado: "" as string, nombre: "" });
  const sacudida = useRef(0);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const k = montar(mount, { dpr: 1.5 });
    if (!k) return;
    const { scene, renderer, track, small, reduce } = k;
    if (!small) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.4));
    const camera = new THREE.PerspectiveCamera(30, k.size().w / k.size().h, 0.1, 40);
    k.onResize((w, h) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    });
    scene.add(new THREE.HemisphereLight(0xffffff, 0xc7d0e0, 1.4));
    const sol = new THREE.DirectionalLight(0xffffff, 1.3);
    sol.position.set(-3, 6, 5);
    scene.add(sol);
    const contra = new THREE.DirectionalLight(0xcdd9ff, 0.5);
    contra.position.set(4, 2, -3);
    scene.add(contra);

    const disco = new THREE.Mesh(new THREE.CylinderGeometry(1.5, 1.55, 0.08, 64), track(new THREE.MeshLambertMaterial({ color: 0xeef1f6 })));
    disco.position.y = -0.04;
    scene.add(disco);
    const som = sombraSuave(4, 4, 0.16);
    som.position.y = -0.3;
    scene.add(som);

    const m = crearMulti(track, { color: props.color ?? true });
    scene.add(m.grupo);
    multi.current = m;
    aplicar(m, props, previo.current, true);

    const ptr = { x: 0, y: 0 };
    const cur = { x: 0, y: 0 };
    const onMove = (e: PointerEvent) => {
      const r = mount.getBoundingClientRect();
      ptr.x = Math.max(-1, Math.min(1, ((e.clientX - r.left) / r.width - 0.5) * 2));
      ptr.y = Math.max(-1, Math.min(1, ((e.clientY - r.top) / r.height - 0.5) * 2));
    };
    window.addEventListener("pointermove", onMove, { passive: true });

    let latido = 0.5;
    k.loop((dt, t) => {
      cur.x = damp(cur.x, ptr.x, 3, dt);
      cur.y = damp(cur.y, ptr.y, 3, dt);
      const giro = reduce ? 0.35 : 0.35 + Math.sin(t * 0.25) * 0.12 + cur.x * 0.3;
      camera.position.set(Math.sin(giro) * 3.9, 2.25 - cur.y * 0.4, Math.cos(giro) * 3.9);
      camera.lookAt(0, 0.72, 0);
      sacudida.current = Math.max(0, sacudida.current - dt * 2.5);
      m.grupo.position.x = Math.sin(t * 60) * 0.006 * sacudida.current;
      latido -= dt;
      if (latido <= 0) {
        m.latido();
        latido = 3;
      }
      m.update(dt, t);
      renderer.render(scene, camera);
    });

    return () => {
      window.removeEventListener("pointermove", onMove);
      multi.current = null;
      k.dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const m = multi.current;
    if (!m) return;
    if (props.estado === "sin papel" && previo.current.estado !== "sin papel") sacudida.current = 1;
    aplicar(m, props, previo.current, false);
  }, [props]);

  return <div ref={ref} className="maquina-canvas" aria-hidden="true" />;
}

function aplicar(m: Multi, p: Props, previo: { hojas: number; trabajo: string; estado: string; nombre: string }, inicio: boolean) {
  if ((p.trabajo ?? "") !== previo.trabajo) {
    m.pila(0);
    previo.hojas = 0;
    previo.trabajo = p.trabajo ?? "";
  }
  const nuevas = p.hojas - previo.hojas;
  if (!inicio && nuevas > 0) for (let i = 0; i < Math.min(nuevas, 4); i++) window.setTimeout(() => m.hojaSale(), i * 140);
  previo.hojas = p.hojas;
  if (p.estado === previo.estado && p.nombre === previo.nombre && !inicio && p.estado !== "imprimiendo") return;
  previo.estado = p.estado;
  previo.nombre = p.nombre;
  m.apagada(p.estado === "apagada");
  m.cajon(p.estado === "sin papel" ? 0.85 : 0);
  m.papel(p.estado !== "sin papel");
  switch (p.estado) {
    case "lista":
      m.luz("lista");
      m.pantalla("Lista", p.nombre, "#17402f");
      break;
    case "recibiendo":
      m.luz("trabajando");
      m.pantalla("Recibiendo", "trabajo en la fila", "#1d3a8a");
      break;
    case "codigo":
      m.luz("aviso");
      m.pantalla("Digite su código", "en este panel", "#5a3c06");
      break;
    case "imprimiendo":
      m.luz("trabajando");
      m.pantalla("Imprimiendo", `${p.hojas} de ${p.total} hojas`, "#1d3a8a");
      break;
    case "sin papel":
      m.luz("error");
      m.pantalla("Sin papel", "bandeja 1", "#6b1d1d");
      break;
    case "atasco":
      m.luz("error");
      m.pantalla("Atasco", "abra la tapa frontal", "#6b1d1d");
      break;
    case "impreso":
      m.luz("lista");
      m.pantalla("Confirmado", `${p.total} de ${p.total} hojas`, "#17402f");
      break;
    case "pausada":
      m.luz("aviso");
      m.pantalla("Pausada", "por el local", "#4a4f5c");
      break;
    case "apagada":
      m.luz("apagada");
      break;
  }
}
