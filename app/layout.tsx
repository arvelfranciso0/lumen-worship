import type { Metadata } from "next";
import { Instrument_Sans, Instrument_Serif, JetBrains_Mono, Inter, Poppins, Playfair_Display, Merriweather } from "next/font/google";
import "./globals.css";

const instrumentSans = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const jetBrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter-raw",
  subsets: ["latin"],
});

const poppins = Poppins({
  variable: "--font-poppins-raw",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const playfairDisplay = Playfair_Display({
  variable: "--font-playfair-raw",
  subsets: ["latin"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather-raw",
  subsets: ["latin"],
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "Lumen Worship",
  description: "Live lyrics presentation for worship gatherings",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${instrumentSans.variable} ${instrumentSerif.variable} ${jetBrainsMono.variable} ${inter.variable} ${poppins.variable} ${playfairDisplay.variable} ${merriweather.variable}`}
    >
      <body className="h-screen overflow-hidden">{children}</body>
    </html>
  );
}
