import {
  COST_NONE,
  FUNCTION_NO_FIT,
  OTHER,
  SKIP,
  type CapacityOption,
  type CapacityReading,
  type ChoiceOption,
  type ContentBundle,
  type Coverage,
  type Evidence,
  type Family,
  type FollowUpAspect,
  type Indication,
  type Reflection,
  type SessionState,
} from "./types";

/** Options every follow-up offers in addition to the family's own. */
export const COMMON_FUNCTION_OPTIONS: ChoiceOption[] = [
  { id: OTHER, label: "Something else" },
  { id: FUNCTION_NO_FIT, label: "This doesn't really fit me" },
];
export const COMMON_COST_OPTIONS: ChoiceOption[] = [
  { id: OTHER, label: "Something else" },
  { id: COST_NONE, label: "Nothing I want to change" },
];

export const followUpKey = (familyId: string, aspect: FollowUpAspect) => `${familyId}:${aspect}`;

export function followUpOptions(family: Family, aspect: FollowUpAspect): ChoiceOption[] {
  return aspect === "function"
    ? [...family.functionOptions, ...COMMON_FUNCTION_OPTIONS]
    : [...family.costOptions.map(({ id, label }) => ({ id, label })), ...COMMON_COST_OPTIONS];
}

export function capacityOptionsFor(bundle: ContentBundle, lensId: string): CapacityOption[] {
  const lens = bundle.lenses.find((candidate) => candidate.id === lensId);
  return bundle.meta.capacityScale.filter((option) => !option.privateOnly || lens?.allowPrivate === true);
}

interface FamilyScore {
  family: Family;
  evidence: Evidence[];
  usable: number[];
  itemCount: number;
  score: number;
  strength: "indicated" | "question" | null;
}

function scoreFamilies(bundle: ContentBundle, state: SessionState): FamilyScore[] {
  const { strongValue, supportValue } = bundle.meta.rules;
  const scale = new Map(bundle.meta.frequencyScale.map((option) => [option.id, option]));

  return bundle.families.map((family) => {
    const items = bundle.items
      .filter((item) => item.familyId === family.id)
      .sort((left, right) => left.order - right.order);

    const evidence: Evidence[] = [];
    for (const item of items) {
      const option = scale.get(state.core[item.id] ?? "");
      if (!option) continue; // skipped or not reached
      evidence.push({
        itemId: item.id,
        prompt: item.prompt,
        responseId: option.id,
        responseLabel: option.label,
        value: option.value,
      });
    }

    const usable = evidence.map((entry) => entry.value).filter((value): value is number => value !== null);
    const hasStrong = usable.some((value) => value >= strongValue);
    const allAnswered = usable.length === items.length;
    const allSupport = usable.every((value) => value >= supportValue);

    // Pilot rule: every item answered, at least one strong, the rest supporting.
    let strength: FamilyScore["strength"] = null;
    if (hasStrong) strength = allAnswered && allSupport ? "indicated" : "question";

    const mean = usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
    return { family, evidence, usable, itemCount: items.length, score: Math.round(mean * 100) / 100, strength };
  });
}

/** Keeps the strongest `max`, plus anything tied with the last one kept. */
function topWithTies(scores: FamilyScore[], max: number): FamilyScore[] {
  const ranked = [...scores].sort((left, right) => right.score - left.score); // stable: bundle order breaks ties
  if (ranked.length <= max) return ranked;
  const cutoff = ranked[max - 1]!.score;
  return ranked.filter((entry, index) => index < max || entry.score === cutoff);
}

/**
 * Families that get targeted follow-up questions: the strongest indicated
 * families, capped so a sitting never asks more than two per family shown.
 */
export function followUpFamilies(bundle: ContentBundle, state: SessionState): Family[] {
  const indicated = scoreFamilies(bundle, state).filter((entry) => entry.strength === "indicated");
  return topWithTies(indicated, bundle.meta.rules.maxIndications)
    .slice(0, bundle.meta.rules.maxIndications)
    .map((entry) => entry.family);
}

function readCapacities(bundle: ContentBundle, state: SessionState): CapacityReading[] {
  const options = new Map(bundle.meta.capacityScale.map((option) => [option.id, option]));
  return [...bundle.lenses]
    .sort((left, right) => left.position - right.position)
    .map((lens) => {
      const option = options.get(state.capacities[lens.id] ?? "");
      // A private answer on a lens that does not offer it is ignored.
      const valid = option && (!option.privateOnly || lens.allowPrivate) ? option : undefined;
      return {
        lensId: lens.id,
        state: valid?.state ?? "unspecified",
        responseId: valid?.id ?? null,
        responseLabel: valid?.label ?? null,
        keptPrivate: valid?.privateOnly === true,
      };
    });
}

function toIndication(
  entry: FamilyScore,
  shown: FamilyScore[],
  state: SessionState,
  capacities: CapacityReading[],
): Indication {
  const { family } = entry;
  const functionId = state.followUps[followUpKey(family.id, "function")] ?? null;
  const costId = state.followUps[followUpKey(family.id, "cost")] ?? null;
  const pick = (options: ChoiceOption[], id: string | null) =>
    options.find((option) => option.id === id)?.label ?? null;
  const cost = family.costOptions.find((option) => option.id === costId);

  return {
    familyId: family.id,
    strength: entry.strength === "indicated" ? "indicated" : "question",
    questionReason:
      entry.strength === "question"
        ? entry.usable.length < entry.itemCount
          ? "single-answer"
          : "mixed-answers"
        : null,
    score: entry.score,
    tiedWith: shown
      .filter((other) => other !== entry && other.score === entry.score)
      .map((other) => other.family.id),
    evidence: entry.evidence,
    functionId: functionId === SKIP ? null : functionId,
    functionLabel: pick(followUpOptions(family, "function"), functionId),
    costId: costId === SKIP ? null : costId,
    costLabel: pick(followUpOptions(family, "cost"), costId),
    tradeoff: cost?.tradeoff ?? family.growthEdge,
    noChangeWanted: costId === COST_NONE,
    needsQuestion: functionId === FUNCTION_NO_FIT,
    relatedCapacities: family.lensIds
      .map((lensId) => capacities.find((reading) => reading.lensId === lensId))
      .filter((reading): reading is CapacityReading => reading !== undefined),
    actionIds: [...family.actionIds],
  };
}

/**
 * Turns one sitting's answers into a reading. Pure: the same bundle and state
 * always give the same result, on any platform.
 */
export function reflect(bundle: ContentBundle, state: SessionState): Reflection {
  const { maxIndications, thinCoverageBelow } = bundle.meta.rules;
  const scale = new Map(bundle.meta.frequencyScale.map((option) => [option.id, option]));
  const scores = scoreFamilies(bundle, state);
  const capacities = readCapacities(bundle, state);

  const indicated = scores.filter((entry) => entry.strength === "indicated");
  const shownIndicated = topWithTies(indicated, maxIndications);
  const shownQuestions = topWithTies(
    scores.filter((entry) => entry.strength === "question"),
    maxIndications,
  );

  const coverage: Coverage = { usable: 0, total: bundle.items.length, skipped: 0, noOpportunity: 0, unanswered: 0, thin: false };
  for (const item of bundle.items) {
    const response = state.core[item.id];
    const option = scale.get(response ?? "");
    if (option && option.value !== null) coverage.usable += 1;
    else if (option) coverage.noOpportunity += 1;
    else if (response === SKIP) coverage.skipped += 1;
    else coverage.unanswered += 1;
  }
  coverage.thin = coverage.usable < thinCoverageBelow;

  const capacityAsked = state.capacityOptIn === true;
  const missing: string[] = [];
  if (state.settingId === null) missing.push("No setting was chosen, so this reading is not tied to one place.");
  if (coverage.thin) {
    missing.push(
      `Only ${coverage.usable} of ${coverage.total} questions had a usable answer. Treat this reading as a first sketch.`,
    );
  }
  const unseen = scores.filter((entry) => entry.usable.length === 0).map((entry) => entry.family.name);
  if (unseen.length > 0 && unseen.length < scores.length) {
    missing.push(`No usable answers for ${unseen.join(", ")}, so this reading says nothing about them.`);
  }
  if (indicated.length > shownIndicated.length) {
    const hidden = indicated.length - shownIndicated.length;
    missing.push(
      `${hidden} more ${hidden === 1 ? "family" : "families"} also met the rule. The strongest are shown first so the reading stays usable.`,
    );
  }
  const unansweredFollowUps = shownIndicated.filter((entry) => {
    const answer = state.followUps[followUpKey(entry.family.id, "function")];
    return answer === undefined || answer === SKIP;
  });
  if (unansweredFollowUps.length > 0) {
    missing.push(
      `Follow-up questions were not answered for ${unansweredFollowUps.map((entry) => entry.family.name).join(", ")}, so those sections use general wording.`,
    );
  }
  if (!capacityAsked) {
    missing.push("The capacity reflection was not taken, so all eight capacities are unspecified.");
  } else {
    const open = capacities.filter((reading) => reading.state === "unspecified").length;
    if (open > 0) {
      missing.push(
        `${open} of ${capacities.length} capacities are unspecified because they were skipped, uncertain or kept private.`,
      );
    }
  }

  return {
    contentVersion: bundle.meta.contentVersion,
    rulesVersion: bundle.meta.rulesVersion,
    settingId: state.settingId,
    coverage,
    indications: shownIndicated.map((entry) => toIndication(entry, shownIndicated, state, capacities)),
    questions: shownQuestions.map((entry) => toIndication(entry, shownQuestions, state, capacities)),
    capacities,
    capacityAsked,
    missing,
  };
}
