"use client";

import { useMemo, useState } from "react";
import { ArrowLeftRight, ArrowRight, CheckCircle2, Copy, FlaskConical, Mail, Monitor, Printer, ScanLine, ShieldCheck, Smartphone, Undo2 } from "lucide-react";
import { ErrorValidacion, useStore } from "@/lib/store";
import { Aviso, Badge, Boton, Skel, Tilt } from "@/components/ui";
import type { Flujo, Trabajo } from "@/lib/types";
import { ETIQUETA_IMPRESORA, TONO_IMPRESORA } from "@/lib/vista";
import { horaBogota } from "@/lib/format";

const ICONO: Record<Flujo["icono"], typeof Monitor> = { web: Monitor, ios: Smartphone, android: Smartphone, copia: Copy, "escaneo-cel": ScanLine, "escaneo-correo": Mail };

const deFlujo = (f: Flujo, t: Trabajo) => {
  switch (f.icono) {
    case "web":
      return t.tipo === "Impresión" && t.origen === "Web";
    case "ios":
      return t.tipo === "Impresión" && t.origen === "iOS";
    case "android":
      return t.tipo === "Impresión" && t.origen === "Android";
    case "copia":
      return t.tipo === "Copia";
    case "escaneo-cel":
      return t.tipo === "Escaneo" && t.destino === "Celular";
    case "escaneo-correo":
      return t.tipo === "Escaneo" && t.destino === "Correo";
  }
};

export default function Migracion() {
  const st = useStore();
  const { listo, flujos, impresoras, puntos, trabajos, tick } = st;
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const desde = tick - horaBogota(tick) * 3600e3;
  const hoy = useMemo(() => trabajos.filter((t) => new Date(t.creado).getTime() >= desde), [trabajos, desde]);
  const nuevos = flujos.filter((f) => f.plataforma === "nueva");
  const conNuevo = impresoras.filter((i) => i.plataforma === "nueva");

  const correr = async (clave: string, f: () => Promise<void>, ok: string) => {
    setCargando(clave);
    setError("");
    try {
      await f();
      st.toast(ok);
    } catch (e) {
      if (e instanceof ErrorValidacion) setError(e.message);
      else st.toast("No se pudo guardar.", "error");
    } finally {
      setCargando(null);
    }
  };

  const tarjeta = (f: Flujo, i: number) => {
    const Ic = ICONO[f.icono];
    const n = hoy.filter((t) => deFlujo(f, t));
    const mal = n.filter((t) => t.estado === "detenido" || t.estado === "fallido").length;
    return (
      <Tilt key={f.id} className={`flujo ${f.plataforma === "nueva" ? "flujo-nuevo" : ""}`} style={{ animationDelay: `${i * 0.05}s` }}>
        <div className="flujo-top">
          <span className="flujo-ic">
            <Ic size={18} />
          </span>
          <div>
            <strong>{f.nombre}</strong>
            <span>{f.descripcion}</span>
          </div>
        </div>
        <div className="flujo-datos">
          <span>
            <b>{n.length}</b> hoy
          </span>
          <span>
            <b>{mal}</b> con problema
          </span>
          {f.plataforma === "nueva" && <Badge tono={f.fase === "estable" ? "ok" : "aviso"}>{f.fase === "estable" ? "Estable" : "En prueba"}</Badge>}
        </div>
        <div className="flujo-acciones">
          {f.plataforma === "actual" ? (
            <Boton tono="secundario" icono={<ArrowRight size={16} />} cargando={cargando === f.id} onClick={() => correr(f.id, () => st.cambiarFlujo(f.id, "nueva"), `${f.nombre} pasa a la API nueva, en prueba`)}>
              Pasar a la API nueva
            </Boton>
          ) : (
            <>
              {f.fase !== "estable" && (
                <Boton tono="secundario" icono={<ShieldCheck size={16} />} cargando={cargando === f.id + "e"} onClick={() => correr(f.id + "e", () => st.cambiarFlujo(f.id, "nueva", "estable"), `${f.nombre} marcado como estable`)}>
                  Marcar estable
                </Boton>
              )}
              <Boton tono="ghost" icono={<Undo2 size={16} />} cargando={cargando === f.id + "d"} onClick={() => correr(f.id + "d", () => st.cambiarFlujo(f.id, "actual"), `${f.nombre} volvió a la plataforma actual`)}>
                Devolver
              </Boton>
            </>
          )}
        </div>
      </Tilt>
    );
  };

  return (
    <>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Cambio de plataforma</span>
          <h1 className="tit-pagina">La API nueva entra un flujo a la vez, sin apagar la actual</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: "78ch" }}>
            Como un local que estrena máquina sin desenchufar la vieja: lo que se mueve se prueba con trabajos reales mientras todo lo demás sigue saliendo por donde siempre. Y si algo falla, se devuelve con un clic.
          </p>
        </div>
      </div>

      <section className="avance">
        <div className="avance-item">
          <small>Flujos en la API nueva</small>
          <strong>
            {listo ? nuevos.length : "..."} <em>de {flujos.length || 6}</em>
          </strong>
          <span className="progreso">
            <i style={{ width: `${(nuevos.length / Math.max(1, flujos.length)) * 100}%` }} />
          </span>
        </div>
        <div className="avance-item">
          <small>Impresoras con conector nuevo</small>
          <strong>
            {listo ? conNuevo.length : "..."} <em>de {impresoras.length}</em>
          </strong>
          <span className="progreso">
            <i style={{ width: `${(conNuevo.length / Math.max(1, impresoras.length)) * 100}%` }} />
          </span>
        </div>
        <div className="avance-item">
          <small>Trabajos de hoy por la API nueva</small>
          <strong>
            {listo ? hoy.filter((t) => t.plataforma === "nueva").length : "..."} <em>de {hoy.length}</em>
          </strong>
          <span className="progreso">
            <i style={{ width: `${(hoy.filter((t) => t.plataforma === "nueva").length / Math.max(1, hoy.length)) * 100}%` }} />
          </span>
        </div>
      </section>

      {error && <Aviso tono="error">{error}</Aviso>}

      <section className="dos-lados">
        <div className="lado">
          <div className="lado-tit">
            <span className="lado-punto naranja" /> Plataforma actual
          </div>
          {!listo && <Skel alto={160} />}
          {flujos.filter((f) => f.plataforma === "actual").map(tarjeta)}
          {listo && !flujos.some((f) => f.plataforma === "actual") && <Aviso tono="ok">Todos los flujos ya pasaron. La plataforma actual se puede apagar cuando los seis estén estables.</Aviso>}
        </div>
        <div className="lado lado-nuevo">
          <div className="lado-tit">
            <span className="lado-punto azul" /> API nueva
          </div>
          {!listo && <Skel alto={160} />}
          {flujos.filter((f) => f.plataforma === "nueva").map(tarjeta)}
          <div className="regla">
            <FlaskConical size={17} />
            <span>Un flujo nuevo arranca en prueba. Se marca estable cuando una semana de trabajos reales no deja nada detenido que la plataforma actual sí habría sacado.</span>
          </div>
        </div>
      </section>

      <div className="card">
        <div className="card-head">
          <div>
            <h2>Quién manda en cada impresora</h2>
            <p>Una impresora recibe de un solo lado. Si las dos plataformas le mandaran a la vez sin saber cuál manda, un trabajo podría salir repetido o no salir.</p>
          </div>
        </div>
        <div className="conectores">
          {!listo && Array.from({ length: 6 }, (_, i) => <Skel key={i} alto={54} />)}
          {listo &&
            impresoras.map((i) => (
              <div key={i.id} className="conector">
                <span className={`conector-ic ${i.plataforma === "nueva" ? "azul" : "naranja"}`}>
                  <Printer size={16} />
                </span>
                <span className="conector-txt">
                  <strong>{i.nombre}</strong>
                  <small>
                    {puntos.find((p) => p.id === i.puntoId)?.nombre} · <Badge tono={TONO_IMPRESORA[i.estado]}>{ETIQUETA_IMPRESORA[i.estado]}</Badge>
                  </small>
                </span>
                <span className="conector-der">
                  {i.vaciando ? (
                    <Badge tono="aviso">
                      <ArrowLeftRight size={12} /> Terminando {i.vaciando} de la actual
                    </Badge>
                  ) : i.plataforma === "nueva" ? (
                    <>
                      <Badge tono="acento">
                        <CheckCircle2 size={12} /> API nueva
                      </Badge>
                      <button className="btn btn-ghost btn-sm" onClick={() => correr(i.id, () => st.devolver(i.id), `${i.nombre} volvió a la actual`)}>
                        Devolver
                      </button>
                    </>
                  ) : (
                    <Boton tono="secundario" className="btn-sm" cargando={cargando === i.id} onClick={() => correr(i.id, () => st.migrar(i.id), `${i.nombre} ya recibe de la API nueva`)}>
                      Pasar
                    </Boton>
                  )}
                </span>
              </div>
            ))}
        </div>
      </div>
    </>
  );
}
