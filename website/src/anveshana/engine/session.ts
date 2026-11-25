import { capacityOptionsFor, followUpFamilies, followUpKey, followUpOptions, reflect } from "./reflect";
import {
  FUNCTION_NO_FIT,
  SKIP,
  type ContentBundle,
  type FollowUpAspect,
  type Reflection,
  type SessionState,
  type Step,
} from "./types";

type PlanEntry =
  | { kind: "setting" }
  | { kind: "core"; itemId: string }
  | { kind: "followup"; familyId: string; aspect: FollowUpAspect }
  | { kind: "capacity-offer" }
  | { kind: "capacity"; lensId: string }
  | { kind: "result" };

export function emptyState(): SessionState {
  return {
    settingId: null,
    core: {},
    followUps: {},
    capacityOptIn: null,
    capacities: {},
    coreClosed: false,
    cursor: 0,
  };
}

/**
 * One sitting of the questionnaire, with no user interface attached.
 *
 * A front end (web component, React Native screen, native view) only needs to
 * render `step()` and call `answer`, `skip`, `back` or `finishCoreEarly`. The
 * order of questions, the targeted follow-ups and the reading all live here,
 * so every platform behaves the same. Nothing is stored or sent anywhere.
 */
export class Session {
  readonly bundle: ContentBundle;
  state: SessionState;

  constructor(bundle: ContentBundle, state: SessionState = emptyState()) {
    this.bundle = bundle;
    this.state = state;
  }

  /** The ordered steps for the answers given so far. Recomputed on demand. */
  private plan(): PlanEntry[] {
    const { bundle, state } = this;
    const entries: PlanEntry[] = [{ kind: "setting" }];

    const items = [...bundle.items].sort((left, right) => left.order - right.order);
    for (const item of items) {
      if (state.coreClosed && state.core[item.id] === undefined) continue;
      entries.push({ kind: "core", itemId: item.id });
    }

    for (const family of followUpFamilies(bundle, state)) {
      entries.push({ kind: "followup", familyId: family.id, aspect: "function" });
      // Asking what it cost makes no sense once someone says it does not fit.
      if (state.followUps[followUpKey(family.id, "function")] !== FUNCTION_NO_FIT) {
        entries.push({ kind: "followup", familyId: family.id, aspect: "cost" });
      }
    }

    entries.push({ kind: "capacity-offer" });
    if (state.capacityOptIn === true) {
      const lenses = [...bundle.lenses].sort((left, right) => left.position - right.position);
      for (const lens of lenses) entries.push({ kind: "capacity", lensId: lens.id });
    }

    entries.push({ kind: "result" });
    return entries;
  }

  private current(): { entry: PlanEntry; plan: PlanEntry[] } {
    const plan = this.plan();
    this.state.cursor = Math.min(Math.max(this.state.cursor, 0), plan.length - 1);
    return { entry: plan[this.state.cursor]!, plan };
  }

  step(): Step {
    const { bundle, state } = this;
    const { entry, plan } = this.current();
    const position = (kind: PlanEntry["kind"]) => {
      const sameKind = plan.filter((candidate) => candidate.kind === kind);
      return { index: sameKind.indexOf(entry) + 1, total: sameKind.length };
    };

    switch (entry.kind) {
      case "setting":
        return { kind: "setting", options: bundle.meta.settings, selected: state.settingId };
      case "core": {
        const item = bundle.items.find((candidate) => candidate.id === entry.itemId)!;
        return {
          kind: "core",
          item,
          ...position("core"),
          // The total stays the full questionnaire until the person stops early.
          total: state.coreClosed ? position("core").total : bundle.items.length,
          options: bundle.meta.frequencyScale,
          selected: state.core[item.id] ?? null,
        };
      }
      case "followup": {
        const family = bundle.families.find((candidate) => candidate.id === entry.familyId)!;
        return {
          kind: "followup",
          family,
          aspect: entry.aspect,
          prompt: entry.aspect === "function" ? family.functionPrompt : family.costPrompt,
          options: followUpOptions(family, entry.aspect),
          ...position("followup"),
          selected: state.followUps[followUpKey(family.id, entry.aspect)] ?? null,
        };
      }
      case "capacity-offer":
        return { kind: "capacity-offer", selected: state.capacityOptIn };
      case "capacity": {
        const lens = bundle.lenses.find((candidate) => candidate.id === entry.lensId)!;
        return {
          kind: "capacity",
          lens,
          options: capacityOptionsFor(bundle, lens.id),
          ...position("capacity"),
          selected: state.capacities[lens.id] ?? null,
        };
      }
      case "result":
        return { kind: "result" };
    }
  }

  /** Records an answer for the current step and moves on. */
  answer(responseId: string): void {
    const { state } = this;
    const step = this.step();

    const requireOption = (ids: string[]) => {
      if (responseId !== SKIP && !ids.includes(responseId)) {
        throw new Error(`"${responseId}" is not an option for this ${step.kind} step`);
      }
    };

    switch (step.kind) {
      case "setting":
        requireOption(step.options.map((option) => option.id));
        state.settingId = responseId === SKIP ? null : responseId;
        break;
      case "core":
        requireOption(step.options.map((option) => option.id));
        state.core[step.item.id] = responseId;
        break;
      case "followup":
        requireOption(step.options.map((option) => option.id));
        state.followUps[followUpKey(step.family.id, step.aspect)] = responseId;
        break;
      case "capacity-offer":
        requireOption(["yes", "no"]);
        state.capacityOptIn = responseId === "yes";
        break;
      case "capacity":
        requireOption(step.options.map((option) => option.id));
        state.capacities[step.lens.id] = responseId;
        break;
      case "result":
        return;
    }
    state.cursor += 1;
    this.current(); // clamp against the recomputed plan
  }

  skip(): void {
    this.answer(SKIP);
  }

  canGoBack(): boolean {
    return this.state.cursor > 0;
  }

  back(): void {
    if (this.state.cursor > 0) this.state.cursor -= 1;
  }

  /** Stops the core questions and moves to whatever comes next. */
  finishCoreEarly(): void {
    if (this.step().kind !== "core") return;
    this.state.coreClosed = true;
    const plan = this.plan();
    const next = plan.findIndex((entry) => entry.kind !== "setting" && entry.kind !== "core");
    this.state.cursor = next === -1 ? plan.length - 1 : next;
  }

  /** How far through the sitting the person is, from 0 to 1. */
  progress(): number {
    const { plan } = this.current();
    return plan.length <= 1 ? 1 : this.state.cursor / (plan.length - 1);
  }

  reflection(): Reflection {
    return reflect(this.bundle, this.state);
  }

  /** Clears every answer. */
  reset(): void {
    this.state = emptyState();
  }
}
