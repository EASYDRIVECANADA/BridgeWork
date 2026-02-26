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
  title: 'BridgeWork - Easy Home Maintenance',
  description: 'BridgeWork is a web and mobile platform that connects homeowners with service providers in real time, based on proximity and availability.',
  keywords: ['home maintenance', 'handyman', 'repairs', 'home services', 'professionals'],
  authors: [{ name: 'BridgeWork Team' }],
  openGraph: {
    title: 'BridgeWork - Easy Home Maintenance',
    description: 'Connect with certified professionals for all your home maintenance needs',
    type: 'website',
  },
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
