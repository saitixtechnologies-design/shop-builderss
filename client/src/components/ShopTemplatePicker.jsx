import "../styles/ShopTemplatePicker.css";

export const SHOP_TEMPLATES = {
  Ecommerce: [
    { id: "editorial", name: "Editorial Atelier", note: "Warm, curated and story-led", colors: ["#f7f5f0", "#193b35", "#d49b60"], sample: "A little more you." },
    { id: "minimal", name: "Modern Minimal", note: "Clean lines and calm product focus", colors: ["#f7f8f7", "#202a2a", "#a7b7a9"], sample: "Made for everyday." },
    { id: "boutique", name: "Boutique Luxe", note: "Polished details and boutique warmth", colors: ["#f2e9dc", "#34251f", "#c59b67"], sample: "Find your favourite." }
  ],
  Service: [
    { id: "studio", name: "Creative Studio", note: "Editorial portfolio for your work", colors: ["#f7f5f0", "#193b35", "#d49b60"], sample: "Good work starts here." },
    { id: "serene", name: "Serene Studio", note: "Soft, welcoming and people-first", colors: ["#f0f5f1", "#29483d", "#b4c8ae"], sample: "Care in every detail." },
    { id: "modern", name: "Modern Service", note: "Confident, bold and straightforward", colors: ["#f5f6f8", "#1c2637", "#687be8"], sample: "Solutions that fit." }
  ]
};

export const getDefaultWebsiteTemplate = (shopType) => shopType === "Service" ? "studio" : "editorial";

export default function ShopTemplatePicker({ shopType = "Ecommerce", value, onChange }) {
  const options = SHOP_TEMPLATES[shopType] || SHOP_TEMPLATES.Ecommerce;
  return (
    <section className="shop-template-picker" aria-labelledby="shop-template-title">
      <div className="shop-template-picker-heading">
        <div><span>WEBSITE DESIGN</span><h2 id="shop-template-title">Choose a storefront template</h2><p>Your products, services and shop details stay the same. You can switch templates later.</p></div>
      </div>
      <div className="shop-template-options" role="radiogroup" aria-label="Storefront templates">
        {options.map((template) => {
          const selected = value === template.id;
          return (
            <button key={template.id} type="button" role="radio" aria-checked={selected} className={`shop-template-option${selected ? " selected" : ""}`} onClick={() => onChange(template.id)}>
              <span className="template-mini-preview" style={{ "--template-bg": template.colors[0], "--template-ink": template.colors[1], "--template-accent": template.colors[2] }}>
                <span className="template-mini-nav"><i /><i /><i /><b /></span>
                <span className="template-mini-hero"><small>{template.name}</small><strong>{template.sample}</strong><i /></span>
                <span className="template-mini-products"><i /><i /><i /></span>
              </span>
              <span className="shop-template-option-copy"><strong>{template.name}</strong><small>{template.note}</small></span>
              <span className="shop-template-radio" aria-hidden="true">{selected ? "✓" : ""}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}