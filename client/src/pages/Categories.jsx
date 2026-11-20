import { useEffect, useMemo, useState } from "react";
import {
    Search,
    Plus,
    Pencil,
    Trash2,
    Eye,
    X,
    ChevronDown,
    FolderTree,
    RefreshCw
} from "lucide-react";

import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import "../styles/Categories.css";
import ImageGalleryField from "../components/ImageGalleryField.jsx";
import { adminFetch as fetch, API_ORIGIN } from "../lib/api.js";

const API_URL = `${API_ORIGIN}/api/categories`;
const SHOPS_API = `${API_ORIGIN}/api/shops`;
const authHeaders = () => ({ Authorization: `Bearer ${localStorage.getItem("token") || ""}` });

const emptyForm = {
    parentCategoryID: "",
    categoryName: "",
    slug: "",
    description: "",
    imageURL: "",
    sortOrder: 0,
    isActive: true
};

const Categories = () => {
    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("all");

    const [shops, setShops] = useState([]);
    const [shopsLoading, setShopsLoading] = useState(false);

    const [shopFilter, setShopFilter] = useState("all");

    const [showModal, setShowModal] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const [editingCategory, setEditingCategory] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const [form, setForm] = useState(emptyForm);

    // =====================================================
    // FETCH CATEGORIES
    // =====================================================

    const fetchCategories = async (showLoader = true) => {
        try {
            if (showLoader) {
                setLoading(true);
            }

            const url =
                shopFilter === "all"
                    ? API_URL
                    : `${API_URL}?shopID=${shopFilter}`;

            const response = await fetch(url, { headers: authHeaders() });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                        "Failed to fetch categories."
                );
            }

            setCategories(
                Array.isArray(result.data)
                    ? result.data
                    : []
            );
        } catch (error) {
            console.error(
                "Fetch Categories Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to load categories."
            );
        } finally {
            setLoading(false);
        }
    };

    // =====================================================
    // FETCH SHOPS
    // =====================================================

    const fetchShops = async () => {
        try {
            setShopsLoading(true);

            const response = await fetch(SHOPS_API, { headers: authHeaders() });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                        "Failed to fetch shops."
                );
            }

            setShops(
                Array.isArray(result.data)
                    ? result.data
                    : []
            );
        } catch (error) {
            console.error(
                "Fetch Shops Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to load shops."
            );
        } finally {
            setShopsLoading(false);
        }
    };

    // =====================================================
    // INITIAL LOAD
    // =====================================================

    useEffect(() => {
        fetchShops();
    }, []);

    useEffect(() => {
        fetchCategories();
    }, [shopFilter]);

    // =====================================================
    // FORM INPUT
    // =====================================================

    const handleChange = (e) => {
        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
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

    const handleCategoryNameChange = (e) => {
        const value = e.target.value;

        setForm((prev) => ({
            ...prev,
            categoryName: value,
            slug: editingCategory
                ? prev.slug
                : generateSlug(value)
        }));
    };

    // =====================================================
    // OPEN CREATE MODAL
    // =====================================================

    const openCreateModal = () => {
        if (shopFilter === "all") {
            toast.warning(
                "Please select a shop before creating a category."
            );
            return;
        }

        setEditingCategory(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    // =====================================================
    // OPEN EDIT MODAL
    // =====================================================

    const openEditModal = (category) => {
        setEditingCategory(category);

        setForm({
            parentCategoryID:
                category.ParentCategoryID ?? "",
            categoryName:
                category.CategoryName || "",
            slug:
                category.Slug || "",
            description:
                category.Description || "",
            imageURL:
                category.ImageURL || "",
            sortOrder:
                category.SortOrder ?? 0,
            isActive:
                Boolean(category.IsActive)
        });

        setShowModal(true);
    };

    // =====================================================
    // CLOSE MODAL
    // =====================================================

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditingCategory(null);
        setForm(emptyForm);
    };

    // =====================================================
    // CREATE / UPDATE
    // =====================================================

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.categoryName.trim()) {
            toast.warning(
                "Please enter category name."
            );
            return;
        }

        if (!form.slug.trim()) {
            toast.warning(
                "Please enter category slug."
            );
            return;
        }

        if (!editingCategory && shopFilter === "all") {
            toast.warning(
                "Please select a shop before creating a category."
            );
            return;
        }

        if (
            editingCategory &&
            form.parentCategoryID &&
            Number(form.parentCategoryID) ===
                Number(editingCategory.CategoryID)
        ) {
            toast.error(
                "A category cannot be its own parent."
            );
            return;
        }

        setSaving(true);

        try {
            const payload = {
                shopID: editingCategory
                    ? Number(editingCategory.ShopID)
                    : Number(shopFilter),

                parentCategoryID:
                    form.parentCategoryID
                        ? Number(
                              form.parentCategoryID
                          )
                        : null,

                categoryName:
                    form.categoryName.trim(),

                slug:
                    form.slug.trim(),

                description:
                    form.description.trim() ||
                    null,

                imageURL:
                    form.imageURL.trim() ||
                    null,

                sortOrder:
                    Number(form.sortOrder) || 0,

                isActive:
                    Boolean(form.isActive)
            };

            const url = editingCategory
                ? `${API_URL}/${editingCategory.CategoryID}`
                : API_URL;

            const method = editingCategory
                ? "PUT"
                : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    ...authHeaders(),
                    "Content-Type":
                        "application/json"
                },
                body: JSON.stringify(payload)
            });

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                        "Something went wrong."
                );
            }

            // =============================================
            // LIVE UPDATE WITHOUT PAGE REFRESH
            // =============================================

            if (editingCategory) {
                setCategories((prev) =>
                    prev.map((item) =>
                        Number(
                            item.CategoryID
                        ) ===
                        Number(
                            editingCategory.CategoryID
                        )
                            ? result.data
                            : item
                    )
                );

                toast.success(
                    "Category updated successfully."
                );
            } else {
                setCategories((prev) => [
                    result.data,
                    ...prev
                ]);

                toast.success(
                    "Category created successfully."
                );
            }

            closeModal();
        } catch (error) {
            console.error(
                "Save Category Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to save category."
            );
        } finally {
            setSaving(false);
        }
    };

    // =====================================================
    // DELETE CATEGORY
    // =====================================================

    const handleDelete = async (category) => {
        const confirmed =
            window.confirm(
                `Are you sure you want to delete "${category.CategoryName}"?`
            );

        if (!confirmed) return;

        try {
            const response = await fetch(
                `${API_URL}/${category.CategoryID}`,
                {
                    method: "DELETE",
                    headers: {
                        ...authHeaders(),
                        "Content-Type":
                            "application/json"
                    }
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                        "Failed to delete category."
                );
            }

            // =============================================
            // LIVE REMOVE WITHOUT REFRESH
            // =============================================

            setCategories((prev) =>
                prev.filter(
                    (item) =>
                        Number(
                            item.CategoryID
                        ) !==
                        Number(
                            category.CategoryID
                        )
                )
            );

            toast.success(
                "Category deleted successfully."
            );
        } catch (error) {
            console.error(
                "Delete Category Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to delete category."
            );
        }
    };

    // =====================================================
    // TOGGLE ACTIVE / INACTIVE
    // =====================================================

    const handleToggleStatus = async (
        category
    ) => {
        const newStatus =
            !Boolean(category.IsActive);

        try {
            const response = await fetch(
                `${API_URL}/${category.CategoryID}`,
                {
                    method: "PUT",
                    headers: {
                        ...authHeaders(),
                        "Content-Type":
                            "application/json"
                    },
                    body: JSON.stringify({
                        shopID: Number(
                            category.ShopID
                        ),

                        parentCategoryID:
                            category.ParentCategoryID ??
                            null,

                        categoryName:
                            category.CategoryName,

                        slug:
                            category.Slug,

                        description:
                            category.Description ||
                            null,

                        imageURL:
                            category.ImageURL ||
                            null,

                        sortOrder:
                            category.SortOrder ??
                            0,

                        isActive:
                            newStatus
                    })
                }
            );

            const result =
                await response.json();

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                        "Failed to update category status."
                );
            }

            // LIVE UPDATE — NO PAGE REFRESH
            setCategories((prev) =>
                prev.map((item) =>
                    Number(
                        item.CategoryID
                    ) ===
                    Number(
                        category.CategoryID
                    )
                        ? {
                              ...item,
                              ...result.data,
                              IsActive:
                                  newStatus
                          }
                        : item
                )
            );

            toast.success(
                newStatus
                    ? "Category activated successfully."
                    : "Category deactivated successfully."
            );
        } catch (error) {
            console.error(
                "Toggle Category Status Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to update category status."
            );
        }
    };

    // =====================================================
    // VIEW DETAILS
    // =====================================================

    const openDetails = (category) => {
        setSelectedCategory(category);
        setShowDetails(true);
    };

    const closeDetails = () => {
        setShowDetails(false);
        setSelectedCategory(null);
    };

    // =====================================================
    // GET PARENT NAME
    // =====================================================

    const getParentName = (parentID) => {
        if (!parentID) {
            return "Main Category";
        }

        const parent =
            categories.find(
                (item) =>
                    Number(
                        item.CategoryID
                    ) === Number(parentID)
            );

        return parent
            ? parent.CategoryName
            : "Unknown";
    };

    // =====================================================
    // FILTER CATEGORIES
    // =====================================================

    const filteredCategories = useMemo(() => {
        const keyword = search
            .toLowerCase()
            .trim();

        return categories.filter(
            (category) => {
                const matchesSearch =
                    !keyword ||
                    category.CategoryName
                        ?.toLowerCase()
                        .includes(keyword) ||
                    category.Slug
                        ?.toLowerCase()
                        .includes(keyword) ||
                    category.Description
                        ?.toLowerCase()
                        .includes(keyword);

                const matchesShop =
                    shopFilter === "all" ||
                    Number(category.ShopID) ===
                        Number(shopFilter);

                const matchesStatus =
                    statusFilter === "all" ||
                    (statusFilter === "active" &&
                        Boolean(
                            category.IsActive
                        )) ||
                    (statusFilter ===
                        "inactive" &&
                        !Boolean(
                            category.IsActive
                        ));

                return (
                    matchesSearch &&
                    matchesShop &&
                    matchesStatus
                );
            }
        );
    }, [
        categories,
        search,
        shopFilter,
        statusFilter
    ]);

    // =====================================================
    // STATS
    // =====================================================

    const activeCount =
        categories.filter(
            (item) =>
                Boolean(item.IsActive)
        ).length;

    const inactiveCount =
        categories.length - activeCount;

    const rootCount =
        categories.filter(
            (item) =>
                !item.ParentCategoryID
        ).length;

    // =====================================================
    // RENDER
    // =====================================================

    return (
        <div className="categories-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="categories-header">

                <div className="categories-heading">

                    <div className="categories-icon">
                        <FolderTree size={26} />
                    </div>

                    <div>
                        <h1>Categories</h1>

                        <p>
                            Organize your shop products
                            with categories and
                            subcategories.
                        </p>
                    </div>

                </div>

                <button
                    className="category-primary-btn"
                    onClick={
                        openCreateModal
                    }
                >
                    <Plus size={19} />
                    Add Category
                </button>

            </div>

            {/* =================================================
                STATS
            ================================================= */}

            <div className="category-stats">

                <div className="category-stat-card">
                    <span>
                        Total Categories
                    </span>
                    <strong>
                        {categories.length}
                    </strong>
                </div>

                <div className="category-stat-card">
                    <span>Active</span>
                    <strong>
                        {activeCount}
                    </strong>
                </div>

                <div className="category-stat-card">
                    <span>Inactive</span>
                    <strong>
                        {inactiveCount}
                    </strong>
                </div>

                <div className="category-stat-card">
                    <span>
                        Main Categories
                    </span>
                    <strong>
                        {rootCount}
                    </strong>
                </div>

            </div>

            {/* =================================================
                TOOLBAR
            ================================================= */}

            <div className="categories-toolbar">

                <div className="category-search">

                    <Search size={19} />

                    <input
                        type="text"
                        placeholder="Search categories..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() =>
                                setSearch("")
                            }
                            className="clear-search"
                        >
                            <X size={16} />
                        </button>
                    )}

                </div>

                <div className="category-toolbar-right">

                    {/* SHOP FILTER */}

                    <div className="category-select">

                        <select
                            value={
                                shopFilter
                            }
                            onChange={(e) =>
                                setShopFilter(
                                    e.target.value
                                )
                            }
                            disabled={
                                shopsLoading
                            }
                        >
                            <option value="all">
                                All Shops
                            </option>

                            {shops.map(
                                (shop) => (
                                    <option
                                        key={
                                            shop.ShopID
                                        }
                                        value={
                                            shop.ShopID
                                        }
                                    >
                                        {
                                            shop.ShopName
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        <ChevronDown
                            size={17}
                        />

                    </div>

                    {/* STATUS FILTER */}

                    <div className="category-select">

                        <select
                            value={
                                statusFilter
                            }
                            onChange={(e) =>
                                setStatusFilter(
                                    e.target.value
                                )
                            }
                        >
                            <option value="all">
                                All Status
                            </option>

                            <option value="active">
                                Active
                            </option>

                            <option value="inactive">
                                Inactive
                            </option>
                        </select>

                        <ChevronDown
                            size={17}
                        />

                    </div>

                    {/* REFRESH */}

                    <button
                        className="refresh-btn"
                        onClick={() =>
                            fetchCategories()
                        }
                        title="Refresh categories"
                    >
                        <RefreshCw
                            size={18}
                            className={
                                loading
                                    ? "spin"
                                    : ""
                            }
                        />
                    </button>

                </div>

            </div>

            {/* =================================================
                TABLE
            ================================================= */}

            <div className="categories-card">

                {loading ? (
                    <div className="category-loading">
                        <RefreshCw
                            size={28}
                            className="spin"
                        />

                        <p>
                            Loading categories...
                        </p>
                    </div>
                ) : filteredCategories.length ===
                  0 ? (
                    <div className="category-empty">

                        <div className="empty-icon">
                            <FolderTree
                                size={32}
                            />
                        </div>

                        <h3>
                            {search
                                ? "No categories found"
                                : "No categories yet"}
                        </h3>

                        <p>
                            {search
                                ? "Try another search keyword."
                                : "Create your first category to get started."}
                        </p>

                        {!search && (
                            <button
                                className="category-primary-btn"
                                onClick={
                                    openCreateModal
                                }
                            >
                                <Plus size={18} />
                                Create Category
                            </button>
                        )}

                    </div>
                ) : (
                    <div className="category-table-wrapper">

                        <table className="category-table">

                            <thead>
                                <tr>
                                    <th>
                                        Category
                                    </th>
                                    <th>
                                        Slug
                                    </th>
                                    <th>
                                        Parent
                                    </th>
                                    <th>
                                        Order
                                    </th>
                                    <th>
                                        Status
                                    </th>
                                    <th>
                                        Created
                                    </th>
                                    <th className="action-column">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {filteredCategories.map(
                                    (category) => (
                                        <tr
                                            key={
                                                category.CategoryID
                                            }
                                        >

                                            <td>
                                                <div className="category-name-cell">

                                                    <div className="category-avatar">
                                                        {category
                                                            .CategoryName
                                                            ?.charAt(
                                                                0
                                                            )
                                                            ?.toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {
                                                                category.CategoryName
                                                            }
                                                        </strong>

                                                        <small>
                                                            ID #
                                                            {
                                                                category.CategoryID
                                                            }
                                                        </small>
                                                    </div>

                                                </div>
                                            </td>

                                            <td>
                                                <span className="category-slug">
                                                    /
                                                    {
                                                        category.Slug
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <span className="parent-badge">
                                                    {getParentName(
                                                        category.ParentCategoryID
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                <span className="sort-number">
                                                    {
                                                        category.SortOrder
                                                    }
                                                </span>
                                            </td>

                                            <td>
                                                <button
                                                    type="button"
                                                    className={`status-badge ${
                                                        category.IsActive
                                                            ? "active"
                                                            : "inactive"
                                                    }`}
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            category
                                                        )
                                                    }
                                                    title={
                                                        category.IsActive
                                                            ? "Click to deactivate"
                                                            : "Click to activate"
                                                    }
                                                >
                                                    <span />
                                                    {category.IsActive
                                                        ? "Active"
                                                        : "Inactive"}
                                                </button>
                                            </td>

                                            <td>
                                                <span className="created-date">
                                                    {category.CreatedAt
                                                        ? new Date(
                                                              category.CreatedAt
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

                                                <div className="category-actions">

                                                    <button
                                                        className="action-btn view"
                                                        title="View"
                                                        onClick={() =>
                                                            openDetails(
                                                                category
                                                            )
                                                        }
                                                    >
                                                        <Eye
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>

                                                    <button
                                                        className="action-btn edit"
                                                        title="Edit"
                                                        onClick={() =>
                                                            openEditModal(
                                                                category
                                                            )
                                                        }
                                                    >
                                                        <Pencil
                                                            size={
                                                                17
                                                            }
                                                        />
                                                    </button>

                                                    <button
                                                        className="action-btn delete"
                                                        title="Delete"
                                                        onClick={() =>
                                                            handleDelete(
                                                                category
                                                            )
                                                        }
                                                    >
                                                        <Trash2
                                                            size={
                                                                17
                                                            }
                                                        />
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
                    className="category-modal-overlay"
                    onMouseDown={
                        closeModal
                    }
                >

                    <div
                        className="category-modal"
                        onMouseDown={(e) =>
                            e.stopPropagation()
                        }
                    >

                        <div className="category-modal-header">

                            <div>
                                <h2>
                                    {editingCategory
                                        ? "Edit Category"
                                        : "Create Category"}
                                </h2>

                                <p>
                                    {editingCategory
                                        ? "Update category information."
                                        : "Add a new category to your shop."}
                                </p>
                            </div>

                            <button
                                className="modal-close"
                                onClick={
                                    closeModal
                                }
                                disabled={
                                    saving
                                }
                            >
                                <X size={20} />
                            </button>

                        </div>

                        <form
                            className="category-form"
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <div className="form-grid">

                                {/* Category Name */}

                                <div className="form-group full">
                                    <label>
                                        Category Name
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="categoryName"
                                        value={
                                            form.categoryName
                                        }
                                        onChange={
                                            handleCategoryNameChange
                                        }
                                        placeholder="e.g. CCTV Cameras"
                                        required
                                    />
                                </div>

                                {/* Slug */}

                                <div className="form-group">
                                    <label>
                                        Slug
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="slug"
                                        value={
                                            form.slug
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="cctv-cameras"
                                        required
                                    />
                                </div>

                                {/* Parent */}

                                <div className="form-group">
                                    <label>
                                        Parent Category
                                    </label>

                                    <div className="select-wrapper">

                                        <select
                                            name="parentCategoryID"
                                            value={
                                                form.parentCategoryID
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        >
                                            <option value="">
                                                Main Category
                                            </option>

                                            {categories
                                                .filter(
                                                    (
                                                        item
                                                    ) =>
                                                        !editingCategory ||
                                                        Number(
                                                            item.CategoryID
                                                        ) !==
                                                            Number(
                                                                editingCategory.CategoryID
                                                            )
                                                )
                                                .map(
                                                    (
                                                        item
                                                    ) => (
                                                        <option
                                                            key={
                                                                item.CategoryID
                                                            }
                                                            value={
                                                                item.CategoryID
                                                            }
                                                        >
                                                            {
                                                                item.CategoryName
                                                            }
                                                        </option>
                                                    )
                                                )}
                                        </select>

                                        <ChevronDown
                                            size={17}
                                        />

                                    </div>
                                </div>

                                {/* Sort Order */}

                                <div className="form-group">
                                    <label>
                                        Sort Order
                                    </label>

                                    <input
                                        type="number"
                                        name="sortOrder"
                                        min="0"
                                        value={
                                            form.sortOrder
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />
                                </div>

                                {/* Image URL */}

                                <div className="form-group">
                                    <ImageGalleryField
                                        label="Category image"
                                        multiple={false}
                                        value={form.imageURL ? [form.imageURL] : []}
                                        onChange={(images) => setForm((prev) => ({ ...prev, imageURL: images[0] || "" }))}
                                        shopID={form.shopID || (shopFilter === "all" ? "" : shopFilter)}
                                    />
                                </div>

                                {/* Description */}

                                <div className="form-group full">
                                    <label>
                                        Description
                                    </label>

                                    <textarea
                                        name="description"
                                        value={
                                            form.description
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Enter category description..."
                                        rows="4"
                                    />
                                </div>

                                {/* Active */}

                                <div className="form-group full">

                                    <label className="checkbox-label">

                                        <input
                                            type="checkbox"
                                            name="isActive"
                                            checked={
                                                form.isActive
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                        <span className="custom-checkbox">
                                            ✓
                                        </span>

                                        <span>
                                            Category is active
                                        </span>

                                    </label>

                                </div>

                            </div>

                            <div className="category-modal-footer">

                                <button
                                    type="button"
                                    className="modal-cancel"
                                    onClick={
                                        closeModal
                                    }
                                    disabled={
                                        saving
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="category-primary-btn"
                                    disabled={
                                        saving
                                    }
                                >
                                    {saving ? (
                                        <>
                                            <RefreshCw
                                                size={
                                                    17
                                                }
                                                className="spin"
                                            />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus
                                                size={
                                                    18
                                                }
                                            />
                                            {editingCategory
                                                ? "Update Category"
                                                : "Create Category"}
                                        </>
                                    )}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {/* =================================================
                DETAILS MODAL
            ================================================= */}

            {showDetails &&
                selectedCategory && (
                    <div
                        className="category-modal-overlay"
                        onMouseDown={
                            closeDetails
                        }
                    >

                        <div
                            className="category-details-modal"
                            onMouseDown={(e) =>
                                e.stopPropagation()
                            }
                        >

                            <div className="category-modal-header">

                                <div>
                                    <h2>
                                        Category Details
                                    </h2>

                                    <p>
                                        Complete category
                                        information.
                                    </p>
                                </div>

                                <button
                                    className="modal-close"
                                    onClick={
                                        closeDetails
                                    }
                                >
                                    <X size={20} />
                                </button>

                            </div>

                            <div className="category-details-body">

                                {selectedCategory.ImageURL && (
                                    <img
                                        src={
                                            selectedCategory.ImageURL
                                        }
                                        alt={
                                            selectedCategory.CategoryName
                                        }
                                        className="category-detail-image"
                                    />
                                )}

                                <div className="category-detail-title">

                                    <div className="category-avatar large">
                                        {selectedCategory.CategoryName?.charAt(
                                            0
                                        )?.toUpperCase()}
                                    </div>

                                    <div>
                                        <h3>
                                            {
                                                selectedCategory.CategoryName
                                            }
                                        </h3>

                                        <span>
                                            /
                                            {
                                                selectedCategory.Slug
                                            }
                                        </span>
                                    </div>

                                </div>

                                <div className="details-grid">

                                    <div>
                                        <span>
                                            Category ID
                                        </span>
                                        <strong>
                                            {
                                                selectedCategory.CategoryID
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Shop ID
                                        </span>
                                        <strong>
                                            {
                                                selectedCategory.ShopID
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Parent
                                        </span>
                                        <strong>
                                            {getParentName(
                                                selectedCategory.ParentCategoryID
                                            )}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Sort Order
                                        </span>
                                        <strong>
                                            {
                                                selectedCategory.SortOrder
                                            }
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Status
                                        </span>
                                        <strong>
                                            {selectedCategory.IsActive
                                                ? "Active"
                                                : "Inactive"}
                                        </strong>
                                    </div>

                                    <div>
                                        <span>
                                            Created
                                        </span>
                                        <strong>
                                            {selectedCategory.CreatedAt
                                                ? new Date(
                                                      selectedCategory.CreatedAt
                                                  ).toLocaleString(
                                                      "en-IN"
                                                  )
                                                : "-"}
                                        </strong>
                                    </div>

                                </div>

                                <div className="details-description">

                                    <span>
                                        Description
                                    </span>

                                    <p>
                                        {selectedCategory.Description ||
                                            "No description added."}
                                    </p>

                                </div>

                            </div>

                            <div className="category-modal-footer">

                                <button
                                    className="modal-cancel"
                                    onClick={
                                        closeDetails
                                    }
                                >
                                    Close
                                </button>

                                <button
                                    className="category-primary-btn"
                                    onClick={() => {
                                        closeDetails();
                                        openEditModal(
                                            selectedCategory
                                        );
                                    }}
                                >
                                    <Pencil size={17} />
                                    Edit Category
                                </button>

                            </div>

                        </div>

                    </div>
                )}

            {/* =================================================
                TOASTIFY
            ================================================= */}

            <ToastContainer
                position="top-right"
                autoClose={2500}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                theme="light"
            />

        </div>
    );
};

export default Categories;
