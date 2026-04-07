import { Inter, Poppins } from 'next/font/google';
import { Providers } from './providers';
import LayoutContent from './layout-content';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const poppins = Poppins({ 
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-poppins',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL('https://bridgeworkservices.com'),
  title: 'BridgeWork - Easy Home Maintenance',
  description: 'BridgeWork is a web platform that connects homeowners with service providers in real time, based on proximity and availability.',
  keywords: ['home maintenance', 'handyman', 'repairs', 'home services', 'professionals'],
  authors: [{ name: 'BridgeWork Team' }],
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BridgeWork',
  },
  icons: {
    icon: [
      { url: '/icons/favicon-32x32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png', sizes: '16x16', type: 'image/png' },
    ],
    apple: [
      { url: '/icons/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  },
  openGraph: {
    title: 'BridgeWork - Easy Home Maintenance',
    description: 'Connect with certified professionals for all your home maintenance needs',
    type: 'website',
  },
};

export const viewport = {
  themeColor: '#0E7480',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${poppins.variable}`}>
      <body className={`${poppins.className} antialiased`}>
        <Providers>
          <LayoutContent>{children}</LayoutContent>
        </Providers>
      </body>
    </html>
  );
}
