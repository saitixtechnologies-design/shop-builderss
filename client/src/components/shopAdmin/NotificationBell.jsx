import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import {
    AlertTriangle,
    Bell,
    CheckCheck,
    Clock,
    MessageSquareText,
    PackageX,
    RefreshCw,
    ShoppingBag,
    UserPlus,
    X,
    XCircle
} from "lucide-react";
import { useShopNotifications } from "../../hooks/useShopNotifications.js";
import { describeNotification, notificationLabels, timeAgo } from "../../lib/shopNotifications.js";

import "../../styles/shop-admin/shop-notifications.css";

const ICONS = {
    "orders-waiting": [Clock, "warn"],
    "stock-out": [PackageX, "danger"],
    "stock-low": [AlertTriangle, "warn"],
    "order-new": [ShoppingBag, "info"],
    "order-cancelled": [XCircle, "muted"],
    "customer-new": [UserPlus, "good"],
    "enquiry-new": [MessageSquareText, "info"]
};

function NotificationRow({ item, language, unread, onOpen }) {
    const [Icon, tone] = ICONS[item.type] || [Bell, "info"];
    const [title, text] = describeNotification(item, language);
    const when = timeAgo(item.ageSeconds, language);

    return (
        <li>
            <button type="button" className={`shop-notice ${unread ? "unread" : ""}`} onClick={() => onOpen(item)}>
                <span className={`shop-notice-icon ${tone}`}><Icon size={17} /></span>
                <span className="shop-notice-body">
                    <strong>{title}</strong>
                    {text && <span>{text}</span>}
                    {when && <time>{when}</time>}
                </span>
                {unread && <span className="shop-notice-dot" aria-hidden="true" />}
            </button>
        </li>
    );
}

/** The bell in the Shop Admin top bar, with its list of notifications. */
function NotificationBell({ language, isServiceShop }) {
    const [open, setOpen] = useState(false);
    const wrapperRef = useRef(null);
    const navigate = useNavigate();
    const labels = notificationLabels(language);
    const { attention, activity, status, unreadCount, isUnread, markRead, markAllRead, refresh } = useShopNotifications();

    useEffect(() => {
        if (!open) return undefined;
        refresh();
        const closeOutside = (event) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) setOpen(false);
        };
        const closeOnEscape = (event) => { if (event.key === "Escape") setOpen(false); };
        document.addEventListener("mousedown", closeOutside);
        document.addEventListener("keydown", closeOnEscape);
        return () => {
            document.removeEventListener("mousedown", closeOutside);
            document.removeEventListener("keydown", closeOnEscape);
        };
    }, [open, refresh]);

    const openItem = (item) => {
        markRead([item.key]);
        setOpen(false);
        if (item.link) navigate(item.link);
    };

    const isEmpty = !attention.length && !activity.length;
    const badge = unreadCount > 9 ? "9+" : String(unreadCount);

    const section = (title, items) => items.length > 0 && (
        <section className="shop-notice-section">
            <h3>{title}</h3>
            <ul>
                {items.map((item) => (
                    <NotificationRow key={item.key} item={item} language={language} unread={isUnread(item.key)} onOpen={openItem} />
                ))}
            </ul>
        </section>
    );

    return (
        <div className="shop-notifications" ref={wrapperRef}>
            <button
                type="button"
                className={`shop-topbar-icon-btn ${open ? "active" : ""}`}
                aria-label={unreadCount ? `${labels.title}: ${labels.unread(unreadCount)}` : labels.title}
                title={labels.title}
                aria-expanded={open}
                aria-haspopup="dialog"
                onClick={() => setOpen((value) => !value)}
            >
                <Bell size={19} />
                {unreadCount > 0 && <span className="shop-notice-badge">{badge}</span>}
            </button>

            {open && (
                <div className="shop-notice-panel" role="dialog" aria-label={labels.title}>
                    <header className="shop-notice-header">
                        <div>
                            <strong>{labels.title}</strong>
                            {unreadCount > 0 && <span>{labels.unread(unreadCount)}</span>}
                        </div>
                        <div className="shop-notice-actions">
                            {unreadCount > 0 && (
                                <button type="button" className="shop-notice-link" onClick={markAllRead}>
                                    <CheckCheck size={15} /> {labels.markAll}
                                </button>
                            )}
                            <button type="button" className="shop-notice-close" aria-label={labels.close} onClick={() => setOpen(false)}>
                                <X size={17} />
                            </button>
                        </div>
                    </header>

                    <div className="shop-notice-list">
                        {status === "loading" && isEmpty && <p className="shop-notice-state">{labels.loading}</p>}

                        {status === "error" && isEmpty && (
                            <div className="shop-notice-state">
                                <p>{labels.error}</p>
                                <button type="button" className="shop-notice-link" onClick={refresh}>
                                    <RefreshCw size={14} /> {labels.retry}
                                </button>
                            </div>
                        )}

                        {status === "ready" && isEmpty && (
                            <div className="shop-notice-state">
                                <span className="shop-notice-empty-icon"><Bell size={22} /></span>
                                <strong>{labels.emptyTitle}</strong>
                                <p>{isServiceShop ? labels.emptyService : labels.emptyShop}</p>
                            </div>
                        )}

                        {section(labels.attention, attention)}
                        {section(labels.activity, activity)}
                    </div>
                </div>
            )}
        </div>
    );
}

export default NotificationBell;
