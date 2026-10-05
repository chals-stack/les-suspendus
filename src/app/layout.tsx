import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Les Suspendus — Challenge digital",
  description: "Pilotage en temps réel des équipes, budgets, achats et imprévus du challenge.",
  icons: { icon: "/favicon.svg" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
