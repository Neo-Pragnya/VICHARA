import type {
  CapacityState,
  ContentBundle,
  Indication,
  Reflection,
  ReflectionFeedback,
} from "./types";

export const CAPACITY_STATE_LABEL: Record<CapacityState, string> = {
  active: "Active",
  mixed: "Mixed",
  constrained: "Constrained",
  unspecified: "Unspecified",
};

export const FIT_LABEL = { fits: "This fits", partly: "Partly fits", dismissed: "Doesn't fit" } as const;

export interface ReportOptions {
  /** Use Sanskrit chakra names. When false, everyday labels are used. */
  chakraTerms: boolean;
  /** Shown in the header. Pass a date string; the engine never reads a clock. */
  date?: string;
}

export function lensLabel(bundle: ContentBundle, lensId: string, chakraTerms: boolean): string {
  const lens = bundle.lenses.find((candidate) => candidate.id === lensId);
  if (!lens) return lensId;
  return chakraTerms ? `${lens.sanskrit} (${lens.english.toLowerCase()})` : lens.plainLabel;
}

/**
 * A plain-text copy of the reading for the person to keep. Produced only when
 * they ask for it; the caller decides how to hand it over (download, share).
 */
export function toPlainText(
  bundle: ContentBundle,
  reflection: Reflection,
  feedback: ReflectionFeedback,
  options: ReportOptions,
): string {
  const lines: string[] = [];
  const family = (id: string) => bundle.families.find((candidate) => candidate.id === id);
  const setting = bundle.meta.settings.find((candidate) => candidate.id === reflection.settingId);

  lines.push("ANVESHANA · A personal reflection");
  if (options.date) lines.push(options.date);
  lines.push(`Setting: ${setting?.label ?? "Not chosen"} · Period: ${bundle.meta.timeframe}`);
  lines.push(
    `Based on ${reflection.coverage.usable} of ${reflection.coverage.total} questions with a usable answer.`,
  );
  lines.push("");
  lines.push("This is a reflection on habits you reported in one setting. It is not a");
  lines.push("diagnosis, a measure of trauma or an energetic measurement.");

  const section = (indication: Indication) => {
    const entry = family(indication.familyId);
    if (!entry) return;
    lines.push("");
    lines.push(`${entry.name.toUpperCase()} · ${entry.plain}`);
    const fit = feedback.fit[indication.familyId];
    if (fit) lines.push(`Your view: ${FIT_LABEL[fit]}`);
    if (indication.tiedWith.length > 0) {
      const names = indication.tiedWith.map((id) => family(id)?.name ?? id).join(", ");
      lines.push(`Equal in strength with ${names}.`);
    }
    lines.push("Why it was suggested:");
    for (const evidence of indication.evidence) {
      lines.push(`  - "${evidence.prompt}" → ${evidence.responseLabel}`);
    }
    if (indication.functionLabel) lines.push(`What it gave you: ${indication.functionLabel}`);
    if (indication.costLabel) lines.push(`What it cost: ${indication.costLabel}`);
    if (indication.needsQuestion) {
      lines.push("You said this doesn't really fit you. Your answers above suggested it, so it is listed as a question.");
    }
    if (indication.strength === "question") return;
    lines.push(`What it may protect: ${entry.protects}`);
    if (indication.noChangeWanted) {
      lines.push("You said there is nothing here you want to change. That is a complete answer.");
    } else {
      lines.push(`Where growth gets harder: ${indication.tradeoff}`);
      lines.push(`What gives you more choice: ${entry.opening}`);
    }
    lines.push(`${options.chakraTerms ? "A chakra reading" : "A capacity reading"}: ${options.chakraTerms ? entry.chakraReading : entry.plainReading}`);
  };

  if (reflection.indications.length === 0) {
    lines.push("");
    lines.push("No response family stood out strongly in this setting.");
  } else {
    lines.push("");
    lines.push("── PATTERNS THAT STOOD OUT ──");
    reflection.indications.forEach(section);
  }

  if (reflection.questions.length > 0) {
    lines.push("");
    lines.push("── WORTH A QUESTION ──");
    lines.push("Thinner evidence. These are prompts to wonder about, not findings.");
    reflection.questions.forEach(section);
  }

  if (reflection.capacityAsked) {
    lines.push("");
    lines.push(options.chakraTerms ? "── EIGHT CAPACITIES ──" : "── CAPACITIES ──");
    for (const reading of [...reflection.capacities].reverse()) {
      const note = reading.keptPrivate ? " (kept private)" : reading.responseLabel ? ` (${reading.responseLabel})` : "";
      lines.push(`  ${lensLabel(bundle, reading.lensId, options.chakraTerms)}: ${CAPACITY_STATE_LABEL[reading.state]}${note}`);
    }
  }

  const action = bundle.actions.find((candidate) => candidate.id === feedback.chosenActionId);
  if (action) {
    lines.push("");
    lines.push("── ONE EXPERIMENT ──");
    lines.push(action.title);
    lines.push(action.prompt);
    lines.push(`Use it when: ${action.useWhen}`);
    lines.push(`Afterwards, ask: ${action.checkIn}`);
  }

  if (reflection.missing.length > 0) {
    lines.push("");
    lines.push("── WHAT THIS READING COULD NOT SEE ──");
    reflection.missing.forEach((note) => lines.push(`  - ${note}`));
  }

  lines.push("");
  lines.push(`Content ${reflection.contentVersion} · Rules ${reflection.rulesVersion}`);
  return lines.join("\n") + "\n";
}
