import type { Metadata, Viewport } from "next";
import { Lexend } from "next/font/google";
import "./globals.css";
import { StoreProvider } from "@/lib/store";
import Shell from "@/components/Shell";

const lexend = Lexend({ subsets: ["latin"], weight: ["400", "500", "600", "700", "800"] });

export const metadata: Metadata = {
  title: { default: "Bandeja | Impresión, copia y escaneo en la nube", template: "%s | Bandeja" },
  description: "Cada trabajo enviado desde el celular o el navegador, con su recorrido completo hasta que la impresora confirma la última hoja.",
};

export const viewport: Viewport = {
  themeColor: "#2f5bea",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className={lexend.className}>
        <StoreProvider>
          <Shell>{children}</Shell>
        </StoreProvider>
      </body>
    </html>
  );
}
