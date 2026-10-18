import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "./theme.css";
import MainLayout from "./components/MainLayout";
import Providers from "./providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const themeInitScript = `
  (function () {
    try {
      var queryTenant = new URLSearchParams(window.location.search).get('estabelecimento');
      var pathMatch = window.location.pathname.match(/^\/e\/([a-z0-9]+(?:-[a-z0-9]+)*)(?:\/|$)/);
      var pathTenant = pathMatch && pathMatch[1];
      var requestedTenant = pathTenant || queryTenant;
      if (requestedTenant && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(requestedTenant)) sessionStorage.setItem('controlae:tab-tenant', requestedTenant);
      var tenant = sessionStorage.getItem('controlae:tab-tenant') || 'tenant-unresolved';
      var saved = localStorage.getItem('controlae-color-theme:' + tenant);
      var dark = saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
      var theme = dark ? 'dark' : 'light';
      document.documentElement.classList.toggle('dark', dark);
      document.documentElement.dataset.theme = theme;
      document.documentElement.style.colorScheme = theme;
    } catch (_) {}
  })();
`;

export const metadata: Metadata = {
  title: "ControlaÊ | Sistema de Gestão",
  description: "Operação e gestão do estabelecimento com o ControlaÊ",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "ControlaÊ",
  },
};

export const viewport: Viewport = {
  themeColor: "#ea580c",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>
          <MainLayout>
            {children}
          </MainLayout>
        </Providers>
      </body>
    </html>
  );
}
