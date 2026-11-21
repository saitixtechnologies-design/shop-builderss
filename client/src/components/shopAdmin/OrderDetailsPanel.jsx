import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { MapPin, MessageCircle, Phone, Printer, StickyNote, X } from "lucide-react";
import {
    ORDER_STATUSES,
    addOrderNote,
    changeOrderStatus,
    fetchOrder,
    formatIndiaDateTime,
    formatMoney,
    statusClass
} from "../../lib/shopOrders.js";

const whatsAppLink = (phone) => {
    const digits = String(phone || "").replace(/\D/g, "");
    const number = /^[6-9]\d{9}$/.test(digits) ? `91${digits}` : digits;
    return number ? `https://wa.me/${number}` : "";
};

/** Side panel with one order: customer, items, totals, status, invoice, history and notes. */
export default function OrderDetailsPanel({ orderId, onClose, onStatusChanged }) {
    const [details, setDetails] = useState(null);
    const [error, setError] = useState("");
    const [savingStatus, setSavingStatus] = useState(false);
    const [note, setNote] = useState("");
    const [savingNote, setSavingNote] = useState(false);

    useEffect(() => {
        let active = true;
        fetchOrder(orderId)
            .then((data) => active && setDetails(data))
            .catch((loadError) => active && setError(loadError.message));
        return () => { active = false; };
    }, [orderId]);

    useEffect(() => {
        const closeOnEscape = (event) => event.key === "Escape" && onClose();
        document.addEventListener("keydown", closeOnEscape);
        return () => document.removeEventListener("keydown", closeOnEscape);
    }, [onClose]);

    const updateStatus = async (status) => {
        setSavingStatus(true);
        try {
            await changeOrderStatus(orderId, status);
            setDetails(await fetchOrder(orderId));
            onStatusChanged(orderId, status);
            toast.success(`Order marked ${status}`);
        } catch (statusError) {
            toast.error(statusError.message);
        } finally {
            setSavingStatus(false);
        }
    };

    const saveNote = async (event) => {
        event.preventDefault();
        if (!note.trim()) return;
        setSavingNote(true);
        try {
            const entry = await addOrderNote(orderId, note.trim());
            setDetails((current) => ({ ...current, history: [entry, ...current.history] }));
            setNote("");
        } catch (noteError) {
            toast.error(noteError.message);
        } finally {
            setSavingNote(false);
        }
    };

    const order = details?.order;

    return (
        <div className="order-panel-backdrop" onClick={(event) => event.target === event.currentTarget && onClose()}>
            <aside className="order-panel" role="dialog" aria-modal="true" aria-labelledby="order-panel-title">
                <header className="order-panel-head">
                    <div>
                        <span className="order-panel-eyebrow">Order</span>
                        <h2 id="order-panel-title">{order?.OrderNumber || "Loading…"}</h2>
                        {order && <small>{formatIndiaDateTime(order.CreatedAtIndia)}</small>}
                    </div>
                    <button type="button" className="order-icon-button" onClick={onClose} aria-label="Close"><X size={20} /></button>
                </header>

                {error && <p className="orders-message is-error">{error}</p>}
                {!order && !error && <p className="orders-message">Loading order…</p>}

                {order && (
                    <div className="order-panel-body">
                        <section className="order-panel-actions">
                            <label className="order-status-field">
                                <span>Status</span>
                                <select
                                    className={`order-status-select is-${statusClass(order.OrderStatus)}`}
                                    value={order.OrderStatus}
                                    disabled={savingStatus}
                                    onChange={(event) => updateStatus(event.target.value)}
                                >
                                    {ORDER_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}
                                </select>
                            </label>
                            <a className="order-secondary-button" href={`/shop-admin/orders/${order.OrderID}/invoice`} target="_blank" rel="noopener noreferrer">
                                <Printer size={16} /> Print invoice
                            </a>
                        </section>

                        <section className="order-card">
                            <h3>Customer</h3>
                            <p className="order-customer-name">{order.CustomerName || "—"}</p>
                            <div className="order-contact-links">
                                {order.CustomerPhone && <a href={`tel:${order.CustomerPhone}`}><Phone size={15} /> {order.CustomerPhone}</a>}
                                {whatsAppLink(order.CustomerPhone) && (
                                    <a href={whatsAppLink(order.CustomerPhone)} target="_blank" rel="noopener noreferrer"><MessageCircle size={15} /> WhatsApp</a>
                                )}
                            </div>
                            {(order.ShippingAddress || order.ShippingCity) && (
                                <p className="order-address">
                                    <MapPin size={15} />
                                    <span>{[order.ShippingAddress, order.ShippingCity, order.ShippingState, order.ShippingPostalCode].filter(Boolean).join(", ")}</span>
                                </p>
                            )}
                        </section>

                        <section className="order-card">
                            <h3>Items</h3>
                            <ul className="order-items">
                                {details.items.map((item) => (
                                    <li key={item.OrderItemID}>
                                        <div>
                                            <strong>{item.ProductName}</strong>
                                            <small>{[item.Size && `Size ${item.Size}`, item.SKU].filter(Boolean).join(" · ")}</small>
                                        </div>
                                        <span>{item.Quantity} × {formatMoney(item.UnitPrice)}</span>
                                        <b>{formatMoney(item.TotalPrice)}</b>
                                    </li>
                                ))}
                            </ul>
                            <dl className="order-totals">
                                <div><dt>Subtotal</dt><dd>{formatMoney(order.SubTotal)}</dd></div>
                                {Number(order.DiscountAmount) > 0 && <div><dt>Discount</dt><dd>−{formatMoney(order.DiscountAmount)}</dd></div>}
                                {Number(order.ShippingAmount) > 0 && <div><dt>Delivery</dt><dd>{formatMoney(order.ShippingAmount)}</dd></div>}
                                {Number(order.TaxAmount) > 0 && <div><dt>Tax</dt><dd>{formatMoney(order.TaxAmount)}</dd></div>}
                                <div className="is-total"><dt>Total</dt><dd>{formatMoney(order.GrandTotal)}</dd></div>
                            </dl>
                        </section>

                        <section className="order-card">
                            <h3>History and notes</h3>
                            <form className="order-note-form" onSubmit={saveNote}>
                                <label htmlFor="order-note" className="visually-hidden">Add a private note</label>
                                <textarea
                                    id="order-note"
                                    value={note}
                                    maxLength={1000}
                                    rows={2}
                                    placeholder="Add a private note (only you can see it)"
                                    onChange={(event) => setNote(event.target.value)}
                                />
                                <button type="submit" className="order-primary-button" disabled={savingNote || !note.trim()}>
                                    <StickyNote size={16} /> {savingNote ? "Saving…" : "Add note"}
                                </button>
                            </form>
                            <ol className="order-timeline">
                                {details.history.map((entry) => (
                                    <li key={entry.OrderHistoryID} className={entry.EntryType === "Note" ? "is-note" : "is-status"}>
                                        <p>
                                            {entry.EntryType === "Note"
                                                ? entry.Note
                                                : <>Status changed from <b>{entry.FromStatus}</b> to <b>{entry.ToStatus}</b></>}
                                        </p>
                                        <small>{formatIndiaDateTime(entry.CreatedAtIndia)}{entry.CreatedBy ? ` · ${entry.CreatedBy}` : ""}</small>
                                    </li>
                                ))}
                                <li className="is-status">
                                    <p>Order placed</p>
                                    <small>{formatIndiaDateTime(order.CreatedAtIndia)}</small>
                                </li>
                            </ol>
                        </section>
                    </div>
                )}
            </aside>
        </div>
    );
}
