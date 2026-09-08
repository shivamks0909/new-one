import React from 'react';
import { renderRedirectStatusPage } from '@/lib/redirectStatusPage';

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
  const pid = searchParams.pid || searchParams.code || searchParams.project || searchParams.offerId || 'fwdw42';
  const uid = searchParams.uid || searchParams.zid || searchParams.id || 'P-12345';

  const html = renderRedirectStatusPage({
    statusKey,
    pid,
    uid,
  });

  return (
    <div
      dangerouslySetInnerHTML={{ __html: html }}
      style={{ width: '100%', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}
    />
  );
}
