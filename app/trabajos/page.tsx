"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ListChecks, Monitor, Search, Smartphone, SlidersHorizontal } from "lucide-react";
import { useStore } from "@/lib/store";
import { Badge, Paginacion, Skel, Vacio } from "@/components/ui";
import { DetalleTrabajo, EstadoBadge } from "@/components/Trabajo";
import type { Origen, Tipo, Trabajo } from "@/lib/types";
import { COLOR_FORMATO, ICONO_FORMATO, ICONO_TIPO, totalHojas } from "@/lib/vista";
import { cuandoFue, norm, pesos } from "@/lib/format";

type Grupo = "todos" | "curso" | "detenido" | "impreso" | "otros";
const GRUPOS: { id: Grupo; texto: string; estados?: Trabajo["estado"][] }[] = [
  { id: "todos", texto: "Todos" },
  { id: "curso", texto: "En camino", estados: ["convirtiendo", "en cola", "esperando código", "imprimiendo", "procesando"] },
  { id: "detenido", texto: "Detenidos", estados: ["detenido"] },
  { id: "impreso", texto: "Confirmados", estados: ["impreso", "entregado"] },
  { id: "otros", texto: "Sin salir", estados: ["fallido", "cancelado"] },
];
const POR_PAGINA = 12;

function Lista() {
  const { listo, trabajos, usuarios, impresoras, puntos, tick } = useStore();
  const params = useSearchParams();
  const router = useRouter();
  const inicial = (params.get("estado") === "detenido" ? "detenido" : "todos") as Grupo;
  const [grupo, setGrupo] = useState<Grupo>(inicial);
  const [q, setQ] = useState("");
  const [tipo, setTipo] = useState<Tipo | "">("");
  const [origen, setOrigen] = useState<Origen | "">("");
  const [punto, setPunto] = useState("");
  const [orden, setOrden] = useState<"recientes" | "antiguos" | "hojas" | "valor">("recientes");
  const [pagina, setPagina] = useState(1);
  const [abierto, setAbierto] = useState<string | null>(null);

  useEffect(() => {
    const id = params.get("t");
    if (listo && id && trabajos.some((x) => x.id === id)) setAbierto(id);
  }, [listo, params, trabajos]);

  const usu = (id: string) => usuarios.find((u) => u.id === id);
  const imp = (id: string) => impresoras.find((i) => i.id === id);

  const filtrados = useMemo(() => {
    const g = GRUPOS.find((x) => x.id === grupo)!;
    const t = norm(q);
    let l = trabajos.filter((x) => (!g.estados || g.estados.includes(x.estado)) && (!tipo || x.tipo === tipo) && (!origen || x.origen === origen) && (!punto || imp(x.impresoraId)?.puntoId === punto));
    if (t) {
      l = l.filter((x) => {
        const u = usu(x.usuarioId);
        return norm(`${x.codigo} ${x.archivo} ${u?.nombre ?? ""} ${u?.celular ?? ""} ${imp(x.impresoraId)?.nombre ?? ""} ${x.motivo ?? ""}`).includes(t);
      });
    }
    if (orden === "antiguos") l = [...l].sort((a, b) => a.creado.localeCompare(b.creado));
    else if (orden === "hojas") l = [...l].sort((a, b) => totalHojas(b) - totalHojas(a));
    else if (orden === "valor") l = [...l].sort((a, b) => b.costo - a.costo);
    return l;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trabajos, grupo, q, tipo, origen, punto, orden, usuarios, impresoras]);

  useEffect(() => setPagina(1), [grupo, q, tipo, origen, punto, orden]);
  const visibles = filtrados.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA);
  const cuenta = (g: Grupo) => {
    const e = GRUPOS.find((x) => x.id === g)!.estados;
    return e ? trabajos.filter((x) => e.includes(x.estado)).length : trabajos.length;
  };
  const abiertoT = trabajos.find((x) => x.id === abierto);
  const cerrar = () => {
    setAbierto(null);
    if (params.get("t")) router.replace("/trabajos", { scroll: false });
  };
  const limpiar = () => {
    setQ("");
    setTipo("");
    setOrigen("");
    setPunto("");
    setGrupo("todos");
  };

  return (
    <>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Registro de trabajos</span>
          <h1 className="tit-pagina">Cada trabajo, con quién lo dijo y a qué hora</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: "76ch" }}>
            Impresiones, copias y escaneos de todos los puntos en un mismo registro. Abra cualquiera para ver su recorrido: lo que dijo el celular, lo que hizo la nube y lo que confirmó la impresora.
          </p>
        </div>
      </div>

      <div className="card">
        <div className="toolbar" style={{ marginBottom: 12 }}>
          <div className="tabs" role="tablist">
            {GRUPOS.map((g) => (
              <button key={g.id} role="tab" aria-selected={grupo === g.id} className={`tab ${grupo === g.id ? "on" : ""} ${g.id === "detenido" ? "tab-rojo" : ""}`} onClick={() => setGrupo(g.id)}>
                {g.texto}
                <em>{listo ? cuenta(g.id) : ""}</em>
              </button>
            ))}
          </div>
        </div>
        <div className="toolbar" style={{ marginBottom: 16 }}>
          <div className="buscar">
            <Search size={17} />
            <input className="input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, archivo, usuario o celular" aria-label="Buscar trabajos" />
          </div>
          <select className="select" value={tipo} onChange={(e) => setTipo(e.target.value as Tipo | "")} aria-label="Tipo">
            <option value="">Impresión, copia y escaneo</option>
            <option value="Impresión">Solo impresiones</option>
            <option value="Copia">Solo copias</option>
            <option value="Escaneo">Solo escaneos</option>
          </select>
          <select className="select" value={origen} onChange={(e) => setOrigen(e.target.value as Origen | "")} aria-label="Desde dónde">
            <option value="">Desde cualquier lado</option>
            <option value="iOS">iPhone</option>
            <option value="Android">Android</option>
            <option value="Web">Navegador</option>
            <option value="Panel">Panel de la máquina</option>
          </select>
          <select className="select" value={punto} onChange={(e) => setPunto(e.target.value)} aria-label="Punto">
            <option value="">Todos los puntos</option>
            {puntos.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nombre}
              </option>
            ))}
          </select>
          <select className="select" value={orden} onChange={(e) => setOrden(e.target.value as typeof orden)} aria-label="Ordenar">
            <option value="recientes">Más recientes</option>
            <option value="antiguos">Más antiguos</option>
            <option value="hojas">Más hojas</option>
            <option value="valor">Mayor valor</option>
          </select>
        </div>

        <div className="tabla" role="table" aria-label="Trabajos">
          <div className="tabla-head" role="row">
            <span>Trabajo</span>
            <span>Usuario</span>
            <span>Impresora</span>
            <span>Hojas</span>
            <span>Estado</span>
          </div>
          {!listo && Array.from({ length: 8 }, (_, i) => <Skel key={i} alto={64} />)}
          {listo &&
            visibles.map((t, i) => {
              const u = usu(t.usuarioId);
              const im = imp(t.impresoraId);
              const Ic = t.tipo === "Impresión" ? ICONO_FORMATO[t.formato] : ICONO_TIPO[t.tipo];
              const total = totalHojas(t);
              return (
                <button key={t.id} className={`tabla-fila ${t.estado === "detenido" ? "fila-roja" : ""}`} role="row" style={{ animationDelay: `${i * 0.025}s` }} onClick={() => setAbierto(t.id)}>
                  <span className="tf-trabajo">
                    <span className="archivo-ic" style={{ color: t.tipo === "Impresión" ? COLOR_FORMATO[t.formato] : "var(--ink-2)", background: t.tipo === "Impresión" ? `${COLOR_FORMATO[t.formato]}14` : "var(--surface-2)" }}>
                      <Ic size={17} />
                    </span>
                    <span className="tf-txt">
                      <strong>{t.archivo}</strong>
                      <small>
                        <span className="mono">{t.codigo}</span> · {cuandoFue(t.creado, tick)} · {t.tipo}
                      </small>
                    </span>
                  </span>
                  <span className="tf-usuario">
                    {t.origen === "Web" ? <Monitor size={14} /> : t.origen === "Panel" ? <SlidersHorizontal size={14} /> : <Smartphone size={14} />}
                    <span>{u?.nombre ?? "Usuario eliminado"}</span>
                  </span>
                  <span className="tf-imp">
                    <span>{im?.nombre ?? "Eliminada"}</span>
                    <small>{puntos.find((p) => p.id === im?.puntoId)?.nombre}</small>
                  </span>
                  <span className="tf-hojas">
                    {t.tipo === "Escaneo" ? (
                      <span>{t.paginas} págs.</span>
                    ) : (
                      <>
                        <span>
                          {t.hojasImpresas}/{total}
                        </span>
                        <small>{pesos(t.costo)}</small>
                      </>
                    )}
                  </span>
                  <span className="tf-estado">
                    <EstadoBadge t={t} />
                    {t.plataforma === "nueva" && <Badge tono="acento">API nueva</Badge>}
                  </span>
                </button>
              );
            })}
          {listo && !filtrados.length && (
            <Vacio
              icono={<ListChecks size={24} />}
              titulo="Ningún trabajo con esos filtros"
              texto="Pruebe con otro estado o borre la búsqueda."
              accion={
                <button className="btn btn-secundario btn-sm" onClick={limpiar}>
                  Limpiar filtros
                </button>
              }
            />
          )}
        </div>
        <Paginacion pagina={pagina} total={filtrados.length} porPagina={POR_PAGINA} onCambio={setPagina} />
      </div>

      {abiertoT && <DetalleTrabajo t={abiertoT} onCerrar={cerrar} />}
    </>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<Skel alto={500} />}>
      <Lista />
    </Suspense>
  );
}
