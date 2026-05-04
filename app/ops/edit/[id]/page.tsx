import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { execSync } from 'child_process';
import EditCronJobForm from '@/components/EditCronJobForm';

interface CronJob {
  id: string;
  name: string;
  schedule: string;
  enabled: boolean;
  agentId?: string;
  message?: string;
}

async function getCronJob(id: string): Promise<CronJob | null> {
  try {
    const raw = execSync('openclaw cron list --json', { encoding: 'utf8', timeout: 8000 });
    const parsed = JSON.parse(raw);
    const job = (parsed.jobs ?? []).find((j: any) => j.id === id);

    if (!job) {
      return null;
    }

    const scheduleExpr = job.schedule?.expr ?? '';
    let message = '';
    if (job.payload?.kind === 'agentTurn') {
      message = job.payload.message ?? '';
    } else if (job.payload?.kind === 'systemEvent') {
      message = job.payload.text ?? '';
    }

    return {
      id: job.id,
      name: job.name,
      schedule: scheduleExpr,
      enabled: job.enabled ?? true,
      agentId: job.agentId ?? '',
      message,
    };
  } catch (e: unknown) {
    console.error('Error fetching cron job for edit page:', e);
    return null;
  }
}

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const job = await getCronJob(id);
  return {
    title: job ? `Edit ${job.name} · Ops Control` : 'Edit Cron Job · Ops Control',
  };
}

export default async function EditCronJobPage({ params }: Props) {
  const { id } = await params;
  const job = await getCronJob(id);

  if (!job) {
    notFound();
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <a 
          href="/ops" 
          className="text-sm text-gray-400 hover:text-gray-200 flex items-center gap-1"
        >
          ← Back to Ops Control
        </a>
      </div>

      <h1>Edit Cron Job</h1>
      <p className="text-gray-400 mb-6">Modify the schedule and settings for <strong className="text-gray-200">{job.name}</strong></p>

      <EditCronJobForm job={job} />
    </div>
  );
}
