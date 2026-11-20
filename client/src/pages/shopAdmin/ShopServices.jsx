import { useEffect, useMemo, useState } from "react";

import {
  Search,
  Plus,
  RefreshCw,
  Edit3,
  Trash2,
  X,
  CheckCircle2,
  AlertCircle,
  Save,
  Wrench,
  Eye,
  AlertTriangle
} from "lucide-react";

import { toast } from "react-toastify";

import "../../styles/shop-admin/shop-services.css";
import ImageGalleryField from "../../components/ImageGalleryField.jsx";

const API_URL =
    import.meta.env.VITE_API_URL || "";

/* =====================================================
   EMPTY FORM
   ===================================================== */

const emptyForm = {
  serviceName: "",
  shortDescription: "",
  description: "",
  price: "",
  imageURL: "",
  imageURLs: [],
  videoURL: "",
  status: "Active"
};

/* =====================================================
   HELPERS
   ===================================================== */

const isActive = (value) => {
  return (
    value === "Active" ||
    value === "active" ||
    value === true ||
    value === 1 ||
    value === "1"
  );
};

const getServiceImages = (service) => {
  let images = [];
  try {
    images = Array.isArray(service?.ImageURLs)
      ? service.ImageURLs
      : typeof service?.ImageURLs === "string"
        ? JSON.parse(service.ImageURLs)
        : [];
  } catch { images = []; }
  const unique = [...new Set((Array.isArray(images) ? images : []).filter((image) => typeof image === "string" && image.trim()).map((image) => image.trim()))].slice(0, 10);
  if (!unique.length && service?.ImageURL) unique.push(service.ImageURL);
  return unique;
};

/* =====================================================
   COMPONENT
   ===================================================== */

function ShopServices() {

  const [services, setServices] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);

  const [editingService, setEditingService] = useState(null);

  const [viewingService, setViewingService] = useState(null);

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState(null);
  const [deletingID, setDeletingID] = useState(null);

  const [form, setForm] = useState({
    ...emptyForm
  });

  /* =====================================================
     TOKEN
     ===================================================== */

  const getToken = () => {
    return (
      localStorage.getItem("shopAdminToken") ||
      localStorage.getItem("shopBuilderToken") ||
      localStorage.getItem("shopToken") ||
      localStorage.getItem("token")
    );
  };

  /* =====================================================
     AUTH HEADERS
     ===================================================== */

  const getHeaders = () => {

    const token = getToken();

    return {
      "Content-Type": "application/json",

      ...(token
        ? {
          Authorization:
            `Bearer ${token}`
        }
        : {})
    };
  };

  /* =====================================================
     LOAD SERVICES
     ===================================================== */

  const loadServices = async () => {

    try {

      setLoading(true);

      const token = getToken();

      if (!token) {
        throw new Error(
          "Shop session not found. Please login again."
        );
      }

      const response = await fetch(
        `${API_URL}/api/shop-services`,
        {
          method: "GET",
          headers: getHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to load services."
        );
      }

      setServices(
        Array.isArray(data.data)
          ? data.data
          : []
      );

    } catch (error) {

      console.error(
        "Shop Services Error:",
        error
      );

      toast.error(
        error.message ||
        "Unable to load services."
      );

    } finally {

      setLoading(false);
    }
  };

  /* =====================================================
     INITIAL LOAD
     ===================================================== */

  useEffect(() => {
    loadServices();
  }, []);

  /* =====================================================
     FORM CHANGE
     ===================================================== */

  const handleChange = (event) => {

    const {
      name,
      value
    } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  /* =====================================================
     OPEN ADD MODAL
     ===================================================== */

  const openAddModal = () => {

    setEditingService(null);

    setForm({
      ...emptyForm
    });

    setShowModal(true);
  };

  /* =====================================================
     OPEN EDIT MODAL
     ===================================================== */

  const openEditModal = (service) => {

    setEditingService(service);

    setForm({
      serviceName:
        service.ServiceName || "",

      shortDescription:
        service.ShortDescription || "",

      description:
        service.Description || "",

      price:
        service.Price ?? "",

      imageURL:
        service.ImageURL || "",

      imageURLs:
        getServiceImages(service),

      videoURL:
        service.VideoURL || "",

      status:
        service.Status === "Inactive"
          ? "Inactive"
          : "Active"
    });

    setShowModal(true);
  };

  /* =====================================================
     CLOSE MODAL
     ===================================================== */

  const closeModal = () => {

    if (saving) return;

    setShowModal(false);

    setEditingService(null);

    setForm({
      ...emptyForm
    });
  };

  /* =====================================================
     VIEW SERVICE
     ===================================================== */

  const openViewModal = (service) => {

    setViewingService(service);
  };

  /* =====================================================
     CLOSE VIEW
     ===================================================== */

  const closeViewModal = () => {

    setViewingService(null);
  };

  /* =====================================================
     SAVE SERVICE
     ===================================================== */

  const handleSubmit = async (event) => {

    event.preventDefault();

    /* ---------------- VALIDATION ---------------- */

    if (!form.serviceName.trim()) {

      toast.error(
        "Service name is required."
      );

      return;
    }

    if (
      form.price !== "" &&
      Number(form.price) < 0
    ) {

      toast.error(
        "Price cannot be negative."
      );

      return;
    }

    /* ---------------- TOKEN ---------------- */

    const token = getToken();

    if (!token) {

      toast.error(
        "Shop session not found. Please login again."
      );

      return;
    }

    /* ---------------- PAYLOAD ---------------- */

    const payload = {

      serviceName:
        form.serviceName.trim(),

      shortDescription:
        form.shortDescription.trim(),

      description:
        form.description.trim(),

      price:
        form.price === ""
          ? null
          : Number(form.price),

      imageURL:
        (form.imageURLs[0] || form.imageURL || "").trim(),

      imageURLs:
        form.imageURLs.slice(0, 10),

      videoURL:
        form.videoURL.trim(),

      status:
        form.status === "Inactive"
          ? "Inactive"
          : "Active"
    };

    try {

      setSaving(true);

      const isEdit =
        Boolean(editingService);

      const url = isEdit
        ? `${API_URL}/api/shop-services/${editingService.ServiceID}`
        : `${API_URL}/api/shop-services`;

      const response = await fetch(
        url,
        {
          method: isEdit
            ? "PUT"
            : "POST",

          headers: getHeaders(),

          body: JSON.stringify(
            payload
          )
        }
      );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          (
            isEdit
              ? "Failed to update service."
              : "Failed to create service."
          )
        );
      }

      toast.success(
        data.message ||
        (
          isEdit
            ? "Service updated successfully."
            : "Service created successfully."
        )
      );

      closeModal();

      await loadServices();

    } catch (error) {

      console.error(
        "Save Shop Service Error:",
        error
      );

      toast.error(
        error.message ||
        "Unable to save service."
      );

    } finally {

      setSaving(false);
    }
  };

  /* =====================================================
     DELETE SERVICE
     ===================================================== */
  /* =====================================================
     OPEN DELETE MODAL
     ===================================================== */

  const openDeleteModal = (service) => {
    setServiceToDelete(service);
    setShowDeleteModal(true);
  };


  /* =====================================================
     CLOSE DELETE MODAL
     ===================================================== */

  const closeDeleteModal = () => {
    if (deletingID) return;

    setShowDeleteModal(false);
    setServiceToDelete(null);
  };


  /* =====================================================
     CONFIRM DELETE SERVICE
     ===================================================== */

  const confirmDeleteService = async () => {
    if (!serviceToDelete) return;

    try {
      setDeletingID(serviceToDelete.ServiceID);

      const response = await fetch(
        `${API_URL}/api/shop-services/${serviceToDelete.ServiceID}`,
        {
          method: "DELETE",
          headers: getHeaders()
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message ||
          "Failed to delete service."
        );
      }

      toast.success(
        data.message ||
        "Service deleted successfully."
      );

      setShowDeleteModal(false);
      setServiceToDelete(null);

      await loadServices();

    } catch (error) {
      console.error(
        "Delete Shop Service Error:",
        error
      );

      toast.error(
        error.message ||
        "Unable to delete service."
      );

    } finally {
      setDeletingID(null);
    }
  };

  /* =====================================================
     TOGGLE STATUS
     ===================================================== */

  const handleToggleStatus = async (service) => {

    try {

      const response =
        await fetch(
          `${API_URL}/api/shop-services/${service.ServiceID}/status`,
          {
            method: "PATCH",
            headers: getHeaders()
          }
        );

      const data =
        await response.json();

      if (!response.ok) {

        throw new Error(
          data.message ||
          "Failed to update service status."
        );
      }

      toast.success(
        data.message ||
        "Service status updated."
      );

      await loadServices();

    } catch (error) {

      console.error(
        "Toggle Service Status Error:",
        error
      );

      toast.error(
        error.message ||
        "Unable to update status."
      );
    }
  };

  /* =====================================================
     SEARCH + FILTER
     ===================================================== */

  const filteredServices = useMemo(() => {

    const searchText =
      search
        .trim()
        .toLowerCase();

    return services.filter(
      (service) => {

        const matchesSearch =
          !searchText ||
          String(
            service.ServiceName || ""
          )
            .toLowerCase()
            .includes(searchText) ||

          String(
            service.ShortDescription || ""
          )
            .toLowerCase()
            .includes(searchText) ||

          String(
            service.Description || ""
          )
            .toLowerCase()
            .includes(searchText);

        const active =
          isActive(
            service.Status
          );

        const matchesFilter =
          filter === "all" ||
          (
            filter === "active" &&
            active
          ) ||
          (
            filter === "inactive" &&
            !active
          );

        return (
          matchesSearch &&
          matchesFilter
        );
      }
    );

  }, [
    services,
    search,
    filter
  ]);

  /* =====================================================
     STATS
     ===================================================== */

  const totalServices =
    services.length;

  const activeServices =
    services.filter(
      (service) =>
        isActive(service.Status)
    ).length;

  const inactiveServices =
    totalServices -
    activeServices;

  /* =====================================================
     RENDER
     ===================================================== */

  return (
    <div className="shop-services-page">

      {/* =================================================
                HEADER
               ================================================= */}

      <div className="shop-services-header">

        <div className="shop-services-title">

          <h1>
            Services
          </h1>

          <p>
            Manage services for your shop
          </p>

        </div>

        <button
          type="button"
          className="shop-service-add-btn"
          onClick={openAddModal}
        >
          <Plus size={18} />

          Add Service
        </button>

      </div>


      {/* =================================================
                STATS
               ================================================= */}

      <div
        className="shop-services-stats"
        style={{
          display: "grid",
          gridTemplateColumns:
            "repeat(3, minmax(0, 1fr))",
          gap: "16px",
          marginBottom: "20px"
        }}
      >

        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "18px"
          }}
        >

          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "6px"
            }}
          >
            Total Services
          </div>

          <div
            style={{
              fontSize: "25px",
              fontWeight: "700",
              color: "#172033"
            }}
          >
            {totalServices}
          </div>

        </div>


        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "18px"
          }}
        >

          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "6px"
            }}
          >
            Active Services
          </div>

          <div
            style={{
              fontSize: "25px",
              fontWeight: "700",
              color: "#15803d"
            }}
          >
            {activeServices}
          </div>

        </div>


        <div
          style={{
            background: "#ffffff",
            border: "1px solid #e5e7eb",
            borderRadius: "12px",
            padding: "18px"
          }}
        >

          <div
            style={{
              fontSize: "13px",
              color: "#6b7280",
              marginBottom: "6px"
            }}
          >
            Inactive Services
          </div>

          <div
            style={{
              fontSize: "25px",
              fontWeight: "700",
              color: "#b91c1c"
            }}
          >
            {inactiveServices}
          </div>

        </div>

      </div>


      {/* =================================================
                TOOLBAR
               ================================================= */}

      <div
        className="shop-services-toolbar"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "12px",
          marginBottom: "18px",
          flexWrap: "wrap"
        }}
      >

        <div
          style={{
            position: "relative",
            flex: "1",
            minWidth: "250px"
          }}
        >

          <Search
            size={18}
            style={{
              position: "absolute",
              left: "13px",
              top: "50%",
              transform:
                "translateY(-50%)",
              color: "#9ca3af"
            }}
          />

          <input
            type="text"
            value={search}
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
            placeholder="Search services..."
            style={{
              width: "100%",
              height: "44px",
              padding:
                "0 14px 0 40px",
              border:
                "1px solid #d1d5db",
              borderRadius: "9px",
              outline: "none",
              boxSizing:
                "border-box",
              fontSize: "14px"
            }}
          />

        </div>


        <select
          value={filter}
          onChange={(e) =>
            setFilter(
              e.target.value
            )
          }
          style={{
            height: "44px",
            minWidth: "150px",
            padding:
              "0 12px",
            border:
              "1px solid #d1d5db",
            borderRadius: "9px",
            background: "#ffffff",
            fontSize: "14px",
            color: "#374151",
            outline: "none"
          }}
        >

          <option value="all">
            All Services
          </option>

          <option value="active">
            Active
          </option>

          <option value="inactive">
            Inactive
          </option>

        </select>


        <button
          type="button"
          onClick={loadServices}
          disabled={loading}
          className="shop-service-action-btn status"
          title="Refresh"
          style={{
            width: "44px",
            height: "44px"
          }}
        >
          <RefreshCw
            size={17}
            className={
              loading
                ? "shop-service-spin"
                : ""
            }
          />
        </button>

      </div>


      {/* =================================================
                TABLE CARD
               ================================================= */}

      <div className="shop-services-card">

        {loading ? (

          <div className="shop-services-loading">

            <RefreshCw
              size={24}
              className="shop-service-spin"
            />

            <div
              style={{
                marginTop: "10px"
              }}
            >
              Loading services...
            </div>

          </div>

        ) : filteredServices.length === 0 ? (

          <div className="shop-services-empty">

            <Wrench
              size={38}
              color="#9ca3af"
            />

            <h3>
              No services found
            </h3>

            <p>
              {search
                ? "Try a different search."
                : "Add your first service to get started."
              }
            </p>

          </div>

        ) : (

          <div className="shop-services-table-wrapper">

            <table className="shop-services-table">

              <thead>

                <tr>

                  <th>
                    #
                  </th>

                  <th>
                    Service
                  </th>

                  <th>
                    Description
                  </th>

                  <th>
                    Price
                  </th>

                  <th>
                    Status
                  </th>

                  <th>
                    Actions
                  </th>

                </tr>

              </thead>


              <tbody>

                {filteredServices.map(
                  (service, index) => {

                    const active =
                      isActive(
                        service.Status
                      );

                    return (

                      <tr
                        key={
                          service.ServiceID
                        }
                      >

                        <td>
                          {index + 1}
                        </td>


                        <td>

                          <div className="shop-service-name">

                            {service.ServiceName ||
                              "Untitled Service"}

                          </div>

                        </td>


                        <td>

                          <div className="shop-service-description">

                            {service.ShortDescription ||
                              service.Description ||
                              "No description"}

                          </div>

                        </td>


                        <td>

                          <span className="shop-service-price">

                            {service.Price !==
                              null &&
                              service.Price !==
                              undefined &&
                              service.Price !==
                              ""
                              ? `₹${Number(
                                service.Price
                              ).toLocaleString(
                                "en-IN"
                              )}`
                              : "—"}

                          </span>

                        </td>


                        <td>

                          <span
                            className={`shop-service-status ${active
                                ? "active"
                                : "inactive"
                              }`}
                          >

                            {active
                              ? "Active"
                              : "Inactive"}

                          </span>

                        </td>


                        <td>

                          <div className="shop-service-actions">

                            {/* VIEW */}

                            <button
                              type="button"
                              className="shop-service-action-btn status"
                              title="View"
                              onClick={() =>
                                openViewModal(
                                  service
                                )
                              }
                            >

                              <Eye
                                size={16}
                              />

                            </button>


                            {/* EDIT */}

                            <button
                              type="button"
                              className="shop-service-action-btn edit"
                              title="Edit"
                              onClick={() =>
                                openEditModal(
                                  service
                                )
                              }
                            >

                              <Edit3
                                size={16}
                              />

                            </button>


                            {/* STATUS */}

                            <button
                              type="button"
                              className="shop-service-action-btn status"
                              title={
                                active
                                  ? "Deactivate"
                                  : "Activate"
                              }
                              onClick={() =>
                                handleToggleStatus(
                                  service
                                )
                              }
                            >

                              {active ? (
                                <AlertCircle
                                  size={16}
                                />
                              ) : (
                                <CheckCircle2
                                  size={16}
                                />
                              )}

                            </button>


                            {/* DELETE */}

                            <button
                              type="button"
                              className="shop-service-action-btn delete"
                              title="Delete"
                              onClick={() =>
                                openDeleteModal(service)
                              }
                            >

                              <Trash2
                                size={16}
                              />

                            </button>

                          </div>

                        </td>

                      </tr>

                    );
                  }
                )}

              </tbody>

            </table>

          </div>

        )}

      </div>


      {/* =================================================
                ADD / EDIT MODAL
               ================================================= */}

      {showModal && (

        <div
          className="shop-service-modal-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeModal();
            }

          }}
        >

          <div className="shop-service-modal">

            {/* MODAL HEADER */}

            <div className="shop-service-modal-header">

              <h2>

                {editingService
                  ? "Edit Service"
                  : "Add Service"}

              </h2>

              <button
                type="button"
                className="shop-service-modal-close"
                onClick={
                  closeModal
                }
                disabled={saving}
              >

                <X size={21} />

              </button>

            </div>


            {/* MODAL BODY */}

            <div className="shop-service-modal-body">

              <form
                id="shop-service-form"
                className="shop-service-form"
                onSubmit={
                  handleSubmit
                }
              >

                <div className="shop-service-form-grid">

                  {/* SERVICE NAME */}

                  <div className="shop-service-form-group full">

                    <label>
                      Service Name
                      <span>
                        {" "}*
                      </span>
                    </label>

                    <input
                      type="text"
                      name="serviceName"
                      value={
                        form.serviceName
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="e.g. CCTV Installation"
                      required
                    />

                  </div>


                  {/* SHORT DESCRIPTION */}

                  <div className="shop-service-form-group full">

                    <label>
                      Short Description
                    </label>

                    <input
                      type="text"
                      name="shortDescription"
                      value={
                        form.shortDescription
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Short service description"
                    />

                  </div>


                  {/* PRICE */}

                  <div className="shop-service-form-group">

                    <label>
                      Price
                    </label>

                    <input
                      type="number"
                      name="price"
                      value={
                        form.price
                      }
                      onChange={
                        handleChange
                      }
                      min="0"
                      step="0.01"
                      placeholder="2500"
                    />

                  </div>


                  {/* STATUS */}

                  <div className="shop-service-form-group">

                    <label>
                      Status
                    </label>

                    <select
                      name="status"
                      value={
                        form.status
                      }
                      onChange={
                        handleChange
                      }
                    >

                      <option value="Active">
                        Active
                      </option>

                      <option value="Inactive">
                        Inactive
                      </option>

                    </select>

                  </div>


                  {/* IMAGE URL */}

                  <div className="shop-service-form-group full">
                    <ImageGalleryField
                      label="Service images (up to 10)"
                      multiple
                      maxImages={10}
                      value={form.imageURLs || []}
                      onChange={(images) => setForm((prev) => ({ ...prev, imageURLs: images.slice(0, 10), imageURL: images[0] || "" }))}
                    />
                  </div>


                  {/* DESCRIPTION */}

                  <div className="shop-service-form-group full">
                    <label htmlFor="shop-service-video-url">Service video link</label>
                    <input
                      id="shop-service-video-url"
                      type="url"
                      name="videoURL"
                      value={form.videoURL}
                      onChange={handleChange}
                      placeholder="Paste a YouTube, Vimeo, or direct video URL"
                    />
                    <small className="shop-service-video-hint">Customers can open the video from the service card on your storefront.</small>
                  </div>

                  {/* DESCRIPTION */}

                  <div className="shop-service-form-group full">

                    <label>
                      Description
                    </label>

                    <textarea
                      name="description"
                      value={
                        form.description
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Enter complete service description..."
                      rows="6"
                    />

                  </div>

                </div>

              </form>

            </div>


            {/* MODAL FOOTER */}

            <div className="shop-service-modal-footer">

              <button
                type="button"
                className="shop-service-cancel-btn"
                onClick={
                  closeModal
                }
                disabled={saving}
              >
                Cancel
              </button>

              <button
                type="submit"
                form="shop-service-form"
                className="shop-service-save-btn"
                disabled={saving}
              >

                {saving ? (
                  <>
                    <RefreshCw
                      size={16}
                      className="shop-service-spin"
                    />

                    Saving...
                  </>
                ) : (
                  <>
                    <Save
                      size={16}
                    />

                    {editingService
                      ? "Update Service"
                      : "Save Service"}
                  </>
                )}

              </button>

            </div>

          </div>

        </div>

      )}


      {/* =================================================
                VIEW MODAL
               ================================================= */}

      {viewingService && (

        <div
          className="shop-service-modal-overlay"
          onMouseDown={(e) => {

            if (
              e.target ===
              e.currentTarget
            ) {
              closeViewModal();
            }

          }}
        >

          <div className="shop-service-modal">

            <div className="shop-service-modal-header">

              <h2>
                Service Details
              </h2>

              <button
                type="button"
                className="shop-service-modal-close"
                onClick={
                  closeViewModal
                }
              >

                <X size={21} />

              </button>

            </div>


            <div className="shop-service-modal-body">

              {getServiceImages(viewingService).length > 0 && (
                <div className="shop-service-view-gallery">
                  {getServiceImages(viewingService).map((image, index) => (
                    <img key={`${image}-${index}`} src={image} alt={`${viewingService.ServiceName} ${index + 1}`} onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  ))}
                </div>
              )}

              {viewingService.VideoURL && (
                <div style={{ marginBottom: "22px" }}>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "8px" }}>Service video</div>
                  <a href={viewingService.VideoURL} target="_blank" rel="noreferrer">Open service video</a>
                </div>
              )}


              <div
                style={{
                  display: "grid",
                  gap: "18px"
                }}
              >

                <div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "5px"
                    }}
                  >
                    Service Name
                  </div>

                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: "700",
                      color: "#172033"
                    }}
                  >
                    {
                      viewingService.ServiceName
                    }
                  </div>

                </div>


                <div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "5px"
                    }}
                  >
                    Short Description
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      color: "#374151"
                    }}
                  >
                    {
                      viewingService.ShortDescription ||
                      "—"
                    }
                  </div>

                </div>


                <div>

                  <div
                    style={{
                      fontSize: "12px",
                      color: "#6b7280",
                      marginBottom: "5px"
                    }}
                  >
                    Description
                  </div>

                  <div
                    style={{
                      fontSize: "14px",
                      color: "#374151",
                      lineHeight: "1.7",
                      whiteSpace:
                        "pre-wrap"
                    }}
                  >
                    {
                      viewingService.Description ||
                      "—"
                    }
                  </div>

                </div>


                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns:
                      "1fr 1fr",
                    gap: "16px"
                  }}
                >

                  <div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginBottom: "5px"
                      }}
                    >
                      Price
                    </div>

                    <div
                      style={{
                        fontSize: "18px",
                        fontWeight: "700",
                        color: "#172033"
                      }}
                    >
                      {viewingService.Price !==
                        null &&
                        viewingService.Price !==
                        undefined
                        ? `₹${Number(
                          viewingService.Price
                        ).toLocaleString(
                          "en-IN"
                        )}`
                        : "—"}
                    </div>

                  </div>


                  <div>

                    <div
                      style={{
                        fontSize: "12px",
                        color: "#6b7280",
                        marginBottom: "5px"
                      }}
                    >
                      Status
                    </div>

                    <span
                      className={`shop-service-status ${isActive(
                        viewingService.Status
                      )
                          ? "active"
                          : "inactive"
                        }`}
                    >
                      {
                        viewingService.Status
                      }
                    </span>

                  </div>

                </div>

              </div>

            </div>


            <div className="shop-service-modal-footer">

              <button
                type="button"
                className="shop-service-cancel-btn"
                onClick={
                  closeViewModal
                }
              >
                Close
              </button>

              <button
                type="button"
                className="shop-service-save-btn"
                onClick={() => {

                  closeViewModal();

                  openEditModal(
                    viewingService
                  );

                }}
              >

                <Edit3
                  size={16}
                />

                Edit Service

              </button>

            </div>

          </div>

        </div>

      )}

      {/* =================================================
    DELETE CONFIRMATION MODAL
   ================================================= */}

{showDeleteModal && serviceToDelete && (
    <div
        className="shop-service-delete-overlay"
        onMouseDown={(e) => {
            if (e.target === e.currentTarget) {
                closeDeleteModal();
            }
        }}
    >
        <div className="shop-service-delete-modal">

            {/* ICON */}

            <div className="shop-service-delete-icon">
                <AlertTriangle size={28} />
            </div>


            {/* TITLE */}

            <h2>
                Delete Service?
            </h2>


            {/* MESSAGE */}

            <p className="shop-service-delete-message">
                Are you sure you want to delete
                <strong>
                    {" "}
                    "{serviceToDelete.ServiceName}"
                </strong>
                ?
            </p>


            {/* WARNING */}

            <div className="shop-service-delete-warning">
                <AlertTriangle size={17} />

                <span>
                    This action cannot be undone.
                </span>
            </div>


            {/* ACTIONS */}

            <div className="shop-service-delete-actions">

                <button
                    type="button"
                    className="shop-service-delete-cancel"
                    onClick={closeDeleteModal}
                    disabled={Boolean(deletingID)}
                >
                    Cancel
                </button>


                <button
                    type="button"
                    className="shop-service-delete-confirm"
                    onClick={confirmDeleteService}
                    disabled={Boolean(deletingID)}
                >
                    {deletingID ? (
                        <>
                            <RefreshCw
                                size={16}
                                className="shop-service-spin"
                            />

                            Deleting...
                        </>
                    ) : (
                        <>
                            <Trash2 size={16} />

                            Delete Service
                        </>
                    )}
                </button>

            </div>

        </div>
    </div>
)}

    </div>
  );
}

export default ShopServices;
