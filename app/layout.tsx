import './globals.css'

export const metadata = {
  title: 'Finance Tracker',
  description: 'Track your finances with AI-powered insights',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
