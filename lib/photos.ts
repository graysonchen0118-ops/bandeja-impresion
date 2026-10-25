// Fotos reales de Unsplash (licencia Unsplash). Se piden ya recortadas al tamaño de uso.
const U = (id: string, w: number, h: number, extra = "") => `https://images.unsplash.com/${id}?w=${w}&h=${h}&fit=crop&q=80&auto=format${extra}`;

export const foto = (id: string, w: number, h: number) => U(id, w, h);
export const cara = (id: string, s = 96) => U(id, s, s, "&crop=faces");

const IMPRESORAS = [
  "photo-1650094980833-7373de26feb6",
  "photo-1666101041092-468eb2818c87",
  "photo-1721830834983-f111ad63dbf4",
  "photo-1650696868612-4b836291b323",
  "photo-1708793699492-5fa208f52dcb",
  "photo-1553605498-2ff611d4bae4",
  "photo-1674643736315-8630cf68b5ab",
  "photo-1674644653898-5edf4ac87c52",
  "photo-1672356203083-a0206308c7ea",
  "photo-1656646424401-2ae620092397",
];

const LUGARES = [
  "photo-1524783091248-e1ea991d104f",
  "photo-1576602976047-174e57a47881",
  "photo-1683319598210-d70486f2f996",
  "photo-1527192491265-7e15c55b1ed2",
  "photo-1779684998928-2d824ee831cf",
  "photo-1769449771082-07dcd4a8d8d0",
  "photo-1556741533-6e6a62bd8b49",
];

const EQUIPO = [
  "photo-1586391975091-40b8eb04bfc7",
  "photo-1594823825986-a3e022974919",
  "photo-1654404886290-3d27a00bf4fa",
  "photo-1758874574397-e56dfcfc116d",
];

// en el mismo orden que la lista de usuarios
const USUARIOS = [
  "photo-1581322929625-f4aab333778a",
  "photo-1695927621677-ec96e048dce2",
  "photo-1571756978657-e7db0b92f7d1",
  "photo-1757744705465-ea08b0ddc38a",
  "photo-1701728667207-54b43dbdab97",
  "photo-1625241152315-4a698f74ceb7",
  "photo-1544725176-7c40e5a71c5e",
  "photo-1642583758115-fa78e451c044",
  "photo-1607990283143-e81e7a2c9349",
  "photo-1554454188-f84071b1695f",
  "photo-1581322929597-aa39ca1ccff7",
  "photo-1600180758890-6b94519a8ba6",
  "photo-1607503873903-c5e95f80d7b9",
  "photo-1500648767791-00dcc994a43e",
  "photo-1494790108377-be9c29b29330",
  "photo-1507003211169-0a1dd7228f2d",
  "photo-1609371497456-3a55a205d5eb",
  "photo-1596200602473-ad8bf189f880",
  "photo-1573497019940-1c28c88b4f3e",
  "photo-1533101585792-27f81a845550",
  "photo-1783953777286-6b0f98ff647c",
  "photo-1535643302794-19c3804b874b",
  "photo-1617336995982-be3cad51764e",
  "photo-1556452578-f140ac938de9",
];

export const FOTOS = {
  impresoras: IMPRESORAS,
  lugares: LUGARES.map((id) => foto(id, 720, 420)),
  equipo: EQUIPO.map((id) => cara(id)),
  usuarios: USUARIOS.map((id) => cara(id)),
};
