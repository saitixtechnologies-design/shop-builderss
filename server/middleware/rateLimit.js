// Small in-memory rate limiter (no extra package). Limits are per client IP and per server
// process, which is enough for one API instance; use a shared store (e.g. Redis) if you run several.

export const rateLimit = ({ windowMs, max, message }) => {
    const hits = new Map();

    // Forget old entries so the map does not grow forever.
    setInterval(() => {
        const now = Date.now();
        for (const [key, entry] of hits) if (entry.resetAt <= now) hits.delete(key);
    }, windowMs).unref();

    return (req, res, next) => {
        const key = req.ip || req.socket?.remoteAddress || "unknown";
        const now = Date.now();
        let entry = hits.get(key);
        if (!entry || entry.resetAt <= now) {
            entry = { count: 0, resetAt: now + windowMs };
            hits.set(key, entry);
        }
        entry.count += 1;

        if (entry.count > max) {
            res.set("Retry-After", String(Math.ceil((entry.resetAt - now) / 1000)));
            return res.status(429).json({ success: false, message });
        }
        next();
    };
};

const MINUTE = 60_000;

/** Sign-in: 10 attempts per 15 minutes per IP. */
export const loginLimiter = rateLimit({
    windowMs: 15 * MINUTE,
    max: 10,
    message: "Too many sign-in attempts. Please wait 15 minutes and try again."
});

/** Forgot password, OTP and reset: 10 per 15 minutes per IP. */
export const passwordLimiter = rateLimit({
    windowMs: 15 * MINUTE,
    max: 10,
    message: "Too many password requests. Please wait 15 minutes and try again."
});

/** Public orders and enquiries from shop websites: 20 per 10 minutes per IP. */
export const publicFormLimiter = rateLimit({
    windowMs: 10 * MINUTE,
    max: 20,
    message: "Too many requests. Please wait a few minutes and try again."
});
