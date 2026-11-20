const apiOrigin = (
    import.meta.env.VITE_API_URL ||
    "http://localhost:5001"
)
    .trim()
    .replace(/\/+$/, "");


/** Backend address, from VITE_API_URL (falls back to the local API during development). */
export const API_ORIGIN = apiOrigin;


export const apiUrl = (path) =>
    `${apiOrigin}/${String(path).replace(/^\/+/, "")}`;


// =====================================================
// DECODE JWT
// =====================================================

const decodePayload = (token) => {

    try {

        const payload = token
            .split(".")[1]
            ?.replace(/-/g, "+")
            .replace(/_/g, "/");

        if (!payload) return null;

        return JSON.parse(atob(payload));

    } catch {

        return null;

    }

};


// =====================================================
// NORMALIZE ROLE
// =====================================================

const normalizeRole = (role) =>
    String(role || "")
        .toLowerCase()
        .replace(/[ \_-]/g, "");


// =====================================================
// GET PERSISTED TOKEN
// =====================================================

const getPersistedToken = (
    expectedRole,
    keys,
    canonicalKey,
    userKeys
) => {

    for (const key of keys) {

        const token =
            localStorage.getItem(key);

        if (!token) continue;


        const claims =
            decodePayload(token);

        if (
            normalizeRole(claims?.role) !==
            expectedRole
        ) {
            continue;
        }


        // Check expiry

        if (
            !Number.isFinite(claims?.exp) ||
            claims.exp * 1000 <= Date.now()
        ) {

            localStorage.removeItem(key);

            continue;

        }


        // Keep canonical token

        if (canonicalKey !== key) {

            localStorage.setItem(
                canonicalKey,
                token
            );

        }


        const claimUserID =
            claims.userID ??
            claims.UserID;


        // Find stored user

        const storedUser =
            userKeys
                .map((userKey) => {

                    try {

                        return JSON.parse(
                            localStorage.getItem(
                                userKey
                            ) || "null"
                        );

                    } catch {

                        return null;

                    }

                })
                .find(
                    (candidate) =>
                        candidate &&
                        (
                            claimUserID == null ||
                            Number(
                                candidate.userID ??
                                candidate.UserID
                            ) ===
                            Number(claimUserID)
                        )
                );


        const user =
            storedUser ||
            {
                userID: claimUserID,

                role: claims.role,

                shopID:
                    claims.shopID ??
                    claims.ShopID ??
                    null,

                email:
                    claims.email ?? "",

                fullName:
                    claims.fullName ??
                    claims.FullName ??
                    ""
            };


        user.userID =
            claimUserID ??
            user.userID ??
            user.UserID;


        user.role =
            claims.role;


        user.shopID =
            claims.shopID ??
            claims.ShopID ??
            user.shopID ??
            null;


        userKeys.forEach(
            (userKey) => {

                localStorage.setItem(
                    userKey,
                    JSON.stringify(user)
                );

            }
        );


        return token;

    }


    return "";

};


// =====================================================
// SUPER ADMIN TOKEN
// =====================================================

export const getSuperAdminToken = () =>
    getPersistedToken(
        "superadmin",

        [
            "superAdminToken",
            "adminToken",
            "token",
            "shopBuilderToken"
        ],

        "superAdminToken",

        [
            "superAdminUser",
            "adminUser",
            "shopBuilderUser",
            "user"
        ]
    );


// =====================================================
// SHOP ADMIN TOKEN
// =====================================================

export const getShopAdminToken = () =>
    getPersistedToken(
        "shopadmin",

        [
            "shopAdminToken",
            "shopToken",
            "shopBuilderToken",
            "token"
        ],

        "shopAdminToken",

        [
            "shopAdminUser",
            "shopBuilderUser"
        ]
    );


// =====================================================
// SUPER ADMIN HEADERS
// =====================================================

export const getSuperAdminHeaders = (
    headers = {}
) => {

    const result =
        new Headers(headers);


    const token =
        getSuperAdminToken();


    if (token) {

        result.set(
            "Authorization",
            `Bearer ${token}`
        );

    } else {

        result.delete(
            "Authorization"
        );

    }


    return result;

};


// =====================================================
// SHOP ADMIN HEADERS
// =====================================================

export const getShopAdminHeaders = (
    headers = {}
) => {

    const result =
        new Headers(headers);


    const token =
        getShopAdminToken();


    if (token) {

        result.set(
            "Authorization",
            `Bearer ${token}`
        );

    } else {

        result.delete(
            "Authorization"
        );

    }


    return result;

};


// =====================================================
// ADMIN FETCH
// =====================================================

export const adminFetch = (
    input,
    options = {}
) => {

    return fetch(
        input,
        {
            ...options,

            headers:
                getSuperAdminHeaders(
                    options.headers
                )
        }
    );

};


// =====================================================
// COMMON JSON REQUEST
// =====================================================

const requestJson = async (
    path,
    method = "GET",
    body = undefined,
    options = {}
) => {

    const headers =
        new Headers(
            options.headers || {}
        );


    headers.set(
        "Content-Type",
        "application/json"
    );


    // =================================================
    // AUTOMATIC AUTH TOKEN
    // =================================================

    const isShopApi =
        String(path).startsWith(
            "/api/shop-"
        );


    const isAdminApi =
        String(path).startsWith(
            "/api/auth"
        ) ||
        String(path).startsWith(
            "/api/password"
        );


    if (isShopApi) {

        const token =
            getShopAdminToken();

        if (token) {

            headers.set(
                "Authorization",
                `Bearer ${token}`
            );

        }

    } else if (isAdminApi) {

        const token =
            getSuperAdminToken();

        if (token) {

            headers.set(
                "Authorization",
                `Bearer ${token}`
            );

        }

    }


    const requestOptions = {

        ...options,

        method,

        headers

    };


    // =================================================
    // BODY
    // =================================================

    if (
        body !== undefined &&
        body !== null
    ) {

        requestOptions.body =
            JSON.stringify(body);

    } else {

        delete requestOptions.body;

    }


    const response =
        await fetch(
            apiUrl(path),
            requestOptions
        );


    const contentType =
        response.headers.get(
            "content-type"
        ) || "";


    if (
        !contentType.includes(
            "application/json"
        )
    ) {

        throw new Error(
            `Backend API returned HTTP ${response.status}, not JSON. Check that the Shop Builder server is running on ${apiOrigin}.`
        );

    }


    const data =
        await response.json();


    return {
        response,
        data
    };

};


// =====================================================
// GET JSON
// =====================================================

export const getJson = async (
    path,
    options = {}
) => {

    return requestJson(
        path,
        "GET",
        undefined,
        options
    );

};


// =====================================================
// POST JSON
// =====================================================

export const postJson = async (
    path,
    body,
    options = {}
) => {

    return requestJson(
        path,
        "POST",
        body,
        options
    );

};


// =====================================================
// PUT JSON
// =====================================================

export const putJson = async (
    path,
    body,
    options = {}
) => {

    return requestJson(
        path,
        "PUT",
        body,
        options
    );

};


// =====================================================
// PATCH JSON
// =====================================================

export const patchJson = async (
    path,
    body,
    options = {}
) => {

    return requestJson(
        path,
        "PATCH",
        body,
        options
    );

};


// =====================================================
// DELETE JSON
// =====================================================

export const deleteJson = async (
    path,
    body,
    options = {}
) => {

    return requestJson(
        path,
        "DELETE",
        body,
        options
    );

};