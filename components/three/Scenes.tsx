"use client";

import dynamic from "next/dynamic";

export const Fondo = dynamic(() => import("./Fondo"), {
  ssr: false,
  loading: () => <div className="bg-fallback" aria-hidden="true" />,
});

export const Planta = dynamic(() => import("./Planta"), {
  ssr: false,
  loading: () => <div className="planta-ph" aria-hidden="true" />,
});

export const Maquina = dynamic(() => import("./Maquina"), {
  ssr: false,
  loading: () => <div className="maquina-ph" aria-hidden="true" />,
});

export const Horas = dynamic(() => import("./Horas"), {
  ssr: false,
  loading: () => <div className="horas-ph skel" aria-hidden="true" />,
});

export const Fila = dynamic(() => import("./Fila"), {
  ssr: false,
  loading: () => <div className="fila-ph" aria-hidden="true" />,
});
