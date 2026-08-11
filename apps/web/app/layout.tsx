import './globals.css';

export const metadata = {
  title: 'Fintech App',
  description: 'Voucher Management',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}