'use client';

import { usePathname } from 'next/navigation';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';
import { ToastContainer } from 'react-toastify';

export default function LayoutContent({ children }) {
  const pathname = usePathname();
  
  // Hide Navbar and Footer on help page
  const hideNavAndFooter = pathname === '/help';
  const hideNavbar = pathname === '/login' || pathname === '/pro-login' || hideNavAndFooter;
  
  // Hide only Footer on auth pages (keep Navbar except /login, /pro-login)
  const hideFooter =
    pathname === '/login' ||
    pathname === '/signup' ||
    pathname === '/pro-login' ||
    hideNavAndFooter;

  return (
    <>
      {!hideNavbar && <Navbar />}
      {children}
      {!hideFooter && <Footer />}
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}
