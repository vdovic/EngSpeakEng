/**
 * usageProfiles.ts
 *
 * Exports USAGE_PROFILES — the merged lookup used by UsageProfileCard.
 *
 * Precedence (highest → lowest):
 *   1. item.usageProfile  (stored on VocabItem; set by future AI enrichment)
 *   2. HAND_CURATED       (entries in this file — carefully written, full signals)
 *   3. USAGE_PROFILES_GENERATED (auto-derived from existing register/nuance data)
 *
 * To extend: add entries to the HAND_CURATED block below.
 * To regenerate the auto-derived base: run data/migrations/generate-usage-profiles.js
 *
 * Do NOT add runtime AI calls to populate either source.
 */

import type { UsageProfile } from '@/types/vocabulary'
import { USAGE_PROFILES_GENERATED } from '@/data/usageProfilesGenerated'

// ── Hand-curated entries (26 words with full, carefully considered profiles) ──
// These override the generated versions for the same terms.

const HAND_CURATED: Record<string, UsageProfile> = {

  // ── Words ──────────────────────────────────────────────────────────────────

  'mitigate': {
    formality:    'professional',
    medium:       'written',
    phraseUsage:  'collocation-heavy',
    frequency:    'advanced-common',
    domains:      ['risk management', 'business', 'legal'],
    naturalnessHint: 'Sounds natural in risk, project, and legal contexts — "mitigate risk", "mitigate impact". Overly formal for casual speech.',
  },

  'iffy': {
    formality:    'informal',
    medium:       'spoken',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Very natural in conversation and meetings. Avoid in formal reports or written communication.',
  },

  'nuanced': {
    formality:    'formal',
    medium:       'written',
    phraseUsage:  'standalone',
    frequency:    'advanced-common',
    domains:      ['analysis', 'academic'],
    naturalnessHint: 'Common in feedback, analysis, and academic writing. Can feel pretentious if overused in everyday conversation.',
  },

  'keen': {
    region:       'british',
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'More natural in British English. American speakers typically say "eager" or "enthusiastic" instead.',
  },

  'utterly': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'collocation-heavy',
    frequency:    'advanced-common',
    naturalnessHint: 'Almost always intensifies a strong adjective — "utterly exhausted", "utterly wrong", "utterly confused". Rarely used standalone.',
  },

  'strife': {
    formality:    'formal',
    medium:       'written',
    phraseUsage:  'standalone',
    frequency:    'advanced-common',
    domains:      ['news', 'formal writing'],
    naturalnessHint: 'More common in news coverage and formal writing. In everyday speech, "conflict" or "tension" feel more natural.',
  },

  'oblivious': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'advanced-common',
    naturalnessHint: 'Natural in descriptions and storytelling. Often followed by "to": "completely oblivious to what was happening".',
  },

  'abduction': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'advanced-common',
    domains:      ['news', 'legal', 'crime reporting'],
    naturalnessHint: 'More formal than "kidnapping". Common in news, legal, and police contexts; "kidnapping" sounds more natural in everyday conversation.',
  },

  'gentile': {
    formality:    'neutral',
    medium:       'written',
    phraseUsage:  'standalone',
    frequency:    'rare',
    domains:      ['religion', 'history'],
    naturalnessHint: 'Used almost exclusively in religious or historical discussions. Rarely appears in everyday modern conversation.',
  },

  'unrelatable': {
    formality:    'informal',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Modern informal English, very common in social media and casual conversation. Would seem out of place in formal writing.',
  },

  // ── Phrasal verbs / phrases ────────────────────────────────────────────────

  'follow up on': {
    formality:    'professional',
    medium:       'both',
    phraseUsage:  'phrase-heavy',
    frequency:    'very-common',
    domains:      ['business', 'meetings'],
    naturalnessHint: 'Essential in professional English. Expected in meeting culture and email communication: "I\'ll follow up on that by Friday."',
  },

  'lock up': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Context-dependent: "lock up the office" (secure a building) vs "lock someone up" (imprison) are very different registers.',
  },

  'wrap up': {
    formality:    'neutral',
    medium:       'spoken',
    phraseUsage:  'phrase-heavy',
    frequency:    'very-common',
    domains:      ['meetings', 'presentations'],
    naturalnessHint: 'Almost universal for ending meetings and presentations. "Let\'s wrap up" is one of the most common meeting phrases.',
  },

  'carry on': {
    region:       'british',
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'very-common',
    naturalnessHint: 'Slightly British in feel — "carry on" is warmer than "continue". Understood internationally but most at home in British English.',
  },

  'push ahead': {
    formality:    'professional',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    domains:      ['business', 'project management'],
    naturalnessHint: 'Common in planning and decision-making: "let\'s push ahead with the launch". Suggests determination despite obstacles.',
  },

  'work through': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Works in both emotional contexts ("work through feelings") and practical ones ("work through the backlog").',
  },

  'show up': {
    formality:    'informal',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'very-common',
    naturalnessHint: 'Very flexible: can mean arrive, appear, or outperform someone. Always informal in tone — use "attend" or "appear" in formal writing.',
  },

  'deal with': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'very-common',
    naturalnessHint: 'One of the most versatile phrasal verbs in English. Natural in professional and casual contexts alike.',
  },

  'get ahead': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    domains:      ['career', 'self-improvement'],
    naturalnessHint: 'Common in career and self-development conversations. Implies making progress beyond others or getting a head start.',
  },

  'talk through': {
    formality:    'professional',
    medium:       'spoken',
    phraseUsage:  'phrase-heavy',
    frequency:    'common',
    domains:      ['meetings', 'collaboration'],
    naturalnessHint: 'Very natural in collaborative problem-solving: "let\'s talk through the options". Suggests a thorough verbal walkthrough.',
  },

  'get out of hand': {
    formality:    'informal',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Natural in descriptions of escalating situations: "things got out of hand". Works in both speech and storytelling.',
  },

  'call it a day': {
    formality:    'informal',
    medium:       'spoken',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Natural in group settings to propose stopping work: "I think we can call it a day." Avoid in formal written proposals.',
  },

  'a piece of cake': {
    formality:    'informal',
    medium:       'spoken',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Light and conversational. Best used in speech or casual writing. Would feel out of place in a formal report.',
  },

  'dress up': {
    formality:    'neutral',
    medium:       'both',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Can mean wearing formal clothes or disguising/embellishing something. Context determines which meaning is implied.',
  },

  'bring to the table': {
    formality:    'professional',
    medium:       'spoken',
    phraseUsage:  'phrase-heavy',
    frequency:    'common',
    domains:      ['business', 'negotiation', 'hiring'],
    naturalnessHint: 'Common in hiring and negotiation: "what can you bring to the table?" Conveys unique contribution or value.',
  },

  'ease up': {
    formality:    'informal',
    medium:       'spoken',
    phraseUsage:  'standalone',
    frequency:    'common',
    naturalnessHint: 'Used to suggest reducing pressure or intensity — often to a person: "ease up on him", or about a situation: "the traffic eased up".',
  },

}

// ── Merged export ─────────────────────────────────────────────────────────────
// Generated entries provide the base; hand-curated entries override.

export const USAGE_PROFILES: Record<string, UsageProfile> = {
  ...USAGE_PROFILES_GENERATED,
  ...HAND_CURATED,
}
