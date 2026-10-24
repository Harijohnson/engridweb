import type { Metadata } from "next"

import { AppHeader } from "@/components/common/app-header"
import { UserGuide } from "@/components/guide/user-guide"

export const metadata: Metadata = {
  title: "User guide · EnGrid wind forecast monitor",
  description:
    "How the wind forecast monitor works, what each part of the dashboard shows, and what to check before you trust a number.",
}

export default function GuidePage() {
  return (
    <>
      <AppHeader current="guide" />
      <UserGuide />
    </>
  )
}
