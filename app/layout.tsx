import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ricky AI",
  description: "Your personal AI assistant and life intelligence platform."
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
