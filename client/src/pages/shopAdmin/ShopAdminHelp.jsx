import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { BookOpenCheck, ChevronDown, CircleHelp, Search } from "lucide-react";
import { getShopAdminLanguage, getShopAdminTenantId, readShopAdminUser, setShopAdminLanguage } from "../../lib/shopAdminLanguage.js";
import "../../styles/shop-admin/shop-admin-help.css";

const guideText = {
    en: {
        eyebrow: "HELP CENTER · SIMPLE GUIDES",
        title: "A little help, one step at a time",
        intro: "Choose a shop section below. Open its guide and follow the numbered steps. You can change the language any time.",
        search: "Search for a section, like products or orders…",
        count: "guides for your shop",
        purpose: "What this section is for",
        steps: "Try these steps",
        tip: "Small tip",
        openSection: "Open this section",
        tips: ["Save your work before leaving the page.", "A clear photo helps customers understand what you sell.", "Check the order status after you take action.", "You can change these details later."],
        empty: "No guide found. Try a shorter search word.",
        language: { en: "English", hi: "हिन्दी", hinglish: "Hinglish" },
        guides: [
            ["Dashboard", "See a quick summary of your shop, sales and orders.", ["Open Dashboard from the sidebar.", "Look at the number cards for a quick count.", "Scroll down to see sales, recent orders and items that need attention."], "Start here when you want to see how your shop is doing."],
            ["Live Preview", "See the website the way a customer sees it.", ["Open Live Preview.", "Tap or click the pages and links to look around.", "If something needs changing, return to Shop Editor."], "Preview is only a look. Changes are made in the editor."],
            ["Shop Editor", "Change the pages and words on your website.", ["Open Shop Editor.", "Choose the page you want to change.", "Edit the words or pictures, then save.", "Open Live Preview to check your changes."], "Keep headings and messages short and easy to read."],
            ["Shop details & settings", "Set your shop name, contact details, address and opening hours.", ["Open Shop Settings.", "Fill in your shop name and contact details.", "Add your address and opening/closing time.", "Save. Check that your phone number is correct."], "Customers use this information to find and contact you."],
            ["Products", "Add and update the items you sell.", ["Open Products and choose Add Product.", "Enter the product name and price.", "Add a clear photo and a short description.", "Save, then check that the item appears in the list."], "If an item is sold out, update its stock or availability."],
            ["Categories", "Group similar products so they are easier to find.", ["Open Categories and choose Add Category.", "Give the group a simple name, like Clothes or Food.", "Save it, then choose that category when adding a product."], "Use names your customers already know."],
            ["Brands", "Show the brands that your shop sells.", ["Open Brands and choose Add Brand.", "Type the brand name and add its logo if you have one.", "Save. Select this brand on the related products."], "Check the spelling so customers can find the brand."],
            ["Services", "Tell customers what service you provide.", ["Open Services and choose Add Service.", "Write the service name and what is included.", "Add the price or how customers can ask for a price.", "Save and check the service card."], "Use everyday words to explain what the customer gets."],
            ["Orders", "See what customers ordered and keep them updated.", ["Open Orders and select an order.", "Check the items, amount and customer contact.", "Prepare the order, then choose the correct status.", "Contact the customer if you need more information."], "Only mark an order complete after it is actually done."],
            ["Customers", "See customer contact details and their orders.", ["Open Customers.", "Choose a customer to see their details.", "Use the contact information only to help with their shop order."], "Keep customer information private."],
            ["Banners", "Put an offer or important message on your website.", ["Open Banners and choose Add Banner.", "Choose a clear picture.", "Write a short message, such as New Arrivals.", "Save and check it in Live Preview."], "Use a picture that is easy to see on a phone."],
            ["Portfolio", "Show photos of your work or finished projects.", ["Open Portfolio and choose Add Item.", "Choose a photo of your work.", "Add a short title and description.", "Save and check it in Live Preview."], "Only add photos you have permission to use."],
            ["Coupons", "Give customers a discount code for their order.", ["Open Coupons and choose Add Coupon.", "Create a short code customers can type.", "Choose the discount and its end date.", "Save and share the code with customers."], "Check the end date and discount before sharing."],
            ["Reports", "Review your shop activity and sales summary.", ["Open Reports from the sidebar.", "Choose a date range if one is shown.", "Review the totals and recent activity."], "A report is a summary. Open Orders to see each order."],
            ["Notifications", "The bell at the top tells you about new orders, low or finished stock, new customers and new enquiries.", ["Look at the bell at the top right. A red number means there is something new.", "Click the bell to see the list. \"Needs attention\" shows stock and late orders first.", "Click a notification to open that section.", "Click \"Mark all as read\" when you have seen everything."], "The bell checks for new things every minute while the dashboard is open."],
        ],
    },
    hi: {
        eyebrow: "मदद केंद्र · आसान गाइड",
        title: "थोड़ी-सी मदद, एक कदम एक बार",
        intro: "नीचे दुकान का भाग चुनें। गाइड खोलें और नंबर वाले कदम करें। भाषा आप कभी भी बदल सकते हैं।",
        search: "भाग खोजें, जैसे उत्पाद या ऑर्डर…",
        count: "आसान गाइड",
        purpose: "यह भाग किस काम का है",
        steps: "इसे ऐसे करें",
        tip: "छोटी-सी सलाह",
        openSection: "यह भाग खोलें",
        tips: ["पेज छोड़ने से पहले अपना काम सेव करें।", "साफ फोटो से ग्राहक सामान आसानी से समझते हैं।", "काम करने के बाद ऑर्डर की स्थिति जाँचें।", "आप ये जानकारी बाद में भी बदल सकते हैं।"],
        empty: "गाइड नहीं मिली। कोई छोटा शब्द लिखकर देखें।",
        language: { en: "English", hi: "हिन्दी", hinglish: "Hinglish" },
        guides: [
            ["डैशबोर्ड", "दुकान, बिक्री और ऑर्डर की छोटी जानकारी यहाँ देखें।", ["बगल की सूची में डैशबोर्ड खोलें।", "ऊपर के कार्ड से कुल गिनती देखें।", "नीचे जाकर बिक्री, नए ऑर्डर और ध्यान देने वाली चीज़ें देखें।"], "दुकान कैसी चल रही है, यह देखने के लिए यहाँ आएँ।"],
            ["लाइव प्रीव्यू", "ग्राहक को वेबसाइट कैसी दिखती है, यहाँ देखें।", ["लाइव प्रीव्यू खोलें।", "पेज और लिंक दबाकर देखकर जाएँ।", "कुछ बदलना हो तो शॉप एडिटर खोलें।"], "यहाँ सिर्फ वेबसाइट देखते हैं। बदलाव एडिटर में होते हैं।"],
            ["शॉप एडिटर", "वेबसाइट के पेज और उन पर लिखी बातें बदलें।", ["शॉप एडिटर खोलें।", "जिस पेज में बदलाव करना है, उसे चुनें।", "लिखावट या तस्वीर बदलें और सेव करें।", "लाइव प्रीव्यू में बदलाव जाँचें।"], "शीर्षक और संदेश छोटे रखें ताकि पढ़ना आसान हो।"],
            ["दुकान की जानकारी और सेटिंग्स", "दुकान का नाम, संपर्क, पता और खुलने का समय भरें।", ["दुकान की सेटिंग्स खोलें।", "नाम और संपर्क की जानकारी भरें।", "पता और खुलने-बंद होने का समय लिखें।", "सेव करें और फोन नंबर जाँचें।"], "ग्राहक इसी जानकारी से आप तक पहुँचते हैं।"],
            ["उत्पाद", "जो सामान बेचते हैं उसे जोड़ें या बदलें।", ["उत्पाद खोलें और नया उत्पाद चुनें।", "उत्पाद का नाम और कीमत भरें।", "साफ फोटो और छोटा विवरण जोड़ें।", "सेव करें और सूची में देखकर जाँचें।"], "सामान खत्म हो जाए तो उसकी उपलब्धता बदलें।"],
            ["श्रेणियाँ", "मिलते-जुलते सामान को एक साथ रखें।", ["श्रेणियाँ खोलें और नई श्रेणी चुनें।", "आसान नाम लिखें, जैसे कपड़े या खाना।", "सेव करें और सामान जोड़ते समय यह श्रेणी चुनें।"], "ऐसा नाम रखें जो ग्राहक आसानी से समझें।"],
            ["ब्रांड", "दुकान में मिलने वाले ब्रांड दिखाएँ।", ["ब्रांड खोलें और नया ब्रांड चुनें।", "ब्रांड का नाम लिखें। लोगो हो तो जोड़ें।", "सेव करें और उस ब्रांड के सामान में इसे चुनें।"], "नाम की वर्तनी जाँचें ताकि ग्राहक इसे खोज सकें।"],
            ["सेवाएँ", "ग्राहक को बताएँ कि आप कौन-सी सेवा देते हैं।", ["सेवाएँ खोलें और नई सेवा चुनें।", "सेवा का नाम और उसमें क्या मिलेगा, लिखें।", "कीमत या कीमत पूछने का तरीका लिखें।", "सेव करें और सेवा को देखकर जाँचें।"], "आसान शब्दों में बताएँ कि ग्राहक को क्या मिलेगा।"],
            ["ऑर्डर", "ग्राहक के सामान और ऑर्डर की स्थिति देखें।", ["ऑर्डर खोलें और एक ऑर्डर चुनें।", "सामान, रकम और ग्राहक का संपर्क जाँचें।", "सामान तैयार करें और सही स्थिति चुनें।", "जानकारी कम हो तो ग्राहक से बात करें।"], "काम पूरा होने के बाद ही ऑर्डर पूरा दिखाएँ।"],
            ["ग्राहक", "ग्राहक का संपर्क और उनके ऑर्डर देखें।", ["ग्राहक खोलें।", "जानकारी देखने के लिए ग्राहक चुनें।", "संपर्क जानकारी का उपयोग ऑर्डर की मदद के लिए करें।"], "ग्राहक की जानकारी निजी रखें।"],
            ["बैनर", "वेबसाइट पर ऑफ़र या ज़रूरी बात दिखाएँ।", ["बैनर खोलें और नया बैनर चुनें।", "साफ तस्वीर चुनें।", "छोटा संदेश लिखें, जैसे नया सामान आया।", "सेव करें और लाइव प्रीव्यू में देखें।"], "ऐसी तस्वीर लें जो फोन पर भी साफ दिखे।"],
            ["पोर्टफ़ोलियो", "अपने काम या पूरे किए गए प्रोजेक्ट की तस्वीरें दिखाएँ।", ["पोर्टफ़ोलियो खोलें और नई जानकारी जोड़ें।", "अपने काम की तस्वीर चुनें।", "छोटा शीर्षक और जानकारी लिखें।", "सेव करें और लाइव प्रीव्यू में देखें।"], "वही तस्वीरें जोड़ें जिनका उपयोग करने की अनुमति हो।"],
            ["कूपन", "ग्राहक को ऑर्डर पर छूट देने का कोड बनाएँ।", ["कूपन खोलें और नया कूपन चुनें।", "छोटा कोड बनाएँ जिसे ग्राहक लिख सके।", "छूट और आखिरी तारीख चुनें।", "सेव करके ग्राहकों को कोड बताएँ।"], "साझा करने से पहले छूट और आखिरी तारीख जाँचें।"],
            ["रिपोर्ट", "दुकान की बिक्री और काम का सारांश देखें।", ["बगल की सूची से रिपोर्ट खोलें।", "तारीख पूछे तो तारीख चुनें।", "कुल बिक्री और नया काम देखें।"], "रिपोर्ट सारांश है। हर ऑर्डर देखने के लिए ऑर्डर खोलें।"],
            ["सूचनाएँ", "ऊपर की घंटी नए ऑर्डर, कम या ख़त्म स्टॉक, नए ग्राहक और नई पूछताछ बताती है।", ["ऊपर दाईं ओर घंटी देखें। लाल नंबर का मतलब है कुछ नया आया है।", "सूची देखने के लिए घंटी दबाएँ। \"ध्यान दें\" में स्टॉक और देर वाले ऑर्डर पहले दिखते हैं।", "जिस सूचना को दबाएँगे, उसका भाग खुल जाएगा।", "सब देखने के बाद \"सब पढ़ा हुआ करें\" दबाएँ।"], "डैशबोर्ड खुला रहने पर घंटी हर मिनट नई जानकारी देखती है।"],
        ],
    },
    hinglish: {
        eyebrow: "MADAD CENTER · SIMPLE GUIDES",
        title: "Thodi madad, ek step ek baar",
        intro: "Neeche shop ka section chuniye. Guide kholkar number wale steps follow kijiye. Language kabhi bhi badal sakte hain.",
        search: "Section search karein, jaise products ya orders…",
        count: "simple guides",
        purpose: "Ye section kis kaam ka hai",
        steps: "Is tarah karein",
        tip: "Chhoti si tip",
        openSection: "Section kholiye",
        tips: ["Page chhodne se pehle apna kaam save karein.", "Saaf photo se customer ko samaan samajhne mein aasani hoti hai.", "Kaam karne ke baad order status check karein.", "Ye details baad mein bhi badal sakte hain."],
        empty: "Guide nahi mili. Koi chhota word search karke dekhein.",
        language: { en: "English", hi: "हिन्दी", hinglish: "Hinglish" },
        guides: [
            ["Dashboard", "Shop, sales aur orders ka short summary yahan dekhein.", ["Sidebar se Dashboard kholiye.", "Upar ke cards se total count dekhein.", "Neeche sales, naye orders aur dhyan dene wali cheezein dekhein."], "Shop ka haal dekhne ke liye yahan se shuru karein."],
            ["Live Preview", "Customer ko website kaisi dikhti hai, yahan check karein.", ["Live Preview kholiye.", "Pages aur links click karke dekhein.", "Kuch badalna ho to Shop Editor kholiye."], "Yahan website sirf dekhte hain. Changes Editor mein hote hain."],
            ["Shop Editor", "Website ke pages aur un par likhe words badlein.", ["Shop Editor kholiye.", "Jis page ko badalna hai, use chuniye.", "Words ya photo badal kar save karein.", "Live Preview mein changes check karein."], "Heading aur message chhote rakhein, padhna easy hoga."],
            ["Shop details & settings", "Shop ka naam, contact, address aur opening time bhariye.", ["Shop Settings kholiye.", "Naam aur contact details bhariye.", "Address aur opening/closing time bhariye.", "Save karke phone number check karein."], "Customer isi details se aapse contact karenge."],
            ["Products", "Jo samaan bechte hain, use add ya update karein.", ["Products kholkar Add Product chuniye.", "Product ka naam aur price bhariye.", "Saaf photo aur chhota description jodiye.", "Save karke list mein check karein."], "Samaan khatam ho to stock ya availability badlein."],
            ["Categories", "Milte-julte products ko ek saath rakhein.", ["Categories kholkar Add Category chuniye.", "Simple naam dein, jaise kapde ya khana.", "Save karke products mein ye category chuniye."], "Aisa naam rakhein jo customers aasani se samjhein."],
            ["Brands", "Shop mein milne wale brands dikhayein.", ["Brands kholkar Add Brand chuniye.", "Brand ka naam likhein. Logo ho to add karein.", "Save karke related products mein brand chuniye."], "Spelling check karein, taaki customers brand dhoondh saken."],
            ["Services", "Customers ko batayein ki aap kaunsi service dete hain.", ["Services kholkar Add Service chuniye.", "Service ka naam aur usmein kya milega, likhein.", "Price ya price poochne ka tareeka jodein.", "Save karke service card check karein."], "Simple words mein batayein ki customer ko kya milega."],
            ["Orders", "Customer ke orders aur unka status dekhein.", ["Orders kholkar ek order chuniye.", "Items, amount aur customer contact check karein.", "Order taiyar karein aur sahi status chuniye.", "Details kam hon to customer se baat karein."], "Order complete hone ke baad hi use complete mark karein."],
            ["Customers", "Customer contact aur unke orders dekhein.", ["Customers kholiye.", "Details dekhne ke liye customer chuniye.", "Contact details ka use order mein madad ke liye karein."], "Customer ki details private rakhein."],
            ["Banners", "Website par offer ya zaroori message dikhayein.", ["Banners kholkar Add Banner chuniye.", "Saaf photo chuniye.", "Chhota message likhein, jaise New Arrivals.", "Save karke Live Preview mein dekhein."], "Aisi photo use karein jo phone par bhi saaf dikhe."],
            ["Portfolio", "Apne kaam aur complete projects ki photos dikhayein.", ["Portfolio kholkar Add Item chuniye.", "Apne kaam ki photo chuniye.", "Chhota title aur description jodiye.", "Save karke Live Preview mein check karein."], "Sirf wahi photos add karein jinhe use karne ki permission ho."],
            ["Coupons", "Customers ke liye order discount code banayein.", ["Coupons kholkar Add Coupon chuniye.", "Chhota code banayein jo customer type kar sake.", "Discount aur last date chuniye.", "Save karke code customers ke saath share karein."], "Share karne se pehle discount aur date check karein."],
            ["Reports", "Shop activity aur sales ka short summary dekhein.", ["Sidebar se Reports kholiye.", "Date range pooche to chuniye.", "Total sales aur latest activity dekhein."], "Report ek summary hai. Har order ke liye Orders kholiye."],
            ["Notifications", "Upar ki ghanti naye orders, kam ya khatam stock, naye customers aur nayi enquiries batati hai.", ["Upar right mein ghanti dekhein. Laal number matlab kuch naya aaya hai.", "List dekhne ke liye ghanti dabaiye. \"Dhyan dein\" mein stock aur late orders pehle dikhte hain.", "Notification dabaiye, uska section khul jayega.", "Sab dekhne ke baad \"Sab read mark karein\" dabaiye."], "Dashboard khula rahe to ghanti har minute nayi cheezein check karti hai."],
        ],
    },
};

const guideRoutes = [
    "/shop-admin/dashboard", "/shop-admin/live-preview", "/shop-admin/website-editor",
    "/shop-admin/settings", "/shop-admin/products", "/shop-admin/categories",
    "/shop-admin/brands", "/shop-admin/services", "/shop-admin/orders",
    "/shop-admin/customers", "/shop-admin/banners", "/shop-admin/portfolio",
    "/shop-admin/coupons", "/shop-admin/reports", "/shop-admin/dashboard",
];

function ShopAdminHelp() {
    const navigate = useNavigate();
    const user = readShopAdminUser();
    const tenantId = getShopAdminTenantId(user);
    const [language, setLanguage] = useState(() => getShopAdminLanguage(user));
    const [query, setQuery] = useState("");
    const text = guideText[language] || guideText.en;

    const chooseLanguage = (nextLanguage) => {
        setShopAdminLanguage(user, nextLanguage);
        setLanguage(nextLanguage);
    };

    useEffect(() => {
        const syncLanguage = (event) => {
            if (!event.detail || String(event.detail.tenantId) === String(tenantId)) {
                setLanguage(getShopAdminLanguage(readShopAdminUser()));
            }
        };
        window.addEventListener("shop-admin-language-change", syncLanguage);
        return () => window.removeEventListener("shop-admin-language-change", syncLanguage);
    }, [tenantId]);

    const guides = useMemo(() => text.guides.filter(([title, description, steps]) => (
        `${title} ${description} ${steps.join(" ")}`.toLowerCase().includes(query.trim().toLowerCase())
    )), [text, query]);

    return (
        <div className="shop-help-page">
            <section className="shop-help-hero">
                <div className="shop-help-hero-icon"><BookOpenCheck size={26}/></div>
                <div className="shop-help-hero-copy">
                    <span>{text.eyebrow}</span>
                    <h1>{text.title}</h1>
                    <p>{text.intro}</p>
                </div>
                <div className="shop-help-languages" role="group" aria-label="Choose guide language">
                    {["en", "hi", "hinglish"].map((code) => <button key={code} type="button" className={language === code ? "active" : ""} aria-pressed={language === code} onClick={() => chooseLanguage(code)}>{text.language[code]}</button>)}
                </div>
            </section>
            <div className="shop-help-toolbar">
                <label className="shop-help-search"><Search size={19}/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={text.search}/></label>
                <span className="shop-help-count">{guides.length} {text.count}</span>
            </div>
            {guides.length ? <div className="shop-help-guide-list">{guides.map(([title, description, steps, tip], index) => (
                <details className="shop-help-guide" key={title} open={index === 0 && !query}>
                    <summary><span className="shop-help-guide-number">{String(index + 1).padStart(2, "0")}</span><span className="shop-help-guide-title"><strong>{title}</strong><small>{description}</small></span><ChevronDown size={20}/></summary>
                    <div className="shop-help-guide-body">
                        <h2><CircleHelp size={17}/> {text.purpose}</h2><p>{description}</p>
                        <h2><BookOpenCheck size={17}/> {text.steps}</h2>
                        <ol>{steps.map((step, stepIndex) => <li key={step}><span>{stepIndex + 1}</span><p>{step}</p></li>)}</ol>
                        <div className="shop-help-tip"><strong>{text.tip}</strong><span>{tip || text.tips[index % text.tips.length]}</span></div>
                        <button type="button" className="shop-help-open-section" onClick={() => navigate(guideRoutes[text.guides.findIndex((guide) => guide[0] === title)] || "/shop-admin/dashboard")}>{text.openSection}</button>
                    </div>
                </details>
            ))}</div> : <div className="shop-help-empty"><CircleHelp size={28}/><strong>{text.empty}</strong></div>}
        </div>
    );
}

export default ShopAdminHelp;
