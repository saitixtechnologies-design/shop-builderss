import AdminDataPage from "../AdminDataPage";

function ShopCustomers() {
    return <AdminDataPage
        title="Customers"
        endpoint="/api/shop-data/customers"
        shopAdmin
        columns={[
            { key: "CustomerID", label: "ID" },
            { key: "FullName", label: "Name" },
            { key: "Email", label: "Email" },
            { key: "Phone", label: "Phone" },
            { key: "IsActive", label: "Status", format: "boolean" },
            { key: "CreatedAt", label: "Joined", format: "date" }
        ]}
    />;
}

export default ShopCustomers;
