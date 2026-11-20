import { useEffect, useState } from "react";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    Wrench,
    Store,
    RefreshCw,
    AlertTriangle,
} from "lucide-react";
import { toast } from "react-toastify";

import "../styles/Services.css";
import ImageGalleryField from "../components/ImageGalleryField.jsx";
import { adminFetch as fetch } from "../lib/api.js";

const SERVICES_API =
    "http://localhost:5001/api/services";

const SHOPS_API =
    "http://localhost:5001/api/shops";

function Services() {
    /* =====================================================
       STATE
    ===================================================== */

    const [services, setServices] = useState([]);
    const [shops, setShops] = useState([]);

    const [loading, setLoading] = useState(true);
    const [shopsLoading, setShopsLoading] = useState(true);

    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [shopFilter, setShopFilter] = useState("all");
    const [statusFilter, setStatusFilter] = useState("all");

    const [showModal, setShowModal] = useState(false);
    const [editingService, setEditingService] = useState(null);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [serviceToDelete, setServiceToDelete] =
        useState(null);

    const [saving, setSaving] = useState(false);
    const [deletingID, setDeletingID] = useState(null);

    const [formData, setFormData] = useState({
        shopID: "",
        serviceName: "",
        shortDescription: "",
        description: "",
        price: "",
        imageURL: "",
        status: "Active",
    });

    /* =====================================================
       FETCH SERVICES
    ===================================================== */

    const fetchServices = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await fetch(SERVICES_API);
            const data = await response.json();

            if (data.success) {
                setServices(
                    Array.isArray(data.data)
                        ? data.data
                        : []
                );
            } else {
                setError(
                    data.message ||
                        "Failed to load services."
                );
            }
        } catch (err) {
            console.error(
                "Fetch Services Error:",
                err
            );

            setError(
                "Unable to connect to server."
            );
        } finally {
            setLoading(false);
        }
    };

    /* =====================================================
       FETCH SHOPS
    ===================================================== */

    const fetchShops = async () => {
        try {
            setShopsLoading(true);

            const response =
                await fetch(SHOPS_API);

            const data =
                await response.json();

            if (data.success) {
                setShops(
                    Array.isArray(data.data)
                        ? data.data
                        : []
                );
            } else {
                toast.error(
                    data.message ||
                        "Failed to load shops."
                );
            }
        } catch (err) {
            console.error(
                "Fetch Shops Error:",
                err
            );

            toast.error(
                "Unable to load shops."
            );
        } finally {
            setShopsLoading(false);
        }
    };

    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {
        fetchServices();
        fetchShops();
    }, []);

    /* =====================================================
       SHOP NAME
    ===================================================== */

    const getShopName = (shopID) => {
        const shop = shops.find(
            (item) =>
                Number(item.ShopID) ===
                Number(shopID)
        );

        return shop
            ? shop.ShopName
            : `Shop #${shopID}`;
    };

    /* =====================================================
       FORM INPUT
    ===================================================== */

    const handleInputChange = (e) => {
        const {
            name,
            value,
        } = e.target;

        setFormData((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    /* =====================================================
       OPEN ADD
    ===================================================== */

    const openAddModal = () => {
        setEditingService(null);

        setFormData({
            shopID: "",
            serviceName: "",
            shortDescription: "",
            description: "",
            price: "",
            imageURL: "",
            status: "Active",
        });

        setShowModal(true);
    };

    /* =====================================================
       OPEN EDIT
    ===================================================== */

    const openEditModal = (service) => {
        setEditingService(service);

        setFormData({
            shopID:
                service.ShopID ?? "",

            serviceName:
                service.ServiceName ?? "",

            shortDescription:
                service.ShortDescription ?? "",

            description:
                service.Description ?? "",

            price:
                service.Price ?? "",

            imageURL:
                service.ImageURL ?? "",

            status:
                service.Status ?? "Active",
        });

        setShowModal(true);
    };

    /* =====================================================
       CLOSE FORM MODAL
    ===================================================== */

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditingService(null);
    };

    /* =====================================================
       CREATE / UPDATE
    ===================================================== */

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!formData.shopID) {
            toast.warning(
                "Please select a shop."
            );
            return;
        }

        if (!formData.serviceName.trim()) {
            toast.warning(
                "Please enter service name."
            );
            return;
        }

        if (
            formData.price === "" ||
            Number(formData.price) < 0
        ) {
            toast.warning(
                "Please enter a valid price."
            );
            return;
        }

        try {
            setSaving(true);

            const isEdit =
                Boolean(editingService);

            const url = isEdit
                ? `${SERVICES_API}/${editingService.ServiceID}`
                : SERVICES_API;

            const method = isEdit
                ? "PUT"
                : "POST";

            const response = await fetch(
                url,
                {
                    method,

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        shopID:
                            Number(
                                formData.shopID
                            ),

                        serviceName:
                            formData.serviceName.trim(),

                        shortDescription:
                            formData.shortDescription.trim(),

                        description:
                            formData.description.trim(),

                        price:
                            Number(
                                formData.price
                            ),

                        imageURL:
                            formData.imageURL.trim(),

                        status:
                            formData.status,
                    }),
                }
            );

            const data =
                await response.json();

            if (!data.success) {
                toast.error(
                    data.message ||
                        "Failed to save service."
                );
                return;
            }

            toast.success(
                isEdit
                    ? "Service updated successfully."
                    : "Service created successfully."
            );

            setShowModal(false);
            setEditingService(null);

            setFormData({
                shopID: "",
                serviceName: "",
                shortDescription: "",
                description: "",
                price: "",
                imageURL: "",
                status: "Active",
            });

            await fetchServices();
        } catch (err) {
            console.error(
                "Save Service Error:",
                err
            );

            toast.error(
                "Unable to connect to server."
            );
        } finally {
            setSaving(false);
        }
    };

    /* =====================================================
       OPEN DELETE MODAL
    ===================================================== */

    const openDeleteModal = (service) => {
        setServiceToDelete(service);
        setShowDeleteModal(true);
    };

    /* =====================================================
       CLOSE DELETE MODAL
    ===================================================== */

    const closeDeleteModal = () => {
        if (deletingID) return;

        setShowDeleteModal(false);
        setServiceToDelete(null);
    };

    /* =====================================================
       DELETE SERVICE
    ===================================================== */

    const handleDelete = async () => {
        if (!serviceToDelete) return;

        const serviceID =
            serviceToDelete.ServiceID;

        const shopID =
            serviceToDelete.ShopID;

        try {
            setDeletingID(serviceID);

            const response = await fetch(
                `${SERVICES_API}/${serviceID}`,
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        shopID:
                            Number(shopID),
                    }),
                }
            );

            const data =
                await response.json();

            if (!data.success) {
                toast.error(
                    data.message ||
                        "Failed to delete service."
                );
                return;
            }

            setServices((prev) =>
                prev.filter(
                    (item) =>
                        Number(
                            item.ServiceID
                        ) !==
                        Number(serviceID)
                )
            );

            toast.success(
                "Service deleted successfully."
            );

            setShowDeleteModal(false);
            setServiceToDelete(null);
        } catch (err) {
            console.error(
                "Delete Service Error:",
                err
            );

            toast.error(
                "Unable to connect to server."
            );
        } finally {
            setDeletingID(null);
        }
    };

    /* =====================================================
       REFRESH
    ===================================================== */

    const handleRefresh = async () => {
        await fetchServices();

        toast.info(
            "Services list refreshed."
        );
    };

    /* =====================================================
       FILTER
    ===================================================== */

    const filteredServices =
        services.filter((service) => {
            const searchText =
                search
                    .trim()
                    .toLowerCase();

            const matchesSearch =
                !searchText ||
                service.ServiceName
                    ?.toLowerCase()
                    .includes(searchText) ||
                service.Slug
                    ?.toLowerCase()
                    .includes(searchText) ||
                getShopName(
                    service.ShopID
                )
                    .toLowerCase()
                    .includes(searchText);

            const matchesShop =
                shopFilter === "all" ||
                Number(service.ShopID) ===
                    Number(shopFilter);

            const matchesStatus =
                statusFilter === "all" ||
                service.Status ===
                    statusFilter;

            return (
                matchesSearch &&
                matchesShop &&
                matchesStatus
            );
        });

    /* =====================================================
       FORMAT PRICE
    ===================================================== */

    const formatPrice = (price) => {
        return Number(
            price || 0
        ).toLocaleString("en-IN", {
            maximumFractionDigits: 2,
        });
    };

    /* =====================================================
       FORMAT DATE
    ===================================================== */

    const formatDate = (date) => {
        if (!date) return "-";

        return new Date(
            date
        ).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    };

    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="services-page">

            {/* HEADER */}

            <div className="services-header">

                <div className="services-title-row">

                    <div className="services-title-icon">
                        <Wrench size={22} />
                    </div>

                    <div>
                        <h1>Services</h1>

                        <p>
                            Manage services available
                            at each shop.
                        </p>
                    </div>

                </div>

                <div className="services-header-actions">

                    <button
                        type="button"
                        className="refresh-service-btn"
                        onClick={handleRefresh}
                        title="Refresh services"
                    >
                        <RefreshCw size={17} />
                    </button>

                    <button
                        type="button"
                        className="add-service-btn"
                        onClick={openAddModal}
                    >
                        <Plus size={18} />
                        Add Service
                    </button>

                </div>

            </div>


            {/* STATS */}

            <div className="services-stats">

                <div className="service-stat-card">

                    <div className="stat-icon">
                        <Wrench size={19} />
                    </div>

                    <div>
                        <span>
                            Total Services
                        </span>

                        <strong>
                            {services.length}
                        </strong>
                    </div>

                </div>


                <div className="service-stat-card">

                    <div className="stat-icon">
                        <Store size={19} />
                    </div>

                    <div>
                        <span>
                            Shops With Services
                        </span>

                        <strong>
                            {
                                new Set(
                                    services.map(
                                        (service) =>
                                            service.ShopID
                                    )
                                ).size
                            }
                        </strong>
                    </div>

                </div>


                <div className="service-stat-card">

                    <div className="stat-icon">
                        <Wrench size={19} />
                    </div>

                    <div>
                        <span>
                            Active Services
                        </span>

                        <strong>
                            {
                                services.filter(
                                    (service) =>
                                        service.Status ===
                                        "Active"
                                ).length
                            }
                        </strong>
                    </div>

                </div>

            </div>


            {/* FILTERS */}

            <div className="services-filters">

                <div className="service-search">

                    <Search size={17} />

                    <input
                        type="text"
                        placeholder="Search service or shop..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />

                </div>


                <select
                    value={shopFilter}
                    onChange={(e) =>
                        setShopFilter(
                            e.target.value
                        )
                    }
                >
                    <option value="all">
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


                <select
                    value={statusFilter}
                    onChange={(e) =>
                        setStatusFilter(
                            e.target.value
                        )
                    }
                >
                    <option value="all">
                        All Status
                    </option>

                    <option value="Active">
                        Active
                    </option>

                    <option value="Inactive">
                        Inactive
                    </option>
                </select>

            </div>


            {/* ERROR */}

            {error && (
                <div className="services-error">
                    {error}
                </div>
            )}


            {/* LOADING */}

            {loading ? (

                <div className="services-loading">

                    <RefreshCw
                        size={20}
                        className="loading-spin"
                    />

                    Loading services...

                </div>

            ) : filteredServices.length === 0 ? (

                <div className="services-empty">

                    <div className="empty-icon">
                        <Wrench size={28} />
                    </div>

                    <h3>
                        No Services Found
                    </h3>

                    <p>
                        Add a service to one of
                        your shops.
                    </p>

                    <button
                        type="button"
                        className="add-service-btn"
                        onClick={openAddModal}
                    >
                        <Plus size={17} />
                        Add Service
                    </button>

                </div>

            ) : (

                <div className="services-table-wrapper">

                    <table className="services-table">

                        <thead>

                            <tr>
                                <th>Service</th>
                                <th>Shop</th>
                                <th>Price</th>
                                <th>Status</th>
                                <th>Created</th>
                                <th>Actions</th>
                            </tr>

                        </thead>

                        <tbody>

                            {filteredServices.map(
                                (service) => (

                                    <tr
                                        key={
                                            service.ServiceID
                                        }
                                    >

                                        {/* SERVICE */}

                                        <td>

                                            <div className="service-info">

                                                {service.ImageURL ? (

                                                    <img
                                                        src={
                                                            service.ImageURL
                                                        }
                                                        alt={
                                                            service.ServiceName
                                                        }
                                                        className="service-image"
                                                        onError={(
                                                            e
                                                        ) => {
                                                            e.currentTarget.style.display =
                                                                "none";
                                                        }}
                                                    />

                                                ) : (

                                                    <div className="service-placeholder">
                                                        <Wrench
                                                            size={
                                                                20
                                                            }
                                                        />
                                                    </div>

                                                )}

                                                <div>

                                                    <strong>
                                                        {
                                                            service.ServiceName
                                                        }
                                                    </strong>

                                                    <span>
                                                        {
                                                            service.ShortDescription ||
                                                            service.Slug
                                                        }
                                                    </span>

                                                </div>

                                            </div>

                                        </td>


                                        {/* SHOP */}

                                        <td>

                                            <div className="service-shop">

                                                <div className="shop-icon">
                                                    <Store
                                                        size={
                                                            17
                                                        }
                                                    />
                                                </div>

                                                <div>

                                                    <strong>
                                                        {
                                                            getShopName(
                                                                service.ShopID
                                                            )
                                                        }
                                                    </strong>

                                                    <span>
                                                        Shop #
                                                        {
                                                            service.ShopID
                                                        }
                                                    </span>

                                                </div>

                                            </div>

                                        </td>


                                        {/* PRICE */}

                                        <td>

                                            <strong className="service-price">
                                                ₹
                                                {
                                                    formatPrice(
                                                        service.Price
                                                    )
                                                }
                                            </strong>

                                        </td>


                                        {/* STATUS */}

                                        <td>

                                            <span
                                                className={`status-badge ${
                                                    service.Status ===
                                                    "Active"
                                                        ? "active"
                                                        : "inactive"
                                                }`}
                                            >
                                                {
                                                    service.Status
                                                }
                                            </span>

                                        </td>


                                        {/* CREATED */}

                                        <td>

                                            <span className="created-date">
                                                {
                                                    formatDate(
                                                        service.CreatedAt
                                                    )
                                                }
                                            </span>

                                        </td>


                                        {/* ACTIONS */}

                                        <td>

                                            <div className="service-actions">

                                                <button
                                                    type="button"
                                                    className="edit-btn"
                                                    onClick={() =>
                                                        openEditModal(
                                                            service
                                                        )
                                                    }
                                                >
                                                    <Pencil
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    Edit
                                                </button>


                                                <button
                                                    type="button"
                                                    className="delete-btn"
                                                    disabled={
                                                        deletingID ===
                                                        service.ServiceID
                                                    }
                                                    onClick={() =>
                                                        openDeleteModal(
                                                            service
                                                        )
                                                    }
                                                >
                                                    <Trash2
                                                        size={
                                                            14
                                                        }
                                                    />

                                                    Delete
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


            {/* =================================================
                ADD / EDIT MODAL
            ================================================= */}

            {showModal && (

                <div
                    className="service-modal-overlay"
                    onMouseDown={(e) => {

                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeModal();
                        }

                    }}
                >

                    <div className="service-modal">

                        <div className="service-modal-header">

                            <div>

                                <h2>
                                    {editingService
                                        ? "Edit Service"
                                        : "Add New Service"}
                                </h2>

                                <p>
                                    Assign this service
                                    to a specific shop.
                                </p>

                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={closeModal}
                            >
                                <X size={20} />
                            </button>

                        </div>


                        <form
                            onSubmit={handleSubmit}
                            className="service-form"
                        >

                            {/* SHOP */}

                            <div className="form-group">

                                <label>
                                    Shop
                                    <span>*</span>
                                </label>

                                <select
                                    name="shopID"
                                    value={
                                        formData.shopID
                                    }
                                    onChange={
                                        handleInputChange
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


                            {/* SERVICE NAME */}

                            <div className="form-group">

                                <label>
                                    Service Name
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="serviceName"
                                    value={
                                        formData.serviceName
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="e.g. CCTV Installation"
                                    required
                                />

                            </div>


                            {/* PRICE / STATUS */}

                            <div className="form-row">

                                <div className="form-group">

                                    <label>
                                        Price
                                        <span>*</span>
                                    </label>

                                    <input
                                        type="number"
                                        name="price"
                                        min="0"
                                        step="0.01"
                                        value={
                                            formData.price
                                        }
                                        onChange={
                                            handleInputChange
                                        }
                                        placeholder="2500"
                                        required
                                    />

                                </div>


                                <div className="form-group">

                                    <label>
                                        Status
                                    </label>

                                    <select
                                        name="status"
                                        value={
                                            formData.status
                                        }
                                        onChange={
                                            handleInputChange
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

                            </div>


                            {/* SHORT DESCRIPTION */}

                            <div className="form-group">

                                <label>
                                    Short Description
                                </label>

                                <input
                                    type="text"
                                    name="shortDescription"
                                    value={
                                        formData.shortDescription
                                    }
                                    onChange={
                                        handleInputChange
                                    }
                                    placeholder="Short service description"
                                />

                            </div>


                            {/* DESCRIPTION */}

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
                                        handleInputChange
                                    }
                                    placeholder="Enter complete service description..."
                                    rows="4"
                                />

                            </div>


                            {/* IMAGE URL */}

                            <div className="form-group">

                                <ImageGalleryField label="Service image" multiple={false} value={formData.imageURL ? [formData.imageURL] : []} onChange={(images) => setFormData((prev) => ({ ...prev, imageURL: images[0] || "" }))} shopID={formData.shopID} />

                            </div>


                            {/* FORM ACTIONS */}

                            <div className="service-form-actions">

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
                                    className="save-service-btn"
                                    disabled={
                                        saving ||
                                        shopsLoading
                                    }
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingService
                                        ? "Update Service"
                                        : "Create Service"}
                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* =================================================
                DELETE CONFIRMATION MODAL
            ================================================= */}

            {showDeleteModal &&
                serviceToDelete && (

                    <div
                        className="service-modal-overlay delete-overlay"
                        onMouseDown={(e) => {

                            if (
                                e.target ===
                                e.currentTarget
                            ) {
                                closeDeleteModal();
                            }

                        }}
                    >

                        <div className="delete-confirm-modal">

                            <div className="delete-warning-icon">
                                <AlertTriangle
                                    size={28}
                                />
                            </div>


                            <h2>
                                Delete Service?
                            </h2>


                            <p>
                                Are you sure you want
                                to delete
                                <strong>
                                    {" "}
                                    "
                                    {
                                        serviceToDelete.ServiceName
                                    }
                                    "
                                </strong>
                                ?
                            </p>


                            <div className="delete-service-info">

                                <div className="delete-info-icon">
                                    <Wrench
                                        size={18}
                                    />
                                </div>

                                <div>

                                    <strong>
                                        {
                                            serviceToDelete.ServiceName
                                        }
                                    </strong>

                                    <span>
                                        {
                                            getShopName(
                                                serviceToDelete.ShopID
                                            )
                                        }
                                    </span>

                                </div>

                            </div>


                            <p className="delete-warning-text">
                                This action cannot be
                                undone.
                            </p>


                            <div className="delete-modal-actions">

                                <button
                                    type="button"
                                    className="delete-cancel-btn"
                                    onClick={
                                        closeDeleteModal
                                    }
                                    disabled={
                                        Boolean(
                                            deletingID
                                        )
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="button"
                                    className="delete-confirm-btn"
                                    onClick={
                                        handleDelete
                                    }
                                    disabled={
                                        Boolean(
                                            deletingID
                                        )
                                    }
                                >

                                    <Trash2
                                        size={16}
                                    />

                                    {deletingID
                                        ? "Deleting..."
                                        : "Yes, Delete"}

                                </button>

                            </div>

                        </div>

                    </div>

                )}

        </div>
    );
}

export default Services;
