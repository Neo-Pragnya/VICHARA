import { bundle as defaultBundle } from "../content";
import {
  CAPACITY_STATE_LABEL,
  FIT_LABEL,
  Session,
  toPlainText,
  type Action,
  type CapacityReading,
  type ContentBundle,
  type Family,
  type Fit,
  type Indication,
  type Reflection,
  type ReflectionFeedback,
  type Step,
} from "../engine";
import { styles } from "./styles";

/**
 * <anveshana-app> — the web front end for the Anveshana reflection engine.
 *
 * A thin renderer: it shows the session's current step and passes answers
 * back. Answers live in this element's memory only. Nothing is written to
 * storage, put in the URL or sent over the network; closing or reloading the
 * page clears the sitting.
 *
 * Attributes
 *   chakra-terms="off"   start with everyday capacity labels
 *   theme="light|dark"   force a colour scheme (default follows the device)
 *
 * Events (no answer data is ever attached)
 *   anveshana:complete   the reading was shown
 *   anveshana:cleared    the person cleared the sitting
 */

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (character) => `&#${character.charCodeAt(0)};`);
const e = escapeHtml;

const QUESTION_REASON = {
  "single-answer": "Only one of this family's questions had a usable answer, and it was high.",
  "mixed-answers": "One answer was high and the other was low.",
} as const;

export class AnveshanaApp extends HTMLElement {
  private content: ContentBundle = defaultBundle;
  private session = new Session(this.content);
  private started = false;
  private chakraTerms = true;
  private feedback: ReflectionFeedback = { fit: {}, chosenActionId: null };
  private root!: ShadowRoot;
  private view!: HTMLElement;
  private announcedComplete = false;

  connectedCallback(): void {
    if (this.shadowRoot) return;
    this.root = this.attachShadow({ mode: "open" });
    this.chakraTerms = this.getAttribute("chakra-terms") !== "off";

    const style = document.createElement("style");
    style.textContent = styles;
    this.view = document.createElement("div");
    this.root.append(style, this.view);

    this.view.addEventListener("click", (event) => {
      const target = (event.target as Element).closest<HTMLElement>("[data-act]");
      if (target) this.handle(target.dataset.act!, target.dataset.value ?? "");
    });
    this.view.addEventListener("change", (event) => {
      const target = event.target as HTMLInputElement;
      if (target.dataset.toggle === "chakra-terms") {
        this.chakraTerms = target.checked;
        this.render("keep");
      }
    });
    this.render("none");
  }

  // ── Actions ───────────────────────────────────────────────────────────────

  private handle(act: string, value: string): void {
    const { session } = this;
    switch (act) {
      case "begin":
        this.started = true;
        break;
      case "answer":
        session.answer(value);
        break;
      case "skip":
        session.skip();
        break;
      case "back":
        if (session.canGoBack()) session.back();
        else this.started = false;
        break;
      case "finish-early":
        session.finishCoreEarly();
        break;
      case "add-capacity":
        session.back(); // the reading is always preceded by the capacity offer
        session.answer("yes");
        break;
      case "fit": {
        const [familyId, fit] = value.split(":") as [string, Fit];
        if (this.feedback.fit[familyId] === fit) delete this.feedback.fit[familyId];
        else this.feedback.fit[familyId] = fit;
        return this.render("keep");
      }
      case "choose":
        this.feedback.chosenActionId = this.feedback.chosenActionId === value ? null : value;
        return this.render("keep");
      case "download":
        return this.download();
      case "jump":
        this.view.querySelector<HTMLElement>(`#${CSS.escape(value)}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
        return;
      case "another-setting":
        this.resetSitting();
        this.started = true;
        break;
      case "clear":
        this.resetSitting();
        this.started = false;
        this.dispatchEvent(new CustomEvent("anveshana:cleared", { bubbles: true, composed: true }));
        break;
      default:
        return;
    }
    this.render("heading");
  }

  private resetSitting(): void {
    this.session.reset();
    this.feedback = { fit: {}, chosenActionId: null };
    this.announcedComplete = false;
  }

  private download(): void {
    const text = toPlainText(this.content, this.session.reflection(), this.feedback, {
      chakraTerms: this.chakraTerms,
      date: new Date().toLocaleDateString(undefined, { dateStyle: "long" }),
    });
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "anveshana-reflection.txt";
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  // ── Rendering ─────────────────────────────────────────────────────────────

  /** `heading` moves focus to the new screen's heading; `keep` restores it. */
  private render(focus: "none" | "heading" | "keep"): void {
    const activeKey = (this.root.activeElement as HTMLElement | null)?.dataset.key;
    const step = this.started ? this.session.step() : null;

    let html: string;
    let wide = false;
    if (!step) html = this.welcome();
    else if (step.kind === "result") {
      html = this.result();
      wide = true;
      if (!this.announcedComplete) {
        this.announcedComplete = true;
        this.dispatchEvent(new CustomEvent("anveshana:complete", { bubbles: true, composed: true }));
      }
    } else html = this.question(step);

    this.view.className = wide ? "app wide" : "app";
    this.view.innerHTML = html;

    if (focus === "heading") {
      const heading = this.view.querySelector<HTMLElement>("[data-focus]");
      heading?.focus({ preventScroll: true });
      const top = this.getBoundingClientRect().top;
      if (top < 0) this.scrollIntoView({ block: "start" });
    } else if (focus === "keep" && activeKey) {
      this.view.querySelector<HTMLElement>(`[data-key="${CSS.escape(activeKey)}"]`)?.focus({ preventScroll: true });
    }
  }

  private settingLabel(): string {
    const id = this.session.state.settingId;
    return this.content.meta.settings.find((setting) => setting.id === id)?.label ?? "Your chosen setting";
  }

  private family(id: string): Family {
    return this.content.families.find((family) => family.id === id)!;
  }

  private termsToggle(explain: boolean): string {
    return `
      <label class="toggle">
        <input type="checkbox" data-toggle="chakra-terms" data-key="terms" ${this.chakraTerms ? "checked" : ""} />
        <span><strong>Use chakra language</strong>${explain ? `<br /><span class="muted small">Shows Sanskrit names such as Maṇipūra and a contemplative reading. Switch off for everyday wording. You can change this again on your reading.</span>` : ""}</span>
      </label>`;
  }

  private welcome(): string {
    const { meta, items, lenses } = this.content;
    return `
      <div class="stack" style="--gap:1.5rem">
        <header class="stack" style="--gap:0.6rem">
          <p class="eyebrow">A private reflection</p>
          <div class="brand">
            <h1 tabindex="-1" data-focus>Anveshana</h1>
            <span class="deva" lang="sa">अन्वेषण · Anveṣaṇa</span>
          </div>
          <p class="lede">Explore your patterns. Find more room to choose.</p>
        </header>

        <p>Everyone has ways of protecting themselves in difficult moments: pushing back, leaving, going quiet, agreeing quickly, preparing, reaching for someone. Each one made sense somewhere. This reflection helps you notice which ones show up for you in one part of your life, what they may protect, where they can hold your growth back, and one small thing you could try.</p>

        <div class="row">
          <button class="btn primary" data-act="begin" data-key="begin">Begin the reflection</button>
        </div>

        <ul class="points">
          <li><span class="glyph" aria-hidden="true">🧭</span><span><strong>${items.length} short questions about one setting</strong><span class="muted">Based on ${e(meta.timeframe)}. About 6 to 10 minutes. You can skip any question, go back, or finish early.</span></span></li>
          <li><span class="glyph" aria-hidden="true">🪷</span><span><strong>An optional look at ${lenses.length} capacities</strong><span class="muted">Ground, sensation, agency, care, voice, attention and two crowns, read through the chakras or in everyday language.</span></span></li>
          <li><span class="glyph" aria-hidden="true">🌱</span><span><strong>A reading you can check</strong><span class="muted">Every suggestion shows the answers behind it. Keep it, mark it as partly right, or dismiss it, then pick one experiment.</span></span></li>
          <li><span class="glyph" aria-hidden="true">🔒</span><span><strong>Your answers stay on this device</strong><span class="muted">Nothing is saved, sent or tracked. Closing or reloading the page clears everything. You can download a copy if you want one.</span></span></li>
        </ul>

        ${this.termsToggle(true)}

        <p class="note">This is a tool for self-reflection for adults. It does not diagnose anything, measure trauma or measure energy, and it is not a substitute for care. If you are in danger or in crisis, contact your local emergency number or a crisis line, or reach someone you trust.</p>
      </div>`;
  }

  private question(step: Exclude<Step, { kind: "result" }>): string {
    const percent = Math.round(this.session.progress() * 100);
    let eyebrow = "";
    let lead = "";
    let prompt = "";
    let options = "";
    let extra = "";
    let canSkip = true;

    const option = (id: string, label: string, selected: boolean, hint = "", aside = false) => `
      <li><button class="option${aside ? " aside" : ""}" data-act="answer" data-value="${e(id)}" data-key="opt-${e(id)}" aria-pressed="${selected}">
        <span class="mark" aria-hidden="true"></span>
        <span><strong>${e(label)}</strong>${hint ? `<span class="hint">${e(hint)}</span>` : ""}</span>
      </button></li>`;

    switch (step.kind) {
      case "setting":
        eyebrow = "Before you start";
        prompt = "Choose one setting to reflect on";
        lead = `Pick one place or relationship and keep it in mind for every question. Think about ${this.content.meta.timeframe}. You can come back and do another setting afterwards.`;
        options = step.options.map((item) => option(item.id, item.label, step.selected === item.id, item.hint)).join("");
        canSkip = false;
        break;
      case "core":
        eyebrow = `Question ${step.index} of ${step.total} · ${this.settingLabel()}`;
        lead = `In ${this.content.meta.timeframe}, how often did this happen in this setting?`;
        prompt = step.item.prompt;
        options = step.options
          .map((item) => option(item.id, item.label, step.selected === item.id, item.value === null ? "The situation never came up." : "", item.value === null))
          .join("");
        extra = `<button class="btn quiet" data-act="finish-early" data-key="finish">Finish now and see my reading</button>`;
        break;
      case "followup":
        eyebrow = `A closer look · ${step.family.name} · ${step.index} of ${step.total}`;
        lead = `Your answers suggested <strong>${e(step.family.plain.toLowerCase())}</strong> shows up for you here. ${step.aspect === "function" ? "A response usually does something useful for the person using it." : "Most responses also ask something in return."}`;
        prompt = step.prompt;
        options = step.options.map((item) => option(item.id, item.label, step.selected === item.id)).join("");
        break;
      case "capacity-offer":
        eyebrow = "Optional";
        prompt = this.chakraTerms ? "Add a reading through the eight chakras?" : "Add a reading of eight capacities?";
        lead = this.chakraTerms
          ? "Eight more questions ask what was available to you in this setting: ground, sensation, agency, care, voice and attention, with a crown below the root and one above the head. The two crowns touch on lineage and spirit; you can skip them or keep them private."
          : "Eight more questions ask what was available to you in this setting: ground, sensation, agency, care, voice and attention, plus two optional questions about roots and about spirit that you can skip or keep private.";
        options =
          option("yes", "Yes, add it", step.selected === true, "Eight short questions.") +
          option("no", "No, show my reading", step.selected === false);
        canSkip = false;
        break;
      case "capacity": {
        const { lens } = step;
        const name = this.chakraTerms ? `${lens.sanskrit} · ${lens.english.toLowerCase()}` : lens.plainLabel;
        eyebrow = `Capacity ${step.index} of ${step.total}`;
        lead = `<span class="lens-dot" style="--dot:${e(lens.color)}" aria-hidden="true"></span><strong>${e(name)}</strong> · ${e(lens.represents)}`;
        prompt = lens.prompt;
        options = step.options
          .map((item) => option(item.id, item.label, step.selected === item.id, "", item.state === "unspecified"))
          .join("");
        break;
      }
    }

    return `
      <div class="stack" style="--gap:1.4rem">
        <div class="stack" style="--gap:0.6rem">
          <div class="topbar"><span class="name">Anveshana</span><span class="small muted">${percent}% through</span></div>
          <div class="progress" role="progressbar" aria-label="Progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${percent}"><span style="width:${percent}%"></span></div>
        </div>
        <div class="stack" style="--gap:0.7rem">
          <p class="eyebrow">${e(eyebrow)}</p>
          ${step.kind === "core" || step.kind === "capacity" ? `<p class="muted">${lead}</p>` : ""}
          <h2 class="prompt" tabindex="-1" data-focus>${e(prompt)}</h2>
          ${step.kind === "core" || step.kind === "capacity" ? "" : `<p class="muted">${lead}</p>`}
        </div>
        <ul class="options">${options}</ul>
        <div class="row between">
          <button class="btn" data-act="back" data-key="back">← Back</button>
          ${canSkip ? `<button class="btn" data-act="skip" data-key="skip">Skip this one</button>` : ""}
        </div>
        ${extra ? `<div class="row">${extra}</div>` : ""}
        ${step.kind === "capacity-offer" ? this.termsToggle(true) : ""}
      </div>`;
  }

  // ── Result ────────────────────────────────────────────────────────────────

  private result(): string {
    const reflection = this.session.reflection();
    const { coverage, indications, questions } = reflection;
    const count = indications.length;
    const countWord = ["No", "One", "Two", "Three", "Four", "Five", "Six"][count] ?? String(count);

    const summary =
      count === 0
        ? "No single response family stood out strongly in this setting."
        : `${countWord} response ${count === 1 ? "family" : "families"} stood out in your answers. Each is a suggestion to hold against your own experience, never a label for who you are.`;

    return `
      <div class="stack" style="--gap:1.75rem">
        <header class="stack" style="--gap:0.6rem">
          <p class="eyebrow">Your reading · ${e(this.settingLabel())} · ${e(this.content.meta.timeframe)}</p>
          <h1 tabindex="-1" data-focus>What stood out</h1>
          <p class="lede">${e(summary)}</p>
          <p class="muted small">Based on ${coverage.usable} of ${coverage.total} questions with a usable answer${coverage.skipped ? `, ${coverage.skipped} skipped` : ""}${coverage.noOpportunity ? `, ${coverage.noOpportunity} with no opportunity` : ""}.</p>
        </header>

        ${coverage.thin ? `<p class="note warn">There were few usable answers, so treat this as a first sketch. Answering more questions, or choosing a setting where more of these situations come up, will give a fuller reading.</p>` : ""}

        ${this.overview(reflection)}

        ${indications.map((indication) => this.indicationCard(indication)).join("")}

        ${count === 0 ? this.nothingStoodOut(reflection) : ""}

        ${
          questions.length > 0
            ? `<section class="stack" style="--gap:0.9rem">
                <div class="section-title stack" style="--gap:0.3rem">
                  <h2>Worth a question</h2>
                  <p class="muted">The evidence here is thinner. These are prompts to wonder about, not findings.</p>
                </div>
                ${questions.map((question) => this.questionCard(question)).join("")}
              </section>`
            : ""
        }

        ${this.capacitySection(reflection)}
        ${this.experimentSection()}
        ${this.methodSection(reflection)}

        <div class="footer-actions stack" style="--gap:0.9rem">
          <div class="row">
            <button class="btn primary" data-act="download" data-key="download">Download a copy</button>
            <button class="btn" data-act="another-setting" data-key="another">Reflect on another setting</button>
            <button class="btn" data-act="clear" data-key="clear">Clear everything</button>
          </div>
          ${this.termsToggle(false)}
          <p class="note">Your answers exist only in this page's memory. The downloaded copy is a plain text file that stays on your device. This reading reflects habits you reported in one setting; it is not a diagnosis, and a pattern that worries you is worth taking to a qualified professional.</p>
        </div>
      </div>`;
  }

  /** A short map of the reading, so a long page has a beginning. */
  private overview(reflection: Reflection): string {
    if (reflection.indications.length === 0) return "";
    const families = reflection.indications
      .map((indication) => {
        const family = this.family(indication.familyId);
        return `<li><button class="jump" data-act="jump" data-value="fam-${family.id}" data-key="jump-${family.id}">
          <span class="emoji" aria-hidden="true">${family.emoji}</span>
          <span><strong>${e(family.name)}</strong><span class="hint">${e(family.plain)}</span></span>
          <span class="go" aria-hidden="true">↓</span>
        </button></li>`;
      })
      .join("");

    const named = (state: CapacityReading["state"]) =>
      reflection.capacities
        .filter((reading) => reading.state === state)
        .map((reading) => {
          const lens = this.content.lenses.find((candidate) => candidate.id === reading.lensId)!;
          return this.chakraTerms ? lens.sanskrit : lens.plainLabel;
        });
    const line = (label: string, names: string[]) =>
      names.length ? `<p><strong>${label}:</strong> ${e(names.join(", "))}</p>` : "";
    const capacities = reflection.capacityAsked
      ? `<div class="stack small" style="--gap:0.25rem">
          <p class="label">${this.chakraTerms ? "Chakras in this setting" : "Capacities in this setting"}</p>
          ${line("Hard to reach", named("constrained"))}
          ${line("Sometimes available", named("mixed"))}
          ${line("Available", named("active"))}
          <button class="btn quiet" style="padding-left:0" data-act="jump" data-value="capacities" data-key="jump-capacities">See all eight ↓</button>
        </div>`
      : "";

    return `
      <nav class="card stack" style="--gap:0.9rem" aria-label="At a glance">
        <p class="label">At a glance</p>
        <ul class="jumps">${families}</ul>
        ${capacities}
      </nav>`;
  }

  private indicationCard(indication: Indication): string {
    const family = this.family(indication.familyId);
    const fit = this.feedback.fit[family.id];
    const tie = indication.tiedWith.length
      ? `<span class="badge">Equal with ${e(indication.tiedWith.map((id) => this.family(id).name).join(", "))}</span>`
      : "";

    const head = `
      <div class="family-head">
        <span class="emoji" aria-hidden="true">${family.emoji}</span>
        <div class="stack" style="--gap:0.15rem">
          <h3>${e(family.name)} ${tie}</h3>
          <p class="muted">${e(family.plain)}</p>
        </div>
      </div>`;

    if (fit === "dismissed") {
      return `
        <article class="card dismissed stack" style="--gap:0.8rem" id="fam-${family.id}" aria-label="${e(family.name)}, dismissed">
          ${head}
          <div class="row between">
            <p class="muted">You said this doesn't fit. It has been set aside.</p>
            <button class="btn" data-act="fit" data-value="${family.id}:dismissed" data-key="fit-${family.id}-dismissed" aria-pressed="true">Bring it back</button>
          </div>
        </article>`;
    }

    const growth = indication.noChangeWanted
      ? `<div><h4>What you said about change</h4><p>You said there is nothing here you want to change. That is a complete answer. A response that works and costs you nothing you mind is simply part of how you do things.</p></div>`
      : `<div><h4>Where growth gets harder</h4><p>${e(indication.tradeoff)}</p></div>
         <div><h4>What gives you more choice</h4><p>${e(family.opening)}</p></div>`;

    const lensChips = indication.relatedCapacities.map((reading) => this.lensChip(reading)).join("");

    return `
      <article class="card stack" style="--gap:1.35rem" id="fam-${family.id}" aria-label="${e(family.name)}">
        ${head}
        <blockquote class="voice">“${e(family.voice)}”</blockquote>

        ${indication.needsQuestion ? `<p class="note warn">You said in the follow-up that this doesn't really fit you, while your earlier answers pointed to it. Both are yours. Keep it only if it is useful, or dismiss it below.</p>` : ""}

        <details open>
          <summary>Why this was suggested</summary>
          <div class="body stack" style="--gap:0.6rem">
            <ul class="evidence">
              ${indication.evidence.map((entry) => `<li><span>“${e(entry.prompt)}”</span><span class="answer">${e(entry.responseLabel)}</span></li>`).join("")}
              ${indication.functionLabel ? `<li><span class="muted">What it gave you</span><span class="answer">${e(indication.functionLabel)}</span></li>` : ""}
              ${indication.costLabel ? `<li><span class="muted">What it cost</span><span class="answer">${e(indication.costLabel)}</span></li>` : ""}
            </ul>
          </div>
        </details>

        <div class="triad">
          <div><h4>What it may protect</h4><p>${e(family.protects)}</p></div>
          ${growth}
        </div>

        <div class="stack" style="--gap:0.5rem">
          <p class="label">${this.chakraTerms ? "Through the chakras" : "Capacities involved"}</p>
          <p>${e(this.chakraTerms ? family.chakraReading : family.plainReading)}</p>
          <div class="chips">${lensChips}</div>
        </div>

        <div class="stack" style="--gap:0.4rem">
          <p class="label">Another response that can open up</p>
          <ul class="shifts">
            ${family.shifts.map((shift) => `<li><strong>${e(this.family(shift.familyId).name)}</strong> · ${e(shift.circumstance)}</li>`).join("")}
          </ul>
        </div>

        ${this.patternList(family)}

        ${
          indication.noChangeWanted
            ? ""
            : `<div class="stack" style="--gap:0.6rem">
                <p class="label">One small experiment</p>
                ${indication.actionIds.map((id) => this.actionCard(id)).join("")}
              </div>`
        }

        <div class="fit stack" style="--gap:0.5rem">
          <p class="small"><strong>Does this fit your experience?</strong></p>
          <div class="row" role="group" aria-label="Does ${e(family.name)} fit your experience?">
            ${(Object.keys(FIT_LABEL) as Fit[])
              .map((key) => `<button class="btn" data-act="fit" data-value="${family.id}:${key}" data-key="fit-${family.id}-${key}" aria-pressed="${fit === key}">${FIT_LABEL[key]}</button>`)
              .join("")}
          </div>
        </div>
      </article>`;
  }

  private patternList(family: Family): string {
    const patterns = this.content.patterns.filter((pattern) => pattern.familyId === family.id);
    if (patterns.length === 0) return "";
    return `
      <details>
        <summary>Scenes where ${e(family.name)} often shows up</summary>
        <div class="body stack" style="--gap:0.5rem">
          <p class="muted small">Named patterns from the Protection Atlas, each with a question that helps tell it apart. Recognising one does not mean it applies to you.</p>
          <ul class="evidence">
            ${patterns.map((pattern) => `<li><strong>${e(pattern.title)}</strong><span class="muted">${e(pattern.question)}</span></li>`).join("")}
          </ul>
        </div>
      </details>`;
  }

  private questionCard(indication: Indication): string {
    const family = this.family(indication.familyId);
    return `
      <article class="card stack" style="--gap:0.7rem">
        <div class="family-head">
          <span class="emoji" aria-hidden="true">${family.emoji}</span>
          <div class="stack" style="--gap:0.15rem">
            <h3>${e(family.name)}</h3>
            <p class="muted">${e(family.plain)}</p>
          </div>
        </div>
        <p>${e(indication.questionReason ? QUESTION_REASON[indication.questionReason] : "")} Does “${e(family.voice)}” sound like you in this setting?</p>
        <ul class="evidence">
          ${indication.evidence.map((entry) => `<li><span>“${e(entry.prompt)}”</span><span class="answer">${e(entry.responseLabel)}</span></li>`).join("")}
        </ul>
      </article>`;
  }

  private nothingStoodOut(reflection: Reflection): string {
    const reason =
      reflection.coverage.usable === 0
        ? "There were no usable answers to read."
        : "None of the eleven families had one strong answer backed by a second.";
    return `
      <section class="card stack" style="--gap:0.7rem">
        <h2>Nothing stood out strongly</h2>
        <p>${e(reason)} That can mean this setting is steady for you right now, that these situations did not come up in ${e(this.content.meta.timeframe)}, or that the questions missed how you respond.</p>
        <p class="muted">You could reflect on a setting that asks more of you, or simply take this as it is.</p>
      </section>`;
  }

  private lensChip(reading: CapacityReading): string {
    const lens = this.content.lenses.find((candidate) => candidate.id === reading.lensId)!;
    const name = this.chakraTerms ? lens.sanskrit : lens.plainLabel;
    const state = reading.state === "unspecified" ? "" : ` · <strong>${CAPACITY_STATE_LABEL[reading.state]}</strong>`;
    return `<span class="chip"><span class="lens-dot" style="--dot:${e(lens.color)};margin:0" aria-hidden="true"></span>${e(name)}${state}</span>`;
  }

  private actionCard(actionId: string): string {
    const action = this.content.actions.find((candidate) => candidate.id === actionId) as Action;
    const chosen = this.feedback.chosenActionId === action.id;
    const brings = action.bringsIn ? this.family(action.bringsIn).name : null;
    return `
      <div class="experiment${chosen ? " chosen" : ""} stack" style="--gap:0.5rem">
        <p><strong>${e(action.title)}</strong>${brings ? ` <span class="badge">brings in ${e(brings)}</span>` : ""}</p>
        <p>${e(action.prompt)}</p>
        <dl>
          <div><dt>Use it when:</dt> <dd>${e(action.useWhen)}</dd></div>
          <div><dt>Afterwards, ask:</dt> <dd>${e(action.checkIn)}</dd></div>
        </dl>
        <div class="row"><button class="btn" data-act="choose" data-value="${e(action.id)}" data-key="choose-${e(action.id)}" aria-pressed="${chosen}">${chosen ? "✓ This is my experiment" : "Try this one"}</button></div>
      </div>`;
  }

  private capacitySection(reflection: Reflection): string {
    const title = this.chakraTerms ? "The eight chakras in this setting" : "Eight capacities in this setting";
    if (!reflection.capacityAsked) {
      return `
        <section class="card stack" style="--gap:0.7rem" id="capacities">
          <h2>${title}</h2>
          <p class="muted">You haven't taken the capacity reflection, so nothing is shown here. It takes eight short questions and every one can be skipped.</p>
          <div class="row"><button class="btn" data-act="add-capacity" data-key="add-capacity">Add the capacity reflection</button></div>
        </section>`;
    }

    const rows = [...reflection.capacities]
      .reverse() // above the head first, below the root last
      .map((reading) => {
        const lens = this.content.lenses.find((candidate) => candidate.id === reading.lensId)!;
        const name = this.chakraTerms
          ? `${e(lens.sanskrit)} <span class="muted">· ${e(lens.english.toLowerCase())}</span>`
          : e(lens.plainLabel);
        let detail: string;
        if (reading.keptPrivate) detail = "You kept this private. It stays open.";
        else if (reading.state === "active") detail = lens.represents;
        else if (reading.state === "unspecified") detail = "Skipped or unsure. It stays open and is not counted as a difficulty.";
        else detail = `${lens.represents} What can change the answer: ${lens.supports}`;
        return `
          <li>
            <span class="node ${reading.state}" style="--dot:${e(lens.color)}" aria-hidden="true"></span>
            <div>
              <p><strong>${name}</strong> — <span class="state">${CAPACITY_STATE_LABEL[reading.state]}</span></p>
              <p class="muted small">${e(detail)}</p>
            </div>
          </li>`;
      })
      .join("");

    return `
      <section class="card stack" style="--gap:1rem" id="capacities">
        <div class="stack" style="--gap:0.3rem">
          <h2>${title}</h2>
          <p class="muted">This shows what you said was available to you here, from above the head down to below the root. ${this.chakraTerms ? "It is a contemplative reading of your own answers. The order marks a place in the teaching, not a level of attainment." : "It reflects your own answers about this one setting."}</p>
        </div>
        <div class="legend" aria-hidden="true">
          <span><span class="node active"></span>Active: available</span>
          <span><span class="node mixed"></span>Mixed: sometimes</span>
          <span><span class="node constrained"></span>Constrained: wanted, hard to reach</span>
          <span><span class="node unspecified"></span>Unspecified: left open</span>
        </div>
        <ol class="ladder">${rows}</ol>
      </section>`;
  }

  private experimentSection(): string {
    const action = this.content.actions.find((candidate) => candidate.id === this.feedback.chosenActionId);
    if (!action) {
      if (this.session.reflection().indications.every((entry) => entry.noChangeWanted)) return "";
      return `
        <section class="card stack" style="--gap:0.5rem">
          <h2>Your one experiment</h2>
          <p class="muted">Choose one experiment from the cards above. One is enough. A small change you actually try will tell you more than a long list.</p>
        </section>`;
    }
    return `
      <section class="card stack" style="--gap:0.6rem" aria-live="polite">
        <p class="eyebrow">Your one experiment</p>
        <h2>${e(action.title)}</h2>
        <p>${e(action.prompt)}</p>
        <p><strong>Use it when:</strong> ${e(action.useWhen)}</p>
        <p><strong>Afterwards, ask yourself:</strong> ${e(action.checkIn)}</p>
        <p class="muted small">If it doesn't help, that tells you something about the situation, not about you. Pick a different one.</p>
      </section>`;
  }

  private methodSection(reflection: Reflection): string {
    const missing = reflection.missing.map((note) => `<li>${e(note)}</li>`).join("");
    return `
      <details>
        <summary>How this reading was made, and what it could not see</summary>
        <div class="body stack" style="--gap:0.7rem">
          <p>Each of the eleven response families has two questions. A family is shown when you answered both, at least one answer was “Often” or “Almost every time”, and the other was at least “Sometimes”. If only one answer was usable, or the two disagreed, the family appears under “Worth a question”. At most three families are shown, and equal scores are shown together.</p>
          <p>“No opportunity” and skipped questions count as no evidence either way. Capacities come only from your direct answers: Available reads as Active, Sometimes available as Mixed, Hard to access as Constrained, and anything unsure, skipped or private stays Unspecified.</p>
          <p>These rules are an editorial starting point for personal reflection. They have not been validated as a psychological measure${this.chakraTerms ? ", and the chakra reading is a contemplative lens, not a measurement" : ""}.</p>
          ${missing ? `<ul class="stack small" style="--gap:0.3rem;list-style:disc;padding-left:1.2rem">${missing}</ul>` : ""}
          <p class="muted small">Content ${e(reflection.contentVersion)} · Rules ${e(reflection.rulesVersion)}</p>
        </div>
      </details>`;
  }
}

if (typeof customElements !== "undefined" && !customElements.get("anveshana-app")) {
  customElements.define("anveshana-app", AnveshanaApp);
}
