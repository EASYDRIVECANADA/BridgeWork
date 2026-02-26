import dynamic from 'next/dynamic';

const InsuranceClient = dynamic(() => import('./InsuranceClient'), { ssr: false });

export default function InsurancePage() {
  return <InsuranceClient />;
}
