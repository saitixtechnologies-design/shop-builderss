import { useEffect, useMemo, useState } from "react";
import {
    Plus,
    Search,
    Pencil,
    Trash2,
    TicketPercent,
    CheckCircle2,
    XCircle,
    Copy,
    ToggleLeft,
    ToggleRight,
    CalendarDays,
    Users,
    X,
} from "lucide-react";
import { toast } from "react-toastify";

import "../../styles/shop-admin/ShopCoupons.css";
import { API_ORIGIN } from "../../lib/api.js";

const API_URL = `${API_ORIGIN}/api/shop-coupons`;

const emptyForm = {
    couponCode: "",
    description: "",
    discountType: "Percentage",
    discountValue: "",
    minimumOrderAmount: "",
    maximumDiscountAmount: "",
    usageLimit: "",
    startsAt: "",
    expiresAt: "",
    isActive: true,
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
    if (!date) return "No expiry";

    const d = new Date(date);

    if (Number.isNaN(d.getTime())) return "Invalid date";

    return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};

const formatMoney = (value) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "—";
    }

    return `₹${Number(value).toLocaleString("en-IN")}`;
};

const ShopCoupons = () => {
    const [coupons, setCoupons] = useState([]);
    const [loading, setLoading] = useState(true);

    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("All");

    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    const [form, setForm] = useState(emptyForm);
    const [saving, setSaving] = useState(false);

    const fetchCoupons = async () => {
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
                    result.message ||
                        "Failed to fetch coupons."
                );
            }

            setCoupons(result.data || []);
        } catch (error) {
            console.error(
                "Fetch Shop Coupons Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to load coupons."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCoupons();
    }, []);

    const stats = useMemo(() => {
        const total = coupons.length;

        const active = coupons.filter(
            (coupon) => coupon.IsActive === true
        ).length;

        const inactive = coupons.filter(
            (coupon) => coupon.IsActive !== true
        ).length;

        const totalUsage = coupons.reduce(
            (sum, coupon) =>
                sum + Number(coupon.UsedCount || 0),
            0
        );

        return {
            total,
            active,
            inactive,
            totalUsage,
        };
    }, [coupons]);

    const filteredCoupons = useMemo(() => {
        const query = search.trim().toLowerCase();

        return coupons.filter((coupon) => {
            const matchesSearch =
                !query ||
                coupon.CouponCode?.toLowerCase().includes(
                    query
                ) ||
                coupon.Description?.toLowerCase().includes(
                    query
                ) ||
                coupon.DiscountType?.toLowerCase().includes(
                    query
                );

            const matchesStatus =
                statusFilter === "All" ||
                (statusFilter === "Active"
                    ? coupon.IsActive === true
                    : coupon.IsActive !== true);

            return matchesSearch && matchesStatus;
        });
    }, [coupons, search, statusFilter]);

    const openAddModal = () => {
        setEditingCoupon(null);
        setForm(emptyForm);
        setShowModal(true);
    };

    const openEditModal = (coupon) => {
        setEditingCoupon(coupon);

        setForm({
            couponCode: coupon.CouponCode || "",
            description: coupon.Description || "",
            discountType:
                coupon.DiscountType || "Percentage",
            discountValue:
                coupon.DiscountValue ?? "",
            minimumOrderAmount:
                coupon.MinimumOrderAmount ?? "",
            maximumDiscountAmount:
                coupon.MaximumDiscountAmount ?? "",
            usageLimit:
                coupon.UsageLimit ?? "",
            startsAt: formatDateForInput(
                coupon.StartsAt
            ),
            expiresAt: formatDateForInput(
                coupon.ExpiresAt
            ),
            isActive: coupon.IsActive === true,
        });

        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setEditingCoupon(null);
        setForm(emptyForm);
    };

    const handleChange = (e) => {
        const { name, value, type, checked } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    };

    const validateForm = () => {
        const code = form.couponCode.trim();

        if (!code) {
            toast.error("Coupon code is required.");
            return false;
        }

        if (!form.discountValue) {
            toast.error("Discount value is required.");
            return false;
        }

        const discount = Number(
            form.discountValue
        );

        if (!Number.isFinite(discount) || discount < 0) {
            toast.error(
                "Discount value must be valid."
            );
            return false;
        }

        if (
            form.discountType === "Percentage" &&
            discount > 100
        ) {
            toast.error(
                "Percentage discount cannot exceed 100%."
            );
            return false;
        }

        if (
            form.startsAt &&
            form.expiresAt &&
            new Date(form.startsAt) >
                new Date(form.expiresAt)
        ) {
            toast.error(
                "Expiry date cannot be before start date."
            );
            return false;
        }

        if (
            form.minimumOrderAmount &&
            Number(form.minimumOrderAmount) < 0
        ) {
            toast.error(
                "Minimum order amount cannot be negative."
            );
            return false;
        }

        if (
            form.maximumDiscountAmount &&
            Number(form.maximumDiscountAmount) < 0
        ) {
            toast.error(
                "Maximum discount cannot be negative."
            );
            return false;
        }

        if (
            form.usageLimit &&
            Number(form.usageLimit) < 0
        ) {
            toast.error(
                "Usage limit cannot be negative."
            );
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
                toast.error(
                    "Authentication token not found."
                );
                return;
            }

            const payload = {
                couponCode:
                    form.couponCode
                        .trim()
                        .toUpperCase(),

                description:
                    form.description.trim() ||
                    null,

                discountType:
                    form.discountType,

                discountValue:
                    Number(form.discountValue),

                minimumOrderAmount:
                    form.minimumOrderAmount === ""
                        ? null
                        : Number(
                              form.minimumOrderAmount
                          ),

                maximumDiscountAmount:
                    form.maximumDiscountAmount === ""
                        ? null
                        : Number(
                              form.maximumDiscountAmount
                          ),

                usageLimit:
                    form.usageLimit === ""
                        ? null
                        : Number(form.usageLimit),

                startsAt:
                    form.startsAt || null,

                expiresAt:
                    form.expiresAt || null,

                isActive:
                    form.isActive,
            };

            const url = editingCoupon
                ? `${API_URL}/${editingCoupon.CouponID}`
                : API_URL;

            const method = editingCoupon
                ? "PUT"
                : "POST";

            const response = await fetch(url, {
                method,
                headers: {
                    "Content-Type":
                        "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                        `Failed to ${
                            editingCoupon
                                ? "update"
                                : "create"
                        } coupon.`
                );
            }

            toast.success(
                editingCoupon
                    ? "Coupon updated successfully."
                    : "Coupon created successfully."
            );

            closeModal();
            fetchCoupons();
        } catch (error) {
            console.error(
                "Save Shop Coupon Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to save coupon."
            );
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (coupon) => {
        const confirmed = window.confirm(
            `Are you sure you want to delete coupon "${coupon.CouponCode}"?`
        );

        if (!confirmed) return;

        try {
            const token = getToken();

            const response = await fetch(
                `${API_URL}/${coupon.CouponID}`,
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
                    result.message ||
                        "Failed to delete coupon."
                );
            }

            toast.success(
                "Coupon deleted successfully."
            );

            setCoupons((prev) =>
                prev.filter(
                    (item) =>
                        item.CouponID !==
                        coupon.CouponID
                )
            );
        } catch (error) {
            console.error(
                "Delete Shop Coupon Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to delete coupon."
            );
        }
    };

    const toggleStatus = async (coupon) => {
        try {
            const token = getToken();

            const response = await fetch(
                `${API_URL}/${coupon.CouponID}/status`,
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
                    result.message ||
                        "Failed to update coupon status."
                );
            }

            toast.success(
                coupon.IsActive
                    ? "Coupon deactivated."
                    : "Coupon activated."
            );

            fetchCoupons();
        } catch (error) {
            console.error(
                "Toggle Coupon Error:",
                error
            );

            toast.error(
                error.message ||
                    "Failed to update status."
            );
        }
    };

    const copyCoupon = async (code) => {
        try {
            await navigator.clipboard.writeText(
                code
            );

            toast.success(
                `Coupon ${code} copied.`
            );
        } catch {
            toast.error(
                "Unable to copy coupon code."
            );
        }
    };

    const getUsagePercentage = (coupon) => {
        const used = Number(
            coupon.UsedCount || 0
        );

        const limit = Number(
            coupon.UsageLimit || 0
        );

        if (!limit) return 0;

        return Math.min(
            100,
            Math.round((used / limit) * 100)
        );
    };

    return (
        <div className="shop-coupons-page">

            {/* HEADER */}
            <div className="shop-coupons-header">
                <div>
                    <span className="shop-coupons-eyebrow">
                        SHOP MANAGEMENT
                    </span>

                    <h1>Coupons & Offers</h1>

                    <p>
                        Create and manage discount
                        coupons for your customers.
                    </p>
                </div>

                <button
                    className="shop-coupon-add-btn"
                    onClick={openAddModal}
                >
                    <Plus size={19} />
                    Create Coupon
                </button>
            </div>

            {/* STATS */}
            <div className="shop-coupon-stats">

                <div className="shop-coupon-stat-card">
                    <div className="shop-coupon-stat-icon total">
                        <TicketPercent
                            size={22}
                        />
                    </div>

                    <div>
                        <span>Total Coupons</span>
                        <strong>
                            {stats.total}
                        </strong>
                    </div>
                </div>

                <div className="shop-coupon-stat-card">
                    <div className="shop-coupon-stat-icon active">
                        <CheckCircle2
                            size={22}
                        />
                    </div>

                    <div>
                        <span>Active Coupons</span>
                        <strong>
                            {stats.active}
                        </strong>
                    </div>
                </div>

                <div className="shop-coupon-stat-card">
                    <div className="shop-coupon-stat-icon inactive">
                        <XCircle size={22} />
                    </div>

                    <div>
                        <span>Inactive</span>
                        <strong>
                            {stats.inactive}
                        </strong>
                    </div>
                </div>

                <div className="shop-coupon-stat-card">
                    <div className="shop-coupon-stat-icon usage">
                        <Users size={22} />
                    </div>

                    <div>
                        <span>Total Usage</span>
                        <strong>
                            {stats.totalUsage}
                        </strong>
                    </div>
                </div>

            </div>

            {/* TOOLBAR */}
            <div className="shop-coupon-toolbar">

                <div className="shop-coupon-search">
                    <Search size={19} />

                    <input
                        type="text"
                        placeholder="Search coupon code or description..."
                        value={search}
                        onChange={(e) =>
                            setSearch(
                                e.target.value
                            )
                        }
                    />
                </div>

                <div className="shop-coupon-status-filter">

                    <button
                        className={
                            statusFilter === "All"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setStatusFilter(
                                "All"
                            )
                        }
                    >
                        All
                    </button>

                    <button
                        className={
                            statusFilter ===
                            "Active"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setStatusFilter(
                                "Active"
                            )
                        }
                    >
                        Active
                    </button>

                    <button
                        className={
                            statusFilter ===
                            "Inactive"
                                ? "active"
                                : ""
                        }
                        onClick={() =>
                            setStatusFilter(
                                "Inactive"
                            )
                        }
                    >
                        Inactive
                    </button>

                </div>
            </div>

            {/* TABLE */}
            <div className="shop-coupons-table-card">

                {loading ? (
                    <div className="shop-coupon-loading">
                        <div className="shop-coupon-spinner"></div>
                        <p>
                            Loading coupons...
                        </p>
                    </div>
                ) : filteredCoupons.length ===
                  0 ? (
                    <div className="shop-coupon-empty">

                        <div className="shop-coupon-empty-icon">
                            <TicketPercent
                                size={34}
                            />
                        </div>

                        <h3>
                            No coupons found
                        </h3>

                        <p>
                            {search ||
                            statusFilter !==
                                "All"
                                ? "Try changing your search or filters."
                                : "Create your first discount coupon."}
                        </p>

                        {!search &&
                            statusFilter ===
                                "All" && (
                                <button
                                    onClick={
                                        openAddModal
                                    }
                                    className="shop-coupon-empty-btn"
                                >
                                    <Plus
                                        size={18}
                                    />
                                    Create Coupon
                                </button>
                            )}

                    </div>
                ) : (
                    <div className="shop-coupons-table-wrapper">

                        <table className="shop-coupons-table">

                            <thead>
                                <tr>
                                    <th>
                                        Coupon
                                    </th>

                                    <th>
                                        Discount
                                    </th>

                                    <th>
                                        Order Rules
                                    </th>

                                    <th>
                                        Usage
                                    </th>

                                    <th>
                                        Validity
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

                                {filteredCoupons.map(
                                    (coupon) => {
                                        const usage =
                                            getUsagePercentage(
                                                coupon
                                            );

                                        return (
                                            <tr
                                                key={
                                                    coupon.CouponID
                                                }
                                            >

                                                {/* COUPON */}
                                                <td>
                                                    <div className="shop-coupon-code-wrap">

                                                        <div className="shop-coupon-code">
                                                            <span>
                                                                {
                                                                    coupon.CouponCode
                                                                }
                                                            </span>

                                                            <button
                                                                onClick={() =>
                                                                    copyCoupon(
                                                                        coupon.CouponCode
                                                                    )
                                                                }
                                                                title="Copy coupon"
                                                            >
                                                                <Copy
                                                                    size={
                                                                        14
                                                                    }
                                                                />
                                                            </button>
                                                        </div>

                                                        <span className="shop-coupon-description">
                                                            {
                                                                coupon.Description ||
                                                                "No description"
                                                            }
                                                        </span>

                                                    </div>
                                                </td>

                                                {/* DISCOUNT */}
                                                <td>
                                                    <div className="shop-coupon-discount">

                                                        <strong>
                                                            {coupon.DiscountType ===
                                                            "Percentage"
                                                                ? `${coupon.DiscountValue}%`
                                                                : formatMoney(
                                                                      coupon.DiscountValue
                                                                  )}
                                                        </strong>

                                                        <span>
                                                            {
                                                                coupon.DiscountType
                                                            }{" "}
                                                            discount
                                                        </span>

                                                    </div>
                                                </td>

                                                {/* RULES */}
                                                <td>
                                                    <div className="shop-coupon-rules">

                                                        <span>
                                                            Min.{" "}
                                                            {formatMoney(
                                                                coupon.MinimumOrderAmount
                                                            )}
                                                        </span>

                                                        {coupon.MaximumDiscountAmount && (
                                                            <span>
                                                                Max.{" "}
                                                                {formatMoney(
                                                                    coupon.MaximumDiscountAmount
                                                                )}
                                                            </span>
                                                        )}

                                                    </div>
                                                </td>

                                                {/* USAGE */}
                                                <td>
                                                    <div className="shop-coupon-usage">

                                                        <div className="shop-coupon-usage-text">
                                                            <strong>
                                                                {
                                                                    coupon.UsedCount
                                                                }
                                                            </strong>

                                                            <span>
                                                                /
                                                                {coupon.UsageLimit ||
                                                                    "∞"}
                                                            </span>
                                                        </div>

                                                        {coupon.UsageLimit && (
                                                            <div className="shop-coupon-progress">
                                                                <span
                                                                    style={{
                                                                        width: `${usage}%`,
                                                                    }}
                                                                ></span>
                                                            </div>
                                                        )}

                                                    </div>
                                                </td>

                                                {/* VALIDITY */}
                                                <td>
                                                    <div className="shop-coupon-validity">

                                                        <CalendarDays
                                                            size={
                                                                15
                                                            }
                                                        />

                                                        <div>
                                                            <span>
                                                                {
                                                                    formatDate(
                                                                        coupon.StartsAt
                                                                    )
                                                                }
                                                            </span>

                                                            <small>
                                                                to{" "}
                                                                {
                                                                    formatDate(
                                                                        coupon.ExpiresAt
                                                                    )
                                                                }
                                                            </small>
                                                        </div>

                                                    </div>
                                                </td>

                                                {/* STATUS */}
                                                <td>
                                                    <button
                                                        className={`shop-coupon-status ${
                                                            coupon.IsActive
                                                                ? "active"
                                                                : "inactive"
                                                        }`}
                                                        onClick={() =>
                                                            toggleStatus(
                                                                coupon
                                                            )
                                                        }
                                                    >
                                                        {coupon.IsActive ? (
                                                            <>
                                                                <ToggleRight
                                                                    size={
                                                                        18
                                                                    }
                                                                />
                                                                Active
                                                            </>
                                                        ) : (
                                                            <>
                                                                <ToggleLeft
                                                                    size={
                                                                        18
                                                                    }
                                                                />
                                                                Inactive
                                                            </>
                                                        )}
                                                    </button>
                                                </td>

                                                {/* ACTIONS */}
                                                <td>
                                                    <div className="shop-coupon-actions">

                                                        <button
                                                            className="edit"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    coupon
                                                                )
                                                            }
                                                            title="Edit coupon"
                                                        >
                                                            <Pencil
                                                                size={
                                                                    17
                                                                }
                                                            />
                                                        </button>

                                                        <button
                                                            className="delete"
                                                            onClick={() =>
                                                                handleDelete(
                                                                    coupon
                                                                )
                                                            }
                                                            title="Delete coupon"
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
                                        );
                                    }
                                )}

                            </tbody>
                        </table>
                    </div>
                )}

            </div>

            {/* MODAL */}
            {showModal && (
                <div
                    className="shop-coupon-modal-overlay"
                    onMouseDown={(e) => {
                        if (
                            e.target ===
                            e.currentTarget
                        ) {
                            closeModal();
                        }
                    }}
                >

                    <div className="shop-coupon-modal">

                        <div className="shop-coupon-modal-header">

                            <div>
                                <span>
                                    {editingCoupon
                                        ? "EDIT COUPON"
                                        : "NEW COUPON"}
                                </span>

                                <h2>
                                    {editingCoupon
                                        ? "Edit Discount Coupon"
                                        : "Create Discount Coupon"}
                                </h2>
                            </div>

                            <button
                                className="coupon-modal-close"
                                onClick={
                                    closeModal
                                }
                            >
                                <X size={21} />
                            </button>

                        </div>

                        <form
                            className="shop-coupon-form"
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <div className="coupon-form-grid">

                                {/* CODE */}
                                <div className="coupon-form-group full">

                                    <label>
                                        Coupon Code{" "}
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        name="couponCode"
                                        value={
                                            form.couponCode
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="WELCOME10"
                                        maxLength={
                                            50
                                        }
                                        required
                                    />

                                    <small>
                                        Customers will
                                        enter this code
                                        at checkout.
                                    </small>

                                </div>

                                {/* DESCRIPTION */}
                                <div className="coupon-form-group full">

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
                                        rows="3"
                                        placeholder="10% welcome discount for new customers..."
                                    />

                                </div>

                                {/* TYPE */}
                                <div className="coupon-form-group">

                                    <label>
                                        Discount Type{" "}
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <select
                                        name="discountType"
                                        value={
                                            form.discountType
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    >
                                        <option value="Percentage">
                                            Percentage
                                        </option>

                                        <option value="Fixed">
                                            Fixed Amount
                                        </option>
                                    </select>

                                </div>

                                {/* VALUE */}
                                <div className="coupon-form-group">

                                    <label>
                                        Discount Value{" "}
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <div className="coupon-input-with-suffix">

                                        <input
                                            type="number"
                                            name="discountValue"
                                            value={
                                                form.discountValue
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            min="0"
                                            step="0.01"
                                            placeholder={
                                                form.discountType ===
                                                "Percentage"
                                                    ? "10"
                                                    : "500"
                                            }
                                            required
                                        />

                                        <span>
                                            {form.discountType ===
                                            "Percentage"
                                                ? "%"
                                                : "₹"}
                                        </span>

                                    </div>

                                </div>

                                {/* MINIMUM */}
                                <div className="coupon-form-group">

                                    <label>
                                        Minimum Order
                                    </label>

                                    <div className="coupon-input-with-prefix">

                                        <span>
                                            ₹
                                        </span>

                                        <input
                                            type="number"
                                            name="minimumOrderAmount"
                                            value={
                                                form.minimumOrderAmount
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            min="0"
                                            step="0.01"
                                            placeholder="500"
                                        />

                                    </div>

                                </div>

                                {/* MAX */}
                                <div className="coupon-form-group">

                                    <label>
                                        Maximum Discount
                                    </label>

                                    <div className="coupon-input-with-prefix">

                                        <span>
                                            ₹
                                        </span>

                                        <input
                                            type="number"
                                            name="maximumDiscountAmount"
                                            value={
                                                form.maximumDiscountAmount
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            min="0"
                                            step="0.01"
                                            placeholder="1000"
                                        />

                                    </div>

                                </div>

                                {/* USAGE LIMIT */}
                                <div className="coupon-form-group">

                                    <label>
                                        Usage Limit
                                    </label>

                                    <input
                                        type="number"
                                        name="usageLimit"
                                        value={
                                            form.usageLimit
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        min="0"
                                        placeholder="100"
                                    />

                                </div>

                                {/* STATUS */}
                                <div className="coupon-form-group">

                                    <label>
                                        Status
                                    </label>

                                    <label className="coupon-toggle-field">

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

                                        <span className="coupon-toggle-slider"></span>

                                        <span>
                                            {form.isActive
                                                ? "Active"
                                                : "Inactive"}
                                        </span>

                                    </label>

                                </div>

                                {/* START */}
                                <div className="coupon-form-group">

                                    <label>
                                        Start Date
                                    </label>

                                    <input
                                        type="date"
                                        name="startsAt"
                                        value={
                                            form.startsAt
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>

                                {/* END */}
                                <div className="coupon-form-group">

                                    <label>
                                        Expiry Date
                                    </label>

                                    <input
                                        type="date"
                                        name="expiresAt"
                                        value={
                                            form.expiresAt
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>

                            </div>

                            {/* PREVIEW */}
                            <div className="coupon-preview">

                                <div className="coupon-preview-left">

                                    <div className="coupon-preview-icon">
                                        <TicketPercent
                                            size={
                                                22
                                            }
                                        />
                                    </div>

                                    <div>
                                        <span>
                                            COUPON
                                        </span>

                                        <strong>
                                            {form.couponCode ||
                                                "YOURCODE"}
                                        </strong>
                                    </div>

                                </div>

                                <div className="coupon-preview-discount">

                                    <strong>
                                        {form.discountValue
                                            ? form.discountType ===
                                              "Percentage"
                                                ? `${form.discountValue}%`
                                                : formatMoney(
                                                      form.discountValue
                                                  )
                                            : "10%"}
                                    </strong>

                                    <span>
                                        OFF
                                    </span>

                                </div>

                            </div>

                            {/* FOOTER */}
                            <div className="shop-coupon-modal-footer">

                                <button
                                    type="button"
                                    className="coupon-cancel-btn"
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
                                    className="coupon-save-btn"
                                    disabled={
                                        saving
                                    }
                                >
                                    {saving
                                        ? "Saving..."
                                        : editingCoupon
                                        ? "Update Coupon"
                                        : "Create Coupon"}
                                </button>

                            </div>

                        </form>

                    </div>
                </div>
            )}

        </div>
    );
};

export default ShopCoupons;