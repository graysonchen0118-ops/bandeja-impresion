"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeftRight, Clock, MapPin, Pause, Pencil, Play, Plus, Plug, Printer, RefreshCw, Search, Trash2, Wrench } from "lucide-react";
import { ErrorValidacion, useStore } from "@/lib/store";
import { Fila } from "@/components/three/Scenes";
import { Aviso, Badge, Barra, Boton, Campo, Confirmar, Drawer, Modal, Skel, Tilt, Vacio } from "@/components/ui";
import { EstadoBadge } from "@/components/Trabajo";
import type { EstadoImpresora, Impresora, Tamano } from "@/lib/types";
import { ETIQUETA_IMPRESORA, TONO_IMPRESORA, papelPct } from "@/lib/vista";
import { haceCuanto, hora, uid } from "@/lib/format";
import { FOTOS, foto } from "@/lib/photos";
import { iso } from "@/lib/reloj";

const ESTADOS: EstadoImpresora[] = ["lista", "imprimiendo", "sin papel", "atasco", "tóner bajo", "pausada", "sin señal"];

function Latido({ i, tick }: { i: Impresora; tick: number }) {
  if (i.estado === "sin señal")
    return (
      <span className="latido-linea gris">
        <span className="punto-gris" /> Sin aviso desde las {hora(i.ultimoLatido)}, {haceCuanto(i.ultimoLatido, tick)}
      </span>
    );
  return (
    <span className="latido-linea">
      <span className="punto-vivo" /> Último aviso {haceCuanto(i.ultimoLatido, Math.max(tick, Date.now() - 1))}
    </span>
  );
}

function Lista() {
  const st = useStore();
  const { listo, impresoras, puntos, trabajos, tick } = st;
  const params = useSearchParams();
  const router = useRouter();
  const [punto, setPunto] = useState("");
  const [estado, setEstado] = useState<EstadoImpresora | "">("");
  const [q, setQ] = useState("");
  const [abierta, setAbierta] = useState<string | null>(null);
  const [editando, setEditando] = useState<{ imp: Impresora; nueva: boolean } | null>(null);

  useEffect(() => {
    const id = params.get("i");
    const i = impresoras.find((x) => x.id === id);
    if (listo && i) {
      setAbierta(i.id);
      setPunto(i.puntoId);
    }
  }, [listo, params, impresoras]);

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return impresoras.filter((i) => (!punto || i.puntoId === punto) && (!estado || i.estado === estado) && (!t || `${i.nombre} ${i.modelo}`.toLowerCase().includes(t)));
  }, [impresoras, punto, estado, q]);

  const p = puntos.find((x) => x.id === punto);
  const enFila = (punto ? impresoras.filter((i) => i.puntoId === punto) : impresoras.filter((i) => i.estado !== "lista" && i.estado !== "imprimiendo")).slice(0, 5);
  const abiertaI = impresoras.find((i) => i.id === abierta);
  const nuevas = impresoras.filter((i) => i.plataforma === "nueva").length;

  const cerrar = () => {
    setAbierta(null);
    if (params.get("i")) router.replace("/impresoras", { scroll: false });
  };

  return (
    <>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Impresoras</span>
          <h1 className="tit-pagina">Cada máquina avisa cada minuto que sigue encendida</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: "76ch" }}>
            La que deja de avisar se ve en gris aquí y en la app antes de que alguien le mande un trabajo. Así su equipo sabe qué local tiene una impresora caída antes de la llamada.
          </p>
        </div>
        <Boton
          icono={<Plus size={17} />}
          onClick={() =>
            setEditando({
              nueva: true,
              imp: { id: uid("i"), nombre: "", modelo: "", puntoId: punto || puntos[0].id, color: false, escaner: true, estado: "lista", ultimoLatido: iso(), hojas: 500, capacidad: 500, toner: 100, tamano: "Carta", plataforma: "nueva", foto: foto(FOTOS.impresoras[0], 640, 440), paginasHoy: 0 },
            })
          }
        >
          Nueva impresora
        </Boton>
      </div>

      <div className="puntos" role="tablist" aria-label="Puntos">
        <button role="tab" aria-selected={!punto} className={`punto-pill ${!punto ? "on" : ""}`} onClick={() => setPunto("")}>
          Todos los puntos <em>{impresoras.length}</em>
        </button>
        {puntos.map((x) => {
          const n = impresoras.filter((i) => i.puntoId === x.id);
          const mal = n.some((i) => ["sin señal", "sin papel", "atasco"].includes(i.estado));
          return (
            <button key={x.id} role="tab" aria-selected={punto === x.id} className={`punto-pill ${punto === x.id ? "on" : ""}`} onClick={() => setPunto(x.id)}>
              {mal && <i className="pill-alerta" />}
              {x.nombre} <em>{n.length}</em>
            </button>
          );
        })}
      </div>

      <section className="grid g-fila">
        <div className="card fila-card">
          <div className="card-head">
            <div>
              <h2>{p ? p.nombre : "Las que avisan algo"}</h2>
              <p>{p ? `${p.direccion}, ${p.ciudad}` : "Sin señal, sin papel, atascadas, pausadas o con poco tóner"}</p>
            </div>
            <div className="leyenda">
              <span><i style={{ background: "#2f5bea" }} /> Conector nuevo</span>
              <span><i style={{ background: "#d9772b" }} /> Conector actual</span>
            </div>
          </div>
          {listo && enFila.length ? <Fila puestos={enFila.map((i) => ({ id: i.id, nombre: i.nombre, estado: i.estado, color: i.color, nueva: i.plataforma === "nueva", vaciando: i.vaciando }))} elegida={abierta ?? undefined} /> : <Skel alto={250} />}
        </div>
        {p ? (
          <Tilt className="card punto-card">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={p.foto} alt={p.nombre} width={720} height={420} className="punto-foto" />
            <div className="punto-info">
              <Badge tono={p.tipo === "Empresa" ? "info" : "apoyo"}>{p.tipo}</Badge>
              <strong>{p.nombre}</strong>
              <span>
                <MapPin size={14} /> {p.direccion}, {p.ciudad}
              </span>
              <span>
                <Clock size={14} /> {p.horario}
              </span>
              <span>
                <Printer size={14} /> {p.liberacion === "código" ? "El usuario libera su trabajo con un código en la máquina" : "Los trabajos salen apenas llegan"}
              </span>
            </div>
          </Tilt>
        ) : (
          <div className="card resumen-red">
            <div className="rr">
              <strong>{listo ? impresoras.filter((i) => i.estado !== "sin señal").length : "..."}</strong>
              <span>con señal</span>
            </div>
            <div className="rr">
              <strong>{listo ? impresoras.filter((i) => i.estado === "sin señal").length : "..."}</strong>
              <span>sin señal</span>
            </div>
            <div className="rr">
              <strong>{listo ? nuevas : "..."}</strong>
              <span>con conector nuevo</span>
            </div>
            <div className="rr">
              <strong>{listo ? impresoras.reduce((a, i) => a + i.paginasHoy, 0).toLocaleString("es-CO") : "..."}</strong>
              <span>hojas hoy</span>
            </div>
          </div>
        )}
      </section>

      <div className="toolbar">
        <div className="buscar">
          <Search size={17} />
          <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre o modelo" aria-label="Buscar impresoras" />
        </div>
        <select className="select" value={estado} onChange={(e) => setEstado(e.target.value as EstadoImpresora | "")} aria-label="Estado">
          <option value="">Cualquier estado</option>
          {ESTADOS.map((e) => (
            <option key={e} value={e}>
              {ETIQUETA_IMPRESORA[e]}
            </option>
          ))}
        </select>
      </div>

      <section className="imp-grid">
        {!listo && Array.from({ length: 6 }, (_, i) => <Skel key={i} alto={330} />)}
        {listo &&
          filtradas.map((i, k) => {
            const pt = puntos.find((x) => x.id === i.puntoId);
            return (
              <Tilt key={i.id} className={`imp-card ${i.estado === "sin señal" ? "sin-senal" : ""}`} onClick={() => setAbierta(i.id)} style={{ animationDelay: `${k * 0.04}s` }}>
                <div className="imp-foto">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={i.foto} alt={`${i.modelo} en ${pt?.nombre}`} width={640} height={440} loading="lazy" />
                  <span className="imp-badges">
                    <Badge tono={TONO_IMPRESORA[i.estado]}>{ETIQUETA_IMPRESORA[i.estado]}</Badge>
                    {i.vaciando ? <Badge tono="aviso">Cambiando, faltan {i.vaciando}</Badge> : <Badge tono={i.plataforma === "nueva" ? "acento" : "apoyo"}>{i.plataforma === "nueva" ? "Conector nuevo" : "Conector actual"}</Badge>}
                  </span>
                </div>
                <div className="imp-cuerpo">
                  <strong>{i.nombre}</strong>
                  <span className="muted">
                    {pt?.nombre} · {i.modelo}
                  </span>
                  <Latido i={i} tick={tick} />
                  <div className="niveles">
                    <span>
                      <small>Papel</small>
                      <Barra valor={papelPct(i)} />
                      <b>{i.hojas}</b>
                    </span>
                    <span>
                      <small>Tóner</small>
                      <Barra valor={i.toner} />
                      <b>{i.toner}%</b>
                    </span>
                  </div>
                  <div className="imp-tags">
                    <span>{i.color ? "Color" : "Blanco y negro"}</span>
                    {i.escaner && <span>Escáner</span>}
                    <span>{i.tamano}</span>
                    <span>{i.paginasHoy} hojas hoy</span>
                  </div>
                </div>
              </Tilt>
            );
          })}
        {listo && !filtradas.length && (
          <Vacio
            icono={<Printer size={24} />}
            titulo="Ninguna impresora con esos filtros"
            texto="Cambie de punto o de estado."
            accion={
              <button className="btn btn-secundario btn-sm" onClick={() => { setEstado(""); setQ(""); setPunto(""); }}>
                Ver todas
              </button>
            }
          />
        )}
      </section>

      {abiertaI && <DetalleImpresora i={abiertaI} onCerrar={cerrar} onEditar={() => setEditando({ imp: abiertaI, nueva: false })} />}
      {editando && <FormImpresora inicial={editando.imp} nueva={editando.nueva} onCerrar={() => setEditando(null)} />}
    </>
  );
}

function DetalleImpresora({ i, onCerrar, onEditar }: { i: Impresora; onCerrar: () => void; onEditar: () => void }) {
  const st = useStore();
  const { puntos, trabajos, tick } = st;
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [borrar, setBorrar] = useState(false);
  const pt = puntos.find((x) => x.id === i.puntoId);
  const suyos = trabajos.filter((t) => t.impresoraId === i.id).slice(0, 6);
  const correr = async (clave: string, f: () => Promise<void>, ok?: string) => {
    setCargando(clave);
    setError("");
    try {
      await f();
      if (ok) st.toast(ok);
    } catch (e) {
      if (e instanceof ErrorValidacion) setError(e.message);
      else st.toast("No se pudo guardar.", "error");
    } finally {
      setCargando(null);
    }
  };

  return (
    <Drawer
      abierto
      titulo={i.nombre}
      sub={
        <>
          <Badge tono={TONO_IMPRESORA[i.estado]}>{ETIQUETA_IMPRESORA[i.estado]}</Badge>
          <Badge tono="neutro">{pt?.nombre}</Badge>
        </>
      }
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={() => setBorrar(true)}>
            <Trash2 size={16} /> <span>Eliminar</span>
          </button>
          <Boton tono="secundario" icono={<Pencil size={16} />} onClick={onEditar}>
            Editar
          </Boton>
        </>
      }
    >
      {error && <Aviso tono="error">{error}</Aviso>}
      <div className="datos">
        <div className="dato">
          <small>Modelo</small>
          <strong>{i.modelo}</strong>
          <span>{i.color ? "Color" : "Blanco y negro"}{i.escaner ? ", con escáner" : ""}</span>
        </div>
        <div className="dato">
          <small>Aviso de vida</small>
          <strong>{i.estado === "sin señal" ? `Sin aviso desde ${hora(i.ultimoLatido)}` : haceCuanto(i.ultimoLatido, Math.max(tick, Date.now() - 1))}</strong>
          <span>Cada minuto</span>
        </div>
        <div className="dato">
          <small>Papel</small>
          <strong>
            {i.hojas} de {i.capacidad} hojas
          </strong>
          <Barra valor={papelPct(i)} />
        </div>
        <div className="dato">
          <small>Conector</small>
          <strong>{i.vaciando ? `Cambiando, faltan ${i.vaciando}` : i.plataforma === "nueva" ? "API nueva" : "Plataforma actual"}</strong>
          <span>Recibe de una sola plataforma</span>
        </div>
      </div>

      <div className="acciones">
        {i.estado === "sin señal" && (
          <Boton tono="apoyo" icono={<Plug size={16} />} cargando={cargando === "reconectar"} onClick={() => correr("reconectar", () => st.reconectar(i.id), "Volvió a avisar. Ya aparece en la app")}>
            El técnico la reconectó
          </Boton>
        )}
        {(i.estado === "sin papel" || i.hojas < i.capacidad * 0.2) && i.estado !== "sin señal" && (
          <Boton tono="apoyo" icono={<RefreshCw size={16} />} cargando={cargando === "papel"} onClick={() => correr("papel", () => st.recargarPapel(i.id), "Papel recargado")}>
            Recargar papel
          </Boton>
        )}
        {i.estado === "atasco" && (
          <Boton tono="apoyo" icono={<Wrench size={16} />} cargando={cargando === "atasco"} onClick={() => correr("atasco", () => st.destrabar(i.id), "Atasco despejado, siguió lo que esperaba")}>
            Despejar atasco
          </Boton>
        )}
        {i.estado !== "sin señal" && (
          <Boton tono="secundario" icono={i.estado === "pausada" ? <Play size={16} /> : <Pause size={16} />} cargando={cargando === "pausa"} onClick={() => correr("pausa", () => st.pausar(i.id, i.estado !== "pausada"), i.estado === "pausada" ? "Recibe trabajos otra vez" : "Pausada. No aparece en la app")}>
            {i.estado === "pausada" ? "Volver a recibir" : "Pausar"}
          </Boton>
        )}
        {i.plataforma === "actual" ? (
          <Boton tono="secundario" icono={<ArrowLeftRight size={16} />} cargando={cargando === "migrar" || !!i.vaciando} onClick={() => correr("migrar", () => st.migrar(i.id), `${i.nombre} ya recibe de la API nueva`)}>
            {i.vaciando ? `Terminando ${i.vaciando} de la actual` : "Pasar al conector nuevo"}
          </Boton>
        ) : (
          <Boton tono="ghost" icono={<ArrowLeftRight size={16} />} cargando={cargando === "devolver"} onClick={() => correr("devolver", () => st.devolver(i.id), "Volvió a la plataforma actual")}>
            Devolver a la actual
          </Boton>
        )}
      </div>
      {i.plataforma === "actual" && !i.vaciando && <p className="muted" style={{ fontSize: 13.5 }}>Al cambiarla, primero termina lo que la plataforma actual ya le mandó. Mientras tanto la API nueva no le envía nada, así ningún trabajo sale dos veces ni se queda sin salir.</p>}

      <div>
        <div className="sec-tit">Últimos trabajos</div>
        <div className="filas">
          {suyos.map((t) => (
            <Link key={t.id} href={`/trabajos?t=${t.id}`} className="fila-btn compacta">
              <span className="fila-txt">
                <strong>{t.archivo}</strong>
                <span className="mono">{t.codigo} · {hora(t.creado)}</span>
              </span>
              <span className="fila-der">
                <EstadoBadge t={t} />
              </span>
            </Link>
          ))}
          {!suyos.length && <p className="muted">Todavía no ha recibido trabajos.</p>}
        </div>
      </div>

      <Confirmar
        abierto={borrar}
        titulo={`Eliminar ${i.nombre}`}
        texto="Deja de aparecer en la app y en esta lista. Los trabajos que ya imprimió se quedan en el registro."
        accion="Eliminar"
        error={error}
        cargando={cargando === "borrar"}
        onCerrar={() => {
          setBorrar(false);
          setError("");
        }}
        onConfirmar={() =>
          correr("borrar", async () => {
            await st.eliminarImpresora(i.id);
            setBorrar(false);
            onCerrar();
          }, `${i.nombre} eliminada`)
        }
      />
    </Drawer>
  );
}

function FormImpresora({ inicial, nueva, onCerrar }: { inicial: Impresora; nueva: boolean; onCerrar: () => void }) {
  const st = useStore();
  const [f, setF] = useState<Impresora>(inicial);
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);
  const set = <K extends keyof Impresora>(k: K, v: Impresora[K]) => setF((x) => ({ ...x, [k]: v }));
  const guardar = async () => {
    setCargando(true);
    setError("");
    try {
      await st.guardarImpresora(f, nueva);
      st.toast(nueva ? `${f.nombre} agregada. Ya avisa que está encendida` : "Cambios guardados");
      onCerrar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo guardar.");
    } finally {
      setCargando(false);
    }
  };
  return (
    <Modal
      abierto
      titulo={nueva ? "Nueva impresora" : `Editar ${inicial.nombre}`}
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
          <Boton cargando={cargando} onClick={guardar} icono={<Printer size={16} />}>
            {nueva ? "Agregar" : "Guardar"}
          </Boton>
        </>
      }
    >
      <div className="form-col">
        {error && <Aviso tono="error">{error}</Aviso>}
        <div className="form-grid">
          <Campo etiqueta="Nombre en el local" ayuda="Como la llama la gente: Mostrador, Piso 2">
            <input className="input" value={f.nombre} onChange={(e) => set("nombre", e.target.value)} placeholder="Mostrador" />
          </Campo>
          <Campo etiqueta="Modelo">
            <input className="input" value={f.modelo} onChange={(e) => set("modelo", e.target.value)} placeholder="Ricoh IM C3000" />
          </Campo>
        </div>
        <Campo etiqueta="Punto">
          <select className="select" style={{ width: "100%" }} value={f.puntoId} onChange={(e) => set("puntoId", e.target.value)}>
            {st.puntos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}, {p.ciudad}
              </option>
            ))}
          </select>
        </Campo>
        <div className="form-grid">
          <Campo etiqueta="Tamaño de papel">
            <select className="select" style={{ width: "100%" }} value={f.tamano} onChange={(e) => set("tamano", e.target.value as Tamano)}>
              <option>Carta</option>
              <option>Oficio</option>
              <option>A4</option>
            </select>
          </Campo>
          <Campo etiqueta="Capacidad de papel" ayuda="Hojas entre todas las bandejas">
            <input className="input" type="number" value={f.capacidad} onChange={(e) => set("capacidad", Number(e.target.value))} />
          </Campo>
        </div>
        <div className="checks">
          <label className="opcion">
            <span>Imprime a color</span>
            <input type="checkbox" className="switch" checked={f.color} onChange={(e) => set("color", e.target.checked)} />
          </label>
          <label className="opcion">
            <span>Tiene escáner</span>
            <input type="checkbox" className="switch" checked={f.escaner} onChange={(e) => set("escaner", e.target.checked)} />
          </label>
        </div>
      </div>
    </Modal>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Skel alto={500} />}>
      <Lista />
    </Suspense>
  );
}
