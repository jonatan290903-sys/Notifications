import './globals.css';

export const metadata = {
  title: 'Recordatorios Empresa',
  description: 'Gestión de recordatorios empresariales',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
