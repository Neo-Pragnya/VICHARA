import { COST_NONE, FUNCTION_NO_FIT, OTHER, SKIP, type ContentBundle } from "./types";

const RESERVED = new Set([SKIP, COST_NONE, FUNCTION_NO_FIT, OTHER]);
const STATES = new Set(["active", "mixed", "constrained", "unspecified"]);

/**
 * Checks that a content bundle is complete and that every id resolves.
 * Returns a list of problems; an empty list means the bundle can be released.
 */
export function validateBundle(bundle: ContentBundle): string[] {
  const problems: string[] = [];
  const fail = (message: string) => problems.push(message);

  const text = (value: unknown, where: string) => {
    if (typeof value !== "string" || value.trim() === "") fail(`${where} is empty`);
    else if (/\bTODO\b/.test(value)) fail(`${where} still contains TODO`);
  };

  const unique = (ids: string[], where: string) => {
    const seen = new Set<string>();
    for (const id of ids) {
      if (typeof id !== "string" || !/^[a-z0-9][a-z0-9_-]*$/.test(id)) {
        fail(`${where}: "${id}" must be lowercase letters, digits, "-" or "_"`);
      }
      if (seen.has(id)) fail(`${where}: duplicate id "${id}"`);
      seen.add(id);
    }
    return seen;
  };

  const { meta, families, items, lenses, actions, patterns } = bundle;

  // Meta
  text(meta.contentVersion, "meta.contentVersion");
  text(meta.rulesVersion, "meta.rulesVersion");
  text(meta.timeframe, "meta.timeframe");
  unique(meta.settings.map((setting) => setting.id), "meta.settings");
  if (meta.settings.length === 0) fail("meta.settings needs at least one setting");
  meta.settings.forEach((setting) => text(setting.label, `setting ${setting.id} label`));

  const frequencyIds = unique(meta.frequencyScale.map((option) => option.id), "meta.frequencyScale");
  for (const id of frequencyIds) if (RESERVED.has(id)) fail(`meta.frequencyScale: "${id}" is reserved`);
  const values = meta.frequencyScale.map((option) => option.value).filter((value) => value !== null);
  if (values.length < 2) fail("meta.frequencyScale needs at least two scored options");
  const { strongValue, supportValue, maxIndications, thinCoverageBelow } = meta.rules;
  if (!(supportValue <= strongValue)) fail("meta.rules.supportValue must not exceed strongValue");
  if (!values.some((value) => (value as number) >= strongValue)) {
    fail("meta.rules.strongValue is higher than every scale value");
  }
  if (!(maxIndications >= 1)) fail("meta.rules.maxIndications must be at least 1");
  if (!(thinCoverageBelow >= 0 && thinCoverageBelow <= items.length)) {
    fail("meta.rules.thinCoverageBelow must be between 0 and the number of items");
  }

  unique(meta.capacityScale.map((option) => option.id), "meta.capacityScale");
  for (const option of meta.capacityScale) {
    if (RESERVED.has(option.id)) fail(`meta.capacityScale: "${option.id}" is reserved`);
    if (!STATES.has(option.state)) fail(`capacity option ${option.id}: unknown state "${option.state}"`);
    if (option.privateOnly && option.state !== "unspecified") {
      fail(`capacity option ${option.id}: a private answer must stay unspecified`);
    }
  }

  // Ids
  const familyIds = unique(families.map((family) => family.id), "families");
  const itemIds = unique(items.map((item) => item.id), "items");
  const lensIds = unique(lenses.map((lens) => lens.id), "lenses");
  const actionIds = unique(actions.map((action) => action.id), "actions");
  void itemIds;

  // Items
  const orders = new Set<number>();
  const itemsPerFamily = new Map<string, number>();
  for (const item of items) {
    text(item.prompt, `item ${item.id} prompt`);
    if (!familyIds.has(item.familyId)) fail(`item ${item.id}: unknown family "${item.familyId}"`);
    if (!Number.isInteger(item.order)) fail(`item ${item.id}: order must be a whole number`);
    if (orders.has(item.order)) fail(`item ${item.id}: order ${item.order} is used twice`);
    orders.add(item.order);
    itemsPerFamily.set(item.familyId, (itemsPerFamily.get(item.familyId) ?? 0) + 1);
  }

  // Lenses
  const positions = new Set<number>();
  for (const lens of lenses) {
    for (const key of ["sanskrit", "english", "plainLabel", "color", "represents", "prompt", "supports"] as const) {
      text(lens[key], `lens ${lens.id} ${key}`);
    }
    if (positions.has(lens.position)) fail(`lens ${lens.id}: position ${lens.position} is used twice`);
    positions.add(lens.position);
  }
  if (meta.capacityScale.some((option) => option.privateOnly) && !lenses.some((lens) => lens.allowPrivate)) {
    fail("a private capacity answer exists but no lens allows it");
  }

  // Actions
  const actionFamily = new Map<string, string>();
  for (const action of actions) {
    for (const key of ["title", "prompt", "useWhen", "checkIn"] as const) {
      text(action[key], `action ${action.id} ${key}`);
    }
    if (!familyIds.has(action.familyId)) fail(`action ${action.id}: unknown family "${action.familyId}"`);
    if (action.bringsIn !== undefined && !familyIds.has(action.bringsIn)) {
      fail(`action ${action.id}: unknown bringsIn family "${action.bringsIn}"`);
    }
    if (action.bringsIn === action.familyId) fail(`action ${action.id}: bringsIn repeats its own family`);
    actionFamily.set(action.id, action.familyId);
  }

  // Patterns
  unique(patterns.map((pattern) => pattern.id), "patterns");
  const patternsPerFamily = new Map<string, number>();
  for (const pattern of patterns) {
    text(pattern.title, `pattern ${pattern.id} title`);
    text(pattern.question, `pattern ${pattern.id} question`);
    if (!familyIds.has(pattern.familyId)) fail(`pattern ${pattern.id}: unknown family "${pattern.familyId}"`);
    patternsPerFamily.set(pattern.familyId, (patternsPerFamily.get(pattern.familyId) ?? 0) + 1);
  }

  // Families
  const usedActions = new Set<string>();
  for (const family of families) {
    const where = `family ${family.id}`;
    for (const key of [
      "name",
      "emoji",
      "plain",
      "tagline",
      "voice",
      "protects",
      "growthEdge",
      "opening",
      "chakraReading",
      "plainReading",
      "functionPrompt",
      "costPrompt",
    ] as const) {
      text(family[key], `${where} ${key}`);
    }
    if ((itemsPerFamily.get(family.id) ?? 0) < 2) fail(`${where}: needs at least two core items`);
    if ((patternsPerFamily.get(family.id) ?? 0) < 1) fail(`${where}: needs at least one pattern`);

    if (family.lensIds.length === 0) fail(`${where}: needs at least one lens`);
    for (const lensId of family.lensIds) {
      if (!lensIds.has(lensId)) fail(`${where}: unknown lens "${lensId}"`);
    }

    const functionIds = unique(family.functionOptions.map((option) => option.id), `${where} functionOptions`);
    const costIds = unique(family.costOptions.map((option) => option.id), `${where} costOptions`);
    for (const id of [...functionIds, ...costIds]) {
      if (RESERVED.has(id)) fail(`${where}: option id "${id}" is reserved`);
    }
    if (functionIds.size < 2) fail(`${where}: needs at least two function options`);
    if (costIds.size < 2) fail(`${where}: needs at least two cost options`);
    family.functionOptions.forEach((option) => text(option.label, `${where} function ${option.id} label`));
    family.costOptions.forEach((option) => {
      text(option.label, `${where} cost ${option.id} label`);
      text(option.tradeoff, `${where} cost ${option.id} tradeoff`);
    });

    for (const shift of family.shifts) {
      text(shift.circumstance, `${where} shift to ${shift.familyId}`);
      if (!familyIds.has(shift.familyId)) fail(`${where}: unknown shift family "${shift.familyId}"`);
      if (shift.familyId === family.id) fail(`${where}: a shift cannot point to itself`);
    }

    if (family.actionIds.length === 0) fail(`${where}: needs at least one action`);
    for (const actionId of family.actionIds) {
      if (!actionIds.has(actionId)) fail(`${where}: unknown action "${actionId}"`);
      else if (actionFamily.get(actionId) !== family.id) {
        fail(`${where}: action "${actionId}" belongs to family "${actionFamily.get(actionId)}"`);
      }
      usedActions.add(actionId);
    }
  }
  for (const id of actionIds) {
    if (!usedActions.has(id)) fail(`action ${id} is not listed by its family`);
  }

  return problems;
}
