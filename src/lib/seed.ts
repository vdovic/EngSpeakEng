import { VocabItem } from '@/types/vocabulary'
import { addDays, subDays } from 'date-fns'

function uid(): string {
  return crypto.randomUUID()
}

function makeItem(overrides: Partial<VocabItem> & Pick<VocabItem, 'term' | 'type'>): VocabItem {
  const now = new Date().toISOString()
  return {
    id: uid(),
    status: 'learning',
    createdAt: now,
    updatedAt: now,
    tags: [],
    themes: [],
    synonyms: [],
    antonyms: [],
    collocations: [],
    sentenceFrames: [],
    relatedPhrases: [],
    review: {
      intervalDays: 1,
      ease: 2.5,
      reviewCount: 0,
      successfulRecalls: 0,
      sentenceProduced: false,
    },
    activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    weeklyFocus: false,
    archived: false,
    ...overrides,
  }
}

export function createSeedData(): VocabItem[] {
  const yesterday = subDays(new Date(), 1).toISOString()
  const tomorrow = addDays(new Date(), 1).toISOString()

  return [
    makeItem({
      term: 'mitigate',
      type: 'word',
      status: 'activation',
      definitionEn: 'Make something less severe, harmful, or painful.',
      exampleSentence: 'We need to mitigate the delivery risks early.',
      workSentence: 'One way to mitigate this dependency is to parallelize the work.',
      mySentence: 'I want to mitigate uncertainty before making a commitment.',
      synonyms: ['reduce', 'ease', 'lessen'],
      antonyms: ['worsen', 'intensify'],
      nuance: 'Often used in risk and impact contexts. Does not mean eliminate.',
      register: 'formal',
      commonMistakes: "Don't confuse with 'eliminate' — mitigate reduces, not removes.",
      collocations: ['mitigate risk', 'mitigate impact', 'mitigate concerns'],
      sentenceFrames: ['We should mitigate this by…', 'One way to mitigate the risk is…'],
      etymology: "Latin 'mitigare' — to soften or make mild.",
      memoryCue: 'Imagine softening a storm into a light drizzle.',
      tags: ['work', 'risk', 'product'],
      sourceType: 'article',
      sourceText: 'We need to mitigate delivery risks early.',
      weeklyFocus: true,
      review: {
        intervalDays: 7,
        ease: 2.4,
        reviewCount: 4,
        successfulRecalls: 3,
        sentenceProduced: true,
        lastReviewedAt: yesterday,
        nextReviewAt: tomorrow,
      },
      activation: {
        requiredUses: 3,
        usageCount: 2,
        usageLogs: [
          {
            id: uid(),
            usedAt: yesterday,
            channel: 'speaking',
            note: 'Used in a delivery risk meeting.',
            sentence: 'We should mitigate this risk before rollout.',
          },
          {
            id: uid(),
            usedAt: new Date().toISOString(),
            channel: 'writing',
            note: 'Follow-up email.',
            sentence: 'This approach would mitigate the current dependency.',
          },
        ],
      },
    }),

    makeItem({
      term: 'cumbersome',
      type: 'word',
      status: 'learning',
      definitionEn: 'Large or heavy and therefore difficult to carry or use; slow or complicated.',
      exampleSentence: 'The approval process was cumbersome and delayed the launch.',
      workSentence: 'The current onboarding flow is cumbersome for new users.',
      synonyms: ['clunky', 'unwieldy', 'burdensome'],
      antonyms: ['streamlined', 'efficient', 'simple'],
      nuance: 'Often used to describe processes, tools, or workflows that are inefficient.',
      register: 'formal',
      collocations: ['cumbersome process', 'cumbersome system', 'cumbersome procedure'],
      tags: ['work', 'product'],
      weeklyFocus: true,
      review: {
        intervalDays: 3,
        ease: 2.3,
        reviewCount: 2,
        successfulRecalls: 2,
        sentenceProduced: false,
        lastReviewedAt: yesterday,
        nextReviewAt: new Date().toISOString(),
      },
      activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    }),

    makeItem({
      term: 'raise a concern',
      type: 'phrase',
      status: 'stable',
      definitionEn: 'To formally mention a problem or worry in a professional context.',
      exampleSentence: "I'd like to raise a concern about the timeline.",
      workSentence: 'The QA team raised a concern about the data migration approach.',
      collocations: ['raise a concern about', 'raise a concern with'],
      sentenceFrames: ["I'd like to raise a concern…", 'We should raise this concern before…'],
      register: 'neutral',
      nuance: 'Professional and diplomatic. Less alarming than "I have a problem".',
      tags: ['meetings', 'diplomacy', 'work'],
      weeklyFocus: true,
      review: {
        intervalDays: 14,
        ease: 2.6,
        reviewCount: 5,
        successfulRecalls: 4,
        sentenceProduced: true,
        lastReviewedAt: yesterday,
        nextReviewAt: addDays(new Date(), 7).toISOString(),
      },
      activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    }),

    makeItem({
      term: "What I'm trying to get at is…",
      type: 'chunk',
      status: 'learning',
      definitionEn: 'A phrase used to clarify the main point you are making.',
      exampleSentence: "What I'm trying to get at is that we need a clearer definition of done.",
      workSentence: "What I'm trying to get at is that the risk isn't technical — it's organisational.",
      register: 'conversational',
      nuance: 'Signals you are about to restate your point more clearly.',
      tags: ['chunks', 'meetings', 'diplomacy'],
      review: {
        intervalDays: 1,
        ease: 2.5,
        reviewCount: 1,
        successfulRecalls: 1,
        sentenceProduced: false,
        lastReviewedAt: yesterday,
        nextReviewAt: new Date().toISOString(),
      },
      activation: { requiredUses: 3, usageCount: 0, usageLogs: [] },
    }),

    makeItem({
      term: 'align on',
      type: 'phrase',
      status: 'activation',
      definitionEn: 'To reach agreement or shared understanding with others on a topic.',
      exampleSentence: 'We need to align on the scope before we can start.',
      workSentence: "Let's align on the acceptance criteria before the sprint starts.",
      collocations: ['align on scope', 'align on priorities', 'align on expectations'],
      sentenceFrames: ['We need to align on…', 'Can we align on… before moving forward?'],
      register: 'formal',
      nuance: 'Common in product and stakeholder management. Implies collaborative agreement.',
      tags: ['work', 'stakeholders', 'meetings'],
      weeklyFocus: true,
      review: {
        intervalDays: 7,
        ease: 2.5,
        reviewCount: 3,
        successfulRecalls: 3,
        sentenceProduced: true,
        lastReviewedAt: yesterday,
        nextReviewAt: addDays(new Date(), 3).toISOString(),
      },
      activation: {
        requiredUses: 3,
        usageCount: 1,
        usageLogs: [
          {
            id: uid(),
            usedAt: yesterday,
            channel: 'speaking',
            note: 'Used in sprint planning.',
            sentence: "Let's align on the priorities for Q2.",
          },
        ],
      },
    }),

    makeItem({
      term: 'stakeholder',
      type: 'word',
      status: 'mastered',
      definitionEn: 'A person with an interest or concern in a business or project.',
      exampleSentence: 'We identified all key stakeholders before the kick-off.',
      workSentence: 'The stakeholder map helped us understand who to involve in the decision.',
      synonyms: ['interested party'],
      register: 'formal',
      tags: ['work', 'strategy'],
      review: {
        intervalDays: 60,
        ease: 2.8,
        reviewCount: 10,
        successfulRecalls: 9,
        sentenceProduced: true,
        lastReviewedAt: subDays(new Date(), 30).toISOString(),
        nextReviewAt: addDays(new Date(), 30).toISOString(),
      },
      activation: {
        requiredUses: 3,
        usageCount: 3,
        usageLogs: [
          { id: uid(), usedAt: subDays(new Date(), 20).toISOString(), channel: 'speaking', note: 'Kick-off' },
          { id: uid(), usedAt: subDays(new Date(), 15).toISOString(), channel: 'writing', note: 'Project brief' },
          { id: uid(), usedAt: subDays(new Date(), 5).toISOString(), channel: 'speaking', note: 'Retrospective' },
        ],
      },
    }),

    makeItem({
      term: 'bandwidth',
      type: 'word',
      status: 'inbox',
      definitionEn: 'Capacity (time, energy, resources) available to take on additional work.',
      exampleSentence: "I don't have the bandwidth to take on another project right now.",
      register: 'conversational',
      nuance: 'Informal but very common in tech/product. Use carefully in very formal writing.',
      tags: ['work', 'meetings'],
      sourceType: 'meeting',
      sourceText: "Sorry, we don't have the bandwidth for that this sprint.",
    }),

    makeItem({
      term: 'iterate on',
      type: 'phrase',
      status: 'inbox',
      definitionEn: 'To refine or improve something through repeated cycles of work and feedback.',
      exampleSentence: "We'll iterate on the prototype based on user feedback.",
      tags: ['work', 'product', 'delivery'],
      sourceType: 'meeting',
    }),
  ]
}
