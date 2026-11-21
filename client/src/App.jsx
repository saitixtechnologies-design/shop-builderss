import {
    BrowserRouter,
    Routes,
    Route,
    Navigate,
} from "react-router";

import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// =====================================================
// SUPER ADMIN
// =====================================================

import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Dashboard from "./pages/Dashboard";
import AdminLayout from "./layouts/AdminLayout";

import Shops from "./pages/Shops";
import Categories from "./pages/Categories";
import Products from "./pages/Products";
import Brands from "./pages/Brands";
import Services from "./pages/Services";
import ShopSettingsPage from "./pages/ShopSettings";
import WebsiteEditor from "./pages/WebsiteEditor";

// =====================================================
// SHOP ADMIN
// =====================================================

import ShopLogin from "./pages/ShopLogin";
import ShopAdminLayout from "./layouts/ShopAdminLayout";

import ShopAdminDashboard from "./pages/shopAdmin/ShopAdminDashboard";
import ShopAdminWelcome from "./pages/shopAdmin/ShopAdminWelcome";
import ShopAdminHelp from "./pages/shopAdmin/ShopAdminHelp";
import ShopProducts from "./pages/shopAdmin/ShopProducts";
import ShopCategories from "./pages/shopAdmin/ShopCategories";
import ShopBrands from "./pages/shopAdmin/ShopBrands";
import ShopServices from "./pages/shopAdmin/ShopServices";
import ShopCustomers from "./pages/shopAdmin/ShopCustomers";
import ShopOrders from "./pages/shopAdmin/ShopOrders";
import ShopOrderInvoice from "./pages/shopAdmin/ShopOrderInvoice";
import ShopReports from "./pages/shopAdmin/ShopReports";
import ShopSettings from "./pages/shopAdmin/ShopSettings";
import Banners from "./pages/Banners";
import Coupons from "./pages/Coupons";
import ShopBanners from "./pages/shopAdmin/ShopBanners";
import ShopPortfolio from "./pages/shopAdmin/ShopPortfolio";
import ShopCoupons from "./pages/shopAdmin/ShopCoupons";
import AdminDataPage from "./pages/AdminDataPage";
import OrderManagementPage from "./pages/OrderManagementPage";
import AdminSettingsPage from "./pages/AdminSettingsPage";
import ShopLivePreview from "./pages/ShopLivePreview";
import ShopAdminLivePreview from "./pages/shopAdmin/ShopAdminLivePreview";
import VerifyOTP from "./pages/VerifyOTP";
import ResetPassword from "./pages/ResetPassword";
import ShopForgotPassword from "./pages/shopAdmin/ShopForgotPassword";
import ShopVerifyOTP from "./pages/shopAdmin/ShopVerifyOTP";
import ShopResetPassword from "./pages/shopAdmin/ShopResetPassword";

function App() {
    return (
        <BrowserRouter>
            <Routes>

                {/* =====================================================
                    ROOT
                ====================================================== */}

                <Route
                    path="/"
                    element={
                        <Navigate
                            to="/admin/login"
                            replace
                        />
                    }
                />

                {/* =====================================================
                    SUPER ADMIN LOGIN
                ====================================================== */}

                <Route
                    path="/admin/login"
                    element={<Login />}
                />

                <Route
    path="/forgot-password"
    element={<ForgotPassword />}
/>

<Route
    path="/verify-otp"
    element={<VerifyOTP />}
/>

<Route
    path="/reset-password"
    element={<ResetPassword />}
/>

<Route
    path="/shop/login"
    element={<ShopLogin />}
/>

<Route
    path="/shop/forgot-password"
    element={<ShopForgotPassword />}
/>

<Route
    path="/shop/verify-otp"
    element={<ShopVerifyOTP />}
/>

<Route
    path="/shop/reset-password"
    element={<ShopResetPassword />}
/>


                {/* =====================================================
                    SUPER ADMIN PANEL
                ====================================================== */}

                <Route
                    path="/admin"
                    element={<AdminLayout />}
                >
                    {/* /admin */}
                    <Route
                        index
                        element={
                            <Navigate
                                to="/admin/dashboard"
                                replace
                            />
                        }
                    />

                    {/* Dashboard */}
                    <Route
                        path="dashboard"
                        element={<Dashboard />}
                    />

                    {/* Shops */}
                    <Route
                        path="shops"
                        element={<Shops />}
                    />
                    <Route path="live-preview" element={<ShopLivePreview />} />

                    <Route path="users" element={<AdminDataPage
                        title="Users" endpoint="/api/admin/users" columns={[
                            { key: "UserID", label: "ID" }, { key: "FullName", label: "Name" },
                            { key: "Email", label: "Email" }, { key: "Role", label: "Role" },
                            { key: "ShopName", label: "Shop" }, { key: "IsActive", label: "Status", format: "boolean" },
                            { key: "LastLoginAt", label: "Last Login", format: "date" }
                        ]}
                    />} />

                    <Route path="orders" element={<OrderManagementPage />} />

                    <Route path="customers" element={<AdminDataPage
                        title="Customers" endpoint="/api/admin/customers" columns={[
                            { key: "CustomerID", label: "ID" }, { key: "FullName", label: "Name" },
                            { key: "Email", label: "Email" }, { key: "Phone", label: "Phone" },
                            { key: "ShopName", label: "Shop" }, { key: "IsActive", label: "Status", format: "boolean" },
                            { key: "CreatedAt", label: "Joined", format: "date" }
                        ]}
                    />} />

                    <Route
                        path="shops/:shopId/settings"
                        element={<ShopSettingsPage />}
                    />

                    <Route
                        path="shops/:shopId/website-editor"
                        element={<WebsiteEditor />}
                    />

                    {/* Categories */}
                    <Route
                        path="categories"
                        element={<Categories />}
                    />

                    {/* Products */}
                    <Route
                        path="products"
                        element={<Products />}
                    />

                    {/* Brands */}
                    <Route
                        path="brands"
                        element={<Brands />}
                    />

                    {/* Services */}
                    <Route
                        path="services"
                        element={<Services />}
                    />

                    <Route path="reports" element={<Dashboard />} />
                    <Route path="settings" element={<AdminSettingsPage />} />
                    {/* Banners */}
<Route
    path="banners"
    element={<Banners />}
/>
<Route
    path="coupons"
    element={<Coupons />}
/>


                </Route>

                {/* =====================================================
                    SHOP ADMIN LOGIN
                ====================================================== */}

                <Route
                    path="/shop/login"
                    element={<ShopLogin />}
                />

                {/* =====================================================
                    SHOP ADMIN PANEL
                ====================================================== */}

                <Route
                    path="/shop-admin"
                    element={<ShopAdminLayout />}
                >
                    {/* /shop-admin */}
                    <Route
                        index
                        element={
                            <Navigate
                                to="/shop-admin/welcome"
                                replace
                            />
                        }
                    />

                    {/* Dashboard */}
                    <Route
                        path="dashboard"
                        element={<ShopAdminDashboard />}
                    />
                    <Route path="welcome" element={<ShopAdminWelcome />} />
                    <Route path="help" element={<ShopAdminHelp />} />
                    <Route path="live-preview" element={<ShopAdminLivePreview />} />
                    <Route path="reports" element={<ShopReports />} />

                    {/* Products */}
                    <Route
                        path="products"
                        element={<ShopProducts />}
                    />

                    {/* Categories */}
                    <Route
                        path="categories"
                        element={<ShopCategories />}
                    />

                    {/* Brands */}
                    <Route
                        path="brands"
                        element={<ShopBrands />}
                    />
                    <Route path="banners" element={<ShopBanners />} />
                    <Route path="portfolio" element={<ShopPortfolio />} />
                    <Route
    path="coupons"
    element={<ShopCoupons />}
/>

                    {/* Services */}
                    <Route
                        path="services"
                        element={<ShopServices />}
                    />

                    {/* Orders */}
                    <Route path="orders" element={<ShopOrders />} />
                    <Route path="orders/:id/invoice" element={<ShopOrderInvoice />} />

                    {/* Customers */}
                    <Route
                        path="customers"
                        element={<ShopCustomers />}
                    />

                    {/* Settings */}
                    <Route
                        path="settings"
                        element={<ShopSettings />}
                    />

                    <Route
                        path="website-editor"
                        element={<WebsiteEditor shopAdmin />}
                    />
                </Route>

                {/* =====================================================
                    UNKNOWN ROUTES
                ====================================================== */}

                <Route
                    path="*"
                    element={
                        <Navigate
                            to="/admin/login"
                            replace
                        />
                    }
                />

            </Routes>

            {/* =====================================================
                GLOBAL TOAST
            ====================================================== */}

            <ToastContainer
                position="top-right"
                autoClose={3000}
                hideProgressBar={false}
                newestOnTop
                closeOnClick
                pauseOnHover
                draggable
                theme="light"
            />
        </BrowserRouter>
    );
}

export default App;
