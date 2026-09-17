import { redirect } from 'next/navigation';

export interface PageProps {
  params: {
    status: string;
  };
  searchParams: {
    pid?: string;
    uid?: string;
    [key: string]: string | undefined;
  };
}

export default function RedirectStatusRoute({ params, searchParams }: PageProps) {
  const statusKey = params.status || 'complete';
  const cleanParams = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v !== undefined) cleanParams.set(k, v);
  }
  const qs = cleanParams.toString();
  redirect(`/api/redirect/${statusKey}${qs ? `?${qs}` : ''}`);
}
