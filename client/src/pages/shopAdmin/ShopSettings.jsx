import { useEffect, useState } from "react";

import { toast } from "react-toastify";

import {
    Save,
    Store,
    Image,
    Phone,
    MapPin,
    Clock,
    Share2,
    FileText,
    RefreshCw,
    Palette
} from "lucide-react";

import "../../styles/shop-admin/shop-settings.css";
import ImageGalleryField from "../../components/ImageGalleryField.jsx";
import ShopTemplatePicker from "../../components/ShopTemplatePicker.jsx";
import { getDefaultWebsiteTemplate } from "../../components/shopTemplates.js";
import ShopDomainCard from "../../components/shopAdmin/ShopDomainCard.jsx";
import { API_ORIGIN } from "../../lib/api.js";


const API_URL =
    `${API_ORIGIN}/api/shop-settings`;


// =====================================================
// SHOP ADMIN TOKEN
// =====================================================

/* Links typed without "https://" (e.g. "maps.app.goo.gl/abc") still work. */
const withHttps = (value) => {
    const text = String(value || "").trim();
    return !text || /^https?:\/\//i.test(text) ? text : `https://${text}`;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Checks the fields the browser used to check silently (which could block a save without the
 * owner noticing). Returns { field, message } for the first problem, or null.
 */
function findSettingsProblem(form) {
    const email = String(form.settingsEmail || "").trim();
    if (email && !EMAIL_PATTERN.test(email)) {
        return { field: "settingsEmail", message: "Enter a valid shop email, for example shop@gmail.com." };
    }
    const latitude = form.latitude === "" ? null : Number(form.latitude);
    if (latitude !== null && !(latitude >= -90 && latitude <= 90)) {
        return { field: "latitude", message: "Latitude must be a number between -90 and 90." };
    }
    const longitude = form.longitude === "" ? null : Number(form.longitude);
    if (longitude !== null && !(longitude >= -180 && longitude <= 180)) {
        return { field: "longitude", message: "Longitude must be a number between -180 and 180." };
    }
    return null;
}

const getToken = () => {
    return (
        localStorage.getItem("shopAdminToken") ||
        localStorage.getItem("shopToken") ||
        ""
    );
};


// =====================================================
// EMPTY FORM
// =====================================================

const emptyForm = {

    shopName: "",
    shopSlug: "",
    ownerName: "",
    email: "",
    phone: "",
    logoURL: "",

    shopLogo: "",
    tagline: "",

    whatsappNumber: "",
    settingsEmail: "",
    settingsPhone: "",

    address: "",
    city: "",
    state: "",
    pincode: "",

    // =====================================================
    // MAP LOCATION
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

    websiteStatus: "Active",
    shopType: "Ecommerce",
    websiteTemplate: "editorial",
    primaryColor: "#193b35",
    secondaryColor: "#d49b60"
};


// =====================================================
// COMPONENT
// =====================================================

function ShopSettings() {

    const [form, setForm] =
        useState(emptyForm);

    const [loading, setLoading] =
        useState(true);

    const [saving, setSaving] =
        useState(false);


    // =================================================
    // FETCH MY SHOP SETTINGS
    // =================================================

    // silent: refresh the values after a save without replacing the page with a loader.
    const fetchSettings = async ({ silent = false } = {}) => {

        try {

            if (!silent) setLoading(true);

            const token = getToken();

            if (!token) {

                toast.error(
                    "Shop Admin session not found. Please login again."
                );

                return;
            }


            const response = await fetch(
                `${API_URL}/me`,
                {
                    method: "GET",

                    headers: {
                        Authorization:
                            `Bearer ${token}`
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
                    "Failed to fetch shop settings."
                );
            }


            const shop =
                result.data?.shop || {};

            const settings =
                result.data?.settings || {};


            setForm({
                shopType: shop.ShopType || "Ecommerce",
                websiteTemplate: shop.WebsiteTemplate || getDefaultWebsiteTemplate(shop.ShopType),
                primaryColor: settings.PrimaryColor || "#193b35",
                secondaryColor: settings.SecondaryColor || "#d49b60",

                // SHOP TABLE
                // ---------------------------------

                shopName:
                    shop.ShopName || "",

                shopSlug:
                    shop.ShopSlug || "",

                ownerName:
                    shop.OwnerName || "",

                email:
                    shop.Email || "",

                phone:
                    shop.Phone || "",

                logoURL:
                    shop.LogoURL === "null"
                        ? ""
                        : shop.LogoURL || "",


                // ---------------------------------
                // SHOP SETTINGS TABLE
                // ---------------------------------

                shopLogo:
                    settings.ShopLogo === "null"
                        ? ""
                        : settings.ShopLogo || "",

                tagline:
                    settings.Tagline || "",

                whatsappNumber:
                    settings.WhatsAppNumber || "",

                settingsEmail:
                    settings.Email || "",

                settingsPhone:
                    settings.Phone || "",

                address:
                    settings.Address || "",

                city:
                    settings.City || "",

                state:
                    settings.State || "",

                pincode:
                    settings.Pincode || "",

                // =====================================================
                // MAP LOCATION
                // =====================================================

                mapURL:
                    settings.MapURL || "",

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
                    settings.ShowMap === null ||
                        settings.ShowMap === undefined
                        ? true
                        : Boolean(settings.ShowMap),

                aboutUs:
                    settings.AboutUs || "",

                openingTime:
                    settings.OpeningTime || "",

                closingTime:
                    settings.ClosingTime || "",

                facebookURL:
                    settings.FacebookURL || "",

                instagramURL:
                    settings.InstagramURL || "",

                youtubeURL:
                    settings.YouTubeURL || "",

                websiteStatus:
                    settings.WebsiteStatus ||
                    "Active"
            });

        }

        catch (error) {

            console.error(
                "Fetch Shop Settings Error:",
                error
            );

            toast.error(
                error.message ||
                "Unable to load shop settings."
            );

        }

        finally {

            setLoading(false);

        }
    };


    // =================================================
    // INITIAL LOAD
    // =================================================

    useEffect(() => {

        fetchSettings();

    }, []);


    // =================================================
    // INPUT CHANGE
    // =================================================

    const handleChange = (e) => {

        const {
            name,
            value,
            type,
            checked
        } = e.target;

        setForm((previous) => ({
            ...previous,
            [name]:
                type === "checkbox"
                    ? checked
                    : value
        }));

    };


    // =================================================
    // SAVE SETTINGS
    // =================================================

    const handleSubmit = async (e) => {

        e.preventDefault();

        // One save at a time; a second click while saving does nothing.
        if (saving) return;

        const problem = findSettingsProblem(form);
        if (problem) {
            toast.error(problem.message);
            const field = document.querySelector(`[name="${problem.field}"]`);
            field?.scrollIntoView({ behavior: "smooth", block: "center" });
            field?.focus({ preventScroll: true });
            return;
        }


        try {

            setSaving(true);


            const token = getToken();


            if (!token) {

                toast.error(
                    "Shop Admin session not found. Please login again."
                );

                return;
            }


            const response = await fetch(
                `${API_URL}/me`,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type":
                            "application/json",

                        Authorization:
                            `Bearer ${token}`
                    },

                    body: JSON.stringify({

                        tagline:
                            form.tagline,

                        shopLogo:
                            form.shopLogo,

                        whatsappNumber:
                            form.whatsappNumber,

                        settingsEmail:
                            form.settingsEmail,

                        settingsPhone:
                            form.settingsPhone,

                        address:
                            form.address,

                        city:
                            form.city,

                        state:
                            form.state,

                        pincode:
                            form.pincode,

                        // =====================================================
                        // MAP LOCATION
                        // =====================================================

                        mapURL:
                            withHttps(form.mapURL),

                        latitude:
                            form.latitude === ""
                                ? null
                                : Number(form.latitude),

                        longitude:
                            form.longitude === ""
                                ? null
                                : Number(form.longitude),

                        showMap:
                            Boolean(form.showMap),

                        aboutUs:
                            form.aboutUs,

                        openingTime:
                            form.openingTime,

                        closingTime:
                            form.closingTime,

                        facebookURL:
                            withHttps(form.facebookURL),

                        instagramURL:
                            withHttps(form.instagramURL),

                        youtubeURL:
                            withHttps(form.youtubeURL),

                        websiteStatus:
                            form.websiteStatus,
                        websiteTemplate: form.websiteTemplate,
                        primaryColor: form.primaryColor,
                        secondaryColor: form.secondaryColor
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
                    "Failed to update shop settings."
                );
            }


            toast.success(
                "Shop settings updated successfully."
            );


            // Refresh latest data
            await fetchSettings({ silent: true });

        }

        catch (error) {

            console.error(
                "Update Shop Settings Error:",
                error
            );

            toast.error(
                error.message ||
                "Unable to update shop settings."
            );

        }

        finally {

            setSaving(false);

        }
    };


    // =================================================
    // LOADING
    // =================================================

    if (loading) {

        return (

            <div className="shop-settings-loading">

                <RefreshCw
                    size={28}
                    className="settings-loader"
                />

                <p>
                    Loading shop settings...
                </p>

            </div>
        );
    }


    // =================================================
    // UI
    // =================================================

    return (

        <div className="shop-settings-page">


            {/* =================================================
                HEADER
            ================================================= */}

            <div className="shop-settings-header">

                <div>

                    <div className="settings-title-row">

                        <div className="settings-title-icon">

                            <Store size={24} />

                        </div>


                        <div>

                            <h1>
                                Shop Settings
                            </h1>

                            <p>
                                Manage your shop information,
                                branding and business details.
                            </p>

                        </div>

                    </div>

                </div>


                <div className="shop-status-badge">

                    <span></span>

                    {form.websiteStatus}

                </div>

            </div>



            {/* Outside the settings form: it saves on its own buttons. */}
            <ShopDomainCard />

            {/* noValidate: fields are checked in handleSubmit, with a clear message. */}
            <form onSubmit={handleSubmit} noValidate>

                <ShopTemplatePicker shopType={form.shopType} value={form.websiteTemplate} onChange={(websiteTemplate) => setForm((previous) => ({ ...previous, websiteTemplate }))} />

                <section className="settings-card storefront-appearance-card">
                    <div className="settings-card-header">
                        <div className="settings-section-icon"><Palette size={20} /></div>
                        <div>
                            <h2>Website Brand Colors</h2>
                            <p>Choose colors for this shop’s customer-facing website. Each shop keeps its own palette.</p>
                        </div>
                    </div>
                    <div className="storefront-palette-grid">
                        {[
                            { name: "Warm Berry", primary: "#801441", accent: "#c59657" },
                            { name: "Evergreen", primary: "#193b35", accent: "#d49b60" },
                            { name: "Midnight Blue", primary: "#253a68", accent: "#d6a65d" },
                            { name: "Plum Rose", primary: "#653250", accent: "#d596ac" },
                            { name: "Terracotta", primary: "#813f32", accent: "#d6a469" },
                            { name: "Modern Slate", primary: "#303a46", accent: "#7b9c91" }
                        ].map((palette) => (
                            <button
                                type="button"
                                key={palette.name}
                                className={`storefront-palette-option ${form.primaryColor === palette.primary && form.secondaryColor === palette.accent ? "selected" : ""}`}
                                onClick={() => setForm((previous) => ({ ...previous, primaryColor: palette.primary, secondaryColor: palette.accent }))}
                                aria-pressed={form.primaryColor === palette.primary && form.secondaryColor === palette.accent}
                            >
                                <span className="storefront-palette-swatch">
                                    <i style={{ backgroundColor: palette.primary }} />
                                    <i style={{ backgroundColor: palette.accent }} />
                                </span>
                                <strong>{palette.name}</strong>
                            </button>
                        ))}
                    </div>
                    <div className="storefront-custom-colors">
                        <label className="settings-field">
                            <span>Brand color</span>
                            <span className="storefront-color-input"><input type="color" name="primaryColor" value={form.primaryColor || "#193b35"} onChange={handleChange} /><code>{form.primaryColor || "#193b35"}</code></span>
                            <small>Used on the shop name, buttons and selected items.</small>
                        </label>
                        <label className="settings-field">
                            <span>Accent color</span>
                            <span className="storefront-color-input"><input type="color" name="secondaryColor" value={form.secondaryColor || "#d49b60"} onChange={handleChange} /><code>{form.secondaryColor || "#d49b60"}</code></span>
                            <small>Used for small highlights and decorative details.</small>
                        </label>
                    </div>
                </section>


                {/* =================================================
                    SHOP INFORMATION
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <Store size={20} />

                        </div>


                        <div>

                            <h2>
                                Shop Information
                            </h2>

                            <p>
                                Basic information of your shop.
                            </p>

                        </div>

                    </div>


                    <div className="settings-grid">


                        <div className="settings-field">

                            <label>
                                Shop Name
                            </label>

                            <input
                                type="text"
                                value={form.shopName}
                                disabled
                            />

                            <small>
                                Shop name is managed by Super Admin.
                            </small>

                        </div>


                        <div className="settings-field">

                            <label>
                                Shop Slug
                            </label>

                            <input
                                type="text"
                                value={form.shopSlug}
                                disabled
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                Owner Name
                            </label>

                            <input
                                type="text"
                                value={form.ownerName}
                                disabled
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                Account Email
                            </label>

                            <input
                                type="email"
                                value={form.email}
                                disabled
                            />

                        </div>

                    </div>

                </section>



                {/* =================================================
                    BRANDING
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <Image size={20} />

                        </div>


                        <div>

                            <h2>
                                Branding
                            </h2>

                            <p>
                                Manage your shop logo and tagline.
                            </p>

                        </div>

                    </div>


                    <div className="settings-grid">


                        <div className="settings-field">

                            <ImageGalleryField label="Shop logo" multiple={false} value={form.shopLogo ? [form.shopLogo] : []} onChange={(images) => setForm((prev) => ({ ...prev, shopLogo: images[0] || "" }))} />

                        </div>


                        <div className="settings-field">

                            <label>
                                Logo URL
                            </label>

                            <input
                                type="text"
                                value={form.logoURL}
                                disabled
                            />

                        </div>


                        <div className="settings-field full-width">

                            <label>
                                Tagline
                            </label>

                            <input
                                type="text"
                                name="tagline"
                                value={form.tagline}
                                onChange={handleChange}
                                placeholder="Your shop tagline"
                            />

                        </div>

                    </div>


                    {form.shopLogo && (

                        <div className="logo-preview">

                            <p>
                                Logo Preview
                            </p>


                            <img
                                src={form.shopLogo}
                                alt="Shop Logo"

                                onError={(e) => {

                                    e.currentTarget.style.display =
                                        "none";

                                }}
                            />

                        </div>
                    )}

                </section>



                {/* =================================================
                    CONTACT INFORMATION
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <Phone size={20} />

                        </div>


                        <div>

                            <h2>
                                Contact Information
                            </h2>

                            <p>
                                Contact details visible on your website.
                            </p>

                        </div>

                    </div>


                    <div className="settings-grid">


                        <div className="settings-field">

                            <label>
                                Business Phone
                            </label>

                            <input
                                type="text"
                                name="settingsPhone"
                                value={form.settingsPhone}
                                onChange={handleChange}
                                placeholder="9876500002"
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                WhatsApp Number
                            </label>

                            <input
                                type="text"
                                name="whatsappNumber"
                                value={form.whatsappNumber}
                                onChange={handleChange}
                                placeholder="9876500002"
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                Business Email
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



                {/* =================================================
                    ADDRESS
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <MapPin size={20} />

                        </div>


                        <div>

                            <h2>
                                Business Address
                            </h2>

                            <p>
                                Add your shop location details.
                            </p>

                        </div>

                    </div>


                    <div className="settings-grid">


                        <div className="settings-field full-width">

                            <label>
                                Address
                            </label>

                            <input
                                type="text"
                                name="address"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Shop address"
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                City
                            </label>

                            <input
                                type="text"
                                name="city"
                                value={form.city}
                                onChange={handleChange}
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                State
                            </label>

                            <input
                                type="text"
                                name="state"
                                value={form.state}
                                onChange={handleChange}
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                Pincode
                            </label>

                            <input
                                type="text"
                                name="pincode"
                                value={form.pincode}
                                onChange={handleChange}
                            />

                        </div>

                    </div>

                </section>


                {/* =================================================*
    MAP LOCATION
================================================= */}

<section className="settings-card">

    <div className="settings-card-header">

        <div className="settings-section-icon">
            <MapPin size={20} />
        </div>

        <div>
            <h2>
                Shop Location on Map
            </h2>

            <p>
                Add your exact shop location for customers.
            </p>
        </div>

    </div>


    <div className="settings-grid">

        {/* GOOGLE MAP URL */}

        <div className="settings-field full-width">

            <label>
                Google Maps URL
            </label>

            <input
                type="url"
                name="mapURL"
                value={form.mapURL}
                onChange={handleChange}
                placeholder="https://maps.google.com/..."
            />

            <small>
                Google Maps se Share → Copy Link karke yahan paste karein.
            </small>

        </div>


        {/* LATITUDE */}

        <div className="settings-field">

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

        </div>


        {/* LONGITUDE */}

        <div className="settings-field">

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

        </div>


        {/* SHOW MAP */}

        <div className="settings-field full-width">

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
                    Show location map on public website
                </span>

            </label>

            <small>
                Enable this if you want customers to see your shop
                location on the public website.
            </small>

        </div>

    </div>


    {/* MAP PREVIEW */}

    {form.latitude &&
     form.longitude && (

        <div
            style={{
                marginTop: "20px",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                overflow: "hidden",
                background: "#f8fafc"
            }}
        >

            <div
                style={{
                    padding: "14px 16px",
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
                            marginTop: "4px",
                            fontSize: "13px",
                            color: "#6b7280"
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
                        fontWeight: "600"
                    }}
                >

                    <MapPin size={15} />

                    Open in Google Maps

                </a>

            </div>


            <iframe
                title="Shop Location"
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



                {/* =================================================
                    ABOUT SHOP
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <FileText size={20} />

                        </div>


                        <div>

                            <h2>
                                About Shop
                            </h2>

                            <p>
                                Describe your business.
                            </p>

                        </div>

                    </div>


                    <div className="settings-field">

                        <label>
                            About Us
                        </label>

                        <textarea
                            name="aboutUs"
                            value={form.aboutUs}
                            onChange={handleChange}
                            rows="6"
                            placeholder="Write about your shop..."
                        />

                    </div>

                </section>



                {/* =================================================
                    BUSINESS HOURS
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <Clock size={20} />

                        </div>


                        <div>

                            <h2>
                                Business Hours
                            </h2>

                            <p>
                                Set your shop opening and closing time.
                            </p>

                        </div>

                    </div>


                    <div className="settings-grid">


                        <div className="settings-field">

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


                        <div className="settings-field">

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



                {/* =================================================
                    SOCIAL MEDIA
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <Share2 size={20} />

                        </div>


                        <div>

                            <h2>
                                Social Media
                            </h2>

                            <p>
                                Connect your social media profiles.
                            </p>

                        </div>

                    </div>


                    <div className="settings-grid">


                        <div className="settings-field">

                            <label>
                                Facebook URL
                            </label>

                            <input
                                type="text"
                                name="facebookURL"
                                value={form.facebookURL}
                                onChange={handleChange}
                                placeholder="https://facebook.com/..."
                            />

                        </div>


                        <div className="settings-field">

                            <label>
                                Instagram URL
                            </label>

                            <input
                                type="text"
                                name="instagramURL"
                                value={form.instagramURL}
                                onChange={handleChange}
                                placeholder="https://instagram.com/..."
                            />

                        </div>


                        <div className="settings-field full-width">

                            <label>
                                YouTube URL
                            </label>

                            <input
                                type="text"
                                name="youtubeURL"
                                value={form.youtubeURL}
                                onChange={handleChange}
                                placeholder="https://youtube.com/..."
                            />

                        </div>

                    </div>

                </section>



                {/* =================================================
                    WEBSITE STATUS
                ================================================= */}

                <section className="settings-card">

                    <div className="settings-card-header">

                        <div className="settings-section-icon">

                            <Store size={20} />

                        </div>


                        <div>

                            <h2>
                                Website Status
                            </h2>

                            <p>
                                Control whether your shop website is active.
                            </p>

                        </div>

                    </div>


                    <div className="settings-field">

                        <label>
                            Website Status
                        </label>

                        <select
                            name="websiteStatus"
                            value={form.websiteStatus}
                            onChange={handleChange}
                        >

                            <option value="Active">
                                Active
                            </option>

                            <option value="Inactive">
                                Inactive
                            </option>

                        </select>

                    </div>

                </section>



                {/* =================================================
                    SAVE BAR
                ================================================= */}

                <div className="settings-save-bar">

                    <div>

                        <strong>
                            Save Changes
                        </strong>

                        <span>
                            Update your shop settings and website information.
                        </span>

                    </div>


                    <button
                        type="submit"
                        disabled={saving}
                    >

                        {saving ? (

                            <>

                                <RefreshCw
                                    size={18}
                                    className="settings-loader"
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


            </form>

        </div>
    );
}


export default ShopSettings;
