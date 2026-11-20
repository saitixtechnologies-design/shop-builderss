import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { toast } from "react-toastify";

import {
    ArrowLeft,
    Save,
    RefreshCw,
    Store,
    Phone,
    Mail,
    MapPin,
    Clock,
    Globe,
    MessageCircle,
    Image as ImageIcon
} from "lucide-react";

import "../styles/ShopSettings.css";
import ImageGalleryField from "../components/ImageGalleryField.jsx";
import { adminFetch as fetch, API_ORIGIN } from "../lib/api.js";

const API_URL = `${API_ORIGIN}/api/shop-settings`;

const getToken = () => {
    return (
        localStorage.getItem("token") ||
        localStorage.getItem("adminToken") ||
        localStorage.getItem("shopToken") ||
        ""
    );
};

const emptyForm = {
    shopName: "",
    shopSlug: "",
    ownerName: "",
    email: "",
    phone: "",
    logoURL: "",
    shopLogo: "",

    primaryColor: "#193b35",
    secondaryColor: "#d49b60",

    tagline: "",
    whatsappNumber: "",
    settingsEmail: "",
    settingsPhone: "",

    address: "",
    city: "",
    state: "",
    pincode: "",

    // =====================================================
    // SHOP MAP LOCATION
    // =====================================================

    mapURL: "",
    latitude: "",
    longitude: "",
    showMap: true,

    aboutUs: "",
    openingTime: "",
    closingTime: "",

    facebookURL: "",
    instagramURL: "",
    youtubeURL: "",

    websiteStatus: "Active"
};

const ShopSettings = () => {
    const { shopId } = useParams();
    const navigate = useNavigate();

    const [form, setForm] = useState(emptyForm);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");

    const fetchSettings = async () => {
        try {
            setLoading(true);
            setError("");
            setMessage("");

            const token = getToken();

            if (!token) {
                setError("Authentication token not found.");
                setLoading(false);
                return;
            }

            const response = await fetch(
                `${API_URL}/${shopId}`,
                {
                    method: "GET",
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const result = await response.json();

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message || "Failed to load shop settings."
                );
            }

            const shop = result.data?.shop || {};
            const settings = result.data?.settings || {};

            setForm({
                shopName: shop.ShopName || "",
                shopSlug: shop.ShopSlug || "",
                ownerName: shop.OwnerName || "",
                email: shop.Email || "",
                phone: shop.Phone || "",

                logoURL:
                    shop.LogoURL === "null"
                        ? ""
                        : shop.LogoURL || "",

                shopLogo:
                    settings.ShopLogo === "null"
                        ? ""
                        : settings.ShopLogo || "",

                primaryColor: settings.PrimaryColor || "#193b35",
                secondaryColor: settings.SecondaryColor || "#d49b60",

                tagline: settings.Tagline || "",
                whatsappNumber: settings.WhatsAppNumber || "",
                settingsEmail: settings.Email || "",
                settingsPhone: settings.Phone || "",
                address: settings.Address || "",
                city: settings.City || "",
                state: settings.State || "",
                pincode: settings.Pincode || "",

                // =====================================================
                // SHOP MAP LOCATION
                // =====================================================

                mapURL: settings.MapURL || "",
                latitude:
                    settings.Latitude !== null &&
                        settings.Latitude !== undefined
                        ? String(settings.Latitude)
                        : "",
                longitude:
                    settings.Longitude !== null &&
                        settings.Longitude !== undefined
                        ? String(settings.Longitude)
                        : "",
                showMap:
                    settings.ShowMap === undefined ||
                        settings.ShowMap === null
                        ? true
                        : Boolean(settings.ShowMap),

                aboutUs: settings.AboutUs || "",
                openingTime: settings.OpeningTime || "",
                closingTime: settings.ClosingTime || "",
                facebookURL: settings.FacebookURL || "",
                instagramURL: settings.InstagramURL || "",
                youtubeURL: settings.YouTubeURL || "",
                websiteStatus: settings.WebsiteStatus || "Active"
            });
        } catch (err) {
            console.error("Fetch Settings Error:", err);
            setError(err.message || "Failed to load settings.");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (shopId) {
            fetchSettings();
        }
    }, [shopId]);

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

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (saving) return;

        let toastId = null;

        try {
            setSaving(true);
            setError("");
            setMessage("");

            const token = getToken();

            if (!token) {
                toast.error("Authentication token not found.");
                setError("Authentication token not found.");
                return;
            }

            // =====================================================
            // SAVING TOAST
            // =====================================================

            toastId = toast.loading(
                "Saving shop settings..."
            );

            const response = await fetch(
                `${API_URL}/${shopId}`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json",
                        Authorization: `Bearer ${token}`
                    },

                    body: JSON.stringify(form)
                }
            );

            const result = await response.json();

            // =====================================================
            // API ERROR
            // =====================================================

            if (!response.ok || !result.success) {
                throw new Error(
                    result.message ||
                    "Failed to save settings."
                );
            }

            // =====================================================
            // SUCCESS
            // =====================================================

            setMessage(
                "Shop settings updated successfully."
            );

            // Update loading toast to success
            toast.update(toastId, {
                render: "Shop settings saved successfully!",
                type: "success",
                isLoading: false,
                autoClose: 3000,
                closeOnClick: true,
                pauseOnHover: true
            });

            // =====================================================
            // REFRESH DATA FROM DATABASE
            // =====================================================

            await fetchSettings();

        } catch (err) {

            console.error(
                "Save Settings Error:",
                err
            );

            setError(
                err.message ||
                "Failed to save settings."
            );

            // =====================================================
            // ERROR TOAST
            // =====================================================

            if (toastId) {
                toast.update(toastId, {
                    render:
                        err.message ||
                        "Failed to save shop settings.",
                    type: "error",
                    isLoading: false,
                    autoClose: 4000,
                    closeOnClick: true,
                    pauseOnHover: true
                });
            } else {
                toast.error(
                    err.message ||
                    "Failed to save shop settings."
                );
            }

        } finally {

            setSaving(false);

        }
    };

    if (loading) {
        return (
            <div className="shop-settings-page">
                <div className="shop-settings-loading">
                    <RefreshCw
                        size={28}
                        className="spin"
                    />
                    <span>
                        Loading shop settings...
                    </span>
                </div>
            </div>
        );
    }

    return (
        <div className="shop-settings-page">

            {/* =====================================================
                HEADER
            ===================================================== */}

            <div className="shop-settings-header">

                <div className="shop-settings-title-area">

                    <button
                        type="button"
                        className="shop-settings-back-btn"
                        onClick={() => navigate("/admin/shops")}
                    >
                        <ArrowLeft size={18} />
                        Back
                    </button>

                    <div>
                        <div className="shop-settings-title-row">

                            <div className="shop-settings-title-icon">
                                <Store size={24} />
                            </div>

                            <div>
                                <h1>Shop Settings</h1>

                                <p>
                                    Manage configuration for{" "}
                                    <strong>
                                        {form.shopName || "Shop"}
                                    </strong>
                                </p>
                            </div>

                        </div>
                    </div>

                </div>

                <div className="shop-settings-shop-badge">
                    <span>SHOP ID</span>
                    <strong>#{shopId}</strong>
                </div>

            </div>


            {/* =====================================================
                ALERTS
            ===================================================== */}

            {message && (
                <div className="shop-settings-alert success">
                    <span>✓</span>
                    {message}
                </div>
            )}

            {error && (
                <div className="shop-settings-alert error">
                    <span>!</span>
                    {error}
                </div>
            )}


            {/* =====================================================
                FORM
            ===================================================== */}

            <form
                className="shop-settings-form"
                onSubmit={handleSubmit}
            >

                {/* =====================================================
                    BASIC INFORMATION
                ===================================================== */}

                <section className="shop-settings-card">

                    <div className="shop-settings-card-header">

                        <div className="shop-settings-card-icon">
                            <Store size={20} />
                        </div>

                        <div>
                            <h2>Basic Information</h2>

                            <p>
                                Main shop information and branding
                            </p>
                        </div>

                    </div>

                    <div className="shop-settings-grid">

                        <div className="shop-settings-field">
                            <label>
                                Shop Name *
                            </label>

                            <input
                                type="text"
                                name="shopName"
                                value={form.shopName}
                                onChange={handleChange}
                                placeholder="Enter shop name"
                                required
                            />
                        </div>


                        <div className="shop-settings-field">

                            <label>
                                Shop Slug *
                            </label>

                            <input
                                type="text"
                                name="shopSlug"
                                value={form.shopSlug}
                                onChange={handleChange}
                                placeholder="shop-slug"
                                required
                            />

                            <small>
                                Used for the public shop URL
                            </small>

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                Owner Name
                            </label>

                            <input
                                type="text"
                                name="ownerName"
                                value={form.ownerName}
                                onChange={handleChange}
                                placeholder="Owner name"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                Tagline
                            </label>

                            <input
                                type="text"
                                name="tagline"
                                value={form.tagline}
                                onChange={handleChange}
                                placeholder="Your business tagline"
                            />

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    BRANDING
                ===================================================== */}

                <section className="shop-settings-card">

                    <div className="shop-settings-card-header">

                        <div className="shop-settings-card-icon">
                            <ImageIcon size={20} />
                        </div>

                        <div>
                            <h2>Branding</h2>

                            <p>
                                Shop logo and brand assets
                            </p>
                        </div>

                    </div>

                    <div className="shop-settings-grid">

                        <div className="shop-settings-field">

                            <ImageGalleryField label="Shop logo" multiple={false} value={form.logoURL ? [form.logoURL] : []} onChange={(images) => setForm((prev) => ({ ...prev, logoURL: images[0] || "" }))} shopID={form.shopID} />

                        </div>


                        <div className="shop-settings-field">

                            <ImageGalleryField label="Storefront logo" multiple={false} value={form.shopLogo ? [form.shopLogo] : []} onChange={(images) => setForm((prev) => ({ ...prev, shopLogo: images[0] || "" }))} shopID={form.shopID} />

                        </div>

                        <div className="shop-settings-field">
                            <label htmlFor="primaryColor">Primary brand color</label>
                            <input id="primaryColor" type="color" name="primaryColor" value={form.primaryColor || "#193b35"} onChange={handleChange} />
                            <small>Used for the storefront’s main color and buttons.</small>
                        </div>

                        <div className="shop-settings-field">
                            <label htmlFor="secondaryColor">Secondary brand color</label>
                            <input id="secondaryColor" type="color" name="secondaryColor" value={form.secondaryColor || "#d49b60"} onChange={handleChange} />
                            <small>Used for highlights and decorative accents.</small>
                        </div>

                    </div>

                </section>


                {/* =====================================================
                    CONTACT
                ===================================================== */}

                <section className="shop-settings-card">

                    <div className="shop-settings-card-header">

                        <div className="shop-settings-card-icon">
                            <Phone size={20} />
                        </div>

                        <div>
                            <h2>Contact Information</h2>

                            <p>
                                Phone, WhatsApp and email details
                            </p>
                        </div>

                    </div>

                    <div className="shop-settings-grid">

                        <div className="shop-settings-field">

                            <label>
                                <Phone size={15} />
                                Phone
                            </label>

                            <input
                                type="text"
                                name="settingsPhone"
                                value={form.settingsPhone}
                                onChange={handleChange}
                                placeholder="9876543210"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                <MessageCircle size={15} />
                                WhatsApp Number
                            </label>

                            <input
                                type="text"
                                name="whatsappNumber"
                                value={form.whatsappNumber}
                                onChange={handleChange}
                                placeholder="9876543210"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                <Mail size={15} />
                                Email
                            </label>

                            <input
                                type="email"
                                name="settingsEmail"
                                value={form.settingsEmail}
                                onChange={handleChange}
                                placeholder="shop@example.com"
                            />

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    ADDRESS
                ===================================================== */}

                <section className="shop-settings-card">

                    <div className="shop-settings-card-header">

                        <div className="shop-settings-card-icon">
                            <MapPin size={20} />
                        </div>

                        <div>
                            <h2>Business Address</h2>

                            <p>
                                Shop location and postal information
                            </p>
                        </div>

                    </div>

                    <div className="shop-settings-grid">

                        <div className="shop-settings-field full">

                            <label>
                                Address
                            </label>

                            <textarea
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Complete business address"
                                rows="3"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                City
                            </label>

                            <input
                                type="text"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                                placeholder="Lucknow"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                State
                            </label>

                            <input
                                type="text"
                                name="state"
                                value={form.state}
                                onChange={handleChange}
                                placeholder="Uttar Pradesh"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                Pincode
                            </label>

                            <input
                                type="text"
                                name="pincode"
                                value={form.pincode}
                                onChange={handleChange}
                                placeholder="226001"
                            />

                        </div>

                    </div>

                </section>


                {/* =====================================================
    SHOP MAP LOCATION
===================================================== */}

<section className="shop-settings-card">

    <div className="shop-settings-card-header">

        <div className="shop-settings-card-icon">
            <MapPin size={20} />
        </div>

        <div>
            <h2>Office / Shop Location</h2>

            <p>
                Add the exact location of this shop on Google Maps
            </p>
        </div>

    </div>


    <div className="shop-settings-grid">

        {/* Google Maps URL */}

        <div className="shop-settings-field full">

            <label>
                Google Maps Location URL
            </label>

            <input
                type="url"
                name="mapURL"
                value={form.mapURL}
                onChange={handleChange}
                placeholder="https://maps.google.com/..."
            />

            <small>
                Paste the Google Maps share link for this shop.
            </small>

        </div>


        {/* Latitude */}

        <div className="shop-settings-field">

            <label>
                Latitude
            </label>

            <input
                type="number"
                name="latitude"
                value={form.latitude}
                onChange={handleChange}
                placeholder="26.8467"
                step="any"
                min="-90"
                max="90"
            />

            <small>
                Example: 26.8467
            </small>

        </div>


        {/* Longitude */}

        <div className="shop-settings-field">

            <label>
                Longitude
            </label>

            <input
                type="number"
                name="longitude"
                value={form.longitude}
                onChange={handleChange}
                placeholder="80.9462"
                step="any"
                min="-180"
                max="180"
            />

            <small>
                Example: 80.9462
            </small>

        </div>


        {/* Show Map */}

        <div className="shop-settings-field full">

            <label
                style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    cursor: "pointer"
                }}
            >

                <input
                    type="checkbox"
                    name="showMap"
                    checked={Boolean(form.showMap)}
                    onChange={handleChange}
                    style={{
                        width: "18px",
                        height: "18px",
                        cursor: "pointer"
                    }}
                />

                <span>
                    Show this location on the public website
                </span>

            </label>

            <small>
                When enabled, customers will be able to see this
                shop's location on the storefront.
            </small>

        </div>

    </div>


    {/* Map Preview */}

    {(form.latitude && form.longitude) && (

        <div
            style={{
                marginTop: "20px",
                borderRadius: "14px",
                overflow: "hidden",
                border: "1px solid #e5e7eb",
                background: "#f8fafc"
            }}
        >

            <div
                style={{
                    padding: "12px 16px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap"
                }}
            >

                <div>

                    <strong>
                        Location Preview
                    </strong>

                    <div
                        style={{
                            fontSize: "13px",
                            color: "#64748b",
                            marginTop: "3px"
                        }}
                    >
                        {form.latitude}, {form.longitude}
                    </div>

                </div>


                <a
                    href={
                        form.mapURL ||
                        `https://www.google.com/maps?q=${form.latitude},${form.longitude}`
                    }
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        textDecoration: "none",
                        fontSize: "13px",
                        fontWeight: 600
                    }}
                >
                    <MapPin size={15} />
                    Open in Google Maps
                </a>

            </div>


            <iframe
                title="Shop Location Preview"
                src={`https://www.google.com/maps?q=${form.latitude},${form.longitude}&output=embed`}
                width="100%"
                height="300"
                style={{
                    border: 0,
                    display: "block"
                }}
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
            />

        </div>

    )}

</section>


                {/* =====================================================
                    ABOUT + BUSINESS HOURS
                ===================================================== */}

                <div className="shop-settings-two-column">

                    <section className="shop-settings-card">

                        <div className="shop-settings-card-header">

                            <div className="shop-settings-card-icon">
                                <Store size={20} />
                            </div>

                            <div>
                                <h2>About Business</h2>

                                <p>
                                    Public business description
                                </p>
                            </div>

                        </div>

                        <div className="shop-settings-field">

                            <label>
                                About Us
                            </label>

                            <textarea
                                name="aboutUs"
                                value={form.aboutUs}
                                onChange={handleChange}
                                placeholder="Tell customers about your business..."
                                rows="7"
                            />

                        </div>

                    </section>


                    <section className="shop-settings-card">

                        <div className="shop-settings-card-header">

                            <div className="shop-settings-card-icon">
                                <Clock size={20} />
                            </div>

                            <div>
                                <h2>Business Hours</h2>

                                <p>
                                    Store opening and closing time
                                </p>
                            </div>

                        </div>

                        <div className="shop-settings-grid single">

                            <div className="shop-settings-field">

                                <label>
                                    Opening Time
                                </label>

                                <input
                                    type="text"
                                    name="openingTime"
                                    value={form.openingTime}
                                    onChange={handleChange}
                                    placeholder="09:00 AM"
                                />

                            </div>


                            <div className="shop-settings-field">

                                <label>
                                    Closing Time
                                </label>

                                <input
                                    type="text"
                                    name="closingTime"
                                    value={form.closingTime}
                                    onChange={handleChange}
                                    placeholder="08:00 PM"
                                />

                            </div>

                        </div>

                    </section>

                </div>


                {/* =====================================================
                    SOCIAL MEDIA
                ===================================================== */}

                <section className="shop-settings-card">

                    <div className="shop-settings-card-header">

                        <div className="shop-settings-card-icon">
                            <Globe size={20} />
                        </div>

                        <div>
                            <h2>Social Media</h2>

                            <p>
                                Connect your business social profiles
                            </p>
                        </div>

                    </div>

                    <div className="shop-settings-grid">

                        <div className="shop-settings-field">

                            <label>
                                <Globe size={15} />
                                Facebook URL
                            </label>

                            <input
                                type="url"
                                name="facebookURL"
                                value={form.facebookURL}
                                onChange={handleChange}
                                placeholder="https://facebook.com/yourpage"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                <Globe size={15} />
                                Instagram URL
                            </label>

                            <input
                                type="url"
                                name="instagramURL"
                                value={form.instagramURL}
                                onChange={handleChange}
                                placeholder="https://instagram.com/yourprofile"
                            />

                        </div>


                        <div className="shop-settings-field">

                            <label>
                                <Globe size={15} />
                                YouTube URL
                            </label>

                            <input
                                type="url"
                                name="youtubeURL"
                                value={form.youtubeURL}
                                onChange={handleChange}
                                placeholder="https://youtube.com/@yourchannel"
                            />

                        </div>

                    </div>

                </section>


                {/* =====================================================
                    WEBSITE STATUS
                ===================================================== */}

                <section className="shop-settings-card">

                    <div className="shop-settings-card-header">

                        <div className="shop-settings-card-icon">
                            <Globe size={20} />
                        </div>

                        <div>
                            <h2>Website Status</h2>

                            <p>
                                Control public website availability
                            </p>
                        </div>

                    </div>

                    <div className="shop-settings-status-options">

                        <label
                            className={
                                form.websiteStatus === "Active"
                                    ? "active"
                                    : ""
                            }
                        >

                            <input
                                type="radio"
                                name="websiteStatus"
                                value="Active"
                                checked={
                                    form.websiteStatus === "Active"
                                }
                                onChange={handleChange}
                            />

                            <span className="status-dot active-dot" />

                            <div>
                                <strong>Active</strong>

                                <small>
                                    Public website is available
                                </small>
                            </div>

                        </label>


                        <label
                            className={
                                form.websiteStatus === "Inactive"
                                    ? "inactive"
                                    : ""
                            }
                        >

                            <input
                                type="radio"
                                name="websiteStatus"
                                value="Inactive"
                                checked={
                                    form.websiteStatus === "Inactive"
                                }
                                onChange={handleChange}
                            />

                            <span className="status-dot inactive-dot" />

                            <div>
                                <strong>Inactive</strong>

                                <small>
                                    Public website is disabled
                                </small>
                            </div>

                        </label>

                    </div>

                </section>


                {/* =====================================================
                    SAVE BAR
                ===================================================== */}

                <div className="shop-settings-save-bar">

                    <div>

                        <strong>
                            Shop #{shopId}
                        </strong>

                        <span>
                            Changes will be saved to SQL Server.
                        </span>

                    </div>


                    <div className="shop-settings-save-actions">

                        <button
                            type="button"
                            className="shop-settings-cancel-btn"
                            onClick={() => navigate("/admin/shops")}
                        >
                            Cancel
                        </button>


                        <button
                            type="submit"
                            className="shop-settings-save-btn"
                            disabled={saving}
                        >

                            {saving ? (
                                <>
                                    <RefreshCw
                                        size={18}
                                        className="spin"
                                    />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Save size={18} />
                                    Save Settings
                                </>
                            )}

                        </button>

                    </div>

                </div>

            </form>

        </div>
    );
};

export default ShopSettings;



