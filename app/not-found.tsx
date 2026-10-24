import Link from "next/link"

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-svh max-w-lg flex-col items-center justify-center gap-2 px-4 text-center">
      <h1 className="text-sm font-medium">Page not found</h1>
      <p className="text-muted-foreground">
        There is only one page here: the wind forecast dashboard.
      </p>
      <Link href="/" className="underline underline-offset-2">
        Go to the dashboard
      </Link>
    </main>
  )
}
