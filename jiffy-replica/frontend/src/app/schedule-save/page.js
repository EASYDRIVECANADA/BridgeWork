import dynamic from 'next/dynamic';

const ScheduleSaveClient = dynamic(() => import('./ScheduleSaveClient'), { ssr: false });

export default function ScheduleSavePage() {
  return <ScheduleSaveClient />;
}
