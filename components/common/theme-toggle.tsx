"use client"

import { MonitorIcon, MoonIcon, SunIcon } from "lucide-react"
import { useTheme } from "next-themes"
import { useSyncExternalStore } from "react"

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"

const THEMES = [
  { value: "light", label: "Light", Icon: SunIcon },
  { value: "dark", label: "Dark", Icon: MoonIcon },
  { value: "system", label: "System", Icon: MonitorIcon },
] as const

const subscribe = () => () => {}

/** True after hydration. The stored theme is only known in the browser, so the
 * server renders the switch without a pressed item (no hydration mismatch). */
function useIsClient() {
  return useSyncExternalStore(
    subscribe,
    () => true,
    () => false
  )
}

/** Light / Dark / System switch (PLAN.md D21). The `d` hotkey still works. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const isClient = useIsClient()

  return (
    <ToggleGroup
      aria-label="Colour theme"
      variant="outline"
      size="sm"
      spacing={0}
      value={isClient && theme ? [theme] : []}
      onValueChange={(value) => {
        const next = value[0]
        if (typeof next === "string") setTheme(next)
      }}
    >
      {THEMES.map(({ value, label, Icon }) => (
        <ToggleGroupItem
          key={value}
          value={value}
          aria-label={`${label} theme`}
          title={`${label} theme`}
        >
          <Icon aria-hidden />
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
