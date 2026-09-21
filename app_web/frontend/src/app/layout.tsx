import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Fuentes Geist auto-alojadas (next/font/local) para no depender de
// fonts.googleapis.com al compilar o en desarrollo. Archivos descargados
// del paquete npm "geist" (ver LICENSE.txt en esta carpeta).
const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Trekko | Turismo amazónico",
    template: "%s | Trekko",
  },
  description:
    "Trekko conecta agencias turísticas con viajeros: descubre destinos, descárgalos offline y vive la Amazonía.",
};

export default function LayoutRaiz({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-zinc-50 text-zinc-900">
        {children}
      </body>
    </html>
  );
}