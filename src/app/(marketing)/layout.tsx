import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Shepherd's Desk — Sermon Prep & Ministry Management for Pastors",
  description: "The all-in-one platform for sermon preparation, pastoral care, and ministry management. Built for pastors, by pastors.",
}

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-white">
      {children}
    </div>
  )
}
