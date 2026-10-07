'use client'

import { useEffect, useState } from 'react'

// Public landing page for the "Continue on your phone" QR code on the web Care page.
// It tries to open the mobile app straight to the contact import (shepherdsdesk://import-contacts).
// If the app is not installed, it shows simple steps and download links.
const APP_LINK = 'shepherdsdesk://import-contacts'

export default function OpenImportContactsPage() {
  const [tried, setTried] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => {
      window.location.href = APP_LINK
      setTried(true)
    }, 300)
    return () => clearTimeout(t)
  }, [])

  return (
    <main className="min-h-screen bg-[#F8F5EE] flex items-center justify-center p-6">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5 text-center">
        <h1 className="text-2xl font-bold text-[#022d5c]">Add people from your phone</h1>
        <p className="text-gray-600 text-sm">
          {tried ? 'If the app did not open, tap the button below.' : 'Opening The Shepherd\'s Desk app...'}
        </p>

        <a
          href={APP_LINK}
          className="block w-full rounded-lg bg-[#022d5c] text-white font-semibold py-3 hover:bg-[#022d5c]/90"
        >
          Open the app
        </a>

        <div className="text-left bg-gray-50 border border-gray-200 rounded-lg p-4 text-sm text-gray-700 space-y-1">
          <p className="font-semibold text-[#022d5c]">Or do it yourself:</p>
          <p>1. Open The Shepherd&apos;s Desk app.</p>
          <p>2. Tap <strong>Care</strong>, then <strong>People</strong>.</p>
          <p>3. Tap <strong>Add from Contacts</strong>.</p>
        </div>

        <p className="text-xs text-gray-500">
          Only the contacts you choose are saved. Your other contacts never leave your phone.
        </p>

        <div className="pt-2 border-t border-gray-100 space-y-2">
          <p className="text-sm text-gray-600">Don&apos;t have the app yet?</p>
          <a href="/download" className="inline-block text-[#022d5c] font-semibold underline">
            Download The Shepherd&apos;s Desk
          </a>
        </div>
      </div>
    </main>
  )
}
