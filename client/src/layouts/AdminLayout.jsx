import { useEffect, useState } from "react";
import { Navigate, Outlet, useLocation } from "react-router";

import Sidebar from "../components/admin/Sidebar";
import Topbar from "../components/admin/Topbar";
import { getSuperAdminToken } from "../lib/api.js";

const AdminLayout = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    useEffect(() => {
        setSidebarOpen(false);
    }, [location.pathname]);

    useEffect(() => {
        const handleResize = () => {
            if (window.innerWidth > 900) setSidebarOpen(false);
        };
        const handleKeyDown = (event) => {
            if (event.key === "Escape") setSidebarOpen(false);
        };
        window.addEventListener("resize", handleResize);
        window.addEventListener("keydown", handleKeyDown);
        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("keydown", handleKeyDown);
        };
    }, []);

    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        if (sidebarOpen && window.innerWidth <= 900) document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = previousOverflow; };
    }, [sidebarOpen]);

    if (!getSuperAdminToken()) {
        return <Navigate to="/admin/login" replace state={{ from: location }} />;
    }

    return (
        <div className="admin-layout">

            {/* Sidebar */}
            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {sidebarOpen && window.innerWidth <= 900 && (
                <button
                    type="button"
                    className="sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                    aria-label="Close navigation menu"
                />
            )}

            {/* Right Side */}
            <div className="admin-main">

                {/* Topbar */}
                <Topbar
                    onMenuClick={() => setSidebarOpen((isOpen) => !isOpen)}
                    sidebarOpen={sidebarOpen}
                />

                {/* Current Route Page */}
                <main className="admin-content">
                    <Outlet />
                </main>

            </div>

        </div>
    );
};

export default AdminLayout;
