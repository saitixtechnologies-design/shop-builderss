import ShopAdminDashboardContent
    from "../../components/shopAdmin/ShopAdminDashboardContent";
import ServiceShopDashboardContent
    from "../../components/shopAdmin/ServiceShopDashboardContent";

function ShopAdminDashboard() {
    let user;
    try { user = JSON.parse(localStorage.getItem("shopAdminUser") || "null"); }
    catch { user = null; }
    const shopType = String(user?.shop?.shopType || user?.shop?.ShopType || "Ecommerce").toLowerCase();

    return shopType === "service"
        ? <ServiceShopDashboardContent />
        : <ShopAdminDashboardContent />;
}

export default ShopAdminDashboard;
