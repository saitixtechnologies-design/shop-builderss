import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import {
    ArrowRight, Award, BadgePercent, BarChart3, Briefcase, Check, Eye,
    FileText, FolderTree, Globe2, Image, Package, Rocket, Settings,
    ShoppingCart, Store, Users, Wrench,
} from "lucide-react";
import {
    getShopAdminLanguage, getShopAdminTenantId, readShopAdminUser,
    setShopAdminLanguage,
} from "../../lib/shopAdminLanguage.js";
import "../../styles/shop-admin/shop-admin-welcome.css";

const copy = {
    en: {
        eyebrow: "SHOPBUILDER · BUILD · MANAGE · GROW",
        headline: "Your shop. Your website. Your brand.",
        subtitle: "Add a few shop details and start selling online. We’ll guide you one simple step at a time.",
        greeting: ["Good morning", "Good afternoon", "Good evening"],
        start: "Start setting up your shop",
        startHint: "You can come back and change these details any time.",
        setup: ["Add shop details", "Add products or services", "Preview your website", "Share it with customers"],
        setupDescriptions: ["Name, contact and opening hours", "Add photos, prices and details", "Check how your website looks", "Your online shop is ready to share"],
        modulesTitle: "What you can do in your dashboard",
        modulesSubtitle: "Choose a card to open that part of your shop. Each section also has a simple guide in Help.",
        open: "Open section",
        domainTitle: "Your own web address",
        domainText: "You can connect a web address you already own. Open Shop Settings to see your website details.",
        help: "Need help? Open the simple step-by-step guides.",
        helpButton: "Open Help guides",
        ready: "Ready to grow your shop?",
        dashboard: "Open my dashboard",
        languages: { en: "English", hi: "हिन्दी", hinglish: "Hinglish" },
        modules: [
            ["Shop details", "Add your shop name, contact details, address and opening hours.", "Add or update shop information", "Set your name, phone and location", "Save when you finish", "अपनी दुकान का नाम, संपर्क, पता और खुलने का समय जोड़ें।", "Shop ka naam, contact, address aur khulne ka time jodein.", "/shop-admin/settings", Store],
            ["Products", "Add the items you sell. Add a photo, price and a short description.", "Add a product", "Upload a clear photo", "Enter its name and price", "अपने सामान की फोटो, नाम और कीमत जोड़ें।", "Jo samaan aap bechte hain, uski photo, naam aur price jodein.", "/shop-admin/products", Package],
            ["Categories", "Put similar products together so customers can find them easily.", "Create a category", "Give it a short name", "Add products to it", "मिलते-जुलते सामान को एक साथ रखें, ताकि ग्राहक आसानी से ढूँढ सकें।", "Milte-julte products ko ek jagah rakhein, taaki customer aasani se dhoondh saken.", "/shop-admin/categories", FolderTree],
            ["Brands", "Add the brands you sell, then connect them to products.", "Add a brand name", "Add its logo if you have one", "Choose that brand on a product", "अपने ब्रांड जोड़ें और उन्हें उत्पादों से जोड़ें।", "Apne brands jodein, phir unhe products ke saath jodein.", "/shop-admin/brands", Award],
            ["Services", "If you provide a service, add what you do and how customers can contact you.", "Add a service", "Write what is included", "Add price or contact details", "अपनी सेवा, उसकी जानकारी और संपर्क का तरीका जोड़ें।", "Aap kaunsi service dete hain, uski details aur contact jodein.", "/shop-admin/services", Wrench],
            ["Orders", "See customer orders and update each order as you prepare it.", "Open an order", "Check the customer and items", "Update its status", "ग्राहक के ऑर्डर देखें और काम पूरा होने पर उसकी स्थिति बदलें।", "Customer ka order dekhein aur kaam aage badhne par uska status update karein.", "/shop-admin/orders", ShoppingCart],
            ["Customers", "See customer details and the orders they have placed.", "Open the customer list", "Choose a customer", "Check their contact and order details", "ग्राहकों की जानकारी और उनके ऑर्डर देखें।", "Customer ki details aur unke orders dekhein.", "/shop-admin/customers", Users],
            ["Banners", "Show a special offer or important message on your website.", "Add a banner", "Choose a picture", "Write a short message and save", "वेबसाइट पर ऑफ़र या ज़रूरी संदेश दिखाएँ।", "Website par offer ya zaroori message dikhane ke liye banner jodein.", "/shop-admin/banners", Image],
            ["Portfolio", "Show examples of your work, projects or completed jobs.", "Add a portfolio item", "Choose a photo", "Add a short title and save", "अपने काम, प्रोजेक्ट या पूरे किए गए काम की तस्वीरें दिखाएँ।", "Apne kaam ya projects ki photos dikhane ke liye portfolio item jodein.", "/shop-admin/portfolio", Briefcase],
            ["Coupons", "Create a discount code customers can use while ordering.", "Create a coupon", "Choose the discount and end date", "Save and share the code", "ग्राहकों के लिए छूट का कूपन बनाएँ।", "Customer ke liye discount coupon code banayein aur share karein.", "/shop-admin/coupons", BadgePercent],
            ["Live preview", "See how your shop website looks to a customer.", "Open Live Preview", "Look through the pages", "Go back to edit anything you want", "ग्राहक को आपकी वेबसाइट कैसी दिखेगी, यहाँ देखें।", "Customer ko aapki website kaisi dikhegi, yahan check karein.", "/shop-admin/live-preview", Eye],
            ["Shop editor", "Change your website pages and the words shown on them.", "Open Shop Editor", "Choose the page", "Make your changes and save", "वेबसाइट के पेज और उन पर दिखने वाले शब्द बदलें।", "Website ke pages aur un par dikhne wale words badlein.", "/shop-admin/website-editor", FileText],
            ["Reports", "Get a quick view of shop activity and performance.", "Open Reports", "Choose a date range if shown", "Review orders and sales", "दुकान के ऑर्डर और बिक्री का सारांश देखें।", "Shop ke orders aur sales ka short summary dekhein.", "/shop-admin/dashboard", BarChart3],
            ["Shop settings", "Manage your shop information and website settings.", "Open Shop Settings", "Choose what you want to change", "Save your changes", "दुकान और वेबसाइट की सेटिंग्स बदलें।", "Shop aur website ki settings yahan badal sakte hain.", "/shop-admin/settings", Settings],
        ],
    },
    hi: {
        eyebrow: "शॉपबिल्डर · बनाएँ · सँभालें · बढ़ाएँ",
        headline: "आपकी दुकान। आपकी वेबसाइट। आपका ब्रांड।",
        subtitle: "दुकान की कुछ जानकारी भरें और ऑनलाइन बिक्री शुरू करें। हम हर कदम पर आसान तरीके से मदद करेंगे।",
        greeting: ["सुप्रभात", "नमस्कार", "शुभ संध्या"],
        start: "अपनी दुकान तैयार करना शुरू करें",
        startHint: "आप ये जानकारी बाद में भी बदल सकते हैं।",
        setup: ["दुकान की जानकारी भरें", "सामान या सेवाएँ जोड़ें", "वेबसाइट देखकर जाँचें", "ग्राहकों के साथ साझा करें"],
        setupDescriptions: ["नाम, संपर्क और खुलने का समय", "फोटो, कीमत और जानकारी जोड़ें", "देखें वेबसाइट कैसी दिख रही है", "अपनी ऑनलाइन दुकान साझा करें"],
        modulesTitle: "आप डैशबोर्ड में क्या कर सकते हैं",
        modulesSubtitle: "दुकान का कोई भाग खोलने के लिए कार्ड चुनें। हर भाग की आसान गाइड मदद में मिलेगी।",
        open: "यह भाग खोलें",
        domainTitle: "अपनी वेबसाइट का पता",
        domainText: "अगर आपके पास पहले से वेबसाइट का पता है, तो उसे जोड़ सकते हैं। जानकारी के लिए दुकान की सेटिंग्स खोलें।",
        help: "मदद चाहिए? आसान, कदम-दर-कदम गाइड खोलें।",
        helpButton: "मदद की गाइड खोलें",
        ready: "अपनी दुकान बढ़ाने के लिए तैयार हैं?",
        dashboard: "मेरा डैशबोर्ड खोलें",
        languages: { en: "English", hi: "हिन्दी", hinglish: "Hinglish" },
    },
    hinglish: {
        eyebrow: "SHOPBUILDER · BANAO · SAMBHALO · BADHAO",
        headline: "Aapki shop. Aapki website. Aapka brand.",
        subtitle: "Shop ki kuch details bhariye aur online selling shuru kijiye. Hum har step simple tareeke se samjhayenge.",
        greeting: ["Good morning", "Namaskar", "Namaskar"],
        start: "Apni shop setup karna shuru karein",
        startHint: "Aap ye details baad mein bhi badal sakte hain.",
        setup: ["Shop details bhariye", "Products ya services jodiye", "Website preview dekhiye", "Customers ke saath share kijiye"],
        setupDescriptions: ["Naam, contact aur opening time", "Photo, price aur details jodiye", "Dekhiye website kaisi lag rahi hai", "Apni online shop share kijiye"],
        modulesTitle: "Dashboard mein aap kya kar sakte hain",
        modulesSubtitle: "Shop ka koi section kholne ke liye card chuniye. Har section ki simple guide Help mein milegi.",
        open: "Section kholiye",
        domainTitle: "Aapki website ka address",
        domainText: "Agar aapke paas pehle se website address hai, to use connect kar sakte hain. Details ke liye Shop Settings kholiye.",
        help: "Madad chahiye? Simple step-by-step guides kholiye.",
        helpButton: "Help guides kholiye",
        ready: "Apni shop badhane ke liye ready hain?",
        dashboard: "Mera dashboard kholiye",
        languages: { en: "English", hi: "हिन्दी", hinglish: "Hinglish" },
    },
};

const moduleCopy = {
    hi: [
        ["दुकान की जानकारी", "दुकान का नाम, संपर्क, पता और खुलने का समय जोड़ें।", "दुकान की जानकारी जोड़ें या बदलें", "नाम, फोन और पता भरें", "पूरा होने पर सेव करें"],
        ["उत्पाद", "जो सामान बेचते हैं, उसकी फोटो, नाम और कीमत जोड़ें।", "उत्पाद जोड़ें", "साफ फोटो डालें", "नाम और कीमत भरें"],
        ["श्रेणियाँ", "मिलते-जुलते सामान को एक साथ रखें, ताकि ग्राहक आसानी से ढूँढें।", "नई श्रेणी बनाएँ", "छोटा-सा नाम लिखें", "उसमें उत्पाद जोड़ें"],
        ["ब्रांड", "अपने ब्रांड जोड़ें और उन्हें उत्पादों से जोड़ें।", "ब्रांड का नाम लिखें", "लोगो हो तो जोड़ें", "उत्पाद में ब्रांड चुनें"],
        ["सेवाएँ", "अपनी सेवा और ग्राहक के संपर्क करने का तरीका लिखें।", "सेवा जोड़ें", "सेवा की जानकारी लिखें", "कीमत या संपर्क जोड़ें"],
        ["ऑर्डर", "ग्राहकों के ऑर्डर देखें और काम के अनुसार उनकी स्थिति बदलें।", "ऑर्डर खोलें", "ग्राहक और सामान जाँचें", "ऑर्डर की स्थिति बदलें"],
        ["ग्राहक", "ग्राहकों की जानकारी और उनके ऑर्डर देखें।", "ग्राहकों की सूची खोलें", "किसी ग्राहक को चुनें", "संपर्क और ऑर्डर देखें"],
        ["बैनर", "वेबसाइट पर कोई ऑफ़र या ज़रूरी संदेश दिखाएँ।", "बैनर जोड़ें", "तस्वीर चुनें", "छोटा संदेश लिखकर सेव करें"],
        ["पोर्टफ़ोलियो", "अपने काम और पूरे किए गए प्रोजेक्ट की तस्वीरें दिखाएँ।", "काम की जानकारी जोड़ें", "तस्वीर चुनें", "शीर्षक लिखकर सेव करें"],
        ["कूपन", "ग्राहकों के लिए छूट का कोड बनाएँ।", "कूपन बनाएँ", "छूट और आखिरी तारीख चुनें", "कोड सेव करके साझा करें"],
        ["लाइव प्रीव्यू", "ग्राहक को वेबसाइट कैसी दिखेगी, यहाँ देखें।", "लाइव प्रीव्यू खोलें", "पेज देखकर जाँचें", "बदलाव के लिए वापस जाएँ"],
        ["शॉप एडिटर", "वेबसाइट के पेज और उन पर लिखी जानकारी बदलें।", "शॉप एडिटर खोलें", "पेज चुनें", "बदलाव करके सेव करें"],
        ["रिपोर्ट", "दुकान के ऑर्डर और बिक्री का छोटा सारांश देखें।", "रिपोर्ट खोलें", "दिए हों तो तारीख चुनें", "ऑर्डर और बिक्री देखें"],
        ["दुकान की सेटिंग्स", "दुकान और वेबसाइट की जानकारी सँभालें।", "सेटिंग्स खोलें", "जो बदलना है, उसे चुनें", "बदलाव सेव करें"],
    ],
    hinglish: [
        ["Shop details", "Shop ka naam, contact, address aur opening time jodein.", "Shop details add ya change karein", "Naam, phone aur address bhariye", "Kaam ho jaaye to save karein"],
        ["Products", "Jo samaan bechte hain, uski photo, naam aur price jodein.", "Product add karein", "Saaf photo upload karein", "Naam aur price bhariye"],
        ["Categories", "Milte-julte samaan ko ek saath rakhein, taaki customer aasani se dhoondhe.", "Nayi category banayein", "Chhota sa naam dein", "Usmein products jodein"],
        ["Brands", "Apne brands jodein aur unhe products ke saath connect karein.", "Brand ka naam likhein", "Logo ho to upload karein", "Product mein brand chuniye"],
        ["Services", "Apni service aur customer ke contact karne ka tareeka likhein.", "Service add karein", "Service ki details likhein", "Price ya contact jodein"],
        ["Orders", "Customer ke orders dekhein aur kaam ke hisaab se status badlein.", "Order kholiye", "Customer aur items check karein", "Order ka status update karein"],
        ["Customers", "Customers ki details aur unke orders dekhein.", "Customer list kholiye", "Customer chuniye", "Contact aur order details dekhein"],
        ["Banners", "Website par offer ya zaroori message dikhayein.", "Banner add karein", "Photo chuniye", "Chhota message likh kar save karein"],
        ["Portfolio", "Apne kaam aur complete projects ki photos dikhayein.", "Portfolio item add karein", "Photo chuniye", "Title likh kar save karein"],
        ["Coupons", "Customers ke liye discount code banayein.", "Coupon banayein", "Discount aur last date chuniye", "Code save karke share karein"],
        ["Live Preview", "Customer ko website kaisi dikhegi, yahan dekhein.", "Live Preview kholiye", "Pages check karein", "Badlav ke liye wapas aayein"],
        ["Shop Editor", "Website ke pages aur un par likhi details badlein.", "Shop Editor kholiye", "Page chuniye", "Badlav karke save karein"],
        ["Reports", "Shop ke orders aur sales ka short summary dekhein.", "Reports kholiye", "Date range ho to chuniye", "Orders aur sales dekhein"],
        ["Shop Settings", "Shop aur website ki details yahan manage karein.", "Shop Settings kholiye", "Jo badalna hai, use chuniye", "Badlav save karein"],
    ],
};

function ShopAdminWelcome() {
    const navigate = useNavigate();
    const user = readShopAdminUser();
    const shop = user?.shop || {};
    const isServiceShop = String(shop.shopType || shop.ShopType || user?.shopType || "Ecommerce").toLowerCase() === "service";
    const tenantId = getShopAdminTenantId(user);
    const [language, setLanguage] = useState(() => getShopAdminLanguage(user));
    const text = copy[language] || copy.en;
    const hour = new Date().getHours();
    const ownerName = shop.OwnerName || user?.fullName || "Shop Owner";
    const greeting = language === "hi"
        ? `नमस्कार, ${ownerName} जी`
        : `${text.greeting[hour < 12 ? 0 : hour < 17 ? 1 : 2]}, ${ownerName}${language === "hinglish" ? " ji" : ""}`;

    useEffect(() => {
        const syncLanguage = (event) => {
            if (!event.detail || String(event.detail.tenantId) === String(tenantId)) {
                setLanguage(getShopAdminLanguage(readShopAdminUser()));
            }
        };
        window.addEventListener("shop-admin-language-change", syncLanguage);
        return () => window.removeEventListener("shop-admin-language-change", syncLanguage);
    }, [tenantId]);

    const chooseLanguage = (nextLanguage) => {
        setShopAdminLanguage(user, nextLanguage);
        setLanguage(nextLanguage);
    };

    if (isServiceShop) return <Navigate to="/shop-admin/dashboard" replace />;

    const getModuleText = (module, index) => language === "en"
        ? [module[0], module[1], module[2], module[3], module[4]]
        : moduleCopy[language]?.[index] || [module[0], module[language === "hi" ? 5 : 6], module[2], module[3], module[4]];

    return (
        <div className="shop-welcome-page">
            <section className="shop-welcome-hero">
                <div className="welcome-orb welcome-orb-one" />
                <div className="welcome-orb welcome-orb-two" />
                <div className="welcome-brand-row">
                    <div className="welcome-logo"><Store size={25} /></div>
                    <div><strong>ShopBuilder</strong><span>{text.eyebrow}</span></div>
                    <div className="welcome-language-switch" role="group" aria-label="Choose language">
                        {["en", "hi", "hinglish"].map((code) => (
                            <button key={code} type="button" className={language === code ? "active" : ""} aria-pressed={language === code} onClick={() => chooseLanguage(code)}>
                                {text.languages[code]}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="welcome-hero-grid">
                    <div className="welcome-copy">
                        <p className="welcome-owner-greeting">{greeting}</p>
                        <h1>{text.headline}</h1>
                        <p className="welcome-subtitle">{text.subtitle}</p>
                        <button type="button" className="welcome-primary-button" onClick={() => navigate("/shop-admin/settings")}>
                            <Rocket size={19} /> {text.start} <ArrowRight size={17} />
                        </button>
                        <span className="welcome-hint">{text.startHint}</span>
                    </div>
                    <div className="welcome-preview-card" aria-label={shop.ShopName || shop.shopName || "Shop preview"}>
                        <div className="welcome-preview-top"><span><Store size={17} /> {shop.ShopName || shop.shopName || "My Shop"}</span><span className="preview-live"><i /> LIVE</span></div>
                        <div className="welcome-preview-body">
                            <div className="preview-sidebar"><b>SB</b><span className="preview-selected"><BarChart3 size={14} /> Dashboard</span><span><Package size={14} /> Products</span><span><ShoppingCart size={14} /> Orders</span><span><Settings size={14} /> Settings</span></div>
                            <div className="preview-content"><h3>{text.modulesTitle}</h3><div className="preview-stats"><span><Package size={17} /><b>24</b><small>{language === "hi" ? "उत्पाद" : language === "hinglish" ? "Products" : "Products"}</small></span><span><ShoppingCart size={17} /><b>128</b><small>{language === "hi" ? "ऑर्डर" : "Orders"}</small></span><span><Users size={17} /><b>4.2K</b><small>{language === "hi" ? "विज़िटर" : "Visitors"}</small></span></div><div className="preview-chart"><div className="preview-chart-title">{language === "hi" ? "बिक्री का सारांश" : "Sales overview"}</div><svg viewBox="0 0 420 120" role="img" aria-label="Sales trend"><defs><linearGradient id="welcomeSalesFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#25b874" stopOpacity=".3"/><stop offset="100%" stopColor="#25b874" stopOpacity="0"/></linearGradient></defs><path d="M0 100 C40 85 40 45 85 65 S145 88 178 48 S235 68 270 40 S322 62 354 24 S390 40 420 8 V120 H0Z" fill="url(#welcomeSalesFill)"/><path d="M0 100 C40 85 40 45 85 65 S145 88 178 48 S235 68 270 40 S322 62 354 24 S390 40 420 8" fill="none" stroke="#15a66a" strokeWidth="4" strokeLinecap="round"/></svg></div></div>
                        </div>
                    </div>
                </div>
            </section>

            <section className="welcome-setup-section">
                <div className="welcome-section-heading"><span className="welcome-check"><Check size={20} /></span><div><h2>{text.start}</h2><p>{text.startHint}</p></div></div>
                <div className="welcome-steps-grid">
                    {text.setup.map((step, index) => (
                        <button key={step} type="button" className="welcome-step-card" onClick={() => navigate(["/shop-admin/settings", "/shop-admin/products", "/shop-admin/live-preview", "/shop-admin/live-preview"][index])}>
                            <span className="welcome-step-number">{index + 1}</span>
                            <span className="welcome-step-icon">{[<Store key="store"/>, <Package key="package"/>, <Eye key="eye"/>, <Globe2 key="globe"/>][index]}</span>
                            <strong>{step}</strong><small>{text.setupDescriptions[index]}</small>
                        </button>
                    ))}
                </div>
            </section>

            <section className="welcome-modules-section">
                <div className="welcome-section-heading"><span className="welcome-heading-icon"><BarChart3 size={21}/></span><div><h2>{text.modulesTitle}</h2><p>{text.modulesSubtitle}</p></div></div>
                <div className="welcome-module-grid">
                    {copy.en.modules.map((module, index) => {
                        const [title, description, stepOne, stepTwo, stepThree] = getModuleText(module, index);
                        const Icon = module[8];
                        return <article className="welcome-module-card" key={module[0]}>
                            <div className="welcome-module-icon"><Icon size={22}/></div>
                            <h3>{title}</h3><p>{description}</p>
                            <ol><li>{stepOne}</li><li>{stepTwo}</li><li>{stepThree}</li></ol>
                            <button type="button" onClick={() => navigate(module[7])}>{text.open}<ArrowRight size={15}/></button>
                        </article>;
                    })}
                </div>
            </section>

            <section className="welcome-bottom-grid">
                <div className="welcome-domain-card"><Globe2 size={31}/><div><h3>{text.domainTitle}</h3><p>{text.domainText}</p><button type="button" onClick={() => navigate("/shop-admin/settings")}>{language === "hi" ? "सेटिंग्स खोलें" : language === "hinglish" ? "Settings kholiye" : "Open Shop Settings"}<ArrowRight size={15}/></button></div></div>
                <div className="welcome-help-card"><div className="welcome-help-icon"><Check size={20}/></div><h3>{text.help}</h3><button type="button" onClick={() => navigate("/shop-admin/help")}>{text.helpButton}<ArrowRight size={16}/></button></div>
            </section>
            <footer className="welcome-footer"><span><Store size={16}/> ShopBuilder · {shop.ShopName || shop.shopName || "My Shop"}</span><button type="button" onClick={() => navigate("/shop-admin/dashboard")}>{text.dashboard}<ArrowRight size={16}/></button></footer>
        </div>
    );
}

export default ShopAdminWelcome;
