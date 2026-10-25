import type { Flujo, Impresora, Persona, Punto, Usuario } from "../types";
import { FOTOS, foto } from "../photos";

export const MARCA = { nombre: "Bandeja", lema: "Impresión, copia y escaneo en la nube" };

export const PUNTOS: Punto[] = [
  { id: "p-93", nombre: "Torre Calle 93", ciudad: "Bogotá", direccion: "Cl. 93 # 13-24, piso 8", tipo: "Empresa", liberacion: "directa", foto: FOTOS.lugares[0], horario: "Lun a vie, 7:00 a 19:00" },
  { id: "p-chapi", nombre: "Sede Chapinero", ciudad: "Bogotá", direccion: "Cra. 13 # 63-20, local 2", tipo: "Punto público", liberacion: "código", foto: FOTOS.lugares[1], horario: "Todos los días, 7:00 a 21:00" },
  { id: "p-campus", nombre: "Biblioteca Campus Norte", ciudad: "Bogotá", direccion: "Autopista Norte # 152-40, bloque B", tipo: "Punto público", liberacion: "código", foto: FOTOS.lugares[2], horario: "Lun a sáb, 6:30 a 22:00" },
  { id: "p-poblado", nombre: "Nodo El Poblado", ciudad: "Medellín", direccion: "Cra. 43A # 7-50, piso 3", tipo: "Empresa", liberacion: "directa", foto: FOTOS.lugares[3], horario: "Lun a vie, 7:30 a 19:00" },
  { id: "p-laureles", nombre: "Laureles Circular", ciudad: "Medellín", direccion: "Circular 4 # 70-12", tipo: "Punto público", liberacion: "código", foto: FOTOS.lugares[4], horario: "Lun a sáb, 8:00 a 20:00" },
  { id: "p-jardin", nombre: "Laboratorio Ciudad Jardín", ciudad: "Cali", direccion: "Av. Cañasgordas # 100-15", tipo: "Empresa", liberacion: "directa", foto: FOTOS.lugares[5], horario: "Lun a sáb, 6:00 a 18:00" },
  { id: "p-prado", nombre: "Alto Prado", ciudad: "Barranquilla", direccion: "Cl. 76 # 54-11, local 104", tipo: "Punto público", liberacion: "código", foto: FOTOS.lugares[6], horario: "Lun a sáb, 7:00 a 20:00" },
];

type BaseImp = Omit<Impresora, "ultimoLatido" | "paginasHoy" | "foto"> & { f: number; minSinSenal?: number };

const BASE: BaseImp[] = [
  { id: "i-93-1", nombre: "Recepción, piso 8", modelo: "Ricoh IM C3000", puntoId: "p-93", color: true, escaner: true, estado: "lista", hojas: 410, capacidad: 500, toner: 64, tamano: "Carta", plataforma: "nueva", f: 0 },
  { id: "i-93-2", nombre: "Sala de juntas", modelo: "HP LaserJet M507", puntoId: "p-93", color: false, escaner: false, estado: "atasco", hojas: 220, capacidad: 250, toner: 41, tamano: "Carta", plataforma: "nueva", f: 1 },
  { id: "i-93-3", nombre: "Contabilidad, piso 9", modelo: "Kyocera TASKalfa 2554ci", puntoId: "p-93", color: true, escaner: true, estado: "lista", hojas: 780, capacidad: 1000, toner: 77, tamano: "Carta", plataforma: "nueva", f: 2 },
  { id: "i-chapi-1", nombre: "Mostrador", modelo: "Kyocera TASKalfa 3554ci", puntoId: "p-chapi", color: true, escaner: true, estado: "lista", hojas: 7, capacidad: 500, toner: 58, tamano: "Carta", plataforma: "nueva", f: 3 },
  { id: "i-chapi-2", nombre: "Autoservicio 1", modelo: "Ricoh IM 430F", puntoId: "p-chapi", color: false, escaner: true, estado: "lista", hojas: 460, capacidad: 500, toner: 33, tamano: "Carta", plataforma: "nueva", f: 4 },
  { id: "i-chapi-3", nombre: "Autoservicio 2", modelo: "Ricoh IM 430F", puntoId: "p-chapi", color: false, escaner: true, estado: "tóner bajo", hojas: 395, capacidad: 500, toner: 6, tamano: "Carta", plataforma: "nueva", f: 5 },
  { id: "i-campus-1", nombre: "Sala 1, primer piso", modelo: "Canon imageRUNNER 2630i", puntoId: "p-campus", color: false, escaner: true, estado: "lista", hojas: 610, capacidad: 1100, toner: 52, tamano: "Carta", plataforma: "nueva", f: 6 },
  { id: "i-campus-2", nombre: "Sala 2, segundo piso", modelo: "Canon imageRUNNER 2630i", puntoId: "p-campus", color: false, escaner: true, estado: "sin señal", hojas: 480, capacidad: 1100, toner: 71, tamano: "Carta", plataforma: "actual", f: 7, minSinSenal: 47 },
  { id: "i-campus-3", nombre: "Hemeroteca", modelo: "Epson WorkForce Pro WF-C5890", puntoId: "p-campus", color: true, escaner: true, estado: "lista", hojas: 230, capacidad: 330, toner: 45, tamano: "Carta", plataforma: "actual", f: 8 },
  { id: "i-pob-1", nombre: "Zona común, piso 3", modelo: "Ricoh IM C2500", puntoId: "p-poblado", color: true, escaner: true, estado: "lista", hojas: 340, capacidad: 500, toner: 69, tamano: "Carta", plataforma: "actual", f: 9 },
  { id: "i-pob-2", nombre: "Cabinas", modelo: "Brother MFC-L8900CDW", puntoId: "p-poblado", color: true, escaner: true, estado: "pausada", hojas: 180, capacidad: 300, toner: 88, tamano: "Carta", plataforma: "actual", f: 0 },
  { id: "i-lau-1", nombre: "Mostrador", modelo: "Kyocera ECOSYS M3655idn", puntoId: "p-laureles", color: false, escaner: true, estado: "lista", hojas: 505, capacidad: 600, toner: 38, tamano: "Carta", plataforma: "actual", f: 2 },
  { id: "i-lau-2", nombre: "Color, fondo del local", modelo: "Epson WorkForce Pro WF-C879R", puntoId: "p-laureles", color: true, escaner: true, estado: "lista", hojas: 290, capacidad: 830, toner: 61, tamano: "Carta", plataforma: "actual", f: 3 },
  { id: "i-jar-1", nombre: "Entrega de resultados", modelo: "HP Color LaserJet MFP M480f", puntoId: "p-jardin", color: true, escaner: true, estado: "lista", hojas: 260, capacidad: 300, toner: 54, tamano: "A4", plataforma: "actual", f: 4 },
  { id: "i-jar-2", nombre: "Facturación", modelo: "HP LaserJet M406dn", puntoId: "p-jardin", color: false, escaner: false, estado: "lista", hojas: 230, capacidad: 350, toner: 47, tamano: "Carta", plataforma: "actual", f: 1 },
  { id: "i-prado-1", nombre: "Mostrador", modelo: "Canon imageRUNNER C3226i", puntoId: "p-prado", color: true, escaner: true, estado: "imprimiendo", hojas: 350, capacidad: 650, toner: 72, tamano: "Carta", plataforma: "actual", f: 6 },
  { id: "i-prado-2", nombre: "Autoservicio", modelo: "Ricoh IM 350F", puntoId: "p-prado", color: false, escaner: true, estado: "lista", hojas: 420, capacidad: 500, toner: 29, tamano: "Carta", plataforma: "actual", f: 5 },
  { id: "i-prado-3", nombre: "Planos y afiches", modelo: "Epson SureColor T3170", puntoId: "p-prado", color: true, escaner: false, estado: "lista", hojas: 40, capacidad: 50, toner: 66, tamano: "A4", plataforma: "actual", f: 8 },
];

export function crearImpresoras(t: number): Impresora[] {
  return BASE.map(({ f, minSinSenal, ...b }, i) => ({
    ...b,
    foto: foto(FOTOS.impresoras[f % FOTOS.impresoras.length], 640, 440),
    ultimoLatido: new Date(t - (minSinSenal ? minSinSenal * 60e3 : 4000 + ((i * 7919) % 50) * 1000)).toISOString(),
    paginasHoy: 0,
  }));
}

export const EQUIPO: Persona[] = [
  { id: "marcela", nombre: "Marcela Ortiz", cargo: "Soporte a usuarios", foto: FOTOS.equipo[0] },
  { id: "andres", nombre: "Andrés Quiroga", cargo: "Operaciones", foto: FOTOS.equipo[1] },
  { id: "liliana", nombre: "Liliana Pérez", cargo: "Soporte a usuarios", foto: FOTOS.equipo[2] },
  { id: "tomas", nombre: "Tomás Vélez", cargo: "Técnico de campo", foto: FOTOS.equipo[3] },
];

export const persona = (id?: string) => EQUIPO.find((p) => p.id === id);

const NOMBRES: [string, Usuario["app"], string, string?][] = [
  ["Valentina Ríos", "iOS", "p-93", "Andina Legal"],
  ["Santiago Mejía", "Android", "p-chapi"],
  ["Daniela Ospina", "Web", "p-93", "Andina Legal"],
  ["Andrés Felipe Cárdenas", "Android", "p-campus"],
  ["Laura Gómez", "iOS", "p-poblado", "Nodo El Poblado"],
  ["Camilo Restrepo", "Web", "p-poblado", "Nodo El Poblado"],
  ["María José Peña", "iOS", "p-chapi"],
  ["Sebastián Duque", "Android", "p-laureles"],
  ["Natalia Vargas", "Web", "p-93", "Andina Legal"],
  ["Felipe Arango", "Android", "p-campus"],
  ["Carolina Cifuentes", "iOS", "p-jardin", "Laboratorio Ciudad Jardín"],
  ["Mateo Londoño", "Android", "p-laureles"],
  ["Paula Andrea Zuluaga", "Web", "p-jardin", "Laboratorio Ciudad Jardín"],
  ["Julián Castaño", "Android", "p-chapi"],
  ["Isabela Torres", "iOS", "p-campus"],
  ["Alejandro Montoya", "Web", "p-poblado", "Nodo El Poblado"],
  ["Mariana Quintero", "Android", "p-prado"],
  ["Diego Salazar", "iOS", "p-prado"],
  ["Catalina Henao", "Web", "p-93", "Andina Legal"],
  ["Óscar Rincón", "Android", "p-chapi"],
  ["Luisa Fernanda Bernal", "iOS", "p-campus"],
  ["Jorge Iván Patiño", "Android", "p-laureles"],
  ["Sara Echeverri", "iOS", "p-poblado", "Nodo El Poblado"],
  ["Nicolás Bedoya", "Android", "p-campus"],
  ["Manuela Correa", "Web", "p-jardin", "Laboratorio Ciudad Jardín"],
  ["Esteban Giraldo", "Android", "p-laureles"],
  ["Ana María Lozano", "iOS", "p-93", "Andina Legal"],
  ["Ricardo Pineda", "Web", "p-prado"],
  ["Gloria Amparo Suárez", "Android", "p-jardin", "Laboratorio Ciudad Jardín"],
  ["Hernán Ocampo", "Android", "p-prado"],
  ["Tatiana Muñoz", "iOS", "p-chapi"],
  ["Kevin Arias", "Android", "p-campus"],
  ["Yuliana Mosquera", "Android", "p-prado"],
  ["Wilson Palacios", "Web", "p-chapi"],
  ["Lina Marcela Rojas", "iOS", "p-93", "Andina Legal"],
  ["Cristian Agudelo", "Android", "p-laureles"],
  ["Angélica Mora", "Web", "p-campus"],
  ["Fabián Toro", "iOS", "p-poblado", "Nodo El Poblado"],
  ["Ximena Beltrán", "Android", "p-chapi"],
  ["Mauricio Lenis", "Web", "p-jardin", "Laboratorio Ciudad Jardín"],
];

const quitarTildes = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "");

export function crearUsuarios(): Usuario[] {
  return NOMBRES.map(([nombre, app, puntoId, empresa], i) => {
    const partes = quitarTildes(nombre).toLowerCase().split(" ");
    const dominio = empresa ? quitarTildes(empresa).toLowerCase().replace(/[^a-z]/g, "") + ".co" : ["gmail.com", "hotmail.com", "outlook.com"][i % 3];
    return {
      id: `u-${i + 1}`,
      nombre,
      app,
      puntoId,
      empresa,
      celular: `3${["00", "01", "10", "12", "15", "17", "20", "23", "05", "18"][i % 10]}${String(4000000 + ((i * 482911) % 5999999)).padStart(7, "0")}`,
      correo: `${partes[0]}.${partes[partes.length - 1]}@${dominio}`,
      foto: i < FOTOS.usuarios.length ? FOTOS.usuarios[i] : undefined,
    };
  });
}

export const FLUJOS: Flujo[] = [
  { id: "f-web", nombre: "Impresión desde la web", descripcion: "El usuario sube el archivo en el navegador y elige la impresora.", plataforma: "nueva", fase: "en prueba", icono: "web", trabajosHoy: 0 },
  { id: "f-ios", nombre: "Impresión desde iPhone", descripcion: "Mismo recorrido, desde la app de iOS.", plataforma: "actual", fase: "pendiente", icono: "ios", trabajosHoy: 0 },
  { id: "f-android", nombre: "Impresión desde Android", descripcion: "Mismo recorrido, desde la app de Android.", plataforma: "actual", fase: "pendiente", icono: "android", trabajosHoy: 0 },
  { id: "f-copia", nombre: "Copia en el panel", descripcion: "La copia se inicia en la máquina y queda en el registro.", plataforma: "actual", fase: "pendiente", icono: "copia", trabajosHoy: 0 },
  { id: "f-esc-cel", nombre: "Escaneo al celular", descripcion: "Se escanea en la máquina y el PDF llega a la app.", plataforma: "actual", fase: "pendiente", icono: "escaneo-cel", trabajosHoy: 0 },
  { id: "f-esc-mail", nombre: "Escaneo al correo", descripcion: "Se escanea en la máquina y el PDF llega por correo.", plataforma: "actual", fase: "pendiente", icono: "escaneo-correo", trabajosHoy: 0 },
];
