import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    latestVersion: '2.1.0',
    versionCode: 3,
    releaseDate: '2026-09-03',
    minSupportedVersion: '1.0.0',
    downloadPageUrl: 'https://www.theshepherdsdesk.app/download',
    apkDownloadUrl: 'https://expo.dev/artifacts/eas/v920jrq50eESuxJjKxVKWIKF5a5tDtk07wgf01J_CFc.apk',
    releaseNotes: 'Pulpit Mode live timer, multi-day Devotional Generator, Hebrew/Greek Study Concordance & Commentary, Snap Notes (photo OCR), live Voice Dictation, slide-out hamburger menu, and Admin dashboard.',
  });
}
