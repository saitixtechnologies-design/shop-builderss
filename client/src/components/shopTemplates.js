// Storefront templates a shop can choose, by shop type. The server keeps the same list
// (templateOptionsByType in shopController.js / shopSettingsController.js).

export const SHOP_TEMPLATES = {
  Ecommerce: [
    { id: "editorial", name: "Editorial Atelier", note: "Warm, curated and story-led", colors: ["#f7f5f0", "#193b35", "#d49b60"], sample: "A little more you." },
    { id: "minimal", name: "Modern Minimal", note: "Clean lines and calm product focus", colors: ["#f7f8f7", "#202a2a", "#a7b7a9"], sample: "Made for everyday." },
    { id: "boutique", name: "Boutique Luxe", note: "Polished details and boutique warmth", colors: ["#f2e9dc", "#34251f", "#c59b67"], sample: "Find your favourite." },
    { id: "bold", name: "Bold Motion", note: "3D scroll hero, spinning product ring and sticker footer", colors: ["#0e0e11", "#f4f1ea", "#f2b33d"], sample: "Shop the drop." }
  ],
  Service: [
    { id: "studio", name: "Creative Studio", note: "Editorial portfolio for your work", colors: ["#f7f5f0", "#193b35", "#d49b60"], sample: "Good work starts here." },
    { id: "serene", name: "Serene Studio", note: "Soft, welcoming and people-first", colors: ["#f0f5f1", "#29483d", "#b4c8ae"], sample: "Care in every detail." },
    { id: "modern", name: "Modern Service", note: "Confident, bold and straightforward", colors: ["#f5f6f8", "#1c2637", "#687be8"], sample: "Solutions that fit." }
  ]
};

export const getDefaultWebsiteTemplate = (shopType) => shopType === "Service" ? "studio" : "editorial";
