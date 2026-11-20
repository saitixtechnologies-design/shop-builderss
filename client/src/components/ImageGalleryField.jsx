import { useRef, useState } from "react";
import { ImagePlus, Link2, Trash2, Upload } from "lucide-react";
import { apiUrl } from "../lib/api.js";
import "../styles/ImageGalleryField.css";

export default function ImageGalleryField({ value = [], onChange, token, shopID, label = "Images", multiple = true, maxImages = Infinity }) {
  const inputRef = useRef(null);
  const [url, setUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const images = (Array.isArray(value) ? value : [value]).filter(Boolean);
  const canAddMore = images.length < maxImages;

  const addImage = (image) => {
    if (!image) return;
    if (multiple && !canAddMore) { window.alert(`You can add up to ${maxImages} images.`); return; }
    onChange(multiple ? [...images, image].slice(0, maxImages) : [image]);
  };

  const uploadFiles = async (event) => {
    let files = Array.from(event.target.files || []);
    event.target.value = "";
    if (!files.length) return;
    if (multiple && files.length > maxImages - images.length) {
      window.alert(`You can add ${Math.max(0, maxImages - images.length)} more image(s), up to ${maxImages} in total.`);
      files = files.slice(0, Math.max(0, maxImages - images.length));
    }
    if (!files.length) return;
    if (files.some((file) => !file.type.startsWith("image/"))) {
      window.alert("Please select image files only.");
      return;
    }
    setUploading(true);
    try {
      const uploaded = [];
      for (const file of files) {
        if (file.size > 8 * 1024 * 1024) throw new Error(`${file.name} is larger than 8 MB.`);
        const dataURL = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () => reject(new Error(`Could not read ${file.name}.`));
          reader.readAsDataURL(file);
        });
        const response = await fetch(apiUrl("api/media/image"), {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${token || localStorage.getItem("token") || localStorage.getItem("shopAdminToken") || localStorage.getItem("shopToken") || ""}` },
          body: JSON.stringify({ image: dataURL, mimeType: file.type, shopID })
        });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || `Could not upload ${file.name}.`);
        uploaded.push(apiUrl(result.data.url));
      }
      onChange(multiple ? [...images, ...uploaded].slice(0, maxImages) : [uploaded[0]]);
    } catch (error) {
      window.alert(error.message || "Image upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const addURL = () => {
    if (!url.trim()) return;
    const value = url.trim();
    let imageURL;
    if (value.startsWith("//")) imageURL = `https:${value}`;
    else if (/^https?:\/\//i.test(value)) imageURL = value;
    else if (/^(?:\/?uploads\/)/i.test(value) || value.startsWith("/")) imageURL = apiUrl(value);
    else if (/^(?:www\.)?[a-z0-9-]+(?:\.[a-z0-9-]+)+(?::\d+)?(?:\/|[?#]|$)/i.test(value)) imageURL = `https://${value}`;
    else imageURL = apiUrl(`uploads/${value}`);
    try {
      const parsed = new URL(imageURL);
      if (!["http:", "https:"].includes(parsed.protocol)) throw new Error();
    } catch {
      window.alert("Enter a valid direct image URL, including its domain or upload path.");
      return;
    }
    addImage(imageURL);
    setUrl("");
  };

  return <div className="image-gallery-field">
    <label className="image-gallery-label">{label}</label>
    <div className="image-gallery-actions">
      <input ref={inputRef} className="image-gallery-file" type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple={multiple} onChange={uploadFiles} />
      <button type="button" className="image-gallery-upload" onClick={() => inputRef.current?.click()} disabled={uploading || !canAddMore}>
        {uploading ? <Upload size={16} className="image-gallery-spin" /> : <ImagePlus size={16} />}
        {uploading ? "Uploading..." : "Choose from gallery"}
      </button>
      <div className="image-gallery-url"><input value={url} onChange={(event) => setUrl(event.target.value)} onKeyDown={(event) => event.key === "Enter" && (event.preventDefault(), addURL())} placeholder="Or paste an image URL" /><button type="button" onClick={addURL} title="Add image URL" disabled={!canAddMore}><Link2 size={16} /></button></div>
    </div>
    <div className="image-gallery-hint">PNG, JPG, WEBP or GIF · up to 8 MB each{Number.isFinite(maxImages) ? ` · ${images.length}/${maxImages} added` : ""}</div>
    {images.length > 0 && <div className="image-gallery-list">{images.map((image, index) => <div className="image-gallery-item" key={`${image}-${index}`}><img src={/^https?:\/\//i.test(image) ? image : apiUrl(image)} alt={`${label} ${index + 1}`} /><span>{index === 0 && multiple ? "Main image" : `Image ${index + 1}`}</span><button type="button" title="Remove image" onClick={() => onChange(images.filter((_, imageIndex) => imageIndex !== index))}><Trash2 size={15} /></button></div>)}</div>}
  </div>;
}
