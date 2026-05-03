import type { Metadata } from 'next';
import { getOpsControlData } from './actions';
import OpsControlClient from '@/components/OpsControlClient';

export const metadata: Metadata = {
  title: 'Ops Control · Mission Control',
  description: 'Background operations, scheduled jobs, and active processes dashboard.',
};

// Revalidate every 60 seconds so the page stays reasonably fresh on SSR.
export const revalidate = 60;

export default async function OpsControlPage() {
  const data = await getOpsControlData();

  return (
    <OpsControlClient
      data={data}
      onRefresh={getOpsControlData}
    />
  );
}
