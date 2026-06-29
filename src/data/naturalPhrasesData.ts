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

  // ── NOUN ANCHORS (Step 2) ─────────────────────────────────────────────────────

  // ── ADJECTIVE ANCHORS (Step 3) ────────────────────────────────────────────────

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

}
