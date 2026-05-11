export interface SandboxWord {
  id: string
  term: string
  definition: string
  prompt: string
}

export const SANDBOX_WORDS: SandboxWord[] = [
  {
    id: 'sandbox-align',
    term: 'align',
    definition: 'to make plans, ideas, or people work toward the same goal',
    prompt: 'Use it to make a team decision sound clear and collaborative.',
  },
  {
    id: 'sandbox-clarify',
    term: 'clarify',
    definition: 'to make something easier to understand',
    prompt: 'Use it when asking for better context without sounding critical.',
  },
  {
    id: 'sandbox-prioritize',
    term: 'prioritize',
    definition: 'to decide what is most important and should be handled first',
    prompt: 'Use it to explain what deserves attention now.',
  },
]
