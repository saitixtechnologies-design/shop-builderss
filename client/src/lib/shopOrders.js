import { apiUrl, getShopAdminHeaders } from "./api.js";

// Shop Admin orders and sales reports: API calls, date ranges and formatting.
// All dates are Indian dates (YYYY-MM-DD); the API converts order times to Indian time.

export const ORDER_STATUSES = ["Pending", "Confirmed", "Processing", "Ready", "Out For Delivery", "Delivered", "Cancelled"];

// ------------------------------------------------------------ API

async function request(path, { method = "GET", body } = {}) {
    const response = await fetch(apiUrl(`/api/shop-orders${path}`), {
        method,
        headers: getShopAdminHeaders(body ? { "Content-Type": "application/json" } : {}),
        body: body ? JSON.stringify(body) : undefined
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Something went wrong. Please try again.");
    return result;
}

const toQuery = (params) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined && value !== null && value !== "" && value !== "All") query.set(key, value);
    }
    const text = query.toString();
    return text ? `?${text}` : "";
};

export const fetchOrders = (filters) => request(`/${toQuery(filters)}`);
export const fetchOrderSummary = (range) => request(`/summary${toQuery(range)}`).then((result) => result.data);
export const fetchOrder = (orderID) => request(`/${orderID}`).then((result) => result.data);
export const fetchOrderAlerts = (afterId) => request(`/alerts${toQuery({ afterId })}`).then((result) => result.data);
export const changeOrderStatus = (orderID, status) => request(`/${orderID}/status`, { method: "PATCH", body: { status } });

// ------------------------------------------------------------ Add Sale (counter / phone / WhatsApp)

/** Where an order came from. "Online" = the shop's website; the rest are entered in Add Sale. */
export const ORDER_SOURCES = ["Online", "Counter", "Phone", "WhatsApp", "Other"];
export const SALE_SOURCES = ORDER_SOURCES.filter((source) => source !== "Online");
export const SALE_PAYMENT_METHODS = ["Cash", "UPI", "Card", "Bank transfer", "Other"];

export const fetchSaleProducts = (search) => request(`/sale-products${toQuery({ search })}`).then((result) => result.data);
/** Saves a counter / phone / WhatsApp sale; stock goes down at once. Returns { orderID, orderNumber, total }. */
export const createSale = (sale) => request("/", { method: "POST", body: sale }).then((result) => result.data);
export const addOrderNote = (orderID, note) => request(`/${orderID}/notes`, { method: "POST", body: { note } }).then((result) => result.data);

/** Downloads the orders matching the filters as a CSV file (opens in Excel). */
export async function downloadOrdersCsv(filters) {
    const response = await fetch(apiUrl(`/api/shop-orders/export${toQuery(filters)}`), { headers: getShopAdminHeaders() });
    if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message || "The file could not be downloaded.");
    }
    saveFile(await response.blob(), `orders-${filters.from}-to-${filters.to}.csv`);
}

/** Saves text or a blob as a file in the browser. */
export function saveFile(content, fileName, type = "text/csv;charset=utf-8") {
    const blob = content instanceof Blob ? content : new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.append(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

// ------------------------------------------------------------ dates (Indian calendar)

const IST_OFFSET_MS = 330 * 60_000;

/** Today's date in India, YYYY-MM-DD. */
export const indiaToday = () => new Date(Date.now() + IST_OFFSET_MS).toISOString().slice(0, 10);

export function addDays(isoDate, days) {
    const date = new Date(`${isoDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() + days);
    return date.toISOString().slice(0, 10);
}

const startOfMonth = (isoDate) => `${isoDate.slice(0, 7)}-01`;

/** The quick choices in the date filter. Each returns { from, to }. */
export const DATE_PRESETS = [
    { id: "today", label: "Today", range: (today) => ({ from: today, to: today }) },
    { id: "yesterday", label: "Yesterday", range: (today) => ({ from: addDays(today, -1), to: addDays(today, -1) }) },
    { id: "7d", label: "Last 7 days", range: (today) => ({ from: addDays(today, -6), to: today }) },
    { id: "30d", label: "Last 30 days", range: (today) => ({ from: addDays(today, -29), to: today }) },
    { id: "month", label: "This month", range: (today) => ({ from: startOfMonth(today), to: today }) },
    {
        id: "lastMonth",
        label: "Last month",
        range: (today) => {
            const lastDay = addDays(startOfMonth(today), -1);
            return { from: startOfMonth(lastDay), to: lastDay };
        }
    }
];

export const presetRange = (id) => (DATE_PRESETS.find((preset) => preset.id === id) || DATE_PRESETS[3]).range(indiaToday());

// ------------------------------------------------------------ formatting

const rupees = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 2 });
const rupeesShort = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });

export const formatMoney = (value) => rupees.format(Number(value) || 0);
export const formatMoneyShort = (value) => rupeesShort.format(Number(value) || 0);

/** The API sends Indian times as ISO strings; show them without converting again. */
export function formatIndiaDateTime(value) {
    if (!value) return "—";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

export function formatIndiaDate(isoDate) {
    if (!isoDate) return "—";
    return new Date(`${String(isoDate).slice(0, 10)}T00:00:00Z`)
        .toLocaleDateString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });
}

/** CSS-friendly name of a status: "Out For Delivery" -> "out-for-delivery". */
export const statusClass = (status) => String(status || "").toLowerCase().replace(/\s+/g, "-");
