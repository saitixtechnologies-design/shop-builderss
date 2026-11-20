export const normalizeProductImages = (value) => {
    if (value == null) return null;
    let images = value;
    if (typeof images === "string") {
        try { images = JSON.parse(images); } catch { images = images ? [images] : []; }
    }
    if (!Array.isArray(images)) return [];
    return images.map((image) => typeof image === "string" ? image : image?.ImageURL ?? image?.imageURL ?? image?.url)
        .filter((url) => typeof url === "string" && url.trim())
        .map((url) => url.trim()).slice(0, 10);
};

export const replaceProductImages = async (db, productID, value) => {
    const images = normalizeProductImages(value);
    if (images === null) return;
    await db.request().input("ProductID", Number(productID)).query(`DELETE FROM dbo.ProductImages WHERE ProductID = @ProductID`);
    for (let index = 0; index < images.length; index += 1) {
        await db.request()
            .input("ProductID", Number(productID))
            .input("ImageURL", images[index])
            .input("SortOrder", index)
            .input("IsPrimary", index === 0)
            .query(`INSERT INTO dbo.ProductImages (ProductID, ImageURL, SortOrder, IsPrimary) VALUES (@ProductID, @ImageURL, @SortOrder, @IsPrimary)`);
    }
};

export const productImagesSql = `(SELECT pi.ProductImageID, pi.ImageURL, pi.AltText, pi.SortOrder, pi.IsPrimary FROM dbo.ProductImages pi WHERE pi.ProductID = p.ProductID ORDER BY pi.SortOrder, pi.ProductImageID FOR JSON PATH)`;
