import type { Metadata } from "next"
import { Inter, Space_Grotesk } from "next/font/google"
import "./globals.css"
import { ThemeProvider } from "@/providers/theme-provider"
import { OrganizationSchema } from "@/components/seo/schema-markup"

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
})

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
  display: "swap",
})

export const metadata: Metadata = {
  title: "PayAfrika - Empowering Africa's Digital Economy",
  description:
    "One secure platform for loans, cross-border payments, digital currency exchange, import & export services, and business growth across Africa.",
  keywords: [
    "PayAfrika",
    "African fintech",
    "loans",
    "cross-border payments",
    "currency exchange",
    "import export",
    "business banking",
  ],
  openGraph: {
    title: "PayAfrika - Empowering Africa's Digital Economy",
    description:
      "One secure platform for loans, cross-border payments, digital currency exchange, import & export services, and business growth across Africa.",
    type: "website",
    locale: "en_ZA",
    siteName: "PayAfrika",
  },
  twitter: {
    card: "summary_large_image",
    title: "PayAfrika - Empowering Africa's Digital Economy",
    description:
      "One secure platform for loans, cross-border payments, digital currency exchange, import & export services, and business growth across Africa.",
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                const theme = localStorage.getItem('theme');
                if (theme === 'dark' || (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                  document.documentElement.classList.add('dark');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <OrganizationSchema />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
