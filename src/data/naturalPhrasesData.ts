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

/**
 * Phrase-level explanations keyed by lowercase collocation string.
 * Used in the wrong-answer Explore panel to explain what the whole phrase means.
 * DO NOT add entries at runtime. Extend this object offline only.
 */
export const PHRASE_EXPLANATIONS: Record<string, string> = {
  // OVERCOME
  'overcome adversity':         'to succeed despite very difficult circumstances',
  'overcome an aversion':       'to get past a strong dislike or fear of something',
  'overcome a setback':         'to recover and push forward after a disappointment or failure',
  'overcome a compulsion':      'to resist and break free from an overwhelming urge',
  'overcome stigma':            'to move past the social shame attached to something',
  'overcome remorse':           'to work through deep guilt and move forward',
  'overcome a relapse':         'to recover after falling back into a harmful habit or illness',
  'overcome a grudge':          'to let go of persistent resentment toward someone',
  'overcome obstacles':         'to deal with things that block your progress',
  'overcome resistance':        'to get past opposition or unwillingness to cooperate',
  'overcome challenges':        'to successfully deal with difficult problems',

  // SUPPRESS
  'suppress a compulsion':      'to forcibly hold back an overwhelming urge',
  'suppress a craving':         'to hold back a strong desire or appetite',
  'suppress wrath':             'to keep intense anger under control without letting it show',
  'suppress remorse':           'to push feelings of guilt down rather than expressing them',
  'suppress dissent':           'to silence or prevent people from expressing disagreement',
  'suppress evidence':          'to hide or destroy information that could reveal the truth',
  'suppress emotions':          'to hold feelings back and not let them out',

  // SUCCUMB
  'succumb to a compulsion':    'to give in to an irresistible urge you were trying to resist',
  'succumb to a craving':       'to give in to a strong desire, usually for something harmful',
  'succumb to wrath':           'to lose control and give in to intense anger',
  'succumb to misery':          'to give up the fight and sink into deep unhappiness',
  'succumb to temptation':      'to give in to something attractive but possibly wrong or unwise',
  'succumb to pressure':        'to give in after being pushed hard to do something',

  // CURB
  'curb a craving':             'to restrain a strong desire before it takes over',
  'curb a compulsion':          'to hold back an urge from becoming an uncontrolled action',
  'curb wrath':                 'to hold your anger in check, keeping it from erupting',
  'curb the proliferation':     'to limit or slow the rapid spread of something',
  'curb enthusiasm':            'to tone down excitement or eagerness',
  'curb spending':              'to restrict or limit how much money is spent',

  // INDULGE
  'indulge a craving':          'to allow yourself to satisfy a strong desire fully',
  'indulge a compulsion':       'to give free rein to an overwhelming urge',
  'indulge in misery':          'to dwell on unhappiness, letting yourself wallow in it',
  'indulge in nostalgia':       'to let yourself enjoy fond memories of the past',
  'indulge in excess':          'to allow yourself to have far too much of something enjoyable',

  // TAME
  'tame a compulsion':          'to bring an overpowering urge under control',
  'tame wrath':                 'to bring intense anger under control and calm it down',
  'tame a craving':             'to bring a powerful desire under control',
  'tame impulses':              'to bring your immediate, unthinking reactions under control',

  // TEMPER
  'temper wrath':               'to soften and moderate intense anger',
  'temper enthusiasm':          'to tone down excitement to a more measured level',
  'temper expectations':        'to make hopes or predictions more realistic and modest',
  'temper ambition':            'to moderate drive so it does not become reckless',

  // STIFLE
  'stifle compassion':          'to suppress or block out feelings of empathy toward others',
  'stifle wrath':               'to smother anger before it can fully emerge',
  'stifle dissent':             'to prevent disagreement or opposition from being voiced',
  'stifle creativity':          'to block or limit the free flow of new ideas',
  'stifle growth':              'to prevent development, progress, or expansion',
  'stifle debate':              'to shut down open discussion of an issue',

  // MAINTAIN
  'maintain vigilance':         'to keep up a high level of watchfulness without letting it slip',
  'maintain poise':             'to stay calm and self-possessed even under pressure',
  'maintain composure':         'to keep your emotions under control in a difficult situation',
  'maintain momentum':          'to keep moving forward at a consistent pace without losing energy',
  'maintain leniency':          'to keep being tolerant and forgiving rather than becoming stricter',
  'maintain standards':         'to keep quality or conduct at a required level',

  // BOLSTER
  'bolster willpower':          'to strengthen someone\'s inner ability to resist temptation or keep going',
  'bolster compassion':         'to increase empathy and care for others',
  'bolster poise':              'to strengthen the ability to stay calm and self-assured under pressure',
  'bolster morale':             'to raise the confidence and spirits of a group or person',
  'bolster confidence':         'to increase someone\'s belief in their own abilities',
  'bolster resilience':         'to strengthen the ability to bounce back from difficulty',

  // AMPLIFY
  'amplify compassion':         'to intensify and spread feelings of empathy and care',
  'amplify wrath':              'to make anger much stronger and more intense',
  'amplify misery':             'to make suffering noticeably worse',
  'amplify malice':             'to make hostile or harmful intent more pronounced',
  'amplify impact':             'to make the effect of something much greater',
  'amplify a message':          'to make a communication reach more people and hit harder',

  // EXACERBATE
  'exacerbate adversity':       'to make already difficult circumstances significantly worse',
  'exacerbate the stigma':      'to make social shame or prejudice worse',
  'exacerbate misery':          'to intensify suffering beyond what was already there',
  'exacerbate a relapse':       'to make a return to harmful behaviour worse',
  'exacerbate tensions':        'to make a tense situation or conflict more severe',
  'exacerbate the situation':   'to make an already bad situation worse',

  // COMPOUND
  'compound adversity':         'to add further difficulties on top of existing hardship',
  'compound misery':            'to pile more suffering onto what was already there',
  'compound a setback':         'to make a disappointing situation worse by adding to it',
  'compound repercussions':     'to add more negative consequences to those already there',
  'compound the problem':       'to make a problem worse by adding to it',
  'compound the error':         'to make a mistake worse, often by trying to cover it up',

  // AGGRAVATE
  'aggravate the stigma':       'to make social shame or negative judgement about something even more intense',
  'aggravate adversity':        'to make very difficult circumstances even harder to bear',
  'aggravate a grudge':         'to make a resentment deeper or more bitter',
  'aggravate misery':           'to add to existing suffering, making it worse',
  'aggravate the situation':    'to make a difficult situation worse through your actions or words',

  // PERPETUATE
  'perpetuate stigma':          'to keep social shame or prejudice alive, allowing it to continue',
  'perpetuate a fallacy':       'to keep a false belief alive by repeating or reinforcing it',
  'perpetuate malice':          'to keep hostility and ill-will going rather than letting it end',
  'perpetuate a hoax':          'to keep a deception going by continuing to spread it',
  'perpetuate misery':          'to keep suffering going instead of allowing it to end',
  'perpetuate ostracism':       'to keep social exclusion going rather than letting someone back in',
  'perpetuate a cycle':         'to keep a pattern repeating, especially a harmful one',
  'perpetuate a myth':          'to keep a false story or belief alive in public consciousness',

  // ACKNOWLEDGE
  'acknowledge remorse':        'to openly admit and accept that you feel deep guilt',
  'acknowledge a setback':      'to openly accept that a failure or disappointment has occurred',
  'acknowledge a fallacy':      'to admit that a widely held belief is wrong',
  'acknowledge repercussions':  'to openly accept the negative consequences of your actions',
  'acknowledge shortcomings':   'to admit openly to weaknesses or failings',
  'acknowledge responsibility': 'to admit that you are responsible for something, especially a mistake',

  // INSTILL
  'instill compassion':         'to gradually build empathy and care for others in someone',
  'instill willpower':          'to build the inner strength to resist temptation in someone over time',
  'instill vigilance':          'to build a persistent habit of watchfulness in someone',
  'instill malice':             'to plant or cultivate hostile, harmful intent in someone',
  'instill fear':               'to make someone feel persistent fear as a means of control or influence',
  'instill confidence':         'to gradually build a person\'s belief in their own abilities',
  'instill discipline':         'to build a habit of self-control and structure in someone',

  // INFUSE
  'infuse compassion':          'to fill something or someone with a deep sense of empathy',
  'infuse willpower':           'to fill something or someone with inner strength and determination',
  'infuse energy':              'to fill something with vitality and drive',
  'infuse meaning':             'to fill something with a deeper sense of purpose or significance',

  // ENGENDER
  'engender compassion':        'to cause empathy and care for others to arise',
  'engender malice':            'to cause hostile intent to develop',
  'engender ostracism':         'to cause social exclusion to arise',
  'engender leniency':          'to cause a more tolerant or forgiving attitude to develop',
  'engender trust':             'to cause trust to grow in a relationship or situation',
  'engender hostility':         'to cause hostility and antagonism to arise',

  // DWINDLE
  'willpower dwindles':         'inner strength gradually weakens and fades over time',
  'compassion dwindles':        'empathy and care for others gradually fades away',
  'leniency dwindles':          'tolerance and forgiveness gradually decreases',
  'support dwindles':           'backing or encouragement gradually decreases until it is gone',
  'resources dwindle':          'available supplies or funds gradually reduce until nearly gone',

  // THWART
  'thwart a revolt':            'to prevent an organised rebellion from succeeding',
  'thwart a remedy':            'to prevent a solution from being implemented or working',
  'thwart redemption':          'to block someone\'s attempt to make amends or recover from past wrong',
  'thwart efforts':             'to prevent someone\'s attempts from being successful',
  'thwart attempts':            'to prevent someone from successfully doing what they are trying to do',
  'thwart progress':            'to stop or block forward movement or development',

  // SCRUTINIZE
  'scrutinize a blueprint':     'to examine a plan or design very carefully to find flaws',
  'scrutinize testimony':       'to examine what someone claims to have witnessed very closely',
  'scrutinize evidence':        'to examine available facts very carefully to assess their validity',
  'scrutinize conduct':         'to examine someone\'s behaviour very closely for wrongdoing',
  'scrutinize data':            'to examine information very carefully to ensure it is accurate',

  // UNDERPIN
  'underpin a blueprint':       'to provide the foundation that supports a plan or design',
  'underpin a framework':       'to provide the foundation that a structure of ideas rests on',
  'underpin the remedy':        'to provide the basis that makes a solution work',
  'underpin the argument':      'to provide the foundation that makes a case hold together',
  'underpin success':           'to provide the essential foundation that makes achievement possible',

  // RECTIFY
  'rectify a setback':          'to put right the damage caused by a disappointment or failure',
  'rectify a fallacy':          'to correct a false belief or reasoning error',
  'rectify repercussions':      'to deal with and put right the negative consequences of something',
  'rectify a relapse':          'to address and correct a return to a harmful behaviour',
  'rectify the situation':      'to put a bad situation right',
  'rectify mistakes':           'to correct errors that have been made',

  // SUBVERT
  'subvert a blueprint':        'to undermine or secretly destroy a plan from within',
  'subvert a remedy':           'to undermine a solution so that it fails to work',
  'subvert authority':          'to secretly undermine the power of those in charge',
  'subvert expectations':       'to act in a way that deliberately overturns what was expected',
  'subvert the narrative':      'to undermine or overturn the accepted version of events',

  // UNSETTLE
  'unsettle poise':             'to disturb someone\'s calm and self-possessed composure',
  'unsettle willpower':         'to weaken someone\'s resolve by creating doubt or anxiety',
  'unsettle composure':         'to disturb someone\'s emotional steadiness',
  'unsettle assumptions':       'to challenge and undermine things taken for granted',

  // EXERT
  'exert willpower':            'to actively apply inner strength to resist temptation or push through difficulty',
  'exert willpower over':       'to actively use inner strength to control a situation or impulse',
  'exert influence':            'to deliberately apply power or sway over someone or something',
  'exert pressure':             'to deliberately apply force or persuasion to make someone act',
  'exert control':              'to actively apply authority or power over a situation or person',
  'exert enormous effort':      'to put in a very large amount of determined hard work',

  // TRANSCEND
  'transcend adversity':        'to rise above and go beyond very difficult circumstances',
  'transcend misery':           'to rise above suffering and go beyond it',
  'transcend an ordeal':        'to rise above and go beyond a deeply distressing experience',
  'transcend limitations':      'to go beyond the restrictions or constraints that normally apply',
  'transcend boundaries':       'to go beyond established limits or divisions',

  // ENDURE
  'endure adversity':           'to bear very difficult circumstances without breaking',
  'endure an ordeal':           'to suffer through a deeply distressing experience without giving up',
  'endure toil':                'to keep going through exhausting, hard work without stopping',
  'endure misery':              'to bear deep suffering or unhappiness for an extended time',
  'endure hardship':            'to bear difficult and unpleasant conditions without giving up',
  'endure suffering':           'to bear pain or distress over a period of time',

  // INSTIGATE
  'instigate a revolt':         'to deliberately start or provoke an organised rebellion',
  'instigate havoc':            'to deliberately start or cause widespread disorder and disruption',
  'instigate conflict':         'to deliberately start or provoke a fight or dispute',
  'instigate change':           'to deliberately start or trigger a process of change',

  // LURE
  'lure into a compulsion':     'to tempt someone into developing an irresistible urge',
  'lure into havoc':            'to draw someone into a situation of chaos and destruction',
  'lure into temptation':       'to draw someone toward something they know is wrong or unwise',
  'lure into complacency':      'to draw someone into a false sense of security where they stop being alert',

  // MOLLIFY
  'mollify wrath':              'to calm and soften intense anger in someone',
  'mollify a grudge':           'to soften a persistent resentment so it is less bitter',
  'mollify critics':            'to calm and appease those who are being critical or hostile',
  'mollify opposition':         'to calm and appease those who are strongly against something',

  // PLACATE
  'placate wrath':              'to calm intense anger by giving in or appeasing',
  'placate malice':             'to calm or satisfy hostile intent in someone',
  'placate critics':            'to calm critics by addressing their concerns or appeasing them',
  'placate the opposition':     'to calm and appease those who are strongly opposed',

  // MEDDLE
  'meddle in a remedy':         'to interfere with a solution in a way that is unwanted and harmful',
  'meddle in affairs':          'to interfere in matters that are not your concern',
  'meddle with the plan':       'to interfere with a plan in an unwanted way that changes it',

  // ERADICATE
  'eradicate stigma':           'to completely eliminate social shame or prejudice',
  'eradicate ostracism':        'to completely eliminate social exclusion from a community',
  'eradicate a fallacy':        'to completely eliminate a false belief from circulation',
  'eradicate malice':           'to completely eliminate hostile or harmful intent',
  'eradicate poverty':          'to completely eliminate the condition of being very poor',
  'eradicate corruption':       'to completely eliminate dishonest or fraudulent conduct',

  // EMBROIL
  'embroil in a revolt':        'to draw someone into involvement in a rebellion, often against their will',
  'embroil in havoc':           'to draw someone into a situation of chaos or destruction',
  'embroil in misery':          'to draw someone into a situation of deep suffering',
  'embroil in controversy':     'to draw someone into a heated public dispute',
  'embroil in conflict':        'to draw someone into a fight or dispute',

  // DETER
  'deter a relapse':            'to discourage or prevent a return to harmful behaviour',
  'deter a revolt':             'to discourage or prevent an organised rebellion from happening',
  'deter crime':                'to discourage criminal behaviour through threat of consequences',
  'deter aggression':           'to discourage hostile or violent actions through consequences or strength',

  // DISCARD
  'discard a remedy':           'to throw out or abandon a solution without using it',
  'discard a blueprint':        'to throw out or abandon a plan entirely',
  'discard a fallacy':          'to reject and throw out a false belief',
  'discard assumptions':        'to throw out things you took for granted without questioning',
  'discard evidence':           'to reject or get rid of available facts',

  // BYPASS
  'bypass a threshold':         'to avoid or skip a required level or limit',
  'bypass a remedy':            'to go around a solution without engaging with it',
  'bypass protocol':            'to avoid the established procedure and act outside the rules',
  'bypass safeguards':          'to avoid the protections put in place to prevent harm',

  // DEFY
  'defy a threshold':           'to refuse to stay within an established limit or level',
  'defy authority':             'to openly refuse to obey those who have power over you',
  'defy convention':            'to refuse to follow accepted norms or established ways of doing things',
  'defy expectations':          'to act in a way that goes against what was anticipated',
  'defy with impunity':         'to openly disobey without facing any punishment or consequence',

  // COLLATE
  'collate testimony':          'to gather and organise accounts from witnesses in one place',
  'collate evidence':           'to gather and organise available facts in one place',
  'collate data':               'to gather and organise raw information in a structured way',
  'collate reports':            'to gather and organise separate reports into one document',

  // REVERT
  'revert to a relapse':        'to go back to a former harmful behaviour or condition',
  'revert to a remedy':         'to go back to using a previous solution',
  'revert to old habits':       'to go back to previous, often unhelpful, patterns of behaviour',
  'revert to the original':     'to go back to the first or earlier version',

  // EXASPERATE
  'exasperate adversity':       'to intensify existing hardship to an even more frustrating degree',
  'exasperate the situation':   'to make a situation worse in a way that causes frustration',
  'exasperate critics':         'to frustrate and irritate those who are already critical',

  // PLUMMET
  'willpower plummets':         'inner strength drops sharply and suddenly',
  'morale plummets':            'collective confidence and spirit drops sharply',
  'confidence plummets':        'self-belief drops suddenly and sharply',

  // SWAY
  'sway willpower':             'to push someone\'s resolve in a direction, causing it to waver',
  'sway opinion':               'to cause someone\'s view or belief to change',
  'sway judgement':             'to affect someone\'s ability to make a neutral assessment',
  'sway a crowd':               'to influence a large group of people\'s feelings or opinions',

  // RELENT
  'relent on leniency':         'to ease up on a firm position and become more forgiving',
  'relent under pressure':      'to give in after being pushed persistently',
  'eventually relent':          'to finally give in after holding out for a time',

  // AMALGAMATE
  'amalgamate a remedy':        'to combine a solution with others into a single unified approach',
  'amalgamate a blueprint':     'to combine a plan with others into one unified version',
  'amalgamate resources':       'to combine separate resources into one pool for better efficiency',
  'amalgamate approaches':      'to combine different methods into a single unified strategy',

  // COMPEL
  'compel leniency':            'to force a more forgiving or tolerant response',
  'compel a confession':        'to force someone to admit what they have done',
  'compel action':              'to force or strongly motivate someone to do something',
  'compel compliance':          'to force someone to obey or conform',

  // INTIMIDATE
  'intimidate into leniency':   'to use threats or fear to force a more forgiving response',
  'intimidate witnesses':       'to use threats or fear to stop witnesses from giving testimony',
  'intimidate opponents':       'to use a display of power or threats to discourage opposition',

  // LAMENT
  'lament adversity':           'to express deep grief or sorrow about difficult circumstances',
  'lament a setback':           'to express deep grief or sorrow about a disappointment',
  'lament misery':              'to express deep grief or sorrow about suffering',
  'lament the loss':            'to express deep grief or sorrow about something or someone lost',
  'lament a missed opportunity':'to express grief or regret about a chance that has passed',

  // REVAMP
  'revamp a blueprint':         'to redesign a plan significantly to make it more effective',
  'revamp a remedy':            'to significantly revise a solution to make it more effective',
  'revamp the framework':       'to significantly redesign the whole structure or system',
  'revamp the strategy':        'to significantly redesign the plan of action',
  'revamp the system':          'to significantly redesign how something works',

  // CONFINE
  'confine to the threshold':   'to restrict something to staying within a set limit',
  'confine to a remedy':        'to restrict to using only a specific solution',
  'confine to barracks':        'to restrict someone to staying in a specific place as a punishment',
  'confine within limits':      'to restrict someone or something to operate only within set boundaries',

  // CIRCUMSCRIBE
  'circumscribe a threshold':   'to define strict limits around a level or boundary',
  'circumscribe authority':     'to formally restrict the extent of someone\'s power',
  'circumscribe freedom':       'to formally restrict the extent of someone\'s freedom to act',

  // DISMAY
  'dismay at the setback':      'to feel deep shock and distress about a disappointment',
  'dismay at the calamity':     'to feel deep shock and distress about a disaster',
  'dismay at the verdict':      'to feel deep shock and distress about a decision or ruling',

  // ENHANCE
  'enhance poise':              'to improve the quality of someone\'s calm, self-assured manner',
  'enhance compassion':         'to deepen and improve empathy and care for others',
  'enhance willpower':          'to strengthen someone\'s inner ability to resist temptation',
  'enhance performance':        'to improve the quality or effectiveness of results',
  'enhance credibility':        'to improve how trustworthy and believable someone or something appears',

  // PROLIFERATION (extra collocations)
  'stem the proliferation':     'to stop the unchecked spread of something',
  'rapid proliferation':        'very fast spread of something to many places at once',
  'the unchecked proliferation':'the uncontrolled spread of something without limits',

  // ADVERSITY (extra collocations)
  'in the face of adversity':   'when dealing with very serious difficulties head-on',
  'bounce back from adversity': 'to recover from very difficult circumstances with resilience',
  'a source of adversity':      'something that causes or creates serious difficulty',

  // SETBACK
  'suffer a setback':           'to experience a disappointment or failure that slows progress',
  'a temporary setback':        'a disappointment that slows you but will eventually be overcome',
  'deal with a setback':        'to handle and manage a failure or disappointment',
  'recover from a setback':     'to return to a positive position after a disappointment',

  // AVERSION
  'develop an aversion':        'to come to strongly dislike or want to avoid something',
  'a deep aversion':            'a very strong and persistent dislike or avoidance',
  'risk aversion':              'a preference for avoiding risks and uncertainty',
  'a strong aversion':          'a powerful dislike or avoidance of something',

  // COMPULSION
  'a deep-seated compulsion':   'a powerful, ingrained urge that is very hard to resist',
  'driven by compulsion':       'acting because of an overwhelming urge rather than rational choice',
  'act on compulsion':          'to do something because of an irresistible urge rather than deliberate choice',
  'resist a compulsion':        'to actively hold back an overwhelming urge from controlling your behaviour',
  'coercive compulsion':        'an irresistible urge that is used or reinforced by external force',
  'impetuous compulsion':       'an overwhelming urge that is sudden and unrestrained',

  // CRAVING
  'satisfy a craving':          'to fully meet a strong desire or appetite',
  'resist a craving':           'to hold back a strong desire and not give in to it',
  'an overwhelming craving':    'an extremely powerful desire that is very hard to resist',
  'trigger a craving':          'to cause a strong desire to arise',

  // WRATH
  'incur wrath':                'to cause someone to become intensely angry with you',
  'unleash wrath':              'to allow intense anger to be expressed fully without restraint',
  'bear the brunt of wrath':    'to receive the full force of someone\'s intense anger',
  'righteous wrath':            'intense anger felt in response to genuine injustice',
  'divine wrath':               'the intense anger attributed to a god as punishment for wrongdoing',
  'ominous wrath':              'intense anger that feels threatening and full of foreboding',
  'vicious wrath':              'extremely fierce and violent anger',
  'impetuous wrath':            'sudden, fierce anger that bursts out without warning',
  'notorious for wrath':        'widely known for regularly expressing intense, violent anger',

  // REMORSE
  'feel remorse':               'to experience deep guilt for something you have done',
  'express remorse':            'to show or communicate deep guilt for something you have done',
  'show remorse':               'to demonstrate deep regret or guilt for your actions',
  'without remorse':            'doing something harmful without feeling any guilt about it',
  'genuine remorse':            'real, sincere deep guilt for having done wrong',

  // STIGMA
  'challenge the stigma':       'to actively question and push back against social shame or prejudice',
  'reduce the stigma':          'to lessen the social shame attached to something',
  'attach a stigma':            'to link social shame or disgrace to something or someone',
  'social stigma':              'the social shame or disgrace attached to something seen as unacceptable',

  // WILLPOWER
  'summon willpower':           'to call up inner strength at a moment when you need it',
  'sheer willpower':            'inner strength achieved through determination alone, with no other help',
  'lack of willpower':          'absence of the inner strength needed to resist temptation',
  'steely willpower':           'very strong, inflexible inner resolve',
  'robust willpower':           'strong and firmly grounded inner strength',
  'tenacious willpower':        'inner strength that holds on firmly without giving up',
  'unwavering willpower':       'inner strength that holds firm without weakening',
  'vibrant willpower':          'lively, energetic inner strength that feels alive and active',
  'shrewd willpower':           'inner strength applied with clever strategic discipline',
  'buoyant willpower':          'inner strength that remains light and positive even under difficulty',

  // VIGILANCE
  'constant vigilance':         'watchfulness that never stops or lets up',
  'unwavering vigilance':       'watchfulness that holds firm without weakening',
  'eternal vigilance':          'the idea that alertness must be maintained forever to prevent harm',
  'require vigilance':          'to need a high level of watchfulness',
  'zealous vigilance':          'very enthusiastic and intense watchfulness',

  // COMPASSION
  'show compassion':            'to demonstrate empathy and care for someone\'s suffering',
  'genuine compassion':         'real, sincere empathy and care for others',
  'act with compassion':        'to behave in a way that shows empathy and care for others',
  'unwavering compassion':      'empathy and care that stays constant without weakening',
  'vibrant compassion':         'empathy and care that feels alive, warm, and full of energy',
  'buoyant compassion':         'compassion that remains upbeat and hopeful even in difficult situations',

  // SOLACE
  'find solace':                'to discover comfort or peace in something after grief or difficulty',
  'seek solace':                'to look for comfort or peace in something after grief or difficulty',
  'offer solace':               'to provide comfort or consolation to someone in pain',
  'bring solace':               'to cause comfort or consolation to arrive for someone in pain',
  'tenuous solace':             'comfort that is fragile and only partially reassuring',
  'cold solace':                'comfort that is small or inadequate given the severity of the loss',

  // CALAMITY
  'avert a calamity':           'to prevent a disaster from happening',
  'a looming calamity':         'a disaster that seems very likely to happen soon',
  'cause a calamity':           'to be the reason a disaster occurs',
  'recover from a calamity':    'to return to a stable state after a disaster',
  'an impending calamity':      'a disaster that is about to happen very soon',
  'an ominous calamity':        'a disaster that feels threatening and full of foreboding',

  // ORDEAL
  'a harrowing ordeal':         'an intensely distressing and traumatic experience',
  'survive an ordeal':          'to come through a very difficult and distressing experience',
  'put through an ordeal':      'to force someone to go through a very difficult experience',

  // TOIL
  'relentless toil':            'exhausting, hard work that continues without stopping',
  'years of toil':              'a long period of hard, exhausting work',
  'unremitting toil':           'hard work that continues without any break or relief',
  'daily toil':                 'the hard, exhausting work done each day',

  // MISERY
  'wallow in misery':           'to dwell in deep unhappiness without making any effort to escape it',
  'a source of misery':         'something that causes deep unhappiness',
  'absolute misery':            'complete, total, overwhelming unhappiness',
  'unremitting misery':         'suffering that continues without any relief',

  // FALLACY
  'expose a fallacy':           'to reveal that a widely held belief is actually false',
  'a common fallacy':           'a false belief that many people hold without questioning',
  'disprove a fallacy':         'to prove with evidence that a belief is wrong',

  // MALICE
  'with malice':                'acting with deliberate intention to cause harm',
  'bear malice':                'to harbour persistent hostility or ill-will toward someone',
  'harbour malice':             'to hold hostility or ill-will toward someone in your heart',
  'sinister malice':            'hostility with a dark, threatening quality',
  'brazen malice':              'openly hostile intent with no attempt to hide it',
  'vicious malice':             'extremely fierce and harmful hostile intent',
  'coercive malice':            'hostile intent that is used to force or threaten others',
  'conspicuous malice':         'hostile intent that is clearly visible and impossible to miss',
  'notorious for malice':       'widely known for consistently displaying hostile or harmful intent',

  // HAVOC
  'wreak havoc':                'to cause widespread destruction and chaos',
  'cause havoc':                'to be the reason widespread disorder and disruption arises',
  'create havoc':               'to bring widespread disorder and disruption into existence',
  'unleash havoc':              'to allow widespread chaos and destruction to erupt fully',
  'notorious for causing havoc':'widely known for regularly causing widespread chaos',

  // GRUDGE
  'harbour a grudge':           'to secretly keep a resentment toward someone over a long time',
  'bear a grudge':              'to carry persistent resentment toward someone',
  'hold a grudge':              'to maintain resentment against someone who has wronged you',
  'a deep-seated grudge':       'a resentment that is firmly rooted and hard to release',

  // OSTRACISM
  'face ostracism':             'to be socially excluded from a group or community',
  'social ostracism':           'the act of excluding someone from a social group or community',

  // LENIENCY
  'show leniency':              'to demonstrate a willingness to be merciful or forgiving',
  'plead for leniency':         'to ask earnestly for a more forgiving or merciful response',
  'excessive leniency':         'being far too forgiving or tolerant, to a harmful degree',
  'benign leniency':            'a gentle, harmless degree of tolerance or forgiveness',

  // IMPASSE
  'reach an impasse':           'to arrive at a point where no progress is possible because neither side will move',
  'break the impasse':          'to find a way out of a situation where no progress was possible',
  'resolve an impasse':         'to find a solution that allows a deadlock to end',
  'a diplomatic impasse':       'a deadlock in negotiations between countries or groups',

  // REVOLT
  'lead a revolt':              'to take charge of and direct an organised rebellion',
  'stage a revolt':             'to carry out an organised rebellion',
  'spark a revolt':             'to trigger an organised rebellion by acting as a catalyst',
  'suppress a revolt':          'to stop an organised rebellion from succeeding',

  // REDEMPTION
  'seek redemption':            'to look for a way to make amends for past wrongs',
  'find redemption':            'to succeed in making amends and regaining what was lost',
  'a chance at redemption':     'an opportunity to make amends and recover from past wrong',
  'path to redemption':         'the journey or process of making amends and recovering',

  // RELAPSE
  'prevent a relapse':          'to stop a return to a former harmful condition from happening',
  'trigger a relapse':          'to cause a return to a harmful behaviour or condition',
  'suffer a relapse':           'to experience a return to harmful behaviour or a worsening condition',

  // REMEDY
  'seek a remedy':              'to look for a solution or cure',
  'apply a remedy':             'to put a solution or cure into practice',
  'a viable remedy':            'a solution that is practical and capable of working',
  'an effective remedy':        'a solution that actually produces the desired result',
  'a tenuous remedy':           'a solution that is fragile and uncertain in its effectiveness',
  'a robust remedy':            'a solution that is strong, thorough, and likely to work effectively',
  'a judicious remedy':         'a solution chosen with careful and wise judgement',
  'a dubious remedy':           'a solution that is questionable and unlikely to work',
  'a benign remedy':            'a solution that is gentle and causes no harmful side-effects',

  // REPERCUSSION
  'face the repercussions':     'to accept and deal with the negative consequences of your actions',
  'suffer the repercussions':   'to experience the negative consequences of your actions',
  'wide-ranging repercussions': 'negative consequences that affect many areas or people',

  // BLUEPRINT
  'follow a blueprint':         'to use a detailed plan as a guide',
  'a detailed blueprint':       'a thorough, comprehensive plan',
  'a robust blueprint':         'a plan that is strong, thorough, and able to withstand challenges',
  'a rigorous blueprint':       'a very thorough and carefully structured plan',
  'a dubious blueprint':        'a plan that is questionable and cannot be fully trusted',

  // THRESHOLD
  'cross a threshold':          'to move past an important point or limit',
  'reach a threshold':          'to arrive at the critical level where something changes',
  'a critical threshold':       'a vitally important level or point that changes everything if crossed',
  'exceed the threshold':       'to go beyond the established limit',
  'a precarious threshold':     'a limit that is in a dangerously unstable or vulnerable position',

  // BACKLOG
  'tackle a backlog':           'to start dealing with a pile of work that has accumulated',
  'a growing backlog':          'a pile of work that keeps increasing in size',
  'clear a backlog':            'to deal with all the accumulated work until none is left',
  'a mounting backlog':         'a pile of work that is building up to a worrying level',
  'manage a backlog':           'to keep an accumulated pile of work under control',

  // REDUNDANCY
  'face redundancy':            'to be in the situation of possibly losing your job because it is no longer needed',
  'avoid redundancy':           'to prevent unnecessary duplication or job loss',
  'mass redundancy':            'a large number of people losing their jobs at the same time',
  'risk of redundancy':         'the possibility that your job may be eliminated',
  'threatened with redundancy': 'being told your job may no longer exist',

  // GRAVITAS
  'exude gravitas':             'to naturally project a quality of seriousness and authority',
  'carry gravitas':             'to possess a quality of seriousness and authority',
  'lend gravitas':              'to add seriousness and authority to something or someone',
  'command gravitas':           'to possess seriousness and authority that naturally earns respect',
  'project gravitas':           'to deliberately convey a quality of seriousness and authority',
  'lack of gravitas':           'absence of the seriousness and authority expected in a role',

  // POISE
  'with poise':                 'in a calm, self-assured, and graceful manner',
  'remarkable poise':           'an unusually high level of calm self-assurance under pressure',
  'composure and poise':        'the combination of emotional steadiness and graceful self-assurance',
  'a precarious poise':         'a calm composure that is in danger of being lost',

  // GULLIBILITY
  'exploit gullibility':        'to take advantage of someone\'s willingness to believe things easily',
  'prey on gullibility':        'to deliberately target someone\'s tendency to believe things uncritically',
  'take advantage of gullibility':'to use someone\'s naivety to get what you want from them',
  'sheer gullibility':          'remarkable willingness to believe things without questioning them',

  // HOAX
  'expose a hoax':              'to reveal to everyone that a supposed event or fact was a deliberate deception',
  'an elaborate hoax':          'a complex and carefully planned deception',
  'pull off a hoax':            'to successfully carry out a deliberate deception without being caught',
  'a brazen hoax':              'an extremely bold deception carried out openly with no attempt to hide it',

  // NEMESIS
  'face your nemesis':          'to confront the person or thing that is destined to defeat you',
  'become a nemesis':           'to become the source of someone\'s downfall',
  'encounter your nemesis':     'to come across the person or thing that represents your undoing',
  'a worthy nemesis':           'an opponent who is a genuine match for your abilities',

  // MENACE
  'pose a menace':              'to represent a danger or threat to others',
  'a looming menace':           'a danger or threat that is growing and feels imminent',
  'a public menace':            'a danger or threat to society at large',
  'lurk as a menace':           'to remain hidden in the background as a persistent danger',

  // IMPUNITY
  'act with impunity':          'to do something harmful without being punished or suffering any consequences',
  'operate with impunity':      'to carry out harmful activities without facing any consequences',
  'with total impunity':        'doing something harmful with absolutely no fear of consequences',

  // TESTAMENT
  'a lasting testament':        'something that remains as permanent evidence of a quality or achievement',
  'a fitting testament':        'something that is a very appropriate tribute or proof of something',
  'serve as a testament':       'to exist as evidence or proof of something',
  'stand as a testament':       'to remain as clear evidence or proof of something',

  // RUPTURE
  'cause a rupture':            'to be the reason a serious break or split occurs',
  'a sudden rupture':           'a serious break or split that happens unexpectedly',
  'a diplomatic rupture':       'a complete breakdown in relations between countries or groups',

  // VOID
  'fill a void':                'to provide what is needed to fill an emptiness or absence',
  'leave a void':               'to create an absence or emptiness when something or someone is gone',
  'create a void':              'to bring an emptiness or absence into being',
  'a gaping void':              'an extremely large and obvious emptiness or absence',

  // UNREMITTING
  'unremitting adversity':      'very difficult circumstances that continue without any break or relief',
  'unremitting scrutiny':       'extremely close examination that continues without letting up',
  'unremitting pressure':       'pressure that continues without pause or relief',

  // UNWAVERING
  'unwavering commitment':      'dedication that stays firm without wavering or reducing',
  'unwavering loyalty':         'faithfulness that stays constant without weakening',
  'unwavering resolve':         'determination that holds firm without weakening',

  // TENUOUS
  'a tenuous grasp':            'a hold on something that is very weak and uncertain',
  'a tenuous link':             'a connection between things that is very weak and uncertain',
  'a tenuous hold':             'a grip on something that is very weak and uncertain',

  // ROBUST
  'robust debate':              'a strong, open, vigorous exchange of opposing views',
  'a robust defence':           'a strong, thorough, and effective argument or protection',

  // RIGOROUS
  'rigorous scrutiny':          'very thorough and demanding examination',
  'rigorous analysis':          'very thorough and demanding examination of information',
  'rigorous testing':           'very thorough and demanding testing that misses nothing',
  'rigorous standards':         'very high and demanding standards that are strictly enforced',

  // TENACIOUS
  'tenacious resolve':          'determination that holds on firmly without giving up',
  'tenacious in adversity':     'refusing to give up when faced with very difficult circumstances',

  // ZEALOUS
  'zealous pursuit':            'the act of chasing something with intense enthusiasm and energy',
  'zealous advocate':           'someone who promotes a cause with great enthusiasm and commitment',

  // DUBIOUS
  'a dubious fallacy':          'a belief that is both false and of questionable origin',
  'a dubious distinction':      'an achievement that is questionable or nothing to be proud of',
  'a dubious claim':            'an assertion that is unlikely to be true or hard to trust',

  // OMINOUS
  'an ominous sign':            'something that suggests something bad is about to happen',
  'ominous silence':            'a silence that feels threatening and full of foreboding',
  'an ominous warning':         'a warning that has a dark, threatening quality',

  // PRECARIOUS
  'a precarious balance':       'a balance that is dangerously unstable and could collapse at any moment',
  'a precarious position':      'a situation that is dangerously unstable and uncertain',
  'a precarious hold':          'a grip that is dangerously weak and could give way',

  // SINISTER
  'a sinister motive':          'a hidden reason for doing something that is harmful or evil',
  'a sinister undertone':       'a dark, threatening feeling beneath the surface of something',
  'a sinister agenda':          'a hidden plan with harmful or evil intentions',

  // BRAZEN
  'brazen disregard':           'openly not caring about rules or others\' feelings with no shame',
  'a brazen lie':               'an obviously false statement told with no attempt to hide it',

  // NOTORIOUS
  'notorious for defiance':     'widely known for persistently and openly refusing to obey',
  'widely notorious':           'known very widely for something, usually something negative',

  // VICIOUS
  'a vicious cycle':            'a situation where one problem causes another, which makes the first worse',
  'a vicious circle':           'a situation where one problem causes another in a never-ending loop',

  // MORBID
  'a morbid fascination':       'an attraction to something dark, unpleasant, or related to death',
  'morbid curiosity':           'an interest in something dark or disturbing that you find yourself unable to ignore',
  'a morbid obsession':         'a preoccupation with something dark, unpleasant, or related to death',
  'morbid humour':              'humour that deals with dark, gloomy, or death-related subjects',

  // COERCIVE
  'coercive measures':          'actions taken to force people to do what you want through threats',
  'coercive tactics':           'methods used to force compliance through threats or pressure',
  'coercive control':           'a pattern of using threats and restrictions to dominate another person',

  // CONSPICUOUS
  'conspicuous absence':        'the fact of not being somewhere in a way that is very obvious and noticeable',
  'conspicuous by its absence': 'so noticeably absent that the absence itself is the thing everyone notices',

  // GULLIBLE
  'prey on the gullible':       'to deliberately target and exploit people who believe things too easily',
  'inexcusably gullible':       'being so willing to believe anything that it cannot be excused or forgiven',

  // IMPETUOUS
  'an impetuous decision':      'a decision made suddenly and without enough thought',
  'impetuous action':           'an action taken suddenly and without careful thought',

  // VIBRANT
  'a vibrant community':        'a community that is full of energy, activity, and life',
  'vibrant culture':            'a culture that is full of energy, creativity, and variety',

  // SALIENT
  'a salient point':            'a particularly important or notable point that stands out',
  'a salient feature':          'a particularly noticeable or important characteristic',
  'a salient example':          'an example that is particularly striking or relevant',
  'a salient reminder':         'a particularly striking reminder that draws attention to something important',

  // SHREWD
  'a shrewd move':              'a cleverly calculated action that gives you an advantage',
  'a shrewd observation':       'a perceptive and clever remark that sees something others miss',
  'shrewd judgement':           'the ability to assess situations cleverly and accurately',
  'a shrewd operator':          'someone who is very skilled at getting what they want through clever action',

  // JUDICIOUS
  'judicious use':              'using something carefully and with good judgement',
  'a judicious approach':       'a way of doing something that is carefully thought through and wise',
  'a judicious choice':         'a decision that is carefully considered and wise',

  // BUOYANT
  'a buoyant mood':             'a cheerful, optimistic, and uplifting mood',
  'a buoyant market':           'a market that is performing well and rising in value',

  // BENIGN
  'benign neglect':             'allowing something to develop without interfering, in the hope that it will sort itself out',
  'a benign presence':          'a presence that is gentle, harmless, and causes no threat',

  // FRAMEWORK
  'establish a framework':      'to create a structured system or set of rules to guide future activity',
  'within a framework':         'operating inside a set of rules or a structured system',
  'a regulatory framework':     'a set of rules established by authorities to govern an activity or industry',

  // CONFESSION
  'make a confession':          'to admit something you have done, especially something wrong',
  'force a confession':         'to make someone admit something against their will',
  'a full confession':          'a complete admission of everything you have done wrong',

  // TESTIMONY
  'give testimony':             'to formally state what you know or witnessed, often in a legal setting',
  'compelling testimony':       'a witness account that is very persuasive and hard to doubt',

  // LURK
  'lurk in the shadows':        'to stay hidden in a dark place while watching or waiting',
  'lurk beneath the surface':   'to exist as a hidden danger or feeling below what can be seen',
  'lurk unseen':                'to remain present but completely hidden from view',
}
