import { useEffect, useState } from "react";

import {
    UserRound,
    ShieldCheck,
    Mail,
    Phone,
    LockKeyhole,
    Eye,
    EyeOff,
    Save,
    CheckCircle2,
    Clock3,
} from "lucide-react";

import { toast } from "react-toastify";

import {
    getJson,
    putJson,
    postJson
} from "../lib/api";

import "../styles/admin-settings.css";


function AdminSettingsPage() {

    // =====================================================
    // TABS
    // =====================================================

    const [activeTab, setActiveTab] =
        useState("profile");


    // =====================================================
    // PROFILE
    // =====================================================

    const [profile, setProfile] = useState({
        fullName: "",
        email: "",
        phone: "",
    });


    const [loading, setLoading] =
        useState(false);


    const [profileLoading, setProfileLoading] =
        useState(true);


    // =====================================================
    // PASSWORD
    // =====================================================

    const [passwordData, setPasswordData] = useState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
    });


    const [showCurrent, setShowCurrent] =
        useState(false);

    const [showNew, setShowNew] =
        useState(false);

    const [showConfirm, setShowConfirm] =
        useState(false);


    const [passwordLoading, setPasswordLoading] =
        useState(false);


    // =====================================================
    // LOAD PROFILE FROM DATABASE
    // =====================================================

    useEffect(() => {

        const loadProfile = async () => {

            try {

                setProfileLoading(true);

              const { response, data } =
    await getJson(
        "/api/auth/profile"
    );

                if (
                    !response.ok ||
                    !data.success
                ) {
                    throw new Error(
                        data.message ||
                        "Unable to load profile."
                    );
                }


                const user =
                    data?.data?.user;


                if (!user) {
                    throw new Error(
                        "Profile data not received."
                    );
                }


                setProfile({
                    fullName:
                        user.fullName || "",

                    email:
                        user.email || "",

                    phone:
                        user.phone || "",
                });


                // Keep local session updated

                localStorage.setItem(
                    "superAdminUser",
                    JSON.stringify(user)
                );

                localStorage.setItem(
                    "adminUser",
                    JSON.stringify(user)
                );

                localStorage.setItem(
                    "user",
                    JSON.stringify(user)
                );


            } catch (error) {

                console.error(
                    "Load Admin Profile Error:",
                    error
                );

                toast.error(
                    error.message ||
                    "Unable to load profile."
                );

            } finally {

                setProfileLoading(false);

            }

        };


        loadProfile();

    }, []);


    // =====================================================
    // PROFILE CHANGE
    // =====================================================

    const handleProfileChange = (e) => {

        const {
            name,
            value
        } = e.target;


        setProfile((prev) => ({
            ...prev,
            [name]: value,
        }));

    };


    // =====================================================
    // SAVE PROFILE
    // =====================================================

    const handleProfileSubmit = async (e) => {

        e.preventDefault();


        if (!profile.fullName.trim()) {

            toast.error(
                "Full name is required."
            );

            return;
        }


        if (!profile.email.trim()) {

            toast.error(
                "Email is required."
            );

            return;
        }


        try {

            setLoading(true);


          const { response, data } =
    await putJson(
        "/api/auth/profile",
        {
            fullName:
                profile.fullName.trim(),

            email:
                profile.email.trim(),

            phone:
                profile.phone.trim() ||
                null,
        }
    );


            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    data.message ||
                    "Unable to update profile."
                );
            }


            const updatedUser =
                data?.data?.user;


            if (updatedUser) {

                localStorage.setItem(
                    "superAdminUser",
                    JSON.stringify(updatedUser)
                );

                localStorage.setItem(
                    "adminUser",
                    JSON.stringify(updatedUser)
                );

                localStorage.setItem(
                    "user",
                    JSON.stringify(updatedUser)
                );


                setProfile({
                    fullName:
                        updatedUser.fullName || "",

                    email:
                        updatedUser.email || "",

                    phone:
                        updatedUser.phone || "",
                });

            }


            toast.success(
                data.message ||
                "Profile updated successfully."
            );


        } catch (error) {

            console.error(
                "Admin Profile Update Error:",
                error
            );

            toast.error(
                error.message ||
                "Unable to update profile."
            );

        } finally {

            setLoading(false);

        }

    };


    // =====================================================
    // PASSWORD CHANGE
    // =====================================================

    const handlePasswordChange = (e) => {

        const {
            name,
            value
        } = e.target;


        setPasswordData((prev) => ({
            ...prev,
            [name]: value,
        }));

    };


    // =====================================================
    // CHANGE PASSWORD
    // =====================================================

    const handlePasswordSubmit = async (e) => {

        e.preventDefault();


        const {
            currentPassword,
            newPassword,
            confirmPassword
        } = passwordData;


        if (!currentPassword) {

            toast.error(
                "Please enter your current password."
            );

            return;
        }


        if (!newPassword) {

            toast.error(
                "Please enter your new password."
            );

            return;
        }


        if (newPassword.length < 8) {

            toast.error(
                "New password must be at least 8 characters."
            );

            return;
        }


        if (
            newPassword !==
            confirmPassword
        ) {

            toast.error(
                "New passwords do not match."
            );

            return;
        }


        try {

            setPasswordLoading(true);


            const { response, data } =
                await postJson(
                    "/api/password/change",
                    {
                        currentPassword,
                        newPassword,
                        confirmPassword
                    }
                );


            if (
                !response.ok ||
                !data.success
            ) {

                throw new Error(
                    data.message ||
                    "Unable to change password."
                );

            }


            setPasswordData({
                currentPassword: "",
                newPassword: "",
                confirmPassword: "",
            });


            toast.success(
                data.message ||
                "Password changed successfully."
            );


        } catch (error) {

            console.error(
                "Change Password Error:",
                error
            );

            toast.error(
                error.message ||
                "Unable to change password."
            );

        } finally {

            setPasswordLoading(false);

        }

    };


    // =====================================================
    // PASSWORD STRENGTH
    // =====================================================

    const getPasswordStrength = () => {

        const password =
            passwordData.newPassword;


        if (!password) {

            return {
                label: "",
                width: "0%",
            };

        }


        if (password.length < 8) {

            return {
                label: "Weak",
                width: "30%",
            };

        }


        if (
            password.length >= 8 &&
            /[A-Z]/.test(password) &&
            /[0-9]/.test(password) &&
            /[^A-Za-z0-9]/.test(password)
        ) {

            return {
                label: "Strong",
                width: "100%",
            };

        }


        return {
            label: "Medium",
            width: "65%",
        };

    };


    const passwordStrength =
        getPasswordStrength();


    // =====================================================
    // LOADING
    // =====================================================

    if (profileLoading) {

        return (
            <section className="admin-settings-page">

                <div className="admin-settings-heading">

                    <div>

                        <p>
                            Admin Panel
                        </p>

                        <h1>
                            Settings
                        </h1>

                        <span>
                            Loading your account settings...
                        </span>

                    </div>

                </div>

                <div className="settings-card">

                    <div
                        style={{
                            padding: "60px",
                            textAlign: "center",
                        }}
                    >
                        Loading profile...
                    </div>

                </div>

            </section>
        );

    }


    // =====================================================
    // UI
    // =====================================================

    return (

        <section className="admin-settings-page">

            {/* =================================================
                PAGE HEADER
            ================================================= */}

            <div className="admin-settings-heading">

                <div>

                    <p>
                        Admin Panel
                    </p>

                    <h1>
                        Settings
                    </h1>

                    <span>
                        Manage your account, security
                        and personal information.
                    </span>

                </div>

            </div>


            {/* =================================================
                SETTINGS LAYOUT
            ================================================= */}

            <div className="admin-settings-layout">


                {/* =================================================
                    SETTINGS MENU
                ================================================= */}

                <aside className="settings-menu">

                    <button
                        type="button"
                        className={
                            activeTab === "profile"
                                ? "settings-menu-item active"
                                : "settings-menu-item"
                        }
                        onClick={() =>
                            setActiveTab("profile")
                        }
                    >

                        <span className="settings-menu-icon">

                            <UserRound size={19} />

                        </span>

                        <span>

                            <strong>
                                Profile
                            </strong>

                            <small>
                                Personal information
                            </small>

                        </span>

                    </button>


                    <button
                        type="button"
                        className={
                            activeTab === "security"
                                ? "settings-menu-item active"
                                : "settings-menu-item"
                        }
                        onClick={() =>
                            setActiveTab("security")
                        }
                    >

                        <span className="settings-menu-icon">

                            <ShieldCheck size={19} />

                        </span>

                        <span>

                            <strong>
                                Security
                            </strong>

                            <small>
                                Password & account security
                            </small>

                        </span>

                    </button>

                </aside>


                {/* =================================================
                    CONTENT
                ================================================= */}

                <main className="settings-content">


                    {/* =================================================
                        PROFILE
                    ================================================= */}

                    {activeTab === "profile" && (

                        <div className="settings-card">

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Profile Information
                                    </h2>

                                    <p>
                                        Update your personal
                                        account information.
                                    </p>

                                </div>

                                <div className="settings-card-icon">

                                    <UserRound size={21} />

                                </div>

                            </div>


                            <form
                                onSubmit={
                                    handleProfileSubmit
                                }
                            >


                                {/* PROFILE PREVIEW */}

                                <div className="profile-preview">

                                    <div className="profile-avatar">

                                        {(
                                            profile.fullName ||
                                            "SA"
                                        )
                                            .trim()
                                            .split(" ")
                                            .map(
                                                (name) =>
                                                    name[0]
                                            )
                                            .join("")
                                            .slice(0, 2)
                                            .toUpperCase()}

                                    </div>


                                    <div>

                                        <strong>

                                            {
                                                profile.fullName ||
                                                "Super Admin"
                                            }

                                        </strong>

                                        <span>
                                            Super Administrator
                                        </span>

                                    </div>


                                    <div className="profile-status">

                                        <CheckCircle2
                                            size={15}
                                        />

                                        Active

                                    </div>

                                </div>


                                {/* FORM GRID */}

                                <div className="settings-form-grid">


                                    {/* FULL NAME */}

                                    <div className="settings-field">

                                        <label>
                                            Full Name
                                        </label>

                                        <div className="settings-input">

                                            <UserRound
                                                size={18}
                                            />

                                            <input
                                                type="text"
                                                name="fullName"
                                                value={
                                                    profile.fullName
                                                }
                                                onChange={
                                                    handleProfileChange
                                                }
                                                placeholder="Enter full name"
                                            />

                                        </div>

                                    </div>


                                    {/* EMAIL */}

                                    <div className="settings-field">

                                        <label>
                                            Email Address
                                        </label>

                                        <div className="settings-input">

                                            <Mail
                                                size={18}
                                            />

                                            <input
                                                type="email"
                                                name="email"
                                                value={
                                                    profile.email
                                                }
                                                onChange={
                                                    handleProfileChange
                                                }
                                                placeholder="Enter email address"
                                            />

                                        </div>

                                    </div>


                                    {/* PHONE */}

                                    <div className="settings-field">

                                        <label>
                                            Phone Number
                                        </label>

                                        <div className="settings-input">

                                            <Phone
                                                size={18}
                                            />

                                            <input
                                                type="tel"
                                                name="phone"
                                                value={
                                                    profile.phone
                                                }
                                                onChange={
                                                    handleProfileChange
                                                }
                                                placeholder="Enter phone number"
                                            />

                                        </div>

                                    </div>


                                    {/* DESIGNATION */}

                                    <div className="settings-field">

                                        <label>
                                            Designation
                                        </label>

                                        <div className="settings-input">

                                            <ShieldCheck
                                                size={18}
                                            />

                                            <input
                                                type="text"
                                                value="Super Administrator"
                                                readOnly
                                            />

                                        </div>

                                    </div>

                                </div>


                                {/* SAVE */}

                                <div className="settings-card-footer">

                                    <button
                                        type="submit"
                                        className="settings-save-btn"
                                        disabled={loading}
                                    >

                                        <Save size={17} />

                                        {loading
                                            ? "Saving..."
                                            : "Save Changes"}

                                    </button>

                                </div>

                            </form>

                        </div>

                    )}


                    {/* =================================================
                        SECURITY
                    ================================================= */}

                    {activeTab === "security" && (

                        <div className="settings-card">

                            <div className="settings-card-header">

                                <div>

                                    <h2>
                                        Account Security
                                    </h2>

                                    <p>
                                        Keep your administrator
                                        account secure.
                                    </p>

                                </div>

                                <div className="settings-card-icon security">

                                    <ShieldCheck size={21} />

                                </div>

                            </div>


                            <div className="security-info">

                                <div className="security-info-icon">

                                    <LockKeyhole size={19} />

                                </div>

                                <div>

                                    <strong>
                                        Change your password
                                    </strong>

                                    <p>
                                        Use a strong password
                                        that you don't use
                                        anywhere else.
                                    </p>

                                </div>

                            </div>


                            <form
                                className="password-form"
                                onSubmit={
                                    handlePasswordSubmit
                                }
                            >


                                {/* CURRENT PASSWORD */}

                                <div className="settings-field">

                                    <label>
                                        Current Password
                                    </label>

                                    <div className="settings-input">

                                        <LockKeyhole
                                            size={18}
                                        />

                                        <input
                                            type={
                                                showCurrent
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="currentPassword"
                                            value={
                                                passwordData.currentPassword
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                            placeholder="Enter current password"
                                            autoComplete="current-password"
                                        />

                                        <button
                                            type="button"
                                            className="settings-password-toggle"
                                            onClick={() =>
                                                setShowCurrent(
                                                    (prev) =>
                                                        !prev
                                                )
                                            }
                                        >

                                            {showCurrent
                                                ? <EyeOff size={18} />
                                                : <Eye size={18} />}

                                        </button>

                                    </div>

                                </div>


                                {/* NEW PASSWORD */}

                                <div className="settings-field">

                                    <label>
                                        New Password
                                    </label>

                                    <div className="settings-input">

                                        <LockKeyhole
                                            size={18}
                                        />

                                        <input
                                            type={
                                                showNew
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="newPassword"
                                            value={
                                                passwordData.newPassword
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                            placeholder="Enter new password"
                                            autoComplete="new-password"
                                        />

                                        <button
                                            type="button"
                                            className="settings-password-toggle"
                                            onClick={() =>
                                                setShowNew(
                                                    (prev) =>
                                                        !prev
                                                )
                                            }
                                        >

                                            {showNew
                                                ? <EyeOff size={18} />
                                                : <Eye size={18} />}

                                        </button>

                                    </div>


                                    {passwordData.newPassword && (

                                        <div className="password-strength">

                                            <div className="strength-track">

                                                <div
                                                    className="strength-fill"
                                                    style={{
                                                        width:
                                                            passwordStrength.width,
                                                    }}
                                                />

                                            </div>

                                            <span>
                                                {
                                                    passwordStrength.label
                                                }
                                            </span>

                                        </div>

                                    )}

                                </div>


                                {/* CONFIRM PASSWORD */}

                                <div className="settings-field">

                                    <label>
                                        Confirm New Password
                                    </label>

                                    <div className="settings-input">

                                        <LockKeyhole
                                            size={18}
                                        />

                                        <input
                                            type={
                                                showConfirm
                                                    ? "text"
                                                    : "password"
                                            }
                                            name="confirmPassword"
                                            value={
                                                passwordData.confirmPassword
                                            }
                                            onChange={
                                                handlePasswordChange
                                            }
                                            placeholder="Confirm new password"
                                            autoComplete="new-password"
                                        />

                                        <button
                                            type="button"
                                            className="settings-password-toggle"
                                            onClick={() =>
                                                setShowConfirm(
                                                    (prev) =>
                                                        !prev
                                                )
                                            }
                                        >

                                            {showConfirm
                                                ? <EyeOff size={18} />
                                                : <Eye size={18} />}

                                        </button>

                                    </div>

                                </div>


                                {/* REQUIREMENTS */}

                                <div className="password-requirements">

                                    <strong>
                                        Password requirements
                                    </strong>

                                    <div>

                                        <span>
                                            ✓ At least 8 characters
                                        </span>

                                        <span>
                                            ✓ Use uppercase and lowercase
                                        </span>

                                        <span>
                                            ✓ Include numbers
                                        </span>

                                        <span>
                                            ✓ Include a special character
                                        </span>

                                    </div>

                                </div>


                                {/* SAVE */}

                                <div className="settings-card-footer">

                                    <button
                                        type="submit"
                                        className="settings-save-btn"
                                        disabled={
                                            passwordLoading
                                        }
                                    >

                                        <LockKeyhole
                                            size={17}
                                        />

                                        {passwordLoading
                                            ? "Changing..."
                                            : "Change Password"}

                                    </button>

                                </div>

                            </form>


                            <div className="security-note">

                                <Clock3 size={17} />

                                <span>
                                    Your account security is
                                    protected with encrypted
                                    password storage.
                                </span>

                            </div>

                        </div>

                    )}

                </main>

            </div>

        </section>

    );
}


export default AdminSettingsPage;