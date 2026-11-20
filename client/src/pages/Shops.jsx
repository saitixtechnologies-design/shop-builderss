import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "react-toastify";
import "../styles/Shops.css";
import ShopTemplatePicker from "../components/ShopTemplatePicker.jsx";
import { getDefaultWebsiteTemplate, SHOP_TEMPLATES } from "../components/shopTemplates.js";
import { adminFetch as fetch, API_ORIGIN } from "../lib/api.js";
import { FileText } from "lucide-react";

const API_URL = `${API_ORIGIN}/api/shops`;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

const emptyForm = {
    shopName: "",
    shopSlug: "",
    shopType: "Ecommerce",
    websiteTemplate: "editorial",
    ownerName: "",
    email: "",
    phone: "",
    password: "",
    status: "Active",
};

const Shops = () => {
    const navigate = useNavigate();

    const [shops, setShops] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingShop, setEditingShop] = useState(null);

    const [deleteShop, setDeleteShop] = useState(null);

    const [form, setForm] = useState(emptyForm);

    const [saving, setSaving] = useState(false);
    const [deletingId, setDeletingId] = useState(null);
    const [statusId, setStatusId] = useState(null);

    // =====================================================
    // FETCH SHOPS
    // =====================================================

    const fetchShops = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            const response = await fetch(API_URL, { headers: authHeaders() });
            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Failed to fetch shops."
                );
            }

            setShops(data.data || []);
        } catch (error) {
            console.error("Fetch Shops Error:", error);

            toast.error(
                error.message || "Failed to load shops."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchShops();
    }, []);

    // =====================================================
    // SEARCH
    // =====================================================

    const filteredShops = useMemo(() => {
        const value = search.trim().toLowerCase();

        if (!value) {
            return shops;
        }

        return shops.filter((shop) =>
            [
                shop.ShopName,
                shop.ShopSlug,
                shop.OwnerName,
                shop.Email,
                shop.Phone,
                shop.Status,
                shop.ShopType,
            ]
                .filter(Boolean)
                .some((item) =>
                    String(item)
                        .toLowerCase()
                        .includes(value)
                )
        );
    }, [shops, search]);

    // =====================================================
    // FORM CHANGE
    // =====================================================

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => {
            if (name === "shopType") {
                const allowed = SHOP_TEMPLATES[value] || SHOP_TEMPLATES.Ecommerce;
                const websiteTemplate = allowed.some((template) => template.id === previous.websiteTemplate)
                    ? previous.websiteTemplate
                    : getDefaultWebsiteTemplate(value);
                return { ...previous, shopType: value, websiteTemplate };
            }
            return { ...previous, [name]: value };
        });
    };

    // =====================================================
    // SHOP NAME -> SLUG
    // =====================================================

    const handleShopNameChange = (event) => {
        const value = event.target.value;

        setForm((previous) => ({
            ...previous,
            shopName: value,

            shopSlug: editingShop
                ? previous.shopSlug
                : value
                      .toLowerCase()
                      .trim()
                      .replace(/[^a-z0-9]+/g, "-")
                      .replace(/(^-|-$)/g, ""),
        }));
    };

    // =====================================================
    // CREATE MODAL
    // =====================================================

    const openCreateModal = () => {
        setEditingShop(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    // =====================================================
    // EDIT MODAL
    // =====================================================

    const openEditModal = (shop) => {
        setEditingShop(shop);

        setForm({
            shopName: shop.ShopName || "",
            shopSlug: shop.ShopSlug || "",
            shopType: shop.ShopType || "Ecommerce",
            websiteTemplate: shop.WebsiteTemplate || getDefaultWebsiteTemplate(shop.ShopType),
            ownerName: shop.OwnerName || "",
            email: shop.Email || "",
            phone: shop.Phone || "",
            password: "",
            status: shop.Status || "Active",
        });

        setShowModal(true);
    };

    // =====================================================
    // CLOSE MODAL
    // =====================================================

    const closeModal = () => {
        if (saving) {
            return;
        }

        setShowModal(false);
        setEditingShop(null);
        setForm(emptyForm);
    };

    // =====================================================
    // CREATE / UPDATE
    // =====================================================

    const handleSubmit = async (event) => {
        event.preventDefault();

        try {
            setSaving(true);

            const isEdit = Boolean(editingShop);

            const url = isEdit
                ? `${API_URL}/${editingShop.ShopID}`
                : API_URL;

            const method = isEdit ? "PUT" : "POST";

            const payload = {
                shopName: form.shopName.trim(),
                shopSlug: form.shopSlug.trim(),
                websiteTemplate: form.websiteTemplate,
                ownerName: form.ownerName.trim(),
                email: form.email.trim(),
                phone: form.phone.trim(),

                ...(isEdit
                    ? {
                          status: form.status,
                      }
                    : {
                          shopType: form.shopType,
                          password: form.password,
                      }),
            };

            const response = await fetch(url, {
                method,
                headers: {
                    ...authHeaders(),
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message || "Something went wrong."
                );
            }

            if (isEdit) {
                toast.success(
                    "Shop updated successfully."
                );
            } else {
                toast.success(
                    "Shop and Shop Admin created successfully."
                );
            }

            // Refresh browser ki zarurat nahi
            await fetchShops(false);

            closeModal();
        } catch (error) {
            console.error("Save Shop Error:", error);

            toast.error(
                error.message || "Failed to save shop."
            );
        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // STATUS TOGGLE
    // =====================================================

    const handleToggleStatus = async (shop) => {
        try {
            setStatusId(shop.ShopID);

            const response = await fetch(
                `${API_URL}/${shop.ShopID}/status`,
                {
                    method: "PATCH",
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                        "Failed to update status."
                );
            }

            setShops((previous) =>
                previous.map((item) =>
                    item.ShopID === shop.ShopID
                        ? {
                              ...item,
                              Status: data.status,
                          }
                        : item
                )
            );

            toast.success(
                data.message ||
                    "Shop status updated successfully."
            );
        } catch (error) {
            console.error(
                "Status Update Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to update status."
            );
        } finally {
            setStatusId(null);
        }
    };

    // =====================================================
    // DELETE
    // =====================================================

    const handleDelete = async () => {
        if (!deleteShop) {
            return;
        }

        try {
            setDeletingId(deleteShop.ShopID);

            const response = await fetch(
                `${API_URL}/${deleteShop.ShopID}`,
                {
                    method: "DELETE",
                    headers: authHeaders(),
                }
            );

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                        "Failed to delete shop."
                );
            }

            // Instant UI update
            setShops((previous) =>
                previous.filter(
                    (item) =>
                        item.ShopID !==
                        deleteShop.ShopID
                )
            );

            toast.success(
                "Shop deleted successfully."
            );

            setDeleteShop(null);
        } catch (error) {
            console.error(
                "Delete Shop Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to delete shop."
            );
        } finally {
            setDeletingId(null);
        }
    };

    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (date) => {
        if (!date) {
            return "—";
        }

        return new Date(date).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    };

    // =====================================================
    // COUNTS
    // =====================================================

    const totalShops = shops.length;

    const activeShops = shops.filter(
        (shop) => shop.Status === "Active"
    ).length;

    const inactiveShops =
        totalShops - activeShops;

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="shops-page">

            {/* ================= HEADER ================= */}

            <div className="shops-page-header">
                <div>
                    <div className="shops-eyebrow">
                        SHOP MANAGEMENT
                    </div>

                    <h1>Shops</h1>

                    <p>
                        Manage your stores, shop
                        administrators and account
                        status from one place.
                    </p>
                </div>

                <button
                    className="create-shop-btn"
                    onClick={openCreateModal}
                >
                    <span>+</span>
                    Create Shop
                </button>
            </div>

            {/* ================= SUMMARY ================= */}

            <div className="shop-summary-grid">

                <div className="shop-summary-card">
                    <div className="summary-icon">
                        S
                    </div>

                    <div>
                        <span>Total Shops</span>
                        <strong>{totalShops}</strong>
                    </div>
                </div>

                <div className="shop-summary-card">
                    <div className="summary-icon active-icon">
                        ✓
                    </div>

                    <div>
                        <span>Active Shops</span>
                        <strong>{activeShops}</strong>
                    </div>
                </div>

                <div className="shop-summary-card">
                    <div className="summary-icon inactive-icon">
                        !
                    </div>

                    <div>
                        <span>Suspended Shops</span>
                        <strong>{inactiveShops}</strong>
                    </div>
                </div>

            </div>

            {/* ================= MAIN CARD ================= */}

            <div className="shops-main-card">

                <div className="shops-toolbar">

                    <div>
                        <h2>All Shops</h2>

                        <p>
                            {filteredShops.length} shop
                            {filteredShops.length !== 1
                                ? "s"
                                : ""}{" "}
                            found
                        </p>
                    </div>

                    <div className="shop-search-wrapper">
                        <span>⌕</span>

                        <input
                            type="text"
                            value={search}
                            onChange={(event) =>
                                setSearch(
                                    event.target.value
                                )
                            }
                            placeholder="Search shops..."
                        />
                    </div>

                </div>

                {/* ================= LOADING ================= */}

                {loading && (
                    <div className="shops-state">
                        <div className="loader"></div>

                        <p>
                            Loading shops...
                        </p>
                    </div>
                )}

                {/* ================= EMPTY ================= */}

                {!loading &&
                    filteredShops.length === 0 && (
                        <div className="shops-state">

                            <div className="empty-icon">
                                S
                            </div>

                            <h3>
                                No shops found
                            </h3>

                            <p>
                                {search
                                    ? "Try a different search."
                                    : "Create your first shop to get started."}
                            </p>

                            {!search && (
                                <button
                                    onClick={
                                        openCreateModal
                                    }
                                >
                                    + Create Shop
                                </button>
                            )}

                        </div>
                    )}

                {/* ================= TABLE ================= */}

                {!loading &&
                    filteredShops.length > 0 && (
                        <div className="shops-table-wrapper">

                            <table className="shops-table">

                                <thead>
                                    <tr>
                                        <th>SHOP</th>
                                        <th>OWNER</th>
                                        <th>CONTACT</th>
                                        <th>STATUS</th>
                                        <th>CREATED</th>
                                        <th>ACTIONS</th>
                                    </tr>
                                </thead>

                                <tbody>

                                    {filteredShops.map(
                                        (shop) => (
                                            <tr
                                                key={
                                                    shop.ShopID
                                                }
                                            >

                                                {/* SHOP */}

                                                <td>
                                                    <div className="shop-info">

                                                        <div className="shop-avatar">
                                                            {shop.ShopName
                                                                ?.charAt(
                                                                    0
                                                                )
                                                                .toUpperCase()}
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {
                                                                    shop.ShopName
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    shop.ShopSlug
                                                                }
                                                            </span>

                                                            <small>
                                                                {shop.ShopType === "Service"
                                                                    ? "Service website"
                                                                    : "E-commerce website"}
                                                            </small>
                                                        </div>

                                                    </div>
                                                </td>

                                                {/* OWNER */}

                                                <td>
                                                    <div className="owner-name">
                                                        {
                                                            shop.OwnerName
                                                        }
                                                    </div>

                                                    <small>
                                                        Shop Admin
                                                    </small>
                                                </td>

                                                {/* CONTACT */}

                                                <td>
                                                    <div className="contact-email">
                                                        {
                                                            shop.Email
                                                        }
                                                    </div>

                                                    <small>
                                                        {
                                                            shop.Phone ||
                                                            "No phone"
                                                        }
                                                    </small>
                                                </td>

                                                {/* STATUS */}

                                                <td>
                                                    {/* Platform switch (super admin only). Suspending takes the
                                                        website offline and locks the owner out; the owner's own
                                                        website switch below is separate and read-only here. */}
                                                    <button
                                                        className={`status-badge ${
                                                            shop.Status?.toLowerCase()
                                                        }`}
                                                        onClick={() => {
                                                            if (
                                                                shop.Status === "Active" &&
                                                                !window.confirm(`Suspend ${shop.ShopName}? Its website goes offline and the owner cannot sign in until you activate it again.`)
                                                            ) return;
                                                            handleToggleStatus(shop);
                                                        }}
                                                        disabled={
                                                            statusId ===
                                                            shop.ShopID
                                                        }
                                                        title={shop.Status === "Active" ? "Click to suspend this shop" : "Click to activate this shop"}
                                                    >
                                                        <i></i>

                                                        {statusId ===
                                                        shop.ShopID
                                                            ? "Updating..."
                                                            : shop.Status === "Active" ? "Active" : "Suspended"}
                                                    </button>
                                                    <small className="shop-owner-switch">
                                                        Owner: {(shop.OwnerWebsiteStatus || "Active") === "Active" ? "Open" : "Closed"}
                                                        {" · "}
                                                        Live: {shop.Status === "Active" && (shop.OwnerWebsiteStatus || "Active") === "Active" ? "Yes" : "No"}
                                                    </small>
                                                </td>

                                                {/* CREATED */}

                                                <td>
                                                    <span className="date-text">
                                                        {formatDate(
                                                            shop.CreatedAt
                                                        )}
                                                    </span>
                                                </td>

                                                {/* ACTIONS */}

                                                <td>
                                                   <div className="shop-actions">

    {/* SETTINGS */}

    <button
        type="button"
        className="settings-action"
        onClick={() =>
            navigate(
                `/admin/shops/${shop.ShopID}/settings`
            )
        }
    >
        Settings
    </button>

    <button
        type="button"
        className="settings-action website-editor-shop-action"
        onClick={() => navigate(`/admin/shops/${shop.ShopID}/website-editor`)}
    >
        <FileText size={14} /> Website
    </button>


    {/* EDIT */}

    <button
        type="button"
        className="edit-action"
        onClick={() =>
            openEditModal(shop)
        }
    >
        Edit
    </button>


    {/* DELETE */}

    <button
        type="button"
        className="delete-action"
        onClick={() =>
            setDeleteShop(shop)
        }
        disabled={
            deletingId === shop.ShopID
        }
    >
        {deletingId === shop.ShopID
            ? "Deleting..."
            : "Delete"}
    </button>

</div>
                                                </td>

                                            </tr>
                                        )
                                    )}

                                </tbody>

                            </table>

                        </div>
                    )}

            </div>

            {/* =================================================
                CREATE / EDIT MODAL
            ================================================= */}

            {showModal && (
                <div
                    className="shop-modal-overlay"
                    onMouseDown={(event) => {
                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeModal();
                        }
                    }}
                >

                    <div className="shop-modal">

                        <div className="modal-header">

                            <div>
                                <span>
                                    {editingShop
                                        ? "EDIT SHOP"
                                        : "NEW SHOP"}
                                </span>

                                <h2>
                                    {editingShop
                                        ? "Edit Shop"
                                        : "Create a Shop"}
                                </h2>

                                <p>
                                    {editingShop
                                        ? "Update your shop information and account settings."
                                        : "Create a new shop and automatically create its Shop Admin account."}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeModal}
                            >
                                ×
                            </button>

                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="shop-form"
                        >

                            <div className="form-grid">

                                {/* SHOP NAME */}

                                <div className="form-field full">
                                    <label>
                                        Shop Name
                                    </label>

                                    <input
                                        name="shopName"
                                        value={
                                            form.shopName
                                        }
                                        onChange={
                                            handleShopNameChange
                                        }
                                        placeholder="e.g. Secure Shield CCTV"
                                        required
                                    />
                                </div>

                                {!editingShop && (
                                    <div className="form-field">
                                        <label htmlFor="shopType">
                                            Website Type
                                        </label>

                                        <select
                                            id="shopType"
                                            name="shopType"
                                            value={form.shopType}
                                            onChange={handleChange}
                                            required
                                        >
                                            <option value="Ecommerce">
                                                E-commerce storefront
                                            </option>
                                            <option value="Service">
                                                Service-based website
                                            </option>
                                        </select>

                                        <small>
                                            This selects the Shop Admin tools and public website layout.
                                        </small>
                                    </div>
                                )}

                                <div className="form-field full">
                                    <ShopTemplatePicker
                                        shopType={form.shopType}
                                        value={form.websiteTemplate}
                                        onChange={(websiteTemplate) => setForm((previous) => ({ ...previous, websiteTemplate }))}
                                    />
                                </div>

                                {/* SLUG */}

                                <div className="form-field">
                                    <label>
                                        Shop Slug
                                    </label>

                                    <input
                                        name="shopSlug"
                                        value={
                                            form.shopSlug
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="secure-shield-cctv"
                                        required
                                    />

                                    <small>
                                        Used in your
                                        shop URL.
                                    </small>
                                </div>

                                {/* OWNER */}

                                <div className="form-field">
                                    <label>
                                        Owner Name
                                    </label>

                                    <input
                                        name="ownerName"
                                        value={
                                            form.ownerName
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Owner full name"
                                        required
                                    />
                                </div>

                                {/* EMAIL */}

                                <div className="form-field">
                                    <label>
                                        Email Address
                                    </label>

                                    <input
                                        type="email"
                                        name="email"
                                        value={
                                            form.email
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="owner@example.com"
                                        required
                                    />
                                </div>

                                {/* PHONE */}

                                <div className="form-field">
                                    <label>
                                        Phone Number
                                    </label>

                                    <input
                                        name="phone"
                                        value={
                                            form.phone
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="9876543210"
                                    />
                                </div>

                                {/* PASSWORD */}

                                {!editingShop && (
                                    <div className="form-field full">
                                        <label>
                                            Shop Admin Password
                                        </label>

                                        <input
                                            type="password"
                                            name="password"
                                            value={
                                                form.password
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Create a secure password"
                                            required
                                        />

                                        <small>
                                            This password
                                            will be used
                                            by the Shop
                                            Admin to
                                            login.
                                        </small>
                                    </div>
                                )}

                                {/* STATUS */}

                                {editingShop && (
                                    <div className="form-field">
                                        <label>
                                            Shop Status
                                        </label>

                                        <select
                                            name="status"
                                            value={
                                                form.status
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        >
                                            <option value="Active">
                                                Active
                                            </option>

                                            <option value="Inactive">
                                                Inactive
                                            </option>
                                        </select>
                                    </div>
                                )}

                            </div>

                            {/* FOOTER */}

                            <div className="modal-footer">

                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="save-shop-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingShop
                                        ? "Save Changes"
                                        : "Create Shop"}
                                </button>

                            </div>

                        </form>

                    </div>
                </div>
            )}

            {/* =================================================
                DELETE MODAL
            ================================================= */}

            {deleteShop && (
                <div className="delete-modal-overlay">

                    <div className="delete-modal">

                        <div className="delete-modal-icon">
                            !
                        </div>

                        <div className="delete-modal-content">

                            <h3>
                                Delete this shop?
                            </h3>

                            <p>
                                You're about to
                                permanently delete{" "}
                                <strong>
                                    "{deleteShop.ShopName}"
                                </strong>
                                .
                            </p>

                            <span>
                                This action cannot be
                                undone.
                            </span>

                        </div>

                        <div className="delete-modal-actions">

                            <button
                                type="button"
                                className="delete-cancel-btn"
                                onClick={() =>
                                    setDeleteShop(null)
                                }
                                disabled={
                                    deletingId ===
                                    deleteShop.ShopID
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="delete-confirm-btn"
                                onClick={handleDelete}
                                disabled={
                                    deletingId ===
                                    deleteShop.ShopID
                                }
                            >
                                {deletingId ===
                                deleteShop.ShopID
                                    ? "Deleting..."
                                    : "Yes, Delete Shop"}
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
};

export default Shops;
