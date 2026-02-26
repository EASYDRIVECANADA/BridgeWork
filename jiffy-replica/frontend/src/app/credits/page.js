import dynamic from 'next/dynamic';

const CreditsClient = dynamic(() => import('./CreditsClient'), { ssr: false });

export default function CreditsPage() {
  return <CreditsClient />;
}
