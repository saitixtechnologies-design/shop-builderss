export const getShopAdminLanguage = (user) => {
    const shop = user?.shop || {};
    const tenantId = shop.shopID || shop.ShopID || shop.id || user?.shopId || user?.tenantId || user?.email || "shop-owner";
    const savedLanguage = localStorage.getItem(`shopAdminLanguage:${tenantId}`);
    return ["hi", "hinglish"].includes(savedLanguage) ? savedLanguage : "en";
};

export const setShopAdminLanguage = (user, language) => {
    const shop = user?.shop || {};
    const tenantId = String(shop.shopID || shop.ShopID || shop.id || user?.shopId || user?.tenantId || user?.email || "shop-owner");
    localStorage.setItem(`shopAdminLanguage:${tenantId}`, language);
    window.dispatchEvent(new CustomEvent("shop-admin-language-change", { detail: { tenantId, language } }));
};

export const getShopAdminTenantId = (user) => {
    const shop = user?.shop || {};
    return String(shop.shopID || shop.ShopID || shop.id || user?.shopId || user?.tenantId || user?.email || "shop-owner");
};

export const readShopAdminUser = () => {
    try {
        return JSON.parse(localStorage.getItem("shopAdminUser") || "null");
    } catch {
        return null;
    }
};
