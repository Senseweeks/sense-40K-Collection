export type Pool = 'field' | 'standard' | 'ordinary' | 'powerful' | 'exceptional' | 'unit3' | 'unit4' | 'marquee-unit' | 'marquee-relic';
export type CeremonyCueKind = 'cassian-opening' | 'address' | 'reveal' | 'security-interruption' | 'catalogue';
export type CampaignRole = 'owner-gm' | 'gm' | 'co-gm' | 'player' | 'display';
export type CampaignSourceStatus = 'active-canonical' | 'current-implementation' | 'planning-reference' | 'draft-candidate' | 'archived-superseded' | 'external-official-reference';
export interface CampaignDate { year: number; era: 'M42'; month: number; day: number; imperialOrigin: string; }
export interface CampaignIdentity { id: string; name: string; role: CampaignRole; }
export interface CampaignGovernance {
  startDate: CampaignDate;
  currentDate: CampaignDate;
  imperialOrigin: string;
  rolePolicy: CampaignRole[];
  identities: CampaignIdentity[];
  sourceStatuses: CampaignSourceStatus[];
  sourceStatusPolicyVersion: 1;
  honourCatalogue: { targetCount: 60; reviewedCount: 17; availability: 'frozen' };
}
export type CampaignDocketActivity = 'preparation' | 'transit' | 'operation' | 'return' | 'market-visit' | 'downtime' | 'repair-recovery-training' | 'deadline' | 'custom';
export interface CampaignDocketEntry {
  id: string;
  sequence: number;
  activity: CampaignDocketActivity;
  durationDays: number;
  note: string;
  actorId: string;
  createdAt: string;
  effectiveStart: CampaignDate;
  effectiveEnd: CampaignDate;
  supersededAt?: string;
  supersededBy?: string;
  supersedeReason?: string;
}
export interface LegacyAdaptationReview {
  id: string;
  visitId: string;
  settlementId: string;
  itemName: string;
  buyer: string;
  legacySettledAt: string;
  legacyReadyAt: string;
  status: 'pending' | 'confirmed';
  campaignSettledAt?: CampaignDate;
  campaignReadyAt?: CampaignDate;
  confirmedAt?: string;
  confirmedBy?: string;
}
export interface BattleHonour { tier: 'Standard' | 'Renowned' | 'Legendary' | 'Mythic'; crusadePoints?: string; eligibility: string; lore?: string; levels: { title: string; text: string }[]; }
export interface CatalogueItem { id: string; name: string; pool: Pool; displayCategory: string; price: { tc: number; rp: number; auction: boolean }; origin: string; roll: number | null; description: string; rules: string; mirenAnnouncement: string; fullDossier?: string[]; battleHonour?: BattleHonour; interestTags?: string[]; franchiseTags?: ('Westwood-pattern' | 'Blizzard-pattern')[]; internalTags?: string[]; }
export interface Lot { id: string; itemId: string; position: number; pool: Pool; locked: boolean; status: 'available' | 'purchased' | 'npc-won' | 'unsold'; claimants?: { name: string; interest: 'Curious' | 'Serious' | 'Intense' }[]; settlementId?: string; npcWinner?: string; }
export interface ChaosEvent { roll: number; triggered: boolean; attackType?: 'Dockside Raid' | 'Assassination' | 'Auction Theft'; target?: string; outcome?: 'full-success' | 'primary-success' | 'failure' | 'unresolved'; attended?: boolean; bonusCatalogue?: boolean; }
export interface CeremonyTimeline { status: 'idle' | 'running' | 'paused' | 'awaiting-chaos-resolution' | 'catalogue'; mode: 'auto' | 'manual'; cue: CeremonyCueKind; lotPosition: number; startedAt?: number; durationMs: number; pausedRemainingMs?: number; replaying?: boolean; revision: number; }
export type RecipientType = 'index' | 'faction' | 'npc' | 'cell' | 'player';
export type ObjectiveRewardType = 'tc' | 'rp' | 'reputation' | 'battle-honour' | 'asset' | 'narrative';
export interface ObjectiveOffer { id: string; recipientId: string; recipientName: string; recipientType: RecipientType; rewardType: ObjectiveRewardType; amount?: number; detail: string; playerText: string; enabled?: boolean; }
export interface ObjectiveAuditEntry { at: string; offerId: string; prior: ObjectiveOffer; next: ObjectiveOffer; reason: string; }
export interface ObjectiveRecord { id: string; title: string; summary: string; acquiredAt: string; state: 'recorded' | 'presented' | 'redeemed'; offers: ObjectiveOffer[]; selectedOfferId?: string; redeemedAt?: string; audit: ObjectiveAuditEntry[]; }
export interface ObjectiveOfferRecipient { id: string; name: string; type: RecipientType; active: boolean; canOfferObjectives: boolean; }
export type RewardStatus = 'issued' | 'claimed' | 'approved' | 'spent' | 'void';
export type RewardSource = 'manual' | 'objective';
export interface RewardAuditEntry { at: string; reason: string; prior: Pick<RewardRecord, 'recipientId' | 'recipientName' | 'recipientType' | 'rewardType' | 'amount' | 'detail' | 'status'>; next: Pick<RewardRecord, 'recipientId' | 'recipientName' | 'recipientType' | 'rewardType' | 'amount' | 'detail' | 'status'>; }
export interface RewardRecord { id: string; recipientId: string; recipientName: string; recipientType: RecipientType; rewardType: Exclude<ObjectiveRewardType, 'tc'>; source: RewardSource; amount?: number; detail: string; status: RewardStatus; createdAt: string; updatedAt: string; visitId?: string; objectiveId?: string; offerId?: string; audit: RewardAuditEntry[]; }
export interface TradeTransaction { id: string; label: string; amount: number; createdAt: string; kind?: 'rp-credit' | 'objective-credit' | 'settlement-debit' | 'expiry' | 'legacy'; settlementId?: string; objectiveId?: string; offerId?: string; }
export interface TradeRequest { id: string; kind: 'objective' | 'rp'; recordId?: string; offerId?: string; label: string; amount: number; status: 'pending' | 'approved' | 'rejected'; createdAt: string; reply?: string; }
export interface SettlementRecord { id: string; lotId: string; itemId: string; itemName: string; buyer: string; tcSpent: number; requiredRp: number; rpConfirmed: boolean; settledAt: string; campaignSettledAt?: CampaignDate; adaptation?: { durationDays: 28 | 84; readyAt: string; campaignReadyAt?: CampaignDate; temporalStatus?: 'campaign' | 'legacy-pending' }; }
export interface MarketHistoryEntry { id: string; visitId: string; visitNumber: number; itemId: string; itemName: string; outcome: 'cell' | 'npc'; buyer: string; tcSpent?: number; requiredRp?: number; rpConfirmed?: boolean; settledAt?: string; adaptation?: SettlementRecord['adaptation']; }
export interface BidderDeal { id: string; createdAt: string; updatedAt: string; visitId: string; lotId: string; bidder: string; partyObligation: string; bidderObligation: string; note?: string; pressureReduction: 0 | 1; status: 'active' | 'settled'; }
export interface AuctionCheck { id: string; lotId: string; playerTc: number; playerRp: number; extraRpRolls: (1 | 2)[]; dealReduction: number; pressure: number; d10: number; responder?: string; npcTc?: number; createdAt: string; }
export interface TradeCoinDebt { id: string; sourceVisitId: string; amount: number; carriedToVisitId?: string; createdAt: string; }
export type CampaignClockCategory = 'faction' | 'investigation' | 'deadline' | 'recurring' | 'custom';
export type CampaignClockStatus = 'active' | 'completed' | 'abandoned';
export interface CampaignClockAuditEntry { at: string; action: 'created' | 'edited' | 'progressed' | 'completed' | 'reopened' | 'abandoned' | 'linked-event'; priorProgress: number; nextProgress: number; note?: string; }
export interface CampaignClock { id: string; title: string; category: CampaignClockCategory; segments: number; progress: number; status: CampaignClockStatus; notes?: string; createdAt: string; updatedAt: string; audit: CampaignClockAuditEntry[]; }
export type UnderFireScenario = 'Dockside Raid' | 'Assassination Attempt' | 'Auction Theft';
export type EventOperationMode = 'kill-team' | 'imperium-maledictum';
export type EventInstanceStatus = 'setup' | 'in-progress' | 'resolved';
export type EventResult = 'full-success' | 'primary-success' | 'failure';
export interface EventObjectiveState { primary: boolean; bonus: boolean; failed: boolean; }
export interface EventClockLink { clockId: string; advances: number; note?: string; appliedAt?: string; }
export interface EventAuditEntry { at: string; action: 'created' | 'started' | 'advanced' | 'updated' | 'resolved' | 'corrected' | 'clock-linked'; reason?: string; }
export interface EventInstance { id: string; templateId: 'gilded-index-under-fire'; visitId: string; scenario: UnderFireScenario; operationMode: EventOperationMode; status: EventInstanceStatus; setupConfirmed: boolean; turningPoint: number; target?: string; attended?: boolean; unattendedRoll?: number; objectives: EventObjectiveState; notes: string; clockLinks: EventClockLink[]; result?: EventResult; createdAt: string; updatedAt: string; resolvedAt?: string; audit: EventAuditEntry[]; }
export interface Visit { id: string; number: number; createdAt: string; seed: number; phase: 'prelude' | 'rolling' | 'chaos' | 'catalogue' | 'resolved' | 'aborted'; lots: Lot[]; bonusLots?: Lot[]; chaos?: ChaosEvent; notes: string[]; missedCassian?: boolean; objectiveRecords?: ObjectiveRecord[]; tradeCoin?: { balance: number; transactions: TradeTransaction[] }; tradeRequests?: TradeRequest[]; settlements?: SettlementRecord[]; auctionChecks?: AuctionCheck[]; }
export interface MarketState { stateVersion?: number; revision: number; visits: Visit[]; activeVisitId?: string; exchangeRpPerTc: 2 | 3; cooldowns: Record<string, number>; retired: string[]; audioMuted: boolean; ceremony: CeremonyTimeline; campaignGovernance?: CampaignGovernance; buyerRoster?: string[]; bidderDeals?: BidderDeal[]; objectiveOfferRecipients?: ObjectiveOfferRecipient[]; rewardRecords?: RewardRecord[]; tradeCoinDebts?: TradeCoinDebt[]; campaignClocks?: CampaignClock[]; eventInstances?: EventInstance[]; }

// Phase 2 campaign-control records live beside the market aggregate in the
// campaign service. They deliberately use campaign dates, not wall-clock dates.
export type PublicationKind = 'session-recap' | 'briefing' | 'objective' | 'npc-profile' | 'evidence-summary';
export interface CampaignPublication { id: string; kind: PublicationKind; title: string; body: string; sourceType: string; sourceId: string; status: 'draft' | 'published' | 'withdrawn'; publishedAt?: string; createdAt: string; updatedAt: string; }
export interface PublicationAcknowledgement { id: string; publicationId: string; identityId: string; acknowledgedAt: string; idempotencyKey: string; }
export interface CampaignScene { id: string; title: string; purpose: string; status: 'planned' | 'active' | 'complete' | 'cancelled'; gmNotes?: string; }
export interface CampaignSessionObjective { id: string; title: string; status: 'active' | 'completed' | 'failed' | 'abandoned'; publicSummary?: string; }
export interface CampaignSession { id: string; number: number; title: string; status: 'draft' | 'active' | 'closed' | 'void'; openedDate: CampaignDate; closedDate?: CampaignDate; purpose: string; scenes: CampaignScene[]; objectives: CampaignSessionObjective[]; gmNotes: string; outcomeSummary?: string; aftermath: string[]; draftRecap?: string; createdAt: string; updatedAt: string; voidReason?: string; }
export interface CampaignHook { id: string; title: string; detail: string; status: 'open' | 'resolved' | 'withdrawn'; priority: 'low' | 'normal' | 'urgent'; sourceType?: string; sourceId?: string; dueDate?: CampaignDate; createdAt: string; updatedAt: string; }
export interface CampaignDebt { id: string; title: string; debtor: string; creditor: string; detail: string; status: 'open' | 'settled' | 'forgiven' | 'defaulted'; sourceType?: string; sourceId?: string; dueDate?: CampaignDate; createdAt: string; updatedAt: string; }
export type AuthorityResult = 'success' | 'partial-success' | 'failure' | 'withdrawal';
export interface AuthorityMandate { id: string; title: string; scope: string; objectives: string; supportRoute: string; reviewer?: string; costOrConsequence?: string; status: 'draft' | 'active' | 'debriefed' | 'void'; result?: AuthorityResult; debrief?: string; qualifying: boolean; createdAt: string; updatedAt: string; sessionId?: string; voidReason?: string; }
export interface RosetteInvocation { id: string; mandateId?: string; purpose: string; consequence: string; sessionId?: string; invokedAt: string; campaignDate: CampaignDate; }
export type CipherUseCategory = 'verify-record' | 'introduction-or-passage' | 'modest-item-or-disguise' | 'extraction-message-or-warning';
export interface CipherUse { id: string; sessionId: string; contact: string; category: CipherUseCategory; purpose: string; overrideReason?: string; debtOrComplication?: string; usedAt: string; campaignDate: CampaignDate; }
export interface Cipher17State { maximumMarks: 3 | 4; availableMarks: number; exposure: 0 | 1 | 2 | 3; status: 'available' | 'complication-required' | 'unavailable' | 'lost'; changedCodes: boolean; uses: CipherUse[]; complications: { id: string; detail: string; createdAt: string; resolvedAt?: string }[]; refreshes: { id: string; sessionId: string; reason: string; createdAt: string }[]; }
export type CampaignDirectoryType = 'npc' | 'faction' | 'institution' | 'location';
export interface CampaignDirectoryEntry { id: string; name: string; type: CampaignDirectoryType; sourcePaths: string[]; active: boolean; publicSummary?: string; createdAt: string; updatedAt: string; }
export type NpcRelationshipState = 'open' | 'wary' | 'owed' | 'indebted' | 'hostile';
export interface NpcRelationship { id: string; directoryId: string; state: NpcRelationshipState; protected: boolean; exposed: boolean; cause: string; nextPressureOrOffer?: string; sessionId?: string; effectiveDate: CampaignDate; updatedAt: string; }
export interface CorruptionWebEdge { id: string; fromDirectoryId: string; toDirectoryId: string; relationship: string; gmNotes: string; createdAt: string; updatedAt: string; }
export interface InfluenceTrack { id: string; subjectId: string; subjectName: string; value: number; favour: number; configuredThresholds?: number[]; updatedAt: string; }
export interface InfluenceEntry { id: string; trackId: string; kind: 'influence' | 'favour' | 'threshold-conversion' | 'inquisition-recognition'; amount: number; reason: string; sourceType?: string; sourceId?: string; effectiveDate: CampaignDate; createdAt: string; }
export interface EvidenceCustodyEntry { id: string; custodian: string; reason: string; sourceType?: string; sourceId?: string; campaignDate: CampaignDate; transferredAt: string; }
export interface EvidenceRecord { id: string; title: string; knownClaim: string; gmTruth: string; source: string; reliability: 'confirmed' | 'credible' | 'uncertain' | 'deceptive'; form: 'original' | 'copy' | 'testimony' | 'digital' | 'material'; currentCustodian: string; seekers: string[]; compromised: boolean; exposed: boolean; linkedDirectoryIds: string[]; linkedSessionIds: string[]; linkedOperationIds: string[]; unresolvedQuestions: string[]; custody: EvidenceCustodyEntry[]; status: 'active' | 'resolved' | 'destroyed' | 'archived'; createdAt: string; updatedAt: string; }
export interface MysteryRecord { id: string; title: string; question: string; gmTruth: string; essential: boolean; evidenceIds: string[]; currentLeads: string[]; status: 'open' | 'resolved' | 'abandoned'; createdAt: string; updatedAt: string; }
export type RpTransactionKind = 'battle-award' | 'liability-award' | 'exceptional-discovery' | 'exceptional-outcome' | 'asset-disposition' | 'objective-reward' | 'requisition-debit' | 'market-conversion' | 'market-settlement' | 'correction';
export interface RpTransaction { id: string; amount: number; kind: RpTransactionKind; reason: string; actorId: string; campaignDate: CampaignDate; createdAt: string; sourceType?: string; sourceId?: string; idempotencyKey?: string; voidedAt?: string; voidReason?: string; }
export type RequisitionKind = 'rank-advancement' | 'major-reinforcement' | 'certified' | 'protect-network' | 'durable-asset' | 'major-reclamation' | 'special-recovery' | 'custom';
export interface CampaignRequisition { id: string; title: string; kind: RequisitionKind; cost: number; source: string; target: string; effect: string; status: 'proposed' | 'approved' | 'spent' | 'void'; createdAt: string; updatedAt: string; approvedAt?: string; spentAt?: string; voidReason?: string; audit: { at: string; action: string; reason?: string }[]; }
export type ClaimedAssetClass = 'minor' | 'major' | 'exceptional';
export type ClaimedAssetStatus = 'recovered' | 'investigated' | 'disputed' | 'disposed' | 'retained' | 'consumed' | 'lost' | 'compromised';
export type ClaimedAssetDisposition = 'donation-standard' | 'donation-major' | 'exchange-ordinary' | 'exchange-generous' | 'anonymous-sale' | 'retain' | 'conceal' | 'rival-transfer';
export interface ClaimedAsset { id: string; title: string; assetClass: ClaimedAssetClass; targetSource: string; claimant: string; provenance: string; recovery: string; extraction: string; tacticalRisk: string; currentCustodian: string; condition: string; status: ClaimedAssetStatus; linkedEvidenceIds: string[]; linkedSessionId?: string; linkedEventId?: string; publicDescription: string; createdAt: string; updatedAt: string; disposition?: { kind: ClaimedAssetDisposition; recipientDirectoryId?: string; negotiatedRp?: number; reason: string; confirmedAt: string }; audit: { at: string; action: string; reason: string }[]; }
export type DiscoveryOwnerMode = 'personal' | 'shared';
export interface DiscoveryTemplate { id: string; title: string; faction: string; acquisitionPaths: string[]; stages: string; releaseCondition: string; useLimit: string; crossGameEffect: string; playerText: string; sourcePath: string; honourGate?: boolean; version: 1; }
export interface DiscoveryInstance { id: string; templateId: string; templateTitle: string; ownerMode: DiscoveryOwnerMode; ownerIdentityId?: string; status: 'unused' | 'spent' | 'compromised' | 'lost'; progression: string; linkedEvidenceIds: string[]; linkedAssetIds: string[]; namedDebt?: string; nextComplication?: string; publicDescription: string; createdAt: string; updatedAt: string; audit: { at: string; action: string; reason: string }[]; }
export interface CampaignEconomy { rpTransactions: RpTransaction[]; requisitions: CampaignRequisition[]; claimedAssets: ClaimedAsset[]; discoveryTemplates: DiscoveryTemplate[]; discoveries: DiscoveryInstance[]; }
export type OperationSystem = 'kill-team' | 'warhammer-40000' | 'imperium-maledictum';
export type OperationStatus = 'draft' | 'prepared' | 'committed' | 'in-progress' | 'resolved' | 'void';
export type OperationResult = 'victory' | 'partial-success' | 'defeat' | 'withdrawal' | 'objective-success';
export interface OperationObjective { id: string; title: string; kind: 'primary' | 'declared-bonus' | 'emergent-bonus' | 'aftermath'; status: 'open' | 'completed' | 'failed' | 'abandoned'; publicSummary: string; gmTruth?: string; claimant?: string; recoveryCondition?: string; extractionCondition?: string; tacticalRisk?: string; }
export interface MissionTruthSheet { enemyFacts: string; terrain: string; hiddenObjectives: string; escalation: string; extractionRules: string; privateConsequences: string; lockedAt?: string; corrections: { at: string; reason: string; prior: MissionTruthSheet }[]; }
export interface ForceProfile { id: string; ownerIdentityId: string; system: 'kill-team' | 'warhammer-40000'; displayName: string; factionRoute: string; sourceReference: string; status: 'active' | 'retired'; createdAt: string; updatedAt: string; }
export interface ForceUnit { id: string; profileId: string; title: string; factionRoute: string; approximatePoints: number; sourceReference: string; provenance: string; marketSettlementId?: string; availability: 'available' | 'recovering' | 'retired' | 'unavailable'; activeHonours: { title: string; crusadePoints: number }[]; createdAt: string; updatedAt: string; }
export interface RulesSourcePackage { id: string; title: string; vaultPath: string; sourceUrl?: string; edition: '10th' | '11th'; rulesetFamily: 'warhammer-40000'; status: 'active' | 'archived' | 'superseded' | 'import-failed'; contentHash: string; pageCount: number; importedAt: string; modifiedAt?: string; searchable: boolean; anchors: string[]; }
export type WorldPublicationStatus = 'draft' | 'published' | 'withdrawn';
export type WorldDetailStatus = 'map-only' | 'dossier';
export type WorldDossierReadiness = 'map-only' | 'in-workshop' | 'ready-for-approval' | 'published-dossier';
export interface WorldDossierApproval { sourcePath: string; basis: 'existing-source' | 'gm-approved-workshop'; approvedAt: string; approvedBy: string; version: number; }
export interface WorldLocation { id: string; title: string; publicDescription: string; gmSecrets: string; authorityAccess: string; contacts: string[]; activePressures: string[]; consequences: { at: string; detail: string; published: boolean }[]; linkedEvidenceIds: string[]; linkedAssetIds: string[]; handoutPaths: string[]; artPaths: string[]; sourceReferences: string[]; mapPosition?: { x: number; y: number }; detailStatus: WorldDetailStatus; readiness: WorldDossierReadiness; dossierApproval?: WorldDossierApproval; publicationStatus: WorldPublicationStatus; createdAt: string; updatedAt: string; audit: { at: string; action: string; reason?: string }[]; }
export interface TravelRoute { id: string; title: string; originLocationId: string; destinationLocationId: string; publicDescription: string; transitBand: string; durationDays: number; accessRequirements: string; gmPressure: string; sourceReference: string; publicationStatus: WorldPublicationStatus; createdAt: string; updatedAt: string; audit: { at: string; action: string; reason?: string }[]; }
export type TravelStatus = 'planned' | 'confirmed' | 'completed' | 'cancelled';
export interface TravelRecord { id: string; routeId?: string; corridorIds: string[]; originLocationId: string; destinationLocationId: string; segmentDurations: number[]; totalDurationDays: number; participantIds: string[]; operationId?: string; status: TravelStatus; projectedStart: CampaignDate; projectedEnd: CampaignDate; docketEntryId?: string; note: string; createdAt: string; updatedAt: string; audit: { at: string; action: string; reason?: string }[]; }
export type EventTemplateSystem = OperationSystem | 'any';
export interface EventTemplate { id: string; title: string; version: number; sourceReference: string; systems: EventTemplateSystem[]; publicBriefing: string; gmTruth: string; stages: { id: string; title: string; publicSummary: string; gmGuidance: string }[]; declineGuidance: string; aftermathGuidance: string; active: boolean; createdAt: string; updatedAt: string; }
export type CampaignEventStatus = 'draft' | 'prepared' | 'in-progress' | 'resolved' | 'declined' | 'void';
export interface CampaignEventRun { id: string; templateId: string; templateVersion: number; title: string; operationId?: string; locationId?: string; status: CampaignEventStatus; playerBriefing: string; gmTruth: string; stageStates: { stageId: string; status: 'pending' | 'active' | 'completed' | 'failed' }[]; linkedClocks: { clockId: string; note: string; appliedAt?: string }[]; sourceSnapshot: { sourceReference: string; contentHash?: string; anchor?: string }; result?: OperationResult; declinedReason?: string; createdAt: string; updatedAt: string; audit: { at: string; action: string; reason?: string }[]; }
export interface OperationSourceSnapshot { id: string; operationId: string; sourceReference: string; sourcePackageId?: string; contentHash?: string; anchor?: string; capturedAt: string; }
export interface ColdEmberLedger { id: 'cold-ember'; phase: string; transitionAvailability: string; protectedParties: string[]; evidenceDisposition: string; compactsOwed: string[]; historyVersions: string[]; resourcesLost: string[]; sabineSecretKnownBy: string[]; miniatureMilestones: string[]; endingPossibilities: string[]; decisions: { id: string; at: string; title: string; detail: string; sourceReference: string; published: boolean }[]; updatedAt: string; }
export interface TypedProject { id: string; templateId: 'hearthshield' | 'custom'; title: string; status: 'inactive' | 'active' | 'ready' | 'activated' | 'suspended' | 'completed' | 'lost'; tracks: { id: string; title: string; value: number; maximum: number }[]; contactStates: { id: string; title: string; active: boolean; detail: string }[]; controlState: string; accordAvailable: boolean; stationStatus: string; breachFronts: { id: string; title: string; status: 'active' | 'resolved'; detail: string; createdAt: string; resolvedAt?: string }[]; activationHistory: { at: string; detail: string; sourceReference: string }[]; sourceReferences: string[]; updatedAt: string; audit: { at: string; action: string; reason?: string }[]; }
export interface RegionalPressure { id: string; locationId: string; kind: 'scar-activity' | 'command-training' | 'quarantine-custody' | 'technical-exchange' | 'custom'; title: string; currentStatus: string; severity?: number; publicSummary: string; gmNotes: string; sourceReference: string; published: boolean; /** A GM-approved, player-known issue that belongs in the live Atlas feed. */ playerFacingUrgent: boolean; updatedAt: string; audit: { at: string; action: string; reason?: string }[]; }
export type CollectionUnitKind = 'independent' | 'squad' | 'leader' | 'attendant';
export interface ProgressionRank { id: string; title: string; minimumXp: number; honourSlots: number; }
export interface PublishedHonourCard { id: string; title: string; xpCost: number; playerSummary: string; sourceReference: string; published: boolean; }
export interface ProgressionPolicy { id: string; title: string; system: 'warhammer-40000'; version: number; status: 'active' | 'superseded'; sourceReference: string; ranks: ProgressionRank[]; honourCards: PublishedHonourCard[]; createdAt: string; updatedAt: string; }
export interface UnitProgressionEntry { id: string; kind: 'xp-gain' | 'xp-spend' | 'honour-awarded' | 'correction' | 'void'; amount: number; sourceType: 'operation' | 'game' | 'manual' | 'honour'; sourceId?: string; requestId?: string; reason: string; policyId: string; policyVersion: number; actorId: string; createdAt: string; voidedAt?: string; voidReason?: string; }
export interface UnitAttachment { id: string; parentUnitId: string; childUnitId: string; role: 'leader' | 'attendant'; scope: 'permanent' | 'roster'; rosterId?: string; createdAt: string; createdBy: string; }
export interface ProgressionRequest { id: string; ownerIdentityId: string; unitId: string; kind: 'xp-gain' | 'xp-spend' | 'honour'; amount: number; reason: string; sourceType: 'operation' | 'game' | 'manual'; sourceId?: string; honourCardId?: string; status: 'submitted' | 'approved' | 'rejected' | 'void'; gmReason?: string; createdAt: string; updatedAt: string; }
export interface CollectionUnit extends ForceUnit { battlefieldRole?: string; compositionNote?: string; rulesPackageId?: string; rulesPage?: number; rulesStatus: 'active-11th' | 'legacy-fallback'; scars: string[]; gmNotes?: string; unitKind?: CollectionUnitKind; earnedXp?: number; progression?: UnitProgressionEntry[]; }
export interface CollectionProposal { id: string; ownerIdentityId: string; profileId: string; title: string; factionRoute: string; approximatePoints: number; importedLabel?: string; importId?: string; status: 'proposed' | 'approved' | 'rejected' | 'withdrawn'; decisionReason?: string; createdAt: string; updatedAt: string; }
export interface RosterImport { id: string; ownerIdentityId: string; filename: string; contentHash: string; format: 'ros' | 'rosz'; factionLabel?: string; detachmentLabel?: string; selectedUnits: { label: string; points: number }[]; matchedUnitIds: string[]; proposalIds: string[]; warnings: string[]; createdAt: string; }
export interface RosterDraft { id: string; ownerIdentityId: string; profileId: string; title: string; unitIds: string[]; detachmentName?: string; declaredBurdens: { kind: string; commitment: string }[]; totalPoints: number; rulesPackageIds: string[]; legacyFallback: boolean; status: 'draft' | 'submitted' | 'approved' | 'deployed' | 'archived'; importId?: string; approvalReason?: string; attachmentIds?: string[]; createdAt: string; updatedAt: string; }
export interface RosterSnapshot { id: string; rosterId: string; operationId?: string; ownerIdentityId: string; title: string; unitIds: string[]; totalPoints: number; rulesPackageIds: string[]; legacyFallback: boolean; attachmentSnapshot?: UnitAttachment[]; progressionPolicyId?: string; progressionPolicyVersion?: number; createdAt: string; approvedAt: string; deployedAt?: string; }
export interface OperationDeployment { id: string; operationId: string; profileId: string; unitIds: string[]; rosterSnapshotId?: string; detachmentName?: string; operativeCount?: number; groundForcePoints?: number; airSupportPoints?: number; airSupportEntry?: 'call-the-cavalry' | 'transport-reserves'; burdens: { kind: string; commitment: string }[]; gmControlledScenarioAssets: string[]; }
export interface RecoveryRecord { id: string; operationId: string; unitId: string; reason: string; startsAt: CampaignDate; readyAt: CampaignDate; status: 'active' | 'ready' | 'void'; createdAt: string; updatedAt: string; voidReason?: string; }
export interface OperationAftermath { id: string; operationId: string; kind: 'battle-rp' | 'claimed-asset' | 'discovery' | 'recovery' | 'clock' | 'evidence' | 'mystery' | 'relationship' | 'influence' | 'favour' | 'publication' | 'narrative'; title: string; detail: string; status: 'proposed' | 'confirmed' | 'rejected'; payload?: Record<string, unknown>; createdAt: string; updatedAt: string; decisionReason?: string; }
export interface DeploymentPolicy { scope: 'operation-wide' | 'per-player'; kind: 'unlimited' | 'points' | 'units'; cap?: number; }
export interface CampaignOperation { id: string; title: string; system: OperationSystem; status: OperationStatus; narrativePurpose: string; statedStakes: string; playerBriefing: string; sourceReference: string; participants: string[]; objectives: OperationObjective[]; missionTruth: MissionTruthSheet; timePlan: { preparationDays: number; outboundDays: number; operationDays: number; recoveryDays: number; returnDays: number }; deploymentIds: string[]; deploymentPolicy?: DeploymentPolicy; eventInstanceId?: string; result?: OperationResult; imStages?: { access: boolean; decisive: boolean; extraction: boolean }; createdAt: string; updatedAt: string; committedAt?: string; resolvedAt?: string; voidReason?: string; audit: { at: string; action: string; reason?: string }[]; }
export interface CampaignControlState { sessions: CampaignSession[]; publications: CampaignPublication[]; acknowledgements: PublicationAcknowledgement[]; hooks: CampaignHook[]; debts: CampaignDebt[]; mandates: AuthorityMandate[]; rosetteInvocations: RosetteInvocation[]; cipher17: Cipher17State; directory: CampaignDirectoryEntry[]; relationships: NpcRelationship[]; corruptionEdges: CorruptionWebEdge[]; influenceTracks: InfluenceTrack[]; influenceEntries: InfluenceEntry[]; evidence: EvidenceRecord[]; mysteries: MysteryRecord[]; economy: CampaignEconomy; operations: CampaignOperation[]; forceProfiles: ForceProfile[]; forceUnits: ForceUnit[]; collectionUnits: CollectionUnit[]; rulesSourcePackages: RulesSourcePackage[]; collectionProposals: CollectionProposal[]; rosterImports: RosterImport[]; rosterDrafts: RosterDraft[]; rosterSnapshots: RosterSnapshot[]; unitAttachments: UnitAttachment[]; progressionPolicies: ProgressionPolicy[]; progressionRequests: ProgressionRequest[]; operationDeployments: OperationDeployment[]; recoveryRecords: RecoveryRecord[]; operationAftermath: OperationAftermath[]; worldLocations: WorldLocation[]; travelRoutes: TravelRoute[]; travelRecords: TravelRecord[]; eventTemplates: EventTemplate[]; eventRuns: CampaignEventRun[]; operationSourceSnapshots: OperationSourceSnapshot[]; coldEmber?: ColdEmberLedger; typedProjects: TypedProject[]; regionalPressures: RegionalPressure[]; }
