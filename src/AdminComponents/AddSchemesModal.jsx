import React, { useState, useEffect } from 'react';
import {
  Alert,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Form,
  FormGroup,
  Label,
  Input,
  Button,
  Row,
  Col,
  Spinner
} from 'reactstrap';
import ReactSwitch from 'react-switch';

const emptyScheme = {
  name: "",
  description: "",
  eligibilityCriteria: "",
  benefits: "",
  requiredDocuments: [],
  category: "",
  startDate: "",
  endDate: "",
  isActive: true,
};

// Must stay in sync with the `category` enum on the Scheme model.
const categories = [
  "Agriculture, Rural & Environment",
  "Business & Entrepreneurship",
  "Housing & Shelter / Welfare",
  "Skills, Employment & Financial Services",
  "Health & Wellness"
];

// <input type="date"> wants yyyy-MM-dd; the API returns full ISO timestamps.
const toDateInput = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  // Format from local parts so an ISO timestamp does not shift back a day.
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
};

const AddSchemesModal = ({ modalOpen, toggle, isEdit, schemeData, onSave }) => {
  const [scheme, setScheme] = useState(emptyScheme);
  const [documents, setDocuments] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isEdit && schemeData) {
      setScheme({
        ...emptyScheme,
        ...schemeData,
        startDate: toDateInput(schemeData.startDate),
        endDate: toDateInput(schemeData.endDate),
      });
      setDocuments(
        Array.isArray(schemeData.requiredDocuments)
          ? schemeData.requiredDocuments.join(', ')
          : ""
      );
    } else {
      setScheme({ ...emptyScheme });
      setDocuments("");
    }
    setError("");
  }, [isEdit, schemeData, modalOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setScheme(prev => ({ ...prev, [name]: value }));
  };

  const handleDocumentChange = (e) => {
    setDocuments(e.target.value);
  };

  const handleSwitchChange = (checked) => {
    setScheme(prev => ({ ...prev, isActive: checked }));
  };

  // An in-flight save must not be orphaned by closing the modal behind it.
  const safeToggle = () => {
    if (saving) return;
    toggle();
  };

  /**
   * Builds exactly the fields the API accepts. An edit starts from the fetched
   * document, so spreading `scheme` would also ship `_id`, `__v` and the
   * timestamps back into the update; send only what is actually editable.
   */
  const buildPayload = () => ({
    name: scheme.name.trim(),
    description: (scheme.description || "").trim(),
    eligibilityCriteria: (scheme.eligibilityCriteria || "").trim(),
    benefits: (scheme.benefits || "").trim(),
    requiredDocuments: [
      ...new Set(documents.split(',').map(doc => doc.trim()).filter(Boolean))
    ],
    category: scheme.category,
    // Explicit null so clearing a date on edit actually unsets it.
    startDate: scheme.startDate || null,
    endDate: scheme.endDate || null,
    isActive: !!scheme.isActive,
  });

  const validate = (payload) => {
    if (!payload.name) return "Scheme name is required.";
    if (!payload.category) return "Please select a category.";
    if (!categories.includes(payload.category)) return "Please select a valid category.";
    if (
      payload.startDate &&
      payload.endDate &&
      new Date(payload.endDate) < new Date(payload.startDate)
    ) {
      return "End date cannot be earlier than the start date.";
    }
    return "";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (saving) return; // guard against a double-click creating two schemes

    const payload = buildPayload();
    const invalid = validate(payload);
    if (invalid) {
      setError(invalid);
      return;
    }

    setSaving(true);
    setError("");
    try {
      const result = await onSave(payload);
      // The parent closes the modal on success; on failure we stay open and
      // show why, so the admin does not lose everything they typed.
      if (result && result.ok === false) {
        setError(result.error || "Failed to save the scheme.");
      }
    } catch (err) {
      console.error("Error saving scheme:", err);
      setError(err?.message || "Failed to save the scheme.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={modalOpen} toggle={safeToggle} centered backdrop={saving ? "static" : true}>
      <ModalHeader toggle={safeToggle}>
        {isEdit ? 'Edit Scheme' : 'Add New Scheme'}
      </ModalHeader>
      <Form onSubmit={handleSubmit}>
        <ModalBody style={{ maxHeight: '70vh', overflowY: 'auto' }}>
          {error && <Alert color="danger" className="py-2">{error}</Alert>}
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="name">Scheme Name</Label>
                <Input id="name" name="name" value={scheme.name} onChange={handleChange} disabled={saving} required />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="category">Category</Label>
                <Input type="select" id="category" name="category" value={scheme.category} onChange={handleChange} disabled={saving} required>
                  <option value="" disabled>Select Category</option>
                  {categories.map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <FormGroup>
            <Label for="description">Description</Label>
            <Input type="textarea" id="description" name="description" value={scheme.description} onChange={handleChange} disabled={saving} />
          </FormGroup>
          <FormGroup>
            <Label for="eligibilityCriteria">Eligibility Criteria</Label>
            <Input type="textarea" id="eligibilityCriteria" name="eligibilityCriteria" value={scheme.eligibilityCriteria} onChange={handleChange} disabled={saving} />
          </FormGroup>
          <FormGroup>
            <Label for="benefits">Benefits</Label>
            <Input type="textarea" id="benefits" name="benefits" value={scheme.benefits} onChange={handleChange} disabled={saving} />
          </FormGroup>
          <FormGroup>
            <Label for="requiredDocuments">Required Documents (comma-separated)</Label>
            <Input type="text" id="requiredDocuments" name="requiredDocuments" value={documents} onChange={handleDocumentChange} disabled={saving} />
          </FormGroup>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label for="startDate">Start Date</Label>
                <Input type="date" id="startDate" name="startDate" value={scheme.startDate} onChange={handleChange} disabled={saving} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label for="endDate">End Date</Label>
                <Input type="date" id="endDate" name="endDate" min={scheme.startDate || undefined} value={scheme.endDate} onChange={handleChange} disabled={saving} />
              </FormGroup>
            </Col>
          </Row>
          <FormGroup className="d-flex align-items-center">
            <Label className="me-3 mb-0">Is Active</Label>
            <ReactSwitch
              checked={!!scheme.isActive}
              onChange={handleSwitchChange}
              disabled={saving}
              onColor="#0d6efd"
              offColor="#ccc"
              handleDiameter={12}
              height={20}
              width={40}
              uncheckedIcon={false}
              checkedIcon={false}
            />
            <span className="ms-2 fw-bold">{scheme.isActive ? "Yes" : "No"}</span>
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color="primary" type="submit" disabled={saving}>
            {saving && <Spinner size="sm" className="me-2" />}
            {saving ? 'Saving...' : (isEdit ? 'Update' : 'Save')}
          </Button>
          <Button color="secondary" type="button" onClick={safeToggle} disabled={saving}>
            Cancel
          </Button>
        </ModalFooter>
      </Form>
    </Modal>
  );
};

export default AddSchemesModal;
