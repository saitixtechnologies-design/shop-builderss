import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  FolderTree,
  Pencil,
  Trash2,
  X,
} from "lucide-react";
import { toast } from "react-toastify";
import { getShopAdminToken, API_ORIGIN } from "../../lib/api.js";
import "../../styles/shop-admin/shop-categories.css";
import ImageGalleryField from "../../components/ImageGalleryField.jsx";

const API_URL = `${API_ORIGIN}/api/shop-categories`;

function ShopCategories() {
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);

  const [form, setForm] = useState({
    categoryName: "",
    slug: "",
    description: "",
    imageURL: "",
    parentCategoryID: "",
    sortOrder: 0,
    isActive: true,
  });

  // =====================================================
  // TOKEN
  // =====================================================

  const getToken = () => {
    return getShopAdminToken();
  };

  // =====================================================
  // GET CATEGORIES
  // =====================================================

  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError("");

      const token = getToken();

      if (!token) {
        setError("Login session not found.");
        setLoading(false);
        return;
      }

      const response = await fetch(API_URL, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to load categories."
        );
      }

      setCategories(result.data || []);
    } catch (err) {
      console.error("Fetch Categories Error:", err);
      setError(err.message || "Failed to load categories.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // =====================================================
  // SEARCH
  // =====================================================

  const filteredCategories = useMemo(() => {
    const value = search.trim().toLowerCase();

    if (!value) return categories;

    return categories.filter((category) =>
      [
        category.CategoryName,
        category.Slug,
        category.Description,
      ]
        .filter(Boolean)
        .some((item) =>
          String(item).toLowerCase().includes(value)
        )
    );
  }, [categories, search]);

  // =====================================================
  // FORM
  // =====================================================

  const resetForm = () => {
    setForm({
      categoryName: "",
      slug: "",
      description: "",
      imageURL: "",
      parentCategoryID: "",
      sortOrder: 0,
      isActive: true,
    });
  };

  const openAddModal = () => {
    setEditingCategory(null);
    resetForm();
    setShowModal(true);
  };

  const openEditModal = (category) => {
    setEditingCategory(category);

    setForm({
      categoryName: category.CategoryName || "",
      slug: category.Slug || "",
      description: category.Description || "",
      imageURL: category.ImageURL || "",
      parentCategoryID:
        category.ParentCategoryID || "",
      sortOrder: category.SortOrder ?? 0,
      isActive: Boolean(category.IsActive),
    });

    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingCategory(null);
    resetForm();
  };

  // =====================================================
  // INPUT
  // =====================================================

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    setForm((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // =====================================================
  // CREATE / UPDATE
  // =====================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setError("");

      const token = getToken();

      if (!token) {
        setError("Login session not found.");
        return;
      }

      if (!form.categoryName.trim()) {
        setError("Category name is required.");
        return;
      }

      const payload = {
        categoryName: form.categoryName.trim(),
        slug:
          form.slug.trim() ||
          form.categoryName
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-|-$/g, ""),
        description: form.description,
        imageURL: form.imageURL,
        parentCategoryID:
          form.parentCategoryID === ""
            ? null
            : Number(form.parentCategoryID),
        sortOrder: Number(form.sortOrder) || 0,
        isActive: form.isActive,
      };

      const url = editingCategory
        ? `${API_URL}/${editingCategory.CategoryID}`
        : API_URL;

      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message ||
            `Failed to ${
              editingCategory ? "update" : "create"
            } category.`
        );
      }

      closeModal();
      await fetchCategories();
      toast.success(editingCategory ? "Category updated successfully." : "Category created successfully.");
    } catch (err) {
      console.error("Save Category Error:", err);
      setError(err.message);
      toast.error(err.message || "Failed to save category.");
    }
  };

  // =====================================================
  // DELETE
  // =====================================================

  const handleDelete = async (category) => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${category.CategoryName}"?`
    );

    if (!confirmed) return;

    try {
      setError("");

      const token = getToken();

      if (!token) {
        setError("Login session not found.");
        return;
      }

      const response = await fetch(
        `${API_URL}/${category.CategoryID}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.message || "Failed to delete category."
        );
      }

      await fetchCategories();
      toast.success("Category deleted successfully.");
    } catch (err) {
      console.error("Delete Category Error:", err);
      setError(err.message);
      toast.error(err.message || "Failed to delete category.");
    }
  };

  // =====================================================
  // UI
  // =====================================================

  return (
    <div className="shop-categories-page">

      {/* HEADER */}
      <div className="shop-categories-header">
        <div>
          <span className="shop-section-label">
            SHOP MANAGEMENT
          </span>

          <h1>Categories</h1>

          <p>Manage categories for your shop.</p>
        </div>

        <button
          className="shop-category-add-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />
          Add Category
        </button>
      </div>

      {/* ERROR */}
      {error && (
        <div className="shop-category-error">
          {error}
        </div>
      )}

      {/* TOOLBAR */}
      <div className="shop-category-toolbar">
        <div className="shop-category-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Search categories..."
            value={search}
            onChange={(e) =>
              setSearch(e.target.value)
            }
          />
        </div>

        <div className="shop-category-count">
          {filteredCategories.length}{" "}
          {filteredCategories.length === 1
            ? "Category"
            : "Categories"}
        </div>
      </div>

      {/* CONTENT */}
      <div className="shop-category-card">

        {loading ? (
          <div className="shop-category-empty">
            <div className="shop-category-loader"></div>
            <h3>Loading categories...</h3>
          </div>
        ) : filteredCategories.length === 0 ? (
          <div className="shop-category-empty">
            <div className="shop-category-empty-icon">
              <FolderTree size={34} />
            </div>

            <h3>No categories found</h3>

            <p>
              Add your first category to start
              organizing products.
            </p>

            <button
              className="shop-category-add-btn"
              onClick={openAddModal}
            >
              <Plus size={18} />
              Add Category
            </button>
          </div>
        ) : (
          <div className="shop-category-table-wrapper">
            <table className="shop-category-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Slug</th>
                  <th>Parent</th>
                  <th>Status</th>
                  <th>Sort Order</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredCategories.map((category) => {
                  const parent = categories.find(
                    (item) =>
                      item.CategoryID ===
                      category.ParentCategoryID
                  );

                  return (
                    <tr key={category.CategoryID}>
                      <td>
                        <div className="shop-category-name">
                          <div className="shop-category-icon">
                            <FolderTree size={18} />
                          </div>

                          <div>
                            <strong>
                              {category.CategoryName}
                            </strong>

                            {category.Description && (
                              <small>
                                {category.Description}
                              </small>
                            )}
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="shop-category-slug">
                          {category.Slug}
                        </span>
                      </td>

                      <td>
                        {parent
                          ? parent.CategoryName
                          : "—"}
                      </td>

                      <td>
                        <span
                          className={`shop-category-status ${
                            category.IsActive
                              ? "active"
                              : "inactive"
                          }`}
                        >
                          {category.IsActive
                            ? "Active"
                            : "Inactive"}
                        </span>
                      </td>

                      <td>
                        {category.SortOrder}
                      </td>

                      <td>
                        <div className="shop-category-actions">
                          <button
                            className="shop-category-edit"
                            onClick={() =>
                              openEditModal(category)
                            }
                            title="Edit"
                          >
                            <Pencil size={17} />
                          </button>

                          <button
                            className="shop-category-delete"
                            onClick={() =>
                              handleDelete(category)
                            }
                            title="Delete"
                          >
                            <Trash2 size={17} />
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

      {/* MODAL */}
      {showModal && (
        <div className="shop-category-modal-overlay">
          <div className="shop-category-modal">

            <div className="shop-category-modal-header">
              <div>
                <h2>
                  {editingCategory
                    ? "Edit Category"
                    : "Add Category"}
                </h2>

                <p>
                  {editingCategory
                    ? "Update category details."
                    : "Create a new category for your shop."}
                </p>
              </div>

              <button
                className="shop-category-close"
                onClick={closeModal}
              >
                <X size={22} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
              className="shop-category-form"
            >

              <div className="shop-category-form-grid">

                <div className="shop-category-field">
                  <label>
                    Category Name <span>*</span>
                  </label>

                  <input
                    type="text"
                    name="categoryName"
                    value={form.categoryName}
                    onChange={handleChange}
                    placeholder="e.g. CCTV Cameras"
                    required
                  />
                </div>

                <div className="shop-category-field">
                  <label>Slug</label>

                  <input
                    type="text"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    placeholder="cctv-cameras"
                  />
                </div>

                <div className="shop-category-field">
                  <label>Parent Category</label>

                  <select
                    name="parentCategoryID"
                    value={form.parentCategoryID}
                    onChange={handleChange}
                  >
                    <option value="">
                      No Parent Category
                    </option>

                    {categories
                      .filter(
                        (category) =>
                          !editingCategory ||
                          category.CategoryID !==
                            editingCategory.CategoryID
                      )
                      .map((category) => (
                        <option
                          key={category.CategoryID}
                          value={category.CategoryID}
                        >
                          {category.CategoryName}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="shop-category-field">
                  <label>Sort Order</label>

                  <input
                    type="number"
                    name="sortOrder"
                    value={form.sortOrder}
                    onChange={handleChange}
                    min="0"
                  />
                </div>

                <div className="shop-category-field full">
                  <label>Description</label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    placeholder="Category description..."
                    rows="4"
                  />
                </div>

                <div className="shop-category-field full">
                  <ImageGalleryField label="Category image" multiple={false} value={form.imageURL ? [form.imageURL] : []} onChange={(images) => setForm((prev) => ({ ...prev, imageURL: images[0] || "" }))} />
                </div>

                <div className="shop-category-checkbox">
                  <label>
                    <input
                      type="checkbox"
                      name="isActive"
                      checked={form.isActive}
                      onChange={handleChange}
                    />

                    <span>Active Category</span>
                  </label>
                </div>
              </div>

              <div className="shop-category-modal-footer">
                <button
                  type="button"
                  className="shop-category-cancel"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="shop-category-save"
                >
                  {editingCategory
                    ? "Update Category"
                    : "Create Category"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShopCategories;
