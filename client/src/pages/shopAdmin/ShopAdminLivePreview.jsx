import { useMemo, useState } from "react";
import { ArrowUpRight, Image, Package, RefreshCw, Settings, Tags, Wrench } from "lucide-react";
import { Link } from "react-router";
import "../../styles/LivePreview.css";

const publicOrigin = (import.meta.env.VITE_PUBLIC_SHOP_URL || "http://localhost:5174").replace(/\/+$/, "");

export default function ShopAdminLivePreview() {
  const [refresh, setRefresh] = useState(0);
  const user = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("shopAdminUser") || "null"); } catch { return null; }
  }, []);
  const shop = user?.shop || {};
  const isServiceShop = String(shop.shopType || shop.ShopType || "Ecommerce").toLowerCase() === "service";
  const slug = shop.shopSlug || shop.ShopSlug || "";
  const shopName = shop.shopName || shop.ShopName || "My Shop";
  const previewUrl = slug ? `${publicOrigin}/shop/${encodeURIComponent(slug)}` : "";
  const links = [
    ...(!isServiceShop ? [
      ["Products", "/shop-admin/products", Package],
      ["Categories", "/shop-admin/categories", Tags],
    ] : []),
    ["Banners", "/shop-admin/banners", Image],
    ["Services", "/shop-admin/services", Wrench],
    ["Shop settings", "/shop-admin/settings", Settings],
  ];

  return <section className="live-preview-page shop-live-preview-page">
    <header className="live-preview-heading"><div><span className="live-preview-eyebrow">YOUR STOREFRONT</span><h1>Live Preview</h1><p>{isServiceShop ? "Preview your service website, service listings, contact details and location." : "See your public shop as customers see it. Changes to products, categories, banners and settings appear here after refresh."}</p></div><div className="live-preview-actions">{previewUrl && <a className="live-preview-open" href={previewUrl} target="_blank" rel="noreferrer"><ArrowUpRight size={17}/> Open website</a>}<button className="live-preview-refresh" onClick={() => setRefresh((value) => value + 1)} disabled={!previewUrl}><RefreshCw size={17}/> Refresh</button></div></header>
    <nav className="live-preview-manage">{links.map(([label, href, Icon]) => <Link key={href} to={href}><Icon size={16}/>{label}<ArrowUpRight size={13}/></Link>)}</nav>
    <section className="live-preview-stage shop-live-preview-stage">{previewUrl ? <><div className="live-preview-stagebar"><div><strong>{shopName}</strong><span>Customer view · /shop/{slug}</span></div></div><iframe key={`${previewUrl}-${refresh}`} title={`${shopName} live website`} src={previewUrl}/></> : <div className="live-preview-empty"><span><Wrench size={26}/></span><h2>Shop address unavailable</h2><p>Please sign in again so the shop address can be loaded.</p></div>}</section>
  </section>;
}
