// Indian time (IST, UTC+05:30) for order dates and reports.
//
// Orders are stamped with the database server's own clock (GETDATE()), and that server is not on
// Indian time (it can be anywhere, e.g. UTC-8). These SQL snippets convert using the server's
// current offset, so "today", date filters and per-day totals follow the Indian calendar.

const IST_OFFSET_MINUTES = 330;

/** Minutes to add to a server-clock time to get Indian time. */
const SHIFT = `(${IST_OFFSET_MINUTES} - DATEPART(TZOFFSET, SYSDATETIMEOFFSET()))`;

/** SQL: a server-clock DATETIME column shown in Indian time. */
export const sqlIndiaTime = (column) => `DATEADD(MINUTE, ${SHIFT}, ${column})`;

/** SQL: the Indian calendar date of a server-clock column. */
export const sqlIndiaDate = (column) => `CAST(${sqlIndiaTime(column)} AS DATE)`;

/** SQL: today's date in India. */
export const sqlIndiaToday = `CAST(DATEADD(MINUTE, ${IST_OFFSET_MINUTES}, SYSUTCDATETIME()) AS DATE)`;

/**
 * SQL condition: column falls on Indian dates @From..@To (inclusive). Written as a plain range on
 * the column itself so the (ShopID, CreatedAt) index is used.
 */
export const sqlIndiaDateRange = (column, fromParam = "@From", toParam = "@To") =>
    `${column} >= DATEADD(MINUTE, -${SHIFT}, CAST(${fromParam} AS DATETIME2)) ` +
    `AND ${column} < DATEADD(MINUTE, -${SHIFT}, DATEADD(DAY, 1, CAST(${toParam} AS DATETIME2)))`;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Today's date in India as YYYY-MM-DD. */
export function indiaToday() {
    return new Date(Date.now() + IST_OFFSET_MINUTES * 60_000).toISOString().slice(0, 10);
}

/** Adds days to a YYYY-MM-DD date. */
export function addDays(isoDate, days) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

/**
 * Reads ?from=YYYY-MM-DD&to=YYYY-MM-DD (Indian dates). Defaults to the last 30 days, and keeps
 * ranges to at most 2 years. Returns { from, to } or { error }.
 */
export function readDateRange(query = {}) {
    const today = indiaToday();
    const to = DATE_RE.test(String(query.to || "")) ? String(query.to) : today;
    const from = DATE_RE.test(String(query.from || "")) ? String(query.from) : addDays(to, -29);
    if (Number.isNaN(Date.parse(from)) || Number.isNaN(Date.parse(to))) return { error: "Choose valid dates." };
    if (from > to) return { error: "The start date must be on or before the end date." };
    if (Date.parse(to) - Date.parse(from) > 731 * 86_400_000) return { error: "Choose a range of up to 2 years." };
    return { from, to };
}

/** Every date from..to inclusive, as YYYY-MM-DD strings. */
export function eachDate(from, to) {
    const dates = [];
    for (let day = from; day <= to; day = addDays(day, 1)) dates.push(day);
    return dates;
}
