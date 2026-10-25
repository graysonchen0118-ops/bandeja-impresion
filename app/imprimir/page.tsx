"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, ArrowLeft, Ban, CheckCircle2, ChevronRight, Cloud, KeyRound, Loader2, Minus, Monitor, Plus, Printer, RefreshCw, Smartphone, Upload, Wrench } from "lucide-react";
import { ErrorValidacion, useStore, type Envio } from "@/lib/store";
import { Maquina } from "@/components/three/Scenes";
import type { EstadoMaquina } from "@/components/three/Maquina";
import { Aviso, Avatar, Badge, Barra, Boton, Skel } from "@/components/ui";
import { EstadoBadge, Linea, VistaPrevia } from "@/components/Trabajo";
import type { Formato, Impresora, Tamano, Trabajo, Usuario } from "@/lib/types";
import { COLOR_FORMATO, ETIQUETA_IMPRESORA, ICONO_FORMATO, TONO_ESTADO, TONO_IMPRESORA, fraseUsuario, papelPct, totalHojas } from "@/lib/vista";
import { haceCuanto, hora, pesos } from "@/lib/format";
import { hojasDe, precioHoja } from "@/lib/mock/trabajos";

interface Archivo {
  nombre: string;
  formato: Formato;
  paginas: number;
  mb: number;
  tamano: Tamano;
}

const IDENTIDADES: { usuarioId: string; archivos: Archivo[] }[] = [
  {
    usuarioId: "u-2",
    archivos: [
      { nombre: "Contrato de arrendamiento apartamento.docx", formato: "Word", paginas: 12, mb: 1.8, tamano: "Oficio" },
      { nombre: "Taller de física mecánica.pdf", formato: "PDF", paginas: 4, mb: 0.9, tamano: "Carta" },
      { nombre: "Cédula ambas caras.jpg", formato: "Imagen", paginas: 1, mb: 2.6, tamano: "Carta" },
      { nombre: "Presentación proyecto de grado.pptx", formato: "PowerPoint", paginas: 14, mb: 6.2, tamano: "Carta" },
      { nombre: "Hoja de vida.pdf", formato: "PDF", paginas: 2, mb: 0.4, tamano: "Carta" },
    ],
  },
  {
    usuarioId: "u-1",
    archivos: [
      { nombre: "Otrosí contrato local 104.docx", formato: "Word", paginas: 3, mb: 0.6, tamano: "Oficio" },
      { nombre: "Poder especial notaría.pdf", formato: "PDF", paginas: 2, mb: 0.3, tamano: "Carta" },
      { nombre: "Acta de entrega del inmueble.docx", formato: "Word", paginas: 5, mb: 1.1, tamano: "Carta" },
      { nombre: "Factura electrónica FE-2307.pdf", formato: "PDF", paginas: 1, mb: 0.2, tamano: "Carta" },
    ],
  },
  {
    usuarioId: "u-3",
    archivos: [
      { nombre: "Demanda ejecutiva radicado 2026-0431.docx", formato: "Word", paginas: 18, mb: 2.4, tamano: "Carta" },
      { nombre: "Nómina octubre.xlsx", formato: "Excel", paginas: 3, mb: 0.5, tamano: "Carta" },
      { nombre: "Propuesta comercial cuarto trimestre.pptx", formato: "PowerPoint", paginas: 10, mb: 4.8, tamano: "Carta" },
    ],
  },
];

const formatoDe = (n: string): Formato => {
  const e = n.split(".").pop()?.toLowerCase() ?? "";
  if (["doc", "docx", "odt", "rtf"].includes(e)) return "Word";
  if (["xls", "xlsx", "csv", "ods"].includes(e)) return "Excel";
  if (["ppt", "pptx", "odp"].includes(e)) return "PowerPoint";
  if (["jpg", "jpeg", "png", "heic", "webp"].includes(e)) return "Imagen";
  return "PDF";
};

function ajusteDe(a: Archivo, imp?: Impresora) {
  if (!imp) return undefined;
  if (a.formato === "Word" && a.tamano !== imp.tamano) return `Venía en tamaño ${a.tamano} y la impresora tiene ${imp.tamano}: se ajustó para que la firma del final no se corte ni pase a otra hoja.`;
  if (a.formato === "Excel") return "La hoja era más ancha que la página: va horizontal, en una sola hoja de ancho.";
  if (a.formato === "PowerPoint") return "Diapositivas a página completa, sin las notas del orador.";
  if (a.formato === "Imagen") return "La foto venía girada: se enderezó y se ajustó a la página.";
  return undefined;
}

type Paso = "archivo" | "opciones" | "vista" | "estado";

export default function Imprimir() {
  const st = useStore();
  const { listo, usuarios, impresoras, puntos, trabajos, tick } = st;
  const [quien, setQuien] = useState(0);
  const [paso, setPaso] = useState<Paso>("archivo");
  const [archivo, setArchivo] = useState<Archivo | null>(null);
  const [impId, setImpId] = useState("");
  const [copias, setCopias] = useState(1);
  const [color, setColor] = useState(false);
  const [dobleCara, setDobleCara] = useState(false);
  const [trabajoId, setTrabajoId] = useState<string | null>(null);
  const [cargando, setCargando] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [codigo, setCodigo] = useState("");
  const [errCodigo, setErrCodigo] = useState("");
  const fileRef = useRef<HTMLInputElement | null>(null);

  const ident = IDENTIDADES[quien];
  const u: Usuario | undefined = usuarios.find((x) => x.id === ident.usuarioId);
  const punto = puntos.find((p) => p.id === u?.puntoId);
  const cercanas = useMemo(() => {
    if (!u || !punto) return [];
    const ciudad = punto.ciudad;
    return impresoras
      .filter((i) => {
        const p = puntos.find((x) => x.id === i.puntoId)!;
        return p.ciudad === ciudad && (p.id === u.puntoId || p.tipo === "Punto público");
      })
      .sort((a, b) => (a.puntoId === u.puntoId ? -1 : 0) - (b.puntoId === u.puntoId ? -1 : 0));
  }, [impresoras, puntos, u, punto]);

  const imp = impresoras.find((i) => i.id === impId) ?? cercanas[0];
  const pImp = puntos.find((p) => p.id === imp?.puntoId);
  const t: Trabajo | undefined = trabajos.find((x) => x.id === trabajoId);
  const total = archivo ? hojasDe(archivo.paginas, copias, dobleCara) : 0;
  const ajuste = archivo ? ajusteDe(archivo, imp) : undefined;
  const elegible = (i: Impresora) => i.estado !== "sin señal" && i.estado !== "pausada" && i.estado !== "atasco";

  useEffect(() => {
    if (!impId && cercanas.length) setImpId((cercanas.find(elegible) ?? cercanas[0]).id);
  }, [cercanas, impId]);

  const reiniciar = () => {
    setPaso("archivo");
    setArchivo(null);
    setTrabajoId(null);
    setCopias(1);
    setColor(false);
    setDobleCara(false);
    setError("");
    setCodigo("");
    setErrCodigo("");
  };

  const cambiarQuien = (i: number) => {
    if (t && ["convirtiendo", "en cola", "imprimiendo"].includes(t.estado)) {
      st.toast("Espere a que termine o cancélelo antes de cambiar de usuario.", "info");
      return;
    }
    setQuien(i);
    setImpId("");
    reiniciar();
  };

  const subir = (f: File | undefined) => {
    if (!f) return;
    const formato = formatoDe(f.name);
    const mb = Math.max(0.1, f.size / 1048576);
    const paginas = formato === "Imagen" ? 1 : Math.max(1, Math.min(30, Math.round(mb * 4) + 1));
    setArchivo({ nombre: f.name, formato, paginas, mb, tamano: "Carta" });
    setPaso("opciones");
  };

  const enviar = async () => {
    if (!archivo || !imp || !u) return;
    setCargando("enviar");
    setError("");
    try {
      const e: Envio = { usuarioId: u.id, archivo: archivo.nombre, formato: archivo.formato, paginas: archivo.paginas, copias, color: color && imp.color, dobleCara, impresoraId: imp.id, origen: u.app, ajuste, tamano: imp.tamano, mb: archivo.mb };
      const id = await st.enviar(e);
      setTrabajoId(id);
      setPaso("estado");
    } catch (err) {
      setError(err instanceof ErrorValidacion ? err.message : "No se pudo enviar. Intente de nuevo.");
    } finally {
      setCargando(null);
    }
  };

  const correr = async (clave: string, f: () => Promise<void>) => {
    setCargando(clave);
    try {
      await f();
    } catch (e) {
      st.toast(e instanceof Error ? e.message : "No se pudo.", "error");
    } finally {
      setCargando(null);
    }
  };

  const digitar = async (valor: string) => {
    if (!t) return;
    setCargando("codigo");
    setErrCodigo("");
    try {
      await st.liberar(t.id, valor);
      setCodigo("");
    } catch (e) {
      setErrCodigo(e instanceof Error ? e.message : "No se pudo.");
    } finally {
      setCargando(null);
    }
  };

  const estadoMaquina: EstadoMaquina = (() => {
    if (!imp) return "lista";
    if (t && t.impresoraId === imp.id) {
      if (t.estado === "en cola") return "recibiendo";
      if (t.estado === "esperando código") return "codigo";
      if (t.estado === "imprimiendo") return "imprimiendo";
      if (t.estado === "impreso") return "impreso";
      if (t.estado === "detenido" && t.motivo?.includes("papel")) return "sin papel";
    }
    if (imp.estado === "sin papel") return "sin papel";
    if (imp.estado === "atasco") return "atasco";
    if (imp.estado === "pausada") return "pausada";
    if (imp.estado === "sin señal") return "apagada";
    if (imp.estado === "imprimiendo") return "imprimiendo";
    return "lista";
  })();

  const web = u?.app === "Web";
  const activo = t && ["convirtiendo", "en cola", "esperando código", "imprimiendo"].includes(t.estado);

  return (
    <>
      <div className="card-head" style={{ marginBottom: 0 }}>
        <div>
          <span className="eyebrow">Enviar a imprimir</span>
          <h1 className="tit-pagina">Lo que ve el usuario, lo que guarda la nube y lo que hace la máquina</h1>
          <p className="muted" style={{ marginTop: 4, maxWidth: "78ch" }}>
            Envíe un trabajo como lo haría un usuario. Las tres columnas se mueven juntas, y la palabra impreso solo llega al celular cuando la máquina confirma la última hoja.
          </p>
        </div>
      </div>

      <div className="quienes" role="radiogroup" aria-label="Quién envía">
        {IDENTIDADES.map((idn, i) => {
          const us = usuarios.find((x) => x.id === idn.usuarioId);
          const pu = puntos.find((p) => p.id === us?.puntoId);
          if (!listo || !us) return <Skel key={i} alto={62} ancho={240} />;
          return (
            <button key={idn.usuarioId} role="radio" aria-checked={quien === i} className={`quien-btn ${quien === i ? "on" : ""}`} onClick={() => cambiarQuien(i)}>
              {us.foto && <Avatar src={us.foto} alt={us.nombre} size={40} />}
              <span>
                <strong>{us.nombre}</strong>
                <small>
                  {us.app === "Web" ? <Monitor size={13} /> : <Smartphone size={13} />} {us.app === "Web" ? "Navegador" : us.app === "iOS" ? "iPhone" : "Android"} · {pu?.nombre}
                </small>
              </span>
            </button>
          );
        })}
      </div>

      <div className="tres">
        {/* el celular o el navegador */}
        <section className="col">
          <div className="col-tit">
            {web ? <Monitor size={16} /> : <Smartphone size={16} />} {web ? "En el navegador" : "En el celular"}
          </div>
          <div className={web ? "marco-web" : "marco-cel"}>
            {web ? (
              <div className="web-barra">
                <i />
                <i />
                <i />
                <span>Bandeja · Imprimir</span>
              </div>
            ) : (
              <div className="cel-notch" />
            )}
            <div className="app-pantalla">
              <div className="app-top">
                {paso !== "archivo" && paso !== "estado" && (
                  <button className="icon-btn sm" onClick={() => setPaso(paso === "vista" ? "opciones" : "archivo")} aria-label="Volver">
                    <ArrowLeft size={17} />
                  </button>
                )}
                <strong>{paso === "archivo" ? "Imprimir" : paso === "opciones" ? "Impresora y copias" : paso === "vista" ? "Así va a salir" : "Su trabajo"}</strong>
                {u?.foto && <Avatar src={u.foto} alt={u.nombre} size={28} />}
              </div>

              {!listo && (
                <div className="app-cuerpo">
                  <Skel alto={56} />
                  <Skel alto={56} />
                  <Skel alto={56} />
                </div>
              )}

              {listo && paso === "archivo" && (
                <div className="app-cuerpo">
                  <p className="app-ayuda">Elija el archivo. Lo convertimos a PDF antes de mandarlo, para que salga igual a como lo ve.</p>
                  {ident.archivos.map((a) => {
                    const Ic = ICONO_FORMATO[a.formato];
                    return (
                      <button
                        key={a.nombre}
                        className="archivo"
                        onClick={() => {
                          setArchivo(a);
                          setPaso("opciones");
                        }}
                      >
                        <span className="archivo-ic" style={{ color: COLOR_FORMATO[a.formato], background: `${COLOR_FORMATO[a.formato]}14` }}>
                          <Ic size={18} />
                        </span>
                        <span className="archivo-txt">
                          <strong>{a.nombre}</strong>
                          <small>
                            {a.paginas} {a.paginas === 1 ? "página" : "páginas"} · {a.mb.toFixed(1).replace(".", ",")} MB
                          </small>
                        </span>
                        <ChevronRight size={16} className="muted" />
                      </button>
                    );
                  })}
                  <button className="archivo subir" onClick={() => fileRef.current?.click()}>
                    <span className="archivo-ic">
                      <Upload size={18} />
                    </span>
                    <span className="archivo-txt">
                      <strong>Subir otro archivo</strong>
                      <small>PDF, Word, Excel, PowerPoint o foto</small>
                    </span>
                  </button>
                  <input ref={fileRef} type="file" hidden accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.jpg,.jpeg,.png" onChange={(e) => subir(e.target.files?.[0])} />
                </div>
              )}

              {listo && paso === "opciones" && archivo && (
                <div className="app-cuerpo">
                  <div className="app-sec">Impresoras cerca</div>
                  <div className="imps">
                    {cercanas.map((i) => {
                      const ok = elegible(i);
                      const p = puntos.find((x) => x.id === i.puntoId);
                      const pocas = i.hojas < total && i.estado !== "sin señal";
                      return (
                        <button key={i.id} className={`imp-op ${impId === i.id ? "on" : ""} ${ok ? "" : "apagada"}`} disabled={!ok} onClick={() => setImpId(i.id)}>
                          <span className={`imp-luz l-${TONO_IMPRESORA[i.estado]}`} />
                          <span className="imp-op-txt">
                            <strong>{i.nombre}</strong>
                            <small>
                              {p?.nombre} · {i.color ? "Color" : "Blanco y negro"}
                            </small>
                            <small className={ok ? (pocas ? "txt-aviso" : "") : "txt-gris"}>
                              {i.estado === "sin señal"
                                ? `No responde desde las ${hora(i.ultimoLatido)}`
                                : i.estado === "pausada"
                                  ? "Pausada por el local"
                                  : i.estado === "atasco"
                                    ? "Tiene un atasco, no recibe"
                                    : pocas
                                      ? `Le quedan ${i.hojas} hojas de papel`
                                      : `Aviso ${haceCuanto(i.ultimoLatido, Math.max(tick, Date.now() - 1))}`}
                            </small>
                          </span>
                          {!ok && <Badge tono={TONO_IMPRESORA[i.estado]}>{ETIQUETA_IMPRESORA[i.estado]}</Badge>}
                        </button>
                      );
                    })}
                  </div>
                  <div className="app-sec">Opciones</div>
                  <div className="opciones">
                    <div className="opcion">
                      <span>Copias</span>
                      <span className="stepper">
                        <button className="icon-btn sm" onClick={() => setCopias((c) => Math.max(1, c - 1))} aria-label="Menos copias">
                          <Minus size={15} />
                        </button>
                        <strong>{copias}</strong>
                        <button className="icon-btn sm" onClick={() => setCopias((c) => Math.min(20, c + 1))} aria-label="Más copias">
                          <Plus size={15} />
                        </button>
                      </span>
                    </div>
                    <label className={`opcion ${imp?.color ? "" : "deshab"}`}>
                      <span>Color</span>
                      <input type="checkbox" className="switch" checked={color && !!imp?.color} disabled={!imp?.color} onChange={(e) => setColor(e.target.checked)} />
                    </label>
                    <label className="opcion">
                      <span>Doble cara</span>
                      <input type="checkbox" className="switch" checked={dobleCara} onChange={(e) => setDobleCara(e.target.checked)} />
                    </label>
                  </div>
                  <div className="total">
                    <span>
                      {total} {total === 1 ? "hoja" : "hojas"}
                    </span>
                    <strong>{pesos(total * precioHoja(color && !!imp?.color))}</strong>
                  </div>
                  <Boton className="ancho" disabled={!imp || !elegible(imp)} onClick={() => setPaso("vista")} icono={<ChevronRight size={17} />}>
                    Ver cómo va a salir
                  </Boton>
                </div>
              )}

              {listo && paso === "vista" && archivo && imp && (
                <div className="app-cuerpo">
                  <p className="app-ayuda">Esta es la vista del PDF ya convertido para {imp.nombre}, no del archivo original. Lo que ve aquí es lo que sale.</p>
                  <VistaPrevia archivo={archivo.nombre} formato={archivo.formato} paginas={archivo.paginas} tamano={imp.tamano} ajuste={ajuste} firma={/contrato|poder|acta|otros/i.test(archivo.nombre)} ancho={web ? 84 : 66} />
                  {imp.hojas < total && <Aviso tono="aviso">A esa impresora le quedan {imp.hojas} hojas de papel y su trabajo lleva {total}. Si se acaba, se detiene y se lo decimos aquí.</Aviso>}
                  {error && <Aviso tono="error">{error}</Aviso>}
                  <Boton className="ancho" cargando={cargando === "enviar"} onClick={enviar} icono={<Printer size={17} />}>
                    Enviar a {imp.nombre}
                  </Boton>
                </div>
              )}

              {listo && paso === "estado" && t && (
                <div className="app-cuerpo">
                  <div className={`estado-grande e-${TONO_ESTADO[t.estado]}`}>
                    <span className="estado-ic">
                      {t.estado === "impreso" ? <CheckCircle2 size={30} /> : t.estado === "detenido" || t.estado === "fallido" ? <AlertTriangle size={30} /> : t.estado === "cancelado" ? <Ban size={30} /> : t.estado === "esperando código" ? <KeyRound size={30} /> : <Loader2 size={30} className="spin" />}
                    </span>
                    <strong>{t.estado === "impreso" ? "Impreso" : t.estado === "detenido" ? "Detenido en la impresora" : t.estado === "esperando código" ? "Listo para liberar" : t.estado === "cancelado" ? "Cancelado" : t.estado === "imprimiendo" ? "Imprimiendo" : t.estado === "en cola" ? "En la fila" : "Preparando"}</strong>
                    <span>{fraseUsuario(t, imp)}</span>
                    {t.estado === "esperando código" && (
                      <span className="codigo-grande" aria-label={`Código ${t.codigoLiberacion}`}>
                        {t.codigoLiberacion?.split("").map((d, i) => (
                          <b key={i}>{d}</b>
                        ))}
                      </span>
                    )}
                    {(t.estado === "imprimiendo" || t.estado === "detenido" || t.estado === "impreso") && (
                      <span className="progreso">
                        <i style={{ width: `${(t.hojasImpresas / totalHojas(t)) * 100}%` }} />
                      </span>
                    )}
                  </div>
                  <div className="app-mini">
                    <span className="mono">{t.codigo}</span>
                    <span>{pImp?.nombre}</span>
                  </div>
                  {activo || t.estado === "detenido" ? (
                    <Boton tono="secundario" className="ancho" icono={<Ban size={16} />} cargando={cargando === "cancelar"} onClick={() => correr("cancelar", () => st.cancelar(t.id, u?.app === "Web" ? "web" : "celular"))}>
                      Cancelar trabajo
                    </Boton>
                  ) : (
                    <Boton className="ancho" icono={<RefreshCw size={16} />} onClick={reiniciar}>
                      Imprimir otro
                    </Boton>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* la nube */}
        <section className="col">
          <div className="col-tit">
            <Cloud size={16} /> En la nube, un solo registro
          </div>
          <div className="card registro">
            {!t && (
              <div className="registro-vacio">
                <Cloud size={26} />
                <strong>Todavía no hay trabajo</strong>
                <p>Cuando lo envíe, aquí aparece su registro paso por paso. El celular, el navegador y soporte leen este mismo registro, así que los tres cuentan la misma historia.</p>
              </div>
            )}
            {t && (
              <>
                <div className="registro-head">
                  <div>
                    <small className="mono">{t.codigo}</small>
                    <strong>{t.archivo}</strong>
                  </div>
                  <EstadoBadge t={t} />
                </div>
                <div className="registro-datos">
                  <span>
                    <small>Hojas</small>
                    <b>
                      {t.hojasImpresas} de {totalHojas(t)}
                    </b>
                  </span>
                  <span>
                    <small>Impresora</small>
                    <b>{imp?.nombre}</b>
                  </span>
                  <span>
                    <small>Plataforma</small>
                    <b>{t.plataforma === "nueva" ? "API nueva" : "Actual"}</b>
                  </span>
                </div>
                <Linea t={t} />
                <p className="nota-registro">
                  <Printer size={14} /> El paso <b>Impreso</b> solo lo escribe la impresora. Si la app lo marcara al enviar, el usuario llegaría a una bandeja vacía.
                </p>
              </>
            )}
          </div>
        </section>

        {/* el local */}
        <section className="col">
          <div className="col-tit">
            <Printer size={16} /> En el local
          </div>
          <div className="card maquina-card">
            <div className="maquina-escena">
              {imp && <Maquina estado={estadoMaquina} hojas={t && t.impresoraId === imp.id ? t.hojasImpresas : 0} total={t ? totalHojas(t) : 0} nombre={imp.nombre} trabajo={t?.id} color={imp.color} />}
            </div>
            {imp && (
              <div className="maquina-info">
                <div className="maquina-nombre">
                  <strong>{imp.nombre}</strong>
                  <span>
                    {pImp?.nombre} · {imp.modelo}
                  </span>
                </div>
                <div className="niveles">
                  <span>
                    <small>Papel</small>
                    <Barra valor={papelPct(imp)} />
                    <b>{imp.hojas} hojas</b>
                  </span>
                  <span>
                    <small>Tóner</small>
                    <Barra valor={imp.toner} />
                    <b>{imp.toner}%</b>
                  </span>
                </div>
                <div className="latido-linea">
                  {imp.estado === "sin señal" ? (
                    <>
                      <span className="punto-gris" /> Sin aviso desde las {hora(imp.ultimoLatido)}
                    </>
                  ) : (
                    <>
                      <span className="punto-vivo" /> Avisa que está encendida cada 15 s · último {haceCuanto(imp.ultimoLatido, Math.max(tick, Date.now() - 1))}
                    </>
                  )}
                </div>

                {t?.estado === "esperando código" && t.impresoraId === imp.id && (
                  <div className="teclado">
                    <span className="teclado-tit">
                      <KeyRound size={15} /> En la pantalla de la máquina
                    </span>
                    <div className="toolbar">
                      <input className="input mono" value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, "").slice(0, 4))} placeholder="0000" inputMode="numeric" aria-label="Código de liberación" style={{ width: 110, letterSpacing: "0.3em", textAlign: "center" }} />
                      <Boton cargando={cargando === "codigo"} onClick={() => digitar(codigo)} disabled={codigo.length !== 4}>
                        Liberar
                      </Boton>
                      <button className="btn btn-ghost btn-sm" onClick={() => digitar(t.codigoLiberacion ?? "")}>
                        Digitar {t.codigoLiberacion}
                      </button>
                    </div>
                    {errCodigo && <span className="campo-error">{errCodigo}</span>}
                  </div>
                )}
                {(imp.estado === "sin papel" || estadoMaquina === "sin papel") && (
                  <Boton tono="apoyo" icono={<RefreshCw size={16} />} cargando={cargando === "papel"} onClick={() => correr("papel", () => st.recargarPapel(imp.id))}>
                    Recargar papel en la bandeja 1
                  </Boton>
                )}
                {imp.estado === "atasco" && (
                  <Boton tono="apoyo" icono={<Wrench size={16} />} cargando={cargando === "atasco"} onClick={() => correr("atasco", () => st.destrabar(imp.id))}>
                    Despejar el atasco
                  </Boton>
                )}
                {!t && (
                  <div className="pruebe">
                    <strong>Para probar</strong>
                    <span>Mande el contrato de 12 páginas a Mostrador, Sede Chapinero: le quedan 7 hojas de papel. Fíjese qué dice el celular cuando se acaba.</span>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </>
  );
}
