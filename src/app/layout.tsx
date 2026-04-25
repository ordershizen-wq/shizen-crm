import type { Metadata } from 'next';
import './globals.css';
import './legacy.css';

export const metadata: Metadata = {
  title: 'CRM Shizen',
  description: 'ระบบจัดการลูกค้าและออเดอร์',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://cdn.jsdelivr.net/npm/remixicon@3.5.0/fonts/remixicon.css"
          rel="stylesheet"
        />
      </head>
      <body className="legacy-body">
        {children}
      </body>
    </html>
  );
}
