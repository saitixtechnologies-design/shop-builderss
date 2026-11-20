import { useEffect, useMemo, useState } from "react";
import { toast } from "react-toastify";
import {
    ArrowDownWideNarrow, ArrowUpRight, CalendarDays, Check,
    ChevronDown, CircleAlert, Clock3, Eye, LoaderCircle,
    MapPin, PackageCheck, Phone, RefreshCw, Search, ShoppingBag, Store, X
} from "lucide-react";
import { apiUrl } from "../lib/api";
import "../styles/order-management.css";

const statuses = ["Pending", "Confirmed", "Processing", "Ready", "Out For Delivery", "Delivered", "Cancelled"];
const money = (value) => Number(value || 0).toLocaleString("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const formatDate = (value) => value ? new Date(value).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "—";
const tokenFor = (shopAdmin) => shopAdmin
    ? localStorage.getItem("shopAdminToken") || localStorage.getItem("shopBuilderToken")
    : localStorage.getItem("token") || localStorage.getItem("adminToken");

function OrderManagementPage({ shopAdmin = false }) {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [query, setQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState("All statuses");
    const [shopFilter, setShopFilter] = useState("All shops");
    const [selectedOrder, setSelectedOrder] = useState(null);
    const [detailLoading, setDetailLoading] = useState(false);
    const [saving, setSaving] = useState(false);
    const [nextStatus, setNextStatus] = useState("");

    const listEndpoint = shopAdmin ? "/api/shop-data/orders" : "/api/admin/orders";
    const orderBase = shopAdmin ? "/api/shop-data/orders" : "/api/admin/orders";

    const loadOrders = async (quiet = false) => {
        if (!quiet) setLoading(true);
        setError("");
        try {
            const token = tokenFor(shopAdmin);
            const response = await fetch(apiUrl(listEndpoint), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Orders could not be loaded.");
            setOrders(Array.isArray(result.data) ? result.data : []);
        } catch (loadError) {
            setError(loadError.message || "Orders could not be loaded.");
        } finally {
            if (!quiet) setLoading(false);
        }
    };

    useEffect(() => { loadOrders(); }, [listEndpoint]);

    const filteredOrders = useMemo(() => orders.filter((order) => {
        const text = `${order.OrderNumber || ""} ${order.CustomerName || ""} ${order.CustomerPhone || ""} ${order.ShopName || ""}`.toLowerCase();
        return text.includes(query.toLowerCase())
            && (statusFilter === "All statuses" || order.OrderStatus === statusFilter)
            && (shopAdmin || shopFilter === "All shops" || String(order.ShopID) === shopFilter);
    }), [orders, query, statusFilter, shopFilter, shopAdmin]);

    const openOrder = async (order) => {
        setSelectedOrder({ order, items: [] });
        setNextStatus(order.OrderStatus || "Pending");
        setDetailLoading(true);
        try {
            const token = tokenFor(shopAdmin);
            const response = await fetch(apiUrl(`${orderBase}/${order.OrderID}`), { headers: token ? { Authorization: `Bearer ${token}` } : {} });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Order details could not be loaded.");
            setSelectedOrder(result.data);
            setNextStatus(result.data.order?.OrderStatus || order.OrderStatus || "Pending");
        } catch (detailError) {
            toast.error(detailError.message || "Order details could not be loaded.");
        } finally {
            setDetailLoading(false);
        }
    };

    const saveStatus = async () => {
        if (!selectedOrder?.order || !nextStatus) return;
        setSaving(true);
        try {
            const token = tokenFor(shopAdmin);
            const response = await fetch(apiUrl(`${orderBase}/${selectedOrder.order.OrderID}/status`), {
                method: "PATCH",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ status: nextStatus })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Order status could not be updated.");
            toast.success(`Order ${selectedOrder.order.OrderNumber} marked ${nextStatus.toLowerCase()}.`);
            setSelectedOrder((current) => ({ ...current, order: { ...current.order, OrderStatus: nextStatus } }));
            setOrders((current) => current.map((order) => Number(order.OrderID) === Number(result.data.OrderID)
                ? { ...order, OrderStatus: result.data.OrderStatus }
                : order));
        } catch (saveError) {
            toast.error(saveError.message || "Order status could not be updated.");
        } finally {
            setSaving(false);
        }
    };

    const countFor = (status) => orders.filter((order) => order.OrderStatus === status).length;
    const shopNames = [...new Map(orders.map((order) => [String(order.ShopID), order.ShopName]).filter((entry) => entry[1])).entries()];

    return (
        <section className="orders-page">
            <div className="orders-heading">
                <div>
                    <div className="orders-eyebrow"><span /> {shopAdmin ? "SHOP MANAGEMENT" : "PLATFORM MANAGEMENT"}</div>
                    <h1>{shopAdmin ? "Your orders" : "All orders"}</h1>
                    <p>{shopAdmin ? "Every order placed with your shop, together in one place." : "View and manage orders across every shop on your platform."}</p>
                </div>
                <button className="orders-refresh" type="button" onClick={() => loadOrders()} disabled={loading}>
                    <RefreshCw size={16} className={loading ? "orders-spin" : ""} /> Refresh
                </button>
            </div>

            <div className="orders-stat-row">
                <article><span className="orders-stat-icon total"><ShoppingBag size={17} /></span><div><small>Total orders</small><strong>{orders.length}</strong></div></article>
                <article><span className="orders-stat-icon pending"><Clock3 size={17} /></span><div><small>Pending</small><strong>{countFor("Pending")}</strong></div></article>
                <article><span className="orders-stat-icon processing"><PackageCheck size={17} /></span><div><small>In progress</small><strong>{countFor("Confirmed") + countFor("Processing") + countFor("Ready") + countFor("Out For Delivery")}</strong></div></article>
                <article><span className="orders-stat-icon delivered"><Check size={17} /></span><div><small>Delivered</small><strong>{countFor("Delivered")}</strong></div></article>
            </div>

            <div className="orders-toolbar">
                <label className="orders-search"><Search size={17} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search order, customer or phone" /></label>
                {!shopAdmin && <label className="orders-select-wrap"><Store size={15} /><select value={shopFilter} onChange={(event) => setShopFilter(event.target.value)}><option>All shops</option>{shopNames.map(([id, name]) => <option key={id} value={id}>{name}</option>)}</select><ChevronDown size={14} /></label>}
                <label className="orders-select-wrap"><ArrowDownWideNarrow size={15} /><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}><option>All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><ChevronDown size={14} /></label>
                <span className="orders-result-count">{filteredOrders.length} {filteredOrders.length === 1 ? "order" : "orders"}</span>
            </div>

            <div className="orders-table-card">
                <div className="orders-table-title"><div><h2>{shopAdmin ? "Shop orders" : "Platform orders"}</h2><span>{shopAdmin ? "Only orders belonging to your shop" : "Orders from all active and past shops"}</span></div><span className="orders-live-dot">Live data</span></div>
                {loading ? <div className="orders-state"><LoaderCircle className="orders-spin" size={25} /><span>Loading orders…</span></div>
                    : error ? <div className="orders-state orders-error"><CircleAlert size={24} /><strong>Could not load orders</strong><span>{error}</span><button onClick={() => loadOrders()}>Try again</button></div>
                        : filteredOrders.length === 0 ? <div className="orders-state"><span className="orders-empty-icon"><ShoppingBag size={23} /></span><strong>{orders.length ? "No matching orders" : "No orders yet"}</strong><span>{orders.length ? "Try changing your search or filters." : "New customer orders will appear here."}</span></div>
                            : <div className="orders-table-scroll"><table className="orders-table"><thead><tr><th>ORDER</th>{!shopAdmin && <th>SHOP</th>}<th>CUSTOMER</th><th>DATE</th><th>PAYMENT</th><th>AMOUNT</th><th>STATUS</th><th /></tr></thead><tbody>
                                {filteredOrders.map((order) => <tr key={order.OrderID}>
                                    <td><strong className="orders-number">{order.OrderNumber || `#${order.OrderID}`}</strong><small>#{order.OrderID}</small></td>
                                    {!shopAdmin && <td><span className="orders-shop"><Store size={14} />{order.ShopName || `Shop ${order.ShopID}`}</span></td>}
                                    <td><strong>{order.CustomerName || "Guest customer"}</strong><small>{order.CustomerPhone || "No phone provided"}</small></td>
                                    <td><span className="orders-date"><CalendarDays size={13} />{formatDate(order.CreatedAt)}</span></td>
                                    <td><span className="payment-chip">{order.PaymentStatus || "Pending"}</span></td>
                                    <td><strong>{money(order.GrandTotal)}</strong></td>
                                    <td><span className={`order-status status-${String(order.OrderStatus || "pending").toLowerCase().replaceAll(" ", "-")}`}><i />{order.OrderStatus || "Pending"}</span></td>
                                    <td><button className="order-view-button" onClick={() => openOrder(order)} aria-label={`Manage order ${order.OrderNumber}`}><Eye size={16} /><span>Manage</span><ArrowUpRight size={13} /></button></td>
                                </tr>)}
                            </tbody></table></div>}
            </div>

            {selectedOrder && <div className="order-modal-backdrop" onClick={() => setSelectedOrder(null)}>
                <section className="order-modal" role="dialog" aria-modal="true" aria-labelledby="order-modal-title" onClick={(event) => event.stopPropagation()}>
                    <div className="order-modal-head"><div><span className="orders-eyebrow"><span /> ORDER DETAILS</span><h2 id="order-modal-title">{selectedOrder.order?.OrderNumber || "Order"}</h2>{!shopAdmin && <p><Store size={14} />{selectedOrder.order?.ShopName}</p>}</div><button className="order-modal-close" onClick={() => setSelectedOrder(null)} aria-label="Close order details"><X size={19} /></button></div>
                    {detailLoading ? <div className="orders-state modal-loading"><LoaderCircle className="orders-spin" size={24} /><span>Loading order details…</span></div> : <>
                        <div className="order-detail-customer"><div className="customer-initials">{(selectedOrder.order?.CustomerName || "G").slice(0, 1).toUpperCase()}</div><div><strong>{selectedOrder.order?.CustomerName || "Guest customer"}</strong><span>{selectedOrder.order?.CustomerEmail || selectedOrder.order?.CustomerPhone || "Customer details unavailable"}</span></div>{selectedOrder.order?.CustomerPhone && <a href={`tel:${selectedOrder.order.CustomerPhone}`} aria-label="Call customer"><Phone size={16} /></a>}</div>
                        <div className="order-detail-address"><MapPin size={16} /><span>{[selectedOrder.order?.ShippingAddress, selectedOrder.order?.ShippingCity, selectedOrder.order?.ShippingState, selectedOrder.order?.ShippingPostalCode].filter(Boolean).join(", ") || "No delivery address provided"}</span></div>
                        <div className="order-items-head"><strong>Items in this order</strong><span>{selectedOrder.items?.length || 0} {(selectedOrder.items?.length || 0) === 1 ? "item" : "items"}</span></div>
                        <div className="order-detail-items">{selectedOrder.items?.length ? selectedOrder.items.map((item) => <div className="order-detail-item" key={item.OrderItemID}><span className="order-item-qty">{item.Quantity}×</span><div><strong>{item.ProductName}</strong><small>{item.SKU || "Shop item"}{item.Size ? ` · Size ${item.Size}` : ""} · {money(item.UnitPrice)} each</small></div><strong>{money(item.TotalPrice ?? Number(item.UnitPrice) * Number(item.Quantity))}</strong></div>) : <p className="order-no-items">No item details were saved for this order.</p>}</div>
                        <div className="order-totals"><span>Subtotal</span><strong>{money(selectedOrder.order?.SubTotal)}</strong>{Number(selectedOrder.order?.DiscountAmount) > 0 && <><span>Discount</span><strong>−{money(selectedOrder.order.DiscountAmount)}</strong></>}<span className="grand-total-label">Order total</span><strong className="grand-total-value">{money(selectedOrder.order?.GrandTotal)}</strong></div>
                        <div className="order-status-editor"><label htmlFor="order-status-select">Update order status</label><div><select id="order-status-select" value={nextStatus} onChange={(event) => setNextStatus(event.target.value)}>{statuses.map((status) => <option key={status}>{status}</option>)}</select><button onClick={saveStatus} disabled={saving || nextStatus === selectedOrder.order?.OrderStatus}>{saving ? <LoaderCircle size={15} className="orders-spin" /> : <Check size={15} />}{saving ? "Saving…" : "Save status"}</button></div></div>
                        <div className="order-modal-foot">Placed {formatDate(selectedOrder.order?.CreatedAt)}<span>Payment: {selectedOrder.order?.PaymentStatus || "Pending"} · {selectedOrder.order?.PaymentMethod || "—"}</span></div>
                    </>}
                </section>
            </div>}
        </section>
    );
}

export default OrderManagementPage;
