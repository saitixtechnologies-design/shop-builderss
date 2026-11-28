import { useEffect, useState } from "react";
import { Link } from "react-router";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Download } from "lucide-react";
import DateRangeFilter from "../../components/shopAdmin/DateRangeFilter.jsx";
import {
    fetchOrderSummary,
    formatIndiaDate,
    formatMoney,
    formatMoneyShort,
    presetRange,
    saveFile,
    statusClass
} from "../../lib/shopOrders.js";
import "../../styles/shop-admin/shop-orders.css";

const csvLine = (cells) => cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");

/** Shop Admin → Reports: revenue and orders for any dates, per day, by status and by product. */
export default function ShopReports() {
    const [range, setRange] = useState(() => ({ preset: "30d", ...presetRange("30d") }));
    const [report, setReport] = useState(null);
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let active = true;
        setLoading(true);
        setError("");
        fetchOrderSummary({ from: range.from, to: range.to })
            .then((data) => active && setReport(data))
            .catch((loadError) => active && setError(loadError.message))
            .finally(() => active && setLoading(false));
        return () => { active = false; };
    }, [range.from, range.to]);

    const downloadDaily = () => {
        const lines = [csvLine(["Date", "Orders", "Revenue (INR)"]),
            ...report.daily.map((day) => csvLine([day.date, day.orders, day.revenue.toFixed(2)]))];
        saveFile(`\uFEFF${lines.join("\r\n")}`, `sales-${report.from}-to-${report.to}.csv`);
    };

    const totals = report?.totals;
    const daysWithSales = report?.daily.filter((day) => day.orders > 0) || [];
    const bestDay = daysWithSales.reduce((best, day) => (!best || day.revenue > best.revenue ? day : best), null);

    return (
        <div className="shop-orders-page">
            <header className="orders-header">
                <div>
                    <span className="orders-eyebrow">SHOP MANAGEMENT</span>
                    <h1>Reports</h1>
                    <p>How much your shop is selling, day by day. Cancelled orders are not counted as revenue.</p>
                </div>
                <div className="orders-header-actions">
                    <button type="button" className="order-primary-button" onClick={downloadDaily} disabled={!report}>
                        <Download size={16} /> Download day-wise CSV
                    </button>
                </div>
            </header>

            <DateRangeFilter value={range} onChange={setRange} />

            {error && <p className="orders-message is-error">{error}</p>}
            {loading && !report && <p className="orders-message">Loading report…</p>}

            {report && (
                <div className={loading ? "is-loading" : ""}>
                    <section className="report-cards">
                        <div className="report-card is-highlight">
                            <span>Revenue</span>
                            <strong>{formatMoney(totals.revenue)}</strong>
                            <small>{formatIndiaDate(report.from)} – {formatIndiaDate(report.to)}</small>
                        </div>
                        <div className="report-card"><span>Orders</span><strong>{totals.orders}</strong><small>{totals.openOrders} still open</small></div>
                        <div className="report-card"><span>Average order</span><strong>{formatMoney(totals.averageOrderValue)}</strong><small>{totals.customers} customers</small></div>
                        <div className="report-card"><span>Delivered</span><strong>{formatMoney(totals.deliveredRevenue)}</strong><small>from delivered orders</small></div>
                        <div className="report-card"><span>Discounts given</span><strong>{formatMoney(totals.discounts)}</strong><small>coupons and offers</small></div>
                        <div className="report-card"><span>Cancelled</span><strong>{totals.cancelledOrders}</strong><small>{formatMoney(totals.cancelledValue)} not counted</small></div>
                    </section>

                    <section className="report-panel">
                        <div className="report-panel-head">
                            <h2>Revenue per day</h2>
                            {bestDay && <span>Best day: <b>{formatIndiaDate(bestDay.date)}</b> · {formatMoney(bestDay.revenue)}</span>}
                        </div>
                        <div className="report-chart">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={report.daily} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                                    <CartesianGrid vertical={false} stroke="#eef0f5" />
                                    <XAxis dataKey="date" tickFormatter={(date) => date.slice(8, 10) + "/" + date.slice(5, 7)} tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} minTickGap={12} />
                                    <YAxis tickFormatter={formatMoneyShort} tick={{ fontSize: 12, fill: "#6b7280" }} tickLine={false} axisLine={false} width={78} />
                                    <Tooltip
                                        cursor={{ fill: "#f3f4ff" }}
                                        formatter={(value, name) => (name === "revenue" ? [formatMoney(value), "Revenue"] : [value, "Orders"])}
                                        labelFormatter={formatIndiaDate}
                                    />
                                    <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} maxBarSize={36} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </section>

                    <div className="report-columns">
                        <section className="report-panel">
                            <div className="report-panel-head"><h2>Orders by status</h2></div>
                            <ul className="report-status-list">
                                {report.byStatus.map((row) => (
                                    <li key={row.status}>
                                        <span className={`order-status-badge is-${statusClass(row.status)}`}>{row.status}</span>
                                        <span>{row.orders}</span>
                                        <b>{formatMoney(row.value)}</b>
                                    </li>
                                ))}
                            </ul>
                        </section>

                        <section className="report-panel">
                            <div className="report-panel-head"><h2>Top products</h2></div>
                            {report.topProducts.length === 0
                                ? <p className="orders-message">No sales in these dates yet.</p>
                                : (
                                    <ol className="report-top-products">
                                        {report.topProducts.map((product) => (
                                            <li key={product.name}>
                                                <span>{product.name}</span>
                                                <small>{product.units} sold</small>
                                                <b>{formatMoney(product.revenue)}</b>
                                            </li>
                                        ))}
                                    </ol>
                                )}
                        </section>
                    </div>

                    {report.bySource && (
                        <section className="report-panel">
                            <div className="report-panel-head">
                                <h2>Sales by source</h2>
                                <Link to="/shop-admin/sales/new">Add a sale</Link>
                            </div>
                            <ul className="report-status-list">
                                {report.bySource.map((row) => (
                                    <li key={row.source}>
                                        <span className={`order-source-tag is-${row.source.toLowerCase()}`}>{row.source === "Online" ? "Website" : row.source}</span>
                                        <span>{row.orders}</span>
                                        <b>{formatMoney(row.revenue)}</b>
                                    </li>
                                ))}
                            </ul>
                        </section>
                    )}

                    <section className="report-panel">
                        <div className="report-panel-head">
                            <h2>Day by day</h2>
                            <Link to="/shop-admin/orders">See the orders</Link>
                        </div>
                        <div className="orders-table-wrap">
                            <table className="orders-table report-daily-table">
                                <thead><tr><th>Date</th><th>Orders</th><th>Revenue</th></tr></thead>
                                <tbody>
                                    {[...report.daily].reverse().map((day) => (
                                        <tr key={day.date} className={day.orders ? "" : "is-empty-day"}>
                                            <td data-label="Date">{formatIndiaDate(day.date)}</td>
                                            <td data-label="Orders">{day.orders}</td>
                                            <td data-label="Revenue"><b>{formatMoney(day.revenue)}</b></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
}
