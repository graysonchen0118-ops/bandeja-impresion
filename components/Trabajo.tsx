"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertTriangle, Ban, CircleDashed, Headset, Play, Send, Trash2 } from "lucide-react";
import type { Tamano, Trabajo, Formato } from "@/lib/types";
import { ErrorValidacion, disponible, useStore } from "@/lib/store";
import { Aviso, Badge, Boton, Confirmar, Drawer } from "./ui";
import { ETIQUETA_ESTADO, FUENTE, ICONO_FORMATO, COLOR_FORMATO, TONO_ESTADO, fraseUsuario, totalHojas } from "@/lib/vista";
import { cuandoFue, horaSeg, pesos, tel } from "@/lib/format";

const ETAPA: Record<string, string> = {
  subido: "Subido",
  convertido: "Convertido",
  "en cola": "En la fila",
  liberado: "Liberado",
  tomado: "Tomado por la impresora",
  impreso: "Impreso",
  detenido: "Detenido",
  reanudado: "Retomado",
  reenviado: "Reenviado",
  cancelado: "Cancelado",
  fallido: "No se pudo",
  escaneado: "Escaneado",
  procesado: "Procesado",
  entregado: "Entregado",
};

/** la línea de tiempo de un trabajo: quién dijo qué y a qué hora, hasta donde llegó */
export function Linea({ t, compacta = false }: { t: Trabajo; compacta?: boolean }) {
  const faltan: { etapa: string; texto: string }[] = [];
  const hay = (e: string) => t.eventos.some((x) => x.etapa === e);
  if (t.tipo === "Impresión" && !["impreso", "cancelado", "fallido"].includes(t.estado)) {
    if (!hay("convertido")) faltan.push({ etapa: "Convertido", texto: "La nube arma el PDF" });
    if (!hay("tomado") && t.estado !== "detenido") faltan.push({ etapa: "Tomado por la impresora", texto: t.estado === "esperando código" ? "Cuando el usuario digite el código en la máquina" : "La impresora lo saca de la fila" });
    faltan.push({ etapa: "Impreso", texto: `Solo cuando la impresora confirme las ${totalHojas(t)} hojas` });
  }
  if (t.tipo === "Escaneo" && t.estado === "procesando") faltan.push({ etapa: "Entregado", texto: "Llega al celular o al correo" });
  const ultimo = t.eventos[t.eventos.length - 1];
  return (
    <ol className={`linea ${compacta ? "compacta" : ""}`}>
      {t.eventos.map((e, i) => {
        const F = FUENTE[e.fuente];
        const corte = (e.etapa === "detenido" || e.etapa === "fallido") && e === ultimo;
        return (
          <li key={i} className={`paso f-${e.fuente} ${corte ? "corte" : ""} ${e.etapa === "impreso" || e.etapa === "entregado" ? "fin" : ""}`} style={{ animationDelay: `${i * 0.04}s` }}>
            <span className="paso-hora mono">{horaSeg(e.hora).replace(/\s?[ap]\. m\./, "")}</span>
            <span className="paso-ic" title={F.texto}>
              <F.icono size={15} />
            </span>
            <span className="paso-txt">
              <strong>
                {ETAPA[e.etapa]}
                <em className="paso-fuente">{F.texto}</em>
              </strong>
              <span>{e.texto}</span>
              {corte && <span className="paso-corte">Aquí se cortó</span>}
            </span>
          </li>
        );
      })}
      {faltan.map((f, i) => (
        <li key={"f" + i} className="paso falta">
          <span className="paso-hora mono">--:--</span>
          <span className="paso-ic">
            <CircleDashed size={15} />
          </span>
          <span className="paso-txt">
            <strong>{f.etapa}</strong>
            <span>{f.texto}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

const PROPORCION: Record<Tamano, number> = { Carta: 11 / 8.5, Oficio: 13 / 8.5, A4: 297 / 210 };

/** el PDF ya convertido, que es lo que de verdad va a salir en papel */
export function VistaPrevia({ archivo, formato, paginas, tamano, ajuste, firma, ancho = 74 }: { archivo: string; formato: Formato; paginas: number; tamano: Tamano; ajuste?: string; firma?: boolean; ancho?: number }) {
  // primeras hojas y la última, que es donde suele ir la firma
  const indices = paginas <= 3 ? Array.from({ length: paginas }, (_, i) => i) : [0, 1, paginas - 1];
  const alto = Math.round(ancho * PROPORCION[tamano]);
  const Ic = ICONO_FORMATO[formato];
  const horizontal = formato === "Excel" || formato === "PowerPoint";
  return (
    <div className="previa">
      <div className="previa-hojas">
        {indices.map((i, k) => {
          const ultima = i === paginas - 1;
          return (
            <span key={i} style={{ display: "contents" }}>
            {k === 2 && paginas > 3 && (
              <div className="hoja-mas" style={{ height: horizontal ? ancho : alto }}>
                +{paginas - 3}
              </div>
            )}
            <div className={`hoja-mini ${horizontal ? "horiz" : ""}`} style={{ width: horizontal ? alto : ancho, height: horizontal ? ancho : alto, animationDelay: `${k * 0.06}s` }}>
              {i === 0 && <i className="hoja-tit" style={{ background: COLOR_FORMATO[formato] }} />}
              {Array.from({ length: horizontal ? 5 : 9 }, (_, k) => (
                <i key={k} className="hoja-renglon" style={{ width: `${k % 3 === 2 ? 58 : 86}%` }} />
              ))}
              {formato === "Excel" && <i className="hoja-tabla" />}
              {firma && ultima && (
                <span className="hoja-firma">
                  <i />
                  <small>Firma</small>
                </span>
              )}
              <span className="hoja-num">{i + 1}</span>
            </div>
            </span>
          );
        })}
      </div>
      <div className="previa-pie">
        <Ic size={15} style={{ color: COLOR_FORMATO[formato] }} />
        <span title={archivo}>{archivo}</span>
        <Badge tono="info">PDF {tamano}, {paginas} {paginas === 1 ? "pág." : "págs."}</Badge>
      </div>
      {ajuste && (
        <Aviso tono="aviso">
          <strong>Ajustado al convertir.</strong> {ajuste}
        </Aviso>
      )}
    </div>
  );
}

export function EstadoBadge({ t }: { t: Trabajo }) {
  return (
    <Badge tono={TONO_ESTADO[t.estado]} punto={t.estado === "imprimiendo" || t.estado === "convirtiendo"}>
      {ETIQUETA_ESTADO[t.estado]}
    </Badge>
  );
}

export function DetalleTrabajo({ t, onCerrar }: { t: Trabajo; onCerrar: () => void }) {
  const { usuarios, impresoras, puntos, reanudar, reenviar, cancelar, eliminarTrabajo, toast, tick } = useStore();
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [borrar, setBorrar] = useState(false);
  const [destino, setDestino] = useState("");
  const u = usuarios.find((x) => x.id === t.usuarioId);
  const imp = impresoras.find((x) => x.id === t.impresoraId);
  const p = puntos.find((x) => x.id === imp?.puntoId);
  const total = totalHojas(t);
  const opciones = impresoras.filter((i) => i.id !== t.impresoraId && disponible(i) && (!t.color || i.color));

  const correr = async (clave: string, f: () => Promise<void>, ok?: string) => {
    setCargando(clave);
    setError("");
    try {
      await f();
      if (ok) toast(ok);
    } catch (e) {
      if (e instanceof ErrorValidacion) setError(e.message);
      else toast("No se pudo guardar. Intente de nuevo.", "error");
    } finally {
      setCargando(null);
    }
  };

  const activo = ["convirtiendo", "en cola", "esperando código", "imprimiendo"].includes(t.estado);
  return (
    <Drawer
      abierto
      titulo={t.archivo}
      sub={
        <>
          <Badge tono="neutro">{t.codigo}</Badge>
          <EstadoBadge t={t} />
          <Badge tono={t.plataforma === "nueva" ? "acento" : "apoyo"}>{t.plataforma === "nueva" ? "API nueva" : "Plataforma actual"}</Badge>
        </>
      }
      onCerrar={onCerrar}
      pie={
        <>
          {!activo && t.estado !== "detenido" && (
            <button className="btn btn-ghost" onClick={() => setBorrar(true)}>
              <Trash2 size={16} /> <span>Quitar del registro</span>
            </button>
          )}
          {(activo || t.estado === "detenido") && (
            <Boton tono="secundario" icono={<Ban size={16} />} cargando={cargando === "cancelar"} onClick={() => correr("cancelar", () => cancelar(t.id), `${t.codigo} cancelado`)}>
              Cancelar
            </Boton>
          )}
          {t.estado === "detenido" && (
            <Boton icono={<Play size={16} />} cargando={cargando === "reanudar"} onClick={() => correr("reanudar", () => reanudar(t.id), "Retomado desde la última hoja confirmada")}>
              Retomar
            </Boton>
          )}
        </>
      }
    >
      <div className={`resumen r-${TONO_ESTADO[t.estado]}`}>
        <span className="resumen-et">Lo que ve el usuario en {t.origen === "Web" ? "el navegador" : t.origen === "Panel" ? "el panel" : "el celular"}</span>
        <strong>{fraseUsuario(t, imp)}</strong>
      </div>
      {error && <Aviso tono="error">{error}</Aviso>}

      <div className="datos">
        <div className="dato">
          <small>Usuario</small>
          <strong>{u?.nombre ?? "Usuario eliminado"}</strong>
          {u && <span className="mono">{tel(u.celular)}</span>}
        </div>
        <div className="dato">
          <small>Impresora</small>
          <strong>{imp?.nombre ?? "Impresora eliminada"}</strong>
          <span>{p ? `${p.nombre}, ${p.ciudad}` : ""}</span>
        </div>
        <div className="dato">
          <small>Hojas</small>
          <strong>
            {t.tipo === "Escaneo" ? `${t.paginas} páginas escaneadas` : `${t.hojasImpresas} de ${total} confirmadas`}
          </strong>
          <span>
            {t.copias > 1 ? `${t.copias} copias, ` : ""}
            {t.color ? "color" : "blanco y negro"}
            {t.dobleCara ? ", doble cara" : ""}
          </span>
        </div>
        <div className="dato">
          <small>Valor</small>
          <strong>{pesos(t.costo)}</strong>
          <span>
            {t.origen === "Panel" ? "Desde el panel" : `Desde ${t.origen === "Web" ? "el navegador" : t.origen}`}, {cuandoFue(t.creado, tick)}
          </span>
        </div>
      </div>

      {t.tipo === "Impresión" && t.estado !== "fallido" && (
        <div>
          <div className="sec-tit">Lo que va al papel</div>
          <VistaPrevia archivo={t.archivo} formato={t.formato} paginas={t.paginas} tamano={t.tamano} ajuste={t.ajuste} firma={/contrato|poder|acta/i.test(t.archivo)} />
        </div>
      )}

      <div>
        <div className="sec-tit">Recorrido del trabajo</div>
        <Linea t={t} />
      </div>

      {t.estado === "detenido" && (
        <div className="form-col caja-suave">
          <div className="sec-tit" style={{ marginBottom: 0 }}>
            <AlertTriangle size={15} /> Reenviar lo que falta a otra impresora
          </div>
          <p className="muted" style={{ fontSize: 13.5 }}>
            Salen solo las {total - t.hojasImpresas} hojas que la impresora no confirmó, para no repetir las que ya están en la bandeja.
          </p>
          <div className="toolbar">
            <select className="select" value={destino} onChange={(e) => setDestino(e.target.value)} aria-label="Impresora de destino" style={{ flex: 1, minWidth: 0 }}>
              <option value="">Elegir impresora</option>
              {opciones.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.nombre} · {puntos.find((x) => x.id === i.puntoId)?.nombre}
                </option>
              ))}
            </select>
            <Boton icono={<Send size={16} />} disabled={!destino} cargando={cargando === "reenviar"} onClick={() => correr("reenviar", () => reenviar(t.id, destino), "Reenviado. Ya está en la fila nueva")}>
              Reenviar
            </Boton>
          </div>
        </div>
      )}

      <Link href={`/soporte?nuevo=${t.id}`} className="enlace-suave">
        <Headset size={15} /> Abrir un reclamo con este trabajo
      </Link>

      <Confirmar
        abierto={borrar}
        titulo={`Quitar ${t.codigo} del registro`}
        texto="El trabajo deja de aparecer en las listas y en los reportes. Los reclamos que lo mencionaban se quedan sin el enlace."
        accion="Quitar"
        cargando={cargando === "borrar"}
        onCerrar={() => setBorrar(false)}
        onConfirmar={() =>
          correr("borrar", async () => {
            await eliminarTrabajo(t.id);
            setBorrar(false);
            onCerrar();
          }, `${t.codigo} quitado del registro`)
        }
      />
    </Drawer>
  );
}
