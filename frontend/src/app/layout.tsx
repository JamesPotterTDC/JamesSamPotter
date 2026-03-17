import type { Metadata } from "next";
import { Inter, Space_Grotesk, Bebas_Neue } from "next/font/google";
import { AuthProvider } from "@/contexts/AuthContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const bebasNeue = Bebas_Neue({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-bebas",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Peaklog | Sport Performance Dashboard",
  description: "Your rides. Your data. Your dashboard. A free, shareable sport performance dashboard powered by Strava.",
  icons: {
    icon: '/logo.jpg',
    apple: '/logo.jpg',
  },
  openGraph: {
    title: 'Peaklog | Sport Performance Dashboard',
    description: 'Your rides. Your data. Your dashboard. A free, shareable sport performance dashboard powered by Strava.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${spaceGrotesk.variable} ${bebasNeue.variable}`}>
      <body className="antialiased bg-void font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
