import type { DiscoveryTemplate } from '../types';

const sourcePath = '10 Rules & Homebrew/Opening Reward Discovery Ledger.docx';
const template = (id: string, title: string, faction: string, stages: string, effect: string, honourGate = false): DiscoveryTemplate => ({ id, title, faction, acquisitionPaths: ['Use one of the ledger’s stated acquisition paths; never require a compulsory clue.'], stages, releaseCondition: 'GM issues this discovery after its stated recovery condition is met.', useLimit: 'Track unused, spent, compromised, or lost as the ledger directs.', crossGameEffect: effect, playerText: `${title} is a story-earned ${faction} discovery. Its stated effect remains subject to GM confirmation and the operation’s normal limits.`, sourcePath, honourGate, version: 1 });

/** Curated active-chain index. Full canonical wording remains in the source ledger. */
export const discoveryTemplates: DiscoveryTemplate[] = [
  template('locket-counted', 'Locket of the Counted', 'Universal opening', 'IM → Kill Team → 40k', 'Witness route and later optional evidence/civilian objective.'),
  template('cinder-cache-route-card', 'Cinder Cache Route Card', 'Universal opening', 'Kill Team → 40k', 'One equal-risk route/access preparation option.'),
  template('ash-provenance-seal', 'Ash-Provenance Seal', 'Universal opening', 'IM/KT → petition → 40k', 'Tracks a custody petition; Honour remains frozen.', true),
  template('unsworn-oath-strip', 'The Unsworn Oath-Strip', 'Adeptus Astartes', 'Imperium Maledictum', 'One short non-combat consultation, relay, or introduction.'),
  template('breachers-auspex-key', "Breacher's Auspex Key", 'Adeptus Astartes', 'IM/KT → Kill Team', 'One within-zone pre-operation redeploy.'),
  template('custody-claim', 'Custody Claim', 'Adeptus Astartes', 'IM/KT → 40k', 'One campaign-arc custody choice for an extracted scenario asset.'),
  template('counter-seal', 'The Counter-Seal', 'Agents of the Imperium', 'Imperium Maledictum', 'One official-access investigative lead.'),
  template('evidence-ghost-case', 'Evidence-Ghost Case', 'Agents of the Imperium', 'IM → Kill Team', 'One optional Case extraction route.'),
  template('writ-conditional-passage', 'Writ of Conditional Passage', 'Agents of the Imperium', 'IM → 40k', 'One optional legal civilian/asset route.'),
  template('muster-roll-uncounted', 'The Muster Roll of the Uncounted', 'Astra Militarum', 'Imperium Maledictum', 'One grounded community lead per session.'),
  template('extraction-drill-tape', 'Extraction Drill Tape', 'Astra Militarum', 'IM/KT → Kill Team', 'One optional civilian extraction edge.'),
  template('quartermasters-honest-invoice', "Quartermaster's Honest Invoice", 'Astra Militarum', 'IM/40k → 40k', 'One optional resource/civilian scenario objective.'),
  template('silent-sanctuary-seal', 'The Silent Sanctuary Seal', 'Grey Knights', 'Imperium Maledictum', 'One protected conversation, medical pause, or evidence review.'),
  template('warding-chalk-case', 'Warding Chalk Case', 'Grey Knights', 'IM/KT → Kill Team', 'Delay one reinforcement arrival or reveal a route condition.'),
  template('unspoken-debrief', 'The Unspoken Debrief', 'Grey Knights', 'IM → 40k', 'Reveal one actionable scenario fact.'),
  template('fathom-data-communion', 'Fathom-Pattern Data Communion', 'Adeptus Mechanicus', 'Imperium Maledictum', 'Ask focused questions about a machine or data system.'),
  template('diagnostic-spike', 'Diagnostic Spike', 'Adeptus Mechanicus', 'IM/KT → Kill Team', 'Reveal one bounded operational fact.'),
  template('calibrated-recovery-tag', 'Calibrated Recovery Tag', 'Adeptus Mechanicus', 'IM/KT → 40k', 'Add one distinct but non-conclusive asset/terrain approach.'),
];
