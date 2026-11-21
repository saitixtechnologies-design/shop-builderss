import AdminDataPage from "../AdminDataPage";

/** Shop Admin → Customers: everyone who ordered, with their orders and total spent. */
function ShopCustomers() {
    return <AdminDataPage
        title="Customers"
        endpoint="/api/shop-data/customers"
        shopAdmin
        columns={[
            { key: "FullName", label: "Name" },
            { key: "Phone", label: "Phone" },
            { key: "Email", label: "Email" },
            { key: "OrderCount", label: "Orders" },
            { key: "TotalSpent", label: "Total spent", format: "currency" },
            { key: "LastOrderAtIndia", label: "Last order", format: "indiaDateTime" },
            { key: "JoinedAtIndia", label: "Joined", format: "indiaDateTime" }
        ]}
        rowLink={{
            label: "View orders",
            to: (customer) => `/shop-admin/orders?${new URLSearchParams({ customer: customer.CustomerID, name: customer.FullName || "" })}`
        }}
    />;
}

export default ShopCustomers;
