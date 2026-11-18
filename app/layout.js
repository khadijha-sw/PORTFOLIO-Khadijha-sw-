import './globals.css';

export const metadata = {
  title: 'Khadijha.SW | Starey Wonder AI Architecture Portfolio',
  description: 'Systems architect and AI automation agency by Khadijha Habib. Building high-performance autonomous workflows.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body className="antialiased">{children}</body>
    </html>
  );
}
