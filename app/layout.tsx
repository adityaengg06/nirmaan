import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "NIRMAAN | Small tap. Big possibilities.", description: "Custom NFC and QR cards for Google reviews, digital menus and business connections. Managed by Infotech Business Solutions." };
export default function RootLayout({children}: {children: React.ReactNode}) {return <html lang="en"><body>{children}</body></html>}
