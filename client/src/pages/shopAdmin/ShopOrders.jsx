import AdminDataPage from "../AdminDataPage";

function ShopOrders() {
    return <AdminDataPage
        title="Orders"
        endpoint="/api/shop-data/orders"
        shopAdmin
        columns={[
            { key: "OrderNumber", label: "Order" },
            { key: "CustomerName", label: "Customer" },
            { key: "OrderStatus", label: "Status" },
            { key: "PaymentStatus", label: "Payment" },
            { key: "GrandTotal", label: "Total", format: "currency" },
            { key: "CreatedAt", label: "Created", format: "date" }
        ]}
    />;
}

export default ShopOrders;
