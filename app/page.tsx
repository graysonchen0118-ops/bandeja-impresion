"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Cloud, Hourglass, Printer, Send, Smartphone, Wifi } from "lucide-react";
import { useStore } from "@/lib/store";
import { Planta, Horas } from "@/components/three/Scenes";
import { Badge, Skel, Tilt, Vacio } from "@/components/ui";
import { DetalleTrabajo, EstadoBadge } from "@/components/Trabajo";
import { ETIQUETA_IMPRESORA, ICONO_TIPO, TONO_IMPRESORA, enProblema } from "@/lib/vista";
import { haceCuanto, hora, horaBogota, horaSeg } from "@/lib/format";
import type { Hora } from "@/components/three/Horas";

export default function Inicio() {
  const { listo, trabajos, impresoras, usuarios, puntos, tick } = useStore();
  const [abierto, setAbierto] = useState<string | null>(null);

  const hoyDesde = tick - (horaBogota(tick) - 0) * 3600e3;
  const deHoy = useMemo(() => trabajos.filter((t) => new Date(t.creado).getTime() >= hoyDesde), [trabajos, hoyDesde]);
  const terminados = deHoy.filter((t) => ["impreso", "entregado", "detenido", "fallido"].includes(t.estado));
  const confirmados = deHoy.filter((t) => t.estado === "impreso" || t.estado === "entregado");
  const enCamino = trabajos.filter((t) => ["convirtiendo", "en cola", "esperando código", "imprimiendo", "procesando"].includes(t.estado));
  const detenidos = trabajos.filter((t) => t.estado === "detenido");
  const conSenal = impresoras.filter((i) => i.estado !== "sin señal");
  const atencion = trabajos.filter((t) => enProblema(t) && tick - new Date(t.creado).getTime() < 6 * 3600e3).slice(0, 4);
  const avisos = impresoras.filter((i) => i.estado !== "lista" && i.estado !== "imprimiendo");
  const hojasHoy = impresoras.reduce((a, i) => a + i.paginasHoy, 0);

  // el día de los locales, de 6 a. m. a 7 p. m.
  const horas: (Hora & { hora: number })[] = useMemo(() => {
    const lista = Array.from({ length: 14 }, (_, i) => {
      const h = 6 + i;
      return { hora: h, etiqueta: `${h % 12 === 0 ? 12 : h % 12}${h < 12 ? "a" : "p"}`, ok: 0, mal: 0, curso: 0 };
    });
    trabajos.forEach((t) => {
      const ms = new Date(t.creado).getTime();
      if (ms < hoyDesde) return;
      const b = lista.find((x) => x.hora === Math.floor(horaBogota(ms)));
      if (!b) return;
      if (t.estado === "impreso" || t.estado === "entregado") b.ok++;
      else if (t.estado === "detenido" || t.estado === "fallido") b.mal++;
      else if (t.estado !== "cancelado") b.curso++;
    });
    return lista;
  }, [trabajos, hoyDesde]);

  const dichos = useMemo(
    () =>
      trabajos
        .flatMap((t) => t.eventos.filter((e) => e.fuente === "impresora" && (e.etapa === "impreso" || e.etapa === "detenido" || e.etapa === "tomado")).map((e) => ({ e, t })))
        .sort((a, b) => b.e.hora.localeCompare(a.e.hora))
        .slice(0, 8),
    [trabajos],
  );

  const imp = (id: string) => impresoras.find((i) => i.id === id);
  const usu = (id: string) => usuarios.find((u) => u.id === id);
  const pto = (id?: string) => puntos.find((p) => p.id === id);
  const abiertoT = trabajos.find((t) => t.id === abierto);

  return (
    <>
      <section className="hero">
        <div className="hero-escena">
          <Planta />
        </div>
        <div className="hero-txt">
          <span className="eyebrow">Hoy en la red de impresión</span>
          <h1>Cada hoja, del celular a la bandeja, con su recorrido</h1>
          <p>
            Un solo registro por trabajo en la nube. El celular dice <strong>impreso</strong> cuando la impresora confirma la última hoja, nunca antes, y la que deja de avisar que está encendida se apaga también en la app.
          </p>
          <div className="hero-cta">
            <Link href="/imprimir" className="btn btn-primario">
              <Send size={17} /> <span>Enviar un trabajo</span>
            </Link>
            <Link href="/trabajos?estado=detenido" className="btn btn-secundario">
              <AlertTriangle size={17} /> <span>Ver lo detenido</span>
            </Link>
          </div>
          <ol className="hero-pasos">
            <li>
              <Smartphone size={15} /> El celular o el navegador envía
            </li>
            <li>
              <Cloud size={15} /> La nube guarda un registro
            </li>
            <li>
              <Printer size={15} /> La impresora confirma
            </li>
          </ol>
        </div>
      </section>

      <section className="kpis">
        {!listo &&
          Array.from({ length: 5 }, (_, i) => <Skel key={i} alto={118} />)}
        {listo && (
          <>
            <Tilt className="kpi">
              <span className="kpi-ic" style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}>
                <Printer size={19} />
              </span>
              <small>Trabajos hoy</small>
              <strong>{deHoy.length}</strong>
              <span className="kpi-sub">{hojasHoy.toLocaleString("es-CO")} hojas confirmadas por las máquinas</span>
            </Tilt>
            <Tilt className="kpi">
              <span className="kpi-ic" style={{ background: "var(--ok-soft)", color: "var(--ok)" }}>
                <CheckCircle2 size={19} />
              </span>
              <small>Confirmados por la impresora</small>
              <strong>{terminados.length ? Math.round((confirmados.length / terminados.length) * 100) : 0}%</strong>
              <span className="kpi-sub">{confirmados.length} de {terminados.length} que ya salieron de la fila</span>
            </Tilt>
            <Tilt className="kpi">
              <span className="kpi-ic" style={{ background: "var(--info-soft)", color: "var(--info)" }}>
                <Hourglass size={19} />
              </span>
              <small>En camino ahora</small>
              <strong>{enCamino.length}</strong>
              <span className="kpi-sub">{enCamino.filter((t) => t.estado === "esperando código").length} esperan el código en la máquina</span>
            </Tilt>
            <Tilt className="kpi kpi-alerta">
              <span className="kpi-ic" style={{ background: "var(--err-soft)", color: "var(--err)" }}>
                <AlertTriangle size={19} />
              </span>
              <small>Detenidos en una impresora</small>
              <strong>{detenidos.length}</strong>
              <span className="kpi-sub">El usuario lo ve en la app, con la razón</span>
            </Tilt>
            <Tilt className="kpi">
              <span className="kpi-ic" style={{ background: "var(--support-soft)", color: "var(--support-2)" }}>
                <Wifi size={19} />
              </span>
              <small>Impresoras con señal</small>
              <strong>
                {conSenal.length}
                <em> de {impresoras.length}</em>
              </strong>
              <span className="kpi-sub">Cada una avisa cada minuto</span>
            </Tilt>
          </>
        )}
      </section>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Trabajos por hora</h2>
              <p>Hoy, de 6 a. m. a 7 p. m., hora de Bogotá</p>
            </div>
            <div className="leyenda">
              <span><i style={{ background: "#2f5bea" }} /> Confirmados</span>
              <span><i style={{ background: "#d64545" }} /> Detenidos o sin salir</span>
              <span><i style={{ background: "#8fd3e8" }} /> En camino</span>
            </div>
          </div>
          {listo ? <Horas datos={horas} /> : <Skel alto={270} />}
          <div className="horas-et">
            {horas.map((h) => (
              <span key={h.hora} title={`${h.ok} confirmados, ${h.mal} con problema, ${h.curso} en camino`}>
                {h.etiqueta}
              </span>
            ))}
          </div>
        </div>

      <section className="grid g-2">
        <div className="card">
          <div className="card-head">
            <div>
              <h2>Necesitan atención</h2>
              <p>Trabajos que una impresora detuvo o que no se pudieron preparar</p>
            </div>
            <Link href="/trabajos?estado=detenido" className="enlace">
              Ver todos <ArrowRight size={15} />
            </Link>
          </div>
          <div className="filas">
            {!listo && Array.from({ length: 4 }, (_, i) => <Skel key={i} alto={62} />)}
            {listo &&
              atencion.map((t, i) => {
                const Ic = ICONO_TIPO[t.tipo];
                const im = imp(t.impresoraId);
                return (
                  <button key={t.id} className="fila-btn" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => setAbierto(t.id)}>
                    <span className="fila-ic err">
                      <Ic size={17} />
                    </span>
                    <span className="fila-txt">
                      <strong>{t.archivo}</strong>
                      <span>
                        {usu(t.usuarioId)?.nombre} · {im?.nombre}, {pto(im?.puntoId)?.nombre}
                      </span>
                      <span className="fila-motivo">{t.motivo}</span>
                    </span>
                    <span className="fila-der">
                      <EstadoBadge t={t} />
                      <small>{hora(t.creado)}</small>
                    </span>
                  </button>
                );
              })}
            {listo && !atencion.length && <Vacio icono={<CheckCircle2 size={22} />} titulo="Nada detenido" texto="Todo lo de las últimas horas salió o va en camino." />}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Impresoras que avisan algo</h2>
              <p>Lo que cada máquina reporta en su último aviso</p>
            </div>
            <Link href="/impresoras" className="enlace">
              Impresoras <ArrowRight size={15} />
            </Link>
          </div>
          <div className="filas">
            {!listo && Array.from({ length: 4 }, (_, i) => <Skel key={i} alto={58} />)}
            {listo &&
              avisos.map((i, k) => (
                <Link key={i.id} href={`/impresoras?i=${i.id}`} className="fila-btn" style={{ animationDelay: `${k * 0.04}s` }}>
                  <span className={`fila-ic ${i.estado === "sin señal" ? "gris" : i.estado === "tóner bajo" || i.estado === "pausada" ? "aviso" : "err"}`}>
                    <Printer size={17} />
                  </span>
                  <span className="fila-txt">
                    <strong>
                      {i.nombre} · {pto(i.puntoId)?.nombre}
                    </strong>
                    <span>
                      {i.estado === "sin señal"
                        ? `Último aviso a las ${hora(i.ultimoLatido)}, ${haceCuanto(i.ultimoLatido, tick)}. En la app aparece en gris.`
                        : i.estado === "tóner bajo"
                          ? `Tóner al ${i.toner}%. Sigue imprimiendo.`
                          : i.estado === "pausada"
                            ? "Pausada por el local. No recibe trabajos."
                            : i.estado === "sin papel"
                              ? "Se quedó sin papel con un trabajo adentro."
                              : "Tiene una hoja atascada en la salida."}
                    </span>
                  </span>
                  <span className="fila-der">
                    <Badge tono={TONO_IMPRESORA[i.estado]}>{ETIQUETA_IMPRESORA[i.estado]}</Badge>
                  </span>
                </Link>
              ))}
          </div>
        </div>

      </section>

        <div className="card">
          <div className="card-head">
            <div>
              <h2>Lo último que dijeron las impresoras</h2>
              <p>Lo que confirma la máquina, no lo que supone la app</p>
            </div>
          </div>
          <ol className="dichos">
            {!listo && Array.from({ length: 5 }, (_, i) => <Skel key={i} alto={40} />)}
            {listo &&
              dichos.map(({ e, t }, i) => (
                <li key={t.id + e.etapa + i} className={`dicho d-${e.etapa}`} onClick={() => setAbierto(t.id)}>
                  <span className="mono">{horaSeg(e.hora)}</span>
                  <span className="dicho-punto" />
                  <span className="dicho-txt">
                    <strong>{imp(t.impresoraId)?.nombre}, {pto(imp(t.impresoraId)?.puntoId)?.nombre}</strong>
                    <span>{e.texto}</span>
                    <small>
                      {t.codigo} · {t.archivo}
                    </small>
                  </span>
                </li>
              ))}
          </ol>
        </div>

      {abiertoT && <DetalleTrabajo t={abiertoT} onCerrar={() => setAbierto(null)} />}
    </>
  );
}
