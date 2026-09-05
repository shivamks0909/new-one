import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ToastProvider } from '@/components/ui/Toast';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export const metadata: Metadata = {
  title: 'Opinion Insights — CAWI Fieldwork & Survey Tracking Platform',
  description: 'Opinion Insights — Enterprise Market Research CAWI Fieldwork Operations & Respondent Tracking System',
  icons: {
    icon: '/static/logo.png',
    shortcut: '/static/logo.png',
    apple: '/static/logo.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="icon" href="/static/logo.png" type="image/png" />
        <link rel="shortcut icon" href="/static/logo.png" type="image/png" />
        <link rel="apple-touch-icon" href="/static/logo.png" />
      </head>
      <body className="font-[var(--font-inter)] antialiased" suppressHydrationWarning>
        <ToastProvider>
          {children}
        </ToastProvider>
      </body>
    </html>
  );
}
