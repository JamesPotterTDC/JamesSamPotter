import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Cycling Dashboard",
  description: "Personal cycling analytics dashboard powered by Strava",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  );
}
