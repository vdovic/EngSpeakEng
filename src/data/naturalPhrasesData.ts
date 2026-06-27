/**
 * naturalPhrasesData.ts — curated cross-library phrase pairs for Natural Phrases Sprint.
 *
 * Each entry pairs an anchor library term with a completing option.
 * partnerTerm: when set, the completing option contains this other library term →
 *   the question is "cross-library" and awards exposure to both words on a correct answer.
 *
 * position:
 *   'after'  = anchor first, option follows  → "overcome adversity"
 *              shown as "overcome ___"  button: "… adversity"
 *   'before' = option first, anchor follows  → "unremitting adversity"
 *              shown as "___ adversity"  button: "unremitting …"
 *
 * The pool builder auto-generates the REVERSE direction for every cross-library pair
 * (so each pair produces two question types). Only one direction needs to be written here.
 *
 * DO NOT EDIT the generated staticRelationshipEntries.ts from this file.
 * DO NOT add AI calls or runtime generation here.
 */

export interface NaturalPhrasePair {
  anchor:          string
  option:          string
  position:        'before' | 'after'
  phrase:          string
  /** Exact term string of the partner library word inside the option */
  partnerTerm?:    string
  exampleSentence?: string
}

export const NATURAL_PHRASE_PAIRS: NaturalPhrasePair[] = [

  // ── OVERCOME ────────────────────────────────────────────────────────────────
  { anchor: 'overcome', option: 'adversity',       position: 'after', phrase: 'overcome adversity',       partnerTerm: 'adversity' },
  { anchor: 'overcome', option: 'an aversion',     position: 'after', phrase: 'overcome an aversion',     partnerTerm: 'aversion' },
  { anchor: 'overcome', option: 'a setback',       position: 'after', phrase: 'overcome a setback',       partnerTerm: 'setback' },
  { anchor: 'overcome', option: 'a compulsion',    position: 'after', phrase: 'overcome a compulsion',    partnerTerm: 'compulsion' },
  { anchor: 'overcome', option: 'stigma',          position: 'after', phrase: 'overcome stigma',          partnerTerm: 'stigma' },
  { anchor: 'overcome', option: 'remorse',         position: 'after', phrase: 'overcome remorse',         partnerTerm: 'remorse' },
  { anchor: 'overcome', option: 'a relapse',       position: 'after', phrase: 'overcome a relapse',       partnerTerm: 'relapse' },
  { anchor: 'overcome', option: 'a grudge',        position: 'after', phrase: 'overcome a grudge',        partnerTerm: 'grudge' },
  { anchor: 'overcome', option: 'obstacles',       position: 'after', phrase: 'overcome obstacles' },
  { anchor: 'overcome', option: 'resistance',      position: 'after', phrase: 'overcome resistance' },
  { anchor: 'overcome', option: 'challenges',      position: 'after', phrase: 'overcome challenges' },

  // ── SUPPRESS ────────────────────────────────────────────────────────────────
  { anchor: 'suppress', option: 'a compulsion',    position: 'after', phrase: 'suppress a compulsion',    partnerTerm: 'compulsion' },
  { anchor: 'suppress', option: 'a craving',       position: 'after', phrase: 'suppress a craving',       partnerTerm: 'craving' },
  { anchor: 'suppress', option: 'wrath',           position: 'after', phrase: 'suppress wrath',           partnerTerm: 'wrath' },
  { anchor: 'suppress', option: 'remorse',         position: 'after', phrase: 'suppress remorse',         partnerTerm: 'remorse' },
  { anchor: 'suppress', option: 'dissent',         position: 'after', phrase: 'suppress dissent' },
  { anchor: 'suppress', option: 'evidence',        position: 'after', phrase: 'suppress evidence' },
  { anchor: 'suppress', option: 'emotions',        position: 'after', phrase: 'suppress emotions' },

  // ── SUCCUMB ─────────────────────────────────────────────────────────────────
  { anchor: 'succumb', option: 'to a compulsion',  position: 'after', phrase: 'succumb to a compulsion',  partnerTerm: 'compulsion' },
  { anchor: 'succumb', option: 'to a craving',     position: 'after', phrase: 'succumb to a craving',     partnerTerm: 'craving' },
  { anchor: 'succumb', option: 'to wrath',         position: 'after', phrase: 'succumb to wrath',         partnerTerm: 'wrath' },
  { anchor: 'succumb', option: 'to misery',        position: 'after', phrase: 'succumb to misery',        partnerTerm: 'misery' },
  { anchor: 'succumb', option: 'to temptation',    position: 'after', phrase: 'succumb to temptation' },
  { anchor: 'succumb', option: 'to pressure',      position: 'after', phrase: 'succumb to pressure' },

  // ── CURB ────────────────────────────────────────────────────────────────────
  { anchor: 'curb', option: 'a craving',           position: 'after', phrase: 'curb a craving',           partnerTerm: 'craving' },
  { anchor: 'curb', option: 'a compulsion',        position: 'after', phrase: 'curb a compulsion',        partnerTerm: 'compulsion' },
  { anchor: 'curb', option: 'wrath',               position: 'after', phrase: 'curb wrath',               partnerTerm: 'wrath' },
  { anchor: 'curb', option: 'the proliferation',   position: 'after', phrase: 'curb the proliferation',   partnerTerm: 'proliferation' },
  { anchor: 'curb', option: 'enthusiasm',          position: 'after', phrase: 'curb enthusiasm' },
  { anchor: 'curb', option: 'spending',            position: 'after', phrase: 'curb spending' },

  // ── INDULGE ─────────────────────────────────────────────────────────────────
  { anchor: 'indulge', option: 'a craving',        position: 'after', phrase: 'indulge a craving',        partnerTerm: 'craving' },
  { anchor: 'indulge', option: 'a compulsion',     position: 'after', phrase: 'indulge a compulsion',     partnerTerm: 'compulsion' },
  { anchor: 'indulge', option: 'in misery',        position: 'after', phrase: 'indulge in misery',        partnerTerm: 'misery' },
  { anchor: 'indulge', option: 'in nostalgia',     position: 'after', phrase: 'indulge in nostalgia' },
  { anchor: 'indulge', option: 'in excess',        position: 'after', phrase: 'indulge in excess' },

  // ── TAME ────────────────────────────────────────────────────────────────────
  { anchor: 'tame', option: 'a compulsion',        position: 'after', phrase: 'tame a compulsion',        partnerTerm: 'compulsion' },
  { anchor: 'tame', option: 'wrath',               position: 'after', phrase: 'tame wrath',               partnerTerm: 'wrath' },
  { anchor: 'tame', option: 'a craving',           position: 'after', phrase: 'tame a craving',           partnerTerm: 'craving' },
  { anchor: 'tame', option: 'impulses',            position: 'after', phrase: 'tame impulses' },

  // ── TEMPER ──────────────────────────────────────────────────────────────────
  { anchor: 'temper', option: 'wrath',             position: 'after', phrase: 'temper wrath',             partnerTerm: 'wrath' },
  { anchor: 'temper', option: 'enthusiasm',        position: 'after', phrase: 'temper enthusiasm' },
  { anchor: 'temper', option: 'expectations',      position: 'after', phrase: 'temper expectations' },
  { anchor: 'temper', option: 'ambition',          position: 'after', phrase: 'temper ambition' },

  // ── STIFLE ──────────────────────────────────────────────────────────────────
  { anchor: 'stifle', option: 'compassion',        position: 'after', phrase: 'stifle compassion',        partnerTerm: 'compassion' },
  { anchor: 'stifle', option: 'wrath',             position: 'after', phrase: 'stifle wrath',             partnerTerm: 'wrath' },
  { anchor: 'stifle', option: 'dissent',           position: 'after', phrase: 'stifle dissent' },
  { anchor: 'stifle', option: 'creativity',        position: 'after', phrase: 'stifle creativity' },
  { anchor: 'stifle', option: 'growth',            position: 'after', phrase: 'stifle growth' },
  { anchor: 'stifle', option: 'debate',            position: 'after', phrase: 'stifle debate' },

  // ── MAINTAIN ────────────────────────────────────────────────────────────────
  { anchor: 'maintain', option: 'vigilance',       position: 'after', phrase: 'maintain vigilance',       partnerTerm: 'vigilance' },
  { anchor: 'maintain', option: 'poise',           position: 'after', phrase: 'maintain poise',           partnerTerm: 'poise' },
  { anchor: 'maintain', option: 'composure',       position: 'after', phrase: 'maintain composure' },
  { anchor: 'maintain', option: 'momentum',        position: 'after', phrase: 'maintain momentum' },
  { anchor: 'maintain', option: 'leniency',        position: 'after', phrase: 'maintain leniency',        partnerTerm: 'leniency' },
  { anchor: 'maintain', option: 'standards',       position: 'after', phrase: 'maintain standards' },

  // ── BOLSTER ─────────────────────────────────────────────────────────────────
  { anchor: 'bolster', option: 'willpower',        position: 'after', phrase: 'bolster willpower',        partnerTerm: 'willpower' },
  { anchor: 'bolster', option: 'compassion',       position: 'after', phrase: 'bolster compassion',       partnerTerm: 'compassion' },
  { anchor: 'bolster', option: 'poise',            position: 'after', phrase: 'bolster poise',            partnerTerm: 'poise' },
  { anchor: 'bolster', option: 'morale',           position: 'after', phrase: 'bolster morale' },
  { anchor: 'bolster', option: 'confidence',       position: 'after', phrase: 'bolster confidence' },
  { anchor: 'bolster', option: 'resilience',       position: 'after', phrase: 'bolster resilience' },

  // ── AMPLIFY ─────────────────────────────────────────────────────────────────
  { anchor: 'amplify', option: 'compassion',       position: 'after', phrase: 'amplify compassion',       partnerTerm: 'compassion' },
  { anchor: 'amplify', option: 'wrath',            position: 'after', phrase: 'amplify wrath',            partnerTerm: 'wrath' },
  { anchor: 'amplify', option: 'misery',           position: 'after', phrase: 'amplify misery',           partnerTerm: 'misery' },
  { anchor: 'amplify', option: 'malice',           position: 'after', phrase: 'amplify malice',           partnerTerm: 'malice' },
  { anchor: 'amplify', option: 'impact',           position: 'after', phrase: 'amplify impact' },
  { anchor: 'amplify', option: 'a message',        position: 'after', phrase: 'amplify a message' },

  // ── EXACERBATE ──────────────────────────────────────────────────────────────
  { anchor: 'exacerbate', option: 'adversity',     position: 'after', phrase: 'exacerbate adversity',     partnerTerm: 'adversity' },
  { anchor: 'exacerbate', option: 'stigma',        position: 'after', phrase: 'exacerbate the stigma',    partnerTerm: 'stigma' },
  { anchor: 'exacerbate', option: 'misery',        position: 'after', phrase: 'exacerbate misery',        partnerTerm: 'misery' },
  { anchor: 'exacerbate', option: 'a relapse',     position: 'after', phrase: 'exacerbate a relapse',     partnerTerm: 'relapse' },
  { anchor: 'exacerbate', option: 'tensions',      position: 'after', phrase: 'exacerbate tensions' },
  { anchor: 'exacerbate', option: 'the situation', position: 'after', phrase: 'exacerbate the situation' },

  // ── COMPOUND ────────────────────────────────────────────────────────────────
  { anchor: 'compound', option: 'adversity',       position: 'after', phrase: 'compound adversity',       partnerTerm: 'adversity' },
  { anchor: 'compound', option: 'misery',          position: 'after', phrase: 'compound misery',          partnerTerm: 'misery' },
  { anchor: 'compound', option: 'a setback',       position: 'after', phrase: 'compound a setback',       partnerTerm: 'setback' },
  { anchor: 'compound', option: 'repercussions',   position: 'after', phrase: 'compound repercussions',   partnerTerm: 'repercussion' },
  { anchor: 'compound', option: 'the problem',     position: 'after', phrase: 'compound the problem' },
  { anchor: 'compound', option: 'the error',       position: 'after', phrase: 'compound the error' },

  // ── AGGRAVATE ───────────────────────────────────────────────────────────────
  { anchor: 'aggravate', option: 'stigma',         position: 'after', phrase: 'aggravate the stigma',     partnerTerm: 'stigma' },
  { anchor: 'aggravate', option: 'adversity',      position: 'after', phrase: 'aggravate adversity',      partnerTerm: 'adversity' },
  { anchor: 'aggravate', option: 'a grudge',       position: 'after', phrase: 'aggravate a grudge',       partnerTerm: 'grudge' },
  { anchor: 'aggravate', option: 'misery',         position: 'after', phrase: 'aggravate misery',         partnerTerm: 'misery' },
  { anchor: 'aggravate', option: 'the situation',  position: 'after', phrase: 'aggravate the situation' },

  // ── PERPETUATE ──────────────────────────────────────────────────────────────
  { anchor: 'perpetuate', option: 'stigma',        position: 'after', phrase: 'perpetuate stigma',        partnerTerm: 'stigma' },
  { anchor: 'perpetuate', option: 'a fallacy',     position: 'after', phrase: 'perpetuate a fallacy',     partnerTerm: 'fallacy' },
  { anchor: 'perpetuate', option: 'malice',        position: 'after', phrase: 'perpetuate malice',        partnerTerm: 'malice' },
  { anchor: 'perpetuate', option: 'a hoax',        position: 'after', phrase: 'perpetuate a hoax',        partnerTerm: 'hoax' },
  { anchor: 'perpetuate', option: 'misery',        position: 'after', phrase: 'perpetuate misery',        partnerTerm: 'misery' },
  { anchor: 'perpetuate', option: 'ostracism',     position: 'after', phrase: 'perpetuate ostracism',     partnerTerm: 'ostracism' },
  { anchor: 'perpetuate', option: 'a cycle',       position: 'after', phrase: 'perpetuate a cycle' },
  { anchor: 'perpetuate', option: 'a myth',        position: 'after', phrase: 'perpetuate a myth' },

  // ── ACKNOWLEDGE ─────────────────────────────────────────────────────────────
  { anchor: 'acknowledge', option: 'remorse',      position: 'after', phrase: 'acknowledge remorse',      partnerTerm: 'remorse' },
  { anchor: 'acknowledge', option: 'a setback',    position: 'after', phrase: 'acknowledge a setback',    partnerTerm: 'setback' },
  { anchor: 'acknowledge', option: 'a fallacy',    position: 'after', phrase: 'acknowledge a fallacy',    partnerTerm: 'fallacy' },
  { anchor: 'acknowledge', option: 'repercussions',position: 'after', phrase: 'acknowledge repercussions',partnerTerm: 'repercussion' },
  { anchor: 'acknowledge', option: 'shortcomings', position: 'after', phrase: 'acknowledge shortcomings' },
  { anchor: 'acknowledge', option: 'responsibility',position:'after', phrase: 'acknowledge responsibility' },

  // ── INSTILL ─────────────────────────────────────────────────────────────────
  { anchor: 'instill', option: 'compassion',       position: 'after', phrase: 'instill compassion',       partnerTerm: 'compassion' },
  { anchor: 'instill', option: 'willpower',        position: 'after', phrase: 'instill willpower',        partnerTerm: 'willpower' },
  { anchor: 'instill', option: 'vigilance',        position: 'after', phrase: 'instill vigilance',        partnerTerm: 'vigilance' },
  { anchor: 'instill', option: 'malice',           position: 'after', phrase: 'instill malice',           partnerTerm: 'malice' },
  { anchor: 'instill', option: 'fear',             position: 'after', phrase: 'instill fear' },
  { anchor: 'instill', option: 'confidence',       position: 'after', phrase: 'instill confidence' },
  { anchor: 'instill', option: 'discipline',       position: 'after', phrase: 'instill discipline' },

  // ── INFUSE ──────────────────────────────────────────────────────────────────
  { anchor: 'infuse', option: 'compassion',        position: 'after', phrase: 'infuse compassion',        partnerTerm: 'compassion' },
  { anchor: 'infuse', option: 'willpower',         position: 'after', phrase: 'infuse willpower',         partnerTerm: 'willpower' },
  { anchor: 'infuse', option: 'energy',            position: 'after', phrase: 'infuse energy' },
  { anchor: 'infuse', option: 'meaning',           position: 'after', phrase: 'infuse meaning' },

  // ── ENGENDER ────────────────────────────────────────────────────────────────
  { anchor: 'engender', option: 'compassion',      position: 'after', phrase: 'engender compassion',      partnerTerm: 'compassion' },
  { anchor: 'engender', option: 'malice',          position: 'after', phrase: 'engender malice',          partnerTerm: 'malice' },
  { anchor: 'engender', option: 'ostracism',       position: 'after', phrase: 'engender ostracism',       partnerTerm: 'ostracism' },
  { anchor: 'engender', option: 'leniency',        position: 'after', phrase: 'engender leniency',        partnerTerm: 'leniency' },
  { anchor: 'engender', option: 'trust',           position: 'after', phrase: 'engender trust' },
  { anchor: 'engender', option: 'hostility',       position: 'after', phrase: 'engender hostility' },

  // ── DWINDLE ─────────────────────────────────────────────────────────────────
  { anchor: 'dwindle', option: 'willpower',        position: 'after', phrase: 'willpower dwindles',       partnerTerm: 'willpower', exampleSentence: 'His willpower dwindles under stress.' },
  { anchor: 'dwindle', option: 'compassion',       position: 'after', phrase: 'compassion dwindles',      partnerTerm: 'compassion', exampleSentence: 'Compassion dwindles when burnout sets in.' },
  { anchor: 'dwindle', option: 'leniency',         position: 'after', phrase: 'leniency dwindles',        partnerTerm: 'leniency' },
  { anchor: 'dwindle', option: 'support',          position: 'after', phrase: 'support dwindles' },
  { anchor: 'dwindle', option: 'resources',        position: 'after', phrase: 'resources dwindle' },

  // ── THWART ──────────────────────────────────────────────────────────────────
  { anchor: 'thwart', option: 'a revolt',          position: 'after', phrase: 'thwart a revolt',          partnerTerm: 'revolt' },
  { anchor: 'thwart', option: 'a remedy',          position: 'after', phrase: 'thwart a remedy',          partnerTerm: 'remedy' },
  { anchor: 'thwart', option: 'redemption',        position: 'after', phrase: 'thwart redemption',        partnerTerm: 'redemption' },
  { anchor: 'thwart', option: 'efforts',           position: 'after', phrase: 'thwart efforts' },
  { anchor: 'thwart', option: 'attempts',          position: 'after', phrase: 'thwart attempts' },
  { anchor: 'thwart', option: 'progress',          position: 'after', phrase: 'thwart progress' },

  // ── SCRUTINIZE ──────────────────────────────────────────────────────────────
  { anchor: 'scrutinize', option: 'a blueprint',   position: 'after', phrase: 'scrutinize a blueprint',   partnerTerm: 'blueprint' },
  { anchor: 'scrutinize', option: 'testimony',     position: 'after', phrase: 'scrutinize testimony',     partnerTerm: 'testimony' },
  { anchor: 'scrutinize', option: 'evidence',      position: 'after', phrase: 'scrutinize evidence' },
  { anchor: 'scrutinize', option: 'conduct',       position: 'after', phrase: 'scrutinize conduct' },
  { anchor: 'scrutinize', option: 'data',          position: 'after', phrase: 'scrutinize data' },

  // ── UNDERPIN ────────────────────────────────────────────────────────────────
  { anchor: 'underpin', option: 'a blueprint',     position: 'after', phrase: 'underpin a blueprint',     partnerTerm: 'blueprint' },
  { anchor: 'underpin', option: 'a framework',     position: 'after', phrase: 'underpin a framework',     partnerTerm: 'framework' },
  { anchor: 'underpin', option: 'the remedy',      position: 'after', phrase: 'underpin the remedy',      partnerTerm: 'remedy' },
  { anchor: 'underpin', option: 'the argument',    position: 'after', phrase: 'underpin the argument' },
  { anchor: 'underpin', option: 'success',         position: 'after', phrase: 'underpin success' },

  // ── RECTIFY ─────────────────────────────────────────────────────────────────
  { anchor: 'rectify', option: 'a setback',        position: 'after', phrase: 'rectify a setback',        partnerTerm: 'setback' },
  { anchor: 'rectify', option: 'a fallacy',        position: 'after', phrase: 'rectify a fallacy',        partnerTerm: 'fallacy' },
  { anchor: 'rectify', option: 'repercussions',    position: 'after', phrase: 'rectify repercussions',    partnerTerm: 'repercussion' },
  { anchor: 'rectify', option: 'a relapse',        position: 'after', phrase: 'rectify a relapse',        partnerTerm: 'relapse' },
  { anchor: 'rectify', option: 'the situation',    position: 'after', phrase: 'rectify the situation' },
  { anchor: 'rectify', option: 'mistakes',         position: 'after', phrase: 'rectify mistakes' },

  // ── SUBVERT ─────────────────────────────────────────────────────────────────
  { anchor: 'subvert', option: 'a blueprint',      position: 'after', phrase: 'subvert a blueprint',      partnerTerm: 'blueprint' },
  { anchor: 'subvert', option: 'a remedy',         position: 'after', phrase: 'subvert a remedy',         partnerTerm: 'remedy' },
  { anchor: 'subvert', option: 'authority',        position: 'after', phrase: 'subvert authority' },
  { anchor: 'subvert', option: 'expectations',     position: 'after', phrase: 'subvert expectations' },
  { anchor: 'subvert', option: 'the narrative',    position: 'after', phrase: 'subvert the narrative' },

  // ── UNSETTLE ────────────────────────────────────────────────────────────────
  { anchor: 'unsettle', option: 'poise',           position: 'after', phrase: 'unsettle poise',           partnerTerm: 'poise' },
  { anchor: 'unsettle', option: 'willpower',       position: 'after', phrase: 'unsettle willpower',       partnerTerm: 'willpower' },
  { anchor: 'unsettle', option: 'composure',       position: 'after', phrase: 'unsettle composure' },
  { anchor: 'unsettle', option: 'assumptions',     position: 'after', phrase: 'unsettle assumptions' },

  // ── EXERT ───────────────────────────────────────────────────────────────────
  { anchor: 'exert', option: 'willpower',          position: 'after', phrase: 'exert willpower',          partnerTerm: 'willpower' },
  { anchor: 'exert', option: 'influence',          position: 'after', phrase: 'exert influence' },
  { anchor: 'exert', option: 'pressure',           position: 'after', phrase: 'exert pressure' },
  { anchor: 'exert', option: 'control',            position: 'after', phrase: 'exert control' },

  // ── TRANSCEND ───────────────────────────────────────────────────────────────
  { anchor: 'transcend', option: 'adversity',      position: 'after', phrase: 'transcend adversity',      partnerTerm: 'adversity' },
  { anchor: 'transcend', option: 'misery',         position: 'after', phrase: 'transcend misery',         partnerTerm: 'misery' },
  { anchor: 'transcend', option: 'an ordeal',      position: 'after', phrase: 'transcend an ordeal',      partnerTerm: 'ordeal' },
  { anchor: 'transcend', option: 'limitations',    position: 'after', phrase: 'transcend limitations' },
  { anchor: 'transcend', option: 'boundaries',     position: 'after', phrase: 'transcend boundaries' },

  // ── ENDURE ──────────────────────────────────────────────────────────────────
  { anchor: 'endure', option: 'adversity',         position: 'after', phrase: 'endure adversity',         partnerTerm: 'adversity' },
  { anchor: 'endure', option: 'an ordeal',         position: 'after', phrase: 'endure an ordeal',         partnerTerm: 'ordeal' },
  { anchor: 'endure', option: 'toil',              position: 'after', phrase: 'endure toil',              partnerTerm: 'toil' },
  { anchor: 'endure', option: 'misery',            position: 'after', phrase: 'endure misery',            partnerTerm: 'misery' },
  { anchor: 'endure', option: 'hardship',          position: 'after', phrase: 'endure hardship' },
  { anchor: 'endure', option: 'suffering',         position: 'after', phrase: 'endure suffering' },

  // ── INSTIGATE ───────────────────────────────────────────────────────────────
  { anchor: 'instigate', option: 'a revolt',       position: 'after', phrase: 'instigate a revolt',       partnerTerm: 'revolt' },
  { anchor: 'instigate', option: 'havoc',          position: 'after', phrase: 'instigate havoc',          partnerTerm: 'havoc' },
  { anchor: 'instigate', option: 'conflict',       position: 'after', phrase: 'instigate conflict' },
  { anchor: 'instigate', option: 'change',         position: 'after', phrase: 'instigate change' },

  // ── LURE ────────────────────────────────────────────────────────────────────
  { anchor: 'lure', option: 'into a compulsion',   position: 'after', phrase: 'lure into a compulsion',   partnerTerm: 'compulsion' },
  { anchor: 'lure', option: 'into havoc',          position: 'after', phrase: 'lure into havoc',          partnerTerm: 'havoc' },
  { anchor: 'lure', option: 'into temptation',     position: 'after', phrase: 'lure into temptation' },
  { anchor: 'lure', option: 'into complacency',    position: 'after', phrase: 'lure into complacency' },

  // ── MOLLIFY ─────────────────────────────────────────────────────────────────
  { anchor: 'mollify', option: 'wrath',            position: 'after', phrase: 'mollify wrath',            partnerTerm: 'wrath' },
  { anchor: 'mollify', option: 'a grudge',         position: 'after', phrase: 'mollify a grudge',         partnerTerm: 'grudge' },
  { anchor: 'mollify', option: 'critics',          position: 'after', phrase: 'mollify critics' },
  { anchor: 'mollify', option: 'opposition',       position: 'after', phrase: 'mollify opposition' },

  // ── PLACATE ─────────────────────────────────────────────────────────────────
  { anchor: 'placate', option: 'wrath',            position: 'after', phrase: 'placate wrath',            partnerTerm: 'wrath' },
  { anchor: 'placate', option: 'malice',           position: 'after', phrase: 'placate malice',           partnerTerm: 'malice' },
  { anchor: 'placate', option: 'critics',          position: 'after', phrase: 'placate critics' },
  { anchor: 'placate', option: 'the opposition',   position: 'after', phrase: 'placate the opposition' },

  // ── MEDDLE ──────────────────────────────────────────────────────────────────
  { anchor: 'meddle', option: 'in a remedy',       position: 'after', phrase: 'meddle in a remedy',       partnerTerm: 'remedy' },
  { anchor: 'meddle', option: 'in affairs',        position: 'after', phrase: 'meddle in affairs' },
  { anchor: 'meddle', option: 'with the plan',     position: 'after', phrase: 'meddle with the plan' },

  // ── ERADICATE ───────────────────────────────────────────────────────────────
  { anchor: 'eradicate', option: 'stigma',         position: 'after', phrase: 'eradicate stigma',         partnerTerm: 'stigma' },
  { anchor: 'eradicate', option: 'ostracism',      position: 'after', phrase: 'eradicate ostracism',      partnerTerm: 'ostracism' },
  { anchor: 'eradicate', option: 'a fallacy',      position: 'after', phrase: 'eradicate a fallacy',      partnerTerm: 'fallacy' },
  { anchor: 'eradicate', option: 'malice',         position: 'after', phrase: 'eradicate malice',         partnerTerm: 'malice' },
  { anchor: 'eradicate', option: 'poverty',        position: 'after', phrase: 'eradicate poverty' },
  { anchor: 'eradicate', option: 'corruption',     position: 'after', phrase: 'eradicate corruption' },

  // ── EMBROIL ─────────────────────────────────────────────────────────────────
  { anchor: 'embroil', option: 'in a revolt',      position: 'after', phrase: 'embroil in a revolt',      partnerTerm: 'revolt' },
  { anchor: 'embroil', option: 'in havoc',         position: 'after', phrase: 'embroil in havoc',         partnerTerm: 'havoc' },
  { anchor: 'embroil', option: 'in misery',        position: 'after', phrase: 'embroil in misery',        partnerTerm: 'misery' },
  { anchor: 'embroil', option: 'in controversy',   position: 'after', phrase: 'embroil in controversy' },
  { anchor: 'embroil', option: 'in conflict',      position: 'after', phrase: 'embroil in conflict' },

  // ── DETER ───────────────────────────────────────────────────────────────────
  { anchor: 'deter', option: 'a relapse',          position: 'after', phrase: 'deter a relapse',          partnerTerm: 'relapse' },
  { anchor: 'deter', option: 'a revolt',           position: 'after', phrase: 'deter a revolt',           partnerTerm: 'revolt' },
  { anchor: 'deter', option: 'crime',              position: 'after', phrase: 'deter crime' },
  { anchor: 'deter', option: 'aggression',         position: 'after', phrase: 'deter aggression' },

  // ── DISCARD ─────────────────────────────────────────────────────────────────
  { anchor: 'discard', option: 'a remedy',         position: 'after', phrase: 'discard a remedy',         partnerTerm: 'remedy' },
  { anchor: 'discard', option: 'a blueprint',      position: 'after', phrase: 'discard a blueprint',      partnerTerm: 'blueprint' },
  { anchor: 'discard', option: 'a fallacy',        position: 'after', phrase: 'discard a fallacy',        partnerTerm: 'fallacy' },
  { anchor: 'discard', option: 'assumptions',      position: 'after', phrase: 'discard assumptions' },
  { anchor: 'discard', option: 'evidence',         position: 'after', phrase: 'discard evidence' },

  // ── BYPASS ──────────────────────────────────────────────────────────────────
  { anchor: 'bypass', option: 'a threshold',       position: 'after', phrase: 'bypass a threshold',       partnerTerm: 'threshold' },
  { anchor: 'bypass', option: 'a remedy',          position: 'after', phrase: 'bypass a remedy',          partnerTerm: 'remedy' },
  { anchor: 'bypass', option: 'protocol',          position: 'after', phrase: 'bypass protocol' },
  { anchor: 'bypass', option: 'safeguards',        position: 'after', phrase: 'bypass safeguards' },

  // ── DEFY ────────────────────────────────────────────────────────────────────
  { anchor: 'defy', option: 'a threshold',         position: 'after', phrase: 'defy a threshold',         partnerTerm: 'threshold' },
  { anchor: 'defy', option: 'authority',           position: 'after', phrase: 'defy authority' },
  { anchor: 'defy', option: 'convention',          position: 'after', phrase: 'defy convention' },
  { anchor: 'defy', option: 'expectations',        position: 'after', phrase: 'defy expectations' },

  // ── COLLATE ─────────────────────────────────────────────────────────────────
  { anchor: 'collate', option: 'testimony',        position: 'after', phrase: 'collate testimony',        partnerTerm: 'testimony' },
  { anchor: 'collate', option: 'evidence',         position: 'after', phrase: 'collate evidence' },
  { anchor: 'collate', option: 'data',             position: 'after', phrase: 'collate data' },
  { anchor: 'collate', option: 'reports',          position: 'after', phrase: 'collate reports' },

  // ── REVERT ──────────────────────────────────────────────────────────────────
  { anchor: 'revert', option: 'to a relapse',      position: 'after', phrase: 'revert to a relapse',      partnerTerm: 'relapse' },
  { anchor: 'revert', option: 'to a remedy',       position: 'after', phrase: 'revert to a remedy',       partnerTerm: 'remedy' },
  { anchor: 'revert', option: 'to old habits',     position: 'after', phrase: 'revert to old habits' },
  { anchor: 'revert', option: 'to the original',   position: 'after', phrase: 'revert to the original' },

  // ── EXASPERATE ──────────────────────────────────────────────────────────────
  { anchor: 'exasperate', option: 'adversity',     position: 'after', phrase: 'exasperate adversity',     partnerTerm: 'adversity' },
  { anchor: 'exasperate', option: 'the situation', position: 'after', phrase: 'exasperate the situation' },
  { anchor: 'exasperate', option: 'critics',       position: 'after', phrase: 'exasperate critics' },

  // ── PLUMMET ─────────────────────────────────────────────────────────────────
  { anchor: 'plummet', option: 'willpower',        position: 'after', phrase: 'willpower plummets',       partnerTerm: 'willpower', exampleSentence: 'Your willpower plummets when you are sleep-deprived.' },
  { anchor: 'plummet', option: 'morale',           position: 'after', phrase: 'morale plummets' },
  { anchor: 'plummet', option: 'confidence',       position: 'after', phrase: 'confidence plummets' },

  // ── SWAY ────────────────────────────────────────────────────────────────────
  { anchor: 'sway', option: 'willpower',           position: 'after', phrase: 'sway willpower',           partnerTerm: 'willpower' },
  { anchor: 'sway', option: 'opinion',             position: 'after', phrase: 'sway opinion' },
  { anchor: 'sway', option: 'judgement',           position: 'after', phrase: 'sway judgement' },
  { anchor: 'sway', option: 'a crowd',             position: 'after', phrase: 'sway a crowd' },

  // ── RELENT ──────────────────────────────────────────────────────────────────
  { anchor: 'relent', option: 'on leniency',       position: 'after', phrase: 'relent on leniency',       partnerTerm: 'leniency' },
  { anchor: 'relent', option: 'under pressure',    position: 'after', phrase: 'relent under pressure' },
  { anchor: 'relent', option: 'eventually',        position: 'after', phrase: 'eventually relent' },

  // ── AMALGAMATE ──────────────────────────────────────────────────────────────
  { anchor: 'amalgamate', option: 'a remedy',      position: 'after', phrase: 'amalgamate a remedy',      partnerTerm: 'remedy' },
  { anchor: 'amalgamate', option: 'a blueprint',   position: 'after', phrase: 'amalgamate a blueprint',   partnerTerm: 'blueprint' },
  { anchor: 'amalgamate', option: 'resources',     position: 'after', phrase: 'amalgamate resources' },
  { anchor: 'amalgamate', option: 'approaches',    position: 'after', phrase: 'amalgamate approaches' },

  // ── COMPEL ──────────────────────────────────────────────────────────────────
  { anchor: 'compel', option: 'leniency',          position: 'after', phrase: 'compel leniency',          partnerTerm: 'leniency' },
  { anchor: 'compel', option: 'a confession',      position: 'after', phrase: 'compel a confession',      partnerTerm: 'confession' },
  { anchor: 'compel', option: 'action',            position: 'after', phrase: 'compel action' },
  { anchor: 'compel', option: 'compliance',        position: 'after', phrase: 'compel compliance' },

  // ── INTIMIDATE ──────────────────────────────────────────────────────────────
  { anchor: 'intimidate', option: 'into leniency', position: 'after', phrase: 'intimidate into leniency', partnerTerm: 'leniency' },
  { anchor: 'intimidate', option: 'witnesses',     position: 'after', phrase: 'intimidate witnesses' },
  { anchor: 'intimidate', option: 'opponents',     position: 'after', phrase: 'intimidate opponents' },

  // ── LAMENT ──────────────────────────────────────────────────────────────────
  { anchor: 'lament', option: 'adversity',         position: 'after', phrase: 'lament adversity',         partnerTerm: 'adversity' },
  { anchor: 'lament', option: 'a setback',         position: 'after', phrase: 'lament a setback',         partnerTerm: 'setback' },
  { anchor: 'lament', option: 'misery',            position: 'after', phrase: 'lament misery',            partnerTerm: 'misery' },
  { anchor: 'lament', option: 'the loss',          position: 'after', phrase: 'lament the loss' },
  { anchor: 'lament', option: 'a missed opportunity', position: 'after', phrase: 'lament a missed opportunity' },

  // ── REVAMP ──────────────────────────────────────────────────────────────────
  { anchor: 'revamp', option: 'a blueprint',       position: 'after', phrase: 'revamp a blueprint',       partnerTerm: 'blueprint' },
  { anchor: 'revamp', option: 'a remedy',          position: 'after', phrase: 'revamp a remedy',          partnerTerm: 'remedy' },
  { anchor: 'revamp', option: 'the framework',     position: 'after', phrase: 'revamp the framework',     partnerTerm: 'framework' },
  { anchor: 'revamp', option: 'the strategy',      position: 'after', phrase: 'revamp the strategy' },
  { anchor: 'revamp', option: 'the system',        position: 'after', phrase: 'revamp the system' },

  // ── CONFINE ─────────────────────────────────────────────────────────────────
  { anchor: 'confine', option: 'to the threshold', position: 'after', phrase: 'confine to the threshold', partnerTerm: 'threshold' },
  { anchor: 'confine', option: 'to a remedy',      position: 'after', phrase: 'confine to a remedy',      partnerTerm: 'remedy' },
  { anchor: 'confine', option: 'to barracks',      position: 'after', phrase: 'confine to barracks' },
  { anchor: 'confine', option: 'within limits',    position: 'after', phrase: 'confine within limits' },

  // ── CIRCUMSCRIBE ────────────────────────────────────────────────────────────
  { anchor: 'circumscribe', option: 'a threshold', position: 'after', phrase: 'circumscribe a threshold',  partnerTerm: 'threshold' },
  { anchor: 'circumscribe', option: 'authority',   position: 'after', phrase: 'circumscribe authority' },
  { anchor: 'circumscribe', option: 'freedom',     position: 'after', phrase: 'circumscribe freedom' },

  // ── DISMAY ──────────────────────────────────────────────────────────────────
  { anchor: 'dismay', option: 'at the setback',    position: 'after', phrase: 'dismay at the setback',    partnerTerm: 'setback' },
  { anchor: 'dismay', option: 'at the calamity',   position: 'after', phrase: 'dismay at the calamity',   partnerTerm: 'calamity' },
  { anchor: 'dismay', option: 'at the verdict',    position: 'after', phrase: 'dismay at the verdict' },

  // ── ENHANCE ─────────────────────────────────────────────────────────────────
  { anchor: 'enhance', option: 'poise',            position: 'after', phrase: 'enhance poise',            partnerTerm: 'poise' },
  { anchor: 'enhance', option: 'compassion',       position: 'after', phrase: 'enhance compassion',       partnerTerm: 'compassion' },
  { anchor: 'enhance', option: 'willpower',        position: 'after', phrase: 'enhance willpower',        partnerTerm: 'willpower' },
  { anchor: 'enhance', option: 'performance',      position: 'after', phrase: 'enhance performance' },
  { anchor: 'enhance', option: 'credibility',      position: 'after', phrase: 'enhance credibility' },

  // ── INSTIGATE (revolt / havoc already done above) ────────────────────────────

  // ── PROLIFERATION ───────────────────────────────────────────────────────────
  { anchor: 'proliferation', option: 'curb the',   position: 'before', phrase: 'curb the proliferation',  partnerTerm: 'curb' },
  { anchor: 'proliferation', option: 'stem the',   position: 'before', phrase: 'stem the proliferation' },
  { anchor: 'proliferation', option: 'rapid',      position: 'before', phrase: 'rapid proliferation' },
  { anchor: 'proliferation', option: 'the unchecked', position: 'before', phrase: 'the unchecked proliferation' },

  // ── ADVERSITY (additional non-cross-library) ─────────────────────────────────
  { anchor: 'adversity', option: 'in the face of', position: 'before', phrase: 'in the face of adversity' },
  { anchor: 'adversity', option: 'bounce back from', position: 'before', phrase: 'bounce back from adversity' },
  { anchor: 'adversity', option: 'a source of',    position: 'before', phrase: 'a source of adversity' },

  // ── SETBACK ─────────────────────────────────────────────────────────────────
  { anchor: 'setback', option: 'suffer a',         position: 'before', phrase: 'suffer a setback' },
  { anchor: 'setback', option: 'a temporary',      position: 'before', phrase: 'a temporary setback' },
  { anchor: 'setback', option: 'deal with a',      position: 'before', phrase: 'deal with a setback' },
  { anchor: 'setback', option: 'recover from a',   position: 'before', phrase: 'recover from a setback' },

  // ── AVERSION ────────────────────────────────────────────────────────────────
  { anchor: 'aversion', option: 'develop an',      position: 'before', phrase: 'develop an aversion' },
  { anchor: 'aversion', option: 'a deep',          position: 'before', phrase: 'a deep aversion' },
  { anchor: 'aversion', option: 'risk',            position: 'before', phrase: 'risk aversion' },
  { anchor: 'aversion', option: 'a strong',        position: 'before', phrase: 'a strong aversion' },

  // ── COMPULSION ──────────────────────────────────────────────────────────────
  { anchor: 'compulsion', option: 'a deep-seated', position: 'before', phrase: 'a deep-seated compulsion' },
  { anchor: 'compulsion', option: 'driven by',     position: 'before', phrase: 'driven by compulsion' },
  { anchor: 'compulsion', option: 'act on',        position: 'before', phrase: 'act on compulsion' },
  { anchor: 'compulsion', option: 'resist a',      position: 'before', phrase: 'resist a compulsion' },

  // ── CRAVING ─────────────────────────────────────────────────────────────────
  { anchor: 'craving', option: 'satisfy a',        position: 'before', phrase: 'satisfy a craving' },
  { anchor: 'craving', option: 'resist a',         position: 'before', phrase: 'resist a craving' },
  { anchor: 'craving', option: 'an overwhelming',  position: 'before', phrase: 'an overwhelming craving' },
  { anchor: 'craving', option: 'trigger a',        position: 'before', phrase: 'trigger a craving' },

  // ── WRATH ───────────────────────────────────────────────────────────────────
  { anchor: 'wrath', option: 'incur',              position: 'before', phrase: 'incur wrath' },
  { anchor: 'wrath', option: 'unleash',            position: 'before', phrase: 'unleash wrath' },
  { anchor: 'wrath', option: 'bear the brunt of',  position: 'before', phrase: 'bear the brunt of wrath' },
  { anchor: 'wrath', option: 'righteous',          position: 'before', phrase: 'righteous wrath' },
  { anchor: 'wrath', option: 'divine',             position: 'before', phrase: 'divine wrath' },
  { anchor: 'wrath', option: 'suppress',           position: 'before', phrase: 'suppress wrath',           partnerTerm: 'suppress' },

  // ── REMORSE ─────────────────────────────────────────────────────────────────
  { anchor: 'remorse', option: 'feel',             position: 'before', phrase: 'feel remorse' },
  { anchor: 'remorse', option: 'express',          position: 'before', phrase: 'express remorse' },
  { anchor: 'remorse', option: 'show',             position: 'before', phrase: 'show remorse' },
  { anchor: 'remorse', option: 'without',          position: 'before', phrase: 'without remorse' },
  { anchor: 'remorse', option: 'genuine',          position: 'before', phrase: 'genuine remorse' },
  { anchor: 'remorse', option: 'suppress',         position: 'before', phrase: 'suppress remorse',         partnerTerm: 'suppress' },

  // ── STIGMA ──────────────────────────────────────────────────────────────────
  { anchor: 'stigma', option: 'overcome',          position: 'before', phrase: 'overcome stigma',          partnerTerm: 'overcome' },
  { anchor: 'stigma', option: 'challenge the',     position: 'before', phrase: 'challenge the stigma' },
  { anchor: 'stigma', option: 'reduce the',        position: 'before', phrase: 'reduce the stigma' },
  { anchor: 'stigma', option: 'attach a',          position: 'before', phrase: 'attach a stigma' },
  { anchor: 'stigma', option: 'social',            position: 'before', phrase: 'social stigma' },
  { anchor: 'stigma', option: 'perpetuate',        position: 'before', phrase: 'perpetuate stigma',        partnerTerm: 'perpetuate' },

  // ── WILLPOWER ───────────────────────────────────────────────────────────────
  { anchor: 'willpower', option: 'bolster',        position: 'before', phrase: 'bolster willpower',        partnerTerm: 'bolster' },
  { anchor: 'willpower', option: 'exert',          position: 'before', phrase: 'exert willpower',          partnerTerm: 'exert' },
  { anchor: 'willpower', option: 'summon',         position: 'before', phrase: 'summon willpower' },
  { anchor: 'willpower', option: 'sheer',          position: 'before', phrase: 'sheer willpower' },
  { anchor: 'willpower', option: 'lack of',        position: 'before', phrase: 'lack of willpower' },
  { anchor: 'willpower', option: 'steely',         position: 'before', phrase: 'steely willpower' },

  // ── VIGILANCE ───────────────────────────────────────────────────────────────
  { anchor: 'vigilance', option: 'maintain',       position: 'before', phrase: 'maintain vigilance',       partnerTerm: 'maintain' },
  { anchor: 'vigilance', option: 'instill',        position: 'before', phrase: 'instill vigilance',        partnerTerm: 'instill' },
  { anchor: 'vigilance', option: 'constant',       position: 'before', phrase: 'constant vigilance' },
  { anchor: 'vigilance', option: 'unwavering',     position: 'before', phrase: 'unwavering vigilance',     partnerTerm: 'unwavering' },
  { anchor: 'vigilance', option: 'eternal',        position: 'before', phrase: 'eternal vigilance' },
  { anchor: 'vigilance', option: 'require',        position: 'before', phrase: 'require vigilance' },

  // ── COMPASSION ──────────────────────────────────────────────────────────────
  { anchor: 'compassion', option: 'amplify',       position: 'before', phrase: 'amplify compassion',       partnerTerm: 'amplify' },
  { anchor: 'compassion', option: 'stifle',        position: 'before', phrase: 'stifle compassion',        partnerTerm: 'stifle' },
  { anchor: 'compassion', option: 'instill',       position: 'before', phrase: 'instill compassion',       partnerTerm: 'instill' },
  { anchor: 'compassion', option: 'show',          position: 'before', phrase: 'show compassion' },
  { anchor: 'compassion', option: 'genuine',       position: 'before', phrase: 'genuine compassion' },
  { anchor: 'compassion', option: 'act with',      position: 'before', phrase: 'act with compassion' },

  // ── SOLACE ──────────────────────────────────────────────────────────────────
  { anchor: 'solace', option: 'find',              position: 'before', phrase: 'find solace' },
  { anchor: 'solace', option: 'seek',              position: 'before', phrase: 'seek solace' },
  { anchor: 'solace', option: 'offer',             position: 'before', phrase: 'offer solace' },
  { anchor: 'solace', option: 'bring',             position: 'before', phrase: 'bring solace' },
  { anchor: 'solace', option: 'tenuous',           position: 'before', phrase: 'tenuous solace',           partnerTerm: 'tenuous' },
  { anchor: 'solace', option: 'cold',              position: 'before', phrase: 'cold solace' },

  // ── CALAMITY ────────────────────────────────────────────────────────────────
  { anchor: 'calamity', option: 'avert a',         position: 'before', phrase: 'avert a calamity' },
  { anchor: 'calamity', option: 'a looming',       position: 'before', phrase: 'a looming calamity' },
  { anchor: 'calamity', option: 'cause a',         position: 'before', phrase: 'cause a calamity' },
  { anchor: 'calamity', option: 'recover from a',  position: 'before', phrase: 'recover from a calamity' },
  { anchor: 'calamity', option: 'an impending',    position: 'before', phrase: 'an impending calamity' },

  // ── ORDEAL ──────────────────────────────────────────────────────────────────
  { anchor: 'ordeal', option: 'endure an',         position: 'before', phrase: 'endure an ordeal',         partnerTerm: 'endure' },
  { anchor: 'ordeal', option: 'transcend an',      position: 'before', phrase: 'transcend an ordeal',      partnerTerm: 'transcend' },
  { anchor: 'ordeal', option: 'a harrowing',       position: 'before', phrase: 'a harrowing ordeal' },
  { anchor: 'ordeal', option: 'survive an',        position: 'before', phrase: 'survive an ordeal' },
  { anchor: 'ordeal', option: 'put through an',    position: 'before', phrase: 'put through an ordeal' },

  // ── TOIL ────────────────────────────────────────────────────────────────────
  { anchor: 'toil', option: 'endure',              position: 'before', phrase: 'endure toil',              partnerTerm: 'endure' },
  { anchor: 'toil', option: 'relentless',          position: 'before', phrase: 'relentless toil' },
  { anchor: 'toil', option: 'years of',            position: 'before', phrase: 'years of toil' },
  { anchor: 'toil', option: 'unremitting',         position: 'before', phrase: 'unremitting toil',         partnerTerm: 'unremitting' },
  { anchor: 'toil', option: 'daily',               position: 'before', phrase: 'daily toil' },

  // ── MISERY ──────────────────────────────────────────────────────────────────
  { anchor: 'misery', option: 'endure',            position: 'before', phrase: 'endure misery',            partnerTerm: 'endure' },
  { anchor: 'misery', option: 'compound',          position: 'before', phrase: 'compound misery',          partnerTerm: 'compound' },
  { anchor: 'misery', option: 'transcend',         position: 'before', phrase: 'transcend misery',         partnerTerm: 'transcend' },
  { anchor: 'misery', option: 'wallow in',         position: 'before', phrase: 'wallow in misery' },
  { anchor: 'misery', option: 'a source of',       position: 'before', phrase: 'a source of misery' },
  { anchor: 'misery', option: 'absolute',          position: 'before', phrase: 'absolute misery' },

  // ── FALLACY ─────────────────────────────────────────────────────────────────
  { anchor: 'fallacy', option: 'perpetuate a',     position: 'before', phrase: 'perpetuate a fallacy',     partnerTerm: 'perpetuate' },
  { anchor: 'fallacy', option: 'eradicate a',      position: 'before', phrase: 'eradicate a fallacy',      partnerTerm: 'eradicate' },
  { anchor: 'fallacy', option: 'acknowledge a',    position: 'before', phrase: 'acknowledge a fallacy',    partnerTerm: 'acknowledge' },
  { anchor: 'fallacy', option: 'expose a',         position: 'before', phrase: 'expose a fallacy' },
  { anchor: 'fallacy', option: 'a common',         position: 'before', phrase: 'a common fallacy' },
  { anchor: 'fallacy', option: 'disprove a',       position: 'before', phrase: 'disprove a fallacy' },

  // ── MALICE ──────────────────────────────────────────────────────────────────
  { anchor: 'malice', option: 'amplify',           position: 'before', phrase: 'amplify malice',           partnerTerm: 'amplify' },
  { anchor: 'malice', option: 'instill',           position: 'before', phrase: 'instill malice',           partnerTerm: 'instill' },
  { anchor: 'malice', option: 'perpetuate',        position: 'before', phrase: 'perpetuate malice',        partnerTerm: 'perpetuate' },
  { anchor: 'malice', option: 'eradicate',         position: 'before', phrase: 'eradicate malice',         partnerTerm: 'eradicate' },
  { anchor: 'malice', option: 'with',              position: 'before', phrase: 'with malice' },
  { anchor: 'malice', option: 'bear',              position: 'before', phrase: 'bear malice' },
  { anchor: 'malice', option: 'harbour',           position: 'before', phrase: 'harbour malice' },

  // ── HAVOC ───────────────────────────────────────────────────────────────────
  { anchor: 'havoc', option: 'instigate',          position: 'before', phrase: 'instigate havoc',          partnerTerm: 'instigate' },
  { anchor: 'havoc', option: 'wreak',              position: 'before', phrase: 'wreak havoc' },
  { anchor: 'havoc', option: 'cause',              position: 'before', phrase: 'cause havoc' },
  { anchor: 'havoc', option: 'create',             position: 'before', phrase: 'create havoc' },
  { anchor: 'havoc', option: 'unleash',            position: 'before', phrase: 'unleash havoc' },

  // ── GRUDGE ──────────────────────────────────────────────────────────────────
  { anchor: 'grudge', option: 'overcome a',        position: 'before', phrase: 'overcome a grudge',        partnerTerm: 'overcome' },
  { anchor: 'grudge', option: 'mollify a',         position: 'before', phrase: 'mollify a grudge',         partnerTerm: 'mollify' },
  { anchor: 'grudge', option: 'harbour a',         position: 'before', phrase: 'harbour a grudge' },
  { anchor: 'grudge', option: 'bear a',            position: 'before', phrase: 'bear a grudge' },
  { anchor: 'grudge', option: 'hold a',            position: 'before', phrase: 'hold a grudge' },
  { anchor: 'grudge', option: 'a deep-seated',     position: 'before', phrase: 'a deep-seated grudge' },

  // ── OSTRACISM ───────────────────────────────────────────────────────────────
  { anchor: 'ostracism', option: 'perpetuate',     position: 'before', phrase: 'perpetuate ostracism',     partnerTerm: 'perpetuate' },
  { anchor: 'ostracism', option: 'eradicate',      position: 'before', phrase: 'eradicate ostracism',      partnerTerm: 'eradicate' },
  { anchor: 'ostracism', option: 'engender',       position: 'before', phrase: 'engender ostracism',       partnerTerm: 'engender' },
  { anchor: 'ostracism', option: 'face',           position: 'before', phrase: 'face ostracism' },
  { anchor: 'ostracism', option: 'social',         position: 'before', phrase: 'social ostracism' },

  // ── LENIENCY ────────────────────────────────────────────────────────────────
  { anchor: 'leniency', option: 'maintain',        position: 'before', phrase: 'maintain leniency',        partnerTerm: 'maintain' },
  { anchor: 'leniency', option: 'engender',        position: 'before', phrase: 'engender leniency',        partnerTerm: 'engender' },
  { anchor: 'leniency', option: 'compel',          position: 'before', phrase: 'compel leniency',          partnerTerm: 'compel' },
  { anchor: 'leniency', option: 'show',            position: 'before', phrase: 'show leniency' },
  { anchor: 'leniency', option: 'plead for',       position: 'before', phrase: 'plead for leniency' },
  { anchor: 'leniency', option: 'excessive',       position: 'before', phrase: 'excessive leniency' },

  // ── IMPASSE ─────────────────────────────────────────────────────────────────
  { anchor: 'impasse', option: 'reach an',         position: 'before', phrase: 'reach an impasse' },
  { anchor: 'impasse', option: 'break the',        position: 'before', phrase: 'break the impasse' },
  { anchor: 'impasse', option: 'resolve an',       position: 'before', phrase: 'resolve an impasse' },
  { anchor: 'impasse', option: 'a diplomatic',     position: 'before', phrase: 'a diplomatic impasse' },

  // ── REVOLT ──────────────────────────────────────────────────────────────────
  { anchor: 'revolt', option: 'instigate a',       position: 'before', phrase: 'instigate a revolt',       partnerTerm: 'instigate' },
  { anchor: 'revolt', option: 'suppress a',        position: 'before', phrase: 'suppress a revolt',        partnerTerm: 'suppress' },
  { anchor: 'revolt', option: 'thwart a',          position: 'before', phrase: 'thwart a revolt',          partnerTerm: 'thwart' },
  { anchor: 'revolt', option: 'lead a',            position: 'before', phrase: 'lead a revolt' },
  { anchor: 'revolt', option: 'stage a',           position: 'before', phrase: 'stage a revolt' },
  { anchor: 'revolt', option: 'spark a',           position: 'before', phrase: 'spark a revolt' },

  // ── REDEMPTION ──────────────────────────────────────────────────────────────
  { anchor: 'redemption', option: 'thwart',        position: 'before', phrase: 'thwart redemption',        partnerTerm: 'thwart' },
  { anchor: 'redemption', option: 'seek',          position: 'before', phrase: 'seek redemption' },
  { anchor: 'redemption', option: 'find',          position: 'before', phrase: 'find redemption' },
  { anchor: 'redemption', option: 'a chance at',   position: 'before', phrase: 'a chance at redemption' },
  { anchor: 'redemption', option: 'path to',       position: 'before', phrase: 'path to redemption' },

  // ── RELAPSE ─────────────────────────────────────────────────────────────────
  { anchor: 'relapse', option: 'overcome a',       position: 'before', phrase: 'overcome a relapse',       partnerTerm: 'overcome' },
  { anchor: 'relapse', option: 'deter a',          position: 'before', phrase: 'deter a relapse',          partnerTerm: 'deter' },
  { anchor: 'relapse', option: 'prevent a',        position: 'before', phrase: 'prevent a relapse' },
  { anchor: 'relapse', option: 'trigger a',        position: 'before', phrase: 'trigger a relapse' },
  { anchor: 'relapse', option: 'suffer a',         position: 'before', phrase: 'suffer a relapse' },

  // ── REMEDY ──────────────────────────────────────────────────────────────────
  { anchor: 'remedy', option: 'scrutinize a',      position: 'before', phrase: 'scrutinize a remedy',      partnerTerm: 'scrutinize' },
  { anchor: 'remedy', option: 'underpin a',        position: 'before', phrase: 'underpin the remedy',      partnerTerm: 'underpin' },
  { anchor: 'remedy', option: 'thwart a',          position: 'before', phrase: 'thwart a remedy',          partnerTerm: 'thwart' },
  { anchor: 'remedy', option: 'discard a',         position: 'before', phrase: 'discard a remedy',         partnerTerm: 'discard' },
  { anchor: 'remedy', option: 'seek a',            position: 'before', phrase: 'seek a remedy' },
  { anchor: 'remedy', option: 'apply a',           position: 'before', phrase: 'apply a remedy' },
  { anchor: 'remedy', option: 'a viable',          position: 'before', phrase: 'a viable remedy' },
  { anchor: 'remedy', option: 'an effective',      position: 'before', phrase: 'an effective remedy' },

  // ── REPERCUSSION ────────────────────────────────────────────────────────────
  { anchor: 'repercussion', option: 'compound',    position: 'before', phrase: 'compound repercussions',   partnerTerm: 'compound' },
  { anchor: 'repercussion', option: 'acknowledge', position: 'before', phrase: 'acknowledge repercussions', partnerTerm: 'acknowledge' },
  { anchor: 'repercussion', option: 'rectify',     position: 'before', phrase: 'rectify repercussions',    partnerTerm: 'rectify' },
  { anchor: 'repercussion', option: 'face the',    position: 'before', phrase: 'face the repercussions' },
  { anchor: 'repercussion', option: 'suffer the',  position: 'before', phrase: 'suffer the repercussions' },
  { anchor: 'repercussion', option: 'wide-ranging',position: 'before', phrase: 'wide-ranging repercussions' },

  // ── BLUEPRINT ───────────────────────────────────────────────────────────────
  { anchor: 'blueprint', option: 'scrutinize a',   position: 'before', phrase: 'scrutinize a blueprint',   partnerTerm: 'scrutinize' },
  { anchor: 'blueprint', option: 'underpin a',     position: 'before', phrase: 'underpin a blueprint',     partnerTerm: 'underpin' },
  { anchor: 'blueprint', option: 'subvert a',      position: 'before', phrase: 'subvert a blueprint',      partnerTerm: 'subvert' },
  { anchor: 'blueprint', option: 'discard a',      position: 'before', phrase: 'discard a blueprint',      partnerTerm: 'discard' },
  { anchor: 'blueprint', option: 'revamp a',       position: 'before', phrase: 'revamp a blueprint',       partnerTerm: 'revamp' },
  { anchor: 'blueprint', option: 'follow a',       position: 'before', phrase: 'follow a blueprint' },
  { anchor: 'blueprint', option: 'a detailed',     position: 'before', phrase: 'a detailed blueprint' },

  // ── THRESHOLD ───────────────────────────────────────────────────────────────
  { anchor: 'threshold', option: 'bypass a',       position: 'before', phrase: 'bypass a threshold',       partnerTerm: 'bypass' },
  { anchor: 'threshold', option: 'defy a',         position: 'before', phrase: 'defy a threshold',         partnerTerm: 'defy' },
  { anchor: 'threshold', option: 'cross a',        position: 'before', phrase: 'cross a threshold' },
  { anchor: 'threshold', option: 'reach a',        position: 'before', phrase: 'reach a threshold' },
  { anchor: 'threshold', option: 'a critical',     position: 'before', phrase: 'a critical threshold' },
  { anchor: 'threshold', option: 'exceed the',     position: 'before', phrase: 'exceed the threshold' },

  // ── BACKLOG ─────────────────────────────────────────────────────────────────
  { anchor: 'backlog', option: 'tackle a',         position: 'before', phrase: 'tackle a backlog' },
  { anchor: 'backlog', option: 'a growing',        position: 'before', phrase: 'a growing backlog' },
  { anchor: 'backlog', option: 'clear a',          position: 'before', phrase: 'clear a backlog' },
  { anchor: 'backlog', option: 'a mounting',       position: 'before', phrase: 'a mounting backlog' },
  { anchor: 'backlog', option: 'manage a',         position: 'before', phrase: 'manage a backlog' },

  // ── REDUNDANCY ──────────────────────────────────────────────────────────────
  { anchor: 'redundancy', option: 'face',          position: 'before', phrase: 'face redundancy' },
  { anchor: 'redundancy', option: 'avoid',         position: 'before', phrase: 'avoid redundancy' },
  { anchor: 'redundancy', option: 'mass',          position: 'before', phrase: 'mass redundancy' },
  { anchor: 'redundancy', option: 'risk of',       position: 'before', phrase: 'risk of redundancy' },
  { anchor: 'redundancy', option: 'threatened with', position: 'before', phrase: 'threatened with redundancy' },

  // ── GRAVITAS ────────────────────────────────────────────────────────────────
  { anchor: 'gravitas', option: 'exude',           position: 'before', phrase: 'exude gravitas' },
  { anchor: 'gravitas', option: 'carry',           position: 'before', phrase: 'carry gravitas' },
  { anchor: 'gravitas', option: 'lend',            position: 'before', phrase: 'lend gravitas' },
  { anchor: 'gravitas', option: 'command',         position: 'before', phrase: 'command gravitas' },
  { anchor: 'gravitas', option: 'project',         position: 'before', phrase: 'project gravitas' },
  { anchor: 'gravitas', option: 'lack of',         position: 'before', phrase: 'lack of gravitas' },

  // ── POISE ───────────────────────────────────────────────────────────────────
  { anchor: 'poise', option: 'maintain',           position: 'before', phrase: 'maintain poise',           partnerTerm: 'maintain' },
  { anchor: 'poise', option: 'bolster',            position: 'before', phrase: 'bolster poise',            partnerTerm: 'bolster' },
  { anchor: 'poise', option: 'unsettle',           position: 'before', phrase: 'unsettle poise',           partnerTerm: 'unsettle' },
  { anchor: 'poise', option: 'with',               position: 'before', phrase: 'with poise' },
  { anchor: 'poise', option: 'remarkable',         position: 'before', phrase: 'remarkable poise' },
  { anchor: 'poise', option: 'composure and',      position: 'before', phrase: 'composure and poise' },

  // ── GULLIBILITY ─────────────────────────────────────────────────────────────
  { anchor: 'gullibility', option: 'exploit',      position: 'before', phrase: 'exploit gullibility' },
  { anchor: 'gullibility', option: 'prey on',      position: 'before', phrase: 'prey on gullibility' },
  { anchor: 'gullibility', option: 'take advantage of', position: 'before', phrase: 'take advantage of gullibility' },
  { anchor: 'gullibility', option: 'sheer',        position: 'before', phrase: 'sheer gullibility' },

  // ── HOAX ────────────────────────────────────────────────────────────────────
  { anchor: 'hoax', option: 'perpetuate a',        position: 'before', phrase: 'perpetuate a hoax',        partnerTerm: 'perpetuate' },
  { anchor: 'hoax', option: 'expose a',            position: 'before', phrase: 'expose a hoax' },
  { anchor: 'hoax', option: 'an elaborate',        position: 'before', phrase: 'an elaborate hoax' },
  { anchor: 'hoax', option: 'pull off a',          position: 'before', phrase: 'pull off a hoax' },

  // ── NEMESIS ─────────────────────────────────────────────────────────────────
  { anchor: 'nemesis', option: 'face your',        position: 'before', phrase: 'face your nemesis' },
  { anchor: 'nemesis', option: 'become a',         position: 'before', phrase: 'become a nemesis' },
  { anchor: 'nemesis', option: 'encounter your',   position: 'before', phrase: 'encounter your nemesis' },
  { anchor: 'nemesis', option: 'a worthy',         position: 'before', phrase: 'a worthy nemesis' },

  // ── MENACE ──────────────────────────────────────────────────────────────────
  { anchor: 'menace', option: 'pose a',            position: 'before', phrase: 'pose a menace' },
  { anchor: 'menace', option: 'a looming',         position: 'before', phrase: 'a looming menace' },
  { anchor: 'menace', option: 'a public',          position: 'before', phrase: 'a public menace' },
  { anchor: 'menace', option: 'lurk as a',         position: 'before', phrase: 'lurk as a menace',         partnerTerm: 'lurk' },

  // ── IMPUNITY ────────────────────────────────────────────────────────────────
  { anchor: 'impunity', option: 'act with',        position: 'before', phrase: 'act with impunity' },
  { anchor: 'impunity', option: 'operate with',    position: 'before', phrase: 'operate with impunity' },
  { anchor: 'impunity', option: 'defy with',       position: 'before', phrase: 'defy with impunity',       partnerTerm: 'defy' },
  { anchor: 'impunity', option: 'with total',      position: 'before', phrase: 'with total impunity' },

  // ── GRAVITAS / POISE already done above ────────────────────────────────────

  // ── TESTAMENT ───────────────────────────────────────────────────────────────
  { anchor: 'testament', option: 'a lasting',      position: 'before', phrase: 'a lasting testament' },
  { anchor: 'testament', option: 'a fitting',      position: 'before', phrase: 'a fitting testament' },
  { anchor: 'testament', option: 'serve as a',     position: 'before', phrase: 'serve as a testament' },
  { anchor: 'testament', option: 'stand as a',     position: 'before', phrase: 'stand as a testament' },

  // ── RUPTURE ─────────────────────────────────────────────────────────────────
  { anchor: 'rupture', option: 'cause a',          position: 'before', phrase: 'cause a rupture' },
  { anchor: 'rupture', option: 'a sudden',         position: 'before', phrase: 'a sudden rupture' },
  { anchor: 'rupture', option: 'a diplomatic',     position: 'before', phrase: 'a diplomatic rupture' },

  // ── VOID ────────────────────────────────────────────────────────────────────
  { anchor: 'void', option: 'fill a',              position: 'before', phrase: 'fill a void' },
  { anchor: 'void', option: 'leave a',             position: 'before', phrase: 'leave a void' },
  { anchor: 'void', option: 'create a',            position: 'before', phrase: 'create a void' },
  { anchor: 'void', option: 'a gaping',            position: 'before', phrase: 'a gaping void' },

  // ── REDEMPTION ── already done above ─────────────────────────────────────────

  // ── ADJECTIVES AS ANCHORS ────────────────────────────────────────────────────

  // ── UNREMITTING ─────────────────────────────────────────────────────────────
  { anchor: 'unremitting', option: 'adversity',    position: 'after', phrase: 'unremitting adversity',     partnerTerm: 'adversity' },
  { anchor: 'unremitting', option: 'toil',         position: 'after', phrase: 'unremitting toil',          partnerTerm: 'toil' },
  { anchor: 'unremitting', option: 'misery',       position: 'after', phrase: 'unremitting misery',        partnerTerm: 'misery' },
  { anchor: 'unremitting', option: 'scrutiny',     position: 'after', phrase: 'unremitting scrutiny' },
  { anchor: 'unremitting', option: 'pressure',     position: 'after', phrase: 'unremitting pressure' },

  // ── UNWAVERING ──────────────────────────────────────────────────────────────
  { anchor: 'unwavering', option: 'vigilance',     position: 'after', phrase: 'unwavering vigilance',      partnerTerm: 'vigilance' },
  { anchor: 'unwavering', option: 'willpower',     position: 'after', phrase: 'unwavering willpower',      partnerTerm: 'willpower' },
  { anchor: 'unwavering', option: 'compassion',    position: 'after', phrase: 'unwavering compassion',     partnerTerm: 'compassion' },
  { anchor: 'unwavering', option: 'commitment',    position: 'after', phrase: 'unwavering commitment' },
  { anchor: 'unwavering', option: 'loyalty',       position: 'after', phrase: 'unwavering loyalty' },
  { anchor: 'unwavering', option: 'resolve',       position: 'after', phrase: 'unwavering resolve' },

  // ── TENUOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'tenuous', option: 'solace',           position: 'after', phrase: 'tenuous solace',            partnerTerm: 'solace' },
  { anchor: 'tenuous', option: 'remedy',           position: 'after', phrase: 'a tenuous remedy',          partnerTerm: 'remedy' },
  { anchor: 'tenuous', option: 'grasp',            position: 'after', phrase: 'a tenuous grasp' },
  { anchor: 'tenuous', option: 'link',             position: 'after', phrase: 'a tenuous link' },
  { anchor: 'tenuous', option: 'hold',             position: 'after', phrase: 'a tenuous hold' },

  // ── ROBUST ──────────────────────────────────────────────────────────────────
  { anchor: 'robust', option: 'willpower',         position: 'after', phrase: 'robust willpower',          partnerTerm: 'willpower' },
  { anchor: 'robust', option: 'blueprint',         position: 'after', phrase: 'a robust blueprint',        partnerTerm: 'blueprint' },
  { anchor: 'robust', option: 'remedy',            position: 'after', phrase: 'a robust remedy',           partnerTerm: 'remedy' },
  { anchor: 'robust', option: 'framework',         position: 'after', phrase: 'a robust framework',        partnerTerm: 'framework' },
  { anchor: 'robust', option: 'debate',            position: 'after', phrase: 'robust debate' },
  { anchor: 'robust', option: 'defence',           position: 'after', phrase: 'a robust defence' },

  // ── RIGOROUS ────────────────────────────────────────────────────────────────
  { anchor: 'rigorous', option: 'scrutiny',        position: 'after', phrase: 'rigorous scrutiny' },
  { anchor: 'rigorous', option: 'blueprint',       position: 'after', phrase: 'a rigorous blueprint',      partnerTerm: 'blueprint' },
  { anchor: 'rigorous', option: 'analysis',        position: 'after', phrase: 'rigorous analysis' },
  { anchor: 'rigorous', option: 'testing',         position: 'after', phrase: 'rigorous testing' },
  { anchor: 'rigorous', option: 'standards',       position: 'after', phrase: 'rigorous standards' },

  // ── TENACIOUS ───────────────────────────────────────────────────────────────
  { anchor: 'tenacious', option: 'willpower',      position: 'after', phrase: 'tenacious willpower',       partnerTerm: 'willpower' },
  { anchor: 'tenacious', option: 'resolve',        position: 'after', phrase: 'tenacious resolve' },
  { anchor: 'tenacious', option: 'in adversity',   position: 'after', phrase: 'tenacious in adversity',    partnerTerm: 'adversity' },

  // ── ZEALOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'zealous', option: 'vigilance',        position: 'after', phrase: 'zealous vigilance',         partnerTerm: 'vigilance' },
  { anchor: 'zealous', option: 'pursuit',          position: 'after', phrase: 'zealous pursuit' },
  { anchor: 'zealous', option: 'advocate',         position: 'after', phrase: 'zealous advocate' },

  // ── DUBIOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'dubious', option: 'remedy',           position: 'after', phrase: 'a dubious remedy',          partnerTerm: 'remedy' },
  { anchor: 'dubious', option: 'blueprint',        position: 'after', phrase: 'a dubious blueprint',       partnerTerm: 'blueprint' },
  { anchor: 'dubious', option: 'fallacy',          position: 'after', phrase: 'a dubious fallacy',         partnerTerm: 'fallacy' },
  { anchor: 'dubious', option: 'distinction',      position: 'after', phrase: 'a dubious distinction' },
  { anchor: 'dubious', option: 'claim',            position: 'after', phrase: 'a dubious claim' },

  // ── OMINOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'ominous', option: 'wrath',            position: 'after', phrase: 'ominous wrath',             partnerTerm: 'wrath' },
  { anchor: 'ominous', option: 'calamity',         position: 'after', phrase: 'an ominous calamity',       partnerTerm: 'calamity' },
  { anchor: 'ominous', option: 'sign',             position: 'after', phrase: 'an ominous sign' },
  { anchor: 'ominous', option: 'silence',          position: 'after', phrase: 'ominous silence' },
  { anchor: 'ominous', option: 'warning',          position: 'after', phrase: 'an ominous warning' },

  // ── PRECARIOUS ──────────────────────────────────────────────────────────────
  { anchor: 'precarious', option: 'poise',         position: 'after', phrase: 'a precarious poise',        partnerTerm: 'poise' },
  { anchor: 'precarious', option: 'threshold',     position: 'after', phrase: 'a precarious threshold',    partnerTerm: 'threshold' },
  { anchor: 'precarious', option: 'balance',       position: 'after', phrase: 'a precarious balance' },
  { anchor: 'precarious', option: 'position',      position: 'after', phrase: 'a precarious position' },
  { anchor: 'precarious', option: 'hold',          position: 'after', phrase: 'a precarious hold' },

  // ── SINISTER ────────────────────────────────────────────────────────────────
  { anchor: 'sinister', option: 'malice',          position: 'after', phrase: 'sinister malice',           partnerTerm: 'malice' },
  { anchor: 'sinister', option: 'motive',          position: 'after', phrase: 'a sinister motive' },
  { anchor: 'sinister', option: 'undertone',       position: 'after', phrase: 'a sinister undertone' },
  { anchor: 'sinister', option: 'agenda',          position: 'after', phrase: 'a sinister agenda' },

  // ── BRAZEN ──────────────────────────────────────────────────────────────────
  { anchor: 'brazen', option: 'malice',            position: 'after', phrase: 'brazen malice',             partnerTerm: 'malice' },
  { anchor: 'brazen', option: 'hoax',              position: 'after', phrase: 'a brazen hoax',             partnerTerm: 'hoax' },
  { anchor: 'brazen', option: 'disregard',         position: 'after', phrase: 'brazen disregard' },
  { anchor: 'brazen', option: 'lie',               position: 'after', phrase: 'a brazen lie' },

  // ── NOTORIOUS ───────────────────────────────────────────────────────────────
  { anchor: 'notorious', option: 'for wrath',      position: 'after', phrase: 'notorious for wrath',       partnerTerm: 'wrath' },
  { anchor: 'notorious', option: 'for malice',     position: 'after', phrase: 'notorious for malice',      partnerTerm: 'malice' },
  { anchor: 'notorious', option: 'for havoc',      position: 'after', phrase: 'notorious for causing havoc', partnerTerm: 'havoc' },
  { anchor: 'notorious', option: 'for defiance',   position: 'after', phrase: 'notorious for defiance' },
  { anchor: 'notorious', option: 'widely',         position: 'before', phrase: 'widely notorious' },

  // ── VICIOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'vicious', option: 'wrath',            position: 'after', phrase: 'vicious wrath',             partnerTerm: 'wrath' },
  { anchor: 'vicious', option: 'malice',           position: 'after', phrase: 'vicious malice',            partnerTerm: 'malice' },
  { anchor: 'vicious', option: 'cycle',            position: 'after', phrase: 'a vicious cycle' },
  { anchor: 'vicious', option: 'circle',           position: 'after', phrase: 'a vicious circle' },

  // ── MORBID ──────────────────────────────────────────────────────────────────
  { anchor: 'morbid', option: 'fascination',       position: 'after', phrase: 'a morbid fascination' },
  { anchor: 'morbid', option: 'curiosity',         position: 'after', phrase: 'morbid curiosity' },
  { anchor: 'morbid', option: 'obsession',         position: 'after', phrase: 'a morbid obsession' },
  { anchor: 'morbid', option: 'humour',            position: 'after', phrase: 'morbid humour' },

  // ── COERCIVE ────────────────────────────────────────────────────────────────
  { anchor: 'coercive', option: 'malice',          position: 'after', phrase: 'coercive malice',           partnerTerm: 'malice' },
  { anchor: 'coercive', option: 'compulsion',      position: 'after', phrase: 'coercive compulsion',       partnerTerm: 'compulsion' },
  { anchor: 'coercive', option: 'measures',        position: 'after', phrase: 'coercive measures' },
  { anchor: 'coercive', option: 'tactics',         position: 'after', phrase: 'coercive tactics' },
  { anchor: 'coercive', option: 'control',         position: 'after', phrase: 'coercive control' },

  // ── CONSPICUOUS ─────────────────────────────────────────────────────────────
  { anchor: 'conspicuous', option: 'malice',       position: 'after', phrase: 'conspicuous malice',        partnerTerm: 'malice' },
  { anchor: 'conspicuous', option: 'absence',      position: 'after', phrase: 'conspicuous absence' },
  { anchor: 'conspicuous', option: 'by its absence', position: 'after', phrase: 'conspicuous by its absence' },

  // ── GULLIBLE ────────────────────────────────────────────────────────────────
  { anchor: 'gullible', option: 'prey on the',     position: 'before', phrase: 'prey on the gullible' },
  { anchor: 'gullible', option: 'inexcusably',     position: 'before', phrase: 'inexcusably gullible' },

  // ── IMPETUOUS ───────────────────────────────────────────────────────────────
  { anchor: 'impetuous', option: 'wrath',          position: 'after', phrase: 'impetuous wrath',           partnerTerm: 'wrath' },
  { anchor: 'impetuous', option: 'compulsion',     position: 'after', phrase: 'impetuous compulsion',      partnerTerm: 'compulsion' },
  { anchor: 'impetuous', option: 'decision',       position: 'after', phrase: 'an impetuous decision' },
  { anchor: 'impetuous', option: 'action',         position: 'after', phrase: 'impetuous action' },

  // ── VIBRANT ─────────────────────────────────────────────────────────────────
  { anchor: 'vibrant', option: 'compassion',       position: 'after', phrase: 'vibrant compassion',        partnerTerm: 'compassion' },
  { anchor: 'vibrant', option: 'willpower',        position: 'after', phrase: 'vibrant willpower',         partnerTerm: 'willpower' },
  { anchor: 'vibrant', option: 'community',        position: 'after', phrase: 'a vibrant community' },
  { anchor: 'vibrant', option: 'culture',          position: 'after', phrase: 'vibrant culture' },

  // ── SALIENT ─────────────────────────────────────────────────────────────────
  { anchor: 'salient', option: 'point',            position: 'after', phrase: 'a salient point' },
  { anchor: 'salient', option: 'feature',          position: 'after', phrase: 'a salient feature' },
  { anchor: 'salient', option: 'example',          position: 'after', phrase: 'a salient example' },
  { anchor: 'salient', option: 'reminder',         position: 'after', phrase: 'a salient reminder' },

  // ── SHREWD ──────────────────────────────────────────────────────────────────
  { anchor: 'shrewd', option: 'willpower',         position: 'after', phrase: 'shrewd willpower',          partnerTerm: 'willpower' },
  { anchor: 'shrewd', option: 'move',              position: 'after', phrase: 'a shrewd move' },
  { anchor: 'shrewd', option: 'observation',       position: 'after', phrase: 'a shrewd observation' },
  { anchor: 'shrewd', option: 'judgement',         position: 'after', phrase: 'shrewd judgement' },
  { anchor: 'shrewd', option: 'operator',          position: 'after', phrase: 'a shrewd operator' },

  // ── JUDICIOUS ───────────────────────────────────────────────────────────────
  { anchor: 'judicious', option: 'remedy',         position: 'after', phrase: 'a judicious remedy',        partnerTerm: 'remedy' },
  { anchor: 'judicious', option: 'use',            position: 'after', phrase: 'judicious use' },
  { anchor: 'judicious', option: 'approach',       position: 'after', phrase: 'a judicious approach' },
  { anchor: 'judicious', option: 'choice',         position: 'after', phrase: 'a judicious choice' },

  // ── BUOYANT ─────────────────────────────────────────────────────────────────
  { anchor: 'buoyant', option: 'willpower',        position: 'after', phrase: 'buoyant willpower',         partnerTerm: 'willpower' },
  { anchor: 'buoyant', option: 'compassion',       position: 'after', phrase: 'buoyant compassion',        partnerTerm: 'compassion' },
  { anchor: 'buoyant', option: 'mood',             position: 'after', phrase: 'a buoyant mood' },
  { anchor: 'buoyant', option: 'market',           position: 'after', phrase: 'a buoyant market' },

  // ── BENIGN ──────────────────────────────────────────────────────────────────
  { anchor: 'benign', option: 'remedy',            position: 'after', phrase: 'a benign remedy',           partnerTerm: 'remedy' },
  { anchor: 'benign', option: 'leniency',          position: 'after', phrase: 'benign leniency',           partnerTerm: 'leniency' },
  { anchor: 'benign', option: 'neglect',           position: 'after', phrase: 'benign neglect' },
  { anchor: 'benign', option: 'presence',          position: 'after', phrase: 'a benign presence' },

  // ── FRAMEWORK ───────────────────────────────────────────────────────────────
  { anchor: 'framework', option: 'underpin a',     position: 'before', phrase: 'underpin a framework',     partnerTerm: 'underpin' },
  { anchor: 'framework', option: 'robust',         position: 'before', phrase: 'a robust framework',       partnerTerm: 'robust' },
  { anchor: 'framework', option: 'revamp the',     position: 'before', phrase: 'revamp the framework',     partnerTerm: 'revamp' },
  { anchor: 'framework', option: 'establish a',    position: 'before', phrase: 'establish a framework' },
  { anchor: 'framework', option: 'within a',       position: 'before', phrase: 'within a framework' },
  { anchor: 'framework', option: 'a regulatory',   position: 'before', phrase: 'a regulatory framework' },

  // ── CONFESSION ──────────────────────────────────────────────────────────────
  { anchor: 'confession', option: 'compel a',      position: 'before', phrase: 'compel a confession',      partnerTerm: 'compel' },
  { anchor: 'confession', option: 'make a',        position: 'before', phrase: 'make a confession' },
  { anchor: 'confession', option: 'force a',       position: 'before', phrase: 'force a confession' },
  { anchor: 'confession', option: 'a full',        position: 'before', phrase: 'a full confession' },

  // ── TESTIMONY ───────────────────────────────────────────────────────────────
  { anchor: 'testimony', option: 'collate',        position: 'before', phrase: 'collate testimony',        partnerTerm: 'collate' },
  { anchor: 'testimony', option: 'scrutinize',     position: 'before', phrase: 'scrutinize testimony',     partnerTerm: 'scrutinize' },
  { anchor: 'testimony', option: 'give',           position: 'before', phrase: 'give testimony' },
  { anchor: 'testimony', option: 'compelling',     position: 'before', phrase: 'compelling testimony' },

  // ── LURK ────────────────────────────────────────────────────────────────────
  { anchor: 'lurk', option: 'in the shadows',      position: 'after', phrase: 'lurk in the shadows' },
  { anchor: 'lurk', option: 'beneath the surface', position: 'after', phrase: 'lurk beneath the surface' },
  { anchor: 'lurk', option: 'as a menace',         position: 'after', phrase: 'lurk as a menace',         partnerTerm: 'menace' },
  { anchor: 'lurk', option: 'unseen',              position: 'after', phrase: 'lurk unseen' },

  // ── EXERT (additional) ─────────────────────────────────────────────────────
  { anchor: 'exert', option: 'willpower over',     position: 'after', phrase: 'exert willpower over',      partnerTerm: 'willpower' },
  { anchor: 'exert', option: 'enormous effort',    position: 'after', phrase: 'exert enormous effort' },

]
