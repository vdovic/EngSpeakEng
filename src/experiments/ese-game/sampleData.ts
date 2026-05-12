export interface SentenceRepairPrompt {
  id: string
  sentence: string
  target: string
  choices: string[]
  correctChoice: string
  explanation: string
  difficulty?: 'B2' | 'C1' | 'Mixed'
  register?: 'formal' | 'neutral' | 'conversational'
  tags?: string[]
}

export const SENTENCE_REPAIR_PROMPTS: SentenceRepairPrompt[] = [
  {
    id: 'repair-quickly',
    sentence: 'I made the decision very fast.',
    target: 'fast',
    choices: ['quickly', 'strongly', 'hardly'],
    correctChoice: 'quickly',
    explanation: '"Quickly" describes how the decision was made. "Fast" is common, but "quickly" sounds cleaner in this sentence.',
  },
  {
    id: 'repair-raise',
    sentence: 'Can I make a question about the timeline?',
    target: 'make',
    choices: ['raise', 'build', 'take'],
    correctChoice: 'raise',
    explanation: '"Raise a question" is a natural phrase when you want to bring a question into a discussion.',
  },
  {
    id: 'repair-attend',
    sentence: 'I will assist the meeting tomorrow.',
    target: 'assist',
    choices: ['attend', 'support', 'follow'],
    correctChoice: 'attend',
    explanation: 'Use "attend" for being present at a meeting. "Assist" means to help someone.',
  },
  {
    id: 'repair-deadline',
    sentence: 'The deadline is coming near.',
    target: 'coming near',
    choices: ['approaching', 'arriving to', 'going close'],
    correctChoice: 'approaching',
    explanation: '"The deadline is approaching" is the natural professional phrasing.',
  },
  {
    id: 'repair-improve',
    sentence: 'We need to better the onboarding flow.',
    target: 'better',
    choices: ['improve', 'grow', 'repair'],
    correctChoice: 'improve',
    explanation: '"Improve" is the standard verb for making a process or product better.',
  },
  {
    id: 'repair-feedback',
    sentence: 'She gave me a useful advice.',
    target: 'a useful advice',
    choices: ['useful advice', 'a useful advise', 'many useful advice'],
    correctChoice: 'useful advice',
    explanation: '"Advice" is uncountable, so it does not take "a" in this sentence.',
  },
  {
    id: 'repair-issue',
    sentence: 'We discussed about the issue yesterday.',
    target: 'discussed about',
    choices: ['discussed', 'talked', 'explained about'],
    correctChoice: 'discussed',
    explanation: '"Discuss" takes a direct object: "discussed the issue." Use "talked about" if you want the preposition.',
  },
  {
    id: 'repair-clarify',
    sentence: 'Could you explain me the next step?',
    target: 'explain me',
    choices: ['explain the next step to me', 'explain me about', 'explain to my next step'],
    correctChoice: 'explain the next step to me',
    explanation: 'The natural pattern is "explain something to someone."',
  },
  {
    id: 'repair-responsible',
    sentence: 'I am responsible of the weekly report.',
    target: 'responsible of',
    choices: ['responsible for', 'responsible to', 'responsible with'],
    correctChoice: 'responsible for',
    explanation: 'Use "responsible for" when naming the task or area you own.',
  },
  {
    id: 'repair-depends',
    sentence: 'It depends of the final budget.',
    target: 'depends of',
    choices: ['depends on', 'depends from', 'depends about'],
    correctChoice: 'depends on',
    explanation: '"Depends on" is the fixed phrase for saying one thing is affected by another.',
  },
  {
    id: 'repair-join',
    sentence: 'I joined to the call five minutes late.',
    target: 'joined to',
    choices: ['joined', 'entered to', 'connected on'],
    correctChoice: 'joined',
    explanation: 'Use "joined the call" without "to."',
  },
  {
    id: 'repair-recommend',
    sentence: 'I recommend you to check the summary first.',
    target: 'recommend you to',
    choices: ['recommend that you', 'recommend you for', 'recommend to you'],
    correctChoice: 'recommend that you',
    explanation: 'In natural English, "recommend that you check" sounds better than "recommend you to check."',
  },
]
