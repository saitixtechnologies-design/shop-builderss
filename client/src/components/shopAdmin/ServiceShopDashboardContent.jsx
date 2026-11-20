import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowUpRight, CheckCircle2, ChevronLeft, ChevronRight, Clock3, Eye, Mail, MapPin, MessageCircle, Phone, RefreshCw, Search, Settings, Users, Wrench } from "lucide-react";
import { Link } from "react-router";
import { apiUrl, getShopAdminHeaders } from "../../lib/api.js";
import "../../styles/shop-admin/shop-admin-dashboard.css";

const publicOrigin = (import.meta.env.VITE_PUBLIC_SHOP_URL || "http://localhost:5174").replace(/\/+$/, "");
const statuses = ["New", "Contacted", "Follow-up", "Converted", "Closed"];
const formatDate = (value) => value ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "—";

export default function ServiceShopDashboardContent() {
    const shopUser = useMemo(() => { try { return JSON.parse(localStorage.getItem("shopAdminUser") || "null"); } catch { return null; } }, []);
    const shop = shopUser?.shop || {};
    const shopName = shop.shopName || shop.ShopName || "Your service business";
    const slug = shop.shopSlug || shop.ShopSlug || "";
    const websiteUrl = slug ? `${publicOrigin}/shop/${encodeURIComponent(slug)}` : "";
    const [services, setServices] = useState([]);
    const [enquiries, setEnquiries] = useState([]);
    const [stats, setStats] = useState({});
    const [filters, setFilters] = useState({ search: "", status: "", serviceID: "" });
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState("");
    const [savingID, setSavingID] = useState(null);
    const [notice, setNotice] = useState("");

    const loadDashboard = useCallback(async (refresh = false) => {
        try {
            setError("");
            refresh ? setRefreshing(true) : setLoading(true);
            const query = new URLSearchParams({ page: String(page), pageSize: "10" });
            if (filters.status) query.set("status", filters.status);
            if (filters.serviceID) query.set("serviceID", filters.serviceID);
            if (filters.search.trim()) query.set("search", filters.search.trim());
            const [serviceResponse, enquiryResponse] = await Promise.all([
                fetch(apiUrl("/api/shop-services"), { headers: getShopAdminHeaders() }),
                fetch(apiUrl(`/api/shop-enquiries?${query}`), { headers: getShopAdminHeaders() })
            ]);
            const [serviceResult, enquiryResult] = await Promise.all([serviceResponse.json(), enquiryResponse.json()]);
            if (!serviceResponse.ok || !serviceResult.success) throw new Error(serviceResult.message || "Unable to load services.");
            if (!enquiryResponse.ok || !enquiryResult.success) throw new Error(enquiryResult.message || "Unable to load enquiries.");
            setServices(Array.isArray(serviceResult.data) ? serviceResult.data : []);
            setEnquiries(Array.isArray(enquiryResult.data?.enquiries) ? enquiryResult.data.enquiries : []);
            setStats(enquiryResult.data?.stats || {});
            setTotalPages(enquiryResult.data?.totalPages || 1);
        } catch (loadError) {
            setError(loadError.message || "Unable to load your dashboard.");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, [filters, page]);

    useEffect(() => { loadDashboard(); }, [loadDashboard]);
    const activeServices = services.filter((service) => String(service.Status || "").toLowerCase() === "active").length;
    const updateEnquiry = (id, patch) => setEnquiries((items) => items.map((item) => Number(item.EnquiryID) === Number(id) ? { ...item, ...patch } : item));
    const saveEnquiry = async (item) => {
        setSavingID(item.EnquiryID); setNotice("");
        try {
            const response = await fetch(apiUrl(`/api/shop-enquiries/${item.EnquiryID}`), {
                method: "PATCH", headers: getShopAdminHeaders({ "Content-Type": "application/json" }),
                body: JSON.stringify({ status: item.Status, shopNotes: item.ShopNotes || "" })
            });
            const result = await response.json();
            if (!response.ok || !result.success) throw new Error(result.message || "Could not update this enquiry.");
            updateEnquiry(item.EnquiryID, result.data); setNotice("Enquiry updated successfully.");
        } catch (saveError) { setNotice(saveError.message || "Could not update this enquiry."); }
        finally { setSavingID(null); }
    };

    return (
        <div className="shop-dashboard-page">
            <section className="shop-dashboard-hero">
                <span className="hero-glow hero-glow-one" /><span className="hero-glow hero-glow-two" />
                <div className="shop-dashboard-hero-content">
                    <div className="shop-dashboard-heading"><div className="shop-dashboard-heading-icon"><Wrench size={28} /></div><div><span className="dashboard-eyebrow">SERVICE BUSINESS DASHBOARD</span><h1>{shopName}</h1><p>Track service enquiries and keep every customer request moving.</p></div></div>
                    <button type="button" className="dashboard-refresh-btn" onClick={() => loadDashboard(true)} disabled={loading || refreshing}><RefreshCw size={16} className={refreshing ? "refresh-spinning" : ""} />{refreshing ? "Refreshing..." : "Refresh"}</button>
                </div>
                <div className="hero-shop-info"><div className="hero-shop-details"><span className="hero-shop-logo">{shop.logoURL || shop.LogoURL ? <img src={shop.logoURL || shop.LogoURL} alt="" /> : <Wrench size={18} />}</span><div><strong>{shopName}</strong><span>{slug ? `/shop/${slug}` : "Service website"}</span></div></div><div className="hero-shop-status"><span className="live-dot" /> Service website</div></div>
            </section>

            <section className="dashboard-section">
                <div className="dashboard-section-header"><div><span className="section-kicker">CUSTOMER REQUESTS</span><h2>Service enquiries</h2><p>New requests from your storefront, organized for follow-up.</p></div></div>
                {error && <div className="shop-dashboard-error-card"><h2>Could not load dashboard</h2><p>{error}</p><button type="button" onClick={() => loadDashboard(true)}>Try again</button></div>}
                {notice && <div className="enquiry-notice" role="status">{notice}</div>}
                <div className="shop-dashboard-stats-grid enquiry-stats-grid">
                    <div className="shop-stat-card cyan"><div className="shop-stat-top"><span className="shop-stat-icon"><Users size={20} /></span></div><div className="shop-stat-content"><span>Total enquiries</span><strong>{loading ? "—" : stats.Total || 0}</strong><small>{stats.Today || 0} received today</small></div></div>
                    <div className="shop-stat-card orange"><div className="shop-stat-top"><span className="shop-stat-icon"><Clock3 size={20} /></span></div><div className="shop-stat-content"><span>Needs attention</span><strong>{loading ? "—" : (stats.New || 0) + (stats.FollowUp || 0)}</strong><small>{stats.New || 0} new · {stats.FollowUp || 0} follow-up</small></div></div>
                    <div className="shop-stat-card green"><div className="shop-stat-top"><span className="shop-stat-icon"><CheckCircle2 size={20} /></span></div><div className="shop-stat-content"><span>Converted</span><strong>{loading ? "—" : stats.Converted || 0}</strong><small>Marked as booked or won</small></div></div>
                    <Link to="/shop-admin/services" className="shop-stat-card blue" style={{ color: "inherit", textDecoration: "none" }}><div className="shop-stat-top"><span className="shop-stat-icon"><Wrench size={20} /></span><ArrowUpRight size={17} /></div><div className="shop-stat-content"><span>Active services</span><strong>{loading ? "—" : activeServices}</strong><small>Manage service listings</small></div></Link>
                </div>
                <div className="enquiry-toolbar">
                    <label className="enquiry-search"><Search size={17} /><input value={filters.search} placeholder="Search name, phone, service or need…" onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, search: event.target.value })); }} /></label>
                    <select aria-label="Filter by status" value={filters.status} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, status: event.target.value })); }}><option value="">All statuses</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select>
                    <select aria-label="Filter by service" value={filters.serviceID} onChange={(event) => { setPage(1); setFilters((current) => ({ ...current, serviceID: event.target.value })); }}><option value="">All services</option>{services.map((service) => <option key={service.ServiceID} value={service.ServiceID}>{service.ServiceName}</option>)}</select>
                </div>
                <div className="enquiry-list">
                    {loading ? <div className="enquiry-empty">Loading enquiries…</div> : enquiries.length === 0 ? <div className="enquiry-empty"><Users size={26} /><strong>No enquiries yet</strong><span>When visitors submit the service form, their requests will appear here.</span></div> : enquiries.map((item) => (
                        <article className="enquiry-card" key={item.EnquiryID}>
                            <div className="enquiry-card-heading"><div><span className="enquiry-service-name">{item.ServiceName || "Service enquiry"}</span><h3>{item.CustomerName}</h3><small>Received {formatDate(item.CreatedAt)}</small></div><span className={`enquiry-status-badge status-${String(item.Status || "new").toLowerCase().replace(/[^a-z]+/g, "-")}`}>{item.Status}</span></div>
                            <div className="enquiry-contact-row"><a href={`tel:${item.Phone}`}><Phone size={15} />{item.Phone}</a>{item.Email && <a href={`mailto:${item.Email}`}><Mail size={15} />{item.Email}</a>}<a href={`https://wa.me/${String(item.Phone || "").replace(/\D/g, "")}`} target="_blank" rel="noreferrer"><MessageCircle size={15} />WhatsApp</a></div>
                            <div className="enquiry-requirement"><span>Customer requirement</span><p>{item.Requirement}</p></div>
                            <div className="enquiry-management"><label>Status<select value={item.Status || "New"} onChange={(event) => updateEnquiry(item.EnquiryID, { Status: event.target.value })}>{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><label className="enquiry-notes-field">Shop notes<textarea rows="2" value={item.ShopNotes || ""} onChange={(event) => updateEnquiry(item.EnquiryID, { ShopNotes: event.target.value })} placeholder="Add a private follow-up note…" /></label><button type="button" onClick={() => saveEnquiry(item)} disabled={savingID === item.EnquiryID}>{savingID === item.EnquiryID ? "Saving…" : "Save update"}</button></div>
                        </article>
                    ))}
                </div>
                {!loading && totalPages > 1 && <div className="enquiry-pagination"><span>Page {page} of {totalPages}</span><div><button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((value) => value - 1)}><ChevronLeft size={18} /></button><button type="button" aria-label="Next page" disabled={page >= totalPages} onClick={() => setPage((value) => value + 1)}><ChevronRight size={18} /></button></div></div>}
            </section>

            <section className="dashboard-section"><div className="dashboard-section-header"><div><span className="section-kicker">WEBSITE SETUP</span><h2>Keep your service website current</h2><p>Update your business identity, public details and location.</p></div></div><div className="shop-dashboard-stats-grid" style={{ gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))" }}>
                <Link to="/shop-admin/settings" className="shop-stat-card blue" style={{ color: "inherit", textDecoration: "none" }}><div className="shop-stat-top"><span className="shop-stat-icon"><Settings size={20} /></span><ArrowUpRight size={17} /></div><div className="shop-stat-content"><span>Business Details</span><strong><MapPin size={20} /></strong><small>Logo, contact, address and map</small></div></Link>
                <Link to="/shop-admin/website-editor" className="shop-stat-card purple" style={{ color: "inherit", textDecoration: "none" }}><div className="shop-stat-top"><span className="shop-stat-icon"><Settings size={20} /></span><ArrowUpRight size={17} /></div><div className="shop-stat-content"><span>Website Content</span><strong>Pages</strong><small>Edit your public website pages</small></div></Link>
                {websiteUrl && <a href={websiteUrl} target="_blank" rel="noreferrer" className="shop-stat-card orange" style={{ color: "inherit", textDecoration: "none" }}><div className="shop-stat-top"><span className="shop-stat-icon"><Eye size={20} /></span><ArrowUpRight size={17} /></div><div className="shop-stat-content"><span>Public Website</span><strong>Preview</strong><small>Open your service website</small></div></a>}
            </div></section>
        </div>
    );
}
