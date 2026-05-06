/**
 * add-missing-etymology.js
 *
 * One-time migration script: adds etymology to the 92 vocabulary items in
 * public/data/migration-vocab.json that were missing it.
 *
 * Safe by design:
 *  - only writes to items where etymology is empty/missing
 *  - never overwrites an existing non-empty etymology
 *  - does not touch any other field (definition, tags, progress, etc.)
 *  - is a pure offline data file edit — no runtime AI calls
 *
 * Run: node data/migrations/add-missing-etymology.js
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, resolve } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const TARGET = resolve(__dirname, '../../public/data/migration-vocab.json')

// ── Etymology lookup by term (exact match, case-sensitive) ──────────────────
//
// Guiding principles used:
//  - 1–3 sentences maximum
//  - No fake precision; "probably", "likely" where uncertain
//  - For phrasal verbs: explain the verb root + particle combination
//  - For idioms: explain the figurative image or historical origin
//  - For modern coinages: note their recency
//  - No copy-pasted dictionary text

const ETYMOLOGIES = {

  // ── Words ──────────────────────────────────────────────────────────────────

  'iffy': `Colloquial formation from the conjunction "if" with the adjectival suffix "-y," suggesting something full of ifs or contingencies. First recorded in American English around the 1930s.`,

  'unrelatable': `Modern formation (late 20th – early 21st century) from the prefix "un-" (Old English negation) + "relatable" (from Latin "relatus," past participle of "referre," to carry back). Became widespread in informal digital and media discourse.`,

  // ── Chunks / idioms ────────────────────────────────────────────────────────

  'Get out of hand': `From the image of an animal or rope slipping out of a handler's grip. Used figuratively since at least the 19th century to mean losing control of a situation.`,

  'Under your nose': `Refers literally to something directly in front of one's face and within sight. Used figuratively since at least the 17th century to mean something obvious that is being overlooked.`,

  'Call it a day': `The phrase suggests formally declaring the end of a day's work. "Call it" means "declare it to be so." Recorded from the early 20th century in British and American English.`,

  'The best of both worlds': `A compound idiom expressing the idea of gaining the advantages of two different or opposing situations simultaneously. Recorded from at least the 19th century, drawing on the image of having two separate "worlds" at one's disposal.`,

  // ── Phrases / phrasal verbs ────────────────────────────────────────────────

  'dress up': `From Old French "dresser" (to arrange, set upright, from Latin "directiare") + Old English "up." The verb "dress" originally meant to prepare or arrange; the specific sense of wearing special or formal clothing developed in the 16th–17th centuries.`,

  'point out': `From Middle English "point" (from Old French "point," from Latin "punctum," a dot or prick) + "out." The sense of directing someone's attention to something developed naturally from the literal act of extending a finger outward toward an object.`,

  'push ahead': `From Old English "pūcan" (to push) + "ahead" (from "a-" + "head"). The figurative sense of making determined progress despite obstacles developed from the physical image of pressing forward against resistance.`,

  'put aside': `From Old English "settan" (to place) + "aside" (to one side). The sense of deferring, ignoring temporarily, or saving something for later developed from the literal act of placing an object to one side.`,

  'do over': `From Old English "dōn" (to do) + "over" (again). The American English sense of repeating or redoing something from scratch emerged in the 19th century, paralleling the British "do again."`,

  'eat out': `From Old English "etan" (to eat) + "out" (outside). Refers to taking a meal outside the home, typically in a restaurant. The phrase became common with the growth of urban restaurant culture in the 19th–20th centuries.`,

  'go down': `From Old English "gān" (to go) + "down." One of the oldest phrasal combinations; the range of figurative meanings — happening, failing, being recorded in history — developed over centuries from the basic directional sense.`,

  'go out': `From Old English "gān" + "out." The sense of leaving a building for social activity developed alongside urbanisation. The sense of a flame extinguishing ("the fire went out") is also old, recorded since the Middle Ages.`,

  'hand in': `From Old English "hand" + "in." The sense of submitting work, an assignment, or a document formally developed in the 19th–20th centuries in educational and administrative contexts.`,

  'hang out': `Probably from the earlier literal sense of hanging something outside for display (a sign, laundry). The informal sense of spending time casually somewhere emerged in American English in the 19th century.`,

  'show up': `From Old English "scēawian" (to look at, show) + "up." The sense of appearing or arriving at a place developed in the 18th–19th centuries; the separate sense of exposing or embarrassing someone is also recorded from that period.`,

  'take over': `From Old English "tacan" (to take) + "over." The sense of assuming control or responsibility for something developed from the image of taking something from above or from someone else, becoming standard in business and political contexts by the 20th century.`,

  'turn in': `From Old English "turnian" + "in." The sense of going to bed derives from turning into one's shelter; the sense of submitting work is parallel to "hand in" and became common in academic and bureaucratic English.`,

  'walk away': `From Old English "wealcan" (to roll, toss, journey) + "away." The figurative senses — winning easily, escaping without consequence — developed from the literal image of confidently walking away from something.`,

  'pack up': `From Middle Dutch "pak" (bundle, pack) + Old English "up." The sense of gathering one's belongings in preparation for departure, or ceasing work, developed from the literal act of bundling possessions together.`,

  'run past': `From Old English "rinnan" (to run) + "past." Literally to move quickly beyond something; the figurative sense of briefly reviewing an idea with someone ("run this past you") emerged in 20th-century business and conversational English.`,

  'ease up': `From Old French "aise" (comfort, ease, from a Gaulish or Latin root) + Old English "up." The sense of reducing pressure, speed, or intensity developed in the 18th–19th centuries.`,

  'come over': `From Old English "cuman" (to come) + "over." The sense of visiting someone developed from the physical movement of crossing over to a location; the separate sense of a feeling coming upon someone is also of long standing.`,

  'ask around': `From Old English "ascian" (to ask) + "around." The sense of inquiring from multiple people or sources is a natural extension of the image of moving around a community while asking questions.`,

  'walk out': `From Old English "wealcan" + "out." The sense of leaving as an act of protest — a walkout — developed in the 19th-century labour movement; the general sense of departing abruptly is older.`,

  'look back': `From Old English "lōcian" (to look) + "back." The literal sense of turning to look behind oneself; the figurative sense of reflecting on past events is a natural metaphorical extension recorded since the 17th century.`,

  'play the game': `From Old English "plegan" (to play) + "game." The figurative sense of following accepted rules and behaving in accordance with social expectations developed in the 19th century, drawing on the codes of conduct associated with organised sport.`,

  'roll back': `From Old English "rollan" (to roll) + "back." The mechanical image of rolling something backward; the figurative sense of reversing progress or reducing (prices, regulations, policies) became common in 20th-century political and economic language.`,

  'set apart': `From Old English "settan" (to place) + "apart" (from Old French "à part," to one side). The sense of distinguishing or reserving something as different from the group developed from the literal act of physically separating it.`,

  'sore throat': `A descriptive compound from Old English "sār" (pain, sorrow) + "throte" (throat). Both components are of Germanic origin. The compound appears in medical and everyday writing from the 16th–17th centuries onward.`,

  'sweat it out': `From Old English "swǣtan" (to sweat) + "it out." The metaphor of enduring difficulty through sustained effort draws on the image of physical exertion; "sweating it out" in figurative senses is recorded by the 19th century.`,

  'tie in': `From Old English "tīgan" (to tie) + "in." The sense of connecting or linking things together developed from the physical act of binding; "tie-in" as a noun meaning a connection or cross-promotional link is common in 20th-century business and media.`,

  'turn back': `From Old English "turnian" + "back." The sense of reversing direction or returning to a previous point is a direct extension of the literal physical movement, and also used for stopping or repelling something.`,

  'work through': `From Old English "weorc" (work, deed) + "through." The sense of resolving or processing something by continuing to engage with it — a problem, a grief, a queue of tasks — developed in the 20th century, drawing on the image of working one's way through an obstacle.`,

  'wrap up': `From Middle English "wrappen" (to wrap, of uncertain origin, possibly Low German) + "up." The sense of concluding or finishing something draws on the image of wrapping a package or bundle; in widespread figurative use since the 19th century.`,

  'carry on': `From Old North French "carier" (to carry in a vehicle, from Latin "carrus," a wheeled vehicle) + Old English "on." The sense of continuing in spite of difficulties became especially prominent in British English during the World Wars.`,

  'check out': `"Check" entered English from Old French "eschec" (a check in chess, from Arabic "shāh," king) + "out." The sense of examining or verifying something developed from inspection; the hospitality sense of leaving accommodation arose in the 19th century.`,

  'cut down on': `From Old English "ceōwan" — though "cut" likely entered English from Old Norse "kútr" — + "down" + "on." The sense of reducing the amount or frequency of something became common in the 19th–20th centuries.`,

  'get out': `From Old English "gietan" (to get, obtain) + "out." One of the most fundamental phrasal combinations; the sense of leaving or removing oneself from a place is ancient and direct.`,

  'go ahead': `From Old English "gān" (to go) + "ahead" (from "a-" + "head"). The sense of proceeding or giving permission to proceed developed in the 18th–19th centuries; the noun "go-ahead" meaning approval emerged in American English.`,

  'go away': `From Old English "gān" + "away" (Old English "āweg"). A basic directional phrase expressing departure; also used idiomatically for pain, problems, or people disappearing. Among the oldest phrasal verb formations in English.`,

  'go back': `From Old English "gān" + "back." The sense of returning to a place, an earlier time, or a previous topic is a natural extension of physical movement; "goes back to" also indicates historical origin.`,

  'go on': `From Old English "gān" + "on." The sense of continuing is among the oldest phrasal uses; also used as a British English exclamation expressing surprise or disbelief, and to urge someone to continue speaking.`,

  'let in': `From Old English "lǣtan" (to allow, let remain) + "in." The sense of admitting someone or something through a door or barrier developed directly from the literal act of opening an entrance to allow passage.`,

  'look for': `From Old English "lōcian" (to look) + "for." The sense of searching for something is a natural extension of directing one's gaze with a purpose; recorded in various forms in Middle English.`,

  'look into': `From Old English "lōcian" + "into." The sense of investigating or closely examining something extends the literal image of peering into a container or enclosed space to see what is there.`,

  'move in': `From Old French "mouvoir" (to move, from Latin "movēre") + "in." The specific sense of taking up residence in a new place became standard in the 19th–20th centuries with growing mobility and urban housing.`,

  'put together': `From Old English "settan" + "together." The sense of assembling, combining, or organising things is a direct extension of the physical act of placing objects alongside one another; also used figuratively for plans and arguments.`,

  'sit down': `From Old English "sittan" (to sit) + "down." The literal act of lowering oneself to a seated position; the imperative form has been used to invite or command seating since Old English, and remains one of the most common phrasal verbs.`,

  'slow down': `From Old English "slāw" (sluggish, dull) + "down." The sense of decreasing speed or pace is a natural directional combination; became especially common in contexts of vehicles, traffic, and work pace from the 19th century onward.`,

  'take care of': `From Old English "tacan" + "care" (Old English "cearu," sorrow, responsibility) + "of." The sense of managing or looking after something developed as "care" shifted toward responsibility and concern; the fixed phrase became standard in the 19th century.`,

  'take on': `From Old English "tacan" + "on." The sense of accepting a challenge, undertaking a task, or hiring someone developed from the literal sense of picking something up; in widespread use by the 17th century.`,

  'take out': `From Old English "tacan" + "out." Covers multiple meanings: removing something, accompanying someone socially, obtaining (a loan, a licence). The American English sense of food prepared for eating away from the premises developed in the 20th century.`,

  'try out': `"Try" entered English from Old French "trier" (to sift, sort, select) + "out." The sense of testing something or auditioning for a role developed by the 17th century; "tryout" as a noun for an audition or test is primarily American English.`,

  'turn around': `From Old English "turnian" + "around." The literal sense of rotating to face the opposite direction; the business sense of reversing a declining situation — and the noun "turnaround" — became common in 20th-century management and economics.`,

  'pull over': `From Old English "pullian" (to pull) + "over." The specific sense of a vehicle moving to the side of a road to stop developed alongside automobile culture in the early 20th century.`,

  'run out of': `From Old English "rinnan" (to run, flow) + "out" + "of." The sense of exhausting a supply — as liquid runs out of a container — is a natural image; recorded in English from the 17th century.`,

  'take apart': `From Old English "tacan" + "apart." The literal sense of disassembling a physical object; the figurative sense of analysing something rigorously or criticising it comprehensively developed in the 20th century.`,

  'take down': `From Old English "tacan" + "down." Multiple meanings: physically lowering something, recording notes ("take down in writing"), and humiliating or defeating someone. The note-taking sense is recorded from the 17th century.`,

  'think over': `From Old English "þencan" (to think) + "over." The sense of considering something carefully draws on the "over" particle suggesting a thorough, covering pass through the subject; closely related to "think through."`,

  'calm down': `"Calm" entered English from Old French "calme," possibly related to Greek "kauma" (heat, noonday stillness when it was too hot to work). The phrasal verb "calm down" — urging or describing reduced agitation — became widespread from the 18th–19th centuries.`,

  'mess up': `"Mess" entered English from Old French "mes" (a course of food, a dish), which later acquired the sense of a disorderly group or muddle. The phrasal verb "mess up," meaning to disorder or make a mistake, became widespread in informal American English from the 19th–20th centuries.`,

  'talk over': `From Old English Germanic origin (cognate with "tale") + "over." The sense of discussing something thoroughly suggests a comprehensive pass over the subject; the related noun "talk-over" or "talking-over" is recorded from the 17th century.`,

  'write down': `From Old English "wrītan" (to scratch, engrave, write — originally referring to cutting runes) + "down." The sense of recording information by writing is the direct physical image; the financial sense of reducing an asset's stated value is also recorded.`,

  'fill out': `From Old English "fyllan" (to fill) + "out." The sense of completing a form by writing in all the required fields became standard in American English in the 19th–20th centuries; British English more commonly uses "fill in" for forms.`,

  'brush up on': `"Brush" entered English from Old French "brosse" (brushwood, a brush) + "up" + "on." The sense of refreshing or polishing a skill by reviewing it developed in the 17th–18th centuries, drawing on the image of brushing away rust, dust, or neglect.`,

  'show up for': `From Old English "scēawian" + "up" + "for." An extension of "show up" (to appear) with the preposition "for" emphasising the purpose or obligation; stresses reliability and accountability rather than mere physical appearance.`,

  'speed up': `From Old English "spēd" (success, swiftness, from a Germanic root related to "prosper") + "up." The sense of increasing pace or rate is a natural combination; became especially common with industrialisation and motorised transport in the 19th–20th centuries.`,

  'read into': `From Old English "rǣdan" (to advise, interpret, read) + "into." The sense of finding hidden or unintended meaning in something develops from the literal image of reading deeper into a text than its surface allows; the "over-interpretation" nuance is well established.`,

  'deal with': `From Old English "dǣlan" (to divide, distribute) — "deal" developed through Middle English to mean a transaction or arrangement. The sense of handling or managing a matter has been established since at least the 15th century.`,

  'give out': `From Old English "giefan" (to give) + "out." Multiple senses: distributing to a group, making an announcement, and becoming exhausted or ceasing to function. The "failing" sense ("the engine gave out") is recorded from the 19th century.`,

  'keep away': `From Old English "cēpan" (to seize, observe, keep) + "away." The sense of maintaining distance or preventing someone or something from approaching is a direct extension of the physical act; used both as a transitive command and intransitively.`,

  'read over': `From Old English "rǣdan" + "over." The sense of reviewing a text by reading it through in full suggests a comprehensive sweep over the material; closely related to "read through" and used interchangeably in most contexts.`,

  'talk through': `From Old English Germanic origin + "through." The sense of discussing a problem in full detail, working through it conversationally, developed from the image of talking one's way through a difficulty rather than around it.`,

  'try for': `From Old French "trier" + "for." The sense of attempting to obtain or achieve a specific goal by making an effort is a natural prepositional extension; in common use since the 18th century.`,

  'work on': `From Old English "weorc" + "on." The sense of applying effort to improve, complete, or fix something is a natural combination; "working on someone" in the sense of persuading them is also long established.`,

  'get ahead': `From Old English "gietan" + "ahead." The sense of making progress — particularly in career, life, or a competitive situation — draws on the image of moving forward past others; became common in discussions of ambition from the 19th century.`,

  'look over': `From Old English "lōcian" + "over." The sense of reviewing or inspecting something suggests a comprehensive visual check passing over the material; "overlook" as a single word carries the related sense of failing to notice.`,

  'show around': `From Old English "scēawian" + "around." The sense of guiding someone through a place, pointing out features of interest, is a natural combination; in widespread use from the 18th–19th centuries as tourism and hospitality developed.`,

  'ask for': `From Old English "ascian" (to ask) + "for." The sense of requesting something is one of the most fundamental phrasal combinations in English; also used idiomatically in "asking for trouble," meaning to invite a negative consequence.`,

  'call on': `From Old English "ceallian" (to call, shout) + "on." Multiple senses: formally visiting someone, requesting their contribution in a meeting, or appealing to them for help. The visiting sense is recorded from the 17th century.`,

  'move over': `From Old French "mouvoir" + "over." The literal sense of shifting position to make room for someone else; the figurative sense of making way for something newer or more important is also common.`,

  'talk up': `From Old English/Germanic origin + "up." The sense of promoting, praising, or generating enthusiasm for something developed in the 19th–20th centuries, drawing on the image of raising something's perceived status or profile.`,

  'walk in on': `From Old English "wealcan" + "in" + "on." The sense of entering a space unexpectedly and discovering something in progress is a natural three-part phrasal construction; common in informal descriptions of awkward or surprising discoveries.`,

  'wind up with': `From Old English "windan" (to twist, wind, from a Germanic root) + "up" + "with." The sense of ending in a particular situation is one of several meanings of "wind up" (which can also mean to tighten or to provoke); the "result" sense developed in the 19th century.`,

  'zoom out': `A modern phrasal verb from "zoom" (early 20th century, onomatopoeic for the sound of fast movement) + "out." The sense of reducing magnification — in cameras, digital maps, and metaphorical thinking — became widespread with photography and later digital technology.`,

  'step in': `From Old English "steppan" (to step) + "in." The sense of intervening in a situation developed from the literal act of stepping into a space; also means temporarily taking over a role when the usual person is unavailable.`,

  'laugh off': `From Old English "hlæhhan" (to laugh, a sound-based root) + "off." The sense of dismissing something with laughter rather than taking it seriously developed from the idea of brushing off an impact; in figurative use from the 19th century.`,

  'look around': `From Old English "lōcian" + "around." The literal sense of surveying one's surroundings in multiple directions; the sense of casually exploring a place or browsing without a fixed purpose is a natural extension.`,

  'look in on': `From Old English "lōcian" + "in" + "on." The sense of briefly visiting someone to check on their wellbeing developed from the image of looking in through a door or window; in common use from the 19th century.`,

  'run behind': `From Old English "rinnan" (to run) + "behind." The sense of being delayed or falling short of a schedule or target develops naturally from the image of lagging behind others in a race; in widespread use in time-management and planning contexts.`,
}

// ── Apply updates ──────────────────────────────────────────────────────────────

const raw  = readFileSync(TARGET, 'utf8')
const items = JSON.parse(raw)

let added = 0
let skipped = 0
let notFound = []

for (const [term, etymology] of Object.entries(ETYMOLOGIES)) {
  const item = items.find((i) => i.term === term)
  if (!item) {
    notFound.push(term)
    continue
  }
  if (item.etymology && item.etymology.trim() !== '') {
    skipped++
    continue
  }
  item.etymology = etymology
  added++
}

// ── Write back ────────────────────────────────────────────────────────────────

writeFileSync(TARGET, JSON.stringify(items, null, 2), 'utf8')

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`\n✓ Etymology migration complete`)
console.log(`  Added:   ${added}`)
console.log(`  Skipped (already had etymology): ${skipped}`)
console.log(`  Terms not found in data:         ${notFound.length}`)
if (notFound.length > 0) {
  console.log(`  Not found: ${notFound.join(', ')}`)
}

// Verify remaining missing count
const stillMissing = items.filter((i) => !i.etymology || i.etymology.trim() === '')
console.log(`  Still missing etymology: ${stillMissing.length}`)
if (stillMissing.length > 0) {
  console.log(`  Terms still missing: ${stillMissing.map((i) => i.term).join(', ')}`)
}
