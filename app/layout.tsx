import './globals.css';

export const metadata = {
  title: 'Property Transformation Discovery',
  description: 'Agentic discovery, risk and technology maturity assessment for property operations.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
