import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "The Shepherd's Desk: Your Complete Pastoral Ministry Assistant",
  description: "The complete Ministry Assistant for pastors and ministers. Sermon preparation, ministry calendar, rich pastoral care and counseling resources, church communication, and stage-ready pulpit presentation.",
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
