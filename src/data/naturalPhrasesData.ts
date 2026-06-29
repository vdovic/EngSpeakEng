/**
 * naturalPhrasesData.ts — curated natural collocation pairs for Natural Phrases Sprint.
 *
 * Each entry pairs an anchor library term with a naturally collocating option.
 * The completing option can be any common English word — not limited to library terms.
 * Selection criterion: frequency of use in natural English, not cross-library coverage.
 *
 * position:
 *   'after'  = anchor first, option follows  → "overcome challenges"
 *              shown as "overcome ___"  button: "… challenges"
 *   'before' = option first, anchor follows  → "face adversity"
 *              shown as "___ adversity"  button: "face …"
 *
 * DO NOT add AI calls or runtime generation here.
 */

export interface NaturalPhrasePair {
  anchor:           string
  option:           string
  position:         'before' | 'after'
  phrase:           string
  exampleSentence?: string
}

export const NATURAL_PHRASE_PAIRS: NaturalPhrasePair[] = [

  // ── OVERCOME ──────────────────────────────────────────────────────────────────
  { anchor: 'overcome', option: 'challenges',       position: 'after', phrase: 'overcome challenges' },
  { anchor: 'overcome', option: 'obstacles',        position: 'after', phrase: 'overcome obstacles' },
  { anchor: 'overcome', option: 'difficulties',     position: 'after', phrase: 'overcome difficulties' },
  { anchor: 'overcome', option: 'resistance',       position: 'after', phrase: 'overcome resistance' },
  { anchor: 'overcome', option: 'fears',            position: 'after', phrase: 'overcome fears' },
  { anchor: 'overcome', option: 'the odds',         position: 'after', phrase: 'overcome the odds' },

  // ── SUPPRESS ──────────────────────────────────────────────────────────────────
  { anchor: 'suppress', option: 'emotions',         position: 'after', phrase: 'suppress emotions' },
  { anchor: 'suppress', option: 'laughter',         position: 'after', phrase: 'suppress laughter' },
  { anchor: 'suppress', option: 'dissent',          position: 'after', phrase: 'suppress dissent' },
  { anchor: 'suppress', option: 'evidence',         position: 'after', phrase: 'suppress evidence' },
  { anchor: 'suppress', option: 'a smile',          position: 'after', phrase: 'suppress a smile' },
  { anchor: 'suppress', option: 'the urge',         position: 'after', phrase: 'suppress the urge' },

  // ── SUCCUMB ───────────────────────────────────────────────────────────────────
  { anchor: 'succumb', option: 'to temptation',     position: 'after', phrase: 'succumb to temptation' },
  { anchor: 'succumb', option: 'to pressure',       position: 'after', phrase: 'succumb to pressure' },
  { anchor: 'succumb', option: 'to illness',        position: 'after', phrase: 'succumb to illness' },
  { anchor: 'succumb', option: 'to despair',        position: 'after', phrase: 'succumb to despair' },
  { anchor: 'succumb', option: 'to peer pressure',  position: 'after', phrase: 'succumb to peer pressure' },

  // ── CURB ──────────────────────────────────────────────────────────────────────
  { anchor: 'curb', option: 'spending',             position: 'after', phrase: 'curb spending' },
  { anchor: 'curb', option: 'inflation',            position: 'after', phrase: 'curb inflation' },
  { anchor: 'curb', option: 'enthusiasm',           position: 'after', phrase: 'curb enthusiasm' },
  { anchor: 'curb', option: 'your appetite',        position: 'after', phrase: 'curb your appetite' },
  { anchor: 'curb', option: 'emissions',            position: 'after', phrase: 'curb emissions' },
  { anchor: 'curb', option: 'violence',             position: 'after', phrase: 'curb violence' },

  // ── INDULGE ───────────────────────────────────────────────────────────────────
  { anchor: 'indulge', option: 'yourself',          position: 'after', phrase: 'indulge yourself' },
  { anchor: 'indulge', option: 'in luxury',         position: 'after', phrase: 'indulge in luxury' },
  { anchor: 'indulge', option: 'a whim',            position: 'after', phrase: 'indulge a whim' },
  { anchor: 'indulge', option: 'your curiosity',    position: 'after', phrase: 'indulge your curiosity' },
  { anchor: 'indulge', option: 'your passion',      position: 'after', phrase: 'indulge your passion' },
  { anchor: 'indulge', option: 'in nostalgia',      position: 'after', phrase: 'indulge in nostalgia' },

  // ── TAME ──────────────────────────────────────────────────────────────────────
  { anchor: 'tame', option: 'inflation',            position: 'after', phrase: 'tame inflation' },
  { anchor: 'tame', option: 'your impulses',        position: 'after', phrase: 'tame your impulses' },
  { anchor: 'tame', option: 'a wild animal',        position: 'after', phrase: 'tame a wild animal' },
  { anchor: 'tame', option: 'the chaos',            position: 'after', phrase: 'tame the chaos' },
  { anchor: 'tame', option: 'your ambitions',       position: 'after', phrase: 'tame your ambitions' },

  // ── TEMPER ────────────────────────────────────────────────────────────────────
  { anchor: 'temper', option: 'expectations',       position: 'after', phrase: 'temper expectations' },
  { anchor: 'temper', option: 'your ambitions',     position: 'after', phrase: 'temper your ambitions' },
  { anchor: 'temper', option: 'enthusiasm',         position: 'after', phrase: 'temper enthusiasm' },
  { anchor: 'temper', option: 'criticism',          position: 'after', phrase: 'temper criticism' },
  { anchor: 'temper', option: 'optimism',           position: 'after', phrase: 'temper optimism' },

  // ── STIFLE ────────────────────────────────────────────────────────────────────
  { anchor: 'stifle', option: 'creativity',         position: 'after', phrase: 'stifle creativity' },
  { anchor: 'stifle', option: 'growth',             position: 'after', phrase: 'stifle growth' },
  { anchor: 'stifle', option: 'a yawn',             position: 'after', phrase: 'stifle a yawn' },
  { anchor: 'stifle', option: 'debate',             position: 'after', phrase: 'stifle debate' },
  { anchor: 'stifle', option: 'progress',           position: 'after', phrase: 'stifle progress' },
  { anchor: 'stifle', option: 'a laugh',            position: 'after', phrase: 'stifle a laugh' },

  // ── MAINTAIN ──────────────────────────────────────────────────────────────────
  { anchor: 'maintain', option: 'composure',        position: 'after', phrase: 'maintain composure' },
  { anchor: 'maintain', option: 'momentum',         position: 'after', phrase: 'maintain momentum' },
  { anchor: 'maintain', option: 'standards',        position: 'after', phrase: 'maintain standards' },
  { anchor: 'maintain', option: 'focus',            position: 'after', phrase: 'maintain focus' },
  { anchor: 'maintain', option: 'a balance',        position: 'after', phrase: 'maintain a balance' },
  { anchor: 'maintain', option: 'control',          position: 'after', phrase: 'maintain control' },
  { anchor: 'maintain', option: 'the status quo',   position: 'after', phrase: 'maintain the status quo' },

  // ── BOLSTER ───────────────────────────────────────────────────────────────────
  { anchor: 'bolster', option: 'confidence',        position: 'after', phrase: 'bolster confidence' },
  { anchor: 'bolster', option: 'support',           position: 'after', phrase: 'bolster support' },
  { anchor: 'bolster', option: 'morale',            position: 'after', phrase: 'bolster morale' },
  { anchor: 'bolster', option: 'defences',          position: 'after', phrase: 'bolster defences' },
  { anchor: 'bolster', option: 'a claim',           position: 'after', phrase: 'bolster a claim' },
  { anchor: 'bolster', option: 'the economy',       position: 'after', phrase: 'bolster the economy' },

  // ── AMPLIFY ───────────────────────────────────────────────────────────────────
  { anchor: 'amplify', option: 'the effect',        position: 'after', phrase: 'amplify the effect' },
  { anchor: 'amplify', option: 'tensions',          position: 'after', phrase: 'amplify tensions' },
  { anchor: 'amplify', option: 'your voice',        position: 'after', phrase: 'amplify your voice' },
  { anchor: 'amplify', option: 'concerns',          position: 'after', phrase: 'amplify concerns' },
  { anchor: 'amplify', option: 'a message',         position: 'after', phrase: 'amplify a message' },

  // ── EXACERBATE ────────────────────────────────────────────────────────────────
  { anchor: 'exacerbate', option: 'the problem',    position: 'after', phrase: 'exacerbate the problem' },
  { anchor: 'exacerbate', option: 'tensions',       position: 'after', phrase: 'exacerbate tensions' },
  { anchor: 'exacerbate', option: 'symptoms',       position: 'after', phrase: 'exacerbate symptoms' },
  { anchor: 'exacerbate', option: 'inequality',     position: 'after', phrase: 'exacerbate inequality' },
  { anchor: 'exacerbate', option: 'the situation',  position: 'after', phrase: 'exacerbate the situation' },

  // ── COMPOUND ──────────────────────────────────────────────────────────────────
  { anchor: 'compound', option: 'the problem',      position: 'after', phrase: 'compound the problem' },
  { anchor: 'compound', option: 'the issue',        position: 'after', phrase: 'compound the issue' },
  { anchor: 'compound', option: 'matters',          position: 'after', phrase: 'compound matters' },
  { anchor: 'compound', option: 'the difficulty',   position: 'after', phrase: 'compound the difficulty' },
  { anchor: 'compound', option: 'the effect',       position: 'after', phrase: 'compound the effect' },

  // ── AGGRAVATE ─────────────────────────────────────────────────────────────────
  { anchor: 'aggravate', option: 'the situation',   position: 'after', phrase: 'aggravate the situation' },
  { anchor: 'aggravate', option: 'symptoms',        position: 'after', phrase: 'aggravate symptoms' },
  { anchor: 'aggravate', option: 'the condition',   position: 'after', phrase: 'aggravate the condition' },
  { anchor: 'aggravate', option: 'tensions',        position: 'after', phrase: 'aggravate tensions' },
  { anchor: 'aggravate', option: 'an injury',       position: 'after', phrase: 'aggravate an injury' },

  // ── PERPETUATE ────────────────────────────────────────────────────────────────
  { anchor: 'perpetuate', option: 'a myth',         position: 'after', phrase: 'perpetuate a myth' },
  { anchor: 'perpetuate', option: 'a cycle',        position: 'after', phrase: 'perpetuate a cycle' },
  { anchor: 'perpetuate', option: 'inequality',     position: 'after', phrase: 'perpetuate inequality' },
  { anchor: 'perpetuate', option: 'stereotypes',    position: 'after', phrase: 'perpetuate stereotypes' },
  { anchor: 'perpetuate', option: 'a system',       position: 'after', phrase: 'perpetuate a system' },

  // ── ACKNOWLEDGE ───────────────────────────────────────────────────────────────
  { anchor: 'acknowledge', option: 'a mistake',         position: 'after',  phrase: 'acknowledge a mistake' },
  { anchor: 'acknowledge', option: 'responsibility',    position: 'after',  phrase: 'acknowledge responsibility' },
  { anchor: 'acknowledge', option: 'defeat',            position: 'after',  phrase: 'acknowledge defeat' },
  { anchor: 'acknowledge', option: 'contributions',     position: 'after',  phrase: 'acknowledge contributions' },
  { anchor: 'acknowledge', option: 'the fact',          position: 'after',  phrase: 'acknowledge the fact' },
  { anchor: 'acknowledge', option: 'widely',            position: 'before', phrase: 'widely acknowledged' },

  // ── INSTILL ───────────────────────────────────────────────────────────────────
  { anchor: 'instill', option: 'confidence',        position: 'after', phrase: 'instill confidence' },
  { anchor: 'instill', option: 'values',            position: 'after', phrase: 'instill values' },
  { anchor: 'instill', option: 'discipline',        position: 'after', phrase: 'instill discipline' },
  { anchor: 'instill', option: 'fear',              position: 'after', phrase: 'instill fear' },
  { anchor: 'instill', option: 'respect',           position: 'after', phrase: 'instill respect' },
  { anchor: 'instill', option: 'loyalty',           position: 'after', phrase: 'instill loyalty' },

  // ── INFUSE ────────────────────────────────────────────────────────────────────
  { anchor: 'infuse', option: 'energy',             position: 'after', phrase: 'infuse energy' },
  { anchor: 'infuse', option: 'enthusiasm',         position: 'after', phrase: 'infuse enthusiasm' },
  { anchor: 'infuse', option: 'life',               position: 'after', phrase: 'infuse life' },
  { anchor: 'infuse', option: 'creativity',         position: 'after', phrase: 'infuse creativity' },
  { anchor: 'infuse', option: 'passion',            position: 'after', phrase: 'infuse passion' },

  // ── ENGENDER ──────────────────────────────────────────────────────────────────
  { anchor: 'engender', option: 'trust',            position: 'after', phrase: 'engender trust' },
  { anchor: 'engender', option: 'support',          position: 'after', phrase: 'engender support' },
  { anchor: 'engender', option: 'conflict',         position: 'after', phrase: 'engender conflict' },
  { anchor: 'engender', option: 'loyalty',          position: 'after', phrase: 'engender loyalty' },
  { anchor: 'engender', option: 'goodwill',         position: 'after', phrase: 'engender goodwill' },
  { anchor: 'engender', option: 'hope',             position: 'after', phrase: 'engender hope' },

  // ── DWINDLE ───────────────────────────────────────────────────────────────────
  { anchor: 'dwindle', option: 'away',              position: 'after',  phrase: 'dwindle away' },
  { anchor: 'dwindle', option: 'rapidly',           position: 'after',  phrase: 'dwindle rapidly' },
  { anchor: 'dwindle', option: 'steadily',          position: 'after',  phrase: 'dwindle steadily' },
  { anchor: 'dwindle', option: 'to nothing',        position: 'after',  phrase: 'dwindle to nothing' },
  { anchor: 'dwindle', option: 'numbers',           position: 'before', phrase: 'numbers dwindle' },
  { anchor: 'dwindle', option: 'support',           position: 'before', phrase: 'support dwindle' },

  // ── THWART ────────────────────────────────────────────────────────────────────
  { anchor: 'thwart', option: 'plans',              position: 'after', phrase: 'thwart plans' },
  { anchor: 'thwart', option: 'attempts',           position: 'after', phrase: 'thwart attempts' },
  { anchor: 'thwart', option: 'ambitions',          position: 'after', phrase: 'thwart ambitions' },
  { anchor: 'thwart', option: 'progress',           position: 'after', phrase: 'thwart progress' },
  { anchor: 'thwart', option: 'efforts',            position: 'after', phrase: 'thwart efforts' },
  { anchor: 'thwart', option: 'a plot',             position: 'after', phrase: 'thwart a plot' },

  // ── SCRUTINIZE ────────────────────────────────────────────────────────────────
  { anchor: 'scrutinize', option: 'closely',        position: 'after',  phrase: 'scrutinize closely' },
  { anchor: 'scrutinize', option: 'carefully',      position: 'after',  phrase: 'scrutinize carefully' },
  { anchor: 'scrutinize', option: 'every detail',   position: 'after',  phrase: 'scrutinize every detail' },
  { anchor: 'scrutinize', option: 'evidence',       position: 'after',  phrase: 'scrutinize evidence' },
  { anchor: 'scrutinize', option: 'publicly',       position: 'before', phrase: 'publicly scrutinized' },

  // ── UNDERPIN ──────────────────────────────────────────────────────────────────
  { anchor: 'underpin', option: 'growth',           position: 'after', phrase: 'underpin growth' },
  { anchor: 'underpin', option: 'a theory',         position: 'after', phrase: 'underpin a theory' },
  { anchor: 'underpin', option: 'democracy',        position: 'after', phrase: 'underpin democracy' },
  { anchor: 'underpin', option: 'success',          position: 'after', phrase: 'underpin success' },
  { anchor: 'underpin', option: 'the argument',     position: 'after', phrase: 'underpin the argument' },

  // ── RECTIFY ───────────────────────────────────────────────────────────────────
  { anchor: 'rectify', option: 'the situation',     position: 'after', phrase: 'rectify the situation' },
  { anchor: 'rectify', option: 'a mistake',         position: 'after', phrase: 'rectify a mistake' },
  { anchor: 'rectify', option: 'an error',          position: 'after', phrase: 'rectify an error' },
  { anchor: 'rectify', option: 'an injustice',      position: 'after', phrase: 'rectify an injustice' },
  { anchor: 'rectify', option: 'the problem',       position: 'after', phrase: 'rectify the problem' },

  // ── SUBVERT ───────────────────────────────────────────────────────────────────
  { anchor: 'subvert', option: 'democracy',         position: 'after', phrase: 'subvert democracy' },
  { anchor: 'subvert', option: 'the system',        position: 'after', phrase: 'subvert the system' },
  { anchor: 'subvert', option: 'expectations',      position: 'after', phrase: 'subvert expectations' },
  { anchor: 'subvert', option: 'authority',         position: 'after', phrase: 'subvert authority' },
  { anchor: 'subvert', option: 'the rules',         position: 'after', phrase: 'subvert the rules' },

  // ── UNSETTLE ──────────────────────────────────────────────────────────────────
  { anchor: 'unsettle', option: 'the markets',      position: 'after',  phrase: 'unsettle the markets' },
  { anchor: 'unsettle', option: 'opponents',        position: 'after',  phrase: 'unsettle opponents' },
  { anchor: 'unsettle', option: 'the balance',      position: 'after',  phrase: 'unsettle the balance' },
  { anchor: 'unsettle', option: 'investors',        position: 'after',  phrase: 'unsettle investors' },
  { anchor: 'unsettle', option: 'deeply',           position: 'before', phrase: 'deeply unsettle' },

  // ── EXERT ─────────────────────────────────────────────────────────────────────
  { anchor: 'exert', option: 'pressure',            position: 'after', phrase: 'exert pressure' },
  { anchor: 'exert', option: 'control',             position: 'after', phrase: 'exert control' },
  { anchor: 'exert', option: 'influence',           position: 'after', phrase: 'exert influence' },
  { anchor: 'exert', option: 'power',               position: 'after', phrase: 'exert power' },
  { anchor: 'exert', option: 'authority',           position: 'after', phrase: 'exert authority' },
  { anchor: 'exert', option: 'effort',              position: 'after', phrase: 'exert effort' },

  // ── TRANSCEND ─────────────────────────────────────────────────────────────────
  { anchor: 'transcend', option: 'boundaries',      position: 'after', phrase: 'transcend boundaries' },
  { anchor: 'transcend', option: 'differences',     position: 'after', phrase: 'transcend differences' },
  { anchor: 'transcend', option: 'barriers',        position: 'after', phrase: 'transcend barriers' },
  { anchor: 'transcend', option: 'expectations',    position: 'after', phrase: 'transcend expectations' },
  { anchor: 'transcend', option: 'cultures',        position: 'after', phrase: 'transcend cultures' },

  // ── ENDURE ────────────────────────────────────────────────────────────────────
  { anchor: 'endure', option: 'hardship',           position: 'after', phrase: 'endure hardship' },
  { anchor: 'endure', option: 'suffering',          position: 'after', phrase: 'endure suffering' },
  { anchor: 'endure', option: 'criticism',          position: 'after', phrase: 'endure criticism' },
  { anchor: 'endure', option: 'the pain',           position: 'after', phrase: 'endure the pain' },
  { anchor: 'endure', option: 'for years',          position: 'after', phrase: 'endure for years' },

  // ── INSTIGATE ─────────────────────────────────────────────────────────────────
  { anchor: 'instigate', option: 'change',          position: 'after', phrase: 'instigate change' },
  { anchor: 'instigate', option: 'proceedings',     position: 'after', phrase: 'instigate proceedings' },
  { anchor: 'instigate', option: 'a conflict',      position: 'after', phrase: 'instigate a conflict' },
  { anchor: 'instigate', option: 'trouble',         position: 'after', phrase: 'instigate trouble' },
  { anchor: 'instigate', option: 'a rebellion',     position: 'after', phrase: 'instigate a rebellion' },

  // ── LURE ──────────────────────────────────────────────────────────────────────
  { anchor: 'lure', option: 'customers',            position: 'after', phrase: 'lure customers' },
  { anchor: 'lure', option: 'investors',            position: 'after', phrase: 'lure investors' },
  { anchor: 'lure', option: 'talent',               position: 'after', phrase: 'lure talent' },
  { anchor: 'lure', option: 'into a trap',          position: 'after', phrase: 'lure into a trap' },
  { anchor: 'lure', option: 'with promises',        position: 'after', phrase: 'lure with promises' },
  { anchor: 'lure', option: 'away',                 position: 'after', phrase: 'lure away' },

  // ── MOLLIFY ───────────────────────────────────────────────────────────────────
  { anchor: 'mollify', option: 'critics',           position: 'after', phrase: 'mollify critics' },
  { anchor: 'mollify', option: 'concerns',          position: 'after', phrase: 'mollify concerns' },
  { anchor: 'mollify', option: 'anger',             position: 'after', phrase: 'mollify anger' },
  { anchor: 'mollify', option: 'the opposition',    position: 'after', phrase: 'mollify the opposition' },
  { anchor: 'mollify', option: 'fears',             position: 'after', phrase: 'mollify fears' },

  // ── PLACATE ───────────────────────────────────────────────────────────────────
  { anchor: 'placate', option: 'critics',           position: 'after', phrase: 'placate critics' },
  { anchor: 'placate', option: 'the crowd',         position: 'after', phrase: 'placate the crowd' },
  { anchor: 'placate', option: 'concerns',          position: 'after', phrase: 'placate concerns' },
  { anchor: 'placate', option: 'the opposition',    position: 'after', phrase: 'placate the opposition' },
  { anchor: 'placate', option: 'an angry client',   position: 'after', phrase: 'placate an angry client' },

  // ── MEDDLE ────────────────────────────────────────────────────────────────────
  { anchor: 'meddle', option: 'in affairs',         position: 'after', phrase: 'meddle in affairs' },
  { anchor: 'meddle', option: 'in politics',        position: 'after', phrase: 'meddle in politics' },
  { anchor: 'meddle', option: 'with evidence',      position: 'after', phrase: 'meddle with evidence' },
  { anchor: 'meddle', option: 'in the process',     position: 'after', phrase: 'meddle in the process' },
  { anchor: 'meddle', option: 'with the plan',      position: 'after', phrase: 'meddle with the plan' },

  // ── ERADICATE ─────────────────────────────────────────────────────────────────
  { anchor: 'eradicate', option: 'poverty',         position: 'after', phrase: 'eradicate poverty' },
  { anchor: 'eradicate', option: 'disease',         position: 'after', phrase: 'eradicate disease' },
  { anchor: 'eradicate', option: 'discrimination',  position: 'after', phrase: 'eradicate discrimination' },
  { anchor: 'eradicate', option: 'inequality',      position: 'after', phrase: 'eradicate inequality' },
  { anchor: 'eradicate', option: 'the problem',     position: 'after', phrase: 'eradicate the problem' },

  // ── EMBROIL ───────────────────────────────────────────────────────────────────
  { anchor: 'embroil', option: 'in controversy',    position: 'after',  phrase: 'embroil in controversy' },
  { anchor: 'embroil', option: 'in a dispute',      position: 'after',  phrase: 'embroil in a dispute' },
  { anchor: 'embroil', option: 'in scandal',        position: 'after',  phrase: 'embroil in scandal' },
  { anchor: 'embroil', option: 'in conflict',       position: 'after',  phrase: 'embroil in conflict' },
  { anchor: 'embroil', option: 'deeply',            position: 'before', phrase: 'deeply embroiled' },

  // ── DETER ─────────────────────────────────────────────────────────────────────
  { anchor: 'deter', option: 'crime',               position: 'after', phrase: 'deter crime' },
  { anchor: 'deter', option: 'investors',           position: 'after', phrase: 'deter investors' },
  { anchor: 'deter', option: 'aggression',          position: 'after', phrase: 'deter aggression' },
  { anchor: 'deter', option: 'criminals',           position: 'after', phrase: 'deter criminals' },
  { anchor: 'deter', option: 'from action',         position: 'after', phrase: 'deter from action' },

  // ── DISCARD ───────────────────────────────────────────────────────────────────
  { anchor: 'discard', option: 'old ideas',         position: 'after', phrase: 'discard old ideas' },
  { anchor: 'discard', option: 'a plan',            position: 'after', phrase: 'discard a plan' },
  { anchor: 'discard', option: 'assumptions',       position: 'after', phrase: 'discard assumptions' },
  { anchor: 'discard', option: 'evidence',          position: 'after', phrase: 'discard evidence' },
  { anchor: 'discard', option: 'the notion',        position: 'after', phrase: 'discard the notion' },

  // ── BYPASS ────────────────────────────────────────────────────────────────────
  { anchor: 'bypass', option: 'the rules',          position: 'after', phrase: 'bypass the rules' },
  { anchor: 'bypass', option: 'security',           position: 'after', phrase: 'bypass security' },
  { anchor: 'bypass', option: 'the system',         position: 'after', phrase: 'bypass the system' },
  { anchor: 'bypass', option: 'procedure',          position: 'after', phrase: 'bypass procedure' },
  { anchor: 'bypass', option: 'obstacles',          position: 'after', phrase: 'bypass obstacles' },

  // ── DEFY ──────────────────────────────────────────────────────────────────────
  { anchor: 'defy', option: 'the odds',             position: 'after', phrase: 'defy the odds' },
  { anchor: 'defy', option: 'expectations',         position: 'after', phrase: 'defy expectations' },
  { anchor: 'defy', option: 'gravity',              position: 'after', phrase: 'defy gravity' },
  { anchor: 'defy', option: 'logic',                position: 'after', phrase: 'defy logic' },
  { anchor: 'defy', option: 'authority',            position: 'after', phrase: 'defy authority' },
  { anchor: 'defy', option: 'convention',           position: 'after', phrase: 'defy convention' },

  // ── COLLATE ───────────────────────────────────────────────────────────────────
  { anchor: 'collate', option: 'data',              position: 'after', phrase: 'collate data' },
  { anchor: 'collate', option: 'information',       position: 'after', phrase: 'collate information' },
  { anchor: 'collate', option: 'evidence',          position: 'after', phrase: 'collate evidence' },
  { anchor: 'collate', option: 'results',           position: 'after', phrase: 'collate results' },
  { anchor: 'collate', option: 'feedback',          position: 'after', phrase: 'collate feedback' },

  // ── REVERT ────────────────────────────────────────────────────────────────────
  { anchor: 'revert', option: 'to type',            position: 'after', phrase: 'revert to type' },
  { anchor: 'revert', option: 'to old habits',      position: 'after', phrase: 'revert to old habits' },
  { anchor: 'revert', option: 'to default',         position: 'after', phrase: 'revert to default' },
  { anchor: 'revert', option: 'to basics',          position: 'after', phrase: 'revert to basics' },
  { anchor: 'revert', option: 'to normal',          position: 'after', phrase: 'revert to normal' },

  // ── EXASPERATE ────────────────────────────────────────────────────────────────
  { anchor: 'exasperate', option: 'critics',        position: 'after',  phrase: 'exasperate critics' },
  { anchor: 'exasperate', option: 'colleagues',     position: 'after',  phrase: 'exasperate colleagues' },
  { anchor: 'exasperate', option: 'everyone',       position: 'after',  phrase: 'exasperate everyone' },
  { anchor: 'exasperate', option: 'your audience',  position: 'after',  phrase: 'exasperate your audience' },
  { anchor: 'exasperate', option: 'deeply',         position: 'before', phrase: 'deeply exasperated' },

  // ── PLUMMET ───────────────────────────────────────────────────────────────────
  { anchor: 'plummet', option: 'to the ground',     position: 'after',  phrase: 'plummet to the ground' },
  { anchor: 'plummet', option: 'in value',          position: 'after',  phrase: 'plummet in value' },
  { anchor: 'plummet', option: 'dramatically',      position: 'after',  phrase: 'plummet dramatically' },
  { anchor: 'plummet', option: 'overnight',         position: 'after',  phrase: 'plummet overnight' },
  { anchor: 'plummet', option: 'prices',            position: 'before', phrase: 'prices plummet' },

  // ── SWAY ──────────────────────────────────────────────────────────────────────
  { anchor: 'sway', option: 'opinion',              position: 'after',  phrase: 'sway opinion' },
  { anchor: 'sway', option: 'voters',               position: 'after',  phrase: 'sway voters' },
  { anchor: 'sway', option: 'the decision',         position: 'after',  phrase: 'sway the decision' },
  { anchor: 'sway', option: 'in the wind',          position: 'after',  phrase: 'sway in the wind' },
  { anchor: 'sway', option: 'hold',                 position: 'before', phrase: 'hold sway' },

  // ── RELENT ────────────────────────────────────────────────────────────────────
  { anchor: 'relent', option: 'under pressure',     position: 'after',  phrase: 'relent under pressure' },
  { anchor: 'relent', option: 'eventually',         position: 'after',  phrase: 'relent eventually' },
  { anchor: 'relent', option: 'finally',            position: 'before', phrase: 'finally relent' },
  { anchor: 'relent', option: 'refuse to',          position: 'before', phrase: 'refuse to relent' },

  // ── AMALGAMATE ────────────────────────────────────────────────────────────────
  { anchor: 'amalgamate', option: 'companies',      position: 'after', phrase: 'amalgamate companies' },
  { anchor: 'amalgamate', option: 'resources',      position: 'after', phrase: 'amalgamate resources' },
  { anchor: 'amalgamate', option: 'ideas',          position: 'after', phrase: 'amalgamate ideas' },
  { anchor: 'amalgamate', option: 'into one',       position: 'after', phrase: 'amalgamate into one' },
  { anchor: 'amalgamate', option: 'data',           position: 'after', phrase: 'amalgamate data' },

  // ── COMPEL ────────────────────────────────────────────────────────────────────
  { anchor: 'compel', option: 'action',             position: 'after',  phrase: 'compel action' },
  { anchor: 'compel', option: 'compliance',         position: 'after',  phrase: 'compel compliance' },
  { anchor: 'compel', option: 'obedience',          position: 'after',  phrase: 'compel obedience' },
  { anchor: 'compel', option: 'attention',          position: 'after',  phrase: 'compel attention' },
  { anchor: 'compel', option: 'change',             position: 'after',  phrase: 'compel change' },
  { anchor: 'compel', option: 'feel',               position: 'before', phrase: 'feel compelled' },

  // ── INTIMIDATE ────────────────────────────────────────────────────────────────
  { anchor: 'intimidate', option: 'witnesses',      position: 'after',  phrase: 'intimidate witnesses' },
  { anchor: 'intimidate', option: 'opponents',      position: 'after',  phrase: 'intimidate opponents' },
  { anchor: 'intimidate', option: 'into silence',   position: 'after',  phrase: 'intimidate into silence' },
  { anchor: 'intimidate', option: 'voters',         position: 'after',  phrase: 'intimidate voters' },
  { anchor: 'intimidate', option: 'easily',         position: 'before', phrase: 'easily intimidated' },

  // ── LAMENT ────────────────────────────────────────────────────────────────────
  { anchor: 'lament', option: 'the loss',           position: 'after',  phrase: 'lament the loss' },
  { anchor: 'lament', option: 'the decline',        position: 'after',  phrase: 'lament the decline' },
  { anchor: 'lament', option: 'the fact',           position: 'after',  phrase: 'lament the fact' },
  { anchor: 'lament', option: 'widely',             position: 'before', phrase: 'widely lamented' },
  { anchor: 'lament', option: 'bitterly',           position: 'before', phrase: 'bitterly lament' },

  // ── REVAMP ────────────────────────────────────────────────────────────────────
  { anchor: 'revamp', option: 'the system',         position: 'after', phrase: 'revamp the system' },
  { anchor: 'revamp', option: 'the image',          position: 'after', phrase: 'revamp the image' },
  { anchor: 'revamp', option: 'a strategy',         position: 'after', phrase: 'revamp a strategy' },
  { anchor: 'revamp', option: 'the curriculum',     position: 'after', phrase: 'revamp the curriculum' },
  { anchor: 'revamp', option: 'the design',         position: 'after', phrase: 'revamp the design' },

  // ── CONFINE ───────────────────────────────────────────────────────────────────
  { anchor: 'confine', option: 'yourself to',       position: 'after',  phrase: 'confine yourself to' },
  { anchor: 'confine', option: 'to barracks',       position: 'after',  phrase: 'confine to barracks' },
  { anchor: 'confine', option: 'to a role',         position: 'after',  phrase: 'confine to a role' },
  { anchor: 'confine', option: 'the problem',       position: 'after',  phrase: 'confine the problem' },
  { anchor: 'confine', option: 'strictly',          position: 'before', phrase: 'strictly confine' },

  // ── CIRCUMSCRIBE ──────────────────────────────────────────────────────────────
  { anchor: 'circumscribe', option: 'power',        position: 'after',  phrase: 'circumscribe power' },
  { anchor: 'circumscribe', option: 'freedom',      position: 'after',  phrase: 'circumscribe freedom' },
  { anchor: 'circumscribe', option: 'activity',     position: 'after',  phrase: 'circumscribe activity' },
  { anchor: 'circumscribe', option: 'authority',    position: 'after',  phrase: 'circumscribe authority' },
  { anchor: 'circumscribe', option: 'tightly',      position: 'before', phrase: 'tightly circumscribed' },

  // ── DISMAY ────────────────────────────────────────────────────────────────────
  { anchor: 'dismay', option: 'observers',          position: 'after',  phrase: 'dismay observers' },
  { anchor: 'dismay', option: 'critics',            position: 'after',  phrase: 'dismay critics' },
  { anchor: 'dismay', option: 'supporters',         position: 'after',  phrase: 'dismay supporters' },
  { anchor: 'dismay', option: 'utterly',            position: 'before', phrase: 'utterly dismay' },
  { anchor: 'dismay', option: 'deeply',             position: 'before', phrase: 'deeply dismayed' },

  // ── ENHANCE ───────────────────────────────────────────────────────────────────
  { anchor: 'enhance', option: 'performance',       position: 'after',  phrase: 'enhance performance' },
  { anchor: 'enhance', option: 'value',             position: 'after',  phrase: 'enhance value' },
  { anchor: 'enhance', option: 'productivity',      position: 'after',  phrase: 'enhance productivity' },
  { anchor: 'enhance', option: 'skills',            position: 'after',  phrase: 'enhance skills' },
  { anchor: 'enhance', option: 'understanding',     position: 'after',  phrase: 'enhance understanding' },
  { anchor: 'enhance', option: 'greatly',           position: 'before', phrase: 'greatly enhance' },

  // ── ADVERSITY ─────────────────────────────────────────────────────────────────
  { anchor: 'adversity', option: 'face',          position: 'before', phrase: 'face adversity' },
  { anchor: 'adversity', option: 'endure',        position: 'before', phrase: 'endure adversity' },
  { anchor: 'adversity', option: 'extreme',       position: 'before', phrase: 'extreme adversity' },
  { anchor: 'adversity', option: 'rise above',    position: 'before', phrase: 'rise above adversity' },
  { anchor: 'adversity', option: 'triumph over',  position: 'before', phrase: 'triumph over adversity' },
  { anchor: 'adversity', option: 'withstand',     position: 'before', phrase: 'withstand adversity' },

  // ── SETBACK ───────────────────────────────────────────────────────────────────
  { anchor: 'setback', option: 'suffer a',        position: 'before', phrase: 'suffer a setback' },
  { anchor: 'setback', option: 'face a',          position: 'before', phrase: 'face a setback' },
  { anchor: 'setback', option: 'deal with a',     position: 'before', phrase: 'deal with a setback' },
  { anchor: 'setback', option: 'temporary',       position: 'before', phrase: 'temporary setback' },
  { anchor: 'setback', option: 'minor',           position: 'before', phrase: 'minor setback' },
  { anchor: 'setback', option: 'major',           position: 'before', phrase: 'major setback' },

  // ── WRATH ─────────────────────────────────────────────────────────────────────
  { anchor: 'wrath', option: 'incur',             position: 'before', phrase: 'incur wrath' },
  { anchor: 'wrath', option: 'face the',          position: 'before', phrase: 'face the wrath' },
  { anchor: 'wrath', option: 'provoke',           position: 'before', phrase: 'provoke wrath' },
  { anchor: 'wrath', option: 'divine',            position: 'before', phrase: 'divine wrath' },
  { anchor: 'wrath', option: 'vent your',         position: 'before', phrase: 'vent your wrath' },
  { anchor: 'wrath', option: 'unleash',           position: 'before', phrase: 'unleash wrath' },

  // ── REMORSE ───────────────────────────────────────────────────────────────────
  { anchor: 'remorse', option: 'feel',            position: 'before', phrase: 'feel remorse' },
  { anchor: 'remorse', option: 'show',            position: 'before', phrase: 'show remorse' },
  { anchor: 'remorse', option: 'express',         position: 'before', phrase: 'express remorse' },
  { anchor: 'remorse', option: 'genuine',         position: 'before', phrase: 'genuine remorse' },
  { anchor: 'remorse', option: 'without',         position: 'before', phrase: 'without remorse' },
  { anchor: 'remorse', option: 'deep',            position: 'before', phrase: 'deep remorse' },

  // ── STIGMA ────────────────────────────────────────────────────────────────────
  { anchor: 'stigma', option: 'social',           position: 'before', phrase: 'social stigma' },
  { anchor: 'stigma', option: 'carry a',          position: 'before', phrase: 'carry a stigma' },
  { anchor: 'stigma', option: 'fight the',        position: 'before', phrase: 'fight the stigma' },
  { anchor: 'stigma', option: 'mental health',    position: 'before', phrase: 'mental health stigma' },
  { anchor: 'stigma', option: 'remove the',       position: 'before', phrase: 'remove the stigma' },
  { anchor: 'stigma', option: 'attached to',      position: 'after',  phrase: 'stigma attached to' },

  // ── WILLPOWER ─────────────────────────────────────────────────────────────────
  { anchor: 'willpower', option: 'strong',        position: 'before', phrase: 'strong willpower' },
  { anchor: 'willpower', option: 'sheer',         position: 'before', phrase: 'sheer willpower' },
  { anchor: 'willpower', option: 'iron',          position: 'before', phrase: 'iron willpower' },
  { anchor: 'willpower', option: 'lack of',       position: 'before', phrase: 'lack of willpower' },
  { anchor: 'willpower', option: 'test your',     position: 'before', phrase: 'test your willpower' },
  { anchor: 'willpower', option: 'summon the',    position: 'before', phrase: 'summon the willpower' },

  // ── VIGILANCE ─────────────────────────────────────────────────────────────────
  { anchor: 'vigilance', option: 'constant',      position: 'before', phrase: 'constant vigilance' },
  { anchor: 'vigilance', option: 'heightened',    position: 'before', phrase: 'heightened vigilance' },
  { anchor: 'vigilance', option: 'eternal',       position: 'before', phrase: 'eternal vigilance' },
  { anchor: 'vigilance', option: 'urge',          position: 'before', phrase: 'urge vigilance' },
  { anchor: 'vigilance', option: 'maintain',      position: 'before', phrase: 'maintain vigilance' },

  // ── COMPASSION ────────────────────────────────────────────────────────────────
  { anchor: 'compassion', option: 'show',         position: 'before', phrase: 'show compassion' },
  { anchor: 'compassion', option: 'express',      position: 'before', phrase: 'express compassion' },
  { anchor: 'compassion', option: 'genuine',      position: 'before', phrase: 'genuine compassion' },
  { anchor: 'compassion', option: 'deep',         position: 'before', phrase: 'deep compassion' },
  { anchor: 'compassion', option: 'lack of',      position: 'before', phrase: 'lack of compassion' },
  { anchor: 'compassion', option: 'with',         position: 'before', phrase: 'with compassion' },

  // ── SOLACE ────────────────────────────────────────────────────────────────────
  { anchor: 'solace', option: 'find',             position: 'before', phrase: 'find solace' },
  { anchor: 'solace', option: 'take',             position: 'before', phrase: 'take solace' },
  { anchor: 'solace', option: 'offer',            position: 'before', phrase: 'offer solace' },
  { anchor: 'solace', option: 'seek',             position: 'before', phrase: 'seek solace' },
  { anchor: 'solace', option: 'little',           position: 'before', phrase: 'little solace' },
  { anchor: 'solace', option: 'small',            position: 'before', phrase: 'small solace' },

  // ── CALAMITY ──────────────────────────────────────────────────────────────────
  { anchor: 'calamity', option: 'natural',        position: 'before', phrase: 'natural calamity' },
  { anchor: 'calamity', option: 'economic',       position: 'before', phrase: 'economic calamity' },
  { anchor: 'calamity', option: 'environmental',  position: 'before', phrase: 'environmental calamity' },
  { anchor: 'calamity', option: 'avoid',          position: 'before', phrase: 'avoid calamity' },
  { anchor: 'calamity', option: 'prevent',        position: 'before', phrase: 'prevent calamity' },

  // ── ORDEAL ────────────────────────────────────────────────────────────────────
  { anchor: 'ordeal', option: 'terrible',         position: 'before', phrase: 'terrible ordeal' },
  { anchor: 'ordeal', option: 'harrowing',        position: 'before', phrase: 'harrowing ordeal' },
  { anchor: 'ordeal', option: 'traumatic',        position: 'before', phrase: 'traumatic ordeal' },
  { anchor: 'ordeal', option: 'survive the',      position: 'before', phrase: 'survive the ordeal' },
  { anchor: 'ordeal', option: 'gruelling',        position: 'before', phrase: 'gruelling ordeal' },
  { anchor: 'ordeal', option: 'endure an',        position: 'before', phrase: 'endure an ordeal' },

  // ── TOIL ──────────────────────────────────────────────────────────────────────
  { anchor: 'toil', option: 'endless',            position: 'before', phrase: 'endless toil' },
  { anchor: 'toil', option: 'relentless',         position: 'before', phrase: 'relentless toil' },
  { anchor: 'toil', option: 'daily',              position: 'before', phrase: 'daily toil' },
  { anchor: 'toil', option: 'years of',           position: 'before', phrase: 'years of toil' },
  { anchor: 'toil', option: 'back-breaking',      position: 'before', phrase: 'back-breaking toil' },
  { anchor: 'toil', option: 'and trouble',        position: 'after',  phrase: 'toil and trouble' },

  // ── MISERY ────────────────────────────────────────────────────────────────────
  { anchor: 'misery', option: 'cause',            position: 'before', phrase: 'cause misery' },
  { anchor: 'misery', option: 'spread',           position: 'before', phrase: 'spread misery' },
  { anchor: 'misery', option: 'abject',           position: 'before', phrase: 'abject misery' },
  { anchor: 'misery', option: 'extreme',          position: 'before', phrase: 'extreme misery' },
  { anchor: 'misery', option: 'economic',         position: 'before', phrase: 'economic misery' },
  { anchor: 'misery', option: 'end your',         position: 'before', phrase: 'end your misery' },

  // ── FALLACY ───────────────────────────────────────────────────────────────────
  { anchor: 'fallacy', option: 'common',          position: 'before', phrase: 'common fallacy' },
  { anchor: 'fallacy', option: 'logical',         position: 'before', phrase: 'logical fallacy' },
  { anchor: 'fallacy', option: 'popular',         position: 'before', phrase: 'popular fallacy' },
  { anchor: 'fallacy', option: 'expose a',        position: 'before', phrase: 'expose a fallacy' },
  { anchor: 'fallacy', option: 'basic',           position: 'before', phrase: 'basic fallacy' },

  // ── MALICE ────────────────────────────────────────────────────────────────────
  { anchor: 'malice', option: 'with',             position: 'before', phrase: 'with malice' },
  { anchor: 'malice', option: 'harbour',          position: 'before', phrase: 'harbour malice' },
  { anchor: 'malice', option: 'without',          position: 'before', phrase: 'without malice' },
  { anchor: 'malice', option: 'sheer',            position: 'before', phrase: 'sheer malice' },
  { anchor: 'malice', option: 'bear',             position: 'before', phrase: 'bear malice' },
  { anchor: 'malice', option: 'pure',             position: 'before', phrase: 'pure malice' },

  // ── HAVOC ─────────────────────────────────────────────────────────────────────
  { anchor: 'havoc', option: 'wreak',             position: 'before', phrase: 'wreak havoc' },
  { anchor: 'havoc', option: 'cause',             position: 'before', phrase: 'cause havoc' },
  { anchor: 'havoc', option: 'create',            position: 'before', phrase: 'create havoc' },
  { anchor: 'havoc', option: 'play',              position: 'before', phrase: 'play havoc' },
  { anchor: 'havoc', option: 'absolute',          position: 'before', phrase: 'absolute havoc' },
  { anchor: 'havoc', option: 'economic',          position: 'before', phrase: 'economic havoc' },

  // ── GRUDGE ────────────────────────────────────────────────────────────────────
  { anchor: 'grudge', option: 'hold a',           position: 'before', phrase: 'hold a grudge' },
  { anchor: 'grudge', option: 'bear a',           position: 'before', phrase: 'bear a grudge' },
  { anchor: 'grudge', option: 'nurse a',          position: 'before', phrase: 'nurse a grudge' },
  { anchor: 'grudge', option: 'old',              position: 'before', phrase: 'old grudge' },
  { anchor: 'grudge', option: 'personal',         position: 'before', phrase: 'personal grudge' },
  { anchor: 'grudge', option: 'settle a',         position: 'before', phrase: 'settle a grudge' },

  // ── OSTRACISM ─────────────────────────────────────────────────────────────────
  { anchor: 'ostracism', option: 'face',          position: 'before', phrase: 'face ostracism' },
  { anchor: 'ostracism', option: 'social',        position: 'before', phrase: 'social ostracism' },
  { anchor: 'ostracism', option: 'suffer',        position: 'before', phrase: 'suffer ostracism' },
  { anchor: 'ostracism', option: 'fear',          position: 'before', phrase: 'fear ostracism' },
  { anchor: 'ostracism', option: 'risk',          position: 'before', phrase: 'risk ostracism' },

  // ── LENIENCY ──────────────────────────────────────────────────────────────────
  { anchor: 'leniency', option: 'show',           position: 'before', phrase: 'show leniency' },
  { anchor: 'leniency', option: 'ask for',        position: 'before', phrase: 'ask for leniency' },
  { anchor: 'leniency', option: 'plead for',      position: 'before', phrase: 'plead for leniency' },
  { anchor: 'leniency', option: 'judicial',       position: 'before', phrase: 'judicial leniency' },
  { anchor: 'leniency', option: 'request',        position: 'before', phrase: 'request leniency' },

  // ── IMPASSE ───────────────────────────────────────────────────────────────────
  { anchor: 'impasse', option: 'reach an',        position: 'before', phrase: 'reach an impasse' },
  { anchor: 'impasse', option: 'break the',       position: 'before', phrase: 'break the impasse' },
  { anchor: 'impasse', option: 'political',       position: 'before', phrase: 'political impasse' },
  { anchor: 'impasse', option: 'diplomatic',      position: 'before', phrase: 'diplomatic impasse' },
  { anchor: 'impasse', option: 'hit an',          position: 'before', phrase: 'hit an impasse' },
  { anchor: 'impasse', option: 'resolve an',      position: 'before', phrase: 'resolve an impasse' },

  // ── REVOLT ────────────────────────────────────────────────────────────────────
  { anchor: 'revolt', option: 'popular',          position: 'before', phrase: 'popular revolt' },
  { anchor: 'revolt', option: 'stage a',          position: 'before', phrase: 'stage a revolt' },
  { anchor: 'revolt', option: 'armed',            position: 'before', phrase: 'armed revolt' },
  { anchor: 'revolt', option: 'spark a',          position: 'before', phrase: 'spark a revolt' },
  { anchor: 'revolt', option: 'lead a',           position: 'before', phrase: 'lead a revolt' },

  // ── REDEMPTION ────────────────────────────────────────────────────────────────
  { anchor: 'redemption', option: 'seek',         position: 'before', phrase: 'seek redemption' },
  { anchor: 'redemption', option: 'find',         position: 'before', phrase: 'find redemption' },
  { anchor: 'redemption', option: 'personal',     position: 'before', phrase: 'personal redemption' },
  { anchor: 'redemption', option: 'path to',      position: 'before', phrase: 'path to redemption' },
  { anchor: 'redemption', option: 'beyond',       position: 'before', phrase: 'beyond redemption' },
  { anchor: 'redemption', option: 'arc of',       position: 'before', phrase: 'arc of redemption' },

  // ── RELAPSE ───────────────────────────────────────────────────────────────────
  { anchor: 'relapse', option: 'suffer a',        position: 'before', phrase: 'suffer a relapse' },
  { anchor: 'relapse', option: 'prevent a',       position: 'before', phrase: 'prevent a relapse' },
  { anchor: 'relapse', option: 'risk of',         position: 'before', phrase: 'risk of relapse' },
  { anchor: 'relapse', option: 'avoid a',         position: 'before', phrase: 'avoid a relapse' },
  { anchor: 'relapse', option: 'serious',         position: 'before', phrase: 'serious relapse' },

  // ── REMEDY ────────────────────────────────────────────────────────────────────
  { anchor: 'remedy', option: 'find a',           position: 'before', phrase: 'find a remedy' },
  { anchor: 'remedy', option: 'quick',            position: 'before', phrase: 'quick remedy' },
  { anchor: 'remedy', option: 'effective',        position: 'before', phrase: 'effective remedy' },
  { anchor: 'remedy', option: 'legal',            position: 'before', phrase: 'legal remedy' },
  { anchor: 'remedy', option: 'seek a',           position: 'before', phrase: 'seek a remedy' },
  { anchor: 'remedy', option: 'propose a',        position: 'before', phrase: 'propose a remedy' },

  // ── REPERCUSSION ──────────────────────────────────────────────────────────────
  { anchor: 'repercussion', option: 'serious',    position: 'before', phrase: 'serious repercussion' },
  { anchor: 'repercussion', option: 'face',       position: 'before', phrase: 'face repercussion' },
  { anchor: 'repercussion', option: 'long-term',  position: 'before', phrase: 'long-term repercussion' },
  { anchor: 'repercussion', option: 'political',  position: 'before', phrase: 'political repercussion' },
  { anchor: 'repercussion', option: 'suffer',     position: 'before', phrase: 'suffer repercussion' },

  // ── BLUEPRINT ─────────────────────────────────────────────────────────────────
  { anchor: 'blueprint', option: 'provide a',     position: 'before', phrase: 'provide a blueprint' },
  { anchor: 'blueprint', option: 'follow a',      position: 'before', phrase: 'follow a blueprint' },
  { anchor: 'blueprint', option: 'create a',      position: 'before', phrase: 'create a blueprint' },
  { anchor: 'blueprint', option: 'detailed',      position: 'before', phrase: 'detailed blueprint' },
  { anchor: 'blueprint', option: 'for success',   position: 'after',  phrase: 'blueprint for success' },
  { anchor: 'blueprint', option: 'master',        position: 'before', phrase: 'master blueprint' },

  // ── THRESHOLD ─────────────────────────────────────────────────────────────────
  { anchor: 'threshold', option: 'cross a',       position: 'before', phrase: 'cross a threshold' },
  { anchor: 'threshold', option: 'low',           position: 'before', phrase: 'low threshold' },
  { anchor: 'threshold', option: 'pain',          position: 'before', phrase: 'pain threshold' },
  { anchor: 'threshold', option: 'raise the',     position: 'before', phrase: 'raise the threshold' },
  { anchor: 'threshold', option: 'critical',      position: 'before', phrase: 'critical threshold' },
  { anchor: 'threshold', option: 'high',          position: 'before', phrase: 'high threshold' },

  // ── BACKLOG ───────────────────────────────────────────────────────────────────
  { anchor: 'backlog', option: 'clear a',         position: 'before', phrase: 'clear a backlog' },
  { anchor: 'backlog', option: 'huge',            position: 'before', phrase: 'huge backlog' },
  { anchor: 'backlog', option: 'tackle the',      position: 'before', phrase: 'tackle the backlog' },
  { anchor: 'backlog', option: 'reduce the',      position: 'before', phrase: 'reduce the backlog' },
  { anchor: 'backlog', option: 'growing',         position: 'before', phrase: 'growing backlog' },
  { anchor: 'backlog', option: 'of work',         position: 'after',  phrase: 'backlog of work' },

  // ── REDUNDANCY ────────────────────────────────────────────────────────────────
  { anchor: 'redundancy', option: 'face',         position: 'before', phrase: 'face redundancy' },
  { anchor: 'redundancy', option: 'risk of',      position: 'before', phrase: 'risk of redundancy' },
  { anchor: 'redundancy', option: 'voluntary',    position: 'before', phrase: 'voluntary redundancy' },
  { anchor: 'redundancy', option: 'compulsory',   position: 'before', phrase: 'compulsory redundancy' },
  { anchor: 'redundancy', option: 'avoid',        position: 'before', phrase: 'avoid redundancy' },

  // ── GRAVITAS ──────────────────────────────────────────────────────────────────
  { anchor: 'gravitas', option: 'exude',          position: 'before', phrase: 'exude gravitas' },
  { anchor: 'gravitas', option: 'carry',          position: 'before', phrase: 'carry gravitas' },
  { anchor: 'gravitas', option: 'project',        position: 'before', phrase: 'project gravitas' },
  { anchor: 'gravitas', option: 'lend',           position: 'before', phrase: 'lend gravitas' },
  { anchor: 'gravitas', option: 'command',        position: 'before', phrase: 'command gravitas' },
  { anchor: 'gravitas', option: 'natural',        position: 'before', phrase: 'natural gravitas' },

  // ── POISE ─────────────────────────────────────────────────────────────────────
  { anchor: 'poise', option: 'maintain',          position: 'before', phrase: 'maintain poise' },
  { anchor: 'poise', option: 'with',              position: 'before', phrase: 'with poise' },
  { anchor: 'poise', option: 'exceptional',       position: 'before', phrase: 'exceptional poise' },
  { anchor: 'poise', option: 'remarkable',        position: 'before', phrase: 'remarkable poise' },
  { anchor: 'poise', option: 'grace and',         position: 'before', phrase: 'grace and poise' },
  { anchor: 'poise', option: 'lose your',         position: 'before', phrase: 'lose your poise' },

  // ── GULLIBILITY ───────────────────────────────────────────────────────────────
  { anchor: 'gullibility', option: 'extreme',     position: 'before', phrase: 'extreme gullibility' },
  { anchor: 'gullibility', option: 'exploit',     position: 'before', phrase: 'exploit gullibility' },
  { anchor: 'gullibility', option: 'sheer',       position: 'before', phrase: 'sheer gullibility' },
  { anchor: 'gullibility', option: 'remarkable',  position: 'before', phrase: 'remarkable gullibility' },
  { anchor: 'gullibility', option: 'public',      position: 'before', phrase: 'public gullibility' },

  // ── HOAX ──────────────────────────────────────────────────────────────────────
  { anchor: 'hoax', option: 'elaborate',          position: 'before', phrase: 'elaborate hoax' },
  { anchor: 'hoax', option: 'stage a',            position: 'before', phrase: 'stage a hoax' },
  { anchor: 'hoax', option: 'expose a',           position: 'before', phrase: 'expose a hoax' },
  { anchor: 'hoax', option: 'cruel',              position: 'before', phrase: 'cruel hoax' },
  { anchor: 'hoax', option: 'internet',           position: 'before', phrase: 'internet hoax' },
  { anchor: 'hoax', option: 'perpetrate a',       position: 'before', phrase: 'perpetrate a hoax' },

  // ── NEMESIS ───────────────────────────────────────────────────────────────────
  { anchor: 'nemesis', option: 'arch',            position: 'before', phrase: 'arch nemesis' },
  { anchor: 'nemesis', option: 'meet your',       position: 'before', phrase: 'meet your nemesis' },
  { anchor: 'nemesis', option: 'face your',       position: 'before', phrase: 'face your nemesis' },
  { anchor: 'nemesis', option: 'personal',        position: 'before', phrase: 'personal nemesis' },
  { anchor: 'nemesis', option: 'ultimate',        position: 'before', phrase: 'ultimate nemesis' },

  // ── MENACE ────────────────────────────────────────────────────────────────────
  { anchor: 'menace', option: 'public',           position: 'before', phrase: 'public menace' },
  { anchor: 'menace', option: 'growing',          position: 'before', phrase: 'growing menace' },
  { anchor: 'menace', option: 'looming',          position: 'before', phrase: 'looming menace' },
  { anchor: 'menace', option: 'serious',          position: 'before', phrase: 'serious menace' },
  { anchor: 'menace', option: 'to society',       position: 'after',  phrase: 'menace to society' },

  // ── IMPUNITY ──────────────────────────────────────────────────────────────────
  { anchor: 'impunity', option: 'with',           position: 'before', phrase: 'with impunity' },
  { anchor: 'impunity', option: 'act with',       position: 'before', phrase: 'act with impunity' },
  { anchor: 'impunity', option: 'operate with',   position: 'before', phrase: 'operate with impunity' },
  { anchor: 'impunity', option: 'enjoy',          position: 'before', phrase: 'enjoy impunity' },
  { anchor: 'impunity', option: 'absolute',       position: 'before', phrase: 'absolute impunity' },
  { anchor: 'impunity', option: 'total',          position: 'before', phrase: 'total impunity' },

  // ── TESTAMENT ─────────────────────────────────────────────────────────────────
  { anchor: 'testament', option: 'living',        position: 'before', phrase: 'living testament' },
  { anchor: 'testament', option: 'clear',         position: 'before', phrase: 'clear testament' },
  { anchor: 'testament', option: 'fitting',       position: 'before', phrase: 'fitting testament' },
  { anchor: 'testament', option: 'remarkable',    position: 'before', phrase: 'remarkable testament' },
  { anchor: 'testament', option: 'to success',    position: 'after',  phrase: 'testament to success' },
  { anchor: 'testament', option: 'standing',      position: 'before', phrase: 'standing testament' },

  // ── RUPTURE ───────────────────────────────────────────────────────────────────
  { anchor: 'rupture', option: 'cause a',         position: 'before', phrase: 'cause a rupture' },
  { anchor: 'rupture', option: 'political',       position: 'before', phrase: 'political rupture' },
  { anchor: 'rupture', option: 'sudden',          position: 'before', phrase: 'sudden rupture' },
  { anchor: 'rupture', option: 'repair a',        position: 'before', phrase: 'repair a rupture' },
  { anchor: 'rupture', option: 'diplomatic',      position: 'before', phrase: 'diplomatic rupture' },

  // ── VOID ──────────────────────────────────────────────────────────────────────
  { anchor: 'void', option: 'leave a',            position: 'before', phrase: 'leave a void' },
  { anchor: 'void', option: 'fill a',             position: 'before', phrase: 'fill a void' },
  { anchor: 'void', option: 'create a',           position: 'before', phrase: 'create a void' },
  { anchor: 'void', option: 'emotional',          position: 'before', phrase: 'emotional void' },
  { anchor: 'void', option: 'vast',               position: 'before', phrase: 'vast void' },
  { anchor: 'void', option: 'of meaning',         position: 'after',  phrase: 'void of meaning' },

  // ── PROLIFERATION ─────────────────────────────────────────────────────────────
  { anchor: 'proliferation', option: 'nuclear',   position: 'before', phrase: 'nuclear proliferation' },
  { anchor: 'proliferation', option: 'rapid',     position: 'before', phrase: 'rapid proliferation' },
  { anchor: 'proliferation', option: 'prevent',   position: 'before', phrase: 'prevent proliferation' },
  { anchor: 'proliferation', option: 'unchecked', position: 'before', phrase: 'unchecked proliferation' },
  { anchor: 'proliferation', option: 'halt',      position: 'before', phrase: 'halt proliferation' },

  // ── CONFESSION ────────────────────────────────────────────────────────────────
  { anchor: 'confession', option: 'make a',       position: 'before', phrase: 'make a confession' },
  { anchor: 'confession', option: 'public',       position: 'before', phrase: 'public confession' },
  { anchor: 'confession', option: 'forced',       position: 'before', phrase: 'forced confession' },
  { anchor: 'confession', option: 'full',         position: 'before', phrase: 'full confession' },
  { anchor: 'confession', option: 'extract a',    position: 'before', phrase: 'extract a confession' },
  { anchor: 'confession', option: 'written',      position: 'before', phrase: 'written confession' },

  // ── TESTIMONY ─────────────────────────────────────────────────────────────────
  { anchor: 'testimony', option: 'give',          position: 'before', phrase: 'give testimony' },
  { anchor: 'testimony', option: 'compelling',    position: 'before', phrase: 'compelling testimony' },
  { anchor: 'testimony', option: 'expert',        position: 'before', phrase: 'expert testimony' },
  { anchor: 'testimony', option: 'false',         position: 'before', phrase: 'false testimony' },
  { anchor: 'testimony', option: 'eyewitness',    position: 'before', phrase: 'eyewitness testimony' },
  { anchor: 'testimony', option: 'provide',       position: 'before', phrase: 'provide testimony' },

  // ── FRAMEWORK ─────────────────────────────────────────────────────────────────
  { anchor: 'framework', option: 'legal',         position: 'before', phrase: 'legal framework' },
  { anchor: 'framework', option: 'provide a',     position: 'before', phrase: 'provide a framework' },
  { anchor: 'framework', option: 'regulatory',    position: 'before', phrase: 'regulatory framework' },
  { anchor: 'framework', option: 'establish a',   position: 'before', phrase: 'establish a framework' },
  { anchor: 'framework', option: 'conceptual',    position: 'before', phrase: 'conceptual framework' },
  { anchor: 'framework', option: 'within a',      position: 'before', phrase: 'within a framework' },

  // ── AVERSION ──────────────────────────────────────────────────────────────────
  { anchor: 'aversion', option: 'strong',         position: 'before', phrase: 'strong aversion' },
  { anchor: 'aversion', option: 'risk',           position: 'before', phrase: 'risk aversion' },
  { anchor: 'aversion', option: 'deep',           position: 'before', phrase: 'deep aversion' },
  { anchor: 'aversion', option: 'natural',        position: 'before', phrase: 'natural aversion' },
  { anchor: 'aversion', option: 'develop an',     position: 'before', phrase: 'develop an aversion' },
  { anchor: 'aversion', option: 'overcome an',    position: 'before', phrase: 'overcome an aversion' },

  // ── COMPULSION ────────────────────────────────────────────────────────────────
  { anchor: 'compulsion', option: 'overwhelming', position: 'before', phrase: 'overwhelming compulsion' },
  { anchor: 'compulsion', option: 'feel a',       position: 'before', phrase: 'feel a compulsion' },
  { anchor: 'compulsion', option: 'resist a',     position: 'before', phrase: 'resist a compulsion' },
  { anchor: 'compulsion', option: 'obsessive',    position: 'before', phrase: 'obsessive compulsion' },
  { anchor: 'compulsion', option: 'inner',        position: 'before', phrase: 'inner compulsion' },
  { anchor: 'compulsion', option: 'under',        position: 'before', phrase: 'under compulsion' },

  // ── CRAVING ───────────────────────────────────────────────────────────────────
  { anchor: 'craving', option: 'intense',         position: 'before', phrase: 'intense craving' },
  { anchor: 'craving', option: 'satisfy a',       position: 'before', phrase: 'satisfy a craving' },
  { anchor: 'craving', option: 'sudden',          position: 'before', phrase: 'sudden craving' },
  { anchor: 'craving', option: 'overcome a',      position: 'before', phrase: 'overcome a craving' },
  { anchor: 'craving', option: 'irresistible',    position: 'before', phrase: 'irresistible craving' },
  { anchor: 'craving', option: 'for chocolate',   position: 'after',  phrase: 'craving for chocolate' },

  // ── UNREMITTING ───────────────────────────────────────────────────────────────
  { anchor: 'unremitting', option: 'pressure',      position: 'after', phrase: 'unremitting pressure' },
  { anchor: 'unremitting', option: 'hostility',     position: 'after', phrase: 'unremitting hostility' },
  { anchor: 'unremitting', option: 'effort',        position: 'after', phrase: 'unremitting effort' },
  { anchor: 'unremitting', option: 'hardship',      position: 'after', phrase: 'unremitting hardship' },
  { anchor: 'unremitting', option: 'toil',          position: 'after', phrase: 'unremitting toil' },

  // ── UNWAVERING ────────────────────────────────────────────────────────────────
  { anchor: 'unwavering', option: 'commitment',     position: 'after', phrase: 'unwavering commitment' },
  { anchor: 'unwavering', option: 'support',        position: 'after', phrase: 'unwavering support' },
  { anchor: 'unwavering', option: 'loyalty',        position: 'after', phrase: 'unwavering loyalty' },
  { anchor: 'unwavering', option: 'focus',          position: 'after', phrase: 'unwavering focus' },
  { anchor: 'unwavering', option: 'determination',  position: 'after', phrase: 'unwavering determination' },

  // ── TENUOUS ───────────────────────────────────────────────────────────────────
  { anchor: 'tenuous', option: 'link',              position: 'after', phrase: 'tenuous link' },
  { anchor: 'tenuous', option: 'grasp',             position: 'after', phrase: 'tenuous grasp' },
  { anchor: 'tenuous', option: 'connection',        position: 'after', phrase: 'tenuous connection' },
  { anchor: 'tenuous', option: 'argument',          position: 'after', phrase: 'tenuous argument' },
  { anchor: 'tenuous', option: 'relationship',      position: 'after', phrase: 'tenuous relationship' },

  // ── ROBUST ────────────────────────────────────────────────────────────────────
  { anchor: 'robust', option: 'economy',            position: 'after', phrase: 'robust economy' },
  { anchor: 'robust', option: 'debate',             position: 'after', phrase: 'robust debate' },
  { anchor: 'robust', option: 'system',             position: 'after', phrase: 'robust system' },
  { anchor: 'robust', option: 'defence',            position: 'after', phrase: 'robust defence' },
  { anchor: 'robust', option: 'growth',             position: 'after', phrase: 'robust growth' },
  { anchor: 'robust', option: 'evidence',           position: 'after', phrase: 'robust evidence' },

  // ── RIGOROUS ──────────────────────────────────────────────────────────────────
  { anchor: 'rigorous', option: 'testing',          position: 'after', phrase: 'rigorous testing' },
  { anchor: 'rigorous', option: 'analysis',         position: 'after', phrase: 'rigorous analysis' },
  { anchor: 'rigorous', option: 'standards',        position: 'after', phrase: 'rigorous standards' },
  { anchor: 'rigorous', option: 'training',         position: 'after', phrase: 'rigorous training' },
  { anchor: 'rigorous', option: 'approach',         position: 'after', phrase: 'rigorous approach' },

  // ── TENACIOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'tenacious', option: 'fighter',         position: 'after', phrase: 'tenacious fighter' },
  { anchor: 'tenacious', option: 'defender',        position: 'after', phrase: 'tenacious defender' },
  { anchor: 'tenacious', option: 'grip',            position: 'after', phrase: 'tenacious grip' },
  { anchor: 'tenacious', option: 'pursuit',         position: 'after', phrase: 'tenacious pursuit' },
  { anchor: 'tenacious', option: 'attitude',        position: 'after', phrase: 'tenacious attitude' },

  // ── ZEALOUS ───────────────────────────────────────────────────────────────────
  { anchor: 'zealous', option: 'advocate',          position: 'after', phrase: 'zealous advocate' },
  { anchor: 'zealous', option: 'supporter',         position: 'after', phrase: 'zealous supporter' },
  { anchor: 'zealous', option: 'reformer',          position: 'after', phrase: 'zealous reformer' },
  { anchor: 'zealous', option: 'defence',           position: 'after', phrase: 'zealous defence' },
  { anchor: 'zealous', option: 'effort',            position: 'after', phrase: 'zealous effort' },

  // ── DUBIOUS ───────────────────────────────────────────────────────────────────
  { anchor: 'dubious', option: 'claim',             position: 'after', phrase: 'dubious claim' },
  { anchor: 'dubious', option: 'character',         position: 'after', phrase: 'dubious character' },
  { anchor: 'dubious', option: 'motive',            position: 'after', phrase: 'dubious motive' },
  { anchor: 'dubious', option: 'honour',            position: 'after', phrase: 'dubious honour' },
  { anchor: 'dubious', option: 'distinction',       position: 'after', phrase: 'dubious distinction' },
  { anchor: 'dubious', option: 'highly',            position: 'before', phrase: 'highly dubious' },

  // ── OMINOUS ───────────────────────────────────────────────────────────────────
  { anchor: 'ominous', option: 'sign',              position: 'after', phrase: 'ominous sign' },
  { anchor: 'ominous', option: 'warning',           position: 'after', phrase: 'ominous warning' },
  { anchor: 'ominous', option: 'silence',           position: 'after', phrase: 'ominous silence' },
  { anchor: 'ominous', option: 'cloud',             position: 'after', phrase: 'ominous cloud' },
  { anchor: 'ominous', option: 'tone',              position: 'after', phrase: 'ominous tone' },

  // ── PRECARIOUS ────────────────────────────────────────────────────────────────
  { anchor: 'precarious', option: 'situation',      position: 'after', phrase: 'precarious situation' },
  { anchor: 'precarious', option: 'position',       position: 'after', phrase: 'precarious position' },
  { anchor: 'precarious', option: 'balance',        position: 'after', phrase: 'precarious balance' },
  { anchor: 'precarious', option: 'state',          position: 'after', phrase: 'precarious state' },
  { anchor: 'precarious', option: 'existence',      position: 'after', phrase: 'precarious existence' },
  { anchor: 'precarious', option: 'footing',        position: 'after', phrase: 'precarious footing' },

  // ── SINISTER ──────────────────────────────────────────────────────────────────
  { anchor: 'sinister', option: 'motive',           position: 'after', phrase: 'sinister motive' },
  { anchor: 'sinister', option: 'plot',             position: 'after', phrase: 'sinister plot' },
  { anchor: 'sinister', option: 'figure',           position: 'after', phrase: 'sinister figure' },
  { anchor: 'sinister', option: 'smile',            position: 'after', phrase: 'sinister smile' },
  { anchor: 'sinister', option: 'something',        position: 'before', phrase: 'something sinister' },

  // ── BRAZEN ────────────────────────────────────────────────────────────────────
  { anchor: 'brazen', option: 'lie',                position: 'after', phrase: 'brazen lie' },
  { anchor: 'brazen', option: 'act',                position: 'after', phrase: 'brazen act' },
  { anchor: 'brazen', option: 'defiance',           position: 'after', phrase: 'brazen defiance' },
  { anchor: 'brazen', option: 'disregard',          position: 'after', phrase: 'brazen disregard' },
  { anchor: 'brazen', option: 'hypocrisy',          position: 'after', phrase: 'brazen hypocrisy' },

  // ── NOTORIOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'notorious', option: 'criminal',        position: 'after', phrase: 'notorious criminal' },
  { anchor: 'notorious', option: 'reputation',      position: 'after', phrase: 'notorious reputation' },
  { anchor: 'notorious', option: 'case',            position: 'after', phrase: 'notorious case' },
  { anchor: 'notorious', option: 'become',          position: 'before', phrase: 'become notorious' },
  { anchor: 'notorious', option: 'widely',          position: 'before', phrase: 'widely notorious' },

  // ── VICIOUS ───────────────────────────────────────────────────────────────────
  { anchor: 'vicious', option: 'cycle',             position: 'after', phrase: 'vicious cycle' },
  { anchor: 'vicious', option: 'attack',            position: 'after', phrase: 'vicious attack' },
  { anchor: 'vicious', option: 'circle',            position: 'after', phrase: 'vicious circle' },
  { anchor: 'vicious', option: 'rivalry',           position: 'after', phrase: 'vicious rivalry' },
  { anchor: 'vicious', option: 'criticism',         position: 'after', phrase: 'vicious criticism' },

  // ── MORBID ────────────────────────────────────────────────────────────────────
  { anchor: 'morbid', option: 'fascination',        position: 'after', phrase: 'morbid fascination' },
  { anchor: 'morbid', option: 'curiosity',          position: 'after', phrase: 'morbid curiosity' },
  { anchor: 'morbid', option: 'humour',             position: 'after', phrase: 'morbid humour' },
  { anchor: 'morbid', option: 'thought',            position: 'after', phrase: 'morbid thought' },
  { anchor: 'morbid', option: 'obsession',          position: 'after', phrase: 'morbid obsession' },

  // ── COERCIVE ──────────────────────────────────────────────────────────────────
  { anchor: 'coercive', option: 'tactics',          position: 'after', phrase: 'coercive tactics' },
  { anchor: 'coercive', option: 'behaviour',        position: 'after', phrase: 'coercive behaviour' },
  { anchor: 'coercive', option: 'control',          position: 'after', phrase: 'coercive control' },
  { anchor: 'coercive', option: 'power',            position: 'after', phrase: 'coercive power' },
  { anchor: 'coercive', option: 'measures',         position: 'after', phrase: 'coercive measures' },

  // ── CONSPICUOUS ───────────────────────────────────────────────────────────────
  { anchor: 'conspicuous', option: 'absence',       position: 'after', phrase: 'conspicuous absence' },
  { anchor: 'conspicuous', option: 'consumption',   position: 'after', phrase: 'conspicuous consumption' },
  { anchor: 'conspicuous', option: 'success',       position: 'after', phrase: 'conspicuous success' },
  { anchor: 'conspicuous', option: 'silence',       position: 'after', phrase: 'conspicuous silence' },
  { anchor: 'conspicuous', option: 'failure',       position: 'after', phrase: 'conspicuous failure' },

  // ── GULLIBLE ──────────────────────────────────────────────────────────────────
  { anchor: 'gullible', option: 'people',           position: 'after', phrase: 'gullible people' },
  { anchor: 'gullible', option: 'consumer',         position: 'after', phrase: 'gullible consumer' },
  { anchor: 'gullible', option: 'public',           position: 'after', phrase: 'gullible public' },
  { anchor: 'gullible', option: 'extremely',        position: 'before', phrase: 'extremely gullible' },
  { anchor: 'gullible', option: 'naive and',        position: 'before', phrase: 'naive and gullible' },

  // ── IMPETUOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'impetuous', option: 'decision',        position: 'after', phrase: 'impetuous decision' },
  { anchor: 'impetuous', option: 'action',          position: 'after', phrase: 'impetuous action' },
  { anchor: 'impetuous', option: 'behaviour',       position: 'after', phrase: 'impetuous behaviour' },
  { anchor: 'impetuous', option: 'young man',       position: 'after', phrase: 'impetuous young man' },
  { anchor: 'impetuous', option: 'dangerously',     position: 'before', phrase: 'dangerously impetuous' },

  // ── VIBRANT ───────────────────────────────────────────────────────────────────
  { anchor: 'vibrant', option: 'community',         position: 'after', phrase: 'vibrant community' },
  { anchor: 'vibrant', option: 'economy',           position: 'after', phrase: 'vibrant economy' },
  { anchor: 'vibrant', option: 'culture',           position: 'after', phrase: 'vibrant culture' },
  { anchor: 'vibrant', option: 'colour',            position: 'after', phrase: 'vibrant colour' },
  { anchor: 'vibrant', option: 'city',              position: 'after', phrase: 'vibrant city' },

  // ── SALIENT ───────────────────────────────────────────────────────────────────
  { anchor: 'salient', option: 'point',             position: 'after', phrase: 'salient point' },
  { anchor: 'salient', option: 'feature',           position: 'after', phrase: 'salient feature' },
  { anchor: 'salient', option: 'fact',              position: 'after', phrase: 'salient fact' },
  { anchor: 'salient', option: 'detail',            position: 'after', phrase: 'salient detail' },
  { anchor: 'salient', option: 'most',              position: 'before', phrase: 'most salient' },

  // ── SHREWD ────────────────────────────────────────────────────────────────────
  { anchor: 'shrewd', option: 'businessman',        position: 'after', phrase: 'shrewd businessman' },
  { anchor: 'shrewd', option: 'investment',         position: 'after', phrase: 'shrewd investment' },
  { anchor: 'shrewd', option: 'observer',           position: 'after', phrase: 'shrewd observer' },
  { anchor: 'shrewd', option: 'negotiator',         position: 'after', phrase: 'shrewd negotiator' },
  { anchor: 'shrewd', option: 'move',               position: 'after', phrase: 'shrewd move' },

  // ── JUDICIOUS ─────────────────────────────────────────────────────────────────
  { anchor: 'judicious', option: 'use',             position: 'after', phrase: 'judicious use' },
  { anchor: 'judicious', option: 'choice',          position: 'after', phrase: 'judicious choice' },
  { anchor: 'judicious', option: 'decision',        position: 'after', phrase: 'judicious decision' },
  { anchor: 'judicious', option: 'approach',        position: 'after', phrase: 'judicious approach' },
  { anchor: 'judicious', option: 'application',     position: 'after', phrase: 'judicious application' },

  // ── BUOYANT ───────────────────────────────────────────────────────────────────
  { anchor: 'buoyant', option: 'economy',           position: 'after', phrase: 'buoyant economy' },
  { anchor: 'buoyant', option: 'market',            position: 'after', phrase: 'buoyant market' },
  { anchor: 'buoyant', option: 'mood',              position: 'after', phrase: 'buoyant mood' },
  { anchor: 'buoyant', option: 'performance',       position: 'after', phrase: 'buoyant performance' },
  { anchor: 'buoyant', option: 'spirit',            position: 'after', phrase: 'buoyant spirit' },

  // ── BENIGN ────────────────────────────────────────────────────────────────────
  { anchor: 'benign', option: 'neglect',            position: 'after', phrase: 'benign neglect' },
  { anchor: 'benign', option: 'tumour',             position: 'after', phrase: 'benign tumour' },
  { anchor: 'benign', option: 'influence',          position: 'after', phrase: 'benign influence' },
  { anchor: 'benign', option: 'effect',             position: 'after', phrase: 'benign effect' },
  { anchor: 'benign', option: 'condition',          position: 'after', phrase: 'benign condition' },
  { anchor: 'benign', option: 'relatively',         position: 'before', phrase: 'relatively benign' },

]

// ── Phrase explanations ────────────────────────────────────────────────────────
// One-sentence meaning shown on the wrong-answer Explore panel.
// Key = full phrase string, lowercased (matches q.correctCollocation.toLowerCase()).

export const PHRASE_EXPLANATIONS: Record<string, string> = {

  // overcome
  'overcome challenges':        'To successfully deal with and get past difficult problems or situations.',
  'overcome obstacles':         'To find a way around or through things that block your path forward.',
  'overcome difficulties':      'To successfully manage and move past a period of trouble or hardship.',
  'overcome resistance':        'To push through opposition or refusal from others and achieve your aim.',
  'overcome fears':             'To conquer the things that make you anxious and stop letting them limit you.',
  'overcome the odds':          'To succeed despite the chances being strongly against you.',

  // suppress
  'suppress emotions':          'To hold back or hide feelings rather than showing them openly.',
  'suppress laughter':          'To stop yourself from laughing, especially in an inappropriate moment.',
  'suppress dissent':           'To use authority or force to prevent people from expressing disagreement.',
  'suppress evidence':          'To deliberately hide or destroy information that would serve as proof.',
  'suppress a smile':           'To prevent a smile from appearing on your face, usually with effort.',
  'suppress the urge':          'To fight back a strong impulse or desire to do something.',

  // succumb
  'succumb to temptation':      'To give in to the desire to do something you know you probably should not.',
  'succumb to pressure':        'To give in after being pushed hard by others to do something.',
  'succumb to illness':         'To become overwhelmed by a disease or injury, often with fatal consequences.',
  'succumb to despair':         'To be completely overcome by hopelessness and give up resisting.',
  'succumb to peer pressure':   'To do something because the people around you expect or pressure you to.',

  // curb
  'curb spending':              'To reduce or limit the amount of money being spent.',
  'curb inflation':             'To bring rising prices under control and slow them down.',
  'curb enthusiasm':            'To hold back excitement or eagerness, often to be more realistic.',
  'curb your appetite':         'To reduce your desire to eat, or more broadly to limit a strong craving.',
  'curb emissions':             'To reduce the amount of harmful gases released into the atmosphere.',
  'curb violence':              'To reduce or control violent behaviour or incidents.',

  // indulge
  'indulge yourself':           'To allow yourself to enjoy something pleasurable without restraint.',
  'indulge in luxury':          'To treat yourself to expensive or pleasurable things beyond necessity.',
  'indulge a whim':             'To act on a sudden desire without much thought or reason.',
  'indulge your curiosity':     'To allow yourself to explore and investigate things that interest you.',
  'indulge your passion':       'To give yourself fully to something you love doing.',
  'indulge in nostalgia':       'To allow yourself to enjoy pleasurable memories of the past.',

  // tame
  'tame inflation':             'To bring rising prices under control and reduce their impact.',
  'tame your impulses':         'To bring sudden, uncontrolled urges under deliberate control.',
  'tame a wild animal':         'To make a wild creature gentle and comfortable around humans.',
  'tame the chaos':             'To bring order and structure to a very disorganised situation.',
  'tame your ambitions':        'To moderate your goals to a more realistic and achievable level.',

  // temper
  'temper expectations':        'To make people\'s hopes or anticipations more realistic and moderate.',
  'temper your ambitions':      'To tone down your goals so they are more grounded and achievable.',
  'temper enthusiasm':          'To reduce excitement with a degree of caution or realism.',
  'temper criticism':           'To make critical comments less harsh or more balanced.',
  'temper optimism':            'To balance positive thinking with a realistic awareness of challenges.',

  // stifle
  'stifle creativity':          'To prevent new ideas and imaginative thinking from developing.',
  'stifle growth':              'To prevent something from developing or expanding as it naturally would.',
  'stifle a yawn':              'To stop yourself from yawning openly, usually out of politeness.',
  'stifle debate':              'To prevent open discussion or exchange of different views.',
  'stifle progress':            'To slow down or block forward development or advancement.',
  'stifle a laugh':             'To hold back a laugh, especially in a formal or serious setting.',

  // maintain
  'maintain composure':         'To stay calm and in control of your emotions, especially under pressure.',
  'maintain momentum':          'To keep the energy, pace, or forward movement of something going.',
  'maintain standards':         'To keep quality or conduct at a required level without letting it slip.',
  'maintain focus':             'To keep your attention firmly on what matters without being distracted.',
  'maintain a balance':         'To keep different things in the right proportion or in a stable state.',
  'maintain control':           'To stay in charge of a situation and prevent it from becoming unmanageable.',
  'maintain the status quo':    'To keep things as they are and resist making changes.',

  // bolster
  'bolster confidence':         'To increase or strengthen someone\'s belief in themselves or in a plan.',
  'bolster support':            'To increase the amount of backing or approval something receives.',
  'bolster morale':             'To raise the spirits and confidence of a group of people.',
  'bolster defences':           'To strengthen protective measures against attack or harm.',
  'bolster a claim':            'To add evidence or arguments that make a statement more convincing.',
  'bolster the economy':        'To strengthen economic performance and stimulate financial activity.',

  // amplify
  'amplify the effect':         'To make the result or impact of something stronger or more noticeable.',
  'amplify tensions':           'To make existing disagreements or conflicts more intense.',
  'amplify your voice':         'To increase the reach and impact of what you are saying.',
  'amplify concerns':           'To make worries more widely known and give them more weight.',
  'amplify a message':          'To spread a piece of communication further and make it more powerful.',

  // exacerbate
  'exacerbate the problem':     'To make an existing problem worse than it already is.',
  'exacerbate tensions':        'To increase disagreement or hostility between people or groups.',
  'exacerbate symptoms':        'To make the signs or effects of an illness more severe.',
  'exacerbate inequality':      'To make an unfair difference in wealth or opportunity even greater.',
  'exacerbate the situation':   'To make an already difficult set of circumstances even harder to handle.',

  // compound
  'compound the problem':       'To make an existing problem significantly worse, often adding new difficulties.',
  'compound the issue':         'To add further complications to something that is already difficult.',
  'compound matters':           'To make a difficult situation worse by adding more problems on top.',
  'compound the difficulty':    'To increase how hard something is to deal with by piling on more challenges.',
  'compound the effect':        'To multiply or intensify the impact of something, often negatively.',

  // aggravate
  'aggravate the situation':    'To make a difficult or tense situation even worse.',
  'aggravate symptoms':         'To make the signs of an illness or injury noticeably more severe.',
  'aggravate the condition':    'To cause a medical or other condition to become more serious.',
  'aggravate tensions':         'To increase hostility or conflict between parties.',
  'aggravate an injury':        'To make a physical injury more serious by continuing to stress it.',

  // perpetuate
  'perpetuate a myth':          'To keep a false belief or story alive by continuing to spread it.',
  'perpetuate a cycle':         'To keep a repeating pattern going, often a harmful or unhelpful one.',
  'perpetuate inequality':      'To keep unfair differences in wealth, opportunity, or treatment going.',
  'perpetuate stereotypes':     'To keep oversimplified and often unfair ideas about groups of people alive.',
  'perpetuate a system':        'To keep an existing arrangement or structure going rather than changing it.',

  // acknowledge
  'acknowledge a mistake':      'To admit openly that you have done something wrong or made an error.',
  'acknowledge responsibility': 'To accept that you are accountable for something that happened.',
  'acknowledge defeat':         'To accept and admit that you have lost a contest or struggle.',
  'acknowledge contributions':  'To recognise and express gratitude for what someone has done.',
  'acknowledge the fact':       'To accept and admit that something is true, even if uncomfortable.',
  'widely acknowledged':        'Accepted or recognised as true or correct by most people.',

  // instill
  'instill confidence':         'To gradually build up a feeling of certainty and self-belief in someone.',
  'instill values':             'To teach important principles so they become part of someone\'s character.',
  'instill discipline':         'To build habits of self-control and orderly behaviour in someone over time.',
  'instill fear':               'To cause someone to feel deep, lasting fear, often as a form of control.',
  'instill respect':            'To build a strong feeling of admiration and consideration in someone.',
  'instill loyalty':            'To build a deep sense of commitment and devotion in someone over time.',

  // infuse
  'infuse energy':              'To bring a surge of enthusiasm and vigour into a situation or group.',
  'infuse enthusiasm':          'To bring excitement and keen interest into something.',
  'infuse life':                'To bring vitality and animation back into something that felt flat or dull.',
  'infuse creativity':          'To bring originality and imaginative thinking into a project or process.',
  'infuse passion':             'To bring strong emotional energy and deep care into what you do.',

  // engender
  'engender trust':             'To produce or create a feeling of trust and reliability between people.',
  'engender support':           'To create backing and encouragement among people for a cause or idea.',
  'engender conflict':          'To cause disagreement or hostility to arise between people or groups.',
  'engender loyalty':           'To produce deep commitment and dedication in people toward a cause.',
  'engender goodwill':          'To create a feeling of kindness and positive intentions between people.',
  'engender hope':              'To give rise to a feeling of optimism and expectation of good things.',

  // dwindle
  'dwindle away':               'To gradually decrease until almost nothing remains.',
  'dwindle rapidly':            'To decrease in size, amount, or strength very quickly.',
  'dwindle steadily':           'To decrease continuously and consistently over time.',
  'dwindle to nothing':         'To decrease until there is virtually none left.',
  'numbers dwindle':            'The count of people or things gradually drops lower and lower.',
  'support dwindle':            'Backing or approval gradually decreases over time.',

  // thwart
  'thwart plans':               'To prevent someone\'s plans from being carried out successfully.',
  'thwart attempts':            'To prevent efforts to do something from succeeding.',
  'thwart ambitions':           'To block someone from achieving their goals and aspirations.',
  'thwart progress':            'To prevent forward movement or development from happening.',
  'thwart efforts':             'To prevent someone\'s hard work or actions from achieving results.',
  'thwart a plot':              'To uncover and prevent a secret plan from being carried out.',

  // scrutinize
  'scrutinize closely':         'To examine something in great detail and with intense attention.',
  'scrutinize carefully':       'To examine something with great care and critical attention.',
  'scrutinize every detail':    'To examine every small element of something with thorough attention.',
  'scrutinize evidence':        'To examine proof or information very carefully to assess its validity.',
  'publicly scrutinized':       'Examined or assessed critically in front of, or by, the general public.',

  // underpin
  'underpin growth':            'To provide the foundation or support that makes growth possible.',
  'underpin a theory':          'To provide the fundamental evidence or reasoning that supports an idea.',
  'underpin democracy':         'To provide the essential foundation on which democratic principles rest.',
  'underpin success':           'To form the basic conditions that make success achievable.',
  'underpin the argument':      'To provide the core evidence or reasoning that holds an argument together.',

  // rectify
  'rectify the situation':      'To take action to make a bad or wrong situation right again.',
  'rectify a mistake':          'To correct something that was done incorrectly.',
  'rectify an error':           'To identify and fix an error so it no longer causes problems.',
  'rectify an injustice':       'To correct something that was unfair and make it right.',
  'rectify the problem':        'To identify and fix the source of a problem so it no longer exists.',

  // subvert
  'subvert democracy':          'To undermine or destroy democratic processes and institutions.',
  'subvert the system':         'To secretly work against and undermine the existing order or structure.',
  'subvert expectations':       'To challenge or overturn what people expected in a surprising way.',
  'subvert authority':          'To undermine or act against those who hold power or control.',
  'subvert the rules':          'To secretly work against or circumvent established rules.',

  // unsettle
  'unsettle the markets':       'To cause uncertainty and instability in financial markets.',
  'unsettle opponents':         'To make rivals feel uncertain and off-balance.',
  'unsettle the balance':       'To disturb a previously stable and even state.',
  'unsettle investors':         'To cause those with financial stakes to feel anxious and uncertain.',
  'deeply unsettle':            'To disturb someone\'s sense of security or stability in a profound way.',

  // exert
  'exert pressure':             'To apply force or influence to push someone toward a particular action.',
  'exert control':              'To actively use power to manage and direct a situation.',
  'exert influence':            'To use your position or persuasive power to affect outcomes.',
  'exert power':                'To make active use of the authority or strength you have.',
  'exert authority':            'To use the right or power you have to give orders or make decisions.',
  'exert effort':               'To put in considerable energy and work to achieve something.',

  // transcend
  'transcend boundaries':       'To go beyond the limits that normally separate things or people.',
  'transcend differences':      'To rise above what separates people so it no longer matters.',
  'transcend barriers':         'To go beyond the obstacles that normally prevent connection or progress.',
  'transcend expectations':     'To be far better than what people thought was possible.',
  'transcend cultures':         'To have meaning or appeal that crosses cultural divides.',

  // endure
  'endure hardship':            'To suffer through difficult and painful conditions without giving up.',
  'endure suffering':           'To experience and tolerate great pain or difficulty over time.',
  'endure criticism':           'To remain composed and continue despite being judged negatively.',
  'endure the pain':            'To tolerate physical or emotional pain without giving way.',
  'endure for years':           'To last or persist across an extended period of time.',

  // instigate
  'instigate change':           'To start or trigger a process of change, often by taking the first step.',
  'instigate proceedings':      'To begin a formal legal or official process.',
  'instigate a conflict':       'To cause or start a disagreement or fight between people or groups.',
  'instigate trouble':          'To cause problems or conflict, often deliberately.',
  'instigate a rebellion':      'To trigger an organised uprising or act of defiance against authority.',

  // lure
  'lure customers':             'To attract buyers by offering something appealing.',
  'lure investors':             'To attract people or organisations with money to put into your venture.',
  'lure talent':                'To attract skilled people to join your team or organisation.',
  'lure into a trap':           'To attract someone into a dangerous situation by offering something appealing.',
  'lure with promises':         'To attract someone by making attractive commitments.',
  'lure away':                  'To attract someone away from their current position by offering something better.',

  // mollify
  'mollify critics':            'To reduce the anger or opposition of people who are criticising you.',
  'mollify concerns':           'To address and soothe worries so they feel less serious.',
  'mollify anger':              'To calm down someone\'s strong feelings of anger.',
  'mollify the opposition':     'To reduce the strength and intensity of opposition against you.',
  'mollify fears':              'To reduce and calm the fears that people feel about something.',

  // placate
  'placate critics':            'To do something to calm people who are criticising or opposing you.',
  'placate the crowd':          'To do something that calms a group of people who are upset or angry.',
  'placate concerns':           'To say or do something that reduces people\'s worries.',
  'placate the opposition':     'To make efforts to calm those who are opposing or challenging you.',
  'placate an angry client':    'To calm down a customer or client who is very unhappy with your service.',

  // meddle
  'meddle in affairs':          'To involve yourself in matters that are not your concern.',
  'meddle in politics':         'To interfere in political matters where you have no right or invitation to.',
  'meddle with evidence':       'To interfere with or alter evidence, which is a serious offence.',
  'meddle in the process':      'To interfere with an ongoing procedure in an unwelcome way.',
  'meddle with the plan':       'To interfere with or make unauthorised changes to a plan.',

  // eradicate
  'eradicate poverty':          'To completely eliminate the state of people living in extreme deprivation.',
  'eradicate disease':          'To completely eliminate an illness so it no longer exists in a population.',
  'eradicate discrimination':   'To completely put an end to the unfair treatment of people.',
  'eradicate inequality':       'To completely remove unfair differences in opportunity or treatment.',
  'eradicate the problem':      'To completely remove a problem so that it no longer exists at all.',

  // embroil
  'embroil in controversy':     'To become involved in a public dispute that attracts criticism or disagreement.',
  'embroil in a dispute':       'To become caught up in a serious argument or disagreement.',
  'embroil in scandal':         'To become involved in a damaging public story involving wrongdoing.',
  'embroil in conflict':        'To become drawn into a fight or serious disagreement.',
  'deeply embroiled':           'Heavily and inextricably involved in a difficult situation.',

  // deter
  'deter crime':                'To discourage or prevent criminal behaviour from occurring.',
  'deter investors':            'To make people or organisations unwilling to put money into something.',
  'deter aggression':           'To discourage hostile or violent behaviour through a credible threat.',
  'deter criminals':            'To discourage people from committing crimes.',
  'deter from action':          'To put someone off taking a particular course of action.',

  // discard
  'discard old ideas':          'To throw out or abandon ways of thinking that are no longer useful.',
  'discard a plan':             'To abandon a plan that is no longer workable or appropriate.',
  'discard assumptions':        'To let go of things you assumed were true but have now questioned.',
  'discard evidence':           'To throw away or ignore information that could serve as proof.',
  'discard the notion':         'To dismiss and abandon an idea or belief.',

  // bypass
  'bypass the rules':           'To avoid following the official rules, usually to save time or gain advantage.',
  'bypass security':            'To get past protective measures without authorisation.',
  'bypass the system':          'To get around official processes rather than working through them.',
  'bypass procedure':           'To skip required steps in an official process.',
  'bypass obstacles':           'To find a way around things that block your path.',

  // defy
  'defy the odds':              'To succeed even though the chances of doing so were very small.',
  'defy expectations':          'To do far better or differently than people predicted.',
  'defy gravity':               'To appear to resist the natural pull of gravity, literally or figuratively.',
  'defy logic':                 'To make no sense by the rules of reason or rational thinking.',
  'defy authority':             'To refuse to obey those who are in charge.',
  'defy convention':            'To go against the accepted way things are done.',

  // collate
  'collate data':               'To gather and organise pieces of information into a useful, structured form.',
  'collate information':        'To bring together pieces of information from different sources.',
  'collate evidence':           'To gather and organise different pieces of proof into a single picture.',
  'collate results':            'To gather outcomes from different sources and organise them together.',
  'collate feedback':           'To gather responses or opinions and bring them together for review.',

  // revert
  'revert to type':             'To go back to behaving in the way that is typical or natural for you.',
  'revert to old habits':       'To go back to previous patterns of behaviour after trying to change.',
  'revert to default':          'To return to the original setting or state before any changes were made.',
  'revert to basics':           'To return to the most fundamental principles or methods.',
  'revert to normal':           'To return to the usual or expected state after a period of change.',

  // exasperate
  'exasperate critics':         'To irritate and frustrate people who are already critical of you.',
  'exasperate colleagues':      'To make the people you work with very annoyed and frustrated.',
  'exasperate everyone':        'To irritate or frustrate all the people involved in a situation.',
  'exasperate your audience':   'To make the people listening or watching frustrated and impatient.',
  'deeply exasperated':         'Feeling a very strong sense of irritation and frustration.',

  // plummet
  'plummet to the ground':      'To fall very rapidly and directly downward.',
  'plummet in value':           'To fall sharply and suddenly in worth or price.',
  'plummet dramatically':       'To drop steeply and suddenly in amount or level.',
  'plummet overnight':          'To fall sharply and suddenly within a very short period of time.',
  'prices plummet':             'The cost of goods or services falls very rapidly.',

  // sway
  'sway opinion':               'To shift what people think about something through argument or influence.',
  'sway voters':                'To influence people\'s voting decisions in an election.',
  'sway the decision':          'To influence the outcome of a choice or judgement.',
  'sway in the wind':           'To move gently back and forth, as if blown by the breeze.',
  'hold sway':                  'To have great power or influence over a situation or group of people.',

  // relent
  'relent under pressure':      'To give in and change your position after being pushed hard.',
  'relent eventually':          'To finally give in after a period of resisting.',
  'finally relent':             'To at last agree to something after a prolonged period of refusal.',
  'refuse to relent':           'To continue holding your position and not give in despite pressure.',

  // amalgamate
  'amalgamate companies':       'To combine two or more businesses into a single larger organisation.',
  'amalgamate resources':       'To bring together separate assets or capabilities into one pool.',
  'amalgamate ideas':           'To bring together different ideas into a single unified approach.',
  'amalgamate into one':        'To combine multiple separate things into a single unified entity.',
  'amalgamate data':            'To bring together data from multiple sources into one combined set.',

  // compel
  'compel action':              'To force or strongly drive someone to take a specific step.',
  'compel compliance':          'To force people to follow rules or meet requirements.',
  'compel obedience':           'To force people to follow orders or authority.',
  'compel attention':           'To be so interesting or urgent that people cannot ignore you.',
  'compel change':              'To force or strongly drive a shift in behaviour or practice.',
  'feel compelled':             'To feel a strong inner drive or obligation to do something.',

  // intimidate
  'intimidate witnesses':       'To frighten people who have seen a crime so they will not testify.',
  'intimidate opponents':       'To make rivals feel uncertain and afraid through strength or pressure.',
  'intimidate into silence':    'To use threats or fear to stop someone from speaking.',
  'intimidate voters':          'To threaten or frighten people so they vote in a particular way.',
  'easily intimidated':         'Quickly made to feel nervous or frightened by others.',

  // lament
  'lament the loss':            'To feel and express deep sadness about something that is gone.',
  'lament the decline':         'To express sadness or regret about something getting worse over time.',
  'lament the fact':            'To express regret or sadness about something being true.',
  'widely lamented':            'Regretted or mourned by a large number of people.',
  'bitterly lament':            'To express intense and heartfelt sadness or regret about something.',

  // revamp
  'revamp the system':          'To redesign and improve an existing system to make it more effective.',
  'revamp the image':           'To refresh how something or someone is perceived by the public.',
  'revamp a strategy':          'To redesign an approach so it works better in current conditions.',
  'revamp the curriculum':      'To redesign and update the content and structure of a course of study.',
  'revamp the design':          'To redesign something so it looks more modern or works more effectively.',

  // confine
  'confine yourself to':        'To restrict what you do or say to a particular area or subject.',
  'confine to barracks':        'To restrict someone from leaving a specific place, literally or figuratively.',
  'confine to a role':          'To limit someone to a particular function or position.',
  'confine the problem':        'To prevent a problem from spreading beyond its current scope.',
  'strictly confine':           'To limit something very tightly within narrow boundaries.',

  // circumscribe
  'circumscribe power':         'To set firm limits on how much power someone is allowed to exercise.',
  'circumscribe freedom':       'To restrict the degree of freedom available to someone.',
  'circumscribe activity':      'To place limits on what actions or activities are permitted.',
  'circumscribe authority':     'To define and limit the scope of someone\'s authority.',
  'tightly circumscribed':      'Restricted and limited within very narrow boundaries.',

  // dismay
  'dismay observers':           'To cause people watching or following events to feel shock and disappointment.',
  'dismay critics':             'To cause those who are critical to feel shocked and disappointed.',
  'dismay supporters':          'To cause those who back you to feel shocked and disappointed.',
  'utterly dismay':             'To cause complete and total shock and disappointment.',
  'deeply dismayed':            'Feeling a profound sense of shock and disappointment.',

  // enhance
  'enhance performance':        'To improve how well something or someone carries out a task.',
  'enhance value':              'To increase the worth or usefulness of something.',
  'enhance productivity':       'To improve the rate and quality of output from work or a process.',
  'enhance skills':             'To improve and develop the abilities you already have.',
  'enhance understanding':      'To deepen and improve someone\'s grasp of a subject.',
  'greatly enhance':            'To improve something significantly and to a high degree.',

  // adversity
  'face adversity':             'To confront and deal with difficult or painful circumstances.',
  'endure adversity':           'To bear through hardship and keep going despite the pain.',
  'extreme adversity':          'Circumstances of difficulty or hardship that are very severe.',
  'rise above adversity':       'To overcome difficulties and not let them defeat you.',
  'triumph over adversity':     'To achieve success despite having faced significant hardship.',
  'withstand adversity':        'To remain strong and not be broken by difficult circumstances.',

  // setback
  'suffer a setback':           'To experience a development that delays or hinders your progress.',
  'face a setback':             'To encounter an obstacle or reverse that makes progress harder.',
  'deal with a setback':        'To handle and respond to something that has delayed or blocked progress.',
  'temporary setback':          'A reverse that slows you down but is not permanent or fatal.',
  'minor setback':              'A small reverse or obstacle that causes only a slight delay.',
  'major setback':              'A significant reverse that seriously disrupts plans or progress.',

  // wrath
  'incur wrath':                'To do something that provokes someone\'s intense anger.',
  'face the wrath':             'To have to deal with someone\'s intense and powerful anger.',
  'provoke wrath':              'To cause someone to feel or express intense anger.',
  'divine wrath':               'The fierce anger of a god or supernatural power, as conceived in religion.',
  'vent your wrath':            'To release or express your intense anger, often loudly.',
  'unleash wrath':              'To let out an intense and powerful anger without holding back.',

  // remorse
  'feel remorse':               'To experience a strong feeling of regret and guilt for something you did.',
  'show remorse':               'To express or demonstrate that you regret something you have done.',
  'express remorse':            'To put into words the regret and guilt you feel about your actions.',
  'genuine remorse':            'Regret and guilt that is real and heartfelt, not performed.',
  'without remorse':            'Doing something harmful without feeling any regret or guilt about it.',
  'deep remorse':               'A very strong and sincere feeling of regret for something you have done.',

  // stigma
  'social stigma':              'A mark of shame or disgrace attached to a person by society.',
  'carry a stigma':             'To bear the social shame or negative label that others attach to something.',
  'fight the stigma':           'To challenge and work to remove the negative social label around something.',
  'mental health stigma':       'The social shame and negative attitudes that surround mental health conditions.',
  'remove the stigma':          'To eliminate the negative social judgment attached to a person or condition.',
  'stigma attached to':         'The social shame or disapproval that comes along with a particular thing.',

  // willpower
  'strong willpower':           'A powerful ability to control your own impulses and behaviour.',
  'sheer willpower':            'Pure determination and self-control, without the help of anything else.',
  'iron willpower':             'An extremely strong and unyielding ability to control oneself.',
  'lack of willpower':          'An inability to control one\'s own impulses, habits, or behaviour.',
  'test your willpower':        'To push your self-control to its limits, seeing how much you can resist.',
  'summon the willpower':       'To call up the self-control needed to do something difficult.',

  // vigilance
  'constant vigilance':         'The state of being alert and watchful at all times without let-up.',
  'heightened vigilance':       'An increased level of alertness and watchfulness in response to a threat.',
  'eternal vigilance':          'Unending watchfulness, often cited as the price of freedom.',
  'urge vigilance':             'To strongly encourage others to stay alert and watchful.',
  'maintain vigilance':         'To keep up a state of careful watchfulness over time.',

  // compassion
  'show compassion':            'To demonstrate care and sympathy for the suffering of others.',
  'express compassion':         'To put into words or actions your sympathy for someone\'s suffering.',
  'genuine compassion':         'Real and heartfelt care for the suffering of others.',
  'deep compassion':            'A profound feeling of sympathy and care for those who are suffering.',
  'lack of compassion':         'An absence of sympathy or care for the suffering of others.',
  'with compassion':            'In a way that shows sympathy, understanding, and care for others.',

  // solace
  'find solace':                'To discover something that brings you comfort during a difficult time.',
  'take solace':                'To draw comfort from something when you are in distress.',
  'offer solace':               'To provide comfort and reassurance to someone who is upset or grieving.',
  'seek solace':                'To look for something that will bring comfort during a hard time.',
  'little solace':              'Comfort that is minimal or barely enough given the difficulty of the situation.',
  'small solace':               'A slight comfort that does not fully make up for the pain of a situation.',

  // calamity
  'natural calamity':           'A disaster caused by natural forces, such as floods, earthquakes, or fires.',
  'economic calamity':          'A disaster that severely disrupts or damages a country\'s economy.',
  'environmental calamity':     'A disaster that causes serious and widespread harm to the natural world.',
  'avoid calamity':             'To take action that prevents a disastrous event from occurring.',
  'prevent calamity':           'To stop a potential disaster from happening.',

  // ordeal
  'terrible ordeal':            'A very unpleasant and traumatic experience that someone has had to go through.',
  'harrowing ordeal':           'An experience that is deeply distressing and upsetting.',
  'traumatic ordeal':           'An experience so upsetting or disturbing that it causes lasting psychological harm.',
  'survive the ordeal':         'To get through a very difficult and painful experience.',
  'gruelling ordeal':           'An experience that is physically or emotionally exhausting and demanding.',
  'endure an ordeal':           'To bear through a very difficult and painful experience.',

  // toil
  'endless toil':               'Work or effort that seems to go on without stopping or yielding results.',
  'relentless toil':            'Hard work that continues without pause or let-up.',
  'daily toil':                 'The hard work and effort that makes up each ordinary day.',
  'years of toil':              'A long period of hard work and sustained effort.',
  'back-breaking toil':         'Extremely hard physical labour that puts great strain on the body.',
  'toil and trouble':           'Hard work combined with difficulty and problems, often used together.',

  // misery
  'cause misery':               'To bring great suffering or unhappiness to others.',
  'spread misery':              'To make others unhappy, often in a way that extends from person to person.',
  'abject misery':              'A state of extreme and complete misery with no relief at all.',
  'extreme misery':             'A very high degree of suffering, unhappiness, or distress.',
  'economic misery':            'A state of financial hardship and suffering affecting people\'s daily lives.',
  'end your misery':            'To put a stop to prolonged suffering, either literally or humorously.',

  // fallacy
  'common fallacy':             'A mistaken belief that many people hold and that is widely accepted but wrong.',
  'logical fallacy':            'An error in reasoning that makes an argument invalid despite sounding convincing.',
  'popular fallacy':            'A mistaken belief that is widely held among the general public.',
  'expose a fallacy':           'To reveal and show that a widely held belief or argument is actually wrong.',
  'basic fallacy':              'A fundamental error in thinking or reasoning.',

  // malice
  'with malice':                'With a deliberate intention to harm or do wrong to others.',
  'harbour malice':             'To secretly hold feelings of ill will or desire to harm someone.',
  'without malice':             'Without any intention to harm or do wrong.',
  'sheer malice':               'Pure, unmixed desire to harm or cause pain, with no other motive.',
  'bear malice':                'To hold a feeling of ill will or desire to harm someone.',
  'pure malice':                'Completely unmixed desire to cause harm, with no other motive involved.',

  // havoc
  'wreak havoc':                'To cause widespread destruction, disorder, or damage.',
  'cause havoc':                'To create great disorder and disruption.',
  'create havoc':               'To bring about widespread chaos and disruption.',
  'play havoc':                 'To cause considerable disruption and disorder to something.',
  'absolute havoc':             'Complete and total chaos and disruption.',
  'economic havoc':             'Severe disruption and damage to economic activity and financial stability.',

  // grudge
  'hold a grudge':              'To keep feeling resentment toward someone for something they did in the past.',
  'bear a grudge':              'To carry a persistent feeling of ill will toward someone who has wronged you.',
  'nurse a grudge':             'To keep feelings of resentment alive, often for a long time.',
  'old grudge':                 'A feeling of resentment that has been carried for a long time.',
  'personal grudge':            'A feeling of resentment toward a specific person based on a past wrong.',
  'settle a grudge':            'To resolve a long-standing feeling of resentment, often by confronting it.',

  // ostracism
  'face ostracism':             'To be excluded and rejected by a group or community.',
  'social ostracism':           'Exclusion and rejection from a social group or community.',
  'suffer ostracism':           'To experience being deliberately excluded and cut off by others.',
  'fear ostracism':             'To be afraid of being excluded and rejected by your social group.',
  'risk ostracism':             'To put yourself in a position where you might be excluded by others.',

  // leniency
  'show leniency':              'To be more gentle and forgiving than strict rules would require.',
  'ask for leniency':           'To request that someone be treated more gently or given a lighter punishment.',
  'plead for leniency':         'To make an urgent appeal to be treated with more mercy or forgiveness.',
  'judicial leniency':          'A judge\'s decision to impose a lighter or more merciful punishment.',
  'request leniency':           'To formally ask that someone be given a less severe punishment.',

  // impasse
  'reach an impasse':           'To arrive at a point where no progress can be made because parties disagree.',
  'break the impasse':          'To find a way forward when negotiations or talks have become completely stuck.',
  'political impasse':          'A deadlock in political negotiations where no side can agree to move forward.',
  'diplomatic impasse':         'A standstill in international relations where parties cannot agree.',
  'hit an impasse':             'To suddenly reach a point where no further progress is possible.',
  'resolve an impasse':         'To find a solution that gets past a situation where no progress was possible.',

  // revolt
  'popular revolt':             'An uprising or rebellion that is driven by the mass of ordinary people.',
  'stage a revolt':             'To organise and carry out an act of rebellion against authority.',
  'armed revolt':               'An uprising in which the participants use weapons to fight authority.',
  'spark a revolt':             'To trigger or ignite an act of rebellion or uprising.',
  'lead a revolt':              'To be at the head of and direct an organised rebellion.',

  // redemption
  'seek redemption':            'To try to make up for past wrongs and restore your moral standing.',
  'find redemption':            'To achieve a state of being forgiven or morally restored after past wrongs.',
  'personal redemption':        'The process of making up for your own past mistakes or moral failures.',
  'path to redemption':         'The route or process by which someone makes amends for past wrongdoing.',
  'beyond redemption':          'So damaged or morally compromised that recovery is impossible.',
  'arc of redemption':          'A narrative or personal journey from wrongdoing toward moral recovery.',

  // relapse
  'suffer a relapse':           'To become ill again after a period of recovery.',
  'prevent a relapse':          'To take action to stop someone from returning to illness or bad habits.',
  'risk of relapse':            'The possibility that someone might return to illness or problematic behaviour.',
  'avoid a relapse':            'To successfully prevent a return to illness or a bad habit.',
  'serious relapse':            'A return to illness or bad habits that is significant and worrying.',

  // remedy
  'find a remedy':              'To discover a solution or cure for a problem.',
  'quick remedy':               'A fast solution or cure that resolves a problem without much delay.',
  'effective remedy':           'A solution or cure that actually works and produces results.',
  'legal remedy':               'A solution to a dispute or wrong that is provided by law or the courts.',
  'seek a remedy':              'To look for a solution or cure for a problem.',
  'propose a remedy':           'To put forward a suggested solution to fix a problem.',

  // repercussion
  'serious repercussion':       'A significant and often negative consequence that follows from an action.',
  'face repercussion':          'To have to deal with the negative consequences of something you did.',
  'long-term repercussion':     'A negative consequence that continues to affect things well into the future.',
  'political repercussion':     'A negative consequence that plays out in the political arena.',
  'suffer repercussion':        'To experience the negative consequences that follow from an action.',

  // blueprint
  'provide a blueprint':        'To offer a clear and detailed plan that others can follow.',
  'follow a blueprint':         'To use an existing plan as a guide for what you are doing.',
  'create a blueprint':         'To design a detailed plan that sets out how something should be done.',
  'detailed blueprint':         'A thorough and precise plan covering all the steps and requirements.',
  'blueprint for success':      'A plan or model that clearly sets out the path to achieving a good outcome.',
  'master blueprint':           'The main, overarching plan from which all other plans are derived.',

  // threshold
  'cross a threshold':          'To reach and pass beyond a particular level or boundary.',
  'low threshold':              'A level at which something starts that is set quite low.',
  'pain threshold':             'The point at which pain becomes more than a person can bear.',
  'raise the threshold':        'To move the level at which something starts or triggers to a higher point.',
  'critical threshold':         'A level that, if crossed, triggers a significant change or consequence.',
  'high threshold':             'A level at which something starts that is set quite high.',

  // backlog
  'clear a backlog':            'To work through and complete a large accumulation of unfinished tasks.',
  'huge backlog':               'A very large accumulation of work or tasks that has not yet been dealt with.',
  'tackle the backlog':         'To begin actively working through a large pile of unfinished tasks.',
  'reduce the backlog':         'To work through tasks so that the pile of unfinished work gets smaller.',
  'growing backlog':            'An accumulation of unfinished work that is increasing in size.',
  'backlog of work':            'A large amount of work that has built up and is waiting to be completed.',

  // redundancy
  'face redundancy':            'To be in a situation where you might lose your job because it is no longer needed.',
  'risk of redundancy':         'The possibility that your job may be eliminated.',
  'voluntary redundancy':       'A situation where an employee agrees to leave their job in exchange for a payment.',
  'compulsory redundancy':      'A situation where an employer forces employees to leave because their jobs no longer exist.',
  'avoid redundancy':           'To find ways to prevent job losses when a company is restructuring.',

  // gravitas
  'exude gravitas':             'To naturally project a strong sense of seriousness and authority.',
  'carry gravitas':             'To possess and convey a natural weight and seriousness of manner.',
  'project gravitas':           'To give the impression of seriousness and authority through how you present yourself.',
  'lend gravitas':              'To add a sense of seriousness and weight to something.',
  'command gravitas':           'To naturally inspire respect and seriousness from those around you.',
  'natural gravitas':           'A seriousness and authority of manner that comes naturally rather than being forced.',

  // poise
  'maintain poise':             'To keep a calm, elegant, and controlled manner, especially under pressure.',
  'with poise':                 'In a calm, elegant, and self-controlled manner.',
  'exceptional poise':          'An unusually high degree of calm elegance and self-control.',
  'remarkable poise':           'A notably impressive degree of calm and graceful self-control.',
  'grace and poise':            'Elegant and effortless control combined with graceful bearing.',
  'lose your poise':            'To lose your calm, controlled manner, often because of stress or surprise.',

  // gullibility
  'extreme gullibility':        'A very high degree of readiness to believe things that are not true.',
  'exploit gullibility':        'To take advantage of someone\'s tendency to believe what they are told.',
  'sheer gullibility':          'Pure, simple naivety and readiness to be deceived.',
  'remarkable gullibility':     'A surprisingly high level of readiness to be deceived.',
  'public gullibility':         'The readiness of ordinary people to believe claims without questioning them.',

  // hoax
  'elaborate hoax':             'A carefully planned and detailed deception that fools many people.',
  'stage a hoax':               'To plan and carry out a deliberate deception.',
  'expose a hoax':              'To reveal that something widely believed to be true is actually a deception.',
  'cruel hoax':                 'A deception that causes real harm or distress to its victims.',
  'internet hoax':              'A deception that spreads online, often as a false story or fabricated claim.',
  'perpetrate a hoax':          'To carry out a deliberate deception intended to fool people.',

  // nemesis
  'arch nemesis':               'Your chief and most persistent rival or enemy.',
  'meet your nemesis':          'To encounter the person or thing that will cause your downfall.',
  'face your nemesis':          'To confront the rival, enemy, or challenge that is your greatest threat.',
  'personal nemesis':           'Someone who is specifically your own persistent rival or source of downfall.',
  'ultimate nemesis':           'The final and most powerful opponent or source of undoing.',

  // menace
  'public menace':              'A person or thing that poses a danger or serious nuisance to society.',
  'growing menace':             'A threat or danger that is increasing in size or seriousness.',
  'looming menace':             'A threat that is approaching and feels increasingly difficult to avoid.',
  'serious menace':             'A threat or danger that is significant and must be taken seriously.',
  'menace to society':          'A person or thing that poses a broad danger to the wider public.',

  // impunity
  'with impunity':              'Without facing any punishment or negative consequences for your actions.',
  'act with impunity':          'To do things that are wrong without any fear of being punished.',
  'operate with impunity':      'To carry out activities, often harmful, without being stopped or punished.',
  'enjoy impunity':             'To benefit from a situation where no consequences follow your actions.',
  'absolute impunity':          'Complete freedom from any punishment or consequence whatsoever.',
  'total impunity':             'Full and complete freedom from punishment for one\'s actions.',

  // testament
  'living testament':           'A person or thing that itself serves as proof or evidence of something.',
  'clear testament':            'Unmistakable proof or evidence of something.',
  'fitting testament':          'A particularly appropriate way of proving or honouring something.',
  'remarkable testament':       'A striking and impressive piece of evidence or proof of something.',
  'testament to success':       'Clear proof or evidence of the achievement that has been reached.',
  'standing testament':         'Lasting and ongoing proof or evidence of something.',

  // rupture
  'cause a rupture':            'To produce a sudden break or serious split in a relationship or structure.',
  'political rupture':          'A sudden and serious break in political relations or within a political group.',
  'sudden rupture':             'A break or split that happens quickly and unexpectedly.',
  'repair a rupture':           'To mend a break or serious split in a relationship or structure.',
  'diplomatic rupture':         'A serious breakdown in the formal relations between countries.',

  // void
  'leave a void':               'To create an empty space or absence where something meaningful used to be.',
  'fill a void':                'To provide something that satisfies a need or replaces something that was lost.',
  'create a void':              'To produce an empty space or absence by removing something meaningful.',
  'emotional void':             'An inner emptiness or feeling of lacking emotional fulfilment.',
  'vast void':                  'A very large and complete emptiness.',
  'void of meaning':            'Completely lacking in purpose, significance, or sense.',

  // proliferation
  'nuclear proliferation':      'The spread of nuclear weapons or technology to more countries.',
  'rapid proliferation':        'A very fast spread or increase in the number of something.',
  'prevent proliferation':      'To take action to stop the spread of something, especially weapons.',
  'unchecked proliferation':    'A spread or increase that is not controlled or limited in any way.',
  'halt proliferation':         'To stop the spread of something from continuing.',

  // confession
  'make a confession':          'To admit to something you have done, especially something wrong.',
  'public confession':          'An admission of wrongdoing made openly in front of others.',
  'forced confession':          'An admission of guilt obtained through pressure or coercion.',
  'full confession':            'A complete admission that covers everything that was done.',
  'extract a confession':       'To obtain an admission of guilt from someone, often through pressure.',
  'written confession':         'An admission of wrongdoing set down in writing.',

  // testimony
  'give testimony':             'To formally state what you know or experienced, especially in court.',
  'compelling testimony':       'Evidence given by a witness that is very persuasive and difficult to ignore.',
  'expert testimony':           'Evidence given by someone with specialist knowledge in a relevant field.',
  'false testimony':            'Evidence given by a witness that is deliberately untrue.',
  'eyewitness testimony':       'Evidence given by someone who personally saw the events they describe.',
  'provide testimony':          'To supply formal evidence of what one knows or has witnessed.',

  // framework
  'legal framework':            'The set of laws and rules within which an activity must operate.',
  'provide a framework':        'To supply a basic structure within which something can be understood or done.',
  'regulatory framework':       'The set of regulations that govern how an industry or activity operates.',
  'establish a framework':      'To create and put in place a basic structure for something to operate within.',
  'conceptual framework':       'A set of ideas and principles that provide a structure for thinking about something.',
  'within a framework':         'Operating inside a defined set of rules or a defined structure.',

  // aversion
  'strong aversion':            'A powerful dislike of or reluctance to deal with something.',
  'risk aversion':              'A preference for avoiding uncertain outcomes, even at the cost of potential gains.',
  'deep aversion':              'A profound dislike or reluctance that is difficult to overcome.',
  'natural aversion':           'A dislike that seems instinctive rather than learned.',
  'develop an aversion':        'To come to dislike something strongly, often after a bad experience.',
  'overcome an aversion':       'To get past a strong dislike and learn to deal with something.',

  // compulsion
  'overwhelming compulsion':    'An urge so strong that it feels almost impossible to resist.',
  'feel a compulsion':          'To experience a strong inner urge to do something.',
  'resist a compulsion':        'To fight against a strong inner urge and not act on it.',
  'obsessive compulsion':       'A repetitive urge that dominates thinking and is very difficult to control.',
  'inner compulsion':           'A strong drive or urge that comes from within a person.',
  'under compulsion':           'Doing something because you are forced to, not out of free choice.',

  // craving
  'intense craving':            'A very powerful desire for something, especially food or a substance.',
  'satisfy a craving':          'To give in to and fulfil a strong desire.',
  'sudden craving':             'A strong desire that comes on unexpectedly.',
  'overcome a craving':         'To resist and get past a powerful desire without giving in to it.',
  'irresistible craving':       'A desire so strong that it feels impossible not to act on it.',
  'craving for chocolate':      'A strong desire to eat chocolate, used as the typical example of a food craving.',

  // unremitting
  'unremitting pressure':       'Pressure that never lets up or eases, continuing without pause.',
  'unremitting hostility':      'Constant and unrelenting aggression or opposition.',
  'unremitting effort':         'Effort that continues without break or reduction in intensity.',
  'unremitting hardship':       'Hardship that goes on without any relief or let-up.',
  'unremitting toil':           'Hard work that continues relentlessly without pause.',

  // unwavering
  'unwavering commitment':      'Dedication that remains firm and constant, regardless of obstacles.',
  'unwavering support':         'Support that stays solid and consistent no matter what happens.',
  'unwavering loyalty':         'Loyalty that does not shift or weaken under any circumstances.',
  'unwavering focus':           'Concentration that remains fixed and does not drift.',
  'unwavering determination':   'A resolve that stays firm and does not weaken when things get hard.',

  // tenuous
  'tenuous link':               'A connection between things that is weak, fragile, or barely there.',
  'tenuous grasp':              'A hold on something that is weak and likely to slip.',
  'tenuous connection':         'A relationship between things that is fragile and hard to establish clearly.',
  'tenuous argument':           'A line of reasoning that is weak and not very convincing.',
  'tenuous relationship':       'A bond between people or ideas that is fragile and barely maintained.',

  // robust
  'robust economy':             'An economy that is strong, healthy, and performing well.',
  'robust debate':              'A lively and energetic discussion in which people argue their views firmly.',
  'robust system':              'A system that is strong, reliable, and able to withstand stress.',
  'robust defence':             'A strong, thorough, and well-argued case in one\'s own defence.',
  'robust growth':              'Growth that is strong and sustained over time.',
  'robust evidence':            'Evidence that is solid, well-supported, and difficult to challenge.',

  // rigorous
  'rigorous testing':           'Testing that is thorough, systematic, and leaves nothing unchecked.',
  'rigorous analysis':          'An examination that is extremely thorough and methodical.',
  'rigorous standards':         'Criteria or requirements that are demanding and strictly applied.',
  'rigorous training':          'Training that is demanding, thorough, and leaves nothing to chance.',
  'rigorous approach':          'A way of doing things that is careful, systematic, and leaves no gaps.',

  // tenacious
  'tenacious fighter':          'Someone who persists and keeps going despite great difficulty.',
  'tenacious defender':         'Someone who holds their position with great determination and energy.',
  'tenacious grip':             'A hold that is firm and not easily broken or loosened.',
  'tenacious pursuit':          'A chase or quest that is kept up with great determination.',
  'tenacious attitude':         'A mindset of persistence and refusal to give up.',

  // zealous
  'zealous advocate':           'Someone who argues passionately and with great energy for a cause.',
  'zealous supporter':          'Someone who backs a cause or person with great enthusiasm and energy.',
  'zealous reformer':           'Someone who pushes for change with intense commitment and energy.',
  'zealous defence':            'A passionate and energetic effort to defend something.',
  'zealous effort':             'Work carried out with intense enthusiasm and commitment.',

  // dubious
  'dubious claim':              'A statement that seems unlikely to be true and invites scepticism.',
  'dubious character':          'A person of questionable honesty or moral standards.',
  'dubious motive':             'A reason for doing something that seems dishonest or self-serving.',
  'dubious honour':             'A title or distinction that is not actually desirable or flattering.',
  'dubious distinction':        'A form of recognition that is actually embarrassing rather than praiseworthy.',
  'highly dubious':             'Very difficult to believe or trust; extremely questionable.',

  // ominous
  'ominous sign':               'Something that suggests bad things are going to happen.',
  'ominous warning':            'A caution or alert that strongly suggests something bad is coming.',
  'ominous silence':            'A quiet that feels threatening and suggests something is wrong.',
  'ominous cloud':              'Something that seems to threaten dark or difficult times ahead.',
  'ominous tone':               'A manner of speaking or writing that suggests trouble is coming.',

  // precarious
  'precarious situation':       'A set of circumstances that is unstable and could easily become dangerous.',
  'precarious position':        'A place or standing that is unstable and puts you at risk.',
  'precarious balance':         'A state of equilibrium that is fragile and could easily be upset.',
  'precarious state':           'A condition that is unstable and likely to deteriorate.',
  'precarious existence':       'A way of living that is fragile and uncertain, with no security.',
  'precarious footing':         'A standing or basis that is unstable and unreliable.',

  // sinister
  'sinister motive':            'A reason for doing something that is hidden and harmful in intent.',
  'sinister plot':              'A plan that involves hidden harmful or evil intent.',
  'sinister figure':            'A person who seems threatening, menacing, or morally dark.',
  'sinister smile':             'A smile that suggests hidden or harmful intent rather than warmth.',
  'something sinister':         'An element or quality in a situation that seems threatening or menacing.',

  // brazen
  'brazen lie':                 'A false statement made openly and without any shame or embarrassment.',
  'brazen act':                 'A bold action carried out openly, showing no shame or remorse.',
  'brazen defiance':            'Open and shameless refusal to follow rules or authority.',
  'brazen disregard':           'An openly dismissive attitude toward rules, rights, or feelings.',
  'brazen hypocrisy':           'Openly saying one thing and doing another, without any embarrassment.',

  // notorious
  'notorious criminal':         'A lawbreaker who is widely known for their crimes.',
  'notorious reputation':       'A name or standing that is widely known for something bad.',
  'notorious case':             'A legal or other matter that is famous because of how shocking it was.',
  'become notorious':           'To gain a wide reputation for doing something bad or disgraceful.',
  'widely notorious':           'Well known to many people for something negative or shameful.',

  // vicious
  'vicious cycle':              'A situation in which one problem causes another, creating a loop that is hard to escape.',
  'vicious attack':             'An assault that is extremely violent or aggressively critical.',
  'vicious circle':             'A sequence of linked events that make each other worse in turn.',
  'vicious rivalry':            'A competition marked by extreme and hostile aggression.',
  'vicious criticism':          'Hostile and intensely harsh judgement of someone or something.',

  // morbid
  'morbid fascination':         'A deep interest in something dark, disturbing, or related to death.',
  'morbid curiosity':           'A desire to know about something dark, disturbing, or morbid.',
  'morbid humour':              'Comedy that deals with death or suffering in a darkly comic way.',
  'morbid thought':             'A thought about death, illness, or other dark subjects.',
  'morbid obsession':           'A fixation on dark or disturbing subjects that is unhealthy in its intensity.',

  // coercive
  'coercive tactics':           'Methods that use force, threats, or pressure to make people comply.',
  'coercive behaviour':         'Actions intended to control or manipulate someone through fear or force.',
  'coercive control':           'A pattern of behaviour that seeks to take away a person\'s liberty through intimidation.',
  'coercive power':             'Power that works by threatening or using force rather than by consent.',
  'coercive measures':          'Actions that use force or pressure to compel compliance.',

  // conspicuous
  'conspicuous absence':        'An absence that is very noticeable because the missing person or thing was expected.',
  'conspicuous consumption':    'Buying expensive goods openly to signal wealth and status to others.',
  'conspicuous success':        'Achievement that is very visible and obvious to others.',
  'conspicuous silence':        'A silence that draws attention because speaking would have been expected.',
  'conspicuous failure':        'A failure that is very obvious and visible to everyone.',

  // gullible
  'gullible people':            'Individuals who are too ready to believe what they are told.',
  'gullible consumer':          'A buyer who is easily deceived by advertising or misleading claims.',
  'gullible public':            'Ordinary people who are too trusting and easy to deceive.',
  'extremely gullible':         'Very easily deceived or manipulated into believing false things.',
  'naive and gullible':         'Both lacking experience of the world and too ready to believe what is said.',

  // impetuous
  'impetuous decision':         'A choice made suddenly and without enough thought or care.',
  'impetuous action':           'Something done suddenly and without proper consideration of the consequences.',
  'impetuous behaviour':        'A pattern of acting suddenly and without thinking things through.',
  'impetuous young man':        'A young man who acts on impulse and without sufficient reflection.',
  'dangerously impetuous':      'So prone to sudden rash action that it poses a risk to oneself or others.',

  // vibrant
  'vibrant community':          'A lively, active, and energetic group of people with strong connections.',
  'vibrant economy':            'An economy that is active, growing, and full of energy.',
  'vibrant culture':            'A culture that is lively, diverse, and richly expressive.',
  'vibrant colour':             'A shade that is intense, bold, and striking.',
  'vibrant city':               'A city that is lively, bustling, and full of activity.',

  // salient
  'salient point':              'The most important or noticeable aspect of something.',
  'salient feature':            'The most prominent or noticeable characteristic of something.',
  'salient fact':               'The most important or noteworthy piece of information about something.',
  'salient detail':             'A specific element that stands out as particularly important.',
  'most salient':               'The most noticeable or important among a number of things.',

  // shrewd
  'shrewd businessman':         'Someone who runs their business with sharp intelligence and practical wisdom.',
  'shrewd investment':          'A financial decision that shows practical wisdom and good judgement.',
  'shrewd observer':            'Someone who notices things that others miss and draws sharp conclusions.',
  'shrewd negotiator':          'Someone who navigates negotiations with skill and sharp practical judgement.',
  'shrewd move':                'An action that shows good practical judgement and achieves a desired result.',

  // judicious
  'judicious use':              'Using something in a careful, considered, and well-timed way.',
  'judicious choice':           'A selection that shows sound, well-considered judgement.',
  'judicious decision':         'A choice made with careful thought and sound judgement.',
  'judicious approach':         'A way of doing something that is careful, measured, and wise.',
  'judicious application':      'The careful and well-considered use of something in appropriate situations.',

  // buoyant
  'buoyant economy':            'An economy that is performing strongly and with an upbeat outlook.',
  'buoyant market':             'A market in which confidence is high and prices are rising.',
  'buoyant mood':               'A feeling of cheerfulness and positive energy.',
  'buoyant performance':        'Results that are strong and positive, showing upward momentum.',
  'buoyant spirit':             'An upbeat, optimistic, and energetic attitude.',

  // benign
  'benign neglect':             'A deliberate policy of not intervening, allowing something to develop on its own.',
  'benign tumour':              'A growth that is not cancerous and does not spread to other parts of the body.',
  'benign influence':           'A gentle and positive effect that does not cause harm.',
  'benign effect':              'An outcome that is gentle, harmless, or mildly positive.',
  'benign condition':           'A medical state that is not dangerous or likely to get worse.',
  'relatively benign':          'Not particularly harmful or dangerous compared to other possibilities.',

}
