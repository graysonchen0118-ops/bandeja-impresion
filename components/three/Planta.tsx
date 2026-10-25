"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { damp, lienzoTexto, montar, sombraSuave, texturaHoja } from "./kit";
import { crearMulti, type Multi } from "./multi";

// La operación vista desde arriba: el celular y el navegador mandan hojas a la nube,
// la nube las reparte a las impresoras, y solo cuando la máquina confirma vuelve
// un punto verde hasta el celular. La impresora sin señal queda gris y nadie le manda nada.
export default function Planta() {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const mount = ref.current;
    if (!mount) return;
    const k = montar(mount, { dpr: 1.5 });
    if (!k) return;
    const { scene, renderer, track, small, reduce } = k;
    if (!small) renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.25));
    scene.fog = new THREE.Fog(0xf6f5f1, 13, 26);

    const camera = new THREE.PerspectiveCamera(small ? 44 : 40, k.size().w / k.size().h, 0.1, 60);
    const ajustar = (w: number, h: number) => {
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    ajustar(k.size().w, k.size().h);
    k.onResize(ajustar);

    scene.add(new THREE.HemisphereLight(0xffffff, 0xc9d2e3, 1.35));
    const sol = new THREE.DirectionalLight(0xffffff, 1.25);
    sol.position.set(-5, 9, 7);
    scene.add(sol);
    const relleno = new THREE.DirectionalLight(0xdfe7ff, 0.45);
    relleno.position.set(6, 3, -4);
    scene.add(relleno);

    // piso flotante
    const piso = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.18, 5.2), track(new THREE.MeshLambertMaterial({ color: 0xeef1f6 })));
    piso.position.y = -0.09;
    scene.add(piso);
    const borde = new THREE.Mesh(new THREE.BoxGeometry(8.7, 0.06, 5.3), track(new THREE.MeshLambertMaterial({ color: 0xd3dae6 })));
    borde.position.y = -0.2;
    scene.add(borde);
    const sombraPiso = sombraSuave(10, 7, 0.18);
    sombraPiso.position.y = -0.6;
    scene.add(sombraPiso);

    // celular sobre su base
    const cel = new THREE.Group();
    cel.position.set(-3.0, 0, 1.05);
    cel.rotation.y = 0.35;
    scene.add(cel);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 0.12, 28), track(new THREE.MeshLambertMaterial({ color: 0xcfd6e2 })));
    base.position.y = 0.06;
    cel.add(base);
    const cuerpoCel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.98, 0.06), track(new THREE.MeshPhongMaterial({ color: 0x1a2133, shininess: 80 })));
    cuerpoCel.position.set(0, 0.66, 0);
    cuerpoCel.rotation.x = -0.18;
    cel.add(cuerpoCel);
    const pantCel = lienzoTexto(160, 300);
    track(pantCel.tex);
    const pantallaCel = new THREE.Mesh(new THREE.PlaneGeometry(0.44, 0.9), track(new THREE.MeshBasicMaterial({ map: pantCel.tex, toneMapped: false })));
    pantallaCel.position.z = 0.032;
    cuerpoCel.add(pantallaCel);
    const somCel = sombraSuave(1.1, 0.9, 0.3);
    somCel.position.y = 0.005;
    cel.add(somCel);

    // portátil
    const lap = new THREE.Group();
    lap.position.set(-2.75, 0, -1.15);
    lap.rotation.y = 0.45;
    scene.add(lap);
    const gris = track(new THREE.MeshLambertMaterial({ color: 0xc4ccd9 }));
    const teclado = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.05, 0.8), gris);
    teclado.position.y = 0.025;
    lap.add(teclado);
    const tapa = new THREE.Group();
    tapa.position.set(0, 0.05, -0.4);
    tapa.rotation.x = -0.32;
    lap.add(tapa);
    const marco = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.78, 0.04), gris);
    marco.position.y = 0.39;
    tapa.add(marco);
    const pantLap = lienzoTexto(300, 190);
    track(pantLap.tex);
    const pantallaLap = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.69), track(new THREE.MeshBasicMaterial({ map: pantLap.tex, toneMapped: false })));
    pantallaLap.position.set(0, 0.39, 0.022);
    tapa.add(pantallaLap);
    const somLap = sombraSuave(1.8, 1.3, 0.28);
    somLap.position.y = 0.004;
    lap.add(somLap);

    const pintarDispositivo = (lz: ReturnType<typeof lienzoTexto>, chip: string, color: string, ancho: number, alto: number) => {
      const c = lz.tex.image as HTMLCanvasElement;
      const g = c.getContext("2d")!;
      const fam = getComputedStyle(document.body).fontFamily || "sans-serif";
      g.fillStyle = "#f6f7fb";
      g.fillRect(0, 0, ancho, alto);
      g.fillStyle = "#2f5bea";
      g.fillRect(0, 0, ancho, alto * 0.13);
      g.fillStyle = "#ffffff";
      g.font = `800 ${Math.round(alto * 0.065)}px ${fam}`;
      g.textBaseline = "middle";
      g.fillText("Bandeja", ancho * 0.08, alto * 0.066);
      g.fillStyle = "#ffffff";
      g.fillRect(ancho * 0.07, alto * 0.2, ancho * 0.86, alto * 0.24);
      g.fillStyle = "#d64545";
      g.fillRect(ancho * 0.11, alto * 0.24, ancho * 0.12, alto * 0.16);
      g.fillStyle = "#28324a";
      g.font = `700 ${Math.round(alto * 0.05)}px ${fam}`;
      g.fillText("Contrato.pdf", ancho * 0.28, alto * 0.29);
      g.fillStyle = "#8a93a6";
      g.font = `600 ${Math.round(alto * 0.04)}px ${fam}`;
      g.fillText("6 páginas, carta", ancho * 0.28, alto * 0.36);
      g.fillStyle = color;
      const cw = ancho * 0.86;
      g.beginPath();
      g.roundRect(ancho * 0.07, alto * 0.52, cw, alto * 0.14, alto * 0.07);
      g.fill();
      g.fillStyle = "#ffffff";
      g.font = `800 ${Math.round(alto * 0.055)}px ${fam}`;
      g.textAlign = "center";
      g.fillText(chip, ancho / 2, alto * 0.59);
      g.textAlign = "left";
      g.fillStyle = "#dfe4ee";
      for (let i = 0; i < 3; i++) g.fillRect(ancho * 0.07, alto * (0.74 + i * 0.07), ancho * (0.86 - i * 0.18), alto * 0.025);
      lz.tex.needsUpdate = true;
    };
    const estadoDisp = (cual: "cel" | "lap", chip: string, color: string) => (cual === "cel" ? pintarDispositivo(pantCel, chip, color, 160, 300) : pintarDispositivo(pantLap, chip, color, 300, 190));
    estadoDisp("cel", "Listo para enviar", "#8a93a6");
    estadoDisp("lap", "Listo para enviar", "#8a93a6");

    // la nube: un solo registro por trabajo, apilado como fichas
    const nube = new THREE.Group();
    nube.position.set(-0.55, 2.55, 0);
    scene.add(nube);
    const fichaMat = track(new THREE.MeshPhongMaterial({ color: 0x2f5bea, transparent: true, opacity: 0.85, shininess: 90, specular: 0x9db4ff }));
    const fichaClara = track(new THREE.MeshPhongMaterial({ color: 0xffffff, transparent: true, opacity: 0.92, shininess: 40 }));
    const fichas: THREE.Mesh[] = [];
    for (let i = 0; i < 4; i++) {
      const f = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.06, 0.86), i === 0 ? fichaMat : fichaClara);
      f.position.y = -i * 0.14;
      nube.add(f);
      fichas.push(f);
    }
    const halo = sombraSuave(2.6, 2, 0.12);
    halo.position.y = -2.7;
    nube.add(halo);
    const etiqueta = lienzoTexto(440, 84);
    track(etiqueta.tex);
    etiqueta.pintar("Un registro por trabajo", "", "rgba(255,255,255,0)", "#2f3a55");
    const letrero = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 0.46), track(new THREE.MeshBasicMaterial({ map: etiqueta.tex, transparent: true, toneMapped: false, depthWrite: false })));
    letrero.position.set(0, 0.42, 0);
    nube.add(letrero);

    // impresoras
    const puestos: { x: number; z: number; ry: number; viva: boolean; nombre: string }[] = [
      { x: 0.85, z: -1.2, ry: -0.3, viva: true, nombre: "Recepción" },
      { x: 2.55, z: -1.3, ry: -0.42, viva: true, nombre: "Contabilidad" },
      { x: 1.1, z: 1.1, ry: -0.25, viva: false, nombre: "Sala 2" },
      { x: 2.85, z: 0.85, ry: -0.4, viva: true, nombre: "Mostrador" },
    ];
    const multis: (Multi & { viva: boolean; x: number; z: number })[] = puestos.map((p, i) => {
      const m = crearMulti(track, { color: i % 2 === 0 });
      m.grupo.position.set(p.x, 0, p.z);
      m.grupo.rotation.y = p.ry;
      scene.add(m.grupo);
      if (!p.viva) {
        m.apagada(true);
        m.luz("apagada");
      } else m.pantalla("Lista", p.nombre, "#17402f");
      return Object.assign(m, { viva: p.viva, x: p.x, z: p.z });
    });

    // hojas en vuelo y confirmaciones de regreso
    const hojaGeo = new THREE.PlaneGeometry(0.3, 0.4);
    const hojaMat = track(new THREE.MeshLambertMaterial({ map: texturaHoja(), side: THREE.DoubleSide }));
    const okMat = track(new THREE.MeshBasicMaterial({ color: 0x1f9d63, toneMapped: false }));
    const okGeo = new THREE.SphereGeometry(0.09, 16, 12);
    const origenes = { cel: new THREE.Vector3(-3.0, 1.25, 1.1), lap: new THREE.Vector3(-2.8, 0.9, -1.25) };
    const centro = nube.position.clone().add(new THREE.Vector3(0, -0.2, 0));
    const curva = (a: THREE.Vector3, b: THREE.Vector3, alto: number) => new THREE.QuadraticBezierCurve3(a, new THREE.Vector3((a.x + b.x) / 2, Math.max(a.y, b.y) + alto, (a.z + b.z) / 2), b);

    type Viaje = { malla: THREE.Mesh; tramos: THREE.QuadraticBezierCurve3[]; p: number; dur: number; fin: () => void; gira: boolean };
    const viajes: Viaje[] = [];
    const lanzar = (malla: THREE.Mesh, tramos: THREE.QuadraticBezierCurve3[], dur: number, fin: () => void, gira = true) => {
      scene.add(malla);
      viajes.push({ malla, tramos, p: 0, dur, fin, gira });
    };
    let fuera = false;
    const vivas = multis.filter((m) => m.viva);
    let turno = 0;
    let ocupado = 0;
    const enviarUno = () => {
      if (ocupado > 2) return;
      ocupado++;
      const desde: "cel" | "lap" = turno % 2 === 0 ? "cel" : "lap";
      const dest = vivas[turno % vivas.length];
      turno++;
      estadoDisp(desde, "Enviando", "#2f5bea");
      const entrada = new THREE.Vector3(dest.x - 0.05, 1.05, dest.z - 0.2);
      const hoja = new THREE.Mesh(hojaGeo, hojaMat);
      lanzar(hoja, [curva(origenes[desde], centro, 0.9)], 1.5, () => {
        fichas.forEach((f, i) => (f.userData.salto = 0.12 + i * 0.03));
        estadoDisp(desde, "En la fila", "#3c64c8");
        lanzar(hoja, [curva(centro, entrada, 0.6)], 1.4, () => {
          scene.remove(hoja);
          dest.luz("trabajando");
          dest.pantalla("Imprimiendo", "3 hojas", "#1d3a8a");
          estadoDisp(desde, "Imprimiendo", "#3c64c8");
          let n = 0;
          const iv = window.setInterval(() => {
            if (fuera) return window.clearInterval(iv);
            dest.hojaSale();
            n++;
            if (n >= 3) {
              window.clearInterval(iv);
              window.setTimeout(() => {
                if (fuera) return;
                dest.luz("lista");
                dest.pantalla("Confirmado", "3 de 3 hojas", "#17402f");
                const ok = new THREE.Mesh(okGeo, okMat);
                const salida = new THREE.Vector3(dest.x, 1.0, dest.z);
                lanzar(ok, [curva(salida, centro, 0.6), curva(centro, origenes[desde], 0.9)], 2.2, () => {
                  scene.remove(ok);
                  estadoDisp(desde, "Impreso", "#1f9d63");
                  ocupado--;
                  window.setTimeout(() => {
                    if (fuera) return;
                    estadoDisp(desde, "Listo para enviar", "#8a93a6");
                    dest.pantalla("Lista", puestos[multis.indexOf(dest)].nombre, "#17402f");
                    if (Math.random() < 0.5) dest.pila(0);
                  }, 2600);
                }, false);
              }, 650);
            }
          }, 520);
        });
      });
    };

    const ptr = { x: 0, y: 0 };
    const cur = { x: 0, y: 0, s: 0 };
    const onMove = (e: PointerEvent) => {
      ptr.x = (e.clientX / window.innerWidth - 0.5) * 2;
      ptr.y = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    const onSubido = () => enviarUno();
    window.addEventListener("bandeja:subido", onSubido);

    let reloj = 1.2;
    let latido = 0;
    const tmp = new THREE.Vector3();
    k.loop((dt, t) => {
      cur.x = damp(cur.x, ptr.x, 2.2, dt);
      cur.y = damp(cur.y, ptr.y, 2.2, dt);
      cur.s = damp(cur.s, Math.min(window.scrollY, 700), 4, dt);
      const giro = reduce ? 0 : Math.sin(t * 0.12) * 0.35;
      const { w: cw, h: ch } = k.size();
      const r = small ? 8.6 : cw / ch > 1.8 ? 8.2 : 11.6;
      camera.position.set(Math.sin(giro + cur.x * 0.18) * r * 0.42 + 0.2, (small ? 5.0 : 5.8) - cur.y * 0.5 + cur.s * 0.0028, Math.cos(giro * 0.5) * r - cur.s * 0.003);
      camera.lookAt(0.15, 0.7 - cur.s * 0.0012, 0);

      reloj -= dt;
      if (reloj <= 0 && !reduce) {
        enviarUno();
        reloj = 2.6 + Math.random() * 1.4;
      }
      latido -= dt;
      if (latido <= 0) {
        vivas.forEach((m, i) => window.setTimeout(() => !fuera && m.latido(), i * 260));
        latido = 3.2;
      }
      nube.position.y = 2.7 + Math.sin(t * 0.9) * 0.06;
      fichas.forEach((f, i) => {
        const s = (f.userData.salto as number | undefined) ?? 0;
        f.userData.salto = Math.max(0, s - dt * 0.5);
        f.position.y = -i * 0.14 + s;
        f.rotation.y = Math.sin(t * 0.4 + i) * 0.04;
      });
      letrero.lookAt(camera.position);
      multis.forEach((m) => m.update(dt, t));

      for (let i = viajes.length - 1; i >= 0; i--) {
        const v = viajes[i];
        v.p = Math.min(1, v.p + dt / v.dur);
        const n = v.tramos.length;
        const idx = Math.min(n - 1, Math.floor(v.p * n));
        const local = v.p * n - idx;
        const e = local < 0.5 ? 2 * local * local : 1 - Math.pow(-2 * local + 2, 2) / 2;
        v.tramos[idx].getPoint(e, tmp);
        v.malla.position.copy(tmp);
        if (v.gira) {
          v.malla.rotation.set(-0.9 + Math.sin(t * 6 + i) * 0.25, t * 1.4, Math.sin(t * 4) * 0.3);
        }
        if (v.p >= 1) {
          viajes.splice(i, 1);
          v.fin();
        }
      }
      renderer.render(scene, camera);
    });

    return () => {
      fuera = true;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("bandeja:subido", onSubido);
      hojaGeo.dispose();
      okGeo.dispose();
      k.dispose();
    };
  }, []);

  return <div ref={ref} className="planta-canvas" aria-hidden="true" />;
}
