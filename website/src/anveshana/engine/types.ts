/**
 * Anveshana data contracts.
 *
 * Everything in `engine/` and `content/` is plain TypeScript and JSON with no
 * DOM, storage or network access, so the same files can run in a browser, a
 * React Native app, a WebView shell or a test runner.
 */

// ── Content bundle ──────────────────────────────────────────────────────────

export interface ScaleOption {
  id: string;
  label: string;
  /** Numeric weight used by the rules. `null` means "not usable evidence". */
  value: number | null;
}

export interface Setting {
  id: string;
  label: string;
  hint: string;
}

export interface CapacityOption {
  id: string;
  label: string;
  state: CapacityState;
  /** Only offered for lenses marked `allowPrivate`. */
  privateOnly?: boolean;
}

export interface BundleMeta {
  /** Version of the wording: bump when prompts, options or actions change. */
  contentVersion: string;
  /** Version of the rules: bump when thresholds or mappings change. */
  rulesVersion: string;
  timeframe: string;
  settings: Setting[];
  frequencyScale: ScaleOption[];
  capacityScale: CapacityOption[];
  rules: {
    /** Lowest value that counts as a strong answer (Often). */
    strongValue: number;
    /** Lowest value that counts as supporting a strong answer (Sometimes). */
    supportValue: number;
    /** Most indications shown, before ties at the cut-off are added. */
    maxIndications: number;
    /** Fewer usable core answers than this is reported as thin coverage. */
    thinCoverageBelow: number;
  };
}

export interface ChoiceOption {
  id: string;
  label: string;
}

export interface CostOption extends ChoiceOption {
  /** Shown under "Where growth gets harder" when the person picks this cost. */
  tradeoff: string;
}

export interface FamilyShift {
  familyId: string;
  circumstance: string;
}

export interface Family {
  id: string;
  name: string;
  emoji: string;
  /** Short plain-language description of the response. */
  plain: string;
  tagline: string;
  /** First-person sentence that carries the protective logic. */
  voice: string;
  /** What the response may protect. */
  protects: string;
  /** Default growth tradeoff, used when no cost answer narrows it. */
  growthEdge: string;
  /** What makes another option available. */
  opening: string;
  /** Contemplative reading through the chakra lenses. */
  chakraReading: string;
  /** The same reading in everyday language. */
  plainReading: string;
  lensIds: string[];
  functionPrompt: string;
  functionOptions: ChoiceOption[];
  costPrompt: string;
  costOptions: CostOption[];
  shifts: FamilyShift[];
  actionIds: string[];
}

export interface CoreItem {
  id: string;
  familyId: string;
  /** Position in the questionnaire, so paired items are not adjacent. */
  order: number;
  prompt: string;
}

export interface Lens {
  id: string;
  /** Position from below the root (1) to above the head (8). */
  position: number;
  sanskrit: string;
  english: string;
  /** Label used when chakra language is switched off. */
  plainLabel: string;
  color: string;
  represents: string;
  prompt: string;
  /** Things that could change the answer. */
  supports: string;
  /** Crowns can be kept private and are always optional. */
  allowPrivate: boolean;
}

export interface Action {
  id: string;
  familyId: string;
  title: string;
  prompt: string;
  /** The condition that makes this usable. */
  useWhen: string;
  /** How to tell whether it helped. */
  checkIn: string;
  /** Another family this experiment can bring in. */
  bringsIn?: string;
}

/** A named scene from the Protection Atlas where a family often shows up. */
export interface Pattern {
  id: string;
  familyId: string;
  title: string;
  /** A question that helps tell this pattern apart from its neighbours. */
  question: string;
}

export interface ContentBundle {
  meta: BundleMeta;
  families: Family[];
  items: CoreItem[];
  lenses: Lens[];
  actions: Action[];
  patterns: Pattern[];
}

// ── Session ─────────────────────────────────────────────────────────────────

/** Reserved response ids shared by every question. */
export const SKIP = "skip";
export const COST_NONE = "none";
export const FUNCTION_NO_FIT = "no_fit";
export const OTHER = "other";

export type FollowUpAspect = "function" | "cost";

/** A plain, serialisable record of one sitting. Held in memory only. */
export interface SessionState {
  settingId: string | null;
  /** itemId → response id (a frequency id or `skip`). */
  core: Record<string, string>;
  /** `${familyId}:${aspect}` → option id. */
  followUps: Record<string, string>;
  capacityOptIn: boolean | null;
  /** lensId → capacity option id. */
  capacities: Record<string, string>;
  /** True once the person chose to stop the core questions early. */
  coreClosed: boolean;
  cursor: number;
}

export type Step =
  | { kind: "setting"; options: Setting[]; selected: string | null }
  | {
      kind: "core";
      item: CoreItem;
      index: number;
      total: number;
      options: ScaleOption[];
      selected: string | null;
    }
  | {
      kind: "followup";
      family: Family;
      aspect: FollowUpAspect;
      prompt: string;
      options: ChoiceOption[];
      index: number;
      total: number;
      selected: string | null;
    }
  | { kind: "capacity-offer"; selected: boolean | null }
  | {
      kind: "capacity";
      lens: Lens;
      options: CapacityOption[];
      index: number;
      total: number;
      selected: string | null;
    }
  | { kind: "result" };

// ── Reflection ──────────────────────────────────────────────────────────────

export type CapacityState = "active" | "mixed" | "constrained" | "unspecified";

export interface Evidence {
  itemId: string;
  prompt: string;
  responseId: string;
  responseLabel: string;
  value: number | null;
}

export interface CapacityReading {
  lensId: string;
  state: CapacityState;
  responseId: string | null;
  responseLabel: string | null;
  keptPrivate: boolean;
}

export type QuestionReason = "single-answer" | "mixed-answers";

export interface Indication {
  familyId: string;
  /** `indicated` met the pilot rule. `question` is thinner evidence to ask about. */
  strength: "indicated" | "question";
  questionReason: QuestionReason | null;
  score: number;
  /** Other shown families with the same score. Ties stay visible. */
  tiedWith: string[];
  evidence: Evidence[];
  functionId: string | null;
  functionLabel: string | null;
  costId: string | null;
  costLabel: string | null;
  /** The growth tradeoff to show: the chosen cost's, or the family default. */
  tradeoff: string;
  /** The person said there is nothing here they want to change. */
  noChangeWanted: boolean;
  /** A follow-up answer disagrees with the indication. Ask, do not resolve. */
  needsQuestion: boolean;
  /** This family's lenses, with the state the person reported for each. */
  relatedCapacities: CapacityReading[];
  actionIds: string[];
}

export interface Coverage {
  /** Core answers the rules could use. */
  usable: number;
  total: number;
  skipped: number;
  noOpportunity: number;
  unanswered: number;
  thin: boolean;
}

export interface Reflection {
  contentVersion: string;
  rulesVersion: string;
  settingId: string | null;
  coverage: Coverage;
  indications: Indication[];
  questions: Indication[];
  capacities: CapacityReading[];
  capacityAsked: boolean;
  /** Plain-language notes about what this reading could not see. */
  missing: string[];
}

/** How the person responded to a suggestion on the result screen. */
export type Fit = "fits" | "partly" | "dismissed";

export interface ReflectionFeedback {
  fit: Record<string, Fit>;
  chosenActionId: string | null;
}
