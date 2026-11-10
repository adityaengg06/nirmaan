import type { Metadata } from "next";
import "./globals.css";
import WhatsAppChat from "../components/nirmaan/whatsapp-chat";
import IntroAnimation from "../components/nirmaan/intro-animation";
export const metadata: Metadata = { title: "NIRMAAN | Small tap. Big possibilities.", description: "Custom NFC and QR cards for Google reviews, digital menus and business connections. Managed by Infotech Business Solutions." };
export default function RootLayout({children}: {children: React.ReactNode}) {return <html lang="en" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:"try{document.documentElement.dataset.nirmaanIntro=location.pathname==='/'&&sessionStorage.getItem('nirmaan-intro-seen-v1')!=='1'?'play':'seen'}catch(e){}"}}/></head><body><IntroAnimation/><div id="site-content">{children}<WhatsAppChat/></div><noscript><style>{'.intro-overlay{display:none!important}'}</style></noscript></body></html>}
