import { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "react-toastify";
import { BellOff, BellRing, ChevronLeft, ChevronRight, CirclePlus, Download, Eye, Search, X } from "lucide-react";
import DateRangeFilter from "../../components/shopAdmin/DateRangeFilter.jsx";
import OrderDetailsPanel from "../../components/shopAdmin/OrderDetailsPanel.jsx";
import { isOrderSoundOn, markOrdersSeen, setOrderSound } from "../../hooks/useNewOrderAlerts.js";
import {
    ORDER_SOURCES,
    ORDER_STATUSES,
    changeOrderStatus,
    downloadOrdersCsv,
    fetchOrderSummary,
    fetchOrders,
    formatIndiaDateTime,
    formatMoney,
    presetRange,
    statusClass
} from "../../lib/shopOrders.js";
import "../../styles/shop-admin/shop-orders.css";

const PAGE_SIZE = 20;

/** Shop Admin → Orders: filter by date, status, customer or search; change status; open details. */
export default function ShopOrders() {
    const [searchParams, setSearchParams] = useSearchParams();
    const customerId = searchParams.get("customer") || "";
    const customerName = searchParams.get("name") || "";

    const [range, setRange] = useState(() => ({ preset: "30d", ...presetRange("30d") }));
    const [status, setStatus] = useState("All");
    const [source, setSource] = useState("All");
    const [searchInput, setSearchInput] = useState("");
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [orders, setOrders] = useState([]);
    const [total, setTotal] = useState(0);
    const [summary, setSummary] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [openOrderId, setOpenOrderId] = useState(null);
    const [updatingId, setUpdatingId] = useState(null);
    const [exporting, setExporting] = useState(false);
    const [soundOn, setSoundOn] = useState(isOrderSoundOn);

    const filters = useMemo(() => ({
        from: range.from,
        to: range.to,
        status,
        source,
        search,
        customerId,
        page,
        pageSize: PAGE_SIZE
    }), [range.from, range.to, status, source, search, customerId, page]);

    // Search after the owner stops typing.
    useEffect(() => {
        const timer = setTimeout(() => {
            setSearch(searchInput.trim());
            setPage(1);
        }, 350);
        return () => clearTimeout(timer);
    }, [searchInput]);

    const loadOrders = useCallback(async () => {
        setLoading(true);
        setError("");
        try {
            const result = await fetchOrders(filters);
            setOrders(result.data);
            setTotal(result.meta.total);
        } catch (loadError) {
            setError(loadError.message);
        } finally {
            setLoading(false);
        }
    }, [filters]);

    useEffect(() => { loadOrders(); }, [loadOrders]);

    // Status counts and revenue for the chosen dates.
    useEffect(() => {
        let active = true;
        fetchOrderSummary({ from: range.from, to: range.to })
            .then((data) => active && setSummary(data))
            .catch(() => active && setSummary(null));
        return () => { active = false; };
    }, [range.from, range.to]);

    // Opening this page clears the new-order badge.
    useEffect(() => { markOrdersSeen(); }, []);

    const changeRange = (next) => { setRange(next); setPage(1); };
    const changeStatusFilter = (next) => { setStatus(next); setPage(1); };
    const changeSourceFilter = (next) => { setSource(next); setPage(1); };
    const clearCustomer = () => setSearchParams({});

    const updateStatus = async (order, nextStatus) => {
        setUpdatingId(order.OrderID);
        try {
            await changeOrderStatus(order.OrderID, nextStatus);
            setOrders((current) => current.map((item) => (item.OrderID === order.OrderID ? { ...item, OrderStatus: nextStatus } : item)));
            toast.success(`${order.OrderNumber} marked ${nextStatus}`);
        } catch (statusError) {
            toast.error(statusError.message);
        } finally {
            setUpdatingId(null);
        }
    };

    const exportCsv = async () => {
        setExporting(true);
        try {
            await downloadOrdersCsv({ ...filters, page: undefined, pageSize: undefined });
        } catch (exportError) {
            toast.error(exportError.message);
        } finally {
            setExporting(false);
        }
    };

    const toggleSound = () => {
        setOrderSound(!soundOn);
        setSoundOn(!soundOn);
    };

    const countFor = (name) => (name === "All"
        ? summary?.byStatus.reduce((sum, row) => sum + row.orders, 0)
        : summary?.byStatus.find((row) => row.status === name)?.orders);

    const firstRow = total ? (page - 1) * PAGE_SIZE + 1 : 0;
    const lastRow = Math.min(page * PAGE_SIZE, total);
    const lastPage = Math.max(1, Math.ceil(total / PAGE_SIZE));

    return (
        <div className="shop-orders-page">
            <header className="orders-header">
                <div>
                    <span className="orders-eyebrow">SHOP MANAGEMENT</span>
                    <h1>Orders</h1>
                    <p>See every order, change its status and keep notes. Times are in Indian time.</p>
                </div>
                <div className="orders-header-actions">
                    <Link className="order-primary-button order-add-sale-button" to="/shop-admin/sales/new">
                        <CirclePlus size={16} /> Add sale
                    </Link>
                    <button type="button" className="order-secondary-button" onClick={toggleSound} aria-pressed={soundOn}>
                        {soundOn ? <BellRing size={16} /> : <BellOff size={16} />}
                        {soundOn ? "Sound on" : "Sound off"}
                    </button>
                    <button type="button" className="order-primary-button" onClick={exportCsv} disabled={exporting || !total}>
                        <Download size={16} /> {exporting ? "Preparing…" : "Download CSV"}
                    </button>
                </div>
            </header>

            <DateRangeFilter value={range} onChange={changeRange} />

            {summary && (
                <div className="orders-quick-stats">
                    <div><span>Revenue</span><strong>{formatMoney(summary.totals.revenue)}</strong></div>
                    <div><span>Orders</span><strong>{summary.totals.orders}</strong></div>
                    <div><span>Open orders</span><strong>{summary.totals.openOrders}</strong></div>
                    <div><span>Cancelled</span><strong>{summary.totals.cancelledOrders}</strong></div>
                </div>
            )}

            <div className="orders-toolbar">
                <div className="orders-status-chips" role="group" aria-label="Filter by status">
                    {["All", ...ORDER_STATUSES].map((name) => (
                        <button
                            key={name}
                            type="button"
                            className={status === name ? "is-selected" : ""}
                            aria-pressed={status === name}
                            onClick={() => changeStatusFilter(name)}
                        >
                            {name}
                            {countFor(name) !== undefined && <span>{countFor(name)}</span>}
                        </button>
                    ))}
                </div>
                <label className="orders-source-filter">
                    <span className="visually-hidden">Where the order came from</span>
                    <select value={source} onChange={(event) => changeSourceFilter(event.target.value)}>
                        <option value="All">All sources</option>
                        {ORDER_SOURCES.map((name) => <option key={name} value={name}>{name === "Online" ? "Website (online)" : name}</option>)}
                    </select>
                </label>
                <label className="orders-search">
                    <Search size={16} aria-hidden="true" />
                    <span className="visually-hidden">Search orders</span>
                    <input
                        value={searchInput}
                        onChange={(event) => setSearchInput(event.target.value)}
                        placeholder="Order number, customer name or phone"
                    />
                </label>
            </div>

            {customerId && (
                <div className="orders-customer-filter">
                    Showing orders of <b>{customerName || `customer #${customerId}`}</b>
                    <button type="button" onClick={clearCustomer} aria-label="Show all customers"><X size={15} /></button>
                </div>
            )}

            {error && <p className="orders-message is-error">{error}</p>}
            {!error && !loading && orders.length === 0 && (
                <p className="orders-message">No orders for these dates and filters.</p>
            )}

            {orders.length > 0 && (
                <div className={`orders-table-wrap ${loading ? "is-loading" : ""}`}>
                    <table className="orders-table">
                        <thead>
                            <tr>
                                <th>Order</th>
                                <th>Date</th>
                                <th>Customer</th>
                                <th>Items</th>
                                <th>Total</th>
                                <th>Status</th>
                                <th><span className="visually-hidden">Open</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {orders.map((order) => (
                                <tr key={order.OrderID}>
                                    <td data-label="Order">
                                        <button type="button" className="order-link" onClick={() => setOpenOrderId(order.OrderID)}>{order.OrderNumber}</button>
                                        <span className="order-tags">
                                            <span className={`order-source-tag is-${String(order.OrderSource || "Online").toLowerCase()}`}>{order.OrderSource === "Online" || !order.OrderSource ? "Website" : order.OrderSource}</span>
                                            {order.OrderSource && order.OrderSource !== "Online" && order.PaymentStatus !== "Paid" && <span className="order-source-tag is-unpaid">Not paid</span>}
                                        </span>
                                    </td>
                                    <td data-label="Date">{formatIndiaDateTime(order.CreatedAtIndia)}</td>
                                    <td data-label="Customer">
                                        <span className="order-customer">{order.CustomerName || "—"}</span>
                                        <small>{order.CustomerPhone}</small>
                                    </td>
                                    <td data-label="Items">{order.ItemCount}</td>
                                    <td data-label="Total"><b>{formatMoney(order.GrandTotal)}</b></td>
                                    <td data-label="Status">
                                        <select
                                            className={`order-status-select is-${statusClass(order.OrderStatus)}`}
                                            value={order.OrderStatus}
                                            disabled={updatingId === order.OrderID}
                                            onChange={(event) => updateStatus(order, event.target.value)}
                                            aria-label={`Status of ${order.OrderNumber}`}
                                        >
                                            {ORDER_STATUSES.map((name) => <option key={name} value={name}>{name}</option>)}
                                        </select>
                                    </td>
                                    <td className="orders-open-cell">
                                        <button type="button" className="order-icon-button" onClick={() => setOpenOrderId(order.OrderID)} aria-label={`Open ${order.OrderNumber}`}>
                                            <Eye size={17} />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {total > PAGE_SIZE && (
                <nav className="orders-pagination" aria-label="Pages">
                    <span>{firstRow}–{lastRow} of {total}</span>
                    <button type="button" className="order-icon-button" disabled={page === 1} onClick={() => setPage(page - 1)} aria-label="Previous page"><ChevronLeft size={18} /></button>
                    <button type="button" className="order-icon-button" disabled={page === lastPage} onClick={() => setPage(page + 1)} aria-label="Next page"><ChevronRight size={18} /></button>
                </nav>
            )}

            {openOrderId && (
                <OrderDetailsPanel
                    orderId={openOrderId}
                    onClose={() => setOpenOrderId(null)}
                    onStatusChanged={(orderId, nextStatus) => setOrders((current) => current.map((item) => (item.OrderID === orderId ? { ...item, OrderStatus: nextStatus } : item)))}
                />
            )}
        </div>
    );
}
