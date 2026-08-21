"use client"

import { Check, Moon, Monitor, Sun } from "lucide-react"
import { useTheme } from "next-themes"

import { PageHeader } from "@/components/shared/page-header"

const themes = [
  { id: "system", label: "System", icon: Monitor },
  { id: "light", label: "Light", icon: Sun },
  { id: "dark", label: "Dark", icon: Moon },
] as const

export function SettingsDashboard() {
  const { theme, setTheme } = useTheme()

  return (
    <div>
      <PageHeader
        title="Settings"
        description="Manage interface preferences."
      />
      <section className="mb-4 rounded-xl border bg-card">
        <div className="border-b p-5">
          <h2 className="text-sm font-medium">Appearance</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Choose a theme or follow your device preference.
          </p>
        </div>
        <div className="grid gap-3 p-5 sm:grid-cols-3">
          {themes.map((option) => {
            const Icon = option.icon
            const selected = theme === option.id
            return (
              <button
                type="button"
                key={option.id}
                onClick={() => setTheme(option.id)}
                className={`flex items-center gap-3 rounded-lg border p-3 text-left ${selected ? "border-foreground ring-1 ring-foreground" : "hover:bg-muted"}`}
              >
                <span className="grid size-8 place-items-center rounded-md bg-muted">
                  <Icon className="size-4" />
                </span>
                <span className="text-sm font-medium">{option.label}</span>
                {selected && <Check className="ml-auto size-4" />}
              </button>
            )
          })}
        </div>
      </section>
    </div>
  )
}
