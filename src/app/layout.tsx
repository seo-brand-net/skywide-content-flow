import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

import { Providers } from "@/components/providers";
import { ClientGlobalLayout } from "@/components/ClientGlobalLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Skywide - SEO Brand",
  description: "Skywide Content Engine",
};

import { createClient } from "@/utils/supabase/server";

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Get session separately if needed for initial state
  // We avoid getSession() on the server to prevent "insecure" warnings.
  // The client-side AuthProvider will handle session refresh if needed.
  const session = null;

  // Fetch initial profile on the server to prevent hydration flickers
  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers
          initialUser={user}
          initialSession={session}
          initialProfile={profile}
        >
          <ClientGlobalLayout>
            {children}
          </ClientGlobalLayout>
        </Providers>
      </body>
    </html>
  );
}
