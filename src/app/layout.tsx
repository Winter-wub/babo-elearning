import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { APP_NAME, APP_DESCRIPTION } from "@/lib/constants";
import { getThemeSettings } from "@/actions/theme.actions";
import { ThemeStyle } from "@/components/providers/theme-style";
import { Toaster } from "@/components/providers/toast-provider";
import { GoogleTagManager } from "@next/third-parties/google";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: APP_NAME,
    template: `%s | ${APP_NAME}`,
  },
  description: APP_DESCRIPTION,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const themeSettings = await getThemeSettings();
  const gtmId = process.env.NEXT_PUBLIC_GTM_ID;

  return (
    <html
      lang="en"
      data-default-mode={themeSettings.defaultMode}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased${themeSettings.defaultMode === "dark" ? " dark" : ""}`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var t=localStorage.getItem("theme");if(!t){t=document.documentElement.dataset.defaultMode||"light"}if(t==="dark"){document.documentElement.classList.add("dark")}else{document.documentElement.classList.remove("dark")}}catch(e){}})()`,
          }}
        />
        <ThemeStyle settings={themeSettings} />
      </head>
      <body className="min-h-full flex flex-col bg-background text-foreground transition-colors duration-200">
        {children}
        <Toaster />
        {gtmId && process.env.NODE_ENV === "production" && (
          <GoogleTagManager gtmId={gtmId} />
        )}
      </body>
    </html>
  );
}
