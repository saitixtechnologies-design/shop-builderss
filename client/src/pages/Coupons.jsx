import { useEffect, useMemo, useState } from "react";

import {
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    TicketPercent,
    Store,
    RefreshCw,
    AlertTriangle,
    Eye,
    EyeOff,
    CalendarDays,
    Percent,
    IndianRupee,
    Users,
    CheckCircle2,
    Clock3,
    Ban,
} from "lucide-react";

import { toast } from "react-toastify";
import { adminFetch as fetch, API_ORIGIN } from "../lib/api.js";

import "../styles/Coupons.css";


// =====================================================
// API
// =====================================================

const COUPONS_API = `${API_ORIGIN}/api/coupons`;
const SHOPS_API = `${API_ORIGIN}/api/shops`;


// =====================================================
// INITIAL FORM
// =====================================================

const initialForm = {
    shopID: "",
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


// =====================================================
// DATE FORMAT
// =====================================================

const formatDate = (dateValue) => {
    if (!dateValue) return "—";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "—";
    }

    return date.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
    });
};


// =====================================================
// INPUT DATE FORMAT
// =====================================================

const formatDateForInput = (dateValue) => {
    if (!dateValue) return "";

    const date = new Date(dateValue);

    if (Number.isNaN(date.getTime())) {
        return "";
    }

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
};


// =====================================================
// CURRENCY
// =====================================================

const formatCurrency = (value) => {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "₹0";
    }

    return `₹${Number(value).toLocaleString("en-IN")}`;
};


// =====================================================
// COMPONENT
// =====================================================

function Coupons() {

    // -------------------------------------------------
    // STATE
    // -------------------------------------------------

    const [coupons, setCoupons] = useState([]);
    const [shops, setShops] = useState([]);

    const [loading, setLoading] = useState(true);
    const [shopsLoading, setShopsLoading] = useState(true);

    const [refreshing, setRefreshing] = useState(false);

    const [error, setError] = useState("");

    const [search, setSearch] = useState("");
    const [shopFilter, setShopFilter] = useState("");
    const [statusFilter, setStatusFilter] = useState("");

    const [showModal, setShowModal] = useState(false);
    const [editingCoupon, setEditingCoupon] = useState(null);

    const [form, setForm] = useState(initialForm);

    const [saving, setSaving] = useState(false);

    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const [couponToDelete, setCouponToDelete] = useState(null);
    const [deletingID, setDeletingID] = useState(null);

    const [togglingID, setTogglingID] = useState(null);


    // =================================================
    // FETCH SHOPS
    // =================================================

    const fetchShops = async () => {
        try {
            setShopsLoading(true);

            const response = await fetch(SHOPS_API);

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
            setShopsLoading(false);
        }
    };


    // =================================================
    // FETCH COUPONS
    // =================================================

    const fetchCoupons = async (
        showRefreshLoader = false
    ) => {

        try {

            if (showRefreshLoader) {
                setRefreshing(true);
            } else {
                setLoading(true);
            }

            setError("");

            const response = await fetch(COUPONS_API);

            const data = await response.json();

            if (!response.ok || !data.success) {
                throw new Error(
                    data.message ||
                    "Failed to fetch coupons."
                );
            }

            setCoupons(data.data || []);

        } catch (error) {

            console.error(
                "Fetch Coupons Error:",
                error
            );

            setError(
                error.message ||
                "Failed to load coupons."
            );

            toast.error(
                error.message ||
                "Failed to load coupons."
            );

        } finally {

            setLoading(false);
            setRefreshing(false);

        }
    };


    // =================================================
    // INITIAL LOAD
    // =================================================

    useEffect(() => {
        fetchCoupons();
        fetchShops();
    }, []);


    // =================================================
    // FORM CHANGE
    // =================================================

    const handleChange = (event) => {

        const {
            name,
            value,
            type,
            checked,
        } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]:
                type === "checkbox"
                    ? checked
                    : value,
        }));
    };


    // =================================================
    // OPEN ADD MODAL
    // =================================================

    const openAddModal = () => {

        setEditingCoupon(null);

        setForm({
            ...initialForm,
            shopID: shopFilter || "",
        });

        setShowModal(true);
    };


    // =================================================
    // OPEN EDIT MODAL
    // =================================================

    const openEditModal = (coupon) => {

        setEditingCoupon(coupon);

        setForm({
            shopID: coupon.ShopID
                ? String(coupon.ShopID)
                : "",

            couponCode:
                coupon.CouponCode || "",

            description:
                coupon.Description || "",

            discountType:
                coupon.DiscountType || "Percentage",

            discountValue:
                coupon.DiscountValue ??
                "",

            minimumOrderAmount:
                coupon.MinimumOrderAmount ??
                "",

            maximumDiscountAmount:
                coupon.MaximumDiscountAmount ??
                "",

            usageLimit:
                coupon.UsageLimit ??
                "",

            startsAt:
                formatDateForInput(
                    coupon.StartsAt
                ),

            expiresAt:
                formatDateForInput(
                    coupon.ExpiresAt
                ),

            isActive:
                Boolean(coupon.IsActive),
        });

        setShowModal(true);
    };


    // =================================================
    // CLOSE MODAL
    // =================================================

    const closeModal = () => {

        if (saving) return;

        setShowModal(false);

        setEditingCoupon(null);

        setForm(initialForm);
    };


    // =================================================
    // VALIDATION
    // =================================================

    const validateForm = () => {

        if (!form.shopID) {
            toast.error("Please select a shop.");
            return false;
        }

        if (!form.couponCode.trim()) {
            toast.error("Coupon code is required.");
            return false;
        }

        if (!form.discountValue) {
            toast.error("Discount value is required.");
            return false;
        }

        const discountValue =
            Number(form.discountValue);

        if (
            Number.isNaN(discountValue) ||
            discountValue < 0
        ) {
            toast.error(
                "Enter a valid discount value."
            );

            return false;
        }

        if (
            form.discountType === "Percentage" &&
            discountValue > 100
        ) {
            toast.error(
                "Percentage discount cannot exceed 100%."
            );

            return false;
        }

        if (
            form.startsAt &&
            form.expiresAt
        ) {

            const start =
                new Date(form.startsAt);

            const end =
                new Date(form.expiresAt);

            if (end < start) {
                toast.error(
                    "Expiry date cannot be before start date."
                );

                return false;
            }
        }

        return true;
    };


    // =================================================
    // SAVE COUPON
    // =================================================

    const handleSubmit = async (event) => {

        event.preventDefault();

        if (!validateForm()) {
            return;
        }

        try {

            setSaving(true);

            const payload = {
                shopID: Number(form.shopID),

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
                    form.minimumOrderAmount
                        ? Number(
                            form.minimumOrderAmount
                        )
                        : null,

                maximumDiscountAmount:
                    form.maximumDiscountAmount
                        ? Number(
                            form.maximumDiscountAmount
                        )
                        : null,

                usageLimit:
                    form.usageLimit
                        ? Number(form.usageLimit)
                        : null,

                startsAt:
                    form.startsAt || null,

                expiresAt:
                    form.expiresAt || null,

                isActive:
                    Boolean(form.isActive),
            };


            const url = editingCoupon
                ? `${COUPONS_API}/${editingCoupon.CouponID}`
                : COUPONS_API;

            const method = editingCoupon
                ? "PUT"
                : "POST";


            const response = await fetch(url, {
                method,

                headers: {
                    "Content-Type":
                        "application/json",
                },

                body: JSON.stringify(payload),
            });


            const data =
                await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Failed to save coupon."
                );
            }


            toast.success(
                editingCoupon
                    ? "Coupon updated successfully."
                    : "Coupon created successfully."
            );


            closeModal();

            await fetchCoupons();

        } catch (error) {

            console.error(
                "Save Coupon Error:",
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


    // =================================================
    // DELETE MODAL
    // =================================================

    const openDeleteModal = (coupon) => {

        setCouponToDelete(coupon);

        setShowDeleteModal(true);
    };


    const closeDeleteModal = () => {

        if (deletingID) return;

        setShowDeleteModal(false);

        setCouponToDelete(null);
    };


    // =================================================
    // DELETE COUPON
    // =================================================

    const handleDelete = async () => {

        if (!couponToDelete) {
            return;
        }

        const couponID =
            couponToDelete.CouponID;

        const shopID =
            couponToDelete.ShopID;

        try {

            setDeletingID(couponID);

            const response = await fetch(
                `${COUPONS_API}/${couponID}?shopID=${shopID}`,
                {
                    method: "DELETE",
                }
            );


            const data =
                await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Failed to delete coupon."
                );
            }


            toast.success(
                "Coupon deleted successfully."
            );


            setShowDeleteModal(false);

            setCouponToDelete(null);

            await fetchCoupons();

        } catch (error) {

            console.error(
                "Delete Coupon Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to delete coupon."
            );

        } finally {

            setDeletingID(null);

        }
    };


    // =================================================
    // TOGGLE STATUS
    // =================================================

    const handleToggleStatus = async (coupon) => {

        const couponID =
            coupon.CouponID;

        const shopID =
            coupon.ShopID;

        try {

            setTogglingID(couponID);

            const response = await fetch(
                `${COUPONS_API}/${couponID}/status`,
                {
                    method: "PATCH",

                    headers: {
                        "Content-Type":
                            "application/json",
                    },

                    body: JSON.stringify({
                        shopID,
                    }),
                }
            );


            const data =
                await response.json();


            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Failed to update coupon status."
                );
            }


            toast.success(
                data.message ||
                "Coupon status updated."
            );


            await fetchCoupons();

        } catch (error) {

            console.error(
                "Toggle Coupon Error:",
                error
            );

            toast.error(
                error.message ||
                "Failed to update coupon status."
            );

        } finally {

            setTogglingID(null);

        }
    };


    // =================================================
    // FILTERED COUPONS
    // =================================================

    const filteredCoupons = useMemo(() => {

        const searchValue =
            search
                .trim()
                .toLowerCase();


        return coupons.filter((coupon) => {

            const matchesSearch =
                !searchValue ||
                coupon.CouponCode
                    ?.toLowerCase()
                    .includes(searchValue) ||
                coupon.Description
                    ?.toLowerCase()
                    .includes(searchValue) ||
                coupon.ShopName
                    ?.toLowerCase()
                    .includes(searchValue);


            const matchesShop =
                !shopFilter ||
                String(coupon.ShopID) ===
                    String(shopFilter);


            const matchesStatus =
                !statusFilter ||
                (
                    statusFilter === "Active"
                        ? Boolean(coupon.IsActive)
                        : !coupon.IsActive
                );


            return (
                matchesSearch &&
                matchesShop &&
                matchesStatus
            );
        });

    }, [
        coupons,
        search,
        shopFilter,
        statusFilter,
    ]);


    // =================================================
    // STATS
    // =================================================

    const totalCoupons =
        coupons.length;

    const activeCoupons =
        coupons.filter(
            (coupon) =>
                Boolean(coupon.IsActive)
        ).length;

    const inactiveCoupons =
        totalCoupons -
        activeCoupons;

    const totalUsage =
        coupons.reduce(
            (total, coupon) =>
                total +
                Number(
                    coupon.UsedCount || 0
                ),
            0
        );


    // =================================================
    // RENDER
    // =================================================

    return (
        <div className="coupons-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="coupons-page-header">

                <div>
                    <div className="coupons-breadcrumb">
                        Super Admin
                        <span>/</span>
                        Coupons
                    </div>

                    <h1>
                        Coupons & Offers
                    </h1>

                    <p>
                        Manage shop-wise discount
                        coupons and promotional offers.
                    </p>
                </div>

                <div className="coupons-header-actions">

                    <button
                        type="button"
                        className="coupons-refresh-btn"
                        onClick={() =>
                            fetchCoupons(true)
                        }
                        disabled={refreshing}
                    >
                        <RefreshCw
                            size={17}
                            className={
                                refreshing
                                    ? "coupons-spin"
                                    : ""
                            }
                        />

                        Refresh
                    </button>

                    <button
                        type="button"
                        className="coupons-add-btn"
                        onClick={openAddModal}
                    >
                        <Plus size={19} />

                        Add Coupon
                    </button>

                </div>

            </div>


            {/* =================================================
                STATS
            ================================================= */}

            <div className="coupons-stats-grid">

                <div className="coupon-stat-card">

                    <div className="coupon-stat-icon purple">
                        <TicketPercent size={22} />
                    </div>

                    <div>
                        <span>
                            Total Coupons
                        </span>

                        <strong>
                            {totalCoupons}
                        </strong>
                    </div>

                </div>


                <div className="coupon-stat-card">

                    <div className="coupon-stat-icon green">
                        <CheckCircle2 size={22} />
                    </div>

                    <div>
                        <span>
                            Active Coupons
                        </span>

                        <strong>
                            {activeCoupons}
                        </strong>
                    </div>

                </div>


                <div className="coupon-stat-card">

                    <div className="coupon-stat-icon orange">
                        <Ban size={22} />
                    </div>

                    <div>
                        <span>
                            Inactive
                        </span>

                        <strong>
                            {inactiveCoupons}
                        </strong>
                    </div>

                </div>


                <div className="coupon-stat-card">

                    <div className="coupon-stat-icon blue">
                        <Users size={22} />
                    </div>

                    <div>
                        <span>
                            Total Usage
                        </span>

                        <strong>
                            {totalUsage}
                        </strong>
                    </div>

                </div>

            </div>


            {/* =================================================
                FILTER BAR
            ================================================= */}

            <div className="coupons-toolbar">

                <div className="coupon-search">

                    <Search size={18} />

                    <input
                        type="text"
                        placeholder="Search coupon, shop..."
                        value={search}
                        onChange={(event) =>
                            setSearch(
                                event.target.value
                            )
                        }
                    />

                    {search && (
                        <button
                            type="button"
                            onClick={() =>
                                setSearch("")
                            }
                        >
                            <X size={16} />
                        </button>
                    )}

                </div>


                <div className="coupon-filter">

                    <Store size={17} />

                    <select
                        value={shopFilter}
                        onChange={(event) =>
                            setShopFilter(
                                event.target.value
                            )
                        }
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


                <div className="coupon-filter">

                    <TicketPercent size={17} />

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

                        <option value="Active">
                            Active
                        </option>

                        <option value="Inactive">
                            Inactive
                        </option>

                    </select>

                </div>

            </div>


            {/* =================================================
                ERROR
            ================================================= */}

            {error && !loading && (

                <div className="coupons-error">

                    <AlertTriangle size={20} />

                    <div>
                        <strong>
                            Unable to load coupons
                        </strong>

                        <span>
                            {error}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={() =>
                            fetchCoupons()
                        }
                    >
                        Try Again
                    </button>

                </div>

            )}


            {/* =================================================
                TABLE
            ================================================= */}

            <div className="coupons-table-card">

                <div className="coupons-table-header">

                    <div>

                        <h2>
                            Coupon List
                        </h2>

                        <span>
                            {filteredCoupons.length}
                            {" "}
                            coupon
                            {filteredCoupons.length !== 1
                                ? "s"
                                : ""}
                        </span>

                    </div>

                    <div className="coupon-table-badge">
                        <TicketPercent size={15} />

                        Promotional Offers
                    </div>

                </div>


                {loading ? (

                    <div className="coupons-loading">

                        <div className="coupons-loader" />

                        <span>
                            Loading coupons...
                        </span>

                    </div>

                ) : filteredCoupons.length === 0 ? (

                    <div className="coupons-empty">

                        <div className="coupons-empty-icon">
                            <TicketPercent
                                size={32}
                            />
                        </div>

                        <h3>
                            No coupons found
                        </h3>

                        <p>
                            Create your first coupon
                            to start offering discounts.
                        </p>

                        <button
                            type="button"
                            onClick={openAddModal}
                        >
                            <Plus size={17} />
                            Add Coupon
                        </button>

                    </div>

                ) : (

                    <div className="coupons-table-wrapper">

                        <table className="coupons-table">

                            <thead>

                                <tr>

                                    <th>
                                        Coupon
                                    </th>

                                    <th>
                                        Shop
                                    </th>

                                    <th>
                                        Discount
                                    </th>

                                    <th>
                                        Order Rules
                                    </th>

                                    <th>
                                        Validity
                                    </th>

                                    <th>
                                        Usage
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

                                        const isActive =
                                            Boolean(
                                                coupon.IsActive
                                            );

                                        const used =
                                            Number(
                                                coupon.UsedCount ||
                                                0
                                            );

                                        const limit =
                                            coupon.UsageLimit
                                                ? Number(
                                                    coupon.UsageLimit
                                                )
                                                : null;

                                        const usagePercent =
                                            limit
                                                ? Math.min(
                                                    100,
                                                    (
                                                        used /
                                                        limit
                                                    ) * 100
                                                )
                                                : 0;


                                        return (

                                            <tr
                                                key={
                                                    coupon.CouponID
                                                }
                                            >

                                                {/* COUPON */}

                                                <td>

                                                    <div className="coupon-code-cell">

                                                        <div className="coupon-code-icon">
                                                            <TicketPercent
                                                                size={18}
                                                            />
                                                        </div>

                                                        <div>

                                                            <strong>
                                                                {
                                                                    coupon.CouponCode
                                                                }
                                                            </strong>

                                                            <span>
                                                                {
                                                                    coupon.Description ||
                                                                    "No description"
                                                                }
                                                            </span>

                                                        </div>

                                                    </div>

                                                </td>


                                                {/* SHOP */}

                                                <td>

                                                    <div className="coupon-shop-cell">

                                                        <Store
                                                            size={16}
                                                        />

                                                        <span>
                                                            {
                                                                coupon.ShopName ||
                                                                `Shop #${coupon.ShopID}`
                                                            }
                                                        </span>

                                                    </div>

                                                </td>


                                                {/* DISCOUNT */}

                                                <td>

                                                    <div className="coupon-discount-cell">

                                                        <strong>

                                                            {coupon.DiscountType ===
                                                            "Percentage"
                                                                ? `${coupon.DiscountValue}%`
                                                                : formatCurrency(
                                                                    coupon.DiscountValue
                                                                )}

                                                        </strong>

                                                        <span>

                                                            {coupon.DiscountType ===
                                                            "Percentage"
                                                                ? "Percentage"
                                                                : "Fixed Amount"}

                                                        </span>

                                                    </div>

                                                </td>


                                                {/* ORDER RULES */}

                                                <td>

                                                    <div className="coupon-rules-cell">

                                                        <span>
                                                            Min:{" "}
                                                            <strong>
                                                                {
                                                                    coupon.MinimumOrderAmount
                                                                        ? formatCurrency(
                                                                            coupon.MinimumOrderAmount
                                                                        )
                                                                        : "None"
                                                                }
                                                            </strong>
                                                        </span>

                                                        <span>
                                                            Max:{" "}
                                                            <strong>
                                                                {
                                                                    coupon.MaximumDiscountAmount
                                                                        ? formatCurrency(
                                                                            coupon.MaximumDiscountAmount
                                                                        )
                                                                        : "None"
                                                                }
                                                            </strong>
                                                        </span>

                                                    </div>

                                                </td>


                                                {/* VALIDITY */}

                                                <td>

                                                    <div className="coupon-validity-cell">

                                                        <span>
                                                            <CalendarDays
                                                                size={14}
                                                            />

                                                            {
                                                                formatDate(
                                                                    coupon.StartsAt
                                                                )
                                                            }
                                                        </span>

                                                        <span>
                                                            <Clock3
                                                                size={14}
                                                            />

                                                            {
                                                                formatDate(
                                                                    coupon.ExpiresAt
                                                                )
                                                            }
                                                        </span>

                                                    </div>

                                                </td>


                                                {/* USAGE */}

                                                <td>

                                                    <div className="coupon-usage-cell">

                                                        <div className="coupon-usage-top">

                                                            <span>
                                                                {used}
                                                                {" / "}
                                                                {
                                                                    limit ??
                                                                    "∞"
                                                                }
                                                            </span>

                                                            <small>
                                                                Used
                                                            </small>

                                                        </div>

                                                        {limit && (
                                                            <div className="coupon-progress">

                                                                <span
                                                                    style={{
                                                                        width: `${usagePercent}%`,
                                                                    }}
                                                                />

                                                            </div>
                                                        )}

                                                    </div>

                                                </td>


                                                {/* STATUS */}

                                                <td>

                                                    <button
                                                        type="button"
                                                        className={
                                                            `coupon-status-btn ${
                                                                isActive
                                                                    ? "active"
                                                                    : "inactive"
                                                            }`
                                                        }
                                                        onClick={() =>
                                                            handleToggleStatus(
                                                                coupon
                                                            )
                                                        }
                                                        disabled={
                                                            togglingID ===
                                                            coupon.CouponID
                                                        }
                                                    >

                                                        {togglingID ===
                                                        coupon.CouponID ? (

                                                            <span className="coupon-status-loader" />

                                                        ) : isActive ? (

                                                            <Eye size={14} />

                                                        ) : (

                                                            <EyeOff size={14} />

                                                        )}

                                                        {isActive
                                                            ? "Active"
                                                            : "Inactive"}

                                                    </button>

                                                </td>


                                                {/* ACTIONS */}

                                                <td>

                                                    <div className="coupon-actions">

                                                        <button
                                                            type="button"
                                                            className="coupon-action edit"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    coupon
                                                                )
                                                            }
                                                            title="Edit Coupon"
                                                        >
                                                            <Pencil
                                                                size={16}
                                                            />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="coupon-action delete"
                                                            onClick={() =>
                                                                openDeleteModal(
                                                                    coupon
                                                                )
                                                            }
                                                            title="Delete Coupon"
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

            {showModal && (

                <div
                    className="coupon-modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeModal();
                        }

                    }}
                >

                    <div className="coupon-modal">

                        <div className="coupon-modal-header">

                            <div className="coupon-modal-title">

                                <div className="coupon-modal-icon">
                                    <TicketPercent
                                        size={22}
                                    />
                                </div>

                                <div>

                                    <h2>
                                        {editingCoupon
                                            ? "Edit Coupon"
                                            : "Create Coupon"}
                                    </h2>

                                    <p>
                                        {editingCoupon
                                            ? "Update coupon details and settings."
                                            : "Create a promotional discount for a shop."}
                                    </p>

                                </div>

                            </div>


                            <button
                                type="button"
                                className="coupon-modal-close"
                                onClick={closeModal}
                                disabled={saving}
                            >
                                <X size={20} />
                            </button>

                        </div>


                        <form
                            className="coupon-form"
                            onSubmit={handleSubmit}
                        >

                            {/* SHOP */}

                            <div className="coupon-form-group">

                                <label>
                                    Shop
                                    <span>*</span>
                                </label>

                                <div className="coupon-input-with-icon">

                                    <Store size={17} />

                                    <select
                                        name="shopID"
                                        value={form.shopID}
                                        onChange={
                                            handleChange
                                        }
                                        required
                                    >

                                        <option value="">
                                            {shopsLoading
                                                ? "Loading shops..."
                                                : "Select Shop"}
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

                            </div>


                            {/* COUPON CODE */}

                            <div className="coupon-form-group">

                                <label>
                                    Coupon Code
                                    <span>*</span>
                                </label>

                                <input
                                    type="text"
                                    name="couponCode"
                                    value={
                                        form.couponCode
                                    }
                                    onChange={
                                        handleChange
                                    }
                                    placeholder="e.g. WELCOME10"
                                    maxLength={50}
                                    required
                                />

                                <small>
                                    Coupon code will automatically
                                    be converted to uppercase.
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
                                    placeholder="Enter coupon description..."
                                    rows="3"
                                    maxLength={500}
                                />

                            </div>


                            {/* DISCOUNT ROW */}

                            <div className="coupon-form-grid">

                                <div className="coupon-form-group">

                                    <label>
                                        Discount Type
                                        <span>*</span>
                                    </label>

                                    <div className="coupon-input-with-icon">

                                        {form.discountType ===
                                        "Percentage" ? (
                                            <Percent
                                                size={17}
                                            />
                                        ) : (
                                            <IndianRupee
                                                size={17}
                                            />
                                        )}

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

                                </div>


                                <div className="coupon-form-group">

                                    <label>
                                        Discount Value
                                        <span>*</span>
                                    </label>

                                    <div className="coupon-input-with-icon">

                                        {form.discountType ===
                                        "Percentage" ? (
                                            <Percent
                                                size={17}
                                            />
                                        ) : (
                                            <IndianRupee
                                                size={17}
                                            />
                                        )}

                                        <input
                                            type="number"
                                            name="discountValue"
                                            value={
                                                form.discountValue
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder={
                                                form.discountType ===
                                                "Percentage"
                                                    ? "10"
                                                    : "500"
                                            }
                                            min="0"
                                            max={
                                                form.discountType ===
                                                "Percentage"
                                                    ? "100"
                                                    : undefined
                                            }
                                            step="0.01"
                                            required
                                        />

                                    </div>

                                </div>

                            </div>


                            {/* ORDER RULES */}

                            <div className="coupon-form-grid">

                                <div className="coupon-form-group">

                                    <label>
                                        Minimum Order Amount
                                    </label>

                                    <div className="coupon-input-with-icon">

                                        <IndianRupee
                                            size={17}
                                        />

                                        <input
                                            type="number"
                                            name="minimumOrderAmount"
                                            value={
                                                form.minimumOrderAmount
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="500"
                                            min="0"
                                            step="0.01"
                                        />

                                    </div>

                                </div>


                                <div className="coupon-form-group">

                                    <label>
                                        Maximum Discount
                                    </label>

                                    <div className="coupon-input-with-icon">

                                        <IndianRupee
                                            size={17}
                                        />

                                        <input
                                            type="number"
                                            name="maximumDiscountAmount"
                                            value={
                                                form.maximumDiscountAmount
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            placeholder="1000"
                                            min="0"
                                            step="0.01"
                                        />

                                    </div>

                                </div>

                            </div>


                            {/* USAGE */}

                            <div className="coupon-form-group">

                                <label>
                                    Usage Limit
                                </label>

                                <div className="coupon-input-with-icon">

                                    <Users size={17} />

                                    <input
                                        type="number"
                                        name="usageLimit"
                                        value={
                                            form.usageLimit
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="100"
                                        min="1"
                                    />

                                </div>

                                <small>
                                    Leave empty for unlimited usage.
                                </small>

                            </div>


                            {/* DATE */}

                            <div className="coupon-form-grid">

                                <div className="coupon-form-group">

                                    <label>
                                        Start Date
                                    </label>

                                    <div className="coupon-input-with-icon">

                                        <CalendarDays
                                            size={17}
                                        />

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

                                </div>


                                <div className="coupon-form-group">

                                    <label>
                                        Expiry Date
                                    </label>

                                    <div className="coupon-input-with-icon">

                                        <CalendarDays
                                            size={17}
                                        />

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

                            </div>


                            {/* STATUS */}

                            <div className="coupon-active-toggle">

                                <div>

                                    <strong>
                                        Coupon Status
                                    </strong>

                                    <span>
                                        {form.isActive
                                            ? "Coupon is active and available."
                                            : "Coupon is inactive and unavailable."}
                                    </span>

                                </div>

                                <label className="coupon-switch">

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

                                    <span />

                                </label>

                            </div>


                            {/* FOOTER */}

                            <div className="coupon-modal-footer">

                                <button
                                    type="button"
                                    className="coupon-cancel-btn"
                                    onClick={closeModal}
                                    disabled={saving}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="submit"
                                    className="coupon-save-btn"
                                    disabled={saving}
                                >

                                    {saving ? (
                                        <>
                                            <span className="coupon-button-loader" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2
                                                size={17}
                                            />

                                            {editingCoupon
                                                ? "Update Coupon"
                                                : "Create Coupon"}
                                        </>
                                    )}

                                </button>

                            </div>

                        </form>

                    </div>

                </div>

            )}


            {/* =================================================
                DELETE MODAL
            ================================================= */}

            {showDeleteModal &&
                couponToDelete && (

                    <div
                        className="coupon-delete-overlay"
                        onMouseDown={(event) => {

                            if (
                                event.target ===
                                event.currentTarget &&
                                !deletingID
                            ) {
                                closeDeleteModal();
                            }

                        }}
                    >

                        <div className="coupon-delete-modal">

                            <button
                                type="button"
                                className="coupon-delete-close"
                                onClick={
                                    closeDeleteModal
                                }
                                disabled={Boolean(
                                    deletingID
                                )}
                            >
                                <X size={18} />
                            </button>


                            <div className="coupon-delete-icon">
                                <AlertTriangle
                                    size={28}
                                />
                            </div>


                            <h2>
                                Delete Coupon?
                            </h2>

                            <p>
                                Are you sure you want to
                                delete coupon{" "}
                                <strong>
                                    {
                                        couponToDelete.CouponCode
                                    }
                                </strong>
                                ? This action cannot be
                                undone.
                            </p>


                            <div className="coupon-delete-info">

                                <TicketPercent
                                    size={17}
                                />

                                <div>

                                    <strong>
                                        {
                                            couponToDelete.CouponCode
                                        }
                                    </strong>

                                    <span>
                                        {
                                            couponToDelete.ShopName ||
                                            `Shop #${couponToDelete.ShopID}`
                                        }
                                    </span>

                                </div>

                            </div>


                            <div className="coupon-delete-actions">

                                <button
                                    type="button"
                                    className="coupon-delete-cancel"
                                    onClick={
                                        closeDeleteModal
                                    }
                                    disabled={Boolean(
                                        deletingID
                                    )}
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="coupon-delete-confirm"
                                    onClick={
                                        handleDelete
                                    }
                                    disabled={Boolean(
                                        deletingID
                                    )}
                                >

                                    {deletingID ? (
                                        <>
                                            <span className="coupon-button-loader" />
                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2
                                                size={17}
                                            />
                                            Delete Coupon
                                        </>
                                    )}

                                </button>

                            </div>

                        </div>

                    </div>

                )}

        </div>
    );
}

export default Coupons;
