import type { Metadata } from "next"
import "./globals.css"
import TopBar from "../components/ui/top-bar"

export const metadata: Metadata = {
  title: "Malitan • מעליתן",
  description: "Elevator ERP MVP",
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl">
      <body className="bg-white text-zinc-900">
        <TopBar />
        <div className="mx-auto max-w-screen-2xl px-4 py-6">
          {children}
        </div>
      </body>
    </html>
  )
}
