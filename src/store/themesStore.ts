import { create } from 'zustand'
import { persist } from 'zustand/middleware'

// ── Suggested grouping dimensions ─────────────────────────────────────────────
// Pre-built semantic categories. Words can belong to multiple groups.
// These are starting points — users can add, rename, or delete any of them.

export const SUGGESTED_THEMES: { name: string; description: string; emoji: string }[] = [
  {
    name: 'Phrasal Verbs',
    emoji: '🔗',
    description: 'Multi-word verbs — "give up", "carry out", "put off"',
  },
  {
    name: 'Idioms & Expressions',
    emoji: '💬',
    description: 'Fixed phrases with non-literal meaning — "bite the bullet", "on the fence"',
  },
  {
    name: 'Business & Professional',
    emoji: '💼',
    description: 'General workplace and corporate vocabulary',
  },
  {
    name: 'Meetings & Presentations',
    emoji: '📊',
    description: 'Language for chairing, presenting, and participating in meetings',
  },
  {
    name: 'Written Communication',
    emoji: '✉️',
    description: 'Emails, reports, proposals, formal documents',
  },
  {
    name: 'Leadership & Management',
    emoji: '🎯',
    description: 'Managing teams, giving feedback, delegation, performance',
  },
  {
    name: 'Negotiations & Persuasion',
    emoji: '🤝',
    description: 'Diplomatic language, deal-making, influencing without authority',
  },
  {
    name: 'Problem-solving & Analysis',
    emoji: '🔍',
    description: 'Analytical thinking, root-cause language, decision frameworks',
  },
  {
    name: 'Transitions & Connectors',
    emoji: '🔀',
    description: 'Discourse markers — "furthermore", "in contrast", "as a result"',
  },
  {
    name: 'Formal & Academic',
    emoji: '🎓',
    description: 'High-register vocabulary for writing and formal speaking',
  },
  {
    name: 'Everyday Conversation',
    emoji: '☕',
    description: 'Small talk, casual spoken English, social phrases',
  },
  {
    name: 'Collocations & Chunks',
    emoji: '🧩',
    description: 'Fixed word combinations that native speakers use together',
  },
]

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
