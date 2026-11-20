import { useEffect, useMemo, useState } from "react";
import { ExternalLink, Eye, RefreshCw, Search, Store } from "lucide-react";
import { adminFetch, apiUrl } from "../lib/api.js";
import "../styles/LivePreview.css";

const publicOrigin = (import.meta.env.VITE_PUBLIC_SHOP_URL || "http://localhost:5174").replace(/\/+$/, "");

export default function ShopLivePreview() {
  const [shops, setShops] = useState([]);
  const [selected, setSelected] = useState(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => {
    let current = true;
    setLoading(true);
    setError("");
    adminFetch(apiUrl("api/shops"))
      .then(async (response) => {
        const payload = await response.json();
        if (!response.ok || !payload.success) throw new Error(payload.message || "Could not load shops.");
        if (current) {
          const rows = Array.isArray(payload.data) ? payload.data : [];
          setShops(rows);
          setSelected((old) => rows.find((shop) => shop.ShopID === old?.ShopID) || null);
        }
      })
      .catch((reason) => current && setError(reason.message || "Could not load shops."))
      .finally(() => current && setLoading(false));
    return () => { current = false; };
  }, []);

  const visibleShops = useMemo(() => {
    const query = search.trim().toLowerCase();
    return shops.filter((shop) => !query || `${shop.ShopName} ${shop.ShopSlug} ${shop.OwnerName}`.toLowerCase().includes(query));
  }, [shops, search]);
  const previewUrl = selected?.ShopSlug ? `${publicOrigin}/shop/${encodeURIComponent(selected.ShopSlug)}` : "";

  return <section className="live-preview-page">
    <header className="live-preview-heading"><div><span className="live-preview-eyebrow">SUPER ADMIN · STOREFRONT</span><h1>Shop Live Preview</h1><p>Choose a shop to view its public website with real shop content.</p></div><button className="live-preview-refresh" onClick={() => setRefresh((value) => value + 1)} disabled={!previewUrl} aria-label="Refresh preview"><RefreshCw size={17}/> Refresh</button></header>
    <div className="live-preview-layout">
      <aside className="live-preview-list"><label className="live-preview-search"><Search size={17}/><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search shops…"/></label>
        {loading ? <p className="live-preview-message">Loading shops…</p> : error ? <p className="live-preview-error">{error}</p> : visibleShops.length ? visibleShops.map((shop) => <button key={shop.ShopID} className={`live-preview-shop ${selected?.ShopID === shop.ShopID ? "selected" : ""}`} onClick={() => setSelected(shop)}><span className="live-preview-shop-icon">{shop.LogoURL ? <img src={shop.LogoURL.startsWith("/") ? apiUrl(shop.LogoURL) : shop.LogoURL} alt=""/> : <Store size={19}/>}</span><span className="live-preview-shop-copy"><strong>{shop.ShopName}</strong><small>/shop/{shop.ShopSlug}</small></span><span className={`live-preview-status ${String(shop.Status).toLowerCase()}`}>{shop.Status}</span></button>) : <p className="live-preview-message">No shops found.</p>}
      </aside>
      <section className="live-preview-stage">{selected && previewUrl ? <><div className="live-preview-stagebar"><div><strong>{selected.ShopName}</strong><span>Live public website · {selected.ShopSlug}</span></div><a href={previewUrl} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Open in new tab</a></div><iframe key={`${previewUrl}-${refresh}`} title={`${selected.ShopName} live website`} src={previewUrl}/></> : <div className="live-preview-empty"><span><Eye size={26}/></span><h2>Select a shop</h2><p>Choose a shop from the list to open its live website preview.</p></div>}</section>
    </div>
  </section>;
}
