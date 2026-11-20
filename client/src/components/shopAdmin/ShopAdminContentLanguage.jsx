import { useEffect, useState } from "react";
import {
    getShopAdminLanguage,
    getShopAdminTenantId,
    readShopAdminUser,
} from "../../lib/shopAdminLanguage.js";
import { translateShopAdminTree } from "../../lib/shopAdminDomTranslations.js";

function ShopAdminContentLanguage() {
    const user = readShopAdminUser();
    const tenantId = getShopAdminTenantId(user);
    const [language, setLanguage] = useState(() => getShopAdminLanguage(user));

    useEffect(() => {
        const handleLanguageChange = (event) => {
            if (!event.detail || String(event.detail.tenantId) === String(tenantId)) {
                setLanguage(getShopAdminLanguage(readShopAdminUser()));
            }
        };
        window.addEventListener("shop-admin-language-change", handleLanguageChange);
        return () => window.removeEventListener("shop-admin-language-change", handleLanguageChange);
    }, [tenantId]);

    useEffect(() => {
        const root = document.querySelector(".shop-admin-content");
        if (!root) return undefined;

        translateShopAdminTree(root, language);
        const observer = new MutationObserver(() => {
            translateShopAdminTree(root, language);
        });
        observer.observe(root, {
            subtree: true,
            childList: true,
            characterData: true,
            attributes: true,
            attributeFilter: ["placeholder", "title", "aria-label", "aria-description", "alt"],
        });

        return () => observer.disconnect();
    }, [language]);

    return null;
}

export default ShopAdminContentLanguage;
