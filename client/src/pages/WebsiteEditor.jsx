import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";
import { ArrowLeft, Eye, FileText, LoaderCircle, Plus, RefreshCw, Save, Store, Trash2, X } from "lucide-react";

import WebsiteHtmlEditor from "../components/WebsiteHtmlEditor.jsx";
import { adminFetch, apiUrl, getShopAdminHeaders, getShopAdminToken, getSuperAdminToken } from "../lib/api.js";
import "../styles/WebsiteEditor.css";

const PAGE_TYPES = [
    { value: "about", label: "About" },
    { value: "services", label: "Services" },
    { value: "gallery", label: "Gallery" },
    { value: "contact", label: "Contact" },
    { value: "custom", label: "Custom" }
];
const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const emptyForm = { pageName: "", slug: "", pageTitle: "", htmlContent: "", pageType: "custom", status: "Active", displayOrder: 0 };
const pageIdOf = (page) => page?.PageID ?? page?.pageId ?? page?.pageID;

const toForm = (page) => ({
    pageName: page?.PageName ?? page?.pageName ?? "",
    slug: page?.Slug ?? page?.slug ?? "",
    pageTitle: page?.PageTitle ?? page?.pageTitle ?? "",
    htmlContent: page?.HtmlContent ?? page?.htmlContent ?? "",
    pageType: page?.PageType ?? page?.pageType ?? "custom",
    status: page?.Status ?? page?.status ?? "Active",
    displayOrder: Number(page?.DisplayOrder ?? page?.displayOrder ?? 0)
});

const sortPages = (items) => [...items].sort((a, b) =>
    Number(a.DisplayOrder ?? a.displayOrder ?? 0) - Number(b.DisplayOrder ?? b.displayOrder ?? 0) ||
    Number(pageIdOf(a) ?? 0) - Number(pageIdOf(b) ?? 0)
);

async function readApiResponse(response) {
    const contentType = response.headers.get("content-type") || "";
    const payload = contentType.includes("application/json") ? await response.json() : null;
    if (!response.ok || payload?.success === false || !payload) {
        const error = new Error(payload?.message || `Request failed (HTTP ${response.status}). The server may be unavailable.`);
        error.status = response.status;
        throw error;
    }
    return payload;
}

function WebsiteEditor({ shopAdmin = false }) {
    const { shopId: routeShopId } = useParams();
    const navigate = useNavigate();
    const savedShopUser = useMemo(() => {
        if (!shopAdmin) return null;
        try { return JSON.parse(localStorage.getItem("shopAdminUser") || localStorage.getItem("shopBuilderUser") || "null"); }
        catch { return null; }
    }, [shopAdmin]);
    const shopId = shopAdmin
        ? String(savedShopUser?.shopID ?? savedShopUser?.ShopID ?? savedShopUser?.shop?.shopID ?? savedShopUser?.shop?.ShopID ?? "")
        : routeShopId;
    const shopAdminFetch = useCallback((input, options = {}) => fetch(input, {
        ...options,
        headers: getShopAdminHeaders(options.headers)
    }), []);
    const request = shopAdmin ? shopAdminFetch : adminFetch;
    const [shop, setShop] = useState(null);
    const [pages, setPages] = useState([]);
    const [activePageId, setActivePageId] = useState(null);
    const [form, setForm] = useState(emptyForm);
    const [initialForm, setInitialForm] = useState(emptyForm);
    const [isCreating, setIsCreating] = useState(false);
    const [loading, setLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [saving, setSaving] = useState(false);
    const [statusSaving, setStatusSaving] = useState(false);
    const [deleting, setDeleting] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [slugTouched, setSlugTouched] = useState(false);

    const isDirty = useMemo(() => JSON.stringify(form) !== JSON.stringify(initialForm), [form, initialForm]);

    const loadData = useCallback(async (signal) => {
        if (!/^\d+$/.test(String(shopId)) || Number(shopId) < 1) {
            setLoading(false);
            setLoadError("This shop address is invalid.");
            return;
        }
        setLoading(true);
        setLoadError("");
        try {
            const [shopResult, pagesResult] = await Promise.all([
                shopAdmin
                    ? Promise.resolve({ data: {
                        ShopID: Number(shopId),
                        ShopName: savedShopUser?.shop?.shopName ?? savedShopUser?.shop?.ShopName ?? savedShopUser?.shopName ?? "My Shop",
                        ShopSlug: savedShopUser?.shop?.shopSlug ?? savedShopUser?.shop?.ShopSlug ?? savedShopUser?.shopSlug ?? ""
                    } })
                    : request(apiUrl(`/api/shops/${shopId}`), { signal }).then(readApiResponse),
                request(apiUrl(`/api/shop-website/pages/${shopId}`), { signal }).then(readApiResponse)
            ]);
            if (signal?.aborted) return;
            const loadedPages = sortPages(Array.isArray(pagesResult.data) ? pagesResult.data : []);
            const firstPage = loadedPages[0] || null;
            const firstForm = firstPage ? toForm(firstPage) : emptyForm;
            setShop(shopResult.data || null);
            setPages(loadedPages);
            setActivePageId(firstPage ? pageIdOf(firstPage) : null);
            setIsCreating(false);
            setForm(firstForm);
            setInitialForm(firstForm);
            setSubmitted(false);
            setSlugTouched(false);
        } catch (error) {
            if (signal?.aborted) return;
            console.error("Website Editor load error:", error);
            setLoadError(error.message || "Could not load this shop's website pages.");
            if (error.status === 401 || error.status === 403) {
                toast.error(error.status === 401 ? "Please sign in again." : `${shopAdmin ? "Shop Admin" : "Super Admin"} access is required.`);
            } else {
                toast.error(error.message || "Could not load the Website Editor.");
            }
        } finally {
            if (!signal?.aborted) setLoading(false);
        }
    }, [shopId, shopAdmin, savedShopUser, request]);

    useEffect(() => {
        const hasSession = shopAdmin ? getShopAdminToken() : getSuperAdminToken();
        if (!hasSession) {
            toast.error(shopAdmin ? "Shop Admin access is required." : "Super Admin access is required.");
            navigate(shopAdmin ? "/shop/login" : "/admin/login", { replace: true });
            return;
        }
        const controller = new AbortController();
        const loadTimer = window.setTimeout(() => { void loadData(controller.signal); }, 0);
        return () => {
            window.clearTimeout(loadTimer);
            controller.abort();
        };
    }, [loadData, navigate, shopAdmin]);

    const confirmDiscard = () => !isDirty || window.confirm("Discard your unsaved changes?");
    const selectPage = (page) => {
        if (!confirmDiscard()) return;
        const nextForm = toForm(page);
        setActivePageId(pageIdOf(page));
        setIsCreating(false);
        setForm(nextForm);
        setInitialForm(nextForm);
        setSubmitted(false);
        setSlugTouched(false);
    };

    const startNewPage = () => {
        if (!confirmDiscard()) return;
        const nextOrder = pages.reduce((max, page) => Math.max(max, Number(page.DisplayOrder ?? page.displayOrder ?? -1)), -1) + 1;
        const draft = { ...emptyForm, displayOrder: nextOrder };
        setActivePageId(null);
        setIsCreating(true);
        setForm(draft);
        setInitialForm(draft);
        setSubmitted(false);
        setSlugTouched(false);
    };

    const updateField = (event) => {
        const { name, value } = event.target;
        if (name === "slug") setSlugTouched(true);
        setForm((current) => ({ ...current, [name]: value }));
    };

    const handleNameChange = (event) => {
        const pageName = event.target.value;
        setForm((current) => ({
            ...current,
            pageName,
            ...(isCreating && !slugTouched ? {
                slug: pageName.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
            } : {})
        }));
    };

    const errors = useMemo(() => {
        const result = {};
        if (!form.pageName.trim()) result.pageName = "Page name is required.";
        if (!form.slug.trim()) result.slug = "Page slug is required.";
        else if (!SLUG_PATTERN.test(form.slug.trim())) result.slug = "Use lowercase letters and numbers separated by single hyphens.";
        if (!form.pageTitle.trim()) result.pageTitle = "Page title is required.";
        if (!PAGE_TYPES.some((type) => type.value === form.pageType)) result.pageType = "Choose a page type.";
        if (String(form.displayOrder).trim() === "" || !Number.isInteger(Number(form.displayOrder)) || Number(form.displayOrder) < 0 || Number(form.displayOrder) > 2147483647) {
            result.displayOrder = "Enter a whole number from 0 to 2,147,483,647.";
        }
        return result;
    }, [form]);

    const savePage = async (event) => {
        event.preventDefault();
        setSubmitted(true);
        if (Object.keys(errors).length) {
            toast.error("Please fix the highlighted fields.");
            return;
        }
        setSaving(true);
        const creating = isCreating;
        const payload = {
            pageName: form.pageName.trim(), slug: form.slug.trim(), pageTitle: form.pageTitle.trim(),
            htmlContent: form.htmlContent, pageType: form.pageType, status: form.status, displayOrder: Number(form.displayOrder)
        };
        try {
            const response = await request(apiUrl(creating ? "/api/shop-website/pages" : `/api/shop-website/pages/${shopId}/${activePageId}`), {
                method: creating ? "POST" : "PUT",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(creating ? { shopId: Number(shopId), ...payload } : payload)
            });
            const result = await readApiResponse(response);
            const savedPage = result.data;
            const savedForm = toForm(savedPage);
            setPages((current) => sortPages(creating ? [...current, savedPage] : current.map((page) => pageIdOf(page) === pageIdOf(savedPage) ? savedPage : page)));
            setActivePageId(pageIdOf(savedPage));
            setIsCreating(false);
            setForm(savedForm);
            setInitialForm(savedForm);
            setSubmitted(false);
            toast.success(creating ? "Website page created." : "Website page saved.");
        } catch (error) {
            console.error("Website Editor save error:", error);
            if (error.status === 409 || /slug already exists/i.test(error.message)) toast.error(`The slug “${form.slug.trim()}” already exists for this shop.`);
            else toast.error(error.message || "Could not save this page.");
        } finally {
            setSaving(false);
        }
    };

    const handleStatusChange = async (event) => {
        const nextStatus = event.target.value;
        if (isCreating) {
            setForm((current) => ({ ...current, status: nextStatus }));
            return;
        }
        setStatusSaving(true);
        try {
            const response = await request(apiUrl(`/api/shop-website/pages/${shopId}/${activePageId}/status`), {
                method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: nextStatus })
            });
            const result = await readApiResponse(response);
            setPages((current) => current.map((page) => pageIdOf(page) === activePageId ? result.data : page));
            setForm((current) => ({ ...current, status: nextStatus }));
            setInitialForm((current) => ({ ...current, status: nextStatus }));
            toast.success(`Page marked ${nextStatus.toLowerCase()}.`);
        } catch (error) {
            toast.error(error.message || "Could not update page status.");
        } finally {
            setStatusSaving(false);
        }
    };

    const deletePage = async () => {
        if (isCreating || activePageId == null) return;
        if (!window.confirm(`Delete “${form.pageName}”? This page will be permanently removed.`)) return;
        setDeleting(true);
        try {
            const response = await request(apiUrl(`/api/shop-website/pages/${shopId}/${activePageId}`), { method: "DELETE" });
            await readApiResponse(response);
            const remaining = sortPages(pages.filter((page) => pageIdOf(page) !== activePageId));
            setPages(remaining);
            setActivePageId(null);
            setIsCreating(false);
            setForm(emptyForm);
            setInitialForm(emptyForm);
            setSubmitted(false);
            toast.success("Website page deleted.");
            try {
                const refreshResponse = await request(apiUrl(`/api/shop-website/pages/${shopId}`));
                const refreshed = await readApiResponse(refreshResponse);
                setPages(sortPages(Array.isArray(refreshed.data) ? refreshed.data : []));
            } catch (refreshError) {
                console.error("Website page list refresh error:", refreshError);
                toast.error("Page deleted, but the page list could not be refreshed. Try Reload.");
            }
        } catch (error) {
            toast.error(error.message || "Could not delete this page.");
        } finally {
            setDeleting(false);
        }
    };

    const previewDocument = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${form.pageTitle.replace(/[<>&"']/g, "")}</title><style>body{max-width:900px;margin:40px auto;padding:0 20px;font:16px/1.7 Arial,sans-serif;color:#172033}img{max-width:100%;height:auto}table{max-width:100%;border-collapse:collapse}td,th{border:1px solid #d0d5dd;padding:8px}</style></head><body>${form.htmlContent}</body></html>`;

    if (loading) return <div className="website-editor-state"><LoaderCircle className="website-editor-spinner" size={28} /><strong>Loading website editor…</strong><span>Getting this shop’s information and pages.</span></div>;
    if (loadError) return <section className="website-editor-page"><div className="website-editor-error"><strong>Couldn’t open this shop’s Website Editor</strong><p>{loadError}</p><button type="button" className="we-button we-button--primary" onClick={() => void loadData()}><RefreshCw size={16} /> Try again</button><button type="button" className="we-button" onClick={() => navigate(shopAdmin ? "/shop-admin" : "/admin/shops")}><ArrowLeft size={16} /> Back</button></div></section>;

    return (
        <section className="website-editor-page">
            <header className="website-editor-header">
                <div className="website-editor-heading">
                    <button type="button" className="we-button we-button--back" onClick={() => navigate(shopAdmin ? "/shop-admin" : "/admin/shops")}><ArrowLeft size={17} /> {shopAdmin ? "Back to Dashboard" : "Back to Shops"}</button>
                    <div><span className="website-editor-eyebrow">SHOP MANAGEMENT</span><h1>Website Editor</h1><p>Edit this shop’s informational pages and custom HTML content.</p></div>
                </div>
                <div className="website-editor-shop-card"><span className="website-editor-shop-icon"><Store size={19} /></span><span><strong>{shop?.ShopName || "Selected shop"}</strong><small>{shop?.ShopSlug ? `/${shop.ShopSlug}` : `Shop ID ${shopId}`}</small></span></div>
            </header>

            <div className="website-editor-workspace">
                <aside className="website-editor-pages-panel">
                    <div className="website-editor-panel-heading"><div><span>CONTENT</span><h2>Website Pages</h2></div><span className="website-editor-count">{pages.length}</span></div>
                    <button type="button" className="we-button we-button--primary website-editor-create" onClick={startNewPage}><Plus size={17} /> Create New Page</button>
                    {pages.length === 0 ? (
                        <div className="website-editor-empty-list"><FileText size={24} /><strong>No pages yet</strong><p>Create About, Services, Gallery, Contact, or a custom page.</p></div>
                    ) : (
                        <nav className="website-editor-page-list" aria-label="Website pages">
                            {pages.map((page) => {
                                const id = pageIdOf(page);
                                const active = !isCreating && id === activePageId;
                                return <button type="button" key={id} className={`website-editor-page-item${active ? " is-active" : ""}`} onClick={() => selectPage(page)}>
                                    <span className="website-editor-page-item-icon"><FileText size={17} /></span><span className="website-editor-page-item-copy"><strong>{page.PageName}</strong><small>/{page.Slug}</small></span><span className={`website-editor-status-dot ${page.Status === "Inactive" ? "is-inactive" : ""}`} title={page.Status} />
                                </button>;
                            })}
                        </nav>
                    )}
                    <div className="website-editor-page-hint">{pages.length ? "Select a page to edit its content." : "Your shop pages will appear here."}</div>
                </aside>

                <main className="website-editor-edit-panel">
                    {!isCreating && activePageId == null ? (
                        <div className="website-editor-empty-main"><div className="website-editor-empty-icon"><FileText size={25} /></div><h2>{pages.length ? "Page deleted — select another page" : "Your website content starts here"}</h2><p>{pages.length ? "Choose a page from the list, or create another one." : "Create an informational page for this shop, even if it has no products."}</p><button type="button" className="we-button we-button--primary" onClick={startNewPage}><Plus size={17} /> {pages.length ? "Create New Page" : "Create your first page"}</button></div>
                    ) : (
                        <form onSubmit={savePage} noValidate>
                            <div className="website-editor-form-header"><div><span className="website-editor-eyebrow">{isCreating ? "NEW CONTENT" : "PAGE DETAILS"}</span><h2>{isCreating ? "Create a page" : `Edit ${form.pageName || "page"}`}</h2><p>{isDirty ? "You have unsaved changes." : "Changes are saved only when you choose Save Changes."}</p></div>{!isCreating && <button type="button" className="we-button we-button--danger-outline" onClick={deletePage} disabled={deleting || saving}><Trash2 size={16} /> {deleting ? "Deleting…" : "Delete Page"}</button>}</div>

                            <div className="website-editor-fields">
                                <label className="website-editor-field"><span>Page Name <b>*</b></span><input name="pageName" value={form.pageName} onChange={handleNameChange} placeholder="About Us" aria-invalid={Boolean(submitted && errors.pageName)} />{submitted && errors.pageName && <small className="website-editor-field-error">{errors.pageName}</small>}</label>
                                <label className="website-editor-field"><span>Page Slug <b>*</b></span><div className="website-editor-slug-input"><i>/</i><input name="slug" value={form.slug} onChange={updateField} placeholder="about-us" aria-invalid={Boolean(submitted && errors.slug)} /></div>{submitted && errors.slug && <small className="website-editor-field-error">{errors.slug}</small>}</label>
                                <label className="website-editor-field website-editor-field--wide"><span>Page Title <b>*</b></span><input name="pageTitle" value={form.pageTitle} onChange={updateField} placeholder="About our company" aria-invalid={Boolean(submitted && errors.pageTitle)} />{submitted && errors.pageTitle && <small className="website-editor-field-error">{errors.pageTitle}</small>}</label>
                                <label className="website-editor-field"><span>Page Type <b>*</b></span><select name="pageType" value={form.pageType} onChange={updateField}>{PAGE_TYPES.map((type) => <option key={type.value} value={type.value}>{type.label}</option>)}</select>{submitted && errors.pageType && <small className="website-editor-field-error">{errors.pageType}</small>}</label>
                                <label className="website-editor-field"><span>Status</span><select value={form.status} onChange={handleStatusChange} disabled={statusSaving || saving}><option value="Active">Active</option><option value="Inactive">Inactive</option></select><small>{!isCreating ? "Status changes are applied immediately." : "Status is saved with the new page."}</small></label>
                                <label className="website-editor-field"><span>Display Order</span><input name="displayOrder" type="number" min="0" max="2147483647" step="1" value={form.displayOrder} onChange={updateField} aria-invalid={Boolean(submitted && errors.displayOrder)} />{submitted && errors.displayOrder && <small className="website-editor-field-error">{errors.displayOrder}</small>}</label>
                            </div>

                            <div className="website-editor-content-heading"><div><h3>Page Content</h3><p>Format text, add links, images and tables, or edit HTML directly.</p></div><span>HTML / RICH TEXT</span></div>
                            <WebsiteHtmlEditor key={isCreating ? "new-page" : activePageId} value={form.htmlContent} onChange={(htmlContent) => setForm((current) => ({ ...current, htmlContent }))} placeholder="Write website content…" minHeight={300} />
                            <div className="website-editor-actions"><span>{isDirty ? "Unsaved changes" : "All changes saved"}</span><div><button type="button" className="we-button" onClick={() => setShowPreview(true)}><Eye size={16} /> Preview</button><button type="submit" className="we-button we-button--primary" disabled={saving || statusSaving}><Save size={16} /> {saving ? "Saving…" : isCreating ? "Save Page" : "Save Changes"}</button></div></div>
                        </form>
                    )}
                </main>
            </div>

            {showPreview && <div className="website-editor-preview-overlay" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowPreview(false); }}><section className="website-editor-preview-modal" role="dialog" aria-modal="true" aria-labelledby="website-editor-preview-title"><header><div><span className="website-editor-eyebrow">LOCAL PREVIEW</span><h2 id="website-editor-preview-title">{form.pageTitle || form.pageName || "Website page"}</h2></div><button type="button" className="we-icon-button" aria-label="Close preview" onClick={() => setShowPreview(false)}><X size={19} /></button></header><iframe title="Website page preview" sandbox="" srcDoc={previewDocument} /><footer><span>Preview only — this content has not been published.</span><button type="button" className="we-button we-button--primary" onClick={() => setShowPreview(false)}>Done</button></footer></section></div>}
        </section>
    );
}

export default WebsiteEditor;
