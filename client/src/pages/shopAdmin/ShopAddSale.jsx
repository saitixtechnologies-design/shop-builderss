import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router";
import { CheckCircle2, Minus, Package, Plus, Printer, Search, ShoppingBag, Trash2 } from "lucide-react";
import { apiUrl } from "../../lib/api.js";
import { SALE_PAYMENT_METHODS, SALE_SOURCES, createSale, fetchSaleProducts, formatMoney } from "../../lib/shopOrders.js";
import "../../styles/shop-admin/shop-orders.css";
import "../../styles/shop-admin/shop-add-sale.css";

const SOURCE_HINTS = {
    Counter: "Customer bought at the shop",
    Phone: "Order taken on a phone call",
    WhatsApp: "Order taken on WhatsApp",
    Other: "Any other way"
};

const imageSrc = (url) => (!url ? "" : /^https?:\/\//i.test(url) ? url : apiUrl(url));
const toNumber = (value) => (value === "" || value === null || value === undefined ? NaN : Number(value));

const emptySale = () => ({
    source: "Counter",
    customer: { name: "", phone: "", address: "", city: "" },
    paymentMethod: "Cash",
    paid: true,
    handedOver: true,
    discount: "",
    note: ""
});

/** Shop Admin → Add Sale: record a counter, phone or WhatsApp sale. Stock goes down when saved. */
export default function ShopAddSale() {
    const navigate = useNavigate();
    const searchRef = useRef(null);
    const [search, setSearch] = useState("");
    const [products, setProducts] = useState([]);
    const [searching, setSearching] = useState(true);
    const [searchError, setSearchError] = useState("");
    const [cart, setCart] = useState([]);
    const [sale, setSale] = useState(emptySale);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [saved, setSaved] = useState(null);

    // Product search (waits until the owner stops typing).
    useEffect(() => {
        let active = true;
        const timer = setTimeout(() => {
            setSearching(true);
            fetchSaleProducts(search.trim())
                .then((data) => { if (active) { setProducts(data); setSearchError(""); } })
                .catch((loadError) => active && setSearchError(loadError.message))
                .finally(() => active && setSearching(false));
        }, 250);
        return () => { active = false; clearTimeout(timer); };
    }, [search]);

    // Any change clears the last error; a new one shows only when the owner presses Save again.
    const update = (field, value) => {
        setError("");
        setSale((current) => ({ ...current, [field]: value }));
    };
    const updateCustomer = (field, value) => {
        setError("");
        setSale((current) => ({ ...current, customer: { ...current.customer, [field]: value } }));
    };

    const addProduct = (product) => {
        setError("");
        setCart((current) => {
            // Same product without sizes: add one more to its line.
            const existing = !product.sizes.length && current.find((line) => line.productID === product.productID && !line.priceChanged);
            if (existing) return current.map((line) => (line === existing ? { ...line, quantity: line.quantity + 1 } : line));
            return [...current, {
                key: `${product.productID}-${Date.now()}`,
                productID: product.productID,
                name: product.name,
                sku: product.sku,
                image: product.image,
                stock: product.stock,
                sizes: product.sizes,
                size: product.sizes.length === 1 ? product.sizes[0] : "",
                quantity: 1,
                listPrice: product.price,
                unitPrice: String(product.price),
                priceChanged: false
            }];
        });
    };

    const changeLine = (key, changes) => {
        setError("");
        setCart((current) => current.map((line) => (line.key === key ? { ...line, ...changes } : line)));
    };
    const removeLine = (key) => {
        setError("");
        setCart((current) => current.filter((line) => line.key !== key));
    };

    // Quantity of each product across all its lines (sizes share one stock count).
    const usedStock = useMemo(() => {
        const used = new Map();
        cart.forEach((line) => used.set(line.productID, (used.get(line.productID) || 0) + (Number(line.quantity) || 0)));
        return used;
    }, [cart]);

    const subtotal = cart.reduce((sum, line) => sum + (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0), 0);
    const discount = Number(sale.discount) || 0;
    const total = Math.max(0, subtotal - discount);

    const problem = (() => {
        if (!cart.length) return "Add at least one product.";
        for (const line of cart) {
            if (line.sizes.length && !line.size) return `Choose a size for ${line.name}.`;
            if (!(Number.isInteger(Number(line.quantity)) && Number(line.quantity) >= 1)) return `Enter a quantity for ${line.name}.`;
            if (!(toNumber(line.unitPrice) >= 0)) return `Enter a price for ${line.name}.`;
            if (usedStock.get(line.productID) > line.stock) return `Only ${line.stock} of ${line.name} in stock.`;
        }
        if (discount < 0 || discount > subtotal) return "Discount cannot be more than the sale amount.";
        const digits = sale.customer.phone.replace(/\D/g, "");
        if (digits && digits.length < 10) return "Enter a 10-digit phone number, or leave it empty.";
        return "";
    })();

    const save = async (event) => {
        event.preventDefault();
        if (problem) { setError(problem); return; }
        setSaving(true);
        setError("");
        try {
            const result = await createSale({
                source: sale.source,
                items: cart.map((line) => ({
                    productID: line.productID,
                    quantity: Number(line.quantity),
                    size: line.size || undefined,
                    unitPrice: Number(line.unitPrice)
                })),
                discount,
                paymentMethod: sale.paymentMethod,
                paid: sale.paid,
                status: sale.handedOver ? "Delivered" : "Pending",
                customer: sale.customer,
                note: sale.note
            });
            setSaved(result);
            window.scrollTo({ top: 0, behavior: "smooth" });
        } catch (saveError) {
            setError(saveError.message);
        } finally {
            setSaving(false);
        }
    };

    const startNewSale = () => {
        setSaved(null);
        setCart([]);
        setSale(emptySale());
        setSearch("");
        setTimeout(() => searchRef.current?.focus(), 50);
    };

    if (saved) {
        return (
            <div className="shop-orders-page add-sale-page">
                <section className="add-sale-done" aria-live="polite">
                    <CheckCircle2 size={44} />
                    <h1>Sale saved</h1>
                    <p><b>{saved.orderNumber}</b> · {formatMoney(saved.total)} · {saved.source}</p>
                    <p className="add-sale-muted">Stock is updated. The sale is in Orders and Reports.</p>
                    <div className="add-sale-done-actions">
                        <button type="button" className="order-primary-button" onClick={startNewSale}><Plus size={16} /> Add another sale</button>
                        <button type="button" className="order-secondary-button" onClick={() => navigate(`/shop-admin/orders/${saved.orderID}/invoice`)}><Printer size={16} /> Print bill</button>
                        <Link className="order-secondary-button" to="/shop-admin/orders">Go to Orders</Link>
                    </div>
                </section>
            </div>
        );
    }

    return (
        <div className="shop-orders-page add-sale-page">
            <header className="orders-header">
                <div>
                    <span className="orders-eyebrow">SHOP MANAGEMENT</span>
                    <h1>Add Sale</h1>
                    <p>Record a sale made at the counter, on the phone or on WhatsApp. Stock goes down when you save.</p>
                </div>
            </header>

            <form className="add-sale-layout" onSubmit={save} noValidate>
                {/* ----------------------------------------- products */}
                <section className="add-sale-card add-sale-products" aria-labelledby="sale-products-title">
                    <h2 id="sale-products-title">1. Products</h2>
                    <label className="add-sale-search">
                        <Search size={17} aria-hidden="true" />
                        <span className="visually-hidden">Search products</span>
                        <input
                            id="sale-search"
                            ref={searchRef}
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                            placeholder="Search by product name or SKU"
                            autoComplete="off"
                        />
                    </label>

                    <div className={`add-sale-results ${searching ? "is-loading" : ""}`}>
                        {searchError && <p className="orders-message is-error">{searchError}</p>}
                        {!searchError && !searching && !products.length && (
                            <p className="add-sale-muted">No products match “{search}”.</p>
                        )}
                        {products.map((product) => {
                            const soldOut = product.stock <= 0;
                            return (
                                <button
                                    key={product.productID}
                                    type="button"
                                    className="add-sale-result"
                                    onClick={() => addProduct(product)}
                                    disabled={soldOut}
                                >
                                    {product.image ? <img src={imageSrc(product.image)} alt="" loading="lazy" /> : <span className="add-sale-thumb"><Package size={18} /></span>}
                                    <span className="add-sale-result-text">
                                        <strong>{product.name}</strong>
                                        <small>{formatMoney(product.price)} · {soldOut ? "Out of stock" : `${product.stock} in stock`}</small>
                                    </span>
                                    <Plus size={18} className="add-sale-result-add" aria-hidden="true" />
                                </button>
                            );
                        })}
                    </div>
                </section>

                {/* ----------------------------------------- bill */}
                <section className="add-sale-card add-sale-bill" aria-labelledby="sale-bill-title">
                    <h2 id="sale-bill-title">2. Bill</h2>

                    {!cart.length ? (
                        <div className="add-sale-empty">
                            <ShoppingBag size={26} />
                            <p>Tap a product on the left to add it to the bill.</p>
                        </div>
                    ) : (
                        <ul className="add-sale-lines">
                            {cart.map((line) => {
                                const overStock = usedStock.get(line.productID) > line.stock;
                                const lineTotal = (Number(line.unitPrice) || 0) * (Number(line.quantity) || 0);
                                return (
                                    <li key={line.key} className={overStock ? "is-over" : ""}>
                                        <div className="add-sale-line-head">
                                            <strong>{line.name}</strong>
                                            <button type="button" className="add-sale-remove" onClick={() => removeLine(line.key)} aria-label={`Remove ${line.name}`}><Trash2 size={16} /></button>
                                        </div>
                                        <div className="add-sale-line-fields">
                                            {line.sizes.length > 0 && (
                                                <label>
                                                    <span>Size</span>
                                                    <select id={`size-${line.key}`} value={line.size} onChange={(event) => changeLine(line.key, { size: event.target.value })}>
                                                        <option value="">Choose</option>
                                                        {line.sizes.map((size) => <option key={size} value={size}>{size}</option>)}
                                                    </select>
                                                </label>
                                            )}
                                            <div className="add-sale-qty">
                                                <span>Qty</span>
                                                <div>
                                                    <button type="button" onClick={() => changeLine(line.key, { quantity: Math.max(1, (Number(line.quantity) || 1) - 1) })} aria-label="One less"><Minus size={15} /></button>
                                                    <input id={`qty-${line.key}`} inputMode="numeric" value={line.quantity} onChange={(event) => changeLine(line.key, { quantity: event.target.value.replace(/\D/g, "").slice(0, 4) })} aria-label={`Quantity of ${line.name}`} />
                                                    <button type="button" onClick={() => changeLine(line.key, { quantity: (Number(line.quantity) || 0) + 1 })} aria-label="One more"><Plus size={15} /></button>
                                                </div>
                                            </div>
                                            <label>
                                                <span>Price (₹)</span>
                                                <input
                                                    id={`price-${line.key}`}
                                                    inputMode="decimal"
                                                    value={line.unitPrice}
                                                    onChange={(event) => changeLine(line.key, { unitPrice: event.target.value.replace(/[^\d.]/g, ""), priceChanged: true })}
                                                />
                                            </label>
                                            <div className="add-sale-line-total">
                                                <span>Total</span>
                                                <b>{formatMoney(lineTotal)}</b>
                                            </div>
                                        </div>
                                        {overStock && <p className="add-sale-warning">Only {line.stock} in stock.</p>}
                                        {line.priceChanged && Number(line.unitPrice) !== line.listPrice && (
                                            <p className="add-sale-muted">Usual price {formatMoney(line.listPrice)}</p>
                                        )}
                                    </li>
                                );
                            })}
                        </ul>
                    )}

                    <div className="add-sale-totals">
                        <div><span>Subtotal</span><b>{formatMoney(subtotal)}</b></div>
                        <label>
                            <span>Discount (₹)</span>
                            <input id="sale-discount" inputMode="decimal" value={sale.discount} onChange={(event) => update("discount", event.target.value.replace(/[^\d.]/g, ""))} placeholder="0" />
                        </label>
                        <div className="add-sale-grand"><span>Total</span><b>{formatMoney(total)}</b></div>
                    </div>
                </section>

                {/* ----------------------------------------- details */}
                <section className="add-sale-card add-sale-details" aria-labelledby="sale-details-title">
                    <h2 id="sale-details-title">3. Sale details</h2>

                    <fieldset className="add-sale-choice">
                        <legend>Where was it sold?</legend>
                        <div className="add-sale-segments">
                            {SALE_SOURCES.map((source) => (
                                <label key={source} className={sale.source === source ? "is-selected" : ""} title={SOURCE_HINTS[source]}>
                                    <input type="radio" name="sale-source" value={source} checked={sale.source === source} onChange={() => update("source", source)} />
                                    {source}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className="add-sale-grid">
                        <label>
                            <span>Customer name <small>(optional)</small></span>
                            <input id="sale-customer-name" value={sale.customer.name} onChange={(event) => updateCustomer("name", event.target.value)} placeholder={sale.source === "Counter" ? "Walk-in customer" : "Customer name"} maxLength={150} />
                        </label>
                        <label>
                            <span>Phone <small>(optional)</small></span>
                            <input id="sale-customer-phone" inputMode="tel" value={sale.customer.phone} onChange={(event) => updateCustomer("phone", event.target.value.replace(/[^\d+ ]/g, ""))} placeholder="10-digit mobile number" maxLength={16} />
                        </label>
                    </div>
                    <p className="add-sale-muted">With a phone number, the sale is added to that customer in Customers.</p>

                    <div className="add-sale-grid">
                        <label>
                            <span>Payment</span>
                            <select id="sale-payment" value={sale.paymentMethod} onChange={(event) => update("paymentMethod", event.target.value)}>
                                {SALE_PAYMENT_METHODS.map((method) => <option key={method} value={method}>{method}</option>)}
                            </select>
                        </label>
                        <fieldset className="add-sale-choice">
                            <legend>Paid?</legend>
                            <div className="add-sale-segments">
                                <label className={sale.paid ? "is-selected" : ""}><input type="radio" name="sale-paid" checked={sale.paid} onChange={() => update("paid", true)} />Paid</label>
                                <label className={!sale.paid ? "is-selected" : ""}><input type="radio" name="sale-paid" checked={!sale.paid} onChange={() => update("paid", false)} />Not paid yet</label>
                            </div>
                        </fieldset>
                    </div>

                    <fieldset className="add-sale-choice">
                        <legend>Has the customer got the items?</legend>
                        <div className="add-sale-segments">
                            <label className={sale.handedOver ? "is-selected" : ""}><input type="radio" name="sale-handover" checked={sale.handedOver} onChange={() => update("handedOver", true)} />Yes, handed over</label>
                            <label className={!sale.handedOver ? "is-selected" : ""}><input type="radio" name="sale-handover" checked={!sale.handedOver} onChange={() => update("handedOver", false)} />No, deliver later</label>
                        </div>
                    </fieldset>

                    {!sale.handedOver && (
                        <div className="add-sale-grid">
                            <label>
                                <span>Delivery address</span>
                                <input id="sale-address" value={sale.customer.address} onChange={(event) => updateCustomer("address", event.target.value)} maxLength={500} />
                            </label>
                            <label>
                                <span>City</span>
                                <input id="sale-city" value={sale.customer.city} onChange={(event) => updateCustomer("city", event.target.value)} maxLength={100} />
                            </label>
                        </div>
                    )}

                    <label className="add-sale-note">
                        <span>Note <small>(only you see this)</small></span>
                        <textarea id="sale-note" rows={2} value={sale.note} onChange={(event) => update("note", event.target.value)} maxLength={1000} placeholder="For example: customer will pay the rest on Friday" />
                    </label>
                </section>

                {/* ----------------------------------------- save bar */}
                <div className="add-sale-savebar">
                    <div>
                        <span>{cart.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0)} items</span>
                        <b>{formatMoney(total)}</b>
                    </div>
                    {error && <p className="add-sale-error" role="alert">{error}</p>}
                    <button type="submit" className="order-primary-button" disabled={saving || !cart.length}>
                        {saving ? "Saving…" : "Save sale"}
                    </button>
                </div>
            </form>
        </div>
    );
}
