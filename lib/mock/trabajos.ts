import type { Evento, Formato, Fuente, Impresora, Origen, Punto, Reclamo, Tamano, Trabajo, Usuario } from "../types";
import { horaBogota, mulberry32 } from "../format";

type Archivo = [nombre: string, formato: Formato, min: number, max: number];

export const EMPRESA: Archivo[] = [
  ["Contrato de prestación de servicios.docx", "Word", 4, 9],
  ["Poder especial notaría.pdf", "PDF", 2, 3],
  ["Acta de asamblea octubre.docx", "Word", 5, 12],
  ["Factura electrónica FE-2291.pdf", "PDF", 1, 2],
  ["Propuesta comercial cuarto trimestre.pptx", "PowerPoint", 8, 18],
  ["Nómina octubre.xlsx", "Excel", 2, 6],
  ["Resultados de laboratorio.pdf", "PDF", 2, 5],
  ["Orden médica.pdf", "PDF", 1, 2],
  ["Certificado laboral.pdf", "PDF", 1, 1],
  ["Cotización mantenimiento ascensores.pdf", "PDF", 2, 4],
  ["Demanda ejecutiva radicado 2026-0418.docx", "Word", 10, 26],
  ["Inventario bodega.xlsx", "Excel", 3, 8],
];

export const PUBLICO: Archivo[] = [
  ["Taller de cálculo integral.pdf", "PDF", 3, 8],
  ["Tesis capítulo 3.docx", "Word", 18, 40],
  ["Hoja de vida.pdf", "PDF", 2, 3],
  ["Cédula ambas caras.jpg", "Imagen", 1, 1],
  ["Pase de abordar.pdf", "PDF", 1, 2],
  ["Recibo de servicios públicos.pdf", "PDF", 1, 2],
  ["Formulario de visa.pdf", "PDF", 6, 10],
  ["Presentación final de semestre.pptx", "PowerPoint", 10, 22],
  ["Mapa conceptual.png", "Imagen", 1, 1],
  ["Certificado de estudio.pdf", "PDF", 1, 1],
  ["Planos casa lote.pdf", "PDF", 2, 6],
  ["Guía de laboratorio de química.docx", "Word", 4, 9],
];

const ESCANEOS = ["Escaneo cédula", "Escaneo contrato firmado", "Escaneo recibos de caja", "Escaneo historia clínica", "Escaneo pasaporte", "Escaneo registro civil", "Escaneo paz y salvo"];
const COPIAS = ["Copia registro civil", "Copia escrituras", "Copia carné de vacunas", "Copia libreta militar", "Copia cédula ampliada al 150%", "Copia acta de grado"];

const AJUSTES: Partial<Record<Formato, string[]>> = {
  Word: ["Venía en tamaño Oficio y la impresora tiene Carta: se ajustó para que el pie de página no se corte.", "Usaba una letra que no está en la nube: quedó incrustada en el PDF para que salga igual."],
  Excel: ["La hoja era más ancha que la página: se imprimió horizontal, en una sola hoja de ancho."],
  PowerPoint: ["Diapositivas a página completa, sin las notas del orador."],
  Imagen: ["La foto venía girada: se enderezó y se ajustó a la página."],
};

const FALLAS = ["El PDF tiene contraseña y no se pudo abrir.", "El archivo llegó incompleto, la subida se cortó.", "Ese formato todavía no se convierte en la nube."];

export const textoSubida = (o: Origen) => (o === "iOS" ? "Subido desde el iPhone" : o === "Android" ? "Subido desde Android" : o === "Web" ? "Subido desde el navegador" : "Iniciado en el panel de la máquina");
export const fuenteDe = (o: Origen): Fuente => (o === "Web" ? "web" : o === "Panel" ? "impresora" : "celular");

export const precioHoja = (color: boolean) => (color ? 900 : 250);
export const hojasDe = (paginas: number, copias: number, dobleCara: boolean) => Math.ceil(paginas / (dobleCara ? 2 : 1)) * copias;

const at = (ms: number) => new Date(ms).toISOString();

export function crearTrabajos(t: number, usuarios: Usuario[], impresoras: Impresora[], puntos: Punto[]): Trabajo[] {
  const rnd = mulberry32(2026);
  const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
  const entre = (a: number, b: number) => Math.round(a + rnd() * (b - a));
  const out: Trabajo[] = [];
  let codigo = 48120;
  const punto = (id: string) => puntos.find((p) => p.id === id)!;

  const disponible = (imp: Impresora, min: number) => {
    if (imp.estado === "sin señal" && min < 47) return false;
    if (imp.estado === "atasco" && min < 40) return false;
    if (imp.estado === "pausada" && min < 95) return false;
    if (imp.id === "i-chapi-1" && min < 9) return false;
    return true;
  };

  // hoy: desde que abren los locales (6:30) hasta ahora; antes: días anteriores en horario de oficina
  const hAhora = horaBogota(t);
  const abierto = Math.max(90, (hAhora - 6.5) * 60);
  for (let i = 0; i < 150; i++) {
    const hoy = i < 106;
    const min = hoy ? Math.pow(rnd(), 1.12) * abierto + 0.5 : (1 + Math.floor(rnd() * 2)) * 1440 + (hAhora - (7 + rnd() * 12)) * 60;
    const t0 = t - min * 60e3;
    const u = pick(usuarios);
    let lista = impresoras.filter((x) => x.puntoId === u.puntoId && disponible(x, min));
    if (!lista.length) lista = impresoras.filter((x) => disponible(x, min));
    const imp = pick(lista);
    const p = punto(imp.puntoId);
    const r = rnd();
    const tipo = imp.escaner && r < 0.12 ? "Escaneo" : r < 0.22 ? "Copia" : "Impresión";
    const origen: Origen = tipo === "Impresión" ? u.app : "Panel";
    const archivo: Archivo = tipo === "Impresión" ? pick(p.tipo === "Empresa" ? EMPRESA : PUBLICO) : tipo === "Escaneo" ? [pick(ESCANEOS) + ".pdf", "PDF", 1, 6] : [pick(COPIAS), "PDF", 1, 12];
    const paginas = entre(archivo[2], archivo[3]);
    const copias = tipo === "Escaneo" ? 1 : rnd() < 0.84 ? 1 : entre(2, 3);
    const color = imp.color && tipo !== "Escaneo" && rnd() < 0.27;
    const dobleCara = tipo === "Impresión" && paginas > 3 && rnd() < 0.45;
    const total = hojasDe(paginas, copias, dobleCara);
    const plataforma = imp.plataforma === "nueva" && origen === "Web" ? "nueva" : "actual";
    const conAjuste = tipo === "Impresión" && AJUSTES[archivo[1]] && rnd() < 0.55 ? pick(AJUSTES[archivo[1]]!) : undefined;
    const ajuste = conAjuste && imp.tamano === "A4" && archivo[1] === "Word" ? "Venía en tamaño Carta y la impresora tiene A4: se ajustó para que la última línea no pase a otra hoja." : conAjuste;

    const ev: Evento[] = [];
    let s = t0;
    const add = (etapa: Evento["etapa"], fuente: Fuente, texto: string, dt = 0) => {
      s += dt;
      ev.push({ etapa, fuente, texto, hora: at(Math.min(s, t - 1000)) });
    };

    let estado: Trabajo["estado"] = "impreso";
    let hojasImpresas = total;
    let motivo: string | undefined;
    const job: Partial<Trabajo> = {};

    if (tipo === "Escaneo") {
      add("escaneado", "impresora", `Escaneado en ${imp.nombre}, ${paginas} ${paginas === 1 ? "página" : "páginas"}`);
      const destino = rnd() < 0.68 ? "Celular" : "Correo";
      job.destino = destino;
      if (min < 0.8) {
        estado = "procesando";
      } else {
        add("procesado", "nube", "PDF armado y texto reconocido para poder buscarlo", entre(4, 14) * 1000);
        if (destino === "Correo" && rnd() < 0.08) {
          estado = "fallido";
          motivo = "El correo de destino devolvió el mensaje.";
          add("fallido", "nube", motivo, 3000);
        } else {
          estado = "entregado";
          add("entregado", "nube", destino === "Celular" ? "Llegó a la app del celular" : `Enviado a ${u.correo}`, entre(2, 6) * 1000);
        }
      }
      hojasImpresas = 0;
    } else {
      if (tipo === "Impresión") {
        add("subido", fuenteDe(origen), `${textoSubida(origen)}, ${(0.2 + rnd() * 4.6).toFixed(1).replace(".", ",")} MB`);
        if (min < 0.6) {
          estado = "convirtiendo";
          hojasImpresas = 0;
        } else {
          const falla = min > 3 && rnd() < 0.04;
          if (falla) {
            estado = "fallido";
            motivo = pick(FALLAS);
            add("fallido", "nube", motivo, entre(3, 9) * 1000);
            hojasImpresas = 0;
          } else {
            add("convertido", "nube", `Convertido a PDF, ${paginas} ${paginas === 1 ? "página" : "páginas"}`, entre(3, 18) * 1000);
            add("en cola", "nube", `En la fila de ${imp.nombre}`, 1000);
          }
        }
      } else {
        add("en cola", "impresora", `Copia iniciada en el panel de ${imp.nombre}`);
      }

      if (estado === "impreso") {
        const publico = p.liberacion === "código" && tipo === "Impresión";
        if (publico && min < 6 && rnd() < 0.7) {
          estado = "esperando código";
          hojasImpresas = 0;
          job.codigoLiberacion = String(entre(1000, 9999));
        } else if (min < 3.2) {
          estado = rnd() < 0.5 ? "en cola" : "imprimiendo";
          if (estado === "imprimiendo") {
            if (publico) add("liberado", "impresora", "Liberado en la máquina con el código", entre(20, 140) * 1000);
            add("tomado", "impresora", "La impresora lo tomó de la fila", entre(3, 20) * 1000);
            hojasImpresas = Math.max(0, Math.min(total - 1, Math.floor(total * rnd())));
          } else hojasImpresas = 0;
        } else {
          const cancel = tipo === "Impresión" && rnd() < 0.045;
          if (cancel) {
            estado = "cancelado";
            hojasImpresas = 0;
            motivo = publico ? "Se venció el código sin liberarlo en la máquina." : "Cancelado por el usuario antes de salir.";
            add("cancelado", publico ? "nube" : fuenteDe(origen), motivo, entre(30, 600) * 1000);
          } else {
            if (publico) add("liberado", "impresora", "Liberado en la máquina con el código", entre(25, 300) * 1000);
            add("tomado", "impresora", tipo === "Copia" ? "La máquina empezó a copiar" : "La impresora lo tomó de la fila", entre(3, 40) * 1000);
            if (rnd() < 0.06 && total > 3) {
              const parcial = entre(1, total - 1);
              const m = pick(["Se acabó el papel en la bandeja 1.", "Atasco de papel en la salida.", "La tapa frontal quedó abierta."]);
              add("detenido", "impresora", `${m} Iban ${parcial} de ${total} hojas.`, parcial * 3000);
              add("reanudado", "impresora", "Se resolvió en la máquina y siguió", entre(90, 900) * 1000);
            }
            add("impreso", "impresora", `La impresora confirmó ${total} de ${total} ${total === 1 ? "hoja" : "hojas"}`, Math.max(4, total * 2.4) * 1000);
          }
        }
      }
    }

    out.push({
      id: `t-${codigo++}`,
      codigo: "",
      tipo,
      origen,
      usuarioId: u.id,
      archivo: archivo[0],
      formato: archivo[1],
      paginas,
      copias,
      color,
      dobleCara,
      tamano: imp.tamano,
      impresoraId: imp.id,
      plataforma,
      estado,
      motivo,
      ajuste: estado === "fallido" ? undefined : ajuste,
      creado: at(t0),
      eventos: ev,
      hojasImpresas,
      costo: tipo === "Escaneo" ? paginas * 150 : total * precioHoja(color),
      ...job,
    });
  }

  // El contrato que se quedó a mitad: es el caso que llega por teléfono a soporte.
  const c0 = t - 38 * 60e3;
  out.push({
    id: "t-contrato",
    codigo: "",
    tipo: "Impresión",
    origen: "iOS",
    usuarioId: "u-1",
    archivo: "Contrato de arrendamiento local 104.docx",
    formato: "Word",
    paginas: 6,
    copias: 1,
    color: false,
    dobleCara: false,
    tamano: "Carta",
    impresoraId: "i-93-2",
    plataforma: "actual",
    estado: "detenido",
    motivo: "Atasco de papel en la salida.",
    ajuste: "Venía en tamaño Oficio y la impresora tiene Carta: se ajustó para que la firma del final no se corte.",
    creado: at(c0),
    hojasImpresas: 2,
    costo: 6 * precioHoja(false),
    eventos: [
      { etapa: "subido", fuente: "celular", texto: "Subido desde el iPhone, 1,4 MB", hora: at(c0) },
      { etapa: "convertido", fuente: "nube", texto: "Convertido a PDF, 6 páginas", hora: at(c0 + 9000) },
      { etapa: "en cola", fuente: "nube", texto: "En la fila de Sala de juntas", hora: at(c0 + 10000) },
      { etapa: "tomado", fuente: "impresora", texto: "La impresora lo tomó de la fila", hora: at(c0 + 52000) },
      { etapa: "detenido", fuente: "impresora", texto: "Atasco de papel en la salida. Iban 2 de 6 hojas.", hora: at(c0 + 61000) },
    ],
  });

  // La sala 2 del campus se apagó con un trabajo adentro.
  const c1 = t - 49 * 60e3;
  out.push({
    id: "t-taller",
    codigo: "",
    tipo: "Impresión",
    origen: "Android",
    usuarioId: "u-4",
    archivo: "Taller de cálculo integral.pdf",
    formato: "PDF",
    paginas: 9,
    copias: 1,
    color: false,
    dobleCara: false,
    tamano: "Carta",
    impresoraId: "i-campus-2",
    plataforma: "actual",
    estado: "detenido",
    motivo: "La impresora dejó de responder a mitad del trabajo.",
    creado: at(c1),
    hojasImpresas: 2,
    costo: 9 * precioHoja(false),
    eventos: [
      { etapa: "subido", fuente: "celular", texto: "Subido desde Android, 2,1 MB", hora: at(c1) },
      { etapa: "convertido", fuente: "nube", texto: "Convertido a PDF, 9 páginas", hora: at(c1 + 6000) },
      { etapa: "en cola", fuente: "nube", texto: "En la fila de Sala 2, segundo piso", hora: at(c1 + 7000) },
      { etapa: "liberado", fuente: "impresora", texto: "Liberado en la máquina con el código", hora: at(c1 + 75000) },
      { etapa: "tomado", fuente: "impresora", texto: "La impresora lo tomó de la fila", hora: at(c1 + 81000) },
      { etapa: "detenido", fuente: "nube", texto: "La impresora dejó de avisar que estaba encendida. Había confirmado 2 de 9 hojas.", hora: at(c1 + 2 * 60e3) },
    ],
  });

  // Alguien frente a la máquina de Laureles que todavía no digitó su código.
  const c2 = t - 7 * 60e3;
  out.push({
    id: "t-codigo",
    codigo: "",
    tipo: "Impresión",
    origen: "Android",
    usuarioId: "u-8",
    archivo: "Formulario de visa.pdf",
    formato: "PDF",
    paginas: 8,
    copias: 1,
    color: false,
    dobleCara: false,
    tamano: "Carta",
    impresoraId: "i-lau-1",
    plataforma: "actual",
    estado: "esperando código",
    codigoLiberacion: "5307",
    creado: at(c2),
    hojasImpresas: 0,
    costo: 8 * precioHoja(false),
    eventos: [
      { etapa: "subido", fuente: "celular", texto: "Subido desde Android, 3,2 MB", hora: at(c2) },
      { etapa: "convertido", fuente: "nube", texto: "Convertido a PDF, 8 páginas", hora: at(c2 + 7000) },
      { etapa: "en cola", fuente: "nube", texto: "En la fila de Mostrador", hora: at(c2 + 8000) },
    ],
  });

  // códigos en orden de llegada, como los daría la nube
  out.sort((a, b) => a.creado.localeCompare(b.creado)).forEach((x, i) => (x.codigo = `BJ-${47960 + i}`));
  return out.reverse();
}

export function crearReclamos(t: number, trabajos: Trabajo[], usuarios: Usuario[]): Reclamo[] {
  const rnd = mulberry32(93);
  const at2 = (min: number) => new Date(t - min * 60e3).toISOString();
  const de = (f: (x: Trabajo) => boolean, n = 0) => trabajos.filter(f)[n];
  const fallido = de((x) => x.estado === "fallido" && x.tipo === "Impresión");
  const escaneo = de((x) => x.tipo === "Escaneo" && x.estado === "entregado" && x.destino === "Celular");
  const conPausa = de((x) => x.eventos.some((e) => e.etapa === "reanudado") && x.paginas * x.copias > 6);
  const enCola = trabajos.find((x) => x.id === "t-codigo");
  const conAjuste = de((x) => !!x.ajuste && x.estado === "impreso" && x.formato === "Word");
  const variasCopias = de((x) => x.copias === 1 && x.estado === "impreso" && x.tipo === "Impresión" && x.paginas > 2, 3);
  const cancelado = de((x) => x.estado === "cancelado");

  const base: Omit<Reclamo, "id" | "numero">[] = [
    {
      creado: at2(31),
      usuarioId: "u-1",
      canal: "Llamada",
      texto: "Mandé el contrato a la impresora de la sala de juntas, en la app aparece que se detuvo y abajo solo hay dos hojas. Necesito firmarlo antes del mediodía.",
      trabajoId: "t-contrato",
      estado: "abierto",
      prioridad: "alta",
      notas: [],
    },
    {
      creado: at2(44),
      usuarioId: "u-4",
      canal: "WhatsApp",
      texto: "En la sala 2 del campus me salieron dos hojas y la máquina se apagó. Quiero saber si me cobraron todo el taller.",
      trabajoId: "t-taller",
      estado: "en revisión",
      responsable: "tomas",
      prioridad: "alta",
      notas: [{ autor: "tomas", texto: "Voy para el bloque B a revisar la toma de la sala 2.", hora: at2(40) }],
    },
  ];

  const extra: [Reclamo["canal"], string, Trabajo | undefined, Reclamo["estado"], string?, string?][] = [
    ["Correo", "Subí el certificado y me sale error, no entiendo por qué no imprime.", fallido, "resuelto", "liliana", "El PDF tenía contraseña. Le expliqué cómo guardarlo sin ella y ya imprimió."],
    ["WhatsApp", "Escaneé la cédula por las dos caras y al celular me llegó un solo archivo, no sé si quedaron las dos.", escaneo, "en revisión", "marcela", "Llegó un PDF de dos páginas, le pedí que revise la segunda."],
    ["Llamada", "Me cobraron todas las hojas y vi que la máquina se detuvo en la mitad.", conPausa, "resuelto", "marcela", "La línea de tiempo muestra que se detuvo, siguió y la impresora confirmó todas. Se lo mostré y quedó tranquilo."],
    ["WhatsApp", "Llevo un rato frente a la máquina y no me sale, en la app dice que espera el código.", enCola, "abierto"],
    ["Correo", "El documento salió con la letra distinta a como lo tengo en el computador.", conAjuste, "resuelto", "liliana", "La letra no estaba en la nube, ahora se incrusta en el PDF. Reimpreso sin costo."],
    ["Llamada", "Pedí dos copias y salió una sola.", variasCopias, "resuelto", "marcela", "El trabajo se envió con una copia. Le mostré dónde se elige en la app."],
    ["WhatsApp", "Cancelé un trabajo por error, se puede recuperar?", cancelado, "resuelto", "liliana", "Se reenvió el mismo archivo a la misma impresora."],
    ["Llamada", "La impresora de contabilidad del piso 9 no me aparece en el celular.", undefined, "resuelto", "andres", "Estaba fuera de su grupo de impresoras. Ya aparece."],
    ["Correo", "Quiero saber cuántas hojas imprimió mi equipo este mes.", undefined, "resuelto", "andres", "Se le envió el reporte por centro de costo."],
    ["WhatsApp", "El código para liberar me dice que no es válido.", undefined, "resuelto", "marcela", "Estaba digitando el de un trabajo anterior. Con el nuevo salió."],
    ["Llamada", "En Laureles la máquina de color saca las hojas con una raya.", undefined, "en revisión", "tomas", "Programada limpieza del rodillo mañana temprano."],
    ["WhatsApp", "No me deja elegir doble cara en la impresora del mostrador.", undefined, "resuelto", "liliana", "Esa máquina no tiene dúplex. Se le sugirió la de autoservicio."],
    ["Correo", "Necesito la factura de lo que imprimí en Alto Prado la semana pasada.", undefined, "abierto"],
    ["Llamada", "La app se queda cargando cuando subo un archivo grande desde los datos del celular.", undefined, "abierto"],
    ["WhatsApp", "Imprimí unos planos y salieron en tamaño carta en vez de A4.", undefined, "resuelto", "andres", "Se envió a la impresora de planos con el tamaño correcto."],
    ["Correo", "El escaneo al correo me llega a la carpeta de spam.", undefined, "en revisión", "liliana"],
  ];

  const lista: Omit<Reclamo, "id" | "numero">[] = [
    ...base,
    ...extra.map(([canal, texto, trabajo, estado, resp, nota], i) => {
      const hAhora = horaBogota(t);
      const min = trabajo?.id === "t-codigo" ? 4 : i < 4 ? 60 + i * 38 + Math.round(rnd() * 20) : Math.floor(i / 5 + 1) * 1440 + (hAhora - (8 + ((i * 3.7) % 10))) * 60;
      // quien reclama vive cerca de lo que reclama
      const FIJOS: Record<number, string> = { 7: "u-19", 8: "u-6", 9: "u-24", 10: "u-12", 11: "u-20", 12: "u-18", 13: "u-15", 14: "u-30", 15: "u-25" };
      const usuarioId = trabajo?.usuarioId ?? FIJOS[i] ?? usuarios[(i * 7 + 3) % usuarios.length].id;
      return {
        creado: at2(min),
        usuarioId,
        canal,
        texto,
        trabajoId: trabajo?.id,
        estado,
        responsable: resp,
        prioridad: "normal" as const,
        notas: nota && resp ? [{ autor: resp, texto: nota, hora: at2(min - 6 - Math.round(rnd() * 30)) }] : [],
      };
    }),
  ];

  return lista
    .sort((a, b) => b.creado.localeCompare(a.creado))
    .map((r, i, arr) => ({ ...r, id: `r-${2400 + arr.length - i}`, numero: 2400 + arr.length - i }));
}
