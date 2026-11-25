/**
 * Anveshana reflection engine: the portable core.
 *
 * Import from here in any front end. Nothing in this folder touches the DOM,
 * storage, the network or the clock.
 */
export * from "./types";
export { validateBundle } from "./validate";
export {
  reflect,
  followUpFamilies,
  followUpOptions,
  followUpKey,
  capacityOptionsFor,
  COMMON_COST_OPTIONS,
  COMMON_FUNCTION_OPTIONS,
} from "./reflect";
export { Session, emptyState } from "./session";
export { toPlainText, lensLabel, CAPACITY_STATE_LABEL, FIT_LABEL, type ReportOptions } from "./report";
