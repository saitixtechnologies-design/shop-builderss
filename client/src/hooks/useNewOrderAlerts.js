import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { fetchOrderAlerts } from "../lib/shopOrders.js";
import { getShopAdminTenantId, readShopAdminUser } from "../lib/shopAdminLanguage.js";

// New-order alerts in Shop Admin. The browser remembers the newest order the owner has seen
// (per shop); every minute the sidebar asks the API how many orders arrived after it, shows a
// badge and a pop-up, and plays a short chime when the owner has switched sound on.

const CHECK_EVERY_MS = 60_000;
const SEEN_EVENT = "shop-orders-seen";

const storageKey = (name) => `shopOrders:${name}:${getShopAdminTenantId(readShopAdminUser())}`;

function readStorage(name) {
    try { return localStorage.getItem(storageKey(name)); } catch { return null; }
}
function writeStorage(name, value) {
    try { localStorage.setItem(storageKey(name), String(value)); } catch { /* private mode: alerts still work this visit */ }
}

export const isOrderSoundOn = () => readStorage("sound") === "on";

export function setOrderSound(on) {
    writeStorage("sound", on ? "on" : "off");
    if (on) playChime();
}

/** Marks every current order as seen (clears the badge). */
export async function markOrdersSeen() {
    try {
        const { latestOrderId } = await fetchOrderAlerts();
        writeStorage("lastSeen", latestOrderId);
        window.dispatchEvent(new Event(SEEN_EVENT));
    } catch { /* the badge simply stays until the next visit */ }
}

/** Two short notes, made in the browser (no sound file needed). */
function playChime() {
    try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (!AudioContext) return;
        const context = new AudioContext();
        [880, 1320].forEach((frequency, index) => {
            const start = context.currentTime + index * 0.18;
            const oscillator = context.createOscillator();
            const gain = context.createGain();
            oscillator.frequency.value = frequency;
            gain.gain.setValueAtTime(0.0001, start);
            gain.gain.exponentialRampToValueAtTime(0.25, start + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.3);
            oscillator.connect(gain).connect(context.destination);
            oscillator.start(start);
            oscillator.stop(start + 0.32);
        });
        setTimeout(() => context.close(), 1000);
    } catch { /* sound is a nice-to-have */ }
}

/** Number of new (unseen) orders. Use once, in the sidebar; pass enabled=false for service shops. */
export function useNewOrderAlerts(enabled) {
    const [newOrders, setNewOrders] = useState(0);

    useEffect(() => {
        if (!enabled) return undefined;
        let stopped = false;
        let lastCount = 0;

        const check = async () => {
            if (document.hidden) return;
            try {
                const lastSeen = Number(readStorage("lastSeen") || 0);
                if (!lastSeen) {
                    // First visit: start counting from now, don't alert about old orders.
                    const { latestOrderId } = await fetchOrderAlerts();
                    writeStorage("lastSeen", latestOrderId);
                    return;
                }
                const data = await fetchOrderAlerts(lastSeen);
                if (stopped) return;
                if (data.newOrders > lastCount) {
                    toast.info(`New order received: ${data.latestOrderNumber}`);
                    if (isOrderSoundOn()) playChime();
                }
                lastCount = data.newOrders;
                setNewOrders(data.newOrders);
            } catch { /* offline or signed out: try again next time */ }
        };
        const clear = () => {
            lastCount = 0;
            setNewOrders(0);
        };

        check();
        const timer = setInterval(check, CHECK_EVERY_MS);
        document.addEventListener("visibilitychange", check);
        window.addEventListener(SEEN_EVENT, clear);
        return () => {
            stopped = true;
            clearInterval(timer);
            document.removeEventListener("visibilitychange", check);
            window.removeEventListener(SEEN_EVENT, clear);
        };
    }, [enabled]);

    return newOrders;
}
