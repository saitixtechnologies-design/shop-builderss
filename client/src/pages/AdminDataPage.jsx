import { useEffect, useState } from "react";
import { Link } from "react-router";
import { apiUrl, getShopAdminHeaders, getSuperAdminHeaders } from "../lib/api";
import "../styles/data-pages.css";

// rowLink (optional): { label, to: (row) => path } adds a link at the end of each row.
function AdminDataPage({ title, endpoint, columns, shopAdmin = false, rowLink = null }) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let active = true;
        fetch(apiUrl(endpoint), {
            headers: shopAdmin ? getShopAdminHeaders() : getSuperAdminHeaders()
        })
            .then(async (response) => {
                const contentType = response.headers.get("content-type") || "";
                if (!contentType.includes("application/json")) {
                    throw new Error(`API returned HTTP ${response.status}. Check the backend connection.`);
                }
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.message || `Unable to load ${title.toLowerCase()}.`);
                return result.data;
            })
            .then((data) => { if (active) setRows(Array.isArray(data) ? data : []); })
            .catch((loadError) => { if (active) setError(loadError.message || "Unable to load data."); })
            .finally(() => { if (active) setLoading(false); });

        return () => { active = false; };
    }, [endpoint, shopAdmin, title]);

    const formatValue = (value, format) => {
        if (value === null || value === undefined || value === "") return "—";
        if (format === "date") {
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString();
        }
        if (format === "indiaDateTime") {
            // The API already sends Indian time; show it as is.
            const date = new Date(value);
            return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("en-IN", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
        }
        if (format === "boolean") return value ? "Active" : "Inactive";
        if (format === "currency") return Number(value).toLocaleString(undefined, { style: "currency", currency: "INR" });
        return String(value);
    };

    return (
        <section className="record-page">
            <div className="record-page-heading">
                <div><p>Admin Panel</p><h1>{title}</h1><span>{loading ? "Loading records…" : `${rows.length} records`}</span></div>
                <button type="button" onClick={() => window.location.reload()}>Refresh</button>
            </div>
            {error && <div className="record-message error">{error}</div>}
            {!loading && !error && rows.length === 0 && <div className="record-message">No {title.toLowerCase()} found.</div>}
            {rows.length > 0 && <div className="record-table-wrap"><table className="record-table">
                <thead><tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}{rowLink && <th><span className="visually-hidden">{rowLink.label}</span></th>}</tr></thead>
                <tbody>{rows.map((row, index) => <tr key={row[columns[0]?.key] ?? index}>
                    {columns.map((column) => <td key={column.key}>{formatValue(row[column.key], column.format)}</td>)}
                    {rowLink && <td><Link className="record-row-link" to={rowLink.to(row)}>{rowLink.label}</Link></td>}
                </tr>)}</tbody>
            </table></div>}
        </section>
    );
}

export default AdminDataPage;
