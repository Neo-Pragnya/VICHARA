import type { ContentBundle } from "../engine/types";
import actions from "./actions.json";
import families from "./families.json";
import items from "./items.json";
import lenses from "./lenses.json";
import meta from "./meta.json";
import patterns from "./patterns.json";

/**
 * The versioned content bundle. JSON is the editable source; the engine's
 * `validateBundle` checks its shape and that every id resolves (run in tests).
 */
export const bundle = { meta, families, items, lenses, actions, patterns } as unknown as ContentBundle;
