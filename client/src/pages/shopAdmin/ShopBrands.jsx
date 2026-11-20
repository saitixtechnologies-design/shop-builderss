import React, { useEffect, useMemo, useState } from "react";
import "../../styles/shop-admin/shop-brands.css";
import ImageGalleryField from "../../components/ImageGalleryField.jsx";

const API_URL = "http://localhost:5001/api/shop-brands";

function ShopBrands() {
    const [brands, setBrands] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [showModal, setShowModal] = useState(false);
    const [editingBrand, setEditingBrand] = useState(null);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [deletingBrand, setDeletingBrand] = useState(null);

    const [form, setForm] = useState({
        BrandName: "",
        Slug: "",
        Description: "",
        LogoURL: "",
        IsActive: true
    });

    // =====================================================
    // TOKEN
    // =====================================================

    const getToken = () => {
        return (
            localStorage.getItem("shopAdminToken") ||
            localStorage.getItem("shopBuilderToken") ||
            localStorage.getItem("shopToken") ||
            localStorage.getItem("token")
        );
    };

    // =====================================================
    // FETCH BRANDS
    // =====================================================

    const fetchBrands = async () => {
        try {
            setLoading(true);

            const token = getToken();

            if (!token) {
                console.error("Shop Admin token not found.");
                setBrands([]);
                return;
            }

            const response = await fetch(API_URL, {
                method: "GET",
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message || "Failed to fetch brands."
                );
            }

            setBrands(result.data || []);

        } catch (error) {
            console.error("Fetch Shop Brands Error:", error);
            alert(error.message || "Failed to load brands.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBrands();
    }, []);

    // =====================================================
    // FILTER
    // =====================================================

    const filteredBrands = useMemo(() => {
        return brands.filter((brand) => {
            const brandName =
                brand.BrandName?.toLowerCase() || "";

            const slug =
                brand.Slug?.toLowerCase() || "";

            const description =
                brand.Description?.toLowerCase() || "";

            const searchText = search.toLowerCase().trim();

            const matchesSearch =
                !searchText ||
                brandName.includes(searchText) ||
                slug.includes(searchText) ||
                description.includes(searchText);

            const isActive =
                brand.IsActive === true ||
                brand.IsActive === 1;

            const matchesStatus =
                statusFilter === "All" ||
                (statusFilter === "Active" && isActive) ||
                (statusFilter === "Inactive" && !isActive);

            return matchesSearch && matchesStatus;
        });
    }, [brands, search, statusFilter]);

    // =====================================================
    // FORM CHANGE
    // =====================================================

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: type === "checkbox" ? checked : value
        }));
    };

    // =====================================================
    // AUTO SLUG
    // =====================================================

    const generateSlug = (value) => {
        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    };

    const handleBrandNameChange = (e) => {
        const value = e.target.value;

        setForm((prev) => ({
            ...prev,
            BrandName: value,
            Slug: editingBrand
                ? prev.Slug
                : generateSlug(value)
        }));
    };

    // =====================================================
    // OPEN ADD MODAL
    // =====================================================

    const openAddModal = () => {
        setEditingBrand(null);

        setForm({
            BrandName: "",
            Slug: "",
            Description: "",
            LogoURL: "",
            IsActive: true
        });

        setShowModal(true);
    };

    // =====================================================
    // OPEN EDIT MODAL
    // =====================================================

    const openEditModal = (brand) => {
        setEditingBrand(brand);

        setForm({
            BrandName: brand.BrandName || "",
            Slug: brand.Slug || "",
            Description: brand.Description || "",
            LogoURL: brand.LogoURL || "",
            IsActive:
                brand.IsActive === true ||
                brand.IsActive === 1
        });

        setShowModal(true);
    };

    // =====================================================
    // CLOSE MODAL
    // =====================================================

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditingBrand(null);

        setForm({
            BrandName: "",
            Slug: "",
            Description: "",
            LogoURL: "",
            IsActive: true
        });
    };

    // =====================================================
    // SAVE BRAND
    // =====================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.BrandName.trim()) {
            alert("Brand name is required.");
            return;
        }

        try {
            setSaving(true);

            const token = getToken();

            if (!token) {
                alert("Authentication token not found.");
                return;
            }

            const url = editingBrand
                ? `${API_URL}/${editingBrand.BrandID}`
                : API_URL;

            const method = editingBrand ? "PUT" : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    Authorization: `Bearer ${token}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    BrandName: form.BrandName.trim(),
                    Slug:
                        form.Slug.trim() ||
                        generateSlug(form.BrandName),
                    Description:
                        form.Description.trim() || null,
                    LogoURL:
                        form.LogoURL.trim() || null,
                    IsActive: form.IsActive
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Failed to save brand."
                );
            }

            alert(
                editingBrand
                    ? "Brand updated successfully."
                    : "Brand created successfully."
            );

            closeModal();
            fetchBrands();

        } catch (error) {
            console.error("Save Brand Error:", error);
            alert(
                error.message ||
                "Something went wrong while saving brand."
            );
        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // DELETE MODAL
    // =====================================================

    const openDeleteModal = (brand) => {
        setDeletingBrand(brand);
        setShowDeleteModal(true);
    };

    const closeDeleteModal = () => {
        setShowDeleteModal(false);
        setDeletingBrand(null);
    };

    // =====================================================
    // DELETE BRAND
    // =====================================================

    const handleDelete = async () => {
        if (!deletingBrand) return;

        try {
            const token = getToken();

            if (!token) {
                alert("Authentication token not found.");
                return;
            }

            const response = await fetch(
                `${API_URL}/${deletingBrand.BrandID}`,
                {
                    method: "DELETE",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Failed to delete brand."
                );
            }

            closeDeleteModal();
            fetchBrands();

        } catch (error) {
            console.error("Delete Brand Error:", error);

            alert(
                error.message ||
                "Failed to delete brand."
            );
        }
    };

    // =====================================================
    // TOGGLE STATUS
    // =====================================================

    const handleToggleStatus = async (brand) => {
        try {
            const token = getToken();

            if (!token) {
                alert("Authentication token not found.");
                return;
            }

            const response = await fetch(
                `${API_URL}/${brand.BrandID}/toggle-status`,
                {
                    method: "PATCH",
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json"
                    }
                }
            );

            const result = await response.json();

            if (!response.ok) {
                throw new Error(
                    result.message ||
                    "Failed to update brand status."
                );
            }

            setBrands((prev) =>
                prev.map((item) =>
                    item.BrandID === brand.BrandID
                        ? {
                            ...item,
                            IsActive:
                                result.data?.IsActive ??
                                !item.IsActive
                        }
                        : item
                )
            );

        } catch (error) {
            console.error(
                "Toggle Brand Status Error:",
                error
            );

            alert(
                error.message ||
                "Failed to update status."
            );
        }
    };

    // =====================================================
    // STATS
    // =====================================================

    const activeCount = brands.filter(
        (brand) =>
            brand.IsActive === true ||
            brand.IsActive === 1
    ).length;

    const inactiveCount =
        brands.length - activeCount;

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="shop-brands-page">

            {/* HEADER */}

            <div className="shop-brands-header">

                <div>
                    <div className="shop-brands-eyebrow">
                        SHOP MANAGEMENT
                    </div>

                    <h1>
                        Brands
                    </h1>

                    <p>
                        Manage the brands available
                        in your shop.
                    </p>
                </div>

                <button
                    className="shop-brand-add-btn"
                    onClick={openAddModal}
                >
                    <span>+</span>
                    Add Brand
                </button>

            </div>

            {/* STATS */}

            <div className="shop-brand-stats">

                <div className="shop-brand-stat-card">
                    <div className="shop-brand-stat-icon">
                        ◈
                    </div>

                    <div>
                        <span>Total Brands</span>
                        <strong>
                            {brands.length}
                        </strong>
                    </div>
                </div>

                <div className="shop-brand-stat-card">
                    <div className="shop-brand-stat-icon active">
                        ✓
                    </div>

                    <div>
                        <span>Active</span>
                        <strong>
                            {activeCount}
                        </strong>
                    </div>
                </div>

                <div className="shop-brand-stat-card">
                    <div className="shop-brand-stat-icon inactive">
                        ○
                    </div>

                    <div>
                        <span>Inactive</span>
                        <strong>
                            {inactiveCount}
                        </strong>
                    </div>
                </div>

            </div>

            {/* TOOLBAR */}

            <div className="shop-brands-toolbar">

                <div className="shop-brand-search">
                    <span>⌕</span>

                    <input
                        type="text"
                        placeholder="Search brands..."
                        value={search}
                        onChange={(e) =>
                            setSearch(e.target.value)
                        }
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() => setSearch("")}
                        >
                            ×
                        </button>
                    )}
                </div>

                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(e.target.value)
                    }
                    className="shop-brand-status-filter"
                >
                    <option value="All">
                        All Status
                    </option>

                    <option value="Active">
                        Active
                    </option>

                    <option value="Inactive">
                        Inactive
                    </option>
                </select>

                <button
                    className="shop-brand-refresh-btn"
                    onClick={fetchBrands}
                    disabled={loading}
                    title="Refresh"
                >
                    ↻
                </button>

            </div>

            {/* CONTENT */}

            <div className="shop-brands-card">

                <div className="shop-brands-card-header">

                    <div>
                        <h2>
                            Shop Brands
                        </h2>

                        <p>
                            {filteredBrands.length}{" "}
                            {filteredBrands.length === 1
                                ? "brand"
                                : "brands"}{" "}
                            found
                        </p>
                    </div>

                </div>

                {/* LOADING */}

                {loading ? (
                    <div className="shop-brands-loading">
                        <div className="shop-brand-spinner"></div>
                        <span>
                            Loading brands...
                        </span>
                    </div>
                ) : filteredBrands.length === 0 ? (

                    /* EMPTY */

                    <div className="shop-brands-empty">

                        <div className="shop-brand-empty-icon">
                            ◇
                        </div>

                        <h3>
                            No brands found
                        </h3>

                        <p>
                            {search
                                ? "Try changing your search."
                                : "Add your first brand to get started."}
                        </p>

                        {!search && (
                            <button
                                className="shop-brand-empty-btn"
                                onClick={openAddModal}
                            >
                                + Add Brand
                            </button>
                        )}

                    </div>

                ) : (

                    /* TABLE */

                    <div className="shop-brands-table-wrapper">

                        <table className="shop-brands-table">

                            <thead>
                                <tr>
                                    <th>Brand</th>
                                    <th>Slug</th>
                                    <th>Description</th>
                                    <th>Status</th>
                                    <th>Created</th>
                                    <th>Actions</th>
                                </tr>
                            </thead>

                            <tbody>

                                {filteredBrands.map((brand) => {

                                    const active =
                                        brand.IsActive === true ||
                                        brand.IsActive === 1;

                                    return (
                                        <tr
                                            key={brand.BrandID}
                                        >

                                            <td>
                                                <div className="shop-brand-info">

                                                    <div className="shop-brand-logo">

                                                        {brand.LogoURL ? (
                                                            <img
                                                                src={brand.LogoURL}
                                                                alt={
                                                                    brand.BrandName
                                                                }
                                                                onError={(e) => {
                                                                    e.currentTarget.style.display =
                                                                        "none";
                                                                    e.currentTarget.parentElement.classList.add(
                                                                        "fallback"
                                                                    );
                                                                }}
                                                            />
                                                        ) : (
                                                            <span>
                                                                {brand.BrandName
                                                                    ?.charAt(
                                                                        0
                                                                    )
                                                                    .toUpperCase()}
                                                            </span>
                                                        )}

                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {
                                                                brand.BrandName
                                                            }
                                                        </strong>

                                                        <small>
                                                            ID:{" "}
                                                            {
                                                                brand.BrandID
                                                            }
                                                        </small>
                                                    </div>

                                                </div>
                                            </td>

                                            <td>
                                                <span className="shop-brand-slug">
                                                    /
                                                    {brand.Slug ||
                                                        "-"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="shop-brand-description">
                                                    {brand.Description ||
                                                        "No description"}
                                                </div>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className={`shop-brand-status ${
                                                        active
                                                            ? "active"
                                                            : "inactive"
                                                    }`}
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            brand
                                                        )
                                                    }
                                                >
                                                    <span></span>
                                                    {active
                                                        ? "Active"
                                                        : "Inactive"}
                                                </button>
                                            </td>

                                            <td>
                                                <span className="shop-brand-date">
                                                    {brand.CreatedAt
                                                        ? new Date(
                                                            brand.CreatedAt
                                                        ).toLocaleDateString(
                                                            "en-IN",
                                                            {
                                                                day: "2-digit",
                                                                month: "short",
                                                                year: "numeric"
                                                            }
                                                        )
                                                        : "-"}
                                                </span>
                                            </td>

                                            <td>
                                                <div className="shop-brand-actions">

                                                    <button
                                                        type="button"
                                                        className="shop-brand-edit"
                                                        onClick={() =>
                                                            openEditModal(
                                                                brand
                                                            )
                                                        }
                                                        title="Edit"
                                                    >
                                                        ✎
                                                    </button>

                                                    <button
                                                        type="button"
                                                        className="shop-brand-delete"
                                                        onClick={() =>
                                                            openDeleteModal(
                                                                brand
                                                            )
                                                        }
                                                        title="Delete"
                                                    >
                                                        🗑
                                                    </button>

                                                </div>
                                            </td>

                                        </tr>
                                    );
                                })}

                            </tbody>

                        </table>

                    </div>

                )}

            </div>

            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showModal && (
                <div
                    className="shop-brand-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target === e.currentTarget &&
                            !saving
                        ) {
                            closeModal();
                        }
                    }}
                >

                    <div className="shop-brand-modal">

                        <div className="shop-brand-modal-header">

                            <div>
                                <span>
                                    {editingBrand
                                        ? "UPDATE BRAND"
                                        : "NEW BRAND"}
                                </span>

                                <h2>
                                    {editingBrand
                                        ? "Edit Brand"
                                        : "Add Brand"}
                                </h2>
                            </div>

                            <button
                                type="button"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                ×
                            </button>

                        </div>

                        <form
                            onSubmit={handleSubmit}
                            className="shop-brand-form"
                        >

                            <div className="shop-brand-form-grid">

                                {/* NAME */}

                                <div className="shop-brand-field full">
                                    <label>
                                        Brand Name
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="BrandName"
                                        value={
                                            form.BrandName
                                        }
                                        onChange={
                                            handleBrandNameChange
                                        }
                                        placeholder="e.g. Hikvision"
                                        required
                                    />
                                </div>

                                {/* SLUG */}

                                <div className="shop-brand-field">
                                    <label>
                                        Slug
                                    </label>

                                    <input
                                        type="text"
                                        name="Slug"
                                        value={
                                            form.Slug
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="hikvision"
                                    />
                                </div>

                                {/* LOGO */}

                                <div className="shop-brand-field">
                                    <ImageGalleryField label="Brand logo" multiple={false} value={form.LogoURL ? [form.LogoURL] : []} onChange={(images) => setForm((prev) => ({ ...prev, LogoURL: images[0] || "" }))} />
                                </div>

                                {/* DESCRIPTION */}

                                <div className="shop-brand-field full">
                                    <label>
                                        Description
                                    </label>

                                    <textarea
                                        name="Description"
                                        value={
                                            form.Description
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter brand description..."
                                        rows="4"
                                    />
                                </div>

                                {/* STATUS */}

                                <div className="shop-brand-field full">

                                    <label className="shop-brand-checkbox">

                                        <input
                                            type="checkbox"
                                            name="IsActive"
                                            checked={
                                                form.IsActive
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                        <span>
                                            Brand is active
                                        </span>

                                    </label>

                                </div>

                            </div>

                            {/* MODAL ACTIONS */}

                            <div className="shop-brand-modal-actions">

                                <button
                                    type="button"
                                    className="shop-brand-cancel-btn"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="shop-brand-save-btn"
                                    disabled={saving}
                                >
                                    {saving ? (
                                        <>
                                            <span className="shop-brand-small-spinner"></span>
                                            Saving...
                                        </>
                                    ) : (
                                        editingBrand
                                            ? "Update Brand"
                                            : "Create Brand"
                                    )}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =================================================
                DELETE CONFIRMATION
            ================================================= */}

            {showDeleteModal && deletingBrand && (
                <div
                    className="shop-brand-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target === e.currentTarget
                        ) {
                            closeDeleteModal();
                        }
                    }}
                >

                    <div className="shop-brand-delete-modal">

                        <div className="shop-brand-delete-icon">
                            !
                        </div>

                        <h2>
                            Delete Brand?
                        </h2>

                        <p>
                            Are you sure you want to delete{" "}
                            <strong>
                                {deletingBrand.BrandName}
                            </strong>
                            ?
                            <br />
                            This action cannot be undone.
                        </p>

                        <div className="shop-brand-delete-actions">

                            <button
                                type="button"
                                className="shop-brand-cancel-btn"
                                onClick={
                                    closeDeleteModal
                                }
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                className="shop-brand-confirm-delete"
                                onClick={
                                    handleDelete
                                }
                            >
                                Delete Brand
                            </button>

                        </div>

                    </div>

                </div>
            )}

        </div>
    );
}

export default ShopBrands;
