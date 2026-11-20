import { useEffect, useMemo, useState } from "react";
import {
    Plus,
    Search,
    Edit,
    Trash2,
    Eye,
    Power,
    X
} from "lucide-react";
import { toast } from "react-toastify";
import "../styles/Brands.css";
import ImageGalleryField from "../components/ImageGalleryField.jsx";
import { adminFetch as fetch, API_ORIGIN } from "../lib/api.js";

const API_URL = `${API_ORIGIN}/api`;

const Brands = () => {

    /* =====================================================
       STATES
    ===================================================== */

    const [brands, setBrands] = useState([]);
    const [shops, setShops] = useState([]);

    const [selectedShop, setSelectedShop] = useState("");
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(false);
    const [shopsLoading, setShopsLoading] = useState(false);

    const [showForm, setShowForm] = useState(false);
    const [showView, setShowView] = useState(false);

    const [editingBrand, setEditingBrand] = useState(null);
    const [viewBrand, setViewBrand] = useState(null);

    const [deleteBrand, setDeleteBrand] = useState(null);
    const [deletingId, setDeletingId] = useState(null);

    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        shopID: "",
        brandName: "",
        slug: "",
        logoURL: "",
        description: "",
        isActive: true
    });


    /* =====================================================
       FETCH SHOPS
    ===================================================== */

    const fetchShops = async () => {

        try {

            setShopsLoading(true);

            const response = await fetch(
                `${API_URL}/shops`
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Failed to fetch shops."
                );
            }

            const shopData = Array.isArray(result.data)
                ? result.data
                : [];

            setShops(shopData);

            /*
             * If only one shop exists,
             * automatically select it.
             */
            if (
                shopData.length === 1 &&
                !selectedShop
            ) {
                setSelectedShop(
                    String(
                        shopData[0].ShopID
                    )
                );
            }

        } catch (error) {

            console.error(
                "Fetch Shops Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to fetch shops."
            );

        } finally {

            setShopsLoading(false);
        }
    };


    /* =====================================================
       FETCH BRANDS
    ===================================================== */

    const fetchBrands = async (shopID = "") => {

        try {

            setLoading(true);

            let url = `${API_URL}/brands`;

            if (shopID) {
                url += `?shopID=${shopID}`;
            }

            const response = await fetch(url);

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Failed to fetch brands."
                );
            }

            setBrands(
                Array.isArray(result.data)
                    ? result.data
                    : []
            );

        } catch (error) {

            console.error(
                "Fetch Brands Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to fetch brands."
            );

        } finally {

            setLoading(false);
        }
    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        fetchShops();
        fetchBrands();
    }, []);


    /* =====================================================
       SHOP CHANGE
    ===================================================== */

    useEffect(() => {

        if (selectedShop) {
            fetchBrands(selectedShop);
        }

    }, [selectedShop]);


    /* =====================================================
       SEARCH
    ===================================================== */

    const filteredBrands = useMemo(() => {

        const value = search
            .trim()
            .toLowerCase();

        if (!value) {
            return brands;
        }

        return brands.filter((brand) => {

            return (
                String(
                    brand.BrandName || ""
                )
                    .toLowerCase()
                    .includes(value) ||

                String(
                    brand.Slug || ""
                )
                    .toLowerCase()
                    .includes(value) ||

                String(
                    brand.Description || ""
                )
                    .toLowerCase()
                    .includes(value)
            );

        });

    }, [brands, search]);


    /* =====================================================
       FORM INPUT
    ===================================================== */

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setFormData((previous) => ({
            ...previous,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };


    /* =====================================================
       SLUG GENERATOR
    ===================================================== */

    const generateSlug = (value) => {

        return value
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9\s-]/g, "")
            .replace(/\s+/g, "-")
            .replace(/-+/g, "-");
    };


    /* =====================================================
       BRAND NAME CHANGE
    ===================================================== */

    const handleBrandNameChange = (e) => {

        const value = e.target.value;

        setFormData((previous) => ({
            ...previous,
            brandName: value,

            /*
             * Only auto-generate slug while creating.
             * During edit, existing slug remains untouched.
             */
            ...(editingBrand
                ? {}
                : {
                    slug: generateSlug(value)
                })
        }));
    };


    /* =====================================================
       OPEN ADD FORM
    ===================================================== */

    const openAddForm = () => {

        setEditingBrand(null);

        setFormData({
            shopID: selectedShop || "",
            brandName: "",
            slug: "",
            logoURL: "",
            description: "",
            isActive: true
        });

        setShowForm(true);
    };


    /* =====================================================
       OPEN EDIT FORM
    ===================================================== */

    const openEditForm = (brand) => {

        setEditingBrand(brand);

        setFormData({
            shopID: brand.ShopID || "",
            brandName: brand.BrandName || "",
            slug: brand.Slug || "",
            logoURL: brand.LogoURL || "",
            description: brand.Description || "",
            isActive:
                brand.IsActive !== false
        });

        setShowForm(true);
    };


    /* =====================================================
       CLOSE FORM
    ===================================================== */

    const closeForm = () => {

        if (saving) {
            return;
        }

        setShowForm(false);
        setEditingBrand(null);
    };


    /* =====================================================
       CREATE / UPDATE BRAND
    ===================================================== */

    const handleSubmit = async (e) => {

        e.preventDefault();

        if (!formData.shopID) {
            toast.error("Please select a shop.");
            return;
        }

        if (!formData.brandName.trim()) {
            toast.error("Brand name is required.");
            return;
        }

        if (!formData.slug.trim()) {
            toast.error("Slug is required.");
            return;
        }

        try {

            setSaving(true);

            const payload = {
                shopID: Number(
                    formData.shopID
                ),

                brandName:
                    formData.brandName.trim(),

                slug:
                    formData.slug.trim(),

                logoURL:
                    formData.logoURL.trim() ||
                    null,

                description:
                    formData.description.trim() ||
                    null,

                isActive:
                    Boolean(
                        formData.isActive
                    )
            };


            /* =============================================
               UPDATE
            ============================================= */

            if (editingBrand) {

                const response = await fetch(
                    `${API_URL}/brands/${editingBrand.BrandID}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify(
                            payload
                        )
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
                        "Failed to update brand."
                    );
                }

                /*
                 * Update row immediately
                 * without page refresh.
                 */

                setBrands((previous) =>
                    previous.map((brand) =>
                        Number(
                            brand.BrandID
                        ) ===
                        Number(
                            editingBrand.BrandID
                        )
                            ? result.data
                            : brand
                    )
                );

                toast.success(
                    result.message ||
                    "Brand updated successfully."
                );

            }

            /* =============================================
               CREATE
            ============================================= */

            else {

                const response = await fetch(
                    `${API_URL}/brands`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify(
                            payload
                        )
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
                        "Failed to create brand."
                    );
                }

                /*
                 * Add newly created brand
                 * directly to UI.
                 */

                setBrands((previous) => [
                    result.data,
                    ...previous
                ]);

                toast.success(
                    result.message ||
                    "Brand created successfully."
                );
            }

            setShowForm(false);
            setEditingBrand(null);

        } catch (error) {

            console.error(
                "Save Brand Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to save brand."
            );

        } finally {

            setSaving(false);
        }
    };


    /* =====================================================
       VIEW BRAND
    ===================================================== */

    const openView = (brand) => {

        setViewBrand(brand);
        setShowView(true);
    };


    /* =====================================================
       ACTIVE / INACTIVE
    ===================================================== */

    const toggleBrandStatus = async (brand) => {

        try {

            const newStatus =
                !brand.IsActive;

            const response = await fetch(
                `${API_URL}/brands/${brand.BrandID}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        shopID: brand.ShopID,
                        brandName:
                            brand.BrandName,
                        slug:
                            brand.Slug,
                        logoURL:
                            brand.LogoURL,
                        description:
                            brand.Description,
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
                    "Failed to update brand status."
                );
            }

            setBrands((previous) =>
                previous.map((item) =>
                    Number(item.BrandID) ===
                    Number(brand.BrandID)
                        ? result.data
                        : item
                )
            );

            toast.success(
                newStatus
                    ? "Brand activated successfully."
                    : "Brand deactivated successfully."
            );

        } catch (error) {

            console.error(
                "Toggle Brand Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to update brand status."
            );
        }
    };


    /* =====================================================
       OPEN DELETE CONFIRMATION
    ===================================================== */

    const openDeleteConfirmation = (brand) => {

        setDeleteBrand(brand);
    };


    /* =====================================================
       DELETE BRAND
    ===================================================== */

    const handleDeleteBrand = async () => {

        if (!deleteBrand) {
            return;
        }

        try {

            setDeletingId(
                deleteBrand.BrandID
            );

            const response = await fetch(
                `${API_URL}/brands/${deleteBrand.BrandID}`,
                {
                    method: "DELETE"
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
                    "Failed to delete brand."
                );
            }

            /*
             * Remove immediately from UI.
             */

            setBrands((previous) =>
                previous.filter(
                    (item) =>
                        Number(
                            item.BrandID
                        ) !==
                        Number(
                            deleteBrand.BrandID
                        )
                )
            );

            toast.success(
                result.message ||
                "Brand deleted successfully."
            );

            setDeleteBrand(null);

        } catch (error) {

            console.error(
                "Delete Brand Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to delete brand."
            );

        } finally {

            setDeletingId(null);
        }
    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="brands-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="brands-header">

                <div>
                    <h1>Brands</h1>

                    <p>
                        Manage product brands for
                        your shops.
                    </p>
                </div>

                <button
                    type="button"
                    className="add-brand-btn"
                    onClick={openAddForm}
                >
                    <Plus size={18} />
                    Add Brand
                </button>

            </div>


            {/* =================================================
                FILTER BAR
            ================================================= */}

            <div className="brands-toolbar">

                <div className="shop-selector">

                    <label>
                        Shop
                    </label>

                    <select
                        value={selectedShop}
                        onChange={(e) =>
                            setSelectedShop(
                                e.target.value
                            )
                        }
                        disabled={shopsLoading}
                    >
                        <option value="">
                            All Shops
                        </option>

                        {shops.map((shop) => (
                            <option
                                key={shop.ShopID}
                                value={shop.ShopID}
                            >
                                {shop.ShopName}
                            </option>
                        ))}

                    </select>

                </div>


                <div className="brand-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search brands..."
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

            </div>


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="brands-card">

                <div className="brands-table-wrapper">

                    <table className="brands-table">

                        <thead>

                            <tr>

                                <th>
                                    #
                                </th>

                                <th>
                                    Brand
                                </th>

                                <th>
                                    Slug
                                </th>

                                <th>
                                    Shop
                                </th>

                                <th>
                                    Status
                                </th>

                                <th>
                                    Created
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>

                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="7"
                                        className="table-message"
                                    >
                                        Loading brands...
                                    </td>

                                </tr>

                            ) : filteredBrands.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="7"
                                        className="table-message"
                                    >
                                        No brands found.
                                    </td>

                                </tr>

                            ) : (

                                filteredBrands.map(
                                    (brand, index) => {

                                        const shop =
                                            shops.find(
                                                (item) =>
                                                    Number(
                                                        item.ShopID
                                                    ) ===
                                                    Number(
                                                        brand.ShopID
                                                    )
                                            );

                                        return (

                                            <tr
                                                key={
                                                    brand.BrandID
                                                }
                                            >

                                                <td>
                                                    {index + 1}
                                                </td>


                                                <td>

                                                    <div className="brand-name-cell">

                                                        {brand.LogoURL ? (

                                                            <img
                                                                src={
                                                                    brand.LogoURL
                                                                }
                                                                alt={
                                                                    brand.BrandName
                                                                }
                                                                className="brand-logo"
                                                            />

                                                        ) : (

                                                            <div className="brand-logo-placeholder">
                                                                {String(
                                                                    brand.BrandName ||
                                                                    "B"
                                                                )
                                                                    .charAt(0)
                                                                    .toUpperCase()}
                                                            </div>

                                                        )}

                                                        <div>

                                                            <strong>
                                                                {
                                                                    brand.BrandName
                                                                }
                                                            </strong>

                                                            {brand.Description && (
                                                                <small>
                                                                    {
                                                                        brand.Description
                                                                    }
                                                                </small>
                                                            )}

                                                        </div>

                                                    </div>

                                                </td>


                                                <td>

                                                    <span className="slug-text">
                                                        /
                                                        {
                                                            brand.Slug
                                                        }
                                                    </span>

                                                </td>


                                                <td>

                                                    {shop
                                                        ? shop.ShopName
                                                        : `Shop #${brand.ShopID}`}

                                                </td>


                                                <td>

                                                    <button
                                                        type="button"
                                                        className={
                                                            brand.IsActive
                                                                ? "status-badge active"
                                                                : "status-badge inactive"
                                                        }
                                                        onClick={() =>
                                                            toggleBrandStatus(
                                                                brand
                                                            )
                                                        }
                                                    >

                                                        <span />

                                                        {brand.IsActive
                                                            ? "Active"
                                                            : "Inactive"}

                                                    </button>

                                                </td>


                                                <td>

                                                    {brand.CreatedAt
                                                        ? new Date(
                                                            brand.CreatedAt
                                                        ).toLocaleDateString(
                                                            "en-IN"
                                                        )
                                                        : "-"}

                                                </td>


                                                <td>

                                                    <div className="brand-actions">

                                                        <button
                                                            type="button"
                                                            className="icon-btn view"
                                                            title="View"
                                                            onClick={() =>
                                                                openView(
                                                                    brand
                                                                )
                                                            }
                                                        >
                                                            <Eye
                                                                size={17}
                                                            />
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="icon-btn edit"
                                                            title="Edit"
                                                            onClick={() =>
                                                                openEditForm(
                                                                    brand
                                                                )
                                                            }
                                                        >
                                                            <Edit
                                                                size={17}
                                                            />
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="icon-btn status"
                                                            title={
                                                                brand.IsActive
                                                                    ? "Deactivate"
                                                                    : "Activate"
                                                            }
                                                            onClick={() =>
                                                                toggleBrandStatus(
                                                                    brand
                                                                )
                                                            }
                                                        >
                                                            <Power
                                                                size={17}
                                                            />
                                                        </button>


                                                        <button
                                                            type="button"
                                                            className="icon-btn delete"
                                                            title="Delete"
                                                            onClick={() =>
                                                                openDeleteConfirmation(
                                                                    brand
                                                                )
                                                            }
                                                            disabled={
                                                                deletingId ===
                                                                brand.BrandID
                                                            }
                                                        >
                                                            <Trash2
                                                                size={17}
                                                            />
                                                        </button>

                                                    </div>

                                                </td>

                                            </tr>

                                        );
                                    }
                                )

                            )}

                        </tbody>

                    </table>

                </div>

            </div>


            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showForm && (

                <div className="brand-modal-overlay">

                    <div className="brand-modal">

                        <div className="brand-modal-header">

                            <div>

                                <h2>
                                    {editingBrand
                                        ? "Edit Brand"
                                        : "Add Brand"}
                                </h2>

                                <p>
                                    {editingBrand
                                        ? "Update brand information."
                                        : "Create a new product brand."}
                                </p>

                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeForm}
                                disabled={saving}
                            >
                                <X size={20} />
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                            className="brand-form"
                        >

                            <div className="form-group">

                                <label>
                                    Shop *
                                </label>

                                <select
                                    name="shopID"
                                    value={
                                        formData.shopID
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    required
                                >

                                    <option value="">
                                        Select Shop
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

                            </div>


                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        Brand Name *
                                    </label>

                                    <input
                                        type="text"
                                        name="brandName"
                                        value={
                                            formData.brandName
                                        }
                                        onChange={
                                            handleBrandNameChange
                                        }
                                        placeholder="e.g. Hikvision"
                                        required
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Slug *
                                    </label>

                                    <input
                                        type="text"
                                        name="slug"
                                        value={
                                            formData.slug
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="hikvision"
                                        required
                                    />

                                </div>

                            </div>


                            <div className="form-group">

                                <ImageGalleryField label="Brand logo" multiple={false} value={formData.logoURL ? [formData.logoURL] : []} onChange={(images) => setFormData((prev) => ({ ...prev, logoURL: images[0] || "" }))} shopID={formData.shopID} />

                            </div>


                            <div className="form-group">

                                <label>
                                    Description
                                </label>

                                <textarea
                                    name="description"
                                    value={
                                        formData.description
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    rows="4"
                                    placeholder="Brand description..."
                                />

                            </div>


                            <label className="checkbox-row">

                                <input
                                    type="checkbox"
                                    name="isActive"
                                    checked={
                                        formData.isActive
                                    }
                                    onChange={
                                        handleChange
                                    }
                                />

                                <span>
                                    Active Brand
                                </span>

                            </label>


                            <div className="form-actions">

                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={
                                        closeForm
                                    }
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="save-btn"
                                    disabled={saving}
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingBrand
                                            ? "Update Brand"
                                            : "Create Brand"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* =================================================
                VIEW MODAL
            ================================================= */}

            {showView &&
                viewBrand && (

                    <div className="brand-modal-overlay">

                        <div className="brand-modal view-modal">

                            <div className="brand-modal-header">

                                <div>

                                    <h2>
                                        Brand Details
                                    </h2>

                                    <p>
                                        Complete brand information.
                                    </p>

                                </div>

                                <button
                                    type="button"
                                    className="modal-close"
                                    onClick={() =>
                                        setShowView(
                                            false
                                        )
                                    }
                                >
                                    <X size={20} />
                                </button>

                            </div>


                            <div className="brand-details">

                                <div className="details-logo">

                                    {viewBrand.LogoURL ? (

                                        <img
                                            src={
                                                viewBrand.LogoURL
                                            }
                                            alt={
                                                viewBrand.BrandName
                                            }
                                        />

                                    ) : (

                                        <div className="details-logo-placeholder">

                                            {String(
                                                viewBrand.BrandName ||
                                                "B"
                                            )
                                                .charAt(0)
                                                .toUpperCase()}

                                        </div>

                                    )}

                                </div>


                                <h3>
                                    {
                                        viewBrand.BrandName
                                    }
                                </h3>


                                <span
                                    className={
                                        viewBrand.IsActive
                                            ? "status-badge active"
                                            : "status-badge inactive"
                                    }
                                >
                                    <span />

                                    {viewBrand.IsActive
                                        ? "Active"
                                        : "Inactive"}
                                </span>


                                <div className="details-grid">

                                    <div>

                                        <label>
                                            Brand ID
                                        </label>

                                        <strong>
                                            {
                                                viewBrand.BrandID
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <label>
                                            Shop ID
                                        </label>

                                        <strong>
                                            {
                                                viewBrand.ShopID
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <label>
                                            Slug
                                        </label>

                                        <strong>
                                            /
                                            {
                                                viewBrand.Slug
                                            }
                                        </strong>

                                    </div>


                                    <div>

                                        <label>
                                            Created
                                        </label>

                                        <strong>
                                            {viewBrand.CreatedAt
                                                ? new Date(
                                                    viewBrand.CreatedAt
                                                ).toLocaleString(
                                                    "en-IN"
                                                )
                                                : "-"}
                                        </strong>

                                    </div>

                                </div>


                                <div className="details-description">

                                    <label>
                                        Description
                                    </label>

                                    <p>
                                        {
                                            viewBrand.Description ||
                                            "No description available."
                                        }
                                    </p>

                                </div>

                            </div>


                            <div className="form-actions">

                                <button
                                    type="button"
                                    className="cancel-btn"
                                    onClick={() =>
                                        setShowView(
                                            false
                                        )
                                    }
                                >
                                    Close
                                </button>

                                <button
                                    type="button"
                                    className="save-btn"
                                    onClick={() => {

                                        setShowView(
                                            false
                                        );

                                        openEditForm(
                                            viewBrand
                                        );

                                    }}
                                >
                                    Edit Brand
                                </button>

                            </div>

                        </div>

                    </div>

                )}


            {/* =================================================
                DELETE CONFIRMATION MODAL
            ================================================= */}

            {deleteBrand && (

                <div className="delete-modal-overlay">

                    <div className="delete-modal">

                        <div className="delete-modal-icon">
                            !
                        </div>


                        <div className="delete-modal-content">

                            <h3>
                                Delete this brand?
                            </h3>

                            <p>
                                You're about to permanently
                                delete{" "}

                                <strong>
                                    "{deleteBrand.BrandName}"
                                </strong>
                                .
                            </p>

                            <span>
                                This action cannot be undone.
                            </span>

                        </div>


                        <div className="delete-modal-actions">

                            <button
                                type="button"
                                className="delete-cancel-btn"
                                onClick={() =>
                                    setDeleteBrand(
                                        null
                                    )
                                }
                                disabled={
                                    deletingId ===
                                    deleteBrand.BrandID
                                }
                            >
                                Cancel
                            </button>


                            <button
                                type="button"
                                className="delete-confirm-btn"
                                onClick={
                                    handleDeleteBrand
                                }
                                disabled={
                                    deletingId ===
                                    deleteBrand.BrandID
                                }
                            >

                                {deletingId ===
                                deleteBrand.BrandID
                                    ? "Deleting..."
                                    : "Yes, Delete Brand"}

                            </button>

                        </div>

                    </div>

                </div>

            )}

        </div>
    );
};

export default Brands;
