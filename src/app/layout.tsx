import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Inventory & Quotation System | Next.js",
  description:
    "Modular catalog management, bulk-discount & tax quotation builder, stock control, and CSV export.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className="antialiased">
        {children}
      </body>
    </html>
  );
}