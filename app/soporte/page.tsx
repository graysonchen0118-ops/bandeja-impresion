"use client";

import Link from "next/link";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CheckCircle2, Headset, Mail, MessageCircle, Phone, Plus, RotateCcw, Search, Send, Stethoscope, Trash2 } from "lucide-react";
import { ErrorValidacion, useStore } from "@/lib/store";
import { Aviso, Avatar, Badge, Boton, Campo, Confirmar, Drawer, Modal, Paginacion, Skel, Vacio } from "@/components/ui";
import { EstadoBadge, Linea } from "@/components/Trabajo";
import type { EstadoReclamo, Impresora, Reclamo, Trabajo } from "@/lib/types";
import { EQUIPO, persona } from "@/lib/mock/red";
import { capital, cuandoFue, hora, norm, tel } from "@/lib/format";
import { totalHojas } from "@/lib/vista";

const CANAL = { Llamada: Phone, WhatsApp: MessageCircle, Correo: Mail };
const TONO: Record<EstadoReclamo, "error" | "info" | "ok"> = { abierto: "error", "en revisión": "info", resuelto: "ok" };
const POR_PAGINA = 8;

/** dónde se perdió la hoja, dicho en una frase a partir del registro */
function diagnostico(t: Trabajo, imp?: Impresora) {
  const ult = t.eventos[t.eventos.length - 1];
  const total = totalHojas(t);
  switch (t.estado) {
    case "detenido":
      return `Se cortó en ${imp?.nombre ?? "la impresora"}: ${t.motivo?.replace(/\.$/, "").toLowerCase()}. La máquina había confirmado ${t.hojasImpresas} de ${total} hojas a las ${hora(ult.hora)}. Se puede retomar desde la hoja ${t.hojasImpresas + 1} o reenviar lo que falta a otra.`;
    case "fallido":
      return `No llegó a la impresora: ${t.motivo?.replace(/\.$/, "").toLowerCase()}. No se cobró nada.`;
    case "impreso":
      return `${imp?.nombre ?? "La impresora"} confirmó las ${total} hojas a las ${hora(ult.hora)}. Si no las encontró, vale la pena preguntar en el punto si alguien las recogió.`;
    case "esperando código":
      return `Está en la fila de ${imp?.nombre ?? "la impresora"} esperando que digite su código (${t.codigoLiberacion}) en la pantalla de la máquina.`;
    case "en cola":
    case "convirtiendo":
    case "imprimiendo":
      return `Sigue en camino: ${t.estado === "imprimiendo" ? `van ${t.hojasImpresas} de ${total} hojas` : "todavía no lo toma la impresora"}.`;
    case "cancelado":
      return `Se canceló a las ${hora(ult.hora)}. ${t.motivo ?? ""}`;
    case "entregado":
      return `El PDF se entregó a las ${hora(ult.hora)} ${t.destino === "Correo" ? "por correo" : "en la app del celular"}, con ${t.paginas} ${t.paginas === 1 ? "página" : "páginas"}.`;
    default:
      return "Todavía se está procesando.";
  }
}

function Lista() {
  const st = useStore();
  const { listo, reclamos, usuarios, trabajos, tick } = st;
  const params = useSearchParams();
  const router = useRouter();
  const [estado, setEstado] = useState<EstadoReclamo | "todos">("abierto");
  const [q, setQ] = useState("");
  const [canal, setCanal] = useState<Reclamo["canal"] | "">("");
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<string | null>(null);
  const [nuevo, setNuevo] = useState<string | null>(null);

  useEffect(() => {
    const t = params.get("nuevo");
    if (listo && t) setNuevo(t);
  }, [listo, params]);

  const usu = (id: string) => usuarios.find((u) => u.id === id);
  const filtrados = useMemo(() => {
    const t = norm(q);
    return reclamos.filter((r) => {
      if (estado !== "todos" && r.estado !== estado) return false;
      if (canal && r.canal !== canal) return false;
      if (!t) return true;
      const u = usu(r.usuarioId);
      const tr = trabajos.find((x) => x.id === r.trabajoId);
      return norm(`${r.numero} ${r.texto} ${u?.nombre ?? ""} ${u?.celular ?? ""} ${tr?.codigo ?? ""}`).includes(t);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reclamos, estado, canal, q, usuarios, trabajos]);
  useEffect(() => setPagina(1), [estado, canal, q]);
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const abiertoR = reclamos.find((r) => r.id === abierto);

  return (
    <>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Soporte</span>
          <h1 className="tit-pagina">Cuando alguien llama porque no le salió, la respuesta ya está en el registro</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: "76ch" }}>
            Cada reclamo trae el trabajo del que habla, con la hora de cada paso. Su equipo ve dónde se perdió la hoja en vez de adivinar con el usuario al teléfono.
          </p>
        </div>
        <Boton icono={<Plus size={17} />} onClick={() => setNuevo("")}>
          Nuevo reclamo
        </Boton>
      </div>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="tabs" role="tablist">
            {(["abierto", "en revisión", "resuelto", "todos"] as const).map((e) => (
              <button key={e} role="tab" aria-selected={estado === e} className={`tab ${estado === e ? "on" : ""}`} onClick={() => setEstado(e)}>
                {e === "todos" ? "Todos" : e === "abierto" ? "Abiertos" : e === "resuelto" ? "Resueltos" : "En revisión"}
                <em>{listo ? (e === "todos" ? reclamos.length : reclamos.filter((r) => r.estado === e).length) : ""}</em>
              </button>
            ))}
          </div>
          <div className="buscar">
            <Search size={17} />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Nombre, celular, número o código" aria-label="Buscar reclamos" />
          </div>
          <select className="select" value={canal} onChange={(e) => setCanal(e.target.value as Reclamo["canal"] | "")} aria-label="Canal">
            <option value="">Todos los canales</option>
            <option>Llamada</option>
            <option>WhatsApp</option>
            <option>Correo</option>
          </select>
        </div>

        <div className="reclamos">
          {!listo && Array.from({ length: 5 }, (_, i) => <Skel key={i} alto={92} />)}
          {listo &&
            visibles.map((r, i) => {
              const u = usu(r.usuarioId);
              const tr = trabajos.find((x) => x.id === r.trabajoId);
              const resp = persona(r.responsable);
              const C = CANAL[r.canal];
              return (
                <button key={r.id} className={`reclamo ${r.prioridad === "alta" && r.estado !== "resuelto" ? "alta" : ""}`} style={{ animationDelay: `${i * 0.03}s` }} onClick={() => setAbierto(r.id)}>
                  <span className="reclamo-quien">
                    {u?.foto ? <Avatar src={u.foto} alt={u.nombre} size={42} /> : <span className="canal-ic"><C size={18} /></span>}
                  </span>
                  <span className="reclamo-txt">
                    <span className="reclamo-top">
                      <strong>{u?.nombre ?? "Usuario"}</strong>
                      <Badge tono="neutro">
                        <C size={12} /> {r.canal}
                      </Badge>
                      {r.prioridad === "alta" && r.estado !== "resuelto" && <Badge tono="error">Urgente</Badge>}
                    </span>
                    <p>{r.texto}</p>
                    {tr && (
                      <span className="reclamo-trabajo">
                        <span className="mono">{tr.codigo}</span> {tr.archivo} <EstadoBadge t={tr} />
                      </span>
                    )}
                  </span>
                  <span className="reclamo-der">
                    <small>{cuandoFue(r.creado, tick)}</small>
                    <Badge tono={TONO[r.estado]}>{capital(r.estado)}</Badge>
                    {resp && <Avatar src={resp.foto} alt={resp.nombre} size={26} />}
                  </span>
                </button>
              );
            })}
          {listo && !filtrados.length && <Vacio icono={<Headset size={24} />} titulo="Nada por aquí" texto={estado === "abierto" ? "No hay reclamos abiertos. Buen día." : "Ningún reclamo con esos filtros."} />}
        </div>
        <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onCambio={setPagina} />
      </div>

      {abiertoR && <DetalleReclamo r={abiertoR} onCerrar={() => setAbierto(null)} />}
      {nuevo !== null && (
        <NuevoReclamo
          trabajoInicial={nuevo}
          onCerrar={() => {
            setNuevo(null);
            if (params.get("nuevo")) router.replace("/soporte", { scroll: false });
          }}
          onCreado={(id) => {
            setNuevo(null);
            setEstado("abierto");
            setAbierto(id);
            if (params.get("nuevo")) router.replace("/soporte", { scroll: false });
          }}
        />
      )}
    </>
  );
}

function DetalleReclamo({ r, onCerrar }: { r: Reclamo; onCerrar: () => void }) {
  const st = useStore();
  const { usuarios, trabajos, impresoras, tick } = st;
  const [texto, setTexto] = useState("");
  const [autor, setAutor] = useState(r.responsable ?? "marcela");
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [borrar, setBorrar] = useState(false);
  const u = usuarios.find((x) => x.id === r.usuarioId);
  const t = trabajos.find((x) => x.id === r.trabajoId);
  const imp = impresoras.find((x) => x.id === t?.impresoraId);
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
  const C = CANAL[r.canal];

  return (
    <Drawer
      abierto
      titulo={`Reclamo #${r.numero}`}
      sub={
        <>
          <Badge tono={TONO[r.estado]}>{capital(r.estado)}</Badge>
          <Badge tono="neutro">
            <C size={12} /> {r.canal}
          </Badge>
          {r.prioridad === "alta" && <Badge tono="error">Urgente</Badge>}
        </>
      }
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={() => setBorrar(true)}>
            <Trash2 size={16} /> <span>Eliminar</span>
          </button>
          {r.estado === "resuelto" ? (
            <Boton tono="secundario" icono={<RotateCcw size={16} />} cargando={cargando === "estado"} onClick={() => correr("estado", () => st.estadoReclamo(r.id, "abierto"), "Reclamo reabierto")}>
              Reabrir
            </Boton>
          ) : (
            <Boton icono={<CheckCircle2 size={16} />} cargando={cargando === "estado"} onClick={() => correr("estado", () => st.estadoReclamo(r.id, "resuelto", { texto, autor }).then(() => setTexto("")), "Reclamo resuelto")}>
              Resolver
            </Boton>
          )}
        </>
      }
    >
      <div className="reclamo-cita">
        {u?.foto && <Avatar src={u.foto} alt={u.nombre} size={40} />}
        <div>
          <strong>{u?.nombre}</strong>
          <span className="mono">
            {u ? tel(u.celular) : ""} · {cuandoFue(r.creado, tick)}
          </span>
          <p>“{r.texto}”</p>
        </div>
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}

      {t ? (
        <>
          <div className="diagnostico">
            <span className="diag-ic">
              <Stethoscope size={18} />
            </span>
            <div>
              <small>Dónde quedó la hoja</small>
              <p>{diagnostico(t, imp)}</p>
            </div>
          </div>
          <div>
            <div className="sec-tit" style={{ justifyContent: "space-between" }}>
              <span>
                {t.codigo} · {t.archivo}
              </span>
              <Link href={`/trabajos?t=${t.id}`} className="enlace">
                Abrir trabajo
              </Link>
            </div>
            <Linea t={t} compacta />
          </div>
        </>
      ) : (
        <Aviso tono="info">Este reclamo no menciona un trabajo. Si el usuario da el código o la hora, búsquelo en Trabajos.</Aviso>
      )}

      <div>
        <div className="sec-tit">Notas del equipo</div>
        <div className="notas">
          {r.notas.map((n, i) => {
            const p = persona(n.autor);
            return (
              <div key={i} className="nota">
                {p && <Avatar src={p.foto} alt={p.nombre} size={30} />}
                <div>
                  <strong>
                    {p?.nombre} <small>{cuandoFue(n.hora, tick)}</small>
                  </strong>
                  <p>{n.texto}</p>
                </div>
              </div>
            );
          })}
          {!r.notas.length && <p className="muted">Todavía nadie escribió nada.</p>}
        </div>
      </div>

      <div className="form-col">
        <textarea className="textarea" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={r.estado === "resuelto" ? "Agregar una nota" : "Qué se le dijo o qué se hizo. Para resolverlo hace falta esta nota."} aria-label="Nota" />
        <div className="toolbar">
          <select className="select" value={autor} onChange={(e) => setAutor(e.target.value)} aria-label="Quién escribe">
            {EQUIPO.map((p) => (
              <option key={p.id} value={p.id}>
                Como {p.nombre}
              </option>
            ))}
          </select>
          <Boton tono="secundario" icono={<Send size={16} />} cargando={cargando === "nota"} onClick={() => correr("nota", () => st.notaReclamo(r.id, texto, autor).then(() => setTexto("")), "Nota agregada")}>
            Agregar nota
          </Boton>
          <select className="select" value={r.responsable ?? ""} onChange={(e) => correr("asignar", () => st.asignarReclamo(r.id, e.target.value || undefined), "Responsable actualizado")} aria-label="Responsable">
            <option value="">Sin responsable</option>
            {EQUIPO.map((p) => (
              <option key={p.id} value={p.id}>
                Lo lleva {p.nombre}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Confirmar
        abierto={borrar}
        titulo={`Eliminar el reclamo #${r.numero}`}
        texto="Se borra el reclamo y sus notas. El trabajo del que habla se queda en el registro."
        accion="Eliminar"
        cargando={cargando === "borrar"}
        onCerrar={() => setBorrar(false)}
        onConfirmar={() =>
          correr("borrar", async () => {
            await st.eliminarReclamo(r.id);
            setBorrar(false);
            onCerrar();
          }, "Reclamo eliminado")
        }
      />
    </Drawer>
  );
}

function NuevoReclamo({ trabajoInicial, onCerrar, onCreado }: { trabajoInicial: string; onCerrar: () => void; onCreado: (id: string) => void }) {
  const st = useStore();
  const { usuarios, trabajos, tick } = st;
  const tIni = trabajos.find((x) => x.id === trabajoInicial);
  const [usuarioId, setUsuarioId] = useState(tIni?.usuarioId ?? "");
  const [buscar, setBuscar] = useState(tIni ? usuarios.find((u) => u.id === tIni.usuarioId)?.nombre ?? "" : "");
  const [canal, setCanal] = useState<Reclamo["canal"]>("Llamada");
  const [texto, setTexto] = useState("");
  const [trabajoId, setTrabajoId] = useState(tIni?.id ?? "");
  const [prioridad, setPrioridad] = useState<Reclamo["prioridad"]>("normal");
  const [error, setError] = useState("");
  const [cargando, setCargando] = useState(false);

  const sugerencias = useMemo(() => {
    const t = norm(buscar);
    if (!t || usuarios.find((u) => u.id === usuarioId)?.nombre === buscar) return [];
    return usuarios.filter((u) => norm(`${u.nombre} ${u.celular}`).includes(t)).slice(0, 5);
  }, [buscar, usuarios, usuarioId]);
  const suyos = trabajos.filter((t) => t.usuarioId === usuarioId).slice(0, 8);

  const guardar = async () => {
    setCargando(true);
    setError("");
    try {
      const id = await st.crearReclamo({ usuarioId, canal, texto, trabajoId: trabajoId || undefined, prioridad });
      st.toast("Reclamo creado");
      onCreado(id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No se pudo crear.");
    } finally {
      setCargando(false);
    }
  };

  return (
    <Modal
      abierto
      titulo="Nuevo reclamo"
      onCerrar={onCerrar}
      pie={
        <>
          <button className="btn btn-ghost" onClick={onCerrar}>Cancelar</button>
          <Boton cargando={cargando} onClick={guardar} icono={<Headset size={16} />}>
            Crear reclamo
          </Boton>
        </>
      }
    >
      <div className="form-col">
        {error && <Aviso tono="error">{error}</Aviso>}
        <Campo etiqueta="Usuario" ayuda="Busque por nombre o por celular">
          <div className="autocompletar">
            <input
              className="input"
              value={buscar}
              onChange={(e) => {
                setBuscar(e.target.value);
                setUsuarioId("");
                setTrabajoId("");
              }}
              placeholder="Nombre o 300 000 0000"
            />
            {sugerencias.length > 0 && (
              <div className="sugerencias">
                {sugerencias.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => {
                      setUsuarioId(u.id);
                      setBuscar(u.nombre);
                      const ult = trabajos.find((t) => t.usuarioId === u.id);
                      if (ult) setTrabajoId(ult.id);
                    }}
                  >
                    <strong>{u.nombre}</strong>
                    <span className="mono">{tel(u.celular)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </Campo>
        <Campo etiqueta="Trabajo del que habla" ayuda={usuarioId ? "Se sugiere el último que mandó" : "Primero elija el usuario"}>
          <select className="select" style={{ width: "100%" }} value={trabajoId} onChange={(e) => setTrabajoId(e.target.value)} disabled={!usuarioId}>
            <option value="">Ninguno en particular</option>
            {suyos.map((t) => (
              <option key={t.id} value={t.id}>
                {t.codigo} · {t.archivo} · {cuandoFue(t.creado, tick)}
              </option>
            ))}
          </select>
        </Campo>
        <div className="form-grid">
          <Campo etiqueta="Por dónde llegó">
            <select className="select" style={{ width: "100%" }} value={canal} onChange={(e) => setCanal(e.target.value as Reclamo["canal"])}>
              <option>Llamada</option>
              <option>WhatsApp</option>
              <option>Correo</option>
            </select>
          </Campo>
          <Campo etiqueta="Prioridad">
            <select className="select" style={{ width: "100%" }} value={prioridad} onChange={(e) => setPrioridad(e.target.value as Reclamo["prioridad"])}>
              <option value="normal">Normal</option>
              <option value="alta">Urgente</option>
            </select>
          </Campo>
        </div>
        <Campo etiqueta="Qué le pasó">
          <textarea className="textarea" value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="Con las palabras del usuario" />
        </Campo>
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
