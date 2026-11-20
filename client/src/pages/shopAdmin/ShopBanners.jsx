import React, { useEffect, useMemo, useState } from "react";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    Eye,
    EyeOff,
    Image as ImageIcon,
    X,
    CalendarDays,
    ExternalLink,
} from "lucide-react";
import { toast } from "react-toastify";

import "../../styles/shop-admin/ShopBanners.css";
import ImageGalleryField from "../../components/ImageGalleryField.jsx";
import { API_ORIGIN } from "../../lib/api.js";

const API_URL = `${API_ORIGIN}/api/shop-banners`;

const emptyForm = {
    title: "",
    subtitle: "",
    imageURL: "",
    imageURLs: [],
    videoURL: "",
    buttonText: "",
    buttonLink: "",
    displayOrder: 0,
    status: "Active",
    startDate: "",
    endDate: "",
};

const getBannerImages = (banner) => {
    let images = [];
    try {
        images = Array.isArray(banner?.ImageURLs) ? banner.ImageURLs : typeof banner?.ImageURLs === "string" ? JSON.parse(banner.ImageURLs) : [];
    } catch { images = []; }
    const unique = [...new Set((Array.isArray(images) ? images : []).filter((image) => typeof image === "string" && image.trim()).map((image) => image.trim()))].slice(0, 10);
    if (!unique.length && banner?.ImageURL) unique.push(banner.ImageURL);
    return unique;
};

const getToken = () => {
    return (
        localStorage.getItem("shopAdminToken") ||
        localStorage.getItem("token") ||
        sessionStorage.getItem("shopAdminToken") ||
        sessionStorage.getItem("token") ||
        ""
    );
};

const formatDateForInput = (date) => {
    if (!date) return "";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "";

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};

const formatDate = (date) => {
    if (!date) return "-";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "-";

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const ShopBanners = () => {
    const [banners, setBanners] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [showModal, setShowModal] = useState(false);
    const [editingBanner, setEditingBanner] = useState(null);

    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetchBanners = async () => {
        try {
            setLoading(true);

            const token = getToken();

            if (!token) {
                toast.error("Shop Admin login token not found.");
                return;
            }

            const response = await fetch(API_URL, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to fetch banners."
                );
            }

            setBanners(result.data || []);
        } catch (error) {
            console.error("Fetch Shop Banners Error:", error);
            toast.error(error.message || "Failed to load banners.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBanners();
    }, []);

    const stats = useMemo(() => {
        const total = banners.length;

        const active = banners.filter(
            (banner) => banner.Status === "Active"
        ).length;

        const inactive = banners.filter(
            (banner) => banner.Status === "Inactive"
        ).length;

        return {
            total,
            active,
            inactive,
        };
    }, [banners]);

    const filteredBanners = useMemo(() => {
        const query = search.trim().toLowerCase();

        return banners.filter((banner) => {
            const matchesSearch =
                !query ||
                banner.Title?.toLowerCase().includes(query) ||
                banner.Subtitle?.toLowerCase().includes(query) ||
                banner.ButtonText?.toLowerCase().includes(query);

            const matchesStatus =
                statusFilter === "All" ||
                banner.Status === statusFilter;

            return matchesSearch && matchesStatus;
        });
    }, [banners, search, statusFilter]);

    const openAddModal = () => {
        setEditingBanner(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEditModal = (banner) => {
        setEditingBanner(banner);

        setForm({
            title: banner.Title || "",
            subtitle: banner.Subtitle || "",
            imageURL: banner.ImageURL || "",
            imageURLs: getBannerImages(banner),
            videoURL: banner.VideoURL || "",
            buttonText: banner.ButtonText || "",
            buttonLink: banner.ButtonLink || "",
            displayOrder: banner.DisplayOrder ?? 0,
            status: banner.Status || "Active",
            startDate: formatDateForInput(banner.StartDate),
            endDate: formatDateForInput(banner.EndDate),
        });

        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditingBanner(null);
        setForm(emptyForm);
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const validateForm = () => {
        if (!form.title.trim()) {
            toast.error("Banner title is required.");
            return false;
        }

        if (
            form.startDate &&
            form.endDate &&
            new Date(form.startDate) > new Date(form.endDate)
        ) {
            toast.error("End date cannot be before start date.");
            return false;
        }

        if (
            form.displayOrder !== "" &&
            Number(form.displayOrder) < 0
        ) {
            toast.error("Display order cannot be negative.");
            return false;
        }

        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        try {
            setSaving(true);

            const token = getToken();

            if (!token) {
                toast.error("Authentication token not found.");
                return;
            }

            const payload = {
                title: form.title.trim(),
                subtitle: form.subtitle.trim() || null,
                imageURL: (form.imageURLs[0] || form.imageURL || "").trim() || null,
                imageURLs: (form.imageURLs || []).slice(0, 10),
                videoURL: form.videoURL.trim() || null,
                buttonText: form.buttonText.trim() || null,
                buttonLink: form.buttonLink.trim() || null,
                displayOrder:
                    form.displayOrder === ""
                        ? 0
                        : Number(form.displayOrder),
                status: form.status,
                startDate: form.startDate || null,
                endDate: form.endDate || null,
            };

            const url = editingBanner
                ? `${API_URL}/${editingBanner.BannerID}`
                : API_URL;

            const method = editingBanner ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                        `Failed to ${
                            editingBanner ? "update" : "create"
                        } banner.`
                );
            }

            toast.success(
                editingBanner
                    ? "Banner updated successfully."
                    : "Banner created successfully."
            );

            closeModal();
            fetchBanners();
        } catch (error) {
            console.error("Save Banner Error:", error);
            toast.error(error.message || "Failed to save banner.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (banner) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete "${banner.Title}"?`
        );

        if (!confirmed) return;

        try {
            const token = getToken();

            const response = await fetch(
                `${API_URL}/${banner.BannerID}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to delete banner."
                );
            }

            toast.success("Banner deleted successfully.");

            setBanners((prev) =>
                prev.filter(
                    (item) => item.BannerID !== banner.BannerID
                )
            );
        } catch (error) {
            console.error("Delete Banner Error:", error);
            toast.error(error.message || "Failed to delete banner.");
        }
    };

    const toggleStatus = async (banner) => {
        try {
            const token = getToken();

            const response = await fetch(
                `${API_URL}/${banner.BannerID}/status`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to update status."
                );
            }

            toast.success(
                banner.Status === "Active"
                    ? "Banner deactivated."
                    : "Banner activated."
            );

            fetchBanners();
        } catch (error) {
            console.error("Toggle Banner Status Error:", error);
            toast.error(error.message || "Failed to update status.");
        }
    };

    return (
        <div className="shop-banners-page">
            {/* Header */}
            <div className="shop-banners-header">
                <div>
                    <span className="shop-banners-eyebrow">
                        SHOP MANAGEMENT
                    </span>

                    <h1>Website Banners</h1>

                    <p>
                        Manage promotional banners displayed on your
                        storefront.
                    </p>
                </div>

                <button
                    className="shop-banner-add-btn"
                    onClick={openAddModal}
                >
                    <Plus size={19} />
                    Add Banner
                </button>
            </div>

            {/* Stats */}
            <div className="shop-banner-stats">
                <div className="shop-banner-stat-card">
                    <div className="shop-banner-stat-icon total">
                        <ImageIcon size={22} />
                    </div>

                    <div>
                        <span>Total Banners</span>
                        <strong>{stats.total}</strong>
                    </div>
                </div>

                <div className="shop-banner-stat-card">
                    <div className="shop-banner-stat-icon active">
                        <Eye size={22} />
                    </div>

                    <div>
                        <span>Active</span>
                        <strong>{stats.active}</strong>
                    </div>
                </div>

                <div className="shop-banner-stat-card">
                    <div className="shop-banner-stat-icon inactive">
                        <EyeOff size={22} />
                    </div>

                    <div>
                        <span>Inactive</span>
                        <strong>{stats.inactive}</strong>
                    </div>
                </div>
            </div>

            {/* Filters */}
            <div className="shop-banner-toolbar">
                <div className="shop-banner-search">
                    <Search size={19} />

                    <input
                        type="text"
                        placeholder="Search banners..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <div className="shop-banner-status-filter">
                    <button
                        className={
                            statusFilter === "All"
                                ? "active"
                                : ""
                        }
                        onClick={() => setStatusFilter("All")}
                    >
                        All
                    </button>

                    <button
                        className={
                            statusFilter === "Active"
                                ? "active"
                                : ""
                        }
                        onClick={() => setStatusFilter("Active")}
                    >
                        Active
                    </button>

                    <button
                        className={
                            statusFilter === "Inactive"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setStatusFilter("Inactive")
                        }
                    >
                        Inactive
                    </button>
                </div>
            </div>

            {/* Table */}
            <div className="shop-banners-table-card">
                {loading ? (
                    <div className="shop-banner-loading">
                        <div className="shop-banner-spinner"></div>
                        <p>Loading banners...</p>
                    </div>
                ) : filteredBanners.length === 0 ? (
                    <div className="shop-banner-empty">
                        <div className="shop-banner-empty-icon">
                            <ImageIcon size={34} />
                        </div>

                        <h3>No banners found</h3>

                        <p>
                            {search || statusFilter !== "All"
                                ? "Try changing your search or filters."
                                : "Create your first storefront banner."}
                        </p>

                        {!search &&
                            statusFilter === "All" && (
                                <button
                                    onClick={openAddModal}
                                    className="shop-banner-empty-btn"
                                >
                                    <Plus size={18} />
                                    Create Banner
                                </button>
                            )}
                    </div>
                ) : (
                    <div className="shop-banners-table-wrapper">
                        <table className="shop-banners-table">
                            <thead>
                                <tr>
                                    <th>Banner</th>
                                    <th>CTA</th>
                                    <th>Schedule</th>
                                    <th>Order</th>
                                    <th>Status</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>
                                {filteredBanners.map((banner) => (
                                    <tr key={banner.BannerID}>
                                        <td>
                                            <div className="shop-banner-info">
                                                <div className="shop-banner-image">
                                                    {banner.ImageURL ? (
                                                        <img
                                                            src={
                                                                banner.ImageURL
                                                            }
                                                            alt={
                                                                banner.Title
                                                            }
                                                            onError={(
                                                                e
                                                            ) => {
                                                                e.currentTarget.style.display =
                                                                    "none";
                                                            }}
                                                        />
                                                    ) : (
                                                        <ImageIcon
                                                            size={25}
                                                        />
                                                    )}
                                                </div>

                                                <div className="shop-banner-title-wrap">
                                                    <strong>
                                                        {banner.Title}
                                                    </strong>

                                                    <span>
                                                        {banner.Subtitle ||
                                                            "No subtitle"}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>

                                        <td>
                                            <div className="shop-banner-cta">
                                                <strong>
                                                    {banner.ButtonText ||
                                                        "—"}
                                                </strong>

                                                {banner.ButtonLink && (
                                                    <a
                                                        href={
                                                            banner.ButtonLink
                                                        }
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        title="Open link"
                                                    >
                                                        <ExternalLink
                                                            size={14}
                                                        />
                                                    </a>
                                                )}
                                            </div>
                                        </td>

                                        <td>
                                            <div className="shop-banner-date">
                                                <CalendarDays
                                                    size={15}
                                                />

                                                <span>
                                                    {formatDate(
                                                        banner.StartDate
                                                    )}
                                                    {" → "}
                                                    {formatDate(
                                                        banner.EndDate
                                                    )}
                                                </span>
                                            </div>
                                        </td>

                                        <td>
                                            <span className="display-order">
                                                #{banner.DisplayOrder}
                                            </span>
                                        </td>

                                        <td>
                                            <button
                                                className={`banner-status ${
                                                    banner.Status ===
                                                    "Active"
                                                        ? "active"
                                                        : "inactive"
                                                }`}
                                                onClick={() =>
                                                    toggleStatus(
                                                        banner
                                                    )
                                                }
                                                title="Toggle status"
                                            >
                                                <span></span>

                                                {banner.Status}
                                            </button>
                                        </td>

                                        <td>
                                            <div className="shop-banner-actions">
                                                <button
                                                    className="edit"
                                                    onClick={() =>
                                                        openEditModal(
                                                            banner
                                                        )
                                                    }
                                                    title="Edit"
                                                >
                                                    <Pencil
                                                        size={17}
                                                    />
                                                </button>

                                                <button
                                                    className="delete"
                                                    onClick={() =>
                                                        handleDelete(
                                                            banner
                                                        )
                                                    }
                                                    title="Delete"
                                                >
                                                    <Trash2
                                                        size={17}
                                                    />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Modal */}
            {showModal && (
                <div
                    className="shop-banner-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeModal();
                        }
                    }}
                >
                    <div className="shop-banner-modal">
                        <div className="shop-banner-modal-header">
                            <div>
                                <span>
                                    {editingBanner
                                        ? "EDIT BANNER"
                                        : "NEW BANNER"}
                                </span>

                                <h2>
                                    {editingBanner
                                        ? "Edit Website Banner"
                                        : "Create Website Banner"}
                                </h2>
                            </div>

                            <button
                                onClick={closeModal}
                                className="modal-close"
                            >
                                <X size={21} />
                            </button>
                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="shop-banner-form"
                        >
                            <div className="form-grid">
                                <div className="form-group full">
                                    <label>
                                        Banner Title{" "}
                                        <span>*</span>
                                    </label>

                                    <input
                                        name="title"
                                        value={form.title}
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Premium CCTV & Security Solutions"
                                        maxLength={200}
                                        required
                                    />
                                </div>

                                <div className="form-group full">
                                    <label>
                                        Subtitle
                                    </label>

                                    <textarea
                                        name="subtitle"
                                        value={
                                            form.subtitle
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Protect your home and business..."
                                        rows="3"
                                        maxLength={500}
                                    />
                                </div>

                                <div className="form-group full">
                                    <ImageGalleryField
                                        label="Banner images (up to 10)"
                                        multiple
                                        maxImages={10}
                                        value={form.imageURLs || []}
                                        onChange={(images) => setForm((prev) => ({ ...prev, imageURLs: images.slice(0, 10), imageURL: images[0] || "" }))}
                                    />
                                </div>

                                <div className="form-group full banner-video-field">
                                    <label htmlFor="shop-banner-video-url">Video link <span className="optional-label">Optional</span></label>
                                    <input
                                        id="shop-banner-video-url"
                                        type="url"
                                        name="videoURL"
                                        value={form.videoURL}
                                        onChange={handleChange}
                                        placeholder="YouTube, Vimeo, or direct video URL"
                                    />
                                    <small>Add a video only if you want one. If provided, it will appear with this banner on your storefront.</small>
                                </div>

                                <div className="form-group">
                                    <label>
                                        Button Text
                                    </label>

                                    <input
                                        name="buttonText"
                                        value={
                                            form.buttonText
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Explore Products"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Button Link
                                    </label>

                                    <input
                                        name="buttonLink"
                                        value={
                                            form.buttonLink
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="/products"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Display Order
                                    </label>

                                    <input
                                        type="number"
                                        name="displayOrder"
                                        value={
                                            form.displayOrder
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        min="0"
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        Status
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

                                <div className="form-group">
                                    <label>
                                        Start Date
                                    </label>

                                    <input
                                        type="date"
                                        name="startDate"
                                        value={
                                            form.startDate
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </div>

                                <div className="form-group">
                                    <label>
                                        End Date
                                    </label>

                                    <input
                                        type="date"
                                        name="endDate"
                                        value={
                                            form.endDate
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </div>
                            </div>

                            <div className="shop-banner-modal-footer">
                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="save-banner-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingBanner
                                        ? "Update Banner"
                                        : "Create Banner"}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ShopBanners;
