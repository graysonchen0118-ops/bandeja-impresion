export type Tipo = "Impresión" | "Copia" | "Escaneo";
export type Origen = "iOS" | "Android" | "Web" | "Panel";
export type Plataforma = "nueva" | "actual";
export type Formato = "PDF" | "Word" | "Excel" | "PowerPoint" | "Imagen";
export type Tamano = "Carta" | "Oficio" | "A4";

export type Estado =
  | "convirtiendo"
  | "en cola"
  | "esperando código"
  | "imprimiendo"
  | "impreso"
  | "detenido"
  | "fallido"
  | "cancelado"
  | "procesando"
  | "entregado";

/** quién dijo cada cosa: el celular, la nube o la impresora */
export type Fuente = "celular" | "web" | "nube" | "impresora" | "soporte";

export type Etapa =
  | "subido"
  | "convertido"
  | "en cola"
  | "liberado"
  | "tomado"
  | "impreso"
  | "detenido"
  | "reanudado"
  | "reenviado"
  | "cancelado"
  | "fallido"
  | "escaneado"
  | "procesado"
  | "entregado";

export interface Evento {
  etapa: Etapa;
  hora: string;
  fuente: Fuente;
  texto: string;
}

export interface Trabajo {
  id: string;
  codigo: string;
  tipo: Tipo;
  origen: Origen;
  usuarioId: string;
  archivo: string;
  formato: Formato;
  paginas: number;
  copias: number;
  color: boolean;
  dobleCara: boolean;
  tamano: Tamano;
  impresoraId: string;
  plataforma: Plataforma;
  estado: Estado;
  motivo?: string;
  ajuste?: string;
  creado: string;
  eventos: Evento[];
  hojasImpresas: number;
  costo: number;
  destino?: "Celular" | "Correo";
  codigoLiberacion?: string;
}

export type EstadoImpresora = "lista" | "imprimiendo" | "sin papel" | "atasco" | "tóner bajo" | "pausada" | "sin señal";

export interface Impresora {
  id: string;
  nombre: string;
  modelo: string;
  puntoId: string;
  color: boolean;
  escaner: boolean;
  estado: EstadoImpresora;
  ultimoLatido: string;
  hojas: number;
  capacidad: number;
  toner: number;
  tamano: Tamano;
  plataforma: Plataforma;
  foto: string;
  paginasHoy: number;
  /** trabajos de la plataforma actual que faltan por terminar antes de cambiar de conector */
  vaciando?: number;
}

export interface Punto {
  id: string;
  nombre: string;
  ciudad: string;
  direccion: string;
  tipo: "Empresa" | "Punto público";
  liberacion: "directa" | "código";
  foto: string;
  horario: string;
}

export interface Usuario {
  id: string;
  nombre: string;
  celular: string;
  correo: string;
  app: "iOS" | "Android" | "Web";
  puntoId: string;
  empresa?: string;
  foto?: string;
}

export interface Persona {
  id: string;
  nombre: string;
  cargo: string;
  foto: string;
}

export type EstadoReclamo = "abierto" | "en revisión" | "resuelto";

export interface Nota {
  autor: string;
  texto: string;
  hora: string;
}

export interface Reclamo {
  id: string;
  numero: number;
  creado: string;
  usuarioId: string;
  canal: "Llamada" | "WhatsApp" | "Correo";
  texto: string;
  trabajoId?: string;
  estado: EstadoReclamo;
  responsable?: string;
  prioridad: "alta" | "normal";
  notas: Nota[];
}

export interface Flujo {
  id: string;
  nombre: string;
  descripcion: string;
  plataforma: Plataforma;
  fase: "estable" | "en prueba" | "pendiente";
  icono: "web" | "ios" | "android" | "copia" | "escaneo-cel" | "escaneo-correo";
  trabajosHoy: number;
}
