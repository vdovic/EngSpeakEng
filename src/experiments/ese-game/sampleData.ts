export interface SentenceRepairPrompt {
  id: string
  sentence: string
  target: string
  choices: string[]
  correctChoice: string
  explanation: string
  repairedSentence?: string
  skillFocus?: string
  wrongChoiceFeedback?: Record<string, string>
  difficulty?: 'B2' | 'C1' | 'Mixed'
  register?: 'formal' | 'neutral' | 'conversational'
  tags?: string[]
  sourceWordId?: string
  sourceTerm?: string
}

export interface PhraseUpgradePrompt {
  id: string
  basicSentence: string
  choices: string[]
  correctChoice: string
  upgradedSentence: string
  whyStronger: string
  nuance: string
  skillFocus?: string
  weakChoiceFeedback?: Record<string, string>
  difficulty?: 'B2' | 'C1' | 'Mixed'
  register?: 'formal' | 'neutral' | 'conversational'
  tags?: string[]
  sourceWordId?: string
  sourceTerm?: string
}

export const SENTENCE_REPAIR_PROMPTS: SentenceRepairPrompt[] = [
  {
    id: 'repair-subject-to',
    sentence: 'The offer is depending on final board approval.',
    target: 'depending on',
    choices: ['subject to', 'because of', 'pending to'],
    correctChoice: 'subject to',
    repairedSentence: 'The offer is subject to final board approval.',
    skillFocus: 'formal conditions',
    explanation: '"Subject to" is the standard formal phrase for a condition that must be met before something is valid.',
    wrongChoiceFeedback: {
      'because of': '"Because of" explains a cause, not a condition attached to an offer.',
      'pending to': '"Pending" does not take "to" in this structure.',
    },
    difficulty: 'B2',
    register: 'formal',
    tags: ['contracts', 'conditions'],
  },
  {
    id: 'repair-elaborate-on',
    sentence: 'Could you elaborate the assumptions behind this forecast?',
    target: 'elaborate',
    choices: ['elaborate on', 'explain about', 'expand'],
    correctChoice: 'elaborate on',
    repairedSentence: 'Could you elaborate on the assumptions behind this forecast?',
    skillFocus: 'verb + preposition pattern',
    explanation: '"Elaborate on" is the natural pattern when asking for more detail about a topic.',
    wrongChoiceFeedback: {
      'explain about': '"Explain" normally takes a direct object here: "explain the assumptions."',
      expand: '"Expand" also needs "on" before the topic in this sentence.',
    },
    difficulty: 'B2',
    register: 'neutral',
    tags: ['clarification', 'meetings'],
  },
  {
    id: 'repair-circle-back',
    sentence: 'I want to return back to the budget point before we close.',
    target: 'return back to',
    choices: ['circle back to', 'return to', 'revert to'],
    correctChoice: 'circle back to',
    repairedSentence: 'I want to circle back to the budget point before we close.',
    skillFocus: 'meeting phrasing',
    explanation: '"Circle back to" sounds natural in a meeting when you revisit a point raised earlier.',
    wrongChoiceFeedback: {
      'return to': '"Return to" is grammatical, but it is plainer and less idiomatic for this meeting context.',
      'revert to': '"Revert to" means go back to a previous state, not revisit a discussion point.',
    },
    difficulty: 'C1',
    register: 'neutral',
    tags: ['meetings', 'follow-up'],
  },
  {
    id: 'repair-concise',
    sentence: 'Please keep the update short and with no extra words.',
    target: 'short and with no extra words',
    choices: ['succinct', 'briefly', 'tiny'],
    correctChoice: 'succinct',
    repairedSentence: 'Please keep the update succinct.',
    skillFocus: 'precise professional adjective',
    explanation: '"Succinct" means clear and brief without unnecessary wording, which fits professional writing.',
    wrongChoiceFeedback: {
      briefly: '"Briefly" is an adverb; this sentence needs an adjective after "keep the update."',
      tiny: '"Tiny" describes physical size and sounds too informal here.',
    },
    difficulty: 'C1',
    register: 'formal',
    tags: ['writing', 'style'],
  },
  {
    id: 'repair-action-items',
    sentence: 'I will send the next steps from the meeting with owners and due dates.',
    target: 'next steps',
    choices: ['action items', 'agenda items', 'open questions'],
    correctChoice: 'action items',
    repairedSentence: 'I will send the action items from the meeting with owners and due dates.',
    skillFocus: 'meeting follow-up vocabulary',
    explanation: '"Action items" are assigned follow-up tasks from a meeting, especially when they include owners and deadlines.',
    wrongChoiceFeedback: {
      'agenda items': '"Agenda items" are topics for discussion, not tasks assigned after the meeting.',
      'open questions': '"Open questions" are unresolved issues, not necessarily assigned tasks.',
    },
    difficulty: 'B2',
    register: 'neutral',
    tags: ['meetings', 'follow-up'],
  },
  {
    id: 'repair-notwithstanding',
    sentence: 'Because of the delay, the project remains within budget.',
    target: 'Because of',
    choices: ['Notwithstanding', 'Due to', 'As a result of'],
    correctChoice: 'Notwithstanding',
    repairedSentence: 'Notwithstanding the delay, the project remains within budget.',
    skillFocus: 'contrast connector',
    explanation: '"Notwithstanding" introduces a contrast: the delay happened, but the budget position is still positive.',
    wrongChoiceFeedback: {
      'Due to': '"Due to" gives a cause, but the sentence needs contrast.',
      'As a result of': '"As a result of" would mean the delay caused the budget result, which is illogical here.',
    },
    difficulty: 'C1',
    register: 'formal',
    tags: ['writing', 'contrast'],
  },
  {
    id: 'repair-raise-concern',
    sentence: 'I would like to tell a concern about the proposed timeline.',
    target: 'tell',
    choices: ['raise', 'say', 'open'],
    correctChoice: 'raise',
    repairedSentence: 'I would like to raise a concern about the proposed timeline.',
    skillFocus: 'business collocation',
    explanation: '"Raise a concern" is the natural professional collocation for introducing a concern in a discussion.',
    wrongChoiceFeedback: {
      say: '"Say a concern" is not a natural collocation.',
      open: '"Open a concern" is not idiomatic in this context.',
    },
    difficulty: 'B2',
    register: 'neutral',
    tags: ['meetings', 'assertiveness'],
  },
  {
    id: 'repair-in-accordance',
    sentence: 'According with company policy, all expenses must be submitted within 30 days.',
    target: 'According with',
    choices: ['In accordance with', 'According to', 'In compliance'],
    correctChoice: 'In accordance with',
    repairedSentence: 'In accordance with company policy, all expenses must be submitted within 30 days.',
    skillFocus: 'formal policy phrasing',
    explanation: '"In accordance with" is the complete formal phrase for following a rule, policy, or requirement.',
    wrongChoiceFeedback: {
      'According to': '"According to company policy" is grammatical, but less precise for a compliance requirement.',
      'In compliance': '"In compliance" needs "with" before the policy.',
    },
    difficulty: 'C1',
    register: 'formal',
    tags: ['policy', 'compliance'],
  },
  {
    id: 'repair-close-loop',
    sentence: 'I wanted to finish the loop on the supplier issue.',
    target: 'finish the loop',
    choices: ['close the loop', 'close a loop', 'finish this circle'],
    correctChoice: 'close the loop',
    repairedSentence: 'I wanted to close the loop on the supplier issue.',
    skillFocus: 'follow-up idiom',
    explanation: '"Close the loop on" means provide the final follow-up so the issue is no longer left open.',
    wrongChoiceFeedback: {
      'close a loop': 'The business idiom normally uses "the loop" plus "on" the topic.',
      'finish this circle': 'This is understandable literally, but it is not the business idiom.',
    },
    difficulty: 'C1',
    register: 'neutral',
    tags: ['emails', 'follow-up'],
  },
  {
    id: 'repair-caveat',
    sentence: 'The recommendation is strong, but there is one warning to mention.',
    target: 'warning',
    choices: ['caveat', 'threat', 'complaint'],
    correctChoice: 'caveat',
    repairedSentence: 'The recommendation is strong, but there is one caveat to mention.',
    skillFocus: 'nuanced qualification',
    explanation: '"Caveat" is a precise C1 word for a limitation or qualification attached to a recommendation.',
    wrongChoiceFeedback: {
      threat: '"Threat" is too severe and suggests danger, not a limitation in the argument.',
      complaint: '"Complaint" means dissatisfaction, not a qualification.',
    },
    difficulty: 'C1',
    register: 'neutral',
    tags: ['risk', 'writing'],
  },
  {
    id: 'repair-recap',
    sentence: 'Before we close, let me make a quick summary of today\'s decisions.',
    target: 'make a quick summary',
    choices: ['do a quick recap', 'make a recap', 'take a summary'],
    correctChoice: 'do a quick recap',
    repairedSentence: 'Before we close, let me do a quick recap of today\'s decisions.',
    skillFocus: 'meeting closing phrase',
    explanation: '"Do a quick recap" is natural business speech for briefly summarising decisions before closing.',
    wrongChoiceFeedback: {
      'make a recap': '"Recap" usually collocates with "do" or works as a verb: "recap the decisions."',
      'take a summary': '"Take a summary" is not a natural collocation.',
    },
    difficulty: 'B2',
    register: 'neutral',
    tags: ['meetings', 'structure'],
  },
  {
    id: 'repair-pertinent',
    sentence: 'Please include only information that is connected to the issue in the report.',
    target: 'connected to the issue',
    choices: ['pertinent', 'portable', 'possible'],
    correctChoice: 'pertinent',
    repairedSentence: 'Please include only pertinent information in the report.',
    skillFocus: 'concise formal adjective',
    explanation: '"Pertinent" means directly relevant to the matter being discussed, and it keeps the sentence concise.',
    wrongChoiceFeedback: {
      portable: '"Portable" means easy to carry or transfer; it does not mean relevant.',
      possible: '"Possible information" is too vague and does not express relevance.',
    },
    difficulty: 'C1',
    register: 'formal',
    tags: ['writing', 'relevance'],
  },
]

export const PHRASE_UPGRADE_PROMPTS: PhraseUpgradePrompt[] = [
  {
    id: 'upgrade-succinct-update',
    basicSentence: 'Please make the update short and clear.',
    choices: [
      'Please keep the update succinct.',
      'Please make the update tiny and simple.',
      'Please make the update with less words.',
    ],
    correctChoice: 'Please keep the update succinct.',
    upgradedSentence: 'Please keep the update succinct.',
    whyStronger:
      '"Succinct" combines brevity and clarity, so it is more precise than "short and clear."',
    nuance:
      'Professional and neutral. It asks for concise writing without sounding abrupt or informal.',
    skillFocus: 'concise professional wording',
    weakChoiceFeedback: {
      'Please make the update tiny and simple.':
        '"Tiny" sounds informal and refers more to physical size than communication style.',
      'Please make the update with less words.':
        'This is understandable, but "fewer words" would be grammatical and still less natural than "succinct."',
    },
    difficulty: 'C1',
    register: 'formal',
    tags: ['writing', 'precision'],
  },
  {
    id: 'upgrade-raise-concern',
    basicSentence: 'I want to say a problem about the timeline.',
    choices: [
      'I would like to raise a concern about the timeline.',
      'I want to tell a concern about the timeline.',
      'I would like to complain about the timeline.',
    ],
    correctChoice: 'I would like to raise a concern about the timeline.',
    upgradedSentence: 'I would like to raise a concern about the timeline.',
    whyStronger:
      '"Raise a concern" is the natural professional collocation for introducing a possible issue.',
    nuance:
      'Diplomatic and businesslike. It signals a concern without sounding emotional or accusatory.',
    skillFocus: 'business collocation',
    weakChoiceFeedback: {
      'I want to tell a concern about the timeline.':
        '"Tell a concern" is not a natural collocation in English.',
      'I would like to complain about the timeline.':
        '"Complain" is stronger and more negative than the intended professional tone.',
    },
    difficulty: 'B2',
    register: 'neutral',
    tags: ['meetings', 'assertiveness'],
  },
  {
    id: 'upgrade-circle-back',
    basicSentence: 'I want to go back to the budget point before we finish.',
    choices: [
      'I would like to circle back to the budget point before we close.',
      'I want to return back to the budget point before we finish.',
      'I want to repeat the budget point before we stop.',
    ],
    correctChoice: 'I would like to circle back to the budget point before we close.',
    upgradedSentence: 'I would like to circle back to the budget point before we close.',
    whyStronger:
      '"Circle back to" is a natural meeting phrase for returning to an earlier topic.',
    nuance:
      'Polished but not overly formal. It sounds collaborative and fits spoken meeting English.',
    skillFocus: 'meeting phrasing',
    weakChoiceFeedback: {
      'I want to return back to the budget point before we finish.':
        '"Return back" is redundant, and the sentence sounds less idiomatic.',
      'I want to repeat the budget point before we stop.':
        '"Repeat" suggests saying the same thing again, not reopening the topic for discussion.',
    },
    difficulty: 'C1',
    register: 'neutral',
    tags: ['meetings', 'follow-up'],
  },
  {
    id: 'upgrade-close-loop',
    basicSentence: 'I wanted to finish the supplier issue with one final message.',
    choices: [
      'I wanted to close the loop on the supplier issue.',
      'I wanted to close a circle about the supplier issue.',
      'I wanted to end the supplier issue totally.',
    ],
    correctChoice: 'I wanted to close the loop on the supplier issue.',
    upgradedSentence: 'I wanted to close the loop on the supplier issue.',
    whyStronger:
      '"Close the loop on" means provide final follow-up so an issue is no longer open.',
    nuance:
      'Common in professional email and project follow-up. It is efficient and signals completion.',
    skillFocus: 'follow-up idiom',
    weakChoiceFeedback: {
      'I wanted to close a circle about the supplier issue.':
        'This translates the image literally, but it is not the English business idiom.',
      'I wanted to end the supplier issue totally.':
        '"Totally" is too casual and the sentence sounds blunt.',
    },
    difficulty: 'C1',
    register: 'neutral',
    tags: ['emails', 'follow-up'],
  },
  {
    id: 'upgrade-caveat',
    basicSentence: 'The recommendation is strong, but there is one warning.',
    choices: [
      'The recommendation is strong, but there is one caveat.',
      'The recommendation is strong, but there is one threat.',
      'The recommendation is strong, but there is one bad thing.',
    ],
    correctChoice: 'The recommendation is strong, but there is one caveat.',
    upgradedSentence: 'The recommendation is strong, but there is one caveat.',
    whyStronger:
      '"Caveat" precisely means a limitation or qualification attached to a recommendation.',
    nuance:
      'Analytical and measured. It softens the negative point while keeping the meaning clear.',
    skillFocus: 'nuanced qualification',
    weakChoiceFeedback: {
      'The recommendation is strong, but there is one threat.':
        '"Threat" suggests danger and is too severe for a limitation in an argument.',
      'The recommendation is strong, but there is one bad thing.':
        '"Bad thing" is vague and too informal for a professional recommendation.',
    },
    difficulty: 'C1',
    register: 'neutral',
    tags: ['risk', 'writing'],
  },
  {
    id: 'upgrade-action-items',
    basicSentence: 'I will send the next things to do from the meeting.',
    choices: [
      'I will send the action items from the meeting.',
      'I will send the agenda items from the meeting.',
      'I will send the meeting jobs from the meeting.',
    ],
    correctChoice: 'I will send the action items from the meeting.',
    upgradedSentence: 'I will send the action items from the meeting.',
    whyStronger:
      '"Action items" are assigned follow-up tasks from a meeting, often with owners and deadlines.',
    nuance:
      'Clear and operational. It sounds specific without becoming overly formal.',
    skillFocus: 'meeting follow-up vocabulary',
    weakChoiceFeedback: {
      'I will send the agenda items from the meeting.':
        '"Agenda items" are discussion topics, not tasks assigned after the meeting.',
      'I will send the meeting jobs from the meeting.':
        '"Meeting jobs" is not a natural professional phrase.',
    },
    difficulty: 'B2',
    register: 'neutral',
    tags: ['meetings', 'follow-up'],
  },
  {
    id: 'upgrade-pertinent',
    basicSentence: 'Please include only information that is connected to the issue.',
    choices: [
      'Please include only pertinent information.',
      'Please include only possible information.',
      'Please include only information about things.',
    ],
    correctChoice: 'Please include only pertinent information.',
    upgradedSentence: 'Please include only pertinent information.',
    whyStronger:
      '"Pertinent" means directly relevant to the matter, making the sentence shorter and more exact.',
    nuance:
      'Formal and efficient. It is appropriate for reports, policies, and written requests.',
    skillFocus: 'concise formal adjective',
    weakChoiceFeedback: {
      'Please include only possible information.':
        '"Possible" does not express relevance and leaves the instruction unclear.',
      'Please include only information about things.':
        'This is vague and much less professional than the original basic sentence.',
    },
    difficulty: 'C1',
    register: 'formal',
    tags: ['writing', 'relevance'],
  },
  {
    id: 'upgrade-notwithstanding',
    basicSentence: 'Even with the delay, the project remains within budget.',
    choices: [
      'Notwithstanding the delay, the project remains within budget.',
      'Because of the delay, the project remains within budget.',
      'Due to the delay, the project remains within budget.',
    ],
    correctChoice: 'Notwithstanding the delay, the project remains within budget.',
    upgradedSentence: 'Notwithstanding the delay, the project remains within budget.',
    whyStronger:
      '"Notwithstanding" introduces a formal contrast: the delay happened, but the budget result still holds.',
    nuance:
      'Formal written register. It is stronger for reports than casual phrases like "even with."',
    skillFocus: 'contrast connector',
    weakChoiceFeedback: {
      'Because of the delay, the project remains within budget.':
        '"Because of" makes the delay sound like the cause of the budget result, which changes the logic.',
      'Due to the delay, the project remains within budget.':
        '"Due to" also expresses cause, not contrast.',
    },
    difficulty: 'C1',
    register: 'formal',
    tags: ['writing', 'contrast'],
  },
]
