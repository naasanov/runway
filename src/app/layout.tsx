import type { Metadata } from "next";
import localFont from "next/font/local";
import { Syne, Instrument_Serif } from "next/font/google";
import "./globals.css";
import { Auth0Provider } from "@auth0/nextjs-auth0/client";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
});

const instrumentSerif = Instrument_Serif({
  subsets: ["latin"],
  variable: "--font-instrument",
  weight: "400",
  style: "italic",
});

export const metadata: Metadata = {
  title: "Runway",
  description: "AI-Powered Cash Flow Intelligence for Small Businesses",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} ${instrumentSerif.variable} antialiased`}
      >
        <Auth0Provider>{children}</Auth0Provider>
      </body>
    </html>
  );
}
