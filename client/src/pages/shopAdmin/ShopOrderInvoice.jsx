import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { ArrowLeft, Printer } from "lucide-react";
import { API_ORIGIN, apiUrl, getShopAdminHeaders } from "../../lib/api.js";
import { fetchOrder, formatIndiaDateTime, formatMoney } from "../../lib/shopOrders.js";
import "../../styles/shop-admin/shop-orders.css";

/** Uploaded images are stored as "/uploads/..." on the API. */
const imageUrl = (value) => {
    const source = String(value || "").trim();
    if (!source) return "";
    return /^https?:\/\//i.test(source) ? source : `${API_ORIGIN}/${source.replace(/^\/+/, "")}`;
};

async function fetchShopDetails() {
    const response = await fetch(apiUrl("/api/shop-settings/me"), { headers: getShopAdminHeaders() });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) return {};
    return { ...(result.data?.shop || {}), ...(result.data?.settings || {}) };
}

/** Printable invoice for one order: Shop Admin → Orders → Print invoice. */
export default function ShopOrderInvoice() {
    const { id } = useParams();
    const [details, setDetails] = useState(null);
    const [shop, setShop] = useState({});
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        Promise.all([fetchOrder(id), fetchShopDetails()])
            .then(([orderDetails, shopDetails]) => {
                if (!active) return;
                setDetails(orderDetails);
                setShop(shopDetails);
                document.title = `Invoice ${orderDetails.order.OrderNumber}`;
            })
            .catch((loadError) => active && setError(loadError.message));
        return () => { active = false; };
    }, [id]);

    if (error) return <div className="shop-orders-page"><p className="orders-message is-error">{error}</p></div>;
    if (!details) return <div className="shop-orders-page"><p className="orders-message">Preparing invoice…</p></div>;

    const { order, items } = details;
    const logo = imageUrl(shop.ShopLogo || shop.LogoURL);
    const shopAddress = [shop.Address, shop.City, shop.State, shop.Pincode].filter(Boolean).join(", ");
    const deliveryAddress = [order.ShippingAddress, order.ShippingCity, order.ShippingState, order.ShippingPostalCode].filter(Boolean).join(", ");

    return (
        <div className="invoice-page">
            <div className="invoice-toolbar">
                <Link to="/shop-admin/orders" className="order-secondary-button"><ArrowLeft size={16} /> Back to orders</Link>
                <button type="button" className="order-primary-button" onClick={() => window.print()}><Printer size={16} /> Print / Save as PDF</button>
            </div>

            <article className="invoice-sheet">
                <header className="invoice-head">
                    <div className="invoice-shop">
                        {logo && <img src={logo} alt="" />}
                        <div>
                            <h1>{shop.ShopName || "Invoice"}</h1>
                            {shopAddress && <p>{shopAddress}</p>}
                            <p>{[shop.Phone, shop.Email].filter(Boolean).join(" · ")}</p>
                        </div>
                    </div>
                    <div className="invoice-meta">
                        <h2>INVOICE</h2>
                        <p><span>Order</span><b>{order.OrderNumber}</b></p>
                        <p><span>Date</span><b>{formatIndiaDateTime(order.CreatedAtIndia)}</b></p>
                        <p><span>Status</span><b>{order.OrderStatus}</b></p>
                    </div>
                </header>

                <section className="invoice-bill-to">
                    <span>Bill to</span>
                    <strong>{order.CustomerName || order.ShippingName || "—"}</strong>
                    {order.CustomerPhone && <p>{order.CustomerPhone}</p>}
                    {deliveryAddress && <p>{deliveryAddress}</p>}
                </section>

                <table className="invoice-items">
                    <thead>
                        <tr><th>#</th><th>Item</th><th>Qty</th><th>Price</th><th>Amount</th></tr>
                    </thead>
                    <tbody>
                        {items.map((item, index) => (
                            <tr key={item.OrderItemID}>
                                <td>{index + 1}</td>
                                <td>
                                    {item.ProductName}
                                    {(item.Size || item.SKU) && <small>{[item.Size && `Size ${item.Size}`, item.SKU].filter(Boolean).join(" · ")}</small>}
                                </td>
                                <td>{item.Quantity}</td>
                                <td>{formatMoney(item.UnitPrice)}</td>
                                <td>{formatMoney(item.TotalPrice)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                <dl className="invoice-totals">
                    <div><dt>Subtotal</dt><dd>{formatMoney(order.SubTotal)}</dd></div>
                    {Number(order.DiscountAmount) > 0 && <div><dt>Discount</dt><dd>−{formatMoney(order.DiscountAmount)}</dd></div>}
                    {Number(order.ShippingAmount) > 0 && <div><dt>Delivery</dt><dd>{formatMoney(order.ShippingAmount)}</dd></div>}
                    {Number(order.TaxAmount) > 0 && <div><dt>Tax</dt><dd>{formatMoney(order.TaxAmount)}</dd></div>}
                    <div className="is-total"><dt>Total</dt><dd>{formatMoney(order.GrandTotal)}</dd></div>
                </dl>

                <footer className="invoice-foot">Thank you for shopping with {shop.ShopName || "us"}.</footer>
            </article>
        </div>
    );
}
