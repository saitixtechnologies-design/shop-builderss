import { useEffect, useMemo, useState } from "react";

import {
    Plus,
    Search,
    Pencil,
    Trash2,
    X,
    Image as ImageIcon,
    Store,
    RefreshCw,
    AlertTriangle,
    ExternalLink,
    LayoutDashboard,
    Eye,
    EyeOff,
    CalendarDays,
    ArrowUpDown,
} from "lucide-react";

import { toast } from "react-toastify";

import "../styles/Banners.css";
import ImageGalleryField from "../components/ImageGalleryField.jsx";
import { adminFetch as fetch, API_ORIGIN } from "../lib/api.js";


/* =====================================================
   API
===================================================== */

const BANNERS_API =
    `${API_ORIGIN}/api/banners`;

const SHOPS_API =
    `${API_ORIGIN}/api/shops`;


/* =====================================================
   DEFAULT FORM
===================================================== */

const initialForm = {
    shopID: "",
    title: "",
    subtitle: "",
    imageURL: "",
    buttonText: "",
    buttonLink: "",
    displayOrder: 0,
    status: "Active",
    startDate: "",
    endDate: "",
};


function Banners() {

    /* =====================================================
       DATA STATE
    ===================================================== */

    const [banners, setBanners] = useState([]);
    const [shops, setShops] = useState([]);

    const [loading, setLoading] = useState(true);
    const [shopsLoading, setShopsLoading] =
        useState(true);

    const [error, setError] = useState("");


    /* =====================================================
       FILTER STATE
    ===================================================== */

    const [search, setSearch] = useState("");
    const [shopFilter, setShopFilter] =
        useState("all");

    const [statusFilter, setStatusFilter] =
        useState("all");


    /* =====================================================
       MODAL STATE
    ===================================================== */

    const [showModal, setShowModal] =
        useState(false);

    const [editingBanner, setEditingBanner] =
        useState(null);

    const [showDeleteModal, setShowDeleteModal] =
        useState(false);

    const [bannerToDelete, setBannerToDelete] =
        useState(null);


    /* =====================================================
       ACTION STATE
    ===================================================== */

    const [saving, setSaving] =
        useState(false);

    const [deletingID, setDeletingID] =
        useState(null);

    const [togglingID, setTogglingID] =
        useState(null);


    /* =====================================================
       FORM
    ===================================================== */

    const [formData, setFormData] =
        useState(initialForm);


    /* =====================================================
       FETCH BANNERS
    ===================================================== */

    const fetchBanners = async () => {

        try {

            setLoading(true);
            setError("");

            const response =
                await fetch(BANNERS_API);

            const data =
                await response.json();

            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Failed to load banners."
                );
            }

            setBanners(
                Array.isArray(data.data)
                    ? data.data
                    : []
            );

        } catch (err) {

            console.error(
                "Fetch Banners Error:",
                err
            );

            setError(
                err.message ||
                "Unable to connect to server."
            );

            toast.error(
                err.message ||
                "Failed to load banners."
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

            if (!response.ok || !data.success) {

                throw new Error(
                    data.message ||
                    "Failed to load shops."
                );
            }

            setShops(
                Array.isArray(data.data)
                    ? data.data
                    : []
            );

        } catch (err) {

            console.error(
                "Fetch Shops Error:",
                err
            );

            toast.error(
                err.message ||
                "Failed to load shops."
            );

        } finally {

            setShopsLoading(false);
        }
    };


    /* =====================================================
       INITIAL LOAD
    ===================================================== */

    useEffect(() => {

        fetchBanners();
        fetchShops();

    }, []);


    /* =====================================================
       SHOP NAME
    ===================================================== */

    const getShopName = (shopID) => {

        const shop =
            shops.find(
                (item) =>
                    Number(
                        item.ShopID
                    ) ===
                    Number(shopID)
            );

        return (
            shop?.ShopName ||
            `Shop #${shopID}`
        );
    };


    /* =====================================================
       FORM CHANGE
    ===================================================== */

    const handleChange = (event) => {

        const {
            name,
            value,
        } = event.target;

        setFormData(
            (prev) => ({
                ...prev,
                [name]: value,
            })
        );
    };


    /* =====================================================
       OPEN ADD MODAL
    ===================================================== */

    const openAddModal = () => {

        setEditingBanner(null);

        setFormData({
            ...initialForm,
            shopID:
                shopFilter !== "all"
                    ? shopFilter
                    : "",
        });

        setShowModal(true);
    };


    /* =====================================================
       OPEN EDIT MODAL
    ===================================================== */

    const openEditModal = (banner) => {

        setEditingBanner(banner);

        setFormData({

            shopID:
                banner.ShopID ??
                "",

            title:
                banner.Title ??
                "",

            subtitle:
                banner.Subtitle ??
                "",

            imageURL:
                banner.ImageURL ??
                "",

            buttonText:
                banner.ButtonText ??
                "",

            buttonLink:
                banner.ButtonLink ??
                "",

            displayOrder:
                banner.DisplayOrder ??
                0,

            status:
                banner.Status ===
                "Inactive"
                    ? "Inactive"
                    : "Active",

            startDate:
                formatDateForInput(
                    banner.StartDate
                ),

            endDate:
                formatDateForInput(
                    banner.EndDate
                ),
        });

        setShowModal(true);
    };


    /* =====================================================
       CLOSE MODAL
    ===================================================== */

    const closeModal = () => {

        if (saving) return;

        setShowModal(false);

        setEditingBanner(null);

        setFormData(initialForm);
    };


    /* =====================================================
       FORMAT DATE FOR INPUT
    ===================================================== */

    const formatDateForInput = (date) => {

        if (!date) return "";

        const parsed =
            new Date(date);

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return "";
        }

        const year =
            parsed.getFullYear();

        const month =
            String(
                parsed.getMonth() + 1
            ).padStart(2, "0");

        const day =
            String(
                parsed.getDate()
            ).padStart(2, "0");

        return `${year}-${month}-${day}`;
    };


    /* =====================================================
       SAVE BANNER
    ===================================================== */

    const handleSubmit = async (event) => {

        event.preventDefault();


        /* ---------------- VALIDATION ---------------- */

        if (!formData.shopID) {

            toast.error(
                "Please select a shop."
            );

            return;
        }


        if (!formData.title.trim()) {

            toast.error(
                "Banner title is required."
            );

            return;
        }


        if (
            formData.displayOrder !== "" &&
            Number(formData.displayOrder) < 0
        ) {

            toast.error(
                "Display order cannot be negative."
            );

            return;
        }


        if (
            formData.startDate &&
            formData.endDate &&
            new Date(formData.startDate) >
            new Date(formData.endDate)
        ) {

            toast.error(
                "Start date cannot be greater than end date."
            );

            return;
        }


        /* ---------------- PAYLOAD ---------------- */

        const payload = {

            shopID:
                Number(
                    formData.shopID
                ),

            title:
                formData.title.trim(),

            subtitle:
                formData.subtitle.trim(),

            imageURL:
                formData.imageURL.trim(),

            buttonText:
                formData.buttonText.trim(),

            buttonLink:
                formData.buttonLink.trim(),

            displayOrder:
                formData.displayOrder === ""
                    ? 0
                    : Number(
                        formData.displayOrder
                    ),

            status:
                formData.status ===
                "Inactive"
                    ? "Inactive"
                    : "Active",

            startDate:
                formData.startDate
                    ? `${formData.startDate}T00:00:00`
                    : null,

            endDate:
                formData.endDate
                    ? `${formData.endDate}T23:59:59`
                    : null,
        };


        try {

            setSaving(true);

            const isEdit =
                Boolean(
                    editingBanner
                );

            const url =
                isEdit
                    ? `${BANNERS_API}/${editingBanner.BannerID}`
                    : BANNERS_API;

            const response =
                await fetch(
                    url,
                    {
                        method:
                            isEdit
                                ? "PUT"
                                : "POST",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify(
                                payload
                            ),
                    }
                );

            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    (
                        isEdit
                            ? "Failed to update banner."
                            : "Failed to create banner."
                    )
                );
            }


            toast.success(
                data.message ||
                (
                    isEdit
                        ? "Banner updated successfully."
                        : "Banner created successfully."
                )
            );


            closeModal();

            await fetchBanners();

        } catch (err) {

            console.error(
                "Save Banner Error:",
                err
            );

            toast.error(
                err.message ||
                "Unable to save banner."
            );

        } finally {

            setSaving(false);
        }
    };


    /* =====================================================
       DELETE MODAL
    ===================================================== */

    const openDeleteModal = (banner) => {

        setBannerToDelete(banner);

        setShowDeleteModal(true);
    };


    const closeDeleteModal = () => {

        if (deletingID) return;

        setShowDeleteModal(false);

        setBannerToDelete(null);
    };


    /* =====================================================
       DELETE BANNER
    ===================================================== */

    const handleDelete = async () => {

        if (!bannerToDelete) return;

        const bannerID =
            bannerToDelete.BannerID;

        const shopID =
            bannerToDelete.ShopID;


        try {

            setDeletingID(
                bannerID
            );

            const response =
                await fetch(
                    `${BANNERS_API}/${bannerID}?shopID=${shopID}`,
                    {
                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Failed to delete banner."
                );
            }


            setBanners(
                (prev) =>
                    prev.filter(
                        (item) =>
                            Number(
                                item.BannerID
                            ) !==
                            Number(
                                bannerID
                            )
                    )
            );


            toast.success(
                data.message ||
                "Banner deleted successfully."
            );


            setShowDeleteModal(
                false
            );

            setBannerToDelete(
                null
            );

        } catch (err) {

            console.error(
                "Delete Banner Error:",
                err
            );

            toast.error(
                err.message ||
                "Unable to delete banner."
            );

        } finally {

            setDeletingID(null);
        }
    };


    /* =====================================================
       TOGGLE STATUS
    ===================================================== */

    const handleToggleStatus = async (
        banner
    ) => {

        const bannerID =
            banner.BannerID;

        try {

            setTogglingID(
                bannerID
            );

            const response =
                await fetch(
                    `${BANNERS_API}/${bannerID}/status`,
                    {
                        method: "PATCH",

                        headers: {
                            "Content-Type":
                                "application/json",
                        },

                        body:
                            JSON.stringify({
                                shopID:
                                    Number(
                                        banner.ShopID
                                    ),
                            }),
                    }
                );


            const data =
                await response.json();


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Failed to update banner status."
                );
            }


            setBanners(
                (prev) =>
                    prev.map(
                        (item) =>
                            Number(
                                item.BannerID
                            ) ===
                            Number(
                                bannerID
                            )
                                ? {
                                    ...item,
                                    Status:
                                        data
                                            .data
                                            ?.Status ||
                                        (
                                            item.Status ===
                                            "Active"
                                                ? "Inactive"
                                                : "Active"
                                        ),
                                }
                                : item
                    )
            );


            toast.success(
                data.message ||
                "Banner status updated."
            );

        } catch (err) {

            console.error(
                "Toggle Banner Status Error:",
                err
            );

            toast.error(
                err.message ||
                "Unable to update status."
            );

        } finally {

            setTogglingID(null);
        }
    };


    /* =====================================================
       REFRESH
    ===================================================== */

    const handleRefresh = async () => {

        await Promise.all([
            fetchBanners(),
            fetchShops(),
        ]);

        toast.info(
            "Banners list refreshed."
        );
    };


    /* =====================================================
       FILTERED BANNERS
    ===================================================== */

    const filteredBanners =
        useMemo(() => {

            const searchText =
                search
                    .trim()
                    .toLowerCase();

            return banners.filter(
                (banner) => {

                    const shopName =
                        getShopName(
                            banner.ShopID
                        ).toLowerCase();

                    const matchesSearch =
                        !searchText ||
                        banner.Title
                            ?.toLowerCase()
                            .includes(
                                searchText
                            ) ||
                        banner.Subtitle
                            ?.toLowerCase()
                            .includes(
                                searchText
                            ) ||
                        shopName.includes(
                            searchText
                        );

                    const matchesShop =
                        shopFilter ===
                            "all" ||
                        Number(
                            banner.ShopID
                        ) ===
                            Number(
                                shopFilter
                            );

                    const matchesStatus =
                        statusFilter ===
                            "all" ||
                        banner.Status ===
                            statusFilter;

                    return (
                        matchesSearch &&
                        matchesShop &&
                        matchesStatus
                    );
                }
            );

        }, [
            banners,
            search,
            shopFilter,
            statusFilter,
            shops,
        ]);


    /* =====================================================
       DATE FORMAT
    ===================================================== */

    const formatDate = (date) => {

        if (!date) return "—";

        const parsed =
            new Date(date);

        if (
            Number.isNaN(
                parsed.getTime()
            )
        ) {
            return "—";
        }

        return parsed.toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    };


    /* =====================================================
       IMAGE ERROR FALLBACK
    ===================================================== */

    const handleImageError = (
        event
    ) => {

        event.currentTarget.style.display =
            "none";

        const fallback =
            event.currentTarget
                .parentElement
                ?.querySelector(
                    ".banner-image-fallback"
                );

        if (fallback) {
            fallback.style.display =
                "flex";
        }
    };


    /* =====================================================
       RENDER
    ===================================================== */

    return (
        <div className="banners-page">

            {/* =================================================
                HEADER
            ================================================= */}

            <div className="banners-header">

                <div>

                    <div className="banners-breadcrumb">
                        <LayoutDashboard
                            size={14}
                        />

                        <span>
                            Super Admin
                        </span>

                        <span>
                            /
                        </span>

                        <strong>
                            Banners
                        </strong>
                    </div>


                    <h1>
                        Banners
                    </h1>

                    <p>
                        Manage promotional banners
                        for all your shops.
                    </p>

                </div>


                <div className="banners-header-actions">

                    <button
                        type="button"
                        className="banner-refresh-btn"
                        onClick={
                            handleRefresh
                        }
                        disabled={
                            loading
                        }
                    >
                        <RefreshCw
                            size={17}
                            className={
                                loading
                                    ? "spin"
                                    : ""
                            }
                        />

                        Refresh
                    </button>


                    <button
                        type="button"
                        className="banner-add-btn"
                        onClick={
                            openAddModal
                        }
                    >
                        <Plus
                            size={18}
                        />

                        Add Banner
                    </button>

                </div>

            </div>


            {/* =================================================
                STATS
            ================================================= */}

            <div className="banner-stats">

                <div className="banner-stat-card">

                    <div className="banner-stat-icon total">
                        <ImageIcon
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Total Banners
                        </span>

                        <strong>
                            {banners.length}
                        </strong>

                    </div>

                </div>


                <div className="banner-stat-card">

                    <div className="banner-stat-icon active">
                        <Eye
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Active
                        </span>

                        <strong>
                            {
                                banners.filter(
                                    (item) =>
                                        item.Status ===
                                        "Active"
                                ).length
                            }
                        </strong>

                    </div>

                </div>


                <div className="banner-stat-card">

                    <div className="banner-stat-icon inactive">
                        <EyeOff
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Inactive
                        </span>

                        <strong>
                            {
                                banners.filter(
                                    (item) =>
                                        item.Status ===
                                        "Inactive"
                                ).length
                            }
                        </strong>

                    </div>

                </div>


                <div className="banner-stat-card">

                    <div className="banner-stat-icon shops">
                        <Store
                            size={20}
                        />
                    </div>

                    <div>

                        <span>
                            Shops
                        </span>

                        <strong>
                            {shops.length}
                        </strong>

                    </div>

                </div>

            </div>


            {/* =================================================
                FILTER BAR
            ================================================= */}

            <div className="banner-filter-card">

                <div className="banner-search">

                    <Search
                        size={18}
                    />

                    <input
                        type="text"
                        placeholder="Search banner or shop..."
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
                            <X
                                size={15}
                            />
                        </button>
                    )}

                </div>


                <div className="banner-filter-select">

                    <Store
                        size={16}
                    />

                    <select
                        value={shopFilter}
                        onChange={(event) =>
                            setShopFilter(
                                event.target.value
                            )
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

                </div>


                <div className="banner-filter-select">

                    <Eye
                        size={16}
                    />

                    <select
                        value={
                            statusFilter
                        }
                        onChange={(event) =>
                            setStatusFilter(
                                event.target.value
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


                {(search ||
                    shopFilter !== "all" ||
                    statusFilter !== "all") && (

                    <button
                        type="button"
                        className="banner-clear-btn"
                        onClick={() => {
                            setSearch("");
                            setShopFilter(
                                "all"
                            );
                            setStatusFilter(
                                "all"
                            );
                        }}
                    >
                        <X size={15} />
                        Clear
                    </button>

                )}

            </div>


            {/* =================================================
                CONTENT
            ================================================= */}

            <div className="banner-table-card">

                <div className="banner-table-top">

                    <div>

                        <h2>
                            Banner List
                        </h2>

                        <span>
                            Showing{" "}
                            <strong>
                                {
                                    filteredBanners.length
                                }
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {banners.length}
                            </strong>{" "}
                            banners
                        </span>

                    </div>

                </div>


                {loading ? (

                    <div className="banner-state">

                        <div className="banner-loader" />

                        <h3>
                            Loading banners...
                        </h3>

                        <p>
                            Please wait while we
                            fetch your banner data.
                        </p>

                    </div>

                ) : error ? (

                    <div className="banner-state error">

                        <AlertTriangle
                            size={38}
                        />

                        <h3>
                            Unable to load banners
                        </h3>

                        <p>
                            {error}
                        </p>

                        <button
                            type="button"
                            onClick={
                                fetchBanners
                            }
                        >
                            Try Again
                        </button>

                    </div>

                ) : filteredBanners.length ===
                  0 ? (

                    <div className="banner-state">

                        <div className="banner-empty-icon">
                            <ImageIcon
                                size={32}
                            />
                        </div>

                        <h3>
                            No banners found
                        </h3>

                        <p>
                            {banners.length ===
                            0
                                ? "Create your first promotional banner."
                                : "Try changing your search or filters."}
                        </p>

                        {banners.length ===
                            0 && (
                            <button
                                type="button"
                                className="banner-empty-btn"
                                onClick={
                                    openAddModal
                                }
                            >
                                <Plus
                                    size={17}
                                />
                                Add First Banner
                            </button>
                        )}

                    </div>

                ) : (

                    <div className="banner-table-wrapper">

                        <table className="banner-table">

                            <thead>

                                <tr>

                                    <th>
                                        Banner
                                    </th>

                                    <th>
                                        Shop
                                    </th>

                                    <th>
                                        Button
                                    </th>

                                    <th>
                                        Schedule
                                    </th>

                                    <th>
                                        <span className="th-order">
                                            <ArrowUpDown
                                                size={13}
                                            />
                                            Order
                                        </span>
                                    </th>

                                    <th>
                                        Status
                                    </th>

                                    <th className="action-column">
                                        Actions
                                    </th>

                                </tr>

                            </thead>


                            <tbody>

                                {filteredBanners.map(
                                    (banner) => (

                                        <tr
                                            key={
                                                banner.BannerID
                                            }
                                        >

                                            {/* BANNER */}

                                            <td>

                                                <div className="banner-info">

                                                    <div className="banner-thumb">

                                                        {banner.ImageURL ? (

                                                            <>

                                                                <img
                                                                    src={
                                                                        banner.ImageURL
                                                                    }
                                                                    alt={
                                                                        banner.Title
                                                                    }
                                                                    onError={
                                                                        handleImageError
                                                                    }
                                                                />

                                                                <div
                                                                    className="banner-image-fallback"
                                                                    style={{
                                                                        display:
                                                                            "none",
                                                                    }}
                                                                >
                                                                    <ImageIcon
                                                                        size={20}
                                                                    />
                                                                </div>

                                                            </>

                                                        ) : (

                                                            <div className="banner-image-fallback">
                                                                <ImageIcon
                                                                    size={20}
                                                                />
                                                            </div>

                                                        )}

                                                    </div>


                                                    <div className="banner-title-wrap">

                                                        <strong>
                                                            {
                                                                banner.Title
                                                            }
                                                        </strong>

                                                        <span>
                                                            {
                                                                banner.Subtitle ||
                                                                "No subtitle"
                                                            }
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* SHOP */}

                                            <td>

                                                <div className="banner-shop">

                                                    <div className="banner-shop-icon">
                                                        <Store
                                                            size={15}
                                                        />
                                                    </div>

                                                    <div>

                                                        <strong>
                                                            {
                                                                getShopName(
                                                                    banner.ShopID
                                                                )
                                                            }
                                                        </strong>

                                                        <span>
                                                            Shop ID:{" "}
                                                            {
                                                                banner.ShopID
                                                            }
                                                        </span>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* BUTTON */}

                                            <td>

                                                {banner.ButtonText ? (

                                                    <div className="banner-button-preview">

                                                        <span>
                                                            {
                                                                banner.ButtonText
                                                            }
                                                        </span>

                                                        {banner.ButtonLink && (
                                                            <ExternalLink
                                                                size={13}
                                                            />
                                                        )}

                                                    </div>

                                                ) : (

                                                    <span className="muted-text">
                                                        —
                                                    </span>

                                                )}

                                            </td>


                                            {/* SCHEDULE */}

                                            <td>

                                                <div className="banner-schedule">

                                                    <CalendarDays
                                                        size={14}
                                                    />

                                                    <div>

                                                        <span>
                                                            {
                                                                formatDate(
                                                                    banner.StartDate
                                                                )
                                                            }
                                                        </span>

                                                        <small>
                                                            to{" "}
                                                            {
                                                                formatDate(
                                                                    banner.EndDate
                                                                )
                                                            }
                                                        </small>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* ORDER */}

                                            <td>

                                                <span className="banner-order-badge">
                                                    {
                                                        banner.DisplayOrder ??
                                                        0
                                                    }
                                                </span>

                                            </td>


                                            {/* STATUS */}

                                            <td>

                                                <button
                                                    type="button"
                                                    className={`banner-status ${banner.Status === "Active"
                                                        ? "active"
                                                        : "inactive"
                                                        }`}
                                                    onClick={() =>
                                                        handleToggleStatus(
                                                            banner
                                                        )
                                                    }
                                                    disabled={
                                                        togglingID ===
                                                        banner.BannerID
                                                    }
                                                    title="Click to toggle status"
                                                >

                                                    {banner.Status ===
                                                    "Active" ? (
                                                        <Eye
                                                            size={13}
                                                        />
                                                    ) : (
                                                        <EyeOff
                                                            size={13}
                                                        />
                                                    )}

                                                    {togglingID ===
                                                    banner.BannerID
                                                        ? "..."
                                                        : banner.Status}

                                                </button>

                                            </td>


                                            {/* ACTIONS */}

                                            <td>

                                                <div className="banner-actions">

                                                    <button
                                                        type="button"
                                                        className="banner-action edit"
                                                        onClick={() =>
                                                            openEditModal(
                                                                banner
                                                            )
                                                        }
                                                        title="Edit Banner"
                                                    >
                                                        <Pencil
                                                            size={16}
                                                        />
                                                    </button>


                                                    <button
                                                        type="button"
                                                        className="banner-action delete"
                                                        onClick={() =>
                                                            openDeleteModal(
                                                                banner
                                                            )
                                                        }
                                                        title="Delete Banner"
                                                    >
                                                        <Trash2
                                                            size={16}
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
                ADD / EDIT MODAL
            ================================================= */}

            {showModal && (

                <div
                    className="banner-modal-overlay"
                    onMouseDown={(event) => {

                        if (
                            event.target ===
                            event.currentTarget
                        ) {
                            closeModal();
                        }

                    }}
                >

                    <div className="banner-modal">

                        <div className="banner-modal-header">

                            <div>

                                <div className="banner-modal-icon">
                                    <ImageIcon
                                        size={19}
                                    />
                                </div>

                                <div>

                                    <h2>
                                        {editingBanner
                                            ? "Edit Banner"
                                            : "Create Banner"}
                                    </h2>

                                    <p>
                                        {editingBanner
                                            ? "Update your promotional banner details."
                                            : "Create a new promotional banner for your shop."}
                                    </p>

                                </div>

                            </div>


                            <button
                                type="button"
                                className="banner-modal-close"
                                onClick={
                                    closeModal
                                }
                                disabled={
                                    saving
                                }
                            >
                                <X
                                    size={19}
                                />
                            </button>

                        </div>


                        <form
                            onSubmit={
                                handleSubmit
                            }
                        >

                            <div className="banner-modal-body">

                                {/* SHOP */}

                                <div className="banner-form-group full">

                                    <label>
                                        Shop
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <div className="banner-input-icon">

                                        <Store
                                            size={17}
                                        />

                                        <select
                                            name="shopID"
                                            value={
                                                formData.shopID
                                            }
                                            onChange={
                                                handleChange
                                            }
                                            disabled={
                                                shopsLoading ||
                                                Boolean(
                                                    editingBanner
                                                )
                                            }
                                            required
                                        >

                                            <option value="">
                                                {shopsLoading
                                                    ? "Loading shops..."
                                                    : "Select Shop"}
                                            </option>

                                            {shops.map(
                                                (
                                                    shop
                                                ) => (
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

                                    {editingBanner && (
                                        <small className="banner-help-text">
                                            Shop cannot be changed while editing.
                                        </small>
                                    )}

                                </div>


                                {/* TITLE */}

                                <div className="banner-form-group">

                                    <label>
                                        Banner Title
                                        <span>
                                            *
                                        </span>
                                    </label>

                                    <input
                                        type="text"
                                        name="title"
                                        value={
                                            formData.title
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="e.g. Premium CCTV Solutions"
                                        maxLength={
                                            200
                                        }
                                        required
                                    />

                                </div>


                                {/* SUBTITLE */}

                                <div className="banner-form-group">

                                    <label>
                                        Subtitle
                                    </label>

                                    <input
                                        type="text"
                                        name="subtitle"
                                        value={
                                            formData.subtitle
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Short promotional message"
                                        maxLength={
                                            500
                                        }
                                    />

                                </div>


                                {/* IMAGE */}

                                <div className="banner-form-group full">

                                    <ImageGalleryField label="Banner image" multiple={false} value={formData.imageURL ? [formData.imageURL] : []} onChange={(images) => setFormData((prev) => ({ ...prev, imageURL: images[0] || "" }))} shopID={formData.shopID} />

                                </div>


                                {/* IMAGE PREVIEW */}

                                {formData.imageURL && (

                                    <div className="banner-form-preview full">

                                        <div className="banner-preview-label">
                                            <span>
                                                Live Preview
                                            </span>

                                            <a
                                                href={
                                                    formData.imageURL
                                                }
                                                target="_blank"
                                                rel="noreferrer"
                                            >
                                                Open Image
                                                <ExternalLink
                                                    size={13}
                                                />
                                            </a>
                                        </div>

                                        <div className="banner-preview-box">

                                            <img
                                                src={
                                                    formData.imageURL
                                                }
                                                alt="Banner preview"
                                                onError={(
                                                    event
                                                ) => {
                                                    event.currentTarget.style.display =
                                                        "none";

                                                    const next =
                                                        event.currentTarget
                                                            .nextElementSibling;

                                                    if (
                                                        next
                                                    ) {
                                                        next.style.display =
                                                            "flex";
                                                    }
                                                }}
                                            />

                                            <div
                                                className="banner-preview-error"
                                                style={{
                                                    display:
                                                        "none",
                                                }}
                                            >
                                                <AlertTriangle
                                                    size={24}
                                                />

                                                <span>
                                                    Unable to preview this image
                                                </span>
                                            </div>

                                        </div>

                                    </div>

                                )}


                                {/* BUTTON TEXT */}

                                <div className="banner-form-group">

                                    <label>
                                        Button Text
                                    </label>

                                    <input
                                        type="text"
                                        name="buttonText"
                                        value={
                                            formData.buttonText
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="Shop Now"
                                        maxLength={
                                            100
                                        }
                                    />

                                </div>


                                {/* BUTTON LINK */}

                                <div className="banner-form-group">

                                    <label>
                                        Button Link
                                    </label>

                                    <input
                                        type="text"
                                        name="buttonLink"
                                        value={
                                            formData.buttonLink
                                        }
                                        onChange={
                                            handleChange
                                        }
                                        placeholder="/products"
                                        maxLength={
                                            500
                                        }
                                    />

                                </div>


                                {/* DISPLAY ORDER */}

                                <div className="banner-form-group">

                                    <label>
                                        Display Order
                                    </label>

                                    <input
                                        type="number"
                                        name="displayOrder"
                                        min="0"
                                        value={
                                            formData.displayOrder
                                        }
                                        onChange={
                                            handleChange
                                        }
                                    />

                                </div>


                                {/* STATUS */}

                                <div className="banner-form-group">

                                    <label>
                                        Status
                                    </label>

                                    <select
                                        name="status"
                                        value={
                                            formData.status
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


                                {/* START DATE */}

                                <div className="banner-form-group">

                                    <label>
                                        Start Date
                                    </label>

                                    <div className="banner-input-icon">

                                        <CalendarDays
                                            size={17}
                                        />

                                        <input
                                            type="date"
                                            name="startDate"
                                            value={
                                                formData.startDate
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                    </div>

                                </div>


                                {/* END DATE */}

                                <div className="banner-form-group">

                                    <label>
                                        End Date
                                    </label>

                                    <div className="banner-input-icon">

                                        <CalendarDays
                                            size={17}
                                        />

                                        <input
                                            type="date"
                                            name="endDate"
                                            value={
                                                formData.endDate
                                            }
                                            onChange={
                                                handleChange
                                            }
                                        />

                                    </div>

                                </div>

                            </div>


                            {/* MODAL FOOTER */}

                            <div className="banner-modal-footer">

                                <button
                                    type="button"
                                    className="banner-cancel-btn"
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
                                    className="banner-save-btn"
                                    disabled={
                                        saving ||
                                        shopsLoading
                                    }
                                >

                                    {saving ? (
                                        <>
                                            <RefreshCw
                                                size={16}
                                                className="spin"
                                            />

                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Plus
                                                size={17}
                                            />

                                            {editingBanner
                                                ? "Update Banner"
                                                : "Create Banner"}
                                        </>
                                    )}

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
                bannerToDelete && (

                    <div
                        className="banner-delete-overlay"
                        onMouseDown={(
                            event
                        ) => {

                            if (
                                event.target ===
                                event.currentTarget
                            ) {
                                closeDeleteModal();
                            }

                        }}
                    >

                        <div className="banner-delete-modal">

                            <div className="banner-delete-icon">
                                <AlertTriangle
                                    size={30}
                                />
                            </div>


                            <div className="banner-delete-content">

                                <span className="banner-delete-label">
                                    Delete Banner
                                </span>

                                <h2>
                                    Are you sure?
                                </h2>

                                <p>
                                    You are about to delete
                                    <strong>
                                        {" "}
                                        "{bannerToDelete.Title}"
                                    </strong>
                                    . This action cannot
                                    be undone.
                                </p>

                                <div className="banner-delete-shop">

                                    <Store
                                        size={15}
                                    />

                                    {
                                        getShopName(
                                            bannerToDelete.ShopID
                                        )
                                    }

                                </div>

                            </div>


                            <div className="banner-delete-actions">

                                <button
                                    type="button"
                                    className="banner-delete-cancel"
                                    onClick={
                                        closeDeleteModal
                                    }
                                    disabled={
                                        deletingID
                                    }
                                >
                                    Cancel
                                </button>


                                <button
                                    type="button"
                                    className="banner-delete-confirm"
                                    onClick={
                                        handleDelete
                                    }
                                    disabled={
                                        Boolean(
                                            deletingID
                                        )
                                    }
                                >

                                    {deletingID ? (
                                        <>
                                            <RefreshCw
                                                size={16}
                                                className="spin"
                                            />

                                            Deleting...
                                        </>
                                    ) : (
                                        <>
                                            <Trash2
                                                size={16}
                                            />

                                            Delete Banner
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

export default Banners;
