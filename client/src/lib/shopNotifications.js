import { apiUrl, getShopAdminHeaders } from "./api.js";
import { formatMoney } from "./shopOrders.js";

// Shop Admin notifications (the bell): API call and the wording in English, Hindi and Hinglish.
// The API sends only facts (type + data); the words are made here, in the owner's language.

export async function fetchShopNotifications() {
    const response = await fetch(apiUrl("/api/shop-notifications"), { headers: getShopAdminHeaders() });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Could not load notifications.");
    return result.data;
}

const plural = (count, one, many) => (Number(count) === 1 ? one : many);

const MESSAGES = {
    en: {
        "orders-waiting": ({ count, hours }) => [`${count} ${plural(count, "order is", "orders are")} waiting`, `Pending for more than ${hours} hours. Confirm or cancel ${plural(count, "it", "them")}.`],
        "stock-out": ({ product }) => [`Out of stock: ${product}`, "Customers cannot buy it. Add stock in Products."],
        "stock-low": ({ product, left }) => [`Low stock: ${product}`, `Only ${left} left.`],
        "order-new": ({ number, customer, total, status }) => [`New order ${number}`, `${customer || "Customer"} · ${formatMoney(total)} · ${status}`],
        "order-cancelled": ({ number, customer, total }) => [`Order ${number} cancelled`, `${customer || "Customer"} · ${formatMoney(total)}`],
        "customer-new": ({ name }) => ["New customer", `${name || "Someone"} created an account.`],
        "enquiry-new": ({ name, service, status }) => [`New enquiry: ${service || "Service"}`, `${name || "Customer"} · ${status}`]
    },
    hi: {
        "orders-waiting": ({ count, hours }) => [`${count} ऑर्डर इंतज़ार में`, `${hours} घंटे से ज़्यादा से बाकी हैं। इन्हें कन्फ़र्म या रद्द करें।`],
        "stock-out": ({ product }) => [`स्टॉक ख़त्म: ${product}`, "ग्राहक इसे नहीं ख़रीद सकते। उत्पाद में स्टॉक जोड़ें।"],
        "stock-low": ({ product, left }) => [`स्टॉक कम: ${product}`, `सिर्फ़ ${left} बचे हैं।`],
        "order-new": ({ number, customer, total, status }) => [`नया ऑर्डर ${number}`, `${customer || "ग्राहक"} · ${formatMoney(total)} · ${status}`],
        "order-cancelled": ({ number, customer, total }) => [`ऑर्डर ${number} रद्द हुआ`, `${customer || "ग्राहक"} · ${formatMoney(total)}`],
        "customer-new": ({ name }) => ["नया ग्राहक", `${name || "किसी"} ने अकाउंट बनाया।`],
        "enquiry-new": ({ name, service, status }) => [`नई पूछताछ: ${service || "सेवा"}`, `${name || "ग्राहक"} · ${status}`]
    },
    hinglish: {
        "orders-waiting": ({ count, hours }) => [`${count} ${plural(count, "order wait kar raha hai", "orders wait kar rahe hain")}`, `${hours} ghante se zyada se pending. Confirm ya cancel karein.`],
        "stock-out": ({ product }) => [`Stock khatam: ${product}`, "Customers ise nahi khareed sakte. Products mein stock add karein."],
        "stock-low": ({ product, left }) => [`Stock kam: ${product}`, `Sirf ${left} bache hain.`],
        "order-new": ({ number, customer, total, status }) => [`Naya order ${number}`, `${customer || "Customer"} · ${formatMoney(total)} · ${status}`],
        "order-cancelled": ({ number, customer, total }) => [`Order ${number} cancel hua`, `${customer || "Customer"} · ${formatMoney(total)}`],
        "customer-new": ({ name }) => ["Naya customer", `${name || "Kisi"} ne account banaya.`],
        "enquiry-new": ({ name, service, status }) => [`Nayi enquiry: ${service || "Service"}`, `${name || "Customer"} · ${status}`]
    }
};

export const NOTIFICATION_LABELS = {
    en: {
        title: "Notifications", markAll: "Mark all as read", attention: "Needs attention", activity: "Recent activity",
        unread: (count) => `${count} unread`, emptyTitle: "You're all caught up",
        emptyShop: "New orders, stock alerts and new customers will show up here.",
        emptyService: "New enquiries will show up here.",
        error: "Could not load notifications.", retry: "Try again", loading: "Loading…", close: "Close notifications"
    },
    hi: {
        title: "सूचनाएँ", markAll: "सब पढ़ा हुआ करें", attention: "ध्यान दें", activity: "हाल की गतिविधि",
        unread: (count) => `${count} नई`, emptyTitle: "कोई नई सूचना नहीं",
        emptyShop: "नए ऑर्डर, स्टॉक अलर्ट और नए ग्राहक यहाँ दिखेंगे।",
        emptyService: "नई पूछताछ यहाँ दिखेंगी।",
        error: "सूचनाएँ लोड नहीं हो पाईं।", retry: "फिर कोशिश करें", loading: "लोड हो रहा है…", close: "सूचनाएँ बंद करें"
    },
    hinglish: {
        title: "Notifications", markAll: "Sab read mark karein", attention: "Dhyan dein", activity: "Haal ki activity",
        unread: (count) => `${count} nayi`, emptyTitle: "Koi nayi notification nahi",
        emptyShop: "Naye orders, stock alerts aur naye customers yahan dikhenge.",
        emptyService: "Nayi enquiries yahan dikhengi.",
        error: "Notifications load nahi ho payi.", retry: "Phir try karein", loading: "Load ho raha hai…", close: "Notifications band karein"
    }
};

const pick = (table, language) => table[language] || table.en;

export const notificationLabels = (language) => pick(NOTIFICATION_LABELS, language);

/** [title, text] for one notification, in the owner's language. */
export function describeNotification(item, language) {
    const make = pick(MESSAGES, language)[item.type] || MESSAGES.en[item.type];
    return make ? make(item.data || {}) : [item.type, ""];
}

/** "5 min ago" style time; empty for alerts that are about now (stock). */
export function timeAgo(seconds, language) {
    if (seconds === undefined || seconds === null) return "";
    const s = Math.max(0, Number(seconds));
    const words = {
        en: ["just now", "min ago", "h ago", "day ago", "days ago"],
        hi: ["अभी", "मिनट पहले", "घंटे पहले", "दिन पहले", "दिन पहले"],
        hinglish: ["abhi", "min pehle", "ghante pehle", "din pehle", "din pehle"]
    }[language] || ["just now", "min ago", "h ago", "day ago", "days ago"];
    if (s < 60) return words[0];
    if (s < 3600) return `${Math.floor(s / 60)} ${words[1]}`;
    if (s < 86400) return `${Math.floor(s / 3600)} ${words[2]}`;
    const days = Math.floor(s / 86400);
    return `${days} ${days === 1 ? words[3] : words[4]}`;
}
