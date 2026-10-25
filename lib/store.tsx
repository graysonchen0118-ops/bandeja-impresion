"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { EstadoReclamo, Evento, Flujo, Fuente, Impresora, Origen, Plataforma, Punto, Reclamo, Tamano, Trabajo, Usuario, Formato } from "./types";
import { FLUJOS, PUNTOS, crearImpresoras, crearUsuarios } from "./mock/red";
import { EMPRESA, PUBLICO, crearReclamos, crearTrabajos, fuenteDe, hojasDe, precioHoja, textoSubida } from "./mock/trabajos";
import { espera, pulso, uid } from "./format";
import { ahora, iniciarReloj, iso } from "./reloj";

export interface Toast {
  id: string;
  texto: string;
  tono: "ok" | "error" | "info";
}

export interface Envio {
  usuarioId: string;
  archivo: string;
  formato: Formato;
  paginas: number;
  copias: number;
  color: boolean;
  dobleCara: boolean;
  impresoraId: string;
  origen: Origen;
  ajuste?: string;
  tamano: Tamano;
  mb: number;
}

export class ErrorValidacion extends Error {}

export const ACTIVOS: Trabajo["estado"][] = ["convirtiendo", "en cola", "esperando código", "imprimiendo", "procesando"];
export const conSenal = (i: Impresora) => i.estado !== "sin señal";
export const disponible = (i: Impresora) => i.estado !== "sin señal" && i.estado !== "pausada" && i.estado !== "atasco" && i.estado !== "sin papel";

interface Ctx {
  listo: boolean;
  tick: number;
  puntos: Punto[];
  usuarios: Usuario[];
  impresoras: Impresora[];
  trabajos: Trabajo[];
  reclamos: Reclamo[];
  flujos: Flujo[];
  toasts: Toast[];
  toast: (texto: string, tono?: Toast["tono"]) => void;
  enviar: (e: Envio) => Promise<string>;
  liberar: (id: string, codigo: string) => Promise<void>;
  cancelar: (id: string, fuente?: Fuente) => Promise<void>;
  reanudar: (id: string) => Promise<void>;
  reenviar: (id: string, impresoraId: string) => Promise<void>;
  eliminarTrabajo: (id: string) => Promise<void>;
  recargarPapel: (impId: string) => Promise<void>;
  destrabar: (impId: string) => Promise<void>;
  reconectar: (impId: string) => Promise<void>;
  pausar: (impId: string, pausa: boolean) => Promise<void>;
  guardarImpresora: (i: Impresora, nueva: boolean) => Promise<void>;
  eliminarImpresora: (impId: string) => Promise<void>;
  migrar: (impId: string) => Promise<void>;
  devolver: (impId: string) => Promise<void>;
  cambiarFlujo: (id: string, plataforma: Plataforma, fase?: Flujo["fase"]) => Promise<void>;
  crearReclamo: (r: { usuarioId: string; canal: Reclamo["canal"]; texto: string; trabajoId?: string; prioridad: Reclamo["prioridad"] }) => Promise<string>;
  notaReclamo: (id: string, texto: string, autor: string) => Promise<void>;
  estadoReclamo: (id: string, estado: EstadoReclamo, nota?: { texto: string; autor: string }) => Promise<void>;
  asignarReclamo: (id: string, quien?: string) => Promise<void>;
  eliminarReclamo: (id: string) => Promise<void>;
}

const StoreCtx = createContext<Ctx | null>(null);

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore fuera del proveedor");
  return c;
}

const latencia = () => espera(380 + Math.random() * 420);

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [listo, setListo] = useState(false);
  const [tick, setTick] = useState(0);
  const [usuarios, setUsuarios] = useState<Usuario[]>([]);
  const [impresoras, setImpresoras] = useState<Impresora[]>([]);
  const [trabajos, setTrabajos] = useState<Trabajo[]>([]);
  const [reclamos, setReclamos] = useState<Reclamo[]>([]);
  const [flujos, setFlujos] = useState<Flujo[]>([]);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const ref = useRef({ trabajos, impresoras, usuarios });
  ref.current = { trabajos, impresoras, usuarios };
  const sim = useRef(new Map<string, number>());

  useEffect(() => {
    let vivo = true;
    iniciarReloj();
    (async () => {
      await espera(700);
      if (!vivo) return;
      const t = ahora();
      const us = crearUsuarios();
      const imps = crearImpresoras(t);
      const ts = crearTrabajos(t, us, imps, PUNTOS);
      const hoy = t - 10 * 3600e3;
      imps.forEach((i) => {
        i.paginasHoy = ts.filter((x) => x.impresoraId === i.id && new Date(x.creado).getTime() > hoy).reduce((a, x) => a + x.hojasImpresas, 0);
      });
      setUsuarios(us);
      setImpresoras(imps);
      setTrabajos(ts);
      setReclamos(crearReclamos(t, ts, us));
      setFlujos(FLUJOS.map((f) => ({ ...f })));
      setTick(t);
      setListo(true);
    })();
    const iv = setInterval(() => setTick(ahora()), 5000);
    const latido = setInterval(() => {
      const ya = iso();
      setImpresoras((is) => is.map((i) => (i.estado === "sin señal" ? i : { ...i, ultimoLatido: ya })));
      pulso("latido");
    }, 15000);
    return () => {
      vivo = false;
      clearInterval(iv);
      clearInterval(latido);
    };
  }, []);

  const toast = useCallback((texto: string, tono: Toast["tono"] = "ok") => {
    const id = uid("t");
    setToasts((x) => [...x.slice(-3), { id, texto, tono }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 4200);
  }, []);

  const getT = (id: string) => ref.current.trabajos.find((x) => x.id === id);
  const getI = (id: string) => ref.current.impresoras.find((x) => x.id === id);
  const puntoDe = (impId: string) => PUNTOS.find((p) => p.id === getI(impId)?.puntoId);

  const cambiarT = (id: string, f: (t: Trabajo) => Trabajo) => {
    const nuevo = ref.current.trabajos.map((x) => (x.id === id ? f(x) : x));
    ref.current.trabajos = nuevo;
    setTrabajos(nuevo);
  };
  const cambiarI = (id: string, f: (i: Impresora) => Impresora) => {
    const nuevo = ref.current.impresoras.map((x) => (x.id === id ? f(x) : x));
    ref.current.impresoras = nuevo;
    setImpresoras(nuevo);
  };
  const evento = (id: string, etapa: Evento["etapa"], fuente: Fuente, texto: string, extra: Partial<Trabajo> = {}) =>
    cambiarT(id, (t) => ({ ...t, ...extra, eventos: [...t.eventos, { etapa, fuente, texto, hora: iso() }] }));

  const ocupada = (impId: string, salvo?: string) => ref.current.trabajos.some((x) => x.impresoraId === impId && x.estado === "imprimiendo" && x.id !== salvo);

  /** avanza un trabajo paso a paso; la impresora es la única que puede decir "impreso" */
  const avanzar = useCallback(async (id: string) => {
    const tok = (sim.current.get(id) ?? 0) + 1;
    sim.current.set(id, tok);
    const vivo = () => sim.current.get(id) === tok && getT(id)?.estado !== "cancelado";
    let t = getT(id);
    if (!t) return;

    if (t.estado === "convirtiendo") {
      await espera(1500);
      if (!vivo()) return;
      t = getT(id)!;
      evento(id, "convertido", "nube", `Convertido a PDF, ${t.paginas} ${t.paginas === 1 ? "página" : "páginas"}`);
      pulso("convertido", t.impresoraId);
      await espera(650);
      if (!vivo()) return;
      const imp = getI(t.impresoraId)!;
      evento(id, "en cola", "nube", `En la fila de ${imp.nombre}`, { estado: "en cola" });
      pulso("cola", imp.id);
      if (puntoDe(imp.id)?.liberacion === "código" && !t.codigoLiberacion) {
        await espera(500);
        if (!vivo()) return;
        cambiarT(id, (x) => ({ ...x, estado: "esperando código", codigoLiberacion: String(1000 + Math.floor(Math.random() * 9000)) }));
        return;
      }
    }

    t = getT(id)!;
    if (t.estado === "en cola") {
      await espera(1400);
      if (!vivo()) return;
      const imp = getI(t.impresoraId)!;
      if (!disponible(imp)) return;
      evento(id, "tomado", "impresora", "La impresora lo tomó de la fila", { estado: "imprimiendo" });
      cambiarI(imp.id, (i) => ({ ...i, estado: "imprimiendo" }));
      pulso("tomado", imp.id);
    }

    t = getT(id)!;
    if (t.estado !== "imprimiendo") return;
    const total = hojasDe(t.paginas, t.copias, t.dobleCara);
    const paso = total > 24 ? 260 : total > 12 ? 420 : 680;
    while ((getT(id)?.hojasImpresas ?? total) < total) {
      await espera(paso);
      if (!vivo()) return;
      const imp = getI(t.impresoraId)!;
      const hechas = getT(id)!.hojasImpresas;
      if (imp.estado === "sin señal" || imp.estado === "pausada") return;
      if (imp.hojas <= 0) {
        evento(id, "detenido", "impresora", `Se acabó el papel en la bandeja 1. Iban ${hechas} de ${total} hojas.`, { estado: "detenido", motivo: "Se acabó el papel en la bandeja 1." });
        cambiarI(imp.id, (i) => ({ ...i, estado: "sin papel" }));
        pulso("detenido", imp.id);
        return;
      }
      cambiarT(id, (x) => ({ ...x, hojasImpresas: x.hojasImpresas + 1 }));
      cambiarI(imp.id, (i) => ({ ...i, hojas: Math.max(0, i.hojas - 1), paginasHoy: i.paginasHoy + 1, toner: Math.max(1, i.toner - (Math.random() < 0.08 ? 1 : 0)) }));
      pulso("hoja", imp.id);
    }
    await espera(700);
    if (!vivo()) return;
    evento(id, "impreso", "impresora", `La impresora confirmó ${total} de ${total} ${total === 1 ? "hoja" : "hojas"}`, { estado: "impreso", motivo: undefined });
    const imp = getI(t.impresoraId)!;
    if (imp.estado === "imprimiendo" && !ocupada(imp.id, id)) cambiarI(imp.id, (i) => ({ ...i, estado: i.toner < 10 ? "tóner bajo" : "lista" }));
    pulso("impreso", imp.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** cuando una impresora vuelve a estar lista, retoma lo que esperaba en su fila */
  const retomarFila = (impId: string, filtro: (t: Trabajo) => boolean, texto: string) => {
    ref.current.trabajos
      .filter((x) => x.impresoraId === impId && filtro(x))
      .forEach((x) => {
        if (x.estado === "detenido") evento(x.id, "reanudado", "impresora", texto.replace("{n}", String(x.hojasImpresas + 1)), { estado: "imprimiendo", motivo: undefined });
        avanzar(x.id);
      });
  };

  const crear = (e: Envio) => {
    const imp = getI(e.impresoraId)!;
    const ya = iso();
    const id = uid("t");
    const ultimo = Math.max(...ref.current.trabajos.map((x) => Number(x.codigo.slice(3)) || 0));
    const total = hojasDe(e.paginas, e.copias, e.dobleCara);
    const nuevo: Trabajo = {
      id,
      codigo: `BJ-${ultimo + 1}`,
      tipo: "Impresión",
      origen: e.origen,
      usuarioId: e.usuarioId,
      archivo: e.archivo,
      formato: e.formato,
      paginas: e.paginas,
      copias: e.copias,
      color: e.color,
      dobleCara: e.dobleCara,
      tamano: e.tamano,
      impresoraId: e.impresoraId,
      plataforma: imp.plataforma === "nueva" && e.origen === "Web" ? "nueva" : "actual",
      estado: "convirtiendo",
      ajuste: e.ajuste,
      creado: ya,
      hojasImpresas: 0,
      costo: total * precioHoja(e.color),
      eventos: [{ etapa: "subido", fuente: fuenteDe(e.origen), texto: `${textoSubida(e.origen)}, ${e.mb.toFixed(1).replace(".", ",")} MB`, hora: ya }],
    };
    ref.current.trabajos = [nuevo, ...ref.current.trabajos];
    setTrabajos(ref.current.trabajos);
    pulso("subido", imp.id);
    avanzar(id);
    return id;
  };

  const enviar = useCallback(async (e: Envio) => {
    const imp = getI(e.impresoraId);
    if (!imp) throw new ErrorValidacion("Elija una impresora.");
    if (imp.estado === "sin señal") throw new ErrorValidacion("Esa impresora no responde. Elija otra.");
    if (imp.estado === "pausada") throw new ErrorValidacion("Esa impresora está pausada por el local.");
    if (e.copias < 1 || e.copias > 20) throw new ErrorValidacion("Las copias van de 1 a 20.");
    await espera(700);
    return crear(e);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avanzar]);

  const liberar = useCallback(async (id: string, codigo: string) => {
    const t = getT(id);
    if (!t || t.estado !== "esperando código") return;
    await espera(450);
    if (codigo.trim() !== t.codigoLiberacion) throw new ErrorValidacion("Ese código no corresponde a este trabajo.");
    evento(id, "liberado", "impresora", "Liberado en la máquina con el código", { estado: "en cola" });
    avanzar(id);
  }, [avanzar]);

  const cancelar = useCallback(async (id: string, fuente: Fuente = "soporte") => {
    await latencia();
    const t = getT(id);
    if (!t || !(ACTIVOS.includes(t.estado) || t.estado === "detenido")) throw new ErrorValidacion("Ese trabajo ya terminó.");
    sim.current.set(id, (sim.current.get(id) ?? 0) + 1);
    evento(id, "cancelado", fuente, fuente === "soporte" ? "Cancelado por soporte" : `Cancelado por el usuario, con ${t.hojasImpresas} hojas impresas`, { estado: "cancelado", motivo: "Cancelado antes de terminar." });
    const imp = getI(t.impresoraId);
    if (imp?.estado === "imprimiendo" && !ocupada(imp.id, id)) cambiarI(imp.id, (i) => ({ ...i, estado: "lista" }));
    pulso("cancelado", t.impresoraId);
  }, []);

  const reanudar = useCallback(async (id: string) => {
    await latencia();
    const t = getT(id);
    if (!t || t.estado !== "detenido") return;
    const imp = getI(t.impresoraId)!;
    if (!disponible(imp)) throw new ErrorValidacion(`${imp.nombre} sigue sin estar lista (${imp.estado}). Reenvíelo a otra impresora.`);
    evento(id, "reanudado", "soporte", `Soporte lo retomó desde la hoja ${t.hojasImpresas + 1}`, { estado: "imprimiendo", motivo: undefined });
    avanzar(id);
  }, [avanzar]);

  const reenviar = useCallback(async (id: string, impresoraId: string) => {
    await latencia();
    const t = getT(id);
    const nueva = getI(impresoraId);
    if (!t || !nueva) return;
    if (!disponible(nueva)) throw new ErrorValidacion("Esa impresora no está lista para recibir.");
    const total = hojasDe(t.paginas, t.copias, t.dobleCara);
    evento(id, "reenviado", "soporte", `Reenviado a ${nueva.nombre}: salen las ${total - t.hojasImpresas} hojas que faltaban`, { estado: "en cola", impresoraId, motivo: undefined, tamano: nueva.tamano });
    avanzar(id);
  }, [avanzar]);

  const eliminarTrabajo = useCallback(async (id: string) => {
    await latencia();
    sim.current.set(id, (sim.current.get(id) ?? 0) + 1);
    ref.current.trabajos = ref.current.trabajos.filter((x) => x.id !== id);
    setTrabajos(ref.current.trabajos);
    setReclamos((rs) => rs.map((r) => (r.trabajoId === id ? { ...r, trabajoId: undefined } : r)));
  }, []);

  const recargarPapel = useCallback(async (impId: string) => {
    await latencia();
    cambiarI(impId, (i) => ({ ...i, hojas: i.capacidad, estado: "lista" }));
    pulso("papel", impId);
    retomarFila(impId, (x) => (x.estado === "detenido" && !!x.motivo?.includes("papel")) || x.estado === "en cola", "Papel recargado, siguió desde la hoja {n}");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const destrabar = useCallback(async (impId: string) => {
    await latencia();
    cambiarI(impId, (i) => ({ ...i, estado: "lista" }));
    pulso("papel", impId);
    retomarFila(impId, (x) => (x.estado === "detenido" && !!x.motivo?.includes("Atasco")) || x.estado === "en cola", "Atasco despejado, siguió desde la hoja {n}");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const reconectar = useCallback(async (impId: string) => {
    await espera(900);
    cambiarI(impId, (i) => ({ ...i, estado: "lista", ultimoLatido: iso() }));
    pulso("latido", impId);
    // lo que quedó a mitad no se retoma solo: la nube no sabe qué salió después de la última hoja confirmada
    retomarFila(impId, (x) => x.estado === "en cola", "");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const pausar = useCallback(async (impId: string, pausa: boolean) => {
    await latencia();
    cambiarI(impId, (i) => ({ ...i, estado: pausa ? "pausada" : "lista" }));
    if (!pausa) retomarFila(impId, (x) => x.estado === "en cola", "");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const guardarImpresora = useCallback(async (i: Impresora, nueva: boolean) => {
    if (i.nombre.trim().length < 3) throw new ErrorValidacion("Póngale un nombre que se reconozca en el local, por ejemplo Mostrador.");
    if (i.modelo.trim().length < 3) throw new ErrorValidacion("Falta el modelo de la máquina.");
    if (!PUNTOS.some((p) => p.id === i.puntoId)) throw new ErrorValidacion("Elija el punto donde está.");
    if (i.capacidad < 50 || i.capacidad > 5000) throw new ErrorValidacion("La capacidad de papel va de 50 a 5.000 hojas.");
    const repetida = ref.current.impresoras.some((x) => x.id !== i.id && x.puntoId === i.puntoId && x.nombre.trim().toLowerCase() === i.nombre.trim().toLowerCase());
    if (repetida) throw new ErrorValidacion("Ya hay una impresora con ese nombre en ese punto.");
    await latencia();
    const limpia = { ...i, nombre: i.nombre.trim(), modelo: i.modelo.trim(), hojas: Math.min(i.hojas, i.capacidad) };
    ref.current.impresoras = nueva ? [...ref.current.impresoras, limpia] : ref.current.impresoras.map((x) => (x.id === i.id ? limpia : x));
    setImpresoras(ref.current.impresoras);
    pulso("latido", i.id);
  }, []);

  const eliminarImpresora = useCallback(async (impId: string) => {
    const activos = ref.current.trabajos.filter((x) => x.impresoraId === impId && (ACTIVOS.includes(x.estado) || x.estado === "detenido")).length;
    if (activos) throw new ErrorValidacion(`Tiene ${activos} ${activos === 1 ? "trabajo" : "trabajos"} sin terminar. Reenvíelos o cancélelos primero.`);
    await latencia();
    ref.current.impresoras = ref.current.impresoras.filter((x) => x.id !== impId);
    setImpresoras(ref.current.impresoras);
  }, []);

  const migrar = useCallback(async (impId: string) => {
    const imp = getI(impId);
    if (!imp || imp.plataforma === "nueva" || imp.vaciando) return;
    if (imp.estado === "sin señal") throw new ErrorValidacion("No se puede cambiar el conector de una impresora que no responde.");
    await latencia();
    // la plataforma actual termina lo suyo antes de soltar la impresora: así nada sale dos veces ni se pierde
    let quedan = 2 + Math.floor(Math.random() * 3);
    cambiarI(impId, (i) => ({ ...i, vaciando: quedan }));
    while (quedan > 0) {
      await espera(1500);
      quedan -= 1;
      cambiarI(impId, (i) => ({ ...i, vaciando: quedan, paginasHoy: i.paginasHoy + 2 + Math.floor(Math.random() * 5) }));
      pulso("hoja", impId);
    }
    cambiarI(impId, (i) => ({ ...i, vaciando: undefined, plataforma: "nueva", ultimoLatido: iso() }));
    pulso("migrada", impId);
  }, []);

  const devolver = useCallback(async (impId: string) => {
    await latencia();
    cambiarI(impId, (i) => ({ ...i, plataforma: "actual" }));
  }, []);

  const cambiarFlujo = useCallback(async (id: string, plataforma: Plataforma, fase?: Flujo["fase"]) => {
    await espera(600);
    setFlujos((fs) => fs.map((f) => (f.id === id ? { ...f, plataforma, fase: fase ?? (plataforma === "nueva" ? "en prueba" : "pendiente") } : f)));
  }, []);

  const crearReclamo = useCallback(async (r: { usuarioId: string; canal: Reclamo["canal"]; texto: string; trabajoId?: string; prioridad: Reclamo["prioridad"] }) => {
    if (!r.usuarioId) throw new ErrorValidacion("Busque al usuario por nombre o celular.");
    if (r.texto.trim().length < 8) throw new ErrorValidacion("Escriba qué le pasó al usuario, con sus palabras.");
    await latencia();
    let numero = 0;
    const id = uid("r");
    setReclamos((rs) => {
      numero = Math.max(2400, ...rs.map((x) => x.numero)) + 1;
      return [{ id, numero, creado: iso(), usuarioId: r.usuarioId, canal: r.canal, texto: r.texto.trim(), trabajoId: r.trabajoId, estado: "abierto", prioridad: r.prioridad, notas: [] }, ...rs];
    });
    return id;
  }, []);

  const notaReclamo = useCallback(async (id: string, texto: string, autor: string) => {
    if (texto.trim().length < 3) throw new ErrorValidacion("La nota está vacía.");
    await latencia();
    setReclamos((rs) => rs.map((r) => (r.id === id ? { ...r, notas: [...r.notas, { autor, texto: texto.trim(), hora: iso() }], estado: r.estado === "abierto" ? "en revisión" : r.estado, responsable: r.responsable ?? autor } : r)));
  }, []);

  const estadoReclamo = useCallback(async (id: string, estado: EstadoReclamo, nota?: { texto: string; autor: string }) => {
    if (estado === "resuelto" && nota && nota.texto.trim().length < 3) throw new ErrorValidacion("Antes de cerrarlo, deje dicho qué se hizo.");
    await latencia();
    setReclamos((rs) => rs.map((r) => (r.id === id ? { ...r, estado, notas: nota ? [...r.notas, { autor: nota.autor, texto: nota.texto.trim(), hora: iso() }] : r.notas } : r)));
  }, []);

  const asignarReclamo = useCallback(async (id: string, quien?: string) => {
    await latencia();
    setReclamos((rs) => rs.map((r) => (r.id === id ? { ...r, responsable: quien } : r)));
  }, []);

  const eliminarReclamo = useCallback(async (id: string) => {
    await latencia();
    setReclamos((rs) => rs.filter((r) => r.id !== id));
  }, []);

  // lo que ya estaba en la fila al abrir sigue su curso solo
  const arrancado = useRef(false);
  useEffect(() => {
    if (!listo || arrancado.current) return;
    arrancado.current = true;
    ref.current.trabajos
      .filter((x) => x.estado === "convirtiendo" || x.estado === "en cola" || x.estado === "imprimiendo" || x.estado === "procesando")
      .forEach((x, i) => {
        setTimeout(() => {
          if (x.estado !== "procesando") return void avanzar(x.id);
          evento(x.id, "procesado", "nube", "PDF armado y texto reconocido para poder buscarlo");
          setTimeout(() => evento(x.id, "entregado", "nube", x.destino === "Correo" ? "Enviado al correo del usuario" : "Llegó a la app del celular", { estado: "entregado" }), 1800);
        }, 1600 + i * 1100);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo, avanzar]);

  // la red no se queda quieta: cada tanto alguien manda un trabajo desde su celular o su computador
  useEffect(() => {
    if (!listo) return;
    const llega = () => {
      if (document.visibilityState === "hidden") return;
      const { trabajos: ts, impresoras: is, usuarios: us } = ref.current;
      const ocupadas = new Set(ts.filter((x) => ["convirtiendo", "en cola", "imprimiendo", "esperando código"].includes(x.estado)).map((x) => x.impresoraId));
      const libres = is.filter((i) => disponible(i) && i.id !== "i-chapi-1" && !ocupadas.has(i.id) && i.hojas > 40);
      if (!libres.length) return;
      const imp = libres[Math.floor(Math.random() * libres.length)];
      const punto = PUNTOS.find((p) => p.id === imp.puntoId)!;
      const gente = us.filter((u) => u.puntoId === imp.puntoId);
      const u = gente[Math.floor(Math.random() * gente.length)] ?? us[0];
      const lista = punto.tipo === "Empresa" ? EMPRESA : PUBLICO;
      const [archivo, formato, min, max] = lista[Math.floor(Math.random() * lista.length)];
      const paginas = Math.min(8, min + Math.floor(Math.random() * (max - min + 1)));
      const id = crear({ usuarioId: u.id, archivo, formato, paginas, copias: 1, color: false, dobleCara: false, impresoraId: imp.id, origen: u.app, tamano: imp.tamano, mb: 0.3 + Math.random() * 2.5 });
      if (punto.liberacion === "código") {
        window.setTimeout(() => {
          const j = getT(id);
          if (j?.estado === "esperando código" && j.codigoLiberacion) liberar(id, j.codigoLiberacion).catch(() => undefined);
        }, 7000 + Math.random() * 5000);
      }
    };
    const primero = window.setTimeout(llega, 9000);
    const iv = window.setInterval(llega, 26000);
    return () => {
      window.clearTimeout(primero);
      window.clearInterval(iv);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listo]);

  const valor = useMemo<Ctx>(
    () => ({
      listo,
      tick,
      puntos: PUNTOS,
      usuarios,
      impresoras,
      trabajos,
      reclamos,
      flujos,
      toasts,
      toast,
      enviar,
      liberar,
      cancelar,
      reanudar,
      reenviar,
      eliminarTrabajo,
      recargarPapel,
      destrabar,
      reconectar,
      pausar,
      guardarImpresora,
      eliminarImpresora,
      migrar,
      devolver,
      cambiarFlujo,
      crearReclamo,
      notaReclamo,
      estadoReclamo,
      asignarReclamo,
      eliminarReclamo,
    }),
    [listo, tick, usuarios, impresoras, trabajos, reclamos, flujos, toasts, toast, enviar, liberar, cancelar, reanudar, reenviar, eliminarTrabajo, recargarPapel, destrabar, reconectar, pausar, guardarImpresora, eliminarImpresora, migrar, devolver, cambiarFlujo, crearReclamo, notaReclamo, estadoReclamo, asignarReclamo, eliminarReclamo],
  );

  return <StoreCtx.Provider value={valor}>{children}</StoreCtx.Provider>;
}
