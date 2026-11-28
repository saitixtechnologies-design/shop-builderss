import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchShopNotifications } from "../lib/shopNotifications.js";
import { getShopAdminTenantId, readShopAdminUser } from "../lib/shopAdminLanguage.js";

// Notifications for the bell. Checks the API every minute while the tab is open and remembers,
// per shop and per browser, which notifications the owner has already seen.

const CHECK_EVERY_MS = 60_000;
const MAX_SEEN = 400;
const ONE_DAY = 86_400;

const storageKey = () => `shopNotifications:seen:${getShopAdminTenantId(readShopAdminUser())}`;

function readSeen() {
    try {
        const saved = JSON.parse(localStorage.getItem(storageKey()) || "null");
        return Array.isArray(saved) ? new Set(saved) : null;
    } catch {
        return null;
    }
}

function saveSeen(seen) {
    try {
        localStorage.setItem(storageKey(), JSON.stringify([...seen].slice(-MAX_SEEN)));
    } catch { /* private mode: read state lasts this visit only */ }
}

export function useShopNotifications() {
    const [feed, setFeed] = useState({ attention: [], activity: [] });
    const [status, setStatus] = useState("loading"); // loading | ready | error
    const [seen, setSeen] = useState(() => readSeen() || new Set());

    const refresh = useCallback(async () => {
        try {
            const data = await fetchShopNotifications();
            setFeed({ attention: data.attention || [], activity: data.activity || [] });
            setStatus("ready");
            // First time on this browser: older activity counts as already seen, so the owner
            // is not greeted by a pile of old orders. Stock alerts still show as new.
            if (!readSeen()) {
                const baseline = new Set((data.activity || []).filter((item) => item.ageSeconds > ONE_DAY).map((item) => item.key));
                saveSeen(baseline);
                setSeen(baseline);
            }
        } catch {
            setStatus((current) => (current === "ready" ? "ready" : "error"));
        }
    }, []);

    useEffect(() => {
        refresh();
        const check = () => { if (!document.hidden) refresh(); };
        const timer = setInterval(check, CHECK_EVERY_MS);
        document.addEventListener("visibilitychange", check);
        return () => {
            clearInterval(timer);
            document.removeEventListener("visibilitychange", check);
        };
    }, [refresh]);

    const allItems = useMemo(() => [...feed.attention, ...feed.activity], [feed]);
    const unreadCount = useMemo(() => allItems.filter((item) => !seen.has(item.key)).length, [allItems, seen]);

    const markRead = useCallback((keys) => {
        setSeen((current) => {
            const next = new Set(current);
            keys.forEach((key) => {
                next.delete(key); // re-add so it counts as recent when trimming
                next.add(key);
            });
            saveSeen(next);
            return next;
        });
    }, []);

    const markAllRead = useCallback(() => markRead(allItems.map((item) => item.key)), [allItems, markRead]);

    return { ...feed, status, unreadCount, isUnread: (key) => !seen.has(key), markRead, markAllRead, refresh };
}
