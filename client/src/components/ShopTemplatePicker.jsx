import "../styles/ShopTemplatePicker.css";
import { SHOP_TEMPLATES } from "./shopTemplates.js";

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
            <button key={template.id} type="button" role="radio" aria-checked={selected} data-template={template.id} className={`shop-template-option${selected ? " selected" : ""}`} onClick={() => onChange(template.id)}>
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