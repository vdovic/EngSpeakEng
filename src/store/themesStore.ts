import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Store ─────────────────────────────────────────────────────────────────────

interface ThemesStore {
  /** Ordered list of all user-created theme names. */
  themes: string[]
  addTheme: (name: string) => void
  renameTheme: (oldName: string, newName: string) => void
  deleteTheme: (name: string) => void
}

export const useThemesStore = create<ThemesStore>()(
  persist(
    (set) => ({
      themes: [],

      addTheme: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return
        set((s) => ({
          themes: s.themes.includes(trimmed)
            ? s.themes
            : [...s.themes, trimmed].sort((a, b) => a.localeCompare(b)),
        }))
      },

      renameTheme: (oldName, newName) => {
        const trimmed = newName.trim()
        if (!trimmed || trimmed === oldName) return
        set((s) => ({
          themes: s.themes
            .map((t) => (t === oldName ? trimmed : t))
            .sort((a, b) => a.localeCompare(b)),
        }))
      },

      deleteTheme: (name) => {
        set((s) => ({ themes: s.themes.filter((t) => t !== name) }))
      },
    }),
    { name: 'speak-english-themes' },
  ),
)
