import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { CheckCircle2, Clock3, Copy, ExternalLink, Globe, RefreshCw, Trash2 } from "lucide-react";
import { apiUrl, getShopAdminHeaders } from "../../lib/api.js";
import "../../styles/shop-admin/shop-domain.css";

// "Website address" card in Shop Settings: the shop's links, its free subdomain and its own domain.
// Talks to /api/shop-settings/me/domain (see docs/DOMAINS.md for how it all fits together).

const PUBLIC_SHOP_URL = (import.meta.env.VITE_PUBLIC_SHOP_URL || "http://localhost:5174").replace(/\/+$/, "");

async function domainRequest(method, path = "", body) {
    const response = await fetch(apiUrl(`/api/shop-settings/me/domain${path}`), {
        method,
        headers: getShopAdminHeaders({ "Content-Type": "application/json" }),
        body: body ? JSON.stringify(body) : undefined
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok || !result.success) throw new Error(result.message || "Something went wrong. Please try again.");
    return result;
}

const copy = async (text) => {
    try {
        await navigator.clipboard.writeText(text);
        toast.success("Copied");
    } catch {
        toast.error("Could not copy. Select the text and copy it yourself.");
    }
};

function AddressRow({ label, url, note }) {
    return (
        <div className="domain-address-row">
            <div className="domain-address-copy">
                <span>{label}</span>
                {url ? <a href={url} target="_blank" rel="noopener noreferrer">{url.replace(/^https?:\/\//, "")}</a> : <em>{note}</em>}
            </div>
            {url && (
                <div className="domain-address-actions">
                    <button type="button" onClick={() => copy(url)} aria-label={`Copy ${label}`}><Copy size={16} /></button>
                    <a href={url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${label}`}><ExternalLink size={16} /></a>
                </div>
            )}
        </div>
    );
}

export default function ShopDomainCard() {
    const [info, setInfo] = useState(null);
    const [loading, setLoading] = useState(true);
    const [busy, setBusy] = useState("");
    const [domainInput, setDomainInput] = useState("");
    const [editing, setEditing] = useState(false);
    const [checkMessage, setCheckMessage] = useState("");

    useEffect(() => {
        domainRequest("GET")
            .then((result) => setInfo(result.data))
            .catch((error) => toast.error(error.message))
            .finally(() => setLoading(false));
    }, []);

    const run = async (action, task) => {
        setBusy(action);
        try {
            await task();
        } catch (error) {
            toast.error(error.message);
        } finally {
            setBusy("");
        }
    };

    const saveDomain = (event) => {
        event.preventDefault();
        run("save", async () => {
            const result = await domainRequest("PUT", "", { domain: domainInput });
            setInfo(result.data);
            setEditing(false);
            setDomainInput("");
            setCheckMessage(result.data.hosting?.message || "");
            toast.success(result.message || "Domain saved");
        });
    };

    const checkNow = () => run("check", async () => {
        const result = await domainRequest("POST", "/verify");
        setInfo(result.data);
        setCheckMessage(result.message);
        if (result.data.status === "Active") toast.success("Domain connected");
    });

    const removeDomain = () => {
        if (!window.confirm("Remove this domain? Your shop will stop opening on it.")) return;
        run("remove", async () => {
            const result = await domainRequest("DELETE");
            setInfo(result.data);
            setCheckMessage("");
            toast.success("Domain removed");
        });
    };

    if (loading) return <section className="settings-card domain-card"><p className="domain-muted">Loading website address…</p></section>;
    if (!info) return null;

    const shopLink = `${PUBLIC_SHOP_URL}/shop/${info.slug}`;
    const connected = info.status === "Active";
    const showForm = !info.customDomain || editing;

    return (
        <section className="settings-card domain-card">
            <div className="settings-card-header">
                <div className="settings-section-icon"><Globe size={20} /></div>
                <div>
                    <h2>Website address</h2>
                    <p>Where customers open your shop. Share any of these links.</p>
                </div>
            </div>

            <div className="domain-addresses">
                <AddressRow label="Shop link" url={shopLink} />
                <AddressRow label="Free address" url={info.freeAddress} note="Not switched on yet. The platform team turns on free addresses for all shops." />
                {connected && <AddressRow label="Your domain" url={`https://${info.customDomain}`} />}
            </div>

            <div className="domain-own">
                <h3>Use your own domain</h3>
                <p className="domain-muted">Buy a domain (for example from GoDaddy or Hostinger), then connect it here. Your shop will open on it with a secure https link.</p>

                {info.migrationNeeded ? (
                    <p className="domain-note">Own domains are not switched on yet. The platform team needs to run one database update first.</p>
                ) : (
                    <>
                        {info.customDomain && !editing && (
                            <div className="domain-status-row">
                                <strong>{info.customDomain}</strong>
                                <span className={`domain-badge ${connected ? "is-active" : "is-pending"}`}>
                                    {connected ? <CheckCircle2 size={15} /> : <Clock3 size={15} />}
                                    {connected ? "Connected" : "Waiting for DNS"}
                                </span>
                            </div>
                        )}

                        {showForm && (
                            <form className="domain-form" onSubmit={saveDomain}>
                                <label htmlFor="shop-custom-domain">Your domain</label>
                                <div>
                                    <input
                                        id="shop-custom-domain"
                                        value={domainInput}
                                        onChange={(event) => setDomainInput(event.target.value)}
                                        placeholder="www.yourshop.com"
                                        autoComplete="off"
                                        spellCheck="false"
                                        inputMode="url"
                                        required
                                    />
                                    <button type="submit" className="domain-primary" disabled={busy === "save"}>
                                        {busy === "save" ? "Saving…" : "Connect domain"}
                                    </button>
                                    {editing && <button type="button" className="domain-secondary" onClick={() => setEditing(false)}>Cancel</button>}
                                </div>
                                <small>Tip: use the www version, like www.yourshop.com. It is the easiest to connect.</small>
                            </form>
                        )}

                        {info.customDomain && !editing && !connected && (
                            <ol className="domain-steps">
                                <li>Open the website where you bought this domain and go to its DNS settings.</li>
                                <li>
                                    Add these two records exactly as shown:
                                    <div className="domain-records" role="table" aria-label="DNS records to add">
                                        <div className="domain-record is-head" role="row"><span>Type</span><span>Name</span><span>Value</span><span /></div>
                                        {info.records.map((record) => (
                                            <div className="domain-record" role="row" key={record.type}>
                                                <span data-label="Type"><b>{record.type}</b></span>
                                                <span data-label="Name"><code>{record.name}</code></span>
                                                <span data-label="Value"><code>{record.value}</code></span>
                                                <button type="button" onClick={() => copy(record.value)} aria-label={`Copy ${record.type} value`}><Copy size={15} /></button>
                                            </div>
                                        ))}
                                    </div>
                                </li>
                                <li>Come back and press Check now. DNS changes can take from a few minutes up to 24 hours.</li>
                            </ol>
                        )}

                        {checkMessage && <p className="domain-note">{checkMessage}</p>}

                        {info.customDomain && !editing && (
                            <div className="domain-actions">
                                {!connected && (
                                    <button type="button" className="domain-primary" onClick={checkNow} disabled={busy === "check"}>
                                        <RefreshCw size={16} className={busy === "check" ? "is-spinning" : ""} /> {busy === "check" ? "Checking…" : "Check now"}
                                    </button>
                                )}
                                <button type="button" className="domain-secondary" onClick={() => { setEditing(true); setDomainInput(info.customDomain); }}>Change domain</button>
                                <button type="button" className="domain-danger" onClick={removeDomain} disabled={busy === "remove"}><Trash2 size={16} /> Remove</button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </section>
    );
}
