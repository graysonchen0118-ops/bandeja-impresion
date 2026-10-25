"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeftRight, Headset, LayoutDashboard, ListChecks, Menu, Printer, Send, X } from "lucide-react";
import { Fondo } from "./three/Scenes";
import { Avatar, Toasts } from "./ui";
import { useStore } from "@/lib/store";
import { EQUIPO, MARCA } from "@/lib/mock/red";
import { hora } from "@/lib/format";

const NAV = [
  { href: "/", texto: "Inicio", icono: LayoutDashboard },
  { href: "/imprimir", texto: "Enviar a imprimir", icono: Send },
  { href: "/trabajos", texto: "Trabajos", icono: ListChecks, cuenta: "detenidos" as const },
  { href: "/impresoras", texto: "Impresoras", icono: Printer, cuenta: "impresoras" as const },
  { href: "/soporte", texto: "Soporte", icono: Headset, cuenta: "reclamos" as const },
  { href: "/migracion", texto: "Cambio de plataforma", icono: ArrowLeftRight },
];

export default function Shell({ children }: { children: React.ReactNode }) {
  const ruta = usePathname();
  const [abierto, setAbierto] = useState(false);
  const { trabajos, impresoras, reclamos, listo, tick } = useStore();
  const cuentas = {
    detenidos: trabajos.filter((t) => t.estado === "detenido").length,
    impresoras: impresoras.filter((i) => ["sin señal", "sin papel", "atasco"].includes(i.estado)).length,
    reclamos: reclamos.filter((r) => r.estado === "abierto").length,
  };
  const actual = NAV.find((n) => (n.href === "/" ? ruta === "/" : ruta.startsWith(n.href)));
  const yo = EQUIPO[0];
  const conSenal = impresoras.filter((i) => i.estado !== "sin señal").length;

  useEffect(() => setAbierto(false), [ruta]);

  return (
    <div className="app">
      <Fondo />
      <aside className={`sidebar ${abierto ? "open" : ""}`}>
        <div className="brand">
          <span className="brand-mark">
            <Printer size={20} strokeWidth={2.4} />
          </span>
          <span className="brand-txt">
            <strong>{MARCA.nombre}</strong>
            <small>{MARCA.lema}</small>
          </span>
          <button className="icon-btn cerrar-menu" onClick={() => setAbierto(false)} aria-label="Cerrar menú">
            <X size={18} />
          </button>
        </div>
        <nav className="nav">
          {NAV.map((n) => {
            const on = actual?.href === n.href;
            const cuenta = n.cuenta ? cuentas[n.cuenta] : 0;
            const Ic = n.icono;
            return (
              <Link key={n.href} href={n.href} className={`nav-item ${on ? "on" : ""}`}>
                <Ic size={19} />
                <span>{n.texto}</span>
                {listo && cuenta > 0 && <em className={n.cuenta === "detenidos" || n.cuenta === "impresoras" ? "cuenta roja" : "cuenta"}>{cuenta}</em>}
              </Link>
            );
          })}
        </nav>
        <div className="side-foot">
          <div className="senal">
            <span className="senal-ic">
              <Printer size={16} />
            </span>
            <div>
              <small>Impresoras con señal</small>
              <strong>{listo ? `${conSenal} de ${impresoras.length}` : "..."}</strong>
            </div>
            <span className="punto-vivo" aria-label="Recibiendo avisos" />
          </div>
          <div className="quien">
            <Avatar src={yo.foto} alt={yo.nombre} size={38} />
            <div>
              <strong>{yo.nombre}</strong>
              <small>{yo.cargo}</small>
            </div>
          </div>
        </div>
      </aside>
      <div className={`scrim ${abierto ? "show" : ""}`} onClick={() => setAbierto(false)} />
      <div className="main">
        <header className="topbar">
          <button className="icon-btn menu-btn" onClick={() => setAbierto(true)} aria-label="Abrir menú">
            <Menu size={20} />
          </button>
          <div className="top-tit">
            <small>{MARCA.nombre}</small>
            <strong>{actual?.texto ?? MARCA.nombre}</strong>
          </div>
          <div className="top-der">
            <span className="reloj-chip">
              <span className="punto-vivo" /> {listo ? `Bogotá ${hora(new Date(tick).toISOString())}` : "Conectando"}
            </span>
          </div>
        </header>
        <main className="content">{children}</main>
        <footer className="footer">
          <span>© 2026 {MARCA.nombre} · {MARCA.lema}</span>
          <span>Fotos: Unsplash</span>
        </footer>
      </div>
      <Toasts />
    </div>
  );
}
