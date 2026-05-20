import type { Metadata } from "next"
import localFont from "next/font/local"
import { Nunito, Open_Sans, Space_Mono } from "next/font/google"
import { GoogleAnalytics } from '@next/third-parties/google'
import "./globals.css"

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
})
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
})
const nunito = Nunito({
  subsets: ["latin"],
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800", "900"],
})
const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  weight: ["300", "400", "500", "600", "700", "800"],
})
const spaceMono = Space_Mono({
  subsets: ["latin"],
  variable: "--font-space-mono",
  weight: ["700"],
})

export const metadata: Metadata = {
  title: 'Rexlo — AI-Powered GST Intelligence for CA Firms',
  description: 'AI agents that help CA firms recover ITC, automate reconciliation, and triple client capacity. Turn GST compliance into your biggest revenue driver.',
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${nunito.variable} ${openSans.variable} ${spaceMono.variable} antialiased`}
      >
        {children}
      </body>
      {process.env.NEXT_PUBLIC_GA_ID && (
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      )}
    </html>
  )
}
