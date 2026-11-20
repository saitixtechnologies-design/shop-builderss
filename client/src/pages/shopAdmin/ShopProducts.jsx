import { useEffect, useMemo, useState } from "react";

import {
    Search,
    Plus,
    Package,
    RefreshCw,
    Edit3,
    Trash2,
    X,
    CheckCircle2,
    AlertCircle,
    Boxes,
    Save,
    Eye
} from "lucide-react";

import { toast } from "react-toastify";
import { apiUrl, getShopAdminToken } from "../../lib/api.js";

import "../../styles/shop-admin/shop-products.css";
import ImageGalleryField from "../../components/ImageGalleryField.jsx";

const API_URL = "http://localhost:5001";

const emptyForm = {
    ProductName: "",
    Slug: "",
    SKU: "",
    ModelNo: "",
    Sizes: "",
    Tags: "",
    CategoryID: "",
    BrandID: "",
    ShortDescription: "",
    Description: "",
    MRP: "",
    SellingPrice: "",
    CostPrice: "",
    StockQuantity: "",
    LowStockThreshold: 5,
    IsAvailable: true,
    IsActive: true,
    Images: []
};

/* =========================================================
   HELPERS
   ========================================================= */

const isTrue = (value) => {
    return (
        value === true ||
        value === 1 ||
        value === "1" ||
        value === "true"
    );
};

const slugify = (value) => {
    return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
};

const parseProductImages = (value) => {
    if (!value) return [];
    try {
        const parsed = typeof value === "string" ? JSON.parse(value) : value;
        return (Array.isArray(parsed) ? parsed : []).map((image) => typeof image === "string" ? image : image.ImageURL || image.imageURL || image.url).filter(Boolean);
    } catch { return []; }
};

const parseProductSizes = (value) => {
    try {
        const parsed = Array.isArray(value) ? value : JSON.parse(value || "[]");
        return Array.isArray(parsed) ? parsed.map((size) => String(size).trim()).filter(Boolean).join(", ") : "";
    } catch { return ""; }
};

const getProductImages = (product) => {
    const gallery = parseProductImages(product?.Images);
    return gallery.length ? gallery : (product?.ImageURL ? [product.ImageURL] : []);
};

/* =========================================================
   COMPONENT
   ========================================================= */

function ShopProducts() {
    const currentUser = (() => {
        try { return JSON.parse(localStorage.getItem("shopAdminUser") || localStorage.getItem("shopBuilderUser") || "null"); }
        catch { return null; }
    })();
    const shopID = currentUser?.shopID ?? currentUser?.ShopID ?? currentUser?.shop?.shopID ?? currentUser?.shop?.ShopID ?? "";
    const [products, setProducts] = useState([]);

    const [categories, setCategories] = useState([]);
    const [brands, setBrands] = useState([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");
    const [filter, setFilter] = useState("all");

    const [showModal, setShowModal] = useState(false);
    const [viewingProduct, setViewingProduct] = useState(null);

    const [editingProduct, setEditingProduct] =
        useState(null);

    const [form, setForm] =
        useState(emptyForm);

    /* =====================================================
       TOKEN
       ===================================================== */

   const getToken = () => {
    return getShopAdminToken();
};

    /* =====================================================
       AUTH HEADERS
       ===================================================== */

  const getHeaders = () => {
    const token = getToken();

    return {
        "Content-Type": "application/json",
        ...(token
            ? {
                  Authorization: `Bearer ${token}`
              }
            : {})
    };
};

    /* =====================================================
       LOAD PRODUCTS
       ===================================================== */

    const loadProducts = async () => {
        try {
            setLoading(true);

            const token = getToken();

            if (!token) {
                throw new Error(
                    "Shop session not found. Please login again."
                );
            }

            const response = await fetch(
                `${API_URL}/api/shop-products`,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to load products."
                );
            }

            setProducts(
                Array.isArray(data.data)
                    ? data.data
                    : []
            );

        } catch (error) {
            console.error(
                "Shop Products Error:",
                error
            );

            toast.error(
                error.message ||
                    "Unable to load products."
            );

        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       LOAD CATEGORY + BRAND OPTIONS
       ===================================================== */

    const loadOptions = async () => {
        try {
            const token = getToken();

            if (!token) return;

            const response = await fetch(
                `${API_URL}/api/shop-products/options`,
                {
                    method: "GET",
                    headers: getHeaders()
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to load categories and brands."
                );
            }

            setCategories(
                Array.isArray(
                    data?.data?.categories
                )
                    ? data.data.categories
                    : []
            );

            setBrands(
                Array.isArray(
                    data?.data?.brands
                )
                    ? data.data.brands
                    : []
            );

        } catch (error) {
            console.error(
                "Shop Product Options Error:",
                error
            );

            toast.error(
                error.message ||
                    "Unable to load product options."
            );
        }
    };

    /* =====================================================
       INITIAL LOAD
       ===================================================== */

    useEffect(() => {
        loadProducts();
        loadOptions();
    }, []);

    /* =====================================================
       FORM CHANGE
       ===================================================== */

    const handleChange = (event) => {
        const {
            name,
            value,
            type,
            checked
        } = event.target;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));
    };

    /* =====================================================
       PRODUCT NAME → SLUG
       ===================================================== */

    const handleProductNameChange = (
        event
    ) => {
        const value =
            event.target.value;

        setForm((prev) => ({
            ...prev,
            ProductName: value,
            Slug: editingProduct
                ? prev.Slug
                : slugify(value)
        }));
    };

    /* =====================================================
       OPEN ADD
       ===================================================== */

    const openAddModal = () => {
        setEditingProduct(null);

        setForm({
            ...emptyForm
        });

        setShowModal(true);
    };

    /* =====================================================
       OPEN EDIT
       ===================================================== */

    const openEditModal = (product) => {
        setEditingProduct(product);

        setForm({
            ProductName:
                product.ProductName || "",

            Slug:
                product.Slug || "",

            SKU:
                product.SKU || "",

            ModelNo:
                product.ModelNo || "",

            Sizes:
                parseProductSizes(product.SizeOptions ?? product.SizesJson),

            Tags:
                product.Tags || "",

            CategoryID:
                product.CategoryID ?? "",

            BrandID:
                product.BrandID ?? "",

            ShortDescription:
                product.ShortDescription ||
                "",

            Description:
                product.Description ||
                "",

            MRP:
                product.MRP ?? "",

            SellingPrice:
                product.SellingPrice ?? "",

            CostPrice:
                product.CostPrice ?? "",

            StockQuantity:
                product.StockQuantity ?? "",

            LowStockThreshold:
                product.LowStockThreshold ??
                5,

            IsAvailable:
                isTrue(
                    product.IsAvailable
                ),

            IsActive:
                isTrue(
                    product.IsActive
                ),
            Images: getProductImages(product)
        });

        setShowModal(true);
    };

    /* =====================================================
       CLOSE MODAL
       ===================================================== */

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);

        setEditingProduct(null);

        setForm({
            ...emptyForm
        });
    };

    /* =====================================================
       SAVE PRODUCT
       ===================================================== */

    const handleSubmit = async (event) => {
        event.preventDefault();

        /* ---------------- VALIDATION ---------------- */

        if (!form.ProductName.trim()) {
            toast.error(
                "Product name is required."
            );
            return;
        }

        if (!form.Slug.trim()) {
            toast.error(
                "Product slug is required."
            );
            return;
        }

        if (!form.SKU.trim()) {
            toast.error(
                "SKU is required."
            );
            return;
        }

        if (!form.CategoryID) {
            toast.error(
                "Please select a category."
            );
            return;
        }

        if (
            form.SellingPrice === "" ||
            Number(form.SellingPrice) < 0
        ) {
            toast.error(
                "Enter a valid selling price."
            );
            return;
        }

        if (
            form.StockQuantity === "" ||
            Number(form.StockQuantity) < 0
        ) {
            toast.error(
                "Enter a valid stock quantity."
            );
            return;
        }

        if (
            form.LowStockThreshold === "" ||
            Number(form.LowStockThreshold) < 0
        ) {
            toast.error(
                "Enter a valid low stock threshold."
            );
            return;
        }

        try {
            setSaving(true);

            const payload = {
                ProductName:
                    form.ProductName.trim(),

                Slug:
                    form.Slug.trim(),

                SKU:
                    form.SKU.trim(),

                ModelNo:
                    form.ModelNo.trim() ||
                    null,

                sizeOptions: form.Sizes.split(",").map((size) => size.trim()).filter(Boolean).slice(0, 20),

                Tags:
                    form.Tags.trim() ||
                    null,

                CategoryID:
                    Number(form.CategoryID),

                BrandID:
                    form.BrandID
                        ? Number(form.BrandID)
                        : null,

                ShortDescription:
                    form.ShortDescription
                        .trim() || null,

                Description:
                    form.Description
                        .trim() || null,

                MRP:
                    form.MRP === ""
                        ? null
                        : Number(form.MRP),

                SellingPrice:
                    Number(
                        form.SellingPrice
                    ),

                CostPrice:
                    form.CostPrice === ""
                        ? null
                        : Number(
                              form.CostPrice
                          ),

                StockQuantity:
                    Number(
                        form.StockQuantity
                    ),

                LowStockThreshold:
                    Number(
                        form.LowStockThreshold
                    ),

                IsAvailable:
                    Boolean(
                        form.IsAvailable
                    ),

                IsActive:
                    Boolean(
                        form.IsActive
                    ),
                productImages: form.Images
            };

            const url = editingProduct
                ? `${API_URL}/api/shop-products/${editingProduct.ProductID}`
                : `${API_URL}/api/shop-products`;

            const method = editingProduct
                ? "PUT"
                : "POST";

            const response = await fetch(
                url,
                {
                    method,
                    headers:
                        getHeaders(),
                    body:
                        JSON.stringify(
                            payload
                        )
                }
            );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to save product."
                );
            }

            toast.success(
                editingProduct
                    ? "Product updated successfully."
                    : "Product added successfully."
            );

            closeModal();

            await loadProducts();

        } catch (error) {
            console.error(
                "Save Product Error:",
                error
            );

            toast.error(
                error.message ||
                    "Unable to save product."
            );

        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       DELETE
       ===================================================== */

    const handleDelete = async (
        product
    ) => {
        const confirmed =
            window.confirm(
                `Delete "${product.ProductName}"?`
            );

        if (!confirmed) return;

        try {
            const response =
                await fetch(
                    `${API_URL}/api/shop-products/${product.ProductID}`,
                    {
                        method: "DELETE",
                        headers:
                            getHeaders()
                    }
                );

            const data =
                await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message ||
                        "Failed to delete product."
                );
            }

            toast.success(
                "Product deleted successfully."
            );

            await loadProducts();

        } catch (error) {
            console.error(
                "Delete Product Error:",
                error
            );

            toast.error(
                error.message ||
                    "Unable to delete product."
            );
        }
    };

    /* =====================================================
       FILTER
       ===================================================== */

    const filteredProducts =
        useMemo(() => {
            const keyword =
                search
                    .trim()
                    .toLowerCase();

            return products.filter(
                (product) => {
                    const name =
                        String(
                            product.ProductName ||
                                ""
                        ).toLowerCase();

                    const sku =
                        String(
                            product.SKU || ""
                        ).toLowerCase();

                    const model =
                        String(
                            product.ModelNo ||
                                ""
                        ).toLowerCase();

                    const stock =
                        Number(
                            product.StockQuantity ||
                                0
                        );

                    const active =
                        isTrue(
                            product.IsActive
                        );

                    const available =
                        isTrue(
                            product.IsAvailable
                        );

                    const matchesSearch =
                        !keyword ||
                        name.includes(
                            keyword
                        ) ||
                        sku.includes(
                            keyword
                        ) ||
                        model.includes(
                            keyword
                        );

                    let matchesFilter =
                        true;

                    if (
                        filter ===
                        "active"
                    ) {
                        matchesFilter =
                            active;
                    }

                    if (
                        filter === "inactive"
                    ) {
                        matchesFilter =
                            !active;
                    }

                    if (
                        filter === "low"
                    ) {
                        const threshold =
                            Number(
                                product.LowStockThreshold ??
                                    5
                            );

                        matchesFilter =
                            stock > 0 &&
                            stock <=
                                threshold;
                    }

                    if (
                        filter === "out"
                    ) {
                        matchesFilter =
                            stock === 0;
                    }

                    if (
                        filter ===
                        "unavailable"
                    ) {
                        matchesFilter =
                            !available;
                    }

                    return (
                        matchesSearch &&
                        matchesFilter
                    );
                }
            );
        }, [
            products,
            search,
            filter
        ]);

    /* =====================================================
       STATS
       ===================================================== */

    const totalProducts =
        products.length;

    const activeProducts =
        products.filter(
            (product) =>
                isTrue(
                    product.IsActive
                )
        ).length;

    const lowStockProducts =
        products.filter(
            (product) => {
                const stock =
                    Number(
                        product.StockQuantity ||
                            0
                    );

                const threshold =
                    Number(
                        product.LowStockThreshold ??
                            5
                    );

                return (
                    stock > 0 &&
                    stock <= threshold
                );
            }
        ).length;

    const outOfStockProducts =
        products.filter(
            (product) =>
                Number(
                    product.StockQuantity ||
                        0
                ) === 0
        ).length;

    /* =====================================================
       CATEGORY NAME
       ===================================================== */

    const getCategoryName = (
        categoryID,
        fallback
    ) => {
        const category =
            categories.find(
                (item) =>
                    String(
                        item.CategoryID
                    ) ===
                    String(categoryID)
            );

        return (
            category?.CategoryName ||
            fallback ||
            "No Category"
        );
    };

    /* =====================================================
       BRAND NAME
       ===================================================== */

    const getBrandName = (
        brandID,
        fallback
    ) => {
        if (!brandID) {
            return "No Brand";
        }

        const brand =
            brands.find(
                (item) =>
                    String(
                        item.BrandID
                    ) ===
                    String(brandID)
            );

        return (
            brand?.BrandName ||
            fallback ||
            "No Brand"
        );
    };

    /* =====================================================
       RENDER
       ===================================================== */

    return (
        <div className="shop-products-page">

            {/* HEADER */}

            <div className="shop-products-header">

                <div className="shop-products-title">

                    <div className="page-title-icon">
                        <Package size={25} />
                    </div>

                    <div>
                        <h1>
                            Products
                        </h1>

                        <p>
                            Manage products,
                            pricing, stock
                            and details
                        </p>
                    </div>

                </div>

                <div className="products-header-actions">

                    <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => {
                            loadProducts();
                            loadOptions();
                        }}
                    >
                        <RefreshCw
                            size={17}
                        />
                        Refresh
                    </button>

                    <button
                        type="button"
                        className="btn-primary"
                        onClick={
                            openAddModal
                        }
                    >
                        <Plus
                            size={18}
                        />
                        Add Product
                    </button>

                </div>

            </div>

            {/* STATS */}

            <div className="shop-product-stats">

                <div className="shop-product-stat-card">
                    <div className="stat-icon">
                        <Boxes size={21} />
                    </div>

                    <div>
                        <span>
                            Total Products
                        </span>

                        <strong>
                            {totalProducts}
                        </strong>
                    </div>
                </div>

                <div className="shop-product-stat-card">
                    <div className="stat-icon success">
                        <CheckCircle2
                            size={21}
                        />
                    </div>

                    <div>
                        <span>
                            Active Products
                        </span>

                        <strong>
                            {activeProducts}
                        </strong>
                    </div>
                </div>

                <div className="shop-product-stat-card">
                    <div className="stat-icon warning">
                        <AlertCircle
                            size={21}
                        />
                    </div>

                    <div>
                        <span>
                            Low Stock
                        </span>

                        <strong>
                            {lowStockProducts}
                        </strong>
                    </div>
                </div>

                <div className="shop-product-stat-card">
                    <div className="stat-icon danger">
                        <AlertCircle
                            size={21}
                        />
                    </div>

                    <div>
                        <span>
                            Out of Stock
                        </span>

                        <strong>
                            {outOfStockProducts}
                        </strong>
                    </div>
                </div>

            </div>

            {/* FILTER */}

            <div className="products-toolbar">

                <div className="product-search">

                    <Search
                        size={19}
                    />

                    <input
                        type="text"
                        placeholder="Search product, SKU or model..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />

                </div>

                <select
                    value={filter}
                    onChange={(e) =>
                        setFilter(
                            e.target.value
                        )
                    }
                >
                    <option value="all">
                        All Products
                    </option>

                    <option value="active">
                        Active
                    </option>

                    <option value="inactive">
                        Inactive
                    </option>

                    <option value="low">
                        Low Stock
                    </option>

                    <option value="out">
                        Out of Stock
                    </option>

                    <option value="unavailable">
                        Unavailable
                    </option>
                </select>

            </div>

            {/* TABLE */}

            <div className="products-table-card">

                {loading ? (
                    <div className="products-loading">
                        <div className="products-spinner" />
                    </div>
                ) : filteredProducts.length === 0 ? (
                    <div className="products-empty-state">

                        <div className="products-empty-icon">
                            <Package
                                size={27}
                            />
                        </div>

                        <h3>
                            No products found
                        </h3>

                        <p>
                            Start adding
                            products to
                            your shop.
                        </p>

                        <button
                            type="button"
                            className="btn-primary"
                            onClick={
                                openAddModal
                            }
                        >
                            <Plus size={17} />
                            Add Product
                        </button>

                    </div>
                ) : (
                    <div className="products-table-wrapper">

                        <table className="products-table">

                            <thead>
                                <tr>
                                    <th>
                                        Product
                                    </th>

                                    <th>
                                        Category
                                    </th>

                                    <th>
                                        Brand
                                    </th>

                                    <th>
                                        Price
                                    </th>

                                    <th>
                                        Stock
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th>
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>

                                {filteredProducts.map(
                                    (product) => {

                                        const stock =
                                            Number(
                                                product.StockQuantity ||
                                                    0
                                            );

                                        const threshold =
                                            Number(
                                                product.LowStockThreshold ??
                                                    5
                                            );

                                        let stockClass =
                                            "in-stock";

                                        if (
                                            stock ===
                                            0
                                        ) {
                                            stockClass =
                                                "out-stock";
                                        } else if (
                                            stock <=
                                            threshold
                                        ) {
                                            stockClass =
                                                "low-stock";
                                        }

                                        const active =
                                            isTrue(
                                                product.IsActive
                                            );
                                        const primaryImage = getProductImages(product)[0];

                                        return (
                                            <tr
                                                key={
                                                    product.ProductID
                                                }
                                            >

                                                <td>
                                                    <div className="product-info-cell">

                                                        {primaryImage ? <img className="shop-product-table-image" src={/^https?:\/\//i.test(primaryImage) ? primaryImage : apiUrl(primaryImage)} alt="" /> : <div className="product-icon"><Package size={20} /></div>}

                                                        <div>
                                                            <strong>
                                                                {
                                                                    product.ProductName
                                                                }
                                                            </strong>

                                                            <small>
                                                                SKU:{" "}
                                                                {
                                                                    product.SKU
                                                                }
                                                            </small>

                                                            {product.ModelNo && (
                                                                <small>
                                                                    Model:{" "}
                                                                    {
                                                                        product.ModelNo
                                                                    }
                                                                </small>
                                                            )}
                                                        </div>

                                                    </div>
                                                </td>

                                                <td>
                                                    <span className="product-category-badge">
                                                        {getCategoryName(
                                                            product.CategoryID,
                                                            product.CategoryName
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    {getBrandName(
                                                        product.BrandID,
                                                        product.BrandName
                                                    )}
                                                </td>

                                                <td>
                                                    <div className="product-price-cell">

                                                        <strong>
                                                            ₹
                                                            {Number(
                                                                product.SellingPrice ||
                                                                    0
                                                            ).toLocaleString(
                                                                "en-IN"
                                                            )}
                                                        </strong>

                                                        {product.MRP && (
                                                            <small>
                                                                ₹
                                                                {Number(
                                                                    product.MRP
                                                                ).toLocaleString(
                                                                    "en-IN"
                                                                )}
                                                            </small>
                                                        )}

                                                    </div>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`stock-badge ${stockClass}`}
                                                    >
                                                        {stock}
                                                    </span>
                                                </td>

                                                <td>

                                                    <span
                                                        className={
                                                            active
                                                                ? "status-badge active"
                                                                : "status-badge inactive"
                                                        }
                                                    >
                                                        {active
                                                            ? "Active"
                                                            : "Inactive"}
                                                    </span>

                                                </td>

                                                <td>

                                                    <div className="product-actions">

                                                        <button
                                                            type="button"
                                                            title="View details"
                                                            onClick={() => setViewingProduct(product)}
                                                        >
                                                            <Eye size={17} />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Edit"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    product
                                                                )
                                                            }
                                                        >
                                                            <Edit3
                                                                size={17}
                                                            />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            title="Delete"
                                                            className="danger-action"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    product
                                                                )
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
                                )}

                            </tbody>

                        </table>

                    </div>
                )}

            </div>

            {/* =================================================
                PRODUCT MODAL
            ================================================= */}

            {showModal && (
                <div
                    className="shop-product-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeModal();
                        }
                    }}
                >

                    <div className="shop-product-modal">

                        {/* MODAL HEADER */}

                        <div className="shop-product-modal-header">

                            <div>
                                <h2>
                                    {editingProduct
                                        ? "Edit Product"
                                        : "Add Product"}
                                </h2>

                                <p>
                                    {editingProduct
                                        ? "Update product details"
                                        : "Add a new product to your shop"}
                                </p>
                            </div>

                            <button
                                type="button"
                                className="modal-close-btn"
                                onClick={
                                    closeModal
                                }
                            >
                                <X size={21} />
                            </button>

                        </div>

                        {/* FORM */}

                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <div className="shop-product-form-body">

                                {/* BASIC */}

                                <div className="form-section">

                                    <h3>
                                        Basic Information
                                    </h3>

                                    <div className="form-grid-2">

                                        <div className="form-field full">
                                            <label>
                                                Product Name *
                                            </label>

                                            <input
                                                name="ProductName"
                                                value={
                                                    form.ProductName
                                                }
                                                onChange={
                                                    handleProductNameChange
                                                }
                                                placeholder="Enter product name"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Product Slug *
                                            </label>

                                            <input
                                                name="Slug"
                                                value={
                                                    form.Slug
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="product-slug"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                SKU *
                                            </label>

                                            <input
                                                name="SKU"
                                                value={
                                                    form.SKU
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="SKU-001"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Model No.
                                            </label>

                                            <input
                                                name="ModelNo"
                                                value={
                                                    form.ModelNo
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="Model number"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Tags
                                            </label>

                                            <input
                                                name="Tags"
                                                value={
                                                    form.Tags
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="cctv, camera, security"
                                            />
                                        </div>

                                    </div>

                                </div>

                                {/* CATEGORY + BRAND */}

                                <div className="form-section">

                                    <h3>
                                        Category & Brand
                                    </h3>

                                    <div className="form-grid-2">

                                        <div className="form-field">
                                            <label>
                                                Category *
                                            </label>

                                            <select
                                                name="CategoryID"
                                                value={
                                                    form.CategoryID
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                            >
                                                <option value="">
                                                    Select Category
                                                </option>

                                                {categories.map(
                                                    (
                                                        category
                                                    ) => (
                                                        <option
                                                            key={
                                                                category.CategoryID
                                                            }
                                                            value={
                                                                category.CategoryID
                                                            }
                                                        >
                                                            {
                                                                category.CategoryName
                                                            }
                                                        </option>
                                                    )
                                                )}

                                            </select>
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Brand
                                            </label>

                                            <select
                                                name="BrandID"
                                                value={
                                                    form.BrandID
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                            >
                                                <option value="">
                                                    No Brand
                                                </option>

                                                {brands.map(
                                                    (
                                                        brand
                                                    ) => (
                                                        <option
                                                            key={
                                                                brand.BrandID
                                                            }
                                                            value={
                                                                brand.BrandID
                                                            }
                                                        >
                                                            {
                                                                brand.BrandName
                                                            }
                                                        </option>
                                                    )
                                                )}

                                            </select>
                                        </div>

                                    </div>

                                </div>

                                <div className="form-section">
                                    <ImageGalleryField label="Product images" value={form.Images} onChange={(Images) => setForm((prev) => ({ ...prev, Images }))} token={getToken()} shopID={shopID} maxImages={10} />
                                </div>

                                <div className="form-section">
                                    <div className="form-field">
                                        <label>Available sizes <span>optional</span></label>
                                        <input name="Sizes" value={form.Sizes} onChange={handleChange} placeholder="XS, S, M, L, XL, XXL" />
                                        <small>Comma separated; shoppers choose a size before adding this product to their bag.</small>
                                    </div>
                                </div>

                                {/* DESCRIPTION */}

                                <div className="form-section">

                                    <h3>
                                        Product Description
                                    </h3>

                                    <div className="form-field">
                                        <label>
                                            Short Description
                                        </label>

                                        <textarea
                                            name="ShortDescription"
                                            rows="3"
                                            value={
                                                form.ShortDescription
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Short product description"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>
                                            Description
                                        </label>

                                        <textarea
                                            name="Description"
                                            rows="5"
                                            value={
                                                form.Description
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="Full product description"
                                        />
                                    </div>

                                </div>

                                {/* PRICING */}

                                <div className="form-section">

                                    <h3>
                                        Pricing & Stock
                                    </h3>

                                    <div className="form-grid-3">

                                        <div className="form-field">
                                            <label>
                                                MRP
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                name="MRP"
                                                value={
                                                    form.MRP
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Selling Price *
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                name="SellingPrice"
                                                value={
                                                    form.SellingPrice
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Cost Price
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                name="CostPrice"
                                                value={
                                                    form.CostPrice
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Stock Quantity *
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                name="StockQuantity"
                                                value={
                                                    form.StockQuantity
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="0"
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>
                                                Low Stock Threshold
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                name="LowStockThreshold"
                                                value={
                                                    form.LowStockThreshold
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                                placeholder="5"
                                            />
                                        </div>

                                    </div>

                                </div>

                                {/* STATUS */}

                                <div className="form-section">

                                    <h3>
                                        Product Status
                                    </h3>

                                    <div className="status-options">

                                        <label className="status-option">

                                            <input
                                                type="checkbox"
                                                name="IsAvailable"
                                                checked={
                                                    form.IsAvailable
                                                }
                                                onChange={
                                                    handleChange
                                                }
                                            />

                                            <span>
                                                <CheckCircle2
                                                    size={19}
                                                />

                                                <strong>
                                                    Available
                                                </strong>

                                                <small>
                                                    Product is available for purchase
                                                </small>
                                            </span>

                                        </label>

                                        <label className="status-option">

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
                                                <CheckCircle2
                                                    size={19}
                                                />

                                                <strong>
                                                    Active
                                                </strong>

                                                <small>
                                                    Show product in shop
                                                </small>
                                            </span>

                                        </label>

                                    </div>

                                </div>

                            </div>

                            {/* FOOTER */}

                            <div className="shop-product-modal-footer">

                                <button
                                    type="button"
                                    className="btn-secondary"
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
                                    className="btn-primary"
                                    disabled={
                                        saving
                                    }
                                >
                                    <Save
                                        size={17}
                                    />

                                    {saving
                                        ? "Saving..."
                                        : editingProduct
                                        ? "Update Product"
                                        : "Save Product"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>
            )}

            {viewingProduct && (
                <div className="shop-product-modal-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setViewingProduct(null); }}>
                    <section className="shop-product-modal shop-product-details-modal" role="dialog" aria-modal="true" aria-labelledby="shop-product-details-title">
                        <header className="shop-product-modal-header">
                            <div><h2 id="shop-product-details-title">Product Details</h2><p>{viewingProduct.ProductName}</p></div>
                            <button type="button" className="modal-close-btn" onClick={() => setViewingProduct(null)} aria-label="Close details"><X size={20} /></button>
                        </header>
                        <div className="shop-product-details-body">
                            {getProductImages(viewingProduct).length > 0 && <div className="shop-product-details-gallery">{getProductImages(viewingProduct).map((image, index) => <img key={`${image}-${index}`} src={/^https?:\/\//i.test(image) ? image : apiUrl(image)} alt={`${viewingProduct.ProductName} ${index + 1}`} />)}</div>}
                            <div className="shop-product-details-grid">
                                {[
                                    ["Slug", viewingProduct.Slug], ["SKU", viewingProduct.SKU], ["Model", viewingProduct.ModelNo],
                                    ["Category", viewingProduct.CategoryName], ["Brand", viewingProduct.BrandName], ["Tags", viewingProduct.Tags],
                                    ["MRP", viewingProduct.MRP == null ? "—" : `₹${Number(viewingProduct.MRP).toLocaleString("en-IN")}`],
                                    ["Selling price", `₹${Number(viewingProduct.SellingPrice || 0).toLocaleString("en-IN")}`],
                                    ["Cost price", viewingProduct.CostPrice == null ? "—" : `₹${Number(viewingProduct.CostPrice).toLocaleString("en-IN")}`],
                                    ["Stock", viewingProduct.StockQuantity], ["Low-stock threshold", viewingProduct.LowStockThreshold],
                                    ["Availability", isTrue(viewingProduct.IsAvailable) ? "Available" : "Unavailable"],
                                    ["Status", isTrue(viewingProduct.IsActive) ? "Active" : "Inactive"]
                                ].map(([label, value]) => <div className="shop-product-detail-item" key={label}><span>{label}</span><strong>{value ?? "—"}</strong></div>)}
                            </div>
                            {viewingProduct.ShortDescription && <div className="shop-product-detail-copy"><span>Short description</span><p>{viewingProduct.ShortDescription}</p></div>}
                            {viewingProduct.Description && <div className="shop-product-detail-copy"><span>Description</span><p>{viewingProduct.Description}</p></div>}
                        </div>
                    </section>
                </div>
            )}

        </div>
    );
}

export default ShopProducts;
