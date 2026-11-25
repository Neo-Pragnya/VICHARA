import { describe, expect, it } from "vitest";
import { bundle } from "../content";
import {
  COST_NONE,
  FUNCTION_NO_FIT,
  SKIP,
  Session,
  emptyState,
  followUpFamilies,
  reflect,
  toPlainText,
  validateBundle,
  type ContentBundle,
  type SessionState,
} from "./index";

/** Builds a state from `family: [first answer, second answer]` pairs. */
function stateFrom(answers: Record<string, [string?, string?]>, extra: Partial<SessionState> = {}): SessionState {
  const state = { ...emptyState(), settingId: "work", ...extra };
  for (const [familyId, [first, second]] of Object.entries(answers)) {
    if (first) state.core[`${familyId}-1`] = first;
    if (second) state.core[`${familyId}-2`] = second;
  }
  return state;
}

const ids = (list: { familyId: string }[]) => list.map((entry) => entry.familyId);

describe("content bundle", () => {
  it("is complete and every id resolves", () => {
    expect(validateBundle(bundle)).toEqual([]);
  });

  it("has eleven families, two core items each, and both crowns", () => {
    expect(bundle.families).toHaveLength(11);
    expect(bundle.items).toHaveLength(22);
    expect(bundle.lenses).toHaveLength(8);
    expect(bundle.lenses.filter((lens) => lens.allowPrivate).map((lens) => lens.id)).toEqual(["kula", "akula"]);
  });

  it("never places a family's two items next to each other", () => {
    const ordered = [...bundle.items].sort((left, right) => left.order - right.order);
    ordered.forEach((item, index) => {
      if (index > 0) expect(item.familyId).not.toBe(ordered[index - 1]!.familyId);
    });
  });

  it("reports broken references", () => {
    const broken = structuredClone(bundle) as ContentBundle;
    broken.items[0]!.familyId = "missing";
    broken.families[0]!.actionIds.push("nope");
    broken.families[1]!.lensIds = ["nowhere"];
    broken.actions[0]!.bringsIn = "ghost";
    broken.patterns[0]!.familyId = "lost";
    broken.patterns[1]!.question = "TODO write this";
    broken.patterns = broken.patterns.filter((pattern) => pattern.familyId !== "fathom");
    const problems = validateBundle(broken).join("\n");
    expect(problems).toContain('unknown family "missing"');
    expect(problems).toContain('unknown action "nope"');
    expect(problems).toContain('unknown lens "nowhere"');
    expect(problems).toContain('unknown bringsIn family "ghost"');
    expect(problems).toContain('unknown family "lost"');
    expect(problems).toContain("still contains TODO");
    expect(problems).toContain("family fathom: needs at least one pattern");
  });
});

describe("family indications", () => {
  it("surfaces a family when one answer is strong and the other supports it", () => {
    const result = reflect(bundle, stateFrom({ fawn: ["often", "sometimes"] }));
    expect(ids(result.indications)).toEqual(["fawn"]);
    expect(result.indications[0]!.evidence.map((entry) => entry.responseLabel)).toEqual(["Often", "Sometimes"]);
  });

  it("does not surface a family on two moderate answers", () => {
    const result = reflect(bundle, stateFrom({ fawn: ["sometimes", "sometimes"] }));
    expect(result.indications).toEqual([]);
    expect(result.questions).toEqual([]);
  });

  it("turns a single usable strong answer into a question, not a finding", () => {
    const skipped = reflect(bundle, stateFrom({ flag: ["almost_always", SKIP] }));
    expect(skipped.indications).toEqual([]);
    expect(skipped.questions[0]).toMatchObject({ familyId: "flag", questionReason: "single-answer" });

    const noOpportunity = reflect(bundle, stateFrom({ flag: ["often", "no_opportunity"] }));
    expect(noOpportunity.questions[0]).toMatchObject({ familyId: "flag", questionReason: "single-answer" });
  });

  it("treats a strong answer beside a low one as a question", () => {
    const result = reflect(bundle, stateFrom({ freeze: ["often", "never"] }));
    expect(result.indications).toEqual([]);
    expect(result.questions[0]).toMatchObject({ familyId: "freeze", questionReason: "mixed-answers" });
  });

  it("counts 'no opportunity' as no evidence either way", () => {
    const result = reflect(bundle, stateFrom({ fight: ["no_opportunity", "no_opportunity"] }));
    expect(result.indications).toEqual([]);
    expect(result.questions).toEqual([]);
    expect(result.coverage).toMatchObject({ usable: 0, noOpportunity: 2 });
  });

  it("shows at most three, strongest first", () => {
    const result = reflect(
      bundle,
      stateFrom({
        fawn: ["almost_always", "almost_always"],
        flag: ["almost_always", "often"],
        forearm: ["often", "often"],
        flight: ["often", "sometimes"],
      }),
    );
    expect(ids(result.indications)).toEqual(["fawn", "flag", "forearm"]);
    expect(result.missing.join(" ")).toContain("1 more family also met the rule");
  });

  it("keeps ties at the cut-off visible", () => {
    const result = reflect(
      bundle,
      stateFrom({
        fawn: ["almost_always", "almost_always"],
        flag: ["often", "often"],
        forearm: ["often", "often"],
        flight: ["often", "often"],
      }),
    );
    expect(ids(result.indications)).toEqual(["fawn", "flight", "flag", "forearm"]);
    const flag = result.indications.find((entry) => entry.familyId === "flag")!;
    expect(flag.tiedWith.sort()).toEqual(["flight", "forearm"]);
    expect(result.indications[0]!.tiedWith).toEqual([]);
  });

  it("gives an empty reading for no answers and says coverage is thin", () => {
    const result = reflect(bundle, emptyState());
    expect(result.indications).toEqual([]);
    expect(result.coverage).toMatchObject({ usable: 0, unanswered: 22, thin: true });
    expect(result.missing.join(" ")).toContain("No setting was chosen");
    expect(result.missing.join(" ")).toContain("Only 0 of 22");
  });
});

describe("follow-ups", () => {
  it("uses the chosen cost as the growth tradeoff", () => {
    const state = stateFrom({ fawn: ["often", "often"] });
    state.followUps["fawn:function"] = "calm";
    state.followUps["fawn:cost"] = "late_preference";
    const [fawn] = reflect(bundle, state).indications;
    expect(fawn).toMatchObject({ functionLabel: "It kept things calm", noChangeWanted: false, needsQuestion: false });
    expect(fawn!.tradeoff).toContain("your yes arrives before your preference");
  });

  it("falls back to the family's general wording when follow-ups are skipped", () => {
    const state = stateFrom({ fawn: ["often", "often"] });
    state.followUps["fawn:function"] = SKIP;
    const result = reflect(bundle, state);
    const family = bundle.families.find((entry) => entry.id === "fawn")!;
    expect(result.indications[0]).toMatchObject({ functionId: null, tradeoff: family.growthEdge });
    expect(result.missing.join(" ")).toContain("Follow-up questions were not answered for Fawn");
  });

  it("respects 'nothing I want to change'", () => {
    const state = stateFrom({ forearm: ["often", "often"] });
    state.followUps["forearm:cost"] = COST_NONE;
    expect(reflect(bundle, state).indications[0]!.noChangeWanted).toBe(true);
  });

  it("flags a contradictory follow-up instead of resolving it", () => {
    const state = stateFrom({ float: ["often", "often"] });
    state.followUps["float:function"] = FUNCTION_NO_FIT;
    const [float] = reflect(bundle, state).indications;
    expect(float).toMatchObject({ familyId: "float", needsQuestion: true });
  });

  it("asks about at most three families", () => {
    const state = stateFrom({
      fawn: ["often", "often"],
      flag: ["often", "often"],
      forearm: ["often", "often"],
      flight: ["often", "often"],
    });
    expect(followUpFamilies(bundle, state)).toHaveLength(3);
  });
});

describe("capacity readings", () => {
  it("maps direct answers to states and leaves the rest unspecified", () => {
    const state = stateFrom({}, { capacityOptIn: true });
    Object.assign(state.capacities, {
      muladhara: "available",
      vishuddhi: "sometimes",
      manipura: "hard",
      ajna: "unsure",
      anahata: SKIP,
    });
    const byLens = Object.fromEntries(reflect(bundle, state).capacities.map((reading) => [reading.lensId, reading.state]));
    expect(byLens).toEqual({
      kula: "unspecified",
      muladhara: "active",
      svadhishthana: "unspecified",
      manipura: "constrained",
      anahata: "unspecified",
      vishuddhi: "mixed",
      ajna: "unspecified",
      akula: "unspecified",
    });
  });

  it("keeps private crowns unspecified and marks them private", () => {
    const state = stateFrom({}, { capacityOptIn: true });
    state.capacities.kula = "private";
    state.capacities.akula = "private";
    const result = reflect(bundle, state);
    const crowns = result.capacities.filter((reading) => reading.lensId === "kula" || reading.lensId === "akula");
    expect(crowns.map((reading) => [reading.state, reading.keptPrivate])).toEqual([
      ["unspecified", true],
      ["unspecified", true],
    ]);
  });

  it("ignores a private answer on a lens that does not offer it", () => {
    const state = stateFrom({}, { capacityOptIn: true });
    state.capacities.manipura = "private";
    const reading = reflect(bundle, state).capacities.find((entry) => entry.lensId === "manipura")!;
    expect(reading).toMatchObject({ state: "unspecified", keptPrivate: false, responseId: null });
  });

  it("orders readings from below the root to above the head", () => {
    expect(reflect(bundle, emptyState()).capacities.map((reading) => reading.lensId)).toEqual([
      "kula",
      "muladhara",
      "svadhishthana",
      "manipura",
      "anahata",
      "vishuddhi",
      "ajna",
      "akula",
    ]);
  });

  it("attaches the person's own capacity answers to a family's lenses", () => {
    const state = stateFrom({ fawn: ["often", "often"] }, { capacityOptIn: true });
    state.capacities.manipura = "hard";
    const [fawn] = reflect(bundle, state).indications;
    expect(fawn!.relatedCapacities.map((reading) => [reading.lensId, reading.state])).toEqual([
      ["anahata", "unspecified"],
      ["vishuddhi", "unspecified"],
      ["manipura", "constrained"],
    ]);
  });

  it("says so when the capacity reflection was not taken", () => {
    const result = reflect(bundle, stateFrom({}));
    expect(result.capacityAsked).toBe(false);
    expect(result.missing.join(" ")).toContain("capacity reflection was not taken");
  });
});

describe("session flow", () => {
  it("walks setting, core, follow-ups, capacity offer and result", () => {
    const session = new Session(bundle);
    expect(session.step().kind).toBe("setting");
    session.answer("work");

    for (let index = 1; index <= 22; index += 1) {
      const step = session.step();
      if (step.kind !== "core") throw new Error(`expected a core step, got ${step.kind}`);
      expect(step.index).toBe(index);
      expect(step.total).toBe(22);
      session.answer(step.item.familyId === "fawn" ? "often" : "rarely");
    }

    const first = session.step();
    expect(first).toMatchObject({ kind: "followup", aspect: "function", index: 1, total: 2 });
    session.answer("calm");
    expect(session.step()).toMatchObject({ kind: "followup", aspect: "cost", index: 2, total: 2 });
    session.answer("late_preference");

    expect(session.step().kind).toBe("capacity-offer");
    session.answer("no");
    expect(session.step().kind).toBe("result");
    expect(session.progress()).toBe(1);
    expect(ids(session.reflection().indications)).toEqual(["fawn"]);
  });

  it("asks all eight capacities after opting in, with private offered only for crowns", () => {
    const session = new Session(bundle, stateFrom({}, { cursor: 23 }));
    expect(session.step().kind).toBe("capacity-offer");
    session.answer("yes");

    const offered: Record<string, boolean> = {};
    for (let index = 0; index < 8; index += 1) {
      const step = session.step();
      if (step.kind !== "capacity") throw new Error(`expected a capacity step, got ${step.kind}`);
      offered[step.lens.id] = step.options.some((option) => option.id === "private");
      session.skip();
    }
    expect(offered).toMatchObject({ kula: true, akula: true, muladhara: false, anahata: false });
    expect(session.step().kind).toBe("result");
  });

  it("lets someone go back and change an answer", () => {
    const session = new Session(bundle);
    session.answer("home");
    session.answer("often");
    session.back();
    const step = session.step();
    expect(step).toMatchObject({ kind: "core", index: 1, selected: "often" });
    session.answer("never");
    expect(session.state.core["fawn-1"]).toBe("never");
    expect(session.state.settingId).toBe("home");
  });

  it("can stop the core questions early and still give a reading", () => {
    const session = new Session(bundle);
    session.answer("group");
    session.answer("often"); // fawn-1
    session.skip(); // flag-1
    session.finishCoreEarly();
    expect(session.step().kind).toBe("capacity-offer");
    session.answer("no");
    const result = session.reflection();
    expect(result.coverage).toMatchObject({ usable: 1, skipped: 1, unanswered: 20, thin: true });
    expect(ids(result.questions)).toEqual(["fawn"]);

    session.back();
    session.back();
    expect(session.step()).toMatchObject({ kind: "core", index: 2, total: 2 });
  });

  it("skips the cost question once someone says a family does not fit", () => {
    const session = new Session(bundle, stateFrom({ float: ["often", "often"] }, { coreClosed: true, cursor: 3 }));
    expect(session.step()).toMatchObject({ kind: "followup", aspect: "function", total: 2 });
    session.answer(FUNCTION_NO_FIT);
    expect(session.step().kind).toBe("capacity-offer");
  });

  it("rejects an answer that is not on offer", () => {
    const session = new Session(bundle);
    expect(() => session.answer("moon")).toThrow(/not an option/);
  });

  it("clears every answer on reset", () => {
    const session = new Session(bundle);
    session.answer("work");
    session.answer("often");
    session.reset();
    expect(session.state).toEqual(emptyState());
    expect(session.step().kind).toBe("setting");
  });
});

describe("plain-text copy", () => {
  const state = stateFrom({ fawn: ["often", "sometimes"], flag: ["often", SKIP] }, { capacityOptIn: true });
  state.followUps["fawn:function"] = "calm";
  state.followUps["fawn:cost"] = "late_preference";
  state.capacities.manipura = "hard";
  state.capacities.akula = "private";
  const reflection = reflect(bundle, state);
  const feedback = { fit: { fawn: "fits" as const }, chosenActionId: "fawn-holding-reply" };

  it("shows the answers behind each suggestion and the chosen experiment", () => {
    const text = toPlainText(bundle, reflection, feedback, { chakraTerms: true, date: "25 November 2026" });
    expect(text).toContain("FAWN · Going along to keep the peace");
    expect(text).toContain('"I went along with another person before checking what I wanted." → Often');
    expect(text).toContain("Your view: This fits");
    expect(text).toContain("Maṇipūra (solar plexus): Constrained (Hard to access)");
    expect(text).toContain("Akula Sahasrāra (upper crown): Unspecified (kept private)");
    expect(text).toContain("Use a holding reply");
    expect(text).toContain("WORTH A QUESTION");
    expect(text).toContain("not a\ndiagnosis");
  });

  it("uses everyday labels when chakra language is off", () => {
    const text = toPlainText(bundle, reflection, feedback, { chakraTerms: false });
    expect(text).toContain("Agency and boundaries: Constrained");
    expect(text).not.toMatch(/Maṇipūra|Anāhata|chakra/i);
  });
});
