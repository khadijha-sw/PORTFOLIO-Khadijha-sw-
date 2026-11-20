import './globals.css';

export const metadata = {
  title: 'Khadijha.SW | Starey Wonder AI Architecture Portfolio',
  description:
    'Systems architect and AI automation agency by Khadijha Habib. Building high-performance autonomous workflows.',
};

const themeInitScript = `
  (function () {
    try {
      var saved = localStorage.getItem('theme');
      var isDark = saved ? saved === 'dark' : true;
      var root = document.documentElement;
      if (isDark) {
        root.classList.add('dark');
        root.classList.remove('light');
        root.setAttribute('data-theme', 'dark');
      } else {
        root.classList.remove('dark');
        root.classList.add('light');
        root.setAttribute('data-theme', 'light');
      }
    } catch (e) {}
  })();
`;

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="antialiased">{children}</body>
    </html>
  );
}