import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    latestVersion: '2.1.2',
    versionCode: 5,
    releaseDate: '2026-09-04',
    minSupportedVersion: '1.0.0',
    downloadPageUrl: 'https://www.theshepherdsdesk.app/download',
    apkDownloadUrl: 'https://expo.dev/artifacts/eas/mluwee1TyZ4AG63TL5smrhhg_9zlgDMs8jwGC6pEZr0.apk',
    releaseNotes: 'Personalized pastoral titles & greetings (Pastor, Minister, Teacher, Preacher...), clean sermon notes formatting, and profile updates.',
  });
}
