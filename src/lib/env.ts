/**
 * The TBC / hold system.
 *
 * NEXT_PUBLIC_SHOW_TODO=true (development and staging previews) turns on:
 *   - the dashed red "TBC" tag beside any fact whose status is `tbc`
 *   - "Image pending: ..." placeholders instead of plain navy blocks
 *   - the /_todo checklist route
 *
 * Facts with status `hold` never render, in any environment.
 */
export const showTodo = process.env.NODE_ENV !== "production" && process.env.NEXT_PUBLIC_SHOW_TODO === "true";
