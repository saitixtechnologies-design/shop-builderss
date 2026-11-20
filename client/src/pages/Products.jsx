import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Power,
  X,
  Package,
  RefreshCw
} from "lucide-react";
import { toast } from "react-toastify";

import "../styles/Products.css";
import ImageGalleryField from "../components/ImageGalleryField.jsx";
import { adminFetch as fetch, API_ORIGIN } from "../lib/api.js";

const API_URL = `${API_ORIGIN}/api`;

const initialForm = {
  shopID: "",
  categoryID: "",
  brandID: "",
  productName: "",
  slug: "",
  SKU: "",
  modelNo: "",
  sizes: "",
  tags: "",
  mrp: "",
  sellingPrice: "",
  costPrice: "",
  stockQuantity: "",
  lowStockThreshold: "",
  shortDescription: "",
  description: "",
  isAvailable: true,
  isActive: true,
  productImages: []
};

const getProductId = (product) =>
  product?.ProductID ??
  product?.productID ??
  product?.id ??
  product?.productId;

const getShopId = (shop) =>
  shop?.ShopID ??
  shop?.shopID ??
  shop?.id ??
  shop?.shopId;

const getCategoryId = (category) =>
  category?.CategoryID ??
  category?.categoryID ??
  category?.id ??
  category?.categoryId;

const getBrandId = (brand) =>
  brand?.BrandID ??
  brand?.brandID ??
  brand?.id ??
  brand?.brandId;

const getProductName = (product) =>
  product?.ProductName ?? product?.productName ?? product?.name ?? "";

const getCategoryName = (category) =>
  category?.CategoryName ??
  category?.categoryName ??
  category?.name ??
  "";

const getBrandName = (brand) =>
  brand?.BrandName ??
  brand?.brandName ??
  brand?.name ??
  "";

const getBoolean = (value, fallback = false) => {
  if (value === undefined || value === null) return fallback;

  if (typeof value === "boolean") return value;

  if (value === 1 || value === "1" || value === "true") {
    return true;
  }

  return false;
};

const parseProductSizes = (value) => {
  try {
    const parsed = Array.isArray(value) ? value : JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.map((size) => String(size).trim()).filter(Boolean).join(", ") : "";
  } catch { return ""; }
};

const parseProductImages = (value) => {
  if (!value) return [];
  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;
    return (Array.isArray(parsed) ? parsed : []).map((image) => typeof image === "string" ? image : image.ImageURL || image.imageURL || image.url).filter(Boolean);
  } catch { return []; }
};

const slugify = (value) => {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
};

function Products() {
  const [products, setProducts] = useState([]);
  const [shops, setShops] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [shopFilter, setShopFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [brandFilter, setBrandFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showFormModal, setShowFormModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [deleteProduct, setDeleteProduct] = useState(null);

  const [form, setForm] = useState(initialForm);

  /* =====================================================
     API HELPER
     ===================================================== */

  const apiRequest = async (url, options = {}) => {
    const response = await fetch(`${API_URL}${url}`, {
      headers: {
        "Content-Type": "application/json",
        ...(localStorage.getItem("token") ? { Authorization: `Bearer ${localStorage.getItem("token")}` } : {}),
        ...(options.headers || {})
      },
      ...options
    });

    let data;

    try {
      data = await response.json();
    } catch {
      data = {
        success: false,
        message: "Invalid server response."
      };
    }

    if (!response.ok || data.success === false) {
      throw new Error(
        data.message ||
          data.error ||
          "Something went wrong."
      );
    }

    return data;
  };

  /* =====================================================
     FETCH ALL DATA
     ===================================================== */

  const fetchProducts = async () => {
    try {
      const data = await apiRequest("/products");

      setProducts(
        Array.isArray(data.data)
          ? data.data
          : []
      );
    } catch (error) {
      console.error("Fetch Products Error:", error);
      toast.error(error.message || "Failed to fetch products.");
    }
  };

  const fetchShops = async () => {
    try {
      const data = await apiRequest("/shops");

      setShops(
        Array.isArray(data.data)
          ? data.data
          : []
      );
    } catch (error) {
      console.error("Fetch Shops Error:", error);
      toast.error(error.message || "Failed to fetch shops.");
    }
  };

 const fetchCategories = async (shopID = "") => {
  try {
    const url = shopID
      ? `/categories?shopID=${encodeURIComponent(shopID)}`
      : "/categories";

    const data = await apiRequest(url);

    setCategories(
      Array.isArray(data.data)
        ? data.data
        : []
    );
  } catch (error) {
    console.error(
      "Fetch Categories Error:",
      error
    );

    setCategories([]);

    toast.error(
      error.message ||
        "Failed to fetch categories."
    );
  }
};

const fetchBrands = async (shopID = "") => {
  try {
    const url = shopID
      ? `/brands?shopID=${encodeURIComponent(shopID)}`
      : "/brands";

    const data = await apiRequest(url);

    setBrands(
      Array.isArray(data.data)
        ? data.data
        : []
    );
  } catch (error) {
    console.error(
      "Fetch Brands Error:",
      error
    );

    setBrands([]);

    toast.error(
      error.message ||
        "Failed to fetch brands."
    );
  }
};

 const loadData = async () => {
  setLoading(true);

  try {
    await Promise.all([
      fetchProducts(),
      fetchShops()
    ]);

    // Categories and brands will be loaded
    // according to selected shop.
    setCategories([]);
    setBrands([]);
  } finally {
    setLoading(false);
  }
};

  useEffect(() => {
    loadData();
  }, []);

  /* =====================================================
     FILTERED PRODUCTS
     ===================================================== */

  const filteredProducts = useMemo(() => {
    const searchText = search.trim().toLowerCase();

    return products.filter((product) => {
      const productShopId =
        product?.ShopID ?? product?.shopID;

      const productCategoryId =
        product?.CategoryID ?? product?.categoryID;

      const productBrandId =
        product?.BrandID ?? product?.brandID;

      const active = getBoolean(
        product?.IsActive ?? product?.isActive,
        true
      );

      const name = getProductName(product);

      const sku =
        product?.SKU ??
        product?.sku ??
        "";

      const model =
        product?.ModelNo ??
        product?.modelNo ??
        "";

      const matchesSearch =
        !searchText ||
        name.toLowerCase().includes(searchText) ||
        sku.toLowerCase().includes(searchText) ||
        model.toLowerCase().includes(searchText);

      const matchesShop =
        !shopFilter ||
        String(productShopId) === String(shopFilter);

      const matchesCategory =
        !categoryFilter ||
        String(productCategoryId) ===
          String(categoryFilter);

      const matchesBrand =
        !brandFilter ||
        String(productBrandId) ===
          String(brandFilter);

      const matchesStatus =
        !statusFilter ||
        (statusFilter === "active" && active) ||
        (statusFilter === "inactive" && !active);

      return (
        matchesSearch &&
        matchesShop &&
        matchesCategory &&
        matchesBrand &&
        matchesStatus
      );
    });
  }, [
    products,
    search,
    shopFilter,
    categoryFilter,
    brandFilter,
    statusFilter
  ]);

  /* =====================================================
     STATS
     ===================================================== */

  const totalProducts = products.length;

  const activeProducts = products.filter((product) =>
    getBoolean(
      product?.IsActive ?? product?.isActive,
      true
    )
  ).length;

  const inactiveProducts =
    totalProducts - activeProducts;

  const lowStockProducts = products.filter((product) => {
    const stock = Number(
      product?.StockQuantity ??
        product?.stockQuantity ??
        0
    );

    const threshold = Number(
      product?.LowStockThreshold ??
        product?.lowStockThreshold ??
        5
    );

    return stock <= threshold;
  }).length;

  /* =====================================================
     FORM
     ===================================================== */

  const handleInputChange = (event) => {
    const { name, value, type, checked } =
      event.target;

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox"
          ? checked
          : value
    }));
  };

  const handleProductShopChange = async (event) => {
    const shopID = event.target.value;

    // Shop change hote hi old category/brand hata do
    setForm((prev) => ({
        ...prev,
        shopID,
        categoryID: "",
        brandID: ""
    }));

    // Old shop ka data hata do
    setCategories([]);
    setBrands([]);

    if (!shopID) {
        return;
    }

    try {
        await Promise.all([
            fetchCategories(shopID),
            fetchBrands(shopID)
        ]);
    } catch (error) {
        console.error(
            "Shop Category/Brand Load Error:",
            error
        );
    }
};

const handleShopFilterChange = async (event) => {
    const shopID = event.target.value;

    // Shop filter change
    setShopFilter(shopID);

    // Old category & brand filter clear
    setCategoryFilter("");
    setBrandFilter("");

    // Old category/brand options clear
    setCategories([]);
    setBrands([]);

    // All Shops selected
    if (!shopID) {
        return;
    }

    try {
        await Promise.all([
            fetchCategories(shopID),
            fetchBrands(shopID)
        ]);
    } catch (error) {
        console.error(
            "Filter Category/Brand Load Error:",
            error
        );
    }
};

  const openAddModal = async () => {
  setEditingProduct(null);

  const selectedShopID = shopFilter || "";

  setForm({
    ...initialForm,
    shopID: selectedShopID,
    categoryID: "",
    brandID: ""
  });

  setCategories([]);
  setBrands([]);

  if (selectedShopID) {
    await Promise.all([
      fetchCategories(selectedShopID),
      fetchBrands(selectedShopID)
    ]);
  }

  setShowFormModal(true);
};

 const openEditModal = async (product) => {
  setEditingProduct(product);

  const selectedShopID =
    product?.ShopID ??
    product?.shopID ??
    "";

  setCategories([]);
  setBrands([]);

  if (selectedShopID) {
    await Promise.all([
      fetchCategories(selectedShopID),
      fetchBrands(selectedShopID)
    ]);
  }

  setForm({
      shopID:
        product?.ShopID ??
        product?.shopID ??
        "",

      categoryID:
        product?.CategoryID ??
        product?.categoryID ??
        "",

      brandID:
        product?.BrandID ??
        product?.brandID ??
        "",

      productName:
        product?.ProductName ??
        product?.productName ??
        "",

      slug:
        product?.Slug ??
        product?.slug ??
        "",

      sku:
        product?.SKU ??
        product?.sku ??
        "",

      modelNo:
        product?.ModelNo ??
        product?.modelNo ??
        "",

      sizes: parseProductSizes(product?.SizeOptions ?? product?.SizesJson),

      tags:
        product?.Tags ??
        product?.tags ??
        "",

      shortDescription:
        product?.ShortDescription ??
        product?.shortDescription ??
        "",

      description:
        product?.Description ??
        product?.description ??
        "",

      mrp:
        product?.MRP ??
        product?.mrp ??
        "",

      sellingPrice:
        product?.SellingPrice ??
        product?.sellingPrice ??
        "",

      costPrice:
        product?.CostPrice ??
        product?.costPrice ??
        "",

      stockQuantity:
        product?.StockQuantity ??
        product?.stockQuantity ??
        "",

      lowStockThreshold:
        product?.LowStockThreshold ??
        product?.lowStockThreshold ??
        5,

      isAvailable: getBoolean(
        product?.IsAvailable ??
          product?.isAvailable,
        true
      ),

      isActive: getBoolean(
        product?.IsActive ??
          product?.isActive,
        true
      ),
      productImages: parseProductImages(product?.Images)
    });

    setShowFormModal(true);
  };

  const closeFormModal = () => {
    if (saving) return;

    setShowFormModal(false);
    setEditingProduct(null);
    setForm(initialForm);
  };

  /* =====================================================
     CREATE / UPDATE
     ===================================================== */

 const handleSubmit = async (event) => {
  event.preventDefault();

  // ================================
  // FRONTEND VALIDATION
  // ================================

  if (!form.shopID) {
    toast.error("Please select a shop.");
    return;
  }

  if (!form.categoryID) {
    toast.error("Please select a category.");
    return;
  }

  if (!form.productName.trim()) {
    toast.error("Product name is required.");
    return;
  }

  if (!form.slug.trim()) {
    toast.error("Product slug is required.");
    return;
  }

  if (!form.sku.trim()) {
    toast.error("SKU is required.");
    return;
  }

  if (
    form.sellingPrice === "" ||
    Number(form.sellingPrice) < 0
  ) {
    toast.error("Selling price is required.");
    return;
  }

  setSaving(true);

  // =====================================================
  // IMPORTANT:
  // Backend expects SKU and MRP with CAPITAL letters
  // =====================================================
const selectedCategory = categories.find(
  (category) =>
    String(getCategoryId(category)) ===
    String(form.categoryID)
);

if (!selectedCategory) {
  toast.error(
    "Selected category does not belong to this shop."
  );
  setSaving(false);
  return;
}

if (form.brandID) {
  const selectedBrand = brands.find(
    (brand) =>
      String(getBrandId(brand)) ===
      String(form.brandID)
  );

  if (!selectedBrand) {
    toast.error(
      "Selected brand does not belong to this shop."
    );
    setSaving(false);
    return;
  }
}
  const payload = {
    shopID: Number(form.shopID),

    categoryID: Number(form.categoryID),

    brandID: form.brandID
      ? Number(form.brandID)
      : null,

    productName: form.productName.trim(),

    slug: form.slug.trim(),

    // IMPORTANT
    SKU: form.sku.trim(),

    modelNo:
      form.modelNo?.trim() || null,

    tags:
      form.tags?.trim() || null,

    shortDescription:
      form.shortDescription?.trim() || null,

    description:
      form.description?.trim() || null,

    // IMPORTANT
    MRP:
      form.mrp === ""
        ? null
        : Number(form.mrp),

    sellingPrice:
      form.sellingPrice === ""
        ? 0
        : Number(form.sellingPrice),

    costPrice:
      form.costPrice === ""
        ? 0
        : Number(form.costPrice),

    stockQuantity:
      form.stockQuantity === ""
        ? 0
        : Number(form.stockQuantity),

    lowStockThreshold:
      form.lowStockThreshold === ""
        ? 5
        : Number(form.lowStockThreshold),

    isAvailable:
      Boolean(form.isAvailable),

    isActive: Boolean(form.isActive),
    sizeOptions: form.sizes.split(",").map((size) => size.trim()).filter(Boolean).slice(0, 20),
    productImages: form.productImages
  };

  console.log("PRODUCT PAYLOAD:", payload);

  try {
    // =====================================================
    // UPDATE
    // =====================================================

    if (editingProduct) {
      const id = getProductId(editingProduct);

      if (!id) {
        toast.error("Product ID not found.");
        return;
      }

      const data = await apiRequest(
        `/products/${id}`,
        {
          method: "PUT",
          body: JSON.stringify(payload)
        }
      );

      toast.success(
        data.message ||
          "Product updated successfully."
      );
    }

    // =====================================================
    // CREATE
    // =====================================================

    else {
      const data = await apiRequest(
        "/products",
        {
          method: "POST",
          body: JSON.stringify(payload)
        }
      );

      toast.success(
        data.message ||
          "Product created successfully."
      );
    }

    closeFormModal();

    // Refresh list without page reload
    await fetchProducts();

  } catch (error) {
    console.error(
      "Save Product Error:",
      error
    );

    toast.error(
      error.message ||
        "Failed to save product."
    );

  } finally {
    setSaving(false);
  }
};

  /* =====================================================
     VIEW
     ===================================================== */

  const handleView = (product) => {
    setSelectedProduct(product);
    setShowViewModal(true);
  };

  const closeViewModal = () => {
    setShowViewModal(false);
    setSelectedProduct(null);
  };

  /* =====================================================
     TOGGLE ACTIVE
     ===================================================== */

const handleToggleStatus = async (product) => {
  const id = getProductId(product);

  if (!id) {
    toast.error("Product ID not found.");
    return;
  }

  const currentStatus = getBoolean(
    product?.IsActive ??
      product?.isActive,
    true
  );

  const shopID =
    product?.ShopID ??
    product?.shopID;

  const categoryID =
    product?.CategoryID ??
    product?.categoryID;

  const brandID =
    product?.BrandID ??
    product?.brandID ??
    null;

  const productName =
    product?.ProductName ??
    product?.productName ??
    "";

  const slug =
    product?.Slug ??
    product?.slug ??
    "";

  const SKU =
    product?.SKU ??
    product?.sku ??
    "";

  if (!shopID || !categoryID || !productName || !slug || !SKU) {
    toast.error(
      "Product data is incomplete. Please edit the product first."
    );
    return;
  }

  const payload = {
    shopID: Number(shopID),

    categoryID: Number(categoryID),

    brandID: brandID
      ? Number(brandID)
      : null,

    productName: productName.trim(),

    slug: slug.trim(),

    // IMPORTANT
    SKU: SKU.trim(),

    modelNo:
      product?.ModelNo ??
      product?.modelNo ??
      null,

    tags:
      product?.Tags ??
      product?.tags ??
      null,

    shortDescription:
      product?.ShortDescription ??
      product?.shortDescription ??
      null,

    description:
      product?.Description ??
      product?.description ??
      null,

    // IMPORTANT
    MRP:
      product?.MRP ??
      product?.mrp ??
      null,

    sellingPrice:
      Number(
        product?.SellingPrice ??
          product?.sellingPrice ??
          0
      ),

    costPrice:
      Number(
        product?.CostPrice ??
          product?.costPrice ??
          0
      ),

    stockQuantity:
      Number(
        product?.StockQuantity ??
          product?.stockQuantity ??
          0
      ),

    lowStockThreshold:
      Number(
        product?.LowStockThreshold ??
          product?.lowStockThreshold ??
          5
      ),

    isAvailable:
      getBoolean(
        product?.IsAvailable ??
          product?.isAvailable,
        true
      ),

    isActive: !currentStatus
  };

  try {
    const data = await apiRequest(
      `/products/${id}`,
      {
        method: "PUT",
        body: JSON.stringify(payload)
      }
    );

    toast.success(
      data.message ||
        `Product ${
          !currentStatus
            ? "activated"
            : "deactivated"
        } successfully.`
    );

    await fetchProducts();

  } catch (error) {
    console.error(
      "Toggle Product Error:",
      error
    );

    toast.error(
      error.message ||
        "Failed to update product status."
    );
  }
};

  /* =====================================================
     DELETE
     ===================================================== */

  const openDeleteModal = (product) => {
    setDeleteProduct(product);
    setShowDeleteModal(true);
  };

  const closeDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteProduct(null);
  };

  const confirmDelete = async () => {
    if (!deleteProduct) return;

    const id = getProductId(deleteProduct);

    if (!id) {
      toast.error("Product ID not found.");
      return;
    }

    try {
      const data = await apiRequest(
        `/products/${id}`,
        {
          method: "DELETE"
        }
      );

      toast.success(
        data.message ||
          "Product deleted successfully."
      );

      closeDeleteModal();

      await fetchProducts();
    } catch (error) {
      console.error(
        "Delete Product Error:",
        error
      );

      toast.error(
        error.message ||
          "Failed to delete product."
      );
    }
  };

  /* =====================================================
     RESET FILTERS
     ===================================================== */

  const clearFilters = () => {
    setSearch("");
    setShopFilter("");
    setCategoryFilter("");
    setBrandFilter("");
    setStatusFilter("");

    // Category & brand options bhi clear
    setCategories([]);
    setBrands([]);
};

  /* =====================================================
     NAME HELPERS
     ===================================================== */

  const getShopName = (shopID) => {
    const shop = shops.find(
      (item) =>
        String(getShopId(item)) ===
        String(shopID)
    );

    return shop
      ? shop.ShopName ??
          shop.shopName ??
          shop.name ??
          `Shop ${shopID}`
      : `Shop ${shopID ?? "-"}`;
  };

  const getCategoryDisplayName = (
    categoryID
  ) => {
    const category = categories.find(
      (item) =>
        String(getCategoryId(item)) ===
        String(categoryID)
    );

    return category
      ? getCategoryName(category)
      : `Category ${categoryID ?? "-"}`;
  };

  const getBrandDisplayName = (brandID) => {
    if (!brandID) return "No Brand";

    const brand = brands.find(
      (item) =>
        String(getBrandId(item)) ===
        String(brandID)
    );

    return brand
      ? getBrandName(brand)
      : `Brand ${brandID}`;
  };

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="products-page">

      {/* =================================================
          HEADER
      ================================================= */}

      <div className="products-header">
        <div className="products-header-left">
          <h1>Products</h1>

          <p>
            Manage your shop products,
            pricing, stock and status.
          </p>
        </div>

        <button
          type="button"
          className="add-product-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Product
        </button>
      </div>

      {/* =================================================
          STATS
      ================================================= */}

      <div className="products-stats">

        <div className="product-stat-card">
          <div className="product-stat-label">
            Total Products
          </div>

          <div className="product-stat-value">
            {totalProducts}
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-label">
            Active Products
          </div>

          <div className="product-stat-value">
            {activeProducts}
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-label">
            Inactive Products
          </div>

          <div className="product-stat-value">
            {inactiveProducts}
          </div>
        </div>

        <div className="product-stat-card">
          <div className="product-stat-label">
            Low Stock
          </div>

          <div className="product-stat-value">
            {lowStockProducts}
          </div>
        </div>

      </div>

      {/* =================================================
          FILTERS
      ================================================= */}

      <div className="products-filter-card">

        <div className="products-filter-row">

          {/* SEARCH */}

          <div className="product-filter-group product-search-box">
            <label>Search</label>

            <Search size={17} />

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search by product, SKU or model..."
            />
          </div>

          {/* SHOP */}

        <div className="product-filter-group">
    <label>Shop</label>

    <select
        value={shopFilter}
        onChange={handleShopFilterChange}
    >
        <option value="">
            All Shops
        </option>

        {shops.map((shop) => {
            const id = getShopId(shop);

            return (
                <option
                    key={id}
                    value={id}
                >
                    {shop.ShopName ??
                        shop.shopName ??
                        shop.name ??
                        `Shop ${id}`}
                </option>
            );
        })}
    </select>
</div>

          {/* CATEGORY */}

         <div className="product-filter-group">
    <label>Category</label>

    <select
        value={categoryFilter}
        onChange={(event) =>
            setCategoryFilter(event.target.value)
        }
        disabled={!shopFilter}
    >
        <option value="">
            {!shopFilter
                ? "Select Shop First"
                : categories.length === 0
                ? "No Categories Available"
                : "All Categories"}
        </option>

        {categories.map((category) => {
            const id = getCategoryId(category);

            return (
                <option
                    key={id}
                    value={id}
                >
                    {getCategoryName(category)}
                </option>
            );
        })}
    </select>
</div>

          {/* BRAND */}

        <div className="product-filter-group">
    <label>Brand</label>

    <select
        value={brandFilter}
        onChange={(event) =>
            setBrandFilter(event.target.value)
        }
        disabled={!shopFilter}
    >
        <option value="">
            {!shopFilter
                ? "Select Shop First"
                : brands.length === 0
                ? "No Brands Available"
                : "All Brands"}
        </option>

        {brands.map((brand) => {
            const id = getBrandId(brand);

            return (
                <option
                    key={id}
                    value={id}
                >
                    {getBrandName(brand)}
                </option>
            );
        })}
    </select>
</div>

          {/* STATUS */}

          <div className="product-filter-group">
            <label>Status</label>

            <select
              value={statusFilter}
              onChange={(event) =>
                setStatusFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Status
              </option>

              <option value="active">
                Active
              </option>

              <option value="inactive">
                Inactive
              </option>
            </select>
          </div>

          <button
            type="button"
            className="clear-product-filter"
            onClick={clearFilters}
          >
            Clear Filters
          </button>

        </div>

      </div>

      {/* =================================================
          TABLE
      ================================================= */}

      <div className="products-table-card">

        {loading ? (
          <div className="products-loading">
            <div className="products-spinner" />
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="products-empty-state">

            <div className="products-empty-icon">
              <Package size={27} />
            </div>

            <h3>
              No products found
            </h3>

            <p>
              Try changing your filters
              or add a new product.
            </p>

          </div>
        ) : (
          <div className="products-table-wrapper">

            <table className="products-table">

              <thead>
                <tr>
                  <th>Product</th>
                  <th>Shop</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Price</th>
                  <th>Stock</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>

                {filteredProducts.map(
                  (product) => {

                    const productID =
                      getProductId(
                        product
                      );

                    const productName =
                      getProductName(
                        product
                      );

                    const sku =
                      product?.SKU ??
                      product?.sku ??
                      "-";

                    const shopID =
                      product?.ShopID ??
                      product?.shopID;

                    const categoryID =
                      product?.CategoryID ??
                      product?.categoryID;

                    const brandID =
                      product?.BrandID ??
                      product?.brandID;

                    const mrp =
                      product?.MRP ??
                      product?.mrp;

                    const sellingPrice =
                      product?.SellingPrice ??
                      product?.sellingPrice ??
                      0;

                    const stock =
                      Number(
                        product?.StockQuantity ??
                          product?.stockQuantity ??
                          0
                      );

                    const threshold =
                      Number(
                        product?.LowStockThreshold ??
                          product?.lowStockThreshold ??
                          5
                      );

                    const isActive =
                      getBoolean(
                        product?.IsActive ??
                          product?.isActive,
                        true
                      );

                    let stockClass =
                      "in-stock";

                    if (stock <= 0) {
                      stockClass =
                        "out-stock";
                    } else if (
                      stock <= threshold
                    ) {
                      stockClass =
                        "low-stock";
                    }

                    return (
                      <tr key={productID}>

                        {/* PRODUCT */}

                        <td>
                          <div className="product-info-cell">

                            <div className="product-image-box">
                              <Package
                                size={21}
                                className="product-image-placeholder"
                              />
                            </div>

                            <div className="product-name-wrapper">

                              <div className="product-name">
                                {productName ||
                                  "Unnamed Product"}
                              </div>

                              <div className="product-sku">
                                SKU: {sku}
                              </div>

                            </div>

                          </div>
                        </td>

                        {/* SHOP */}

                        <td>
                          <span className="product-category-badge">
                            {getShopName(
                              shopID
                            )}
                          </span>
                        </td>

                        {/* CATEGORY */}

                        <td>
                          <span className="product-category-badge">
                            {getCategoryDisplayName(
                              categoryID
                            )}
                          </span>
                        </td>

                        {/* BRAND */}

                        <td>
                          <span className="product-brand-badge">
                            {getBrandDisplayName(
                              brandID
                            )}
                          </span>
                        </td>

                        {/* PRICE */}

                        <td>
                          <div className="product-price">
                            ₹
                            {Number(
                              sellingPrice
                            ).toLocaleString(
                              "en-IN"
                            )}
                          </div>

                          {mrp && (
                            <div className="product-mrp">
                              ₹
                              {Number(
                                mrp
                              ).toLocaleString(
                                "en-IN"
                              )}
                            </div>
                          )}
                        </td>

                        {/* STOCK */}

                        <td>
                          <span
                            className={`product-stock ${stockClass}`}
                          >
                            {stock}
                          </span>
                        </td>

                        {/* STATUS */}

                        <td>
                          <span
                            className={`product-status ${
                              isActive
                                ? "active"
                                : "inactive"
                            }`}
                          >
                            {isActive
                              ? "Active"
                              : "Inactive"}
                          </span>
                        </td>

                        {/* ACTIONS */}

                        <td>

                          <div className="product-actions">

                            {/* VIEW */}

                            <button
                              type="button"
                              className="product-action-btn view"
                              title="View Product"
                              onClick={() =>
                                handleView(
                                  product
                                )
                              }
                            >
                              <Eye
                                size={16}
                              />
                            </button>

                            {/* EDIT */}

                            <button
                              type="button"
                              className="product-action-btn edit"
                              title="Edit Product"
                              onClick={() =>
                                openEditModal(
                                  product
                                )
                              }
                            >
                              <Pencil
                                size={16}
                              />
                            </button>

                            {/* TOGGLE */}

                            <button
                              type="button"
                              className="product-action-btn toggle"
                              title={
                                isActive
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              onClick={() =>
                                handleToggleStatus(
                                  product
                                )
                              }
                            >
                              <Power
                                size={16}
                              />
                            </button>

                            {/* DELETE */}

                            <button
                              type="button"
                              className="product-action-btn delete"
                              title="Delete Product"
                              onClick={() =>
                                openDeleteModal(
                                  product
                                )
                              }
                            >
                              <Trash2
                                size={16}
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
          ADD / EDIT MODAL
      ================================================= */}

      {showFormModal && (
        <div
          className="product-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeFormModal();
            }
          }}
        >

          <div className="product-modal">

            <div className="product-modal-header">

              <h2>
                {editingProduct
                  ? "Edit Product"
                  : "Add Product"}
              </h2>

              <button
                type="button"
                className="product-modal-close"
                onClick={closeFormModal}
                disabled={saving}
              >
                <X size={18} />
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              <div className="product-modal-body">

                <div className="product-form-grid">

                  {/* SHOP */}

                  <div className="product-form-group">
                    <label>
                      Shop <span>*</span>
                    </label>

                   <select
    name="shopID"
    value={form.shopID}
    onChange={handleProductShopChange}
    required
>
    <option value="">
        Select Shop
    </option>

    {shops.map((shop) => {
        const id = getShopId(shop);

        return (
            <option
                key={id}
                value={id}
            >
                {shop.ShopName ??
                    shop.shopName ??
                    shop.name ??
                    `Shop ${id}`}
            </option>
        );
    })}
</select>
                  </div>

                  {/* CATEGORY */}
<div className="product-form-group">
    <label>
        Category <span>*</span>
    </label>

    <select
        name="categoryID"
        value={form.categoryID}
        onChange={handleInputChange}
        required
        disabled={!form.shopID || categories.length === 0}
    >
        <option value="">
            {!form.shopID
                ? "First Select Shop"
                : categories.length === 0
                ? "No Categories Available"
                : "Select Category"}
        </option>

        {categories.map((category) => {
            const id = getCategoryId(category);

            return (
                <option
                    key={id}
                    value={id}
                >
                    {getCategoryName(category)}
                </option>
            );
        })}
    </select>
</div>

                  {/* BRAND */}

                  <div className="product-form-group">
                    <label>
                      Brand
                    </label>

                    <select
                      name="brandID"
                      value={
                        form.brandID
                      }
                      onChange={
                        handleInputChange
                      }
                    >
                      <option value="">
                        No Brand
                      </option>

                      {brands.map((brand) => {
                        const id =
                          getBrandId(
                            brand
                          );

                        return (
                          <option
                            key={id}
                            value={id}
                          >
                            {getBrandName(
                              brand
                            )}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* PRODUCT NAME */}

                  <div className="product-form-group">
                    <label>
                      Product Name{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="productName"
                      value={
                        form.productName
                      }
                      onChange={(event) => {
                        handleInputChange(
                          event
                        );

                        if (
                          !editingProduct
                        ) {
                          setForm(
                            (prev) => ({
                              ...prev,
                              productName:
                                event.target
                                  .value,
                              slug: slugify(
                                event
                                  .target
                                  .value
                              )
                            })
                          );
                        }
                      }}
                      placeholder="Enter product name"
                      required
                    />
                  </div>

                  {/* SLUG */}

                  <div className="product-form-group">
                    <label>
                      Slug{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="text"
                      name="slug"
                      value={form.slug}
                      onChange={
                        handleInputChange
                      }
                      placeholder="product-slug"
                      required
                    />
                  </div>

                  {/* SKU */}

                  <div className="product-form-group">
                   <div className="product-form-group">
  <label>
    SKU <span>*</span>
  </label>

  <input
    type="text"
    name="sku"
    value={form.sku}
    onChange={handleInputChange}
    placeholder="CAM-4MP-001"
    required
  />
</div>
                  </div>

                  {/* MODEL */}

                  <div className="product-form-group">
                    <label>
                      Model No.
                    </label>

                    <input
                      type="text"
                      name="modelNo"
                      value={
                        form.modelNo
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="DS-2CD1343G2"
                    />
                  </div>

                  {/* TAGS */}

                  <div className="product-form-group">
                    <label>
                      Tags
                    </label>

                    <input
                      type="text"
                      name="tags"
                      value={form.tags}
                      onChange={
                        handleInputChange
                      }
                      placeholder="4MP, Dome, IP Camera"
                    />
                  </div>

                  {/* MRP */}

                  <div className="product-form-group">
                    <label>
                      MRP
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="mrp"
                      value={form.mrp}
                      onChange={
                        handleInputChange
                      }
                      placeholder="4999"
                    />
                  </div>

                  {/* SELLING PRICE */}

                  <div className="product-form-group">
                    <label>
                      Selling Price{" "}
                      <span>*</span>
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="sellingPrice"
                      value={
                        form.sellingPrice
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="3499"
                      required
                    />
                  </div>

                  {/* COST PRICE */}

                  <div className="product-form-group">
                    <label>
                      Cost Price
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="costPrice"
                      value={
                        form.costPrice
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="2500"
                    />
                  </div>

                  {/* STOCK */}

                  <div className="product-form-group">
                    <label>
                      Stock Quantity
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="stockQuantity"
                      value={
                        form.stockQuantity
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="25"
                    />
                  </div>

                  {/* LOW STOCK */}

                  <div className="product-form-group">
                    <label>
                      Low Stock Threshold
                    </label>

                    <input
                      type="number"
                      min="0"
                      name="lowStockThreshold"
                      value={
                        form.lowStockThreshold
                      }
                      onChange={
                        handleInputChange
                      }
                    />
                  </div>

                  {/* SHORT DESCRIPTION */}

                  <div className="product-form-group full">
                    <label>
                      Short Description
                    </label>

                    <textarea
                      name="shortDescription"
                      value={
                        form.shortDescription
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Enter short product description"
                    />
                  </div>

                  {/* DESCRIPTION */}

                  <div className="product-form-group full">
                    <ImageGalleryField label="Product images" value={form.productImages} onChange={(productImages) => setForm((prev) => ({ ...prev, productImages }))} shopID={form.shopID} maxImages={10} />
                  </div>

                  <div className="product-form-group full">
                    <label>Available sizes <span>optional</span></label>
                    <input name="sizes" value={form.sizes} onChange={handleInputChange} placeholder="XS, S, M, L, XL, XXL" />
                    <small>Comma separated. Shoppers must select a size before adding the item.</small>
                  </div>

                  <div className="product-form-group full">
                    <label>
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleInputChange
                      }
                      placeholder="Enter detailed product description"
                    />
                  </div>

                  {/* AVAILABLE */}

                  <div className="product-form-group">
                    <label>
                      Availability
                    </label>

                    <select
                      name="isAvailable"
                      value={
                        form.isAvailable
                          ? "true"
                          : "false"
                      }
                      onChange={(event) =>
                        setForm(
                          (prev) => ({
                            ...prev,
                            isAvailable:
                              event.target
                                .value ===
                              "true"
                          })
                        )
                      }
                    >
                      <option value="true">
                        Available
                      </option>

                      <option value="false">
                        Not Available
                      </option>
                    </select>
                  </div>

                  {/* ACTIVE */}

                  <div className="product-form-group">
                    <label>
                      Status
                    </label>

                    <select
                      name="isActive"
                      value={
                        form.isActive
                          ? "true"
                          : "false"
                      }
                      onChange={(event) =>
                        setForm(
                          (prev) => ({
                            ...prev,
                            isActive:
                              event.target
                                .value ===
                              "true"
                          })
                        )
                      }
                    >
                      <option value="true">
                        Active
                      </option>

                      <option value="false">
                        Inactive
                      </option>
                    </select>
                  </div>

                </div>

              </div>

              <div className="product-modal-footer">

                <button
                  type="button"
                  className="product-btn cancel"
                  onClick={closeFormModal}
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="product-btn primary"
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editingProduct
                    ? "Update Product"
                    : "Create Product"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

      {/* =================================================
          VIEW MODAL
      ================================================= */}

      {showViewModal &&
        selectedProduct && (
          <div
            className="product-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeViewModal();
              }
            }}
          >

            <div className="product-modal">

              <div className="product-modal-header">

                <h2>
                  Product Details
                </h2>

                <button
                  type="button"
                  className="product-modal-close"
                  onClick={closeViewModal}
                >
                  <X size={18} />
                </button>

              </div>

              <div className="product-modal-body">

                <div className="product-view-grid">

                  <div className="product-view-image">
                    <Package size={45} />
                  </div>

                  <div className="product-view-details">

                    <div className="product-view-item full">
                      <div className="product-view-label">
                        Product Name
                      </div>

                      <div className="product-view-value">
                        {getProductName(
                          selectedProduct
                        )}
                      </div>
                    </div>

                    <div className="product-view-item">
                      <div className="product-view-label">
                        SKU
                      </div>

                      <div className="product-view-value">
                        {selectedProduct
                          ?.SKU ??
                          selectedProduct
                            ?.sku ??
                          "-"}
                      </div>
                    </div>

                    <div className="product-view-item">
                      <div className="product-view-label">
                        Model No.
                      </div>

                      <div className="product-view-value">
                        {selectedProduct
                          ?.ModelNo ??
                          selectedProduct
                            ?.modelNo ??
                          "-"}
                      </div>
                    </div>

                    <div className="product-view-item">
                      <div className="product-view-label">
                        Shop
                      </div>

                      <div className="product-view-value">
                        {getShopName(
                          selectedProduct
                            ?.ShopID ??
                            selectedProduct
                              ?.shopID
                        )}
                      </div>
                    </div>

                    <div className="product-view-item">
                      <div className="product-view-label">
                        Category
                      </div>

                      <div className="product-view-value">
                        {getCategoryDisplayName(
                          selectedProduct
                            ?.CategoryID ??
                            selectedProduct
                              ?.categoryID
                        )}
                      </div>
                    </div>

                    <div className="product-view-item">
                      <div className="product-view-label">
                        Brand
                      </div>

                      <div className="product-view-value">
                        {getBrandDisplayName(
                          selectedProduct
                            ?.BrandID ??
                            selectedProduct
                              ?.brandID
                        )}
                      </div>
                    </div>

                    <div className="product-view-item">
                      <div className="product-view-label">
                        Selling Price
                      </div>

                      <div className="product-view-value">
                        ₹
                        {Number(
                          selectedProduct
                            ?.SellingPrice ??
                            selectedProduct
                              ?.sellingPrice ??
                            0
                        ).toLocaleString(
                          "en-IN"
                        )}
                      </div>
                    </div>

                    <div className="product-view-item">
                      <div className="product-view-label">
                        Stock
                      </div>

                      <div className="product-view-value">
                        {selectedProduct
                          ?.StockQuantity ??
                          selectedProduct
                            ?.stockQuantity ??
                          0}
                      </div>
                    </div>

                    <div className="product-view-item full">
                      <div className="product-view-label">
                        Description
                      </div>

                      <div className="product-view-value">
                        {selectedProduct
                          ?.Description ??
                          selectedProduct
                            ?.description ??
                          "-"}
                      </div>
                    </div>

                  </div>

                </div>

              </div>

              <div className="product-modal-footer">

                <button
                  type="button"
                  className="product-btn cancel"
                  onClick={closeViewModal}
                >
                  Close
                </button>

              </div>

            </div>

          </div>
        )}

      {/* =================================================
          DELETE CONFIRMATION MODAL
      ================================================= */}

      {showDeleteModal &&
        deleteProduct && (
          <div
            className="product-modal-overlay"
            onMouseDown={(event) => {
              if (
                event.target ===
                event.currentTarget
              ) {
                closeDeleteModal();
              }
            }}
          >

            <div className="product-delete-modal">

              <div className="product-delete-icon">
                <Trash2 size={25} />
              </div>

              <h3>
                Delete Product?
              </h3>

              <p>
                Are you sure you want to
                delete{" "}
                <strong>
                  {getProductName(
                    deleteProduct
                  )}
                </strong>
                ? This action cannot be
                undone.
              </p>

              <div className="product-delete-actions">

                <button
                  type="button"
                  className="product-btn cancel"
                  onClick={
                    closeDeleteModal
                  }
                >
                  Cancel
                </button>

                <button
                  type="button"
                  className="product-btn danger"
                  onClick={confirmDelete}
                >
                  Yes, Delete
                </button>

              </div>

            </div>

          </div>
        )}

    </div>
  );
}

export default Products;
