import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { LANG_COOKIE, parseAcceptLanguage, resolveLanguage } from '@/src/i18n/core';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import './tia.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

const lang = async () => resolveLanguage((await cookies()).get(LANG_COOKIE)?.value, parseAcceptLanguage((await headers()).get('accept-language')));

export async function generateMetadata(): Promise<Metadata> {
  return (await lang()) === 'tr'
    ? { title: 'PLC Lab Web – S7-1200 Endüstriyel Eğitim', description: 'Ladder mantığı, PLC simülasyonu ve endüstriyel problemler.' }
    : { title: 'PLC Lab Web – S7-1200 Industrial Trainer', description: 'Ladder logic, PLC simulation and industrial problems.' };
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={await lang()}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

