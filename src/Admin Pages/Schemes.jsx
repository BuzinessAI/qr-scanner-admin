import React, { useEffect, useState } from 'react'
import { Container, Table, Button, Spinner } from 'reactstrap'
import Breadcrumbs from '../components/Common/Breadcrumb'
import CustomPagination from '../AdminComponents/CustomPagination'
import { FaRegEye, FaEdit } from 'react-icons/fa'
import { MdDeleteForever } from 'react-icons/md'
import Swal from 'sweetalert2'
import AddSchemesModal from '../AdminComponents/AddSchemesModal'
import { Instance } from '../Instence/Instence'
import { useNavigate } from 'react-router-dom'

// The API reports failures as { error } and sometimes { message }; fall back to
// the axios/network message so nothing ever surfaces as a blank alert.
const apiError = (err, fallback) =>
  err?.response?.data?.error ||
  err?.response?.data?.message ||
  err?.message ||
  fallback;

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString();
};

const truncate = (value, length = 50) => {
  const text = String(value ?? "").trim();
  if (!text) return "-";
  return text.length > length ? `${text.slice(0, length)}...` : text;
};

const Schemes = () => {
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const itemsPerPage = 10;
  const [modalOpen, setModalOpen] = useState(false);
  const [isEdit, setIsEdit] = useState(false);
  const [selectedScheme, setSelectedScheme] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
const [role, setRole] = useState(null);
const [selectedCategory, setSelectedCategory] = useState("");
const categories = [...new Set(schemes.map(s => s.category).filter(Boolean))];

  const handleDelete = (id) => {
    Swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, delete it!',
      cancelButtonText: 'No, cancel!',
    }).then(async (result) => {
      if (!result.isConfirmed) return;

      setDeletingId(id);
      try {
        await Instance.delete(`/scheme/${id}`);
        setSchemes(prev => prev.filter(scheme => scheme._id !== id));
        Swal.fire('Deleted!', 'The scheme has been deleted.', 'success');
      } catch (err) {
        console.error("Error deleting scheme:", err);
        Swal.fire('Error', apiError(err, 'Failed to delete the scheme.'), 'error');
      } finally {
        setDeletingId(null);
      }
    })
  };

  const handleAddClick = () => {
    setIsEdit(false);
    setSelectedScheme(null);
    setModalOpen(true);
  };

  const handleEditClick = (scheme) => {
    setIsEdit(true);
    setSelectedScheme(scheme);
    setModalOpen(true);
  };

  /**
   * Persists the scheme, then reconciles the table with what the server
   * actually stored. Resolves to { ok: false, error } instead of throwing so
   * the modal can stay open and show the failure inline.
   */
  const handleSaveScheme = async (payload) => {
    try {
      if (isEdit) {
        const id = selectedScheme?._id;
        if (!id) return { ok: false, error: "This scheme has no id, so it cannot be updated." };

        const res = await Instance.put(`/scheme/${id}`, payload);
        const updated = res.data?.scheme;
        setSchemes(prev =>
          prev.map(s => (s._id === id ? (updated || { ...s, ...payload }) : s))
        );
        setModalOpen(false);
        Swal.fire('Updated!', 'The scheme has been updated.', 'success');
      } else {
        const res = await Instance.post('/scheme', payload);
        const created = res.data?.scheme;
        if (!created?._id) {
          // Without the real _id the row cannot be edited or deleted, so refetch
          // rather than seed the table with a fake one.
          await fetchSchemes();
        } else {
          setSchemes(prev => [created, ...prev]);
        }
        setCurrentPage(1); // newest scheme sorts first
        setModalOpen(false);
        Swal.fire('Added!', 'The scheme has been added.', 'success');
      }
      return { ok: true };
    } catch (err) {
      console.error("Error saving scheme:", err);
      return { ok: false, error: apiError(err, 'Failed to save the scheme.') };
    }
  };
  const searchedData = schemes
  .filter((scheme) =>
    selectedCategory ? scheme.category === selectedCategory : true
  )
  .filter((item) =>
    Object.values(item).some((val) =>
      String(val).toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const totalPages = Math.ceil(searchedData.length / itemsPerPage);
  const paginatedData = searchedData.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Searching, filtering or deleting can shrink the list past the current page
  // and leave the table blank; pull the page back into range.
  useEffect(() => {
    const lastPage = Math.max(1, Math.ceil(searchedData.length / itemsPerPage));
    if (currentPage > lastPage) setCurrentPage(lastPage);
  }, [searchedData.length, currentPage]);

  useEffect(() => {
    fetchSchemes();
  }, []);

  const fetchSchemes = async () => {
    setLoading(true);
    try {
      const res = await Instance.get("/scheme");
      setSchemes(Array.isArray(res.data?.schemes) ? res.data.schemes : []);
    } catch (err) {
      console.error("Error fetching schemes:", err);
      setSchemes([]);
      Swal.fire('Error', apiError(err, 'Failed to load schemes.'), 'error');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    const auth = JSON.parse(localStorage.getItem("authUser") || "null");
    const userRole = auth?.user?.role || auth?.role;
    setRole(userRole);
  }, []);


  return (
    <div className='page-content'>
      <Container fluid={true}>
        <Breadcrumbs title="Home QR" breadcrumbItem="Schemes" />

        <div className="d-flex justify-content-between align-items-center mb-3">
          <div className="col-md-6">
            <input
              className="form-control cursor-pointer border border-primary"
              type="search"
              placeholder="Search schemes..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
            />
          </div>
          {role === "SuperAdmin" && (
          <Button color="primary" onClick={handleAddClick}>+ Add Scheme</Button>
          )}
        </div>

<div className="row mb-3">
  <div className="col-md-4">
    <label className="fw-bold">Filter by Category</label>
    <select
      className="form-control"
      value={selectedCategory}
      onChange={(e) => {
        setSelectedCategory(e.target.value);
        setCurrentPage(1);
      }}
    >
      <option value="">All Categories</option>
      {categories.map((cat, index) => (
        <option key={index} value={cat}>
          {cat}
        </option>
      ))}
    </select>
  </div>

  {/* Clear Filter Button */}
  <div className="col-md-2 d-flex align-items-end">
    <button
      className="btn btn-secondary w-100"
      onClick={() => {
        setSelectedCategory("");
        setCurrentPage(1);
      }}
    >
      Clear Category
    </button>
  </div>
</div>



        <div className="py-3" style={{ width: "100%", overflowX: "auto" }}>
          <Table striped bordered hover responsive>
            <thead className="">
              <tr>
                <th>S.No.</th>
                <th style={{ width: "200px", whiteSpace:"normal" }}>Scheme Name</th>
                <th style={{ width: "350px" }}>Description</th>
                <th style={{ width: "350px" }}>Eligibility Criteria</th>
                <th style={{ width: "350px" }}>Benefits</th>
                {/* <th>Required Documents</th> */}
                <th>Category</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody className="text-center">
              {loading && (
                <tr>
                  <td colSpan={10} className="py-4">
                    <Spinner size="sm" color="primary" /> <span className="ms-2">Loading schemes...</span>
                  </td>
                </tr>
              )}
              {!loading && paginatedData.length === 0 && (
                <tr>
                  <td colSpan={10} className="py-4 text-muted">No schemes found.</td>
                </tr>
              )}
              {!loading && paginatedData.map((scheme, index) => (
                <tr key={scheme._id}>
                  <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                  <td>{scheme.name}</td>
                  <td>{truncate(scheme.description)}</td>
                  <td>{truncate(scheme.eligibilityCriteria)}</td>
                  <td>{truncate(scheme.benefits)}</td >
                  {/* <td>{scheme.requiredDocuments.join(", ")}</td> */}
                  <td>{scheme.category}</td>
                  <td>{formatDate(scheme.startDate)}</td>
                  <td>{formatDate(scheme.endDate)}</td>
                  <td>{scheme.isActive ? <span className="badge bg-success">Active</span> : <span className="badge bg-danger">Inactive</span>}</td>
                  <td>
                    <div className="d-flex justify-content-center gap-3">
                      <FaRegEye size={20} className="cursor-pointer" title="View"
                      onClick={() => navigate(`/scheme/${scheme._id}`)}
                      />
                      {role === "SuperAdmin" && (
                        <>
                         <FaEdit size={20} className="cursor-pointer text-info" title="Edit" onClick={() => handleEditClick(scheme)} />
                      {deletingId === scheme._id ? (
                        <Spinner size="sm" color="danger" />
                      ) : (
                        <MdDeleteForever size={20} className="cursor-pointer text-danger" title="Delete" onClick={() => handleDelete(scheme._id)} />
                      )}
                        </>
                      )}

                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
        <CustomPagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
        <AddSchemesModal
          modalOpen={modalOpen}
          toggle={() => setModalOpen(!modalOpen)}
          isEdit={isEdit}
          schemeData={selectedScheme}
          onSave={handleSaveScheme}
        />
      </Container>
    </div>
  )
}

export default Schemes
