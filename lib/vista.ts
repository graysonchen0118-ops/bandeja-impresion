import { Cloud, Copy, FileImage, FileSpreadsheet, FileText, Headset, Monitor, Presentation, Printer, ScanLine, Smartphone, type LucideIcon } from "lucide-react";
import type { EstadoImpresora, Estado, Formato, Fuente, Impresora, Tipo, Trabajo } from "./types";
import type { Tono } from "@/components/ui";
import { hojasDe } from "./mock/trabajos";

export const ETIQUETA_ESTADO: Record<Estado, string> = {
  convirtiendo: "Convirtiendo",
  "en cola": "En cola",
  "esperando código": "Espera el código",
  imprimiendo: "Imprimiendo",
  impreso: "Impreso",
  detenido: "Detenido",
  fallido: "No se pudo",
  cancelado: "Cancelado",
  procesando: "Procesando",
  entregado: "Entregado",
};

export const TONO_ESTADO: Record<Estado, Tono> = {
  convirtiendo: "info",
  "en cola": "info",
  "esperando código": "aviso",
  imprimiendo: "acento",
  impreso: "ok",
  detenido: "error",
  fallido: "error",
  cancelado: "neutro",
  procesando: "info",
  entregado: "ok",
};

export const TONO_IMPRESORA: Record<EstadoImpresora, Tono> = {
  lista: "ok",
  imprimiendo: "acento",
  "sin papel": "error",
  atasco: "error",
  "tóner bajo": "aviso",
  pausada: "neutro",
  "sin señal": "neutro",
};

export const ETIQUETA_IMPRESORA: Record<EstadoImpresora, string> = {
  lista: "Lista",
  imprimiendo: "Imprimiendo",
  "sin papel": "Sin papel",
  atasco: "Atasco",
  "tóner bajo": "Tóner bajo",
  pausada: "Pausada",
  "sin señal": "Sin señal",
};

export const FUENTE: Record<Fuente, { texto: string; icono: LucideIcon }> = {
  celular: { texto: "Celular", icono: Smartphone },
  web: { texto: "Navegador", icono: Monitor },
  nube: { texto: "Nube", icono: Cloud },
  impresora: { texto: "Impresora", icono: Printer },
  soporte: { texto: "Soporte", icono: Headset },
};

export const ICONO_TIPO: Record<Tipo, LucideIcon> = { Impresión: Printer, Copia: Copy, Escaneo: ScanLine };

export const ICONO_FORMATO: Record<Formato, LucideIcon> = {
  PDF: FileText,
  Word: FileText,
  Excel: FileSpreadsheet,
  PowerPoint: Presentation,
  Imagen: FileImage,
};

export const COLOR_FORMATO: Record<Formato, string> = {
  PDF: "#d64545",
  Word: "#2f5bea",
  Excel: "#1f9d63",
  PowerPoint: "#d9772b",
  Imagen: "#8a4fd6",
};

export const totalHojas = (t: Trabajo) => hojasDe(t.paginas, t.copias, t.dobleCara);

export const enProblema = (t: Trabajo) => t.estado === "detenido" || t.estado === "fallido";

export const papelPct = (i: Impresora) => (i.capacidad ? (i.hojas / i.capacidad) * 100 : 0);

/** la frase que ve el usuario en el celular: nunca dice "impreso" sin la confirmación de la máquina */
export function fraseUsuario(t: Trabajo, imp?: Impresora) {
  const total = totalHojas(t);
  switch (t.estado) {
    case "convirtiendo":
      return "Preparando el PDF que va a la impresora";
    case "en cola":
      return `En la fila de ${imp?.nombre ?? "la impresora"}`;
    case "esperando código":
      return "Listo en la fila. Digite su código en la pantalla de la máquina";
    case "imprimiendo":
      return `Saliendo: ${t.hojasImpresas} de ${total} hojas`;
    case "impreso":
      return `Impreso. La máquina confirmó las ${total} hojas`;
    case "detenido":
      return `${t.motivo ?? "La impresora se detuvo."} Su trabajo sigue primero en la fila.`;
    case "fallido":
      return t.motivo ?? "No se pudo preparar el archivo";
    case "cancelado":
      return "Cancelado";
    case "procesando":
      return "Armando el PDF del escaneo";
    case "entregado":
      return "Entregado";
  }
}
