// Sample medicine catalogue. Stock values are for this demonstration only.
const defaultMedicines = [
  {id:1,name:"Paracetamol",category:"Pain relief",strength:"500 mg",stock:40},
  {id:2,name:"Cetirizine",category:"Allergy relief",strength:"10 mg",stock:25},
  {id:3,name:"Vitamin C",category:"Supplement",strength:"500 mg",stock:0},
  {id:4,name:"Antacid",category:"Digestive health",strength:"As labelled",stock:18},
  {id:5,name:"Ibuprofen",category:"Pain relief",strength:"200 mg",stock:12}
];

// Load saved catalogue from this browser, or use the sample medicines on first visit.
let medicines = JSON.parse(localStorage.getItem("pharmacyMedicines") || "null") || defaultMedicines;
let editingMedicineId = null;

let prescriptions = JSON.parse(localStorage.getItem("pharmacyPrescriptions") || "[]");
let nextId = prescriptions.length ? Math.max(...prescriptions.map(p => p.id)) + 1 : 1;

const $ = id => document.getElementById(id);
const medicineById = id => medicines.find(m => m.id === Number(id));

function saveRecords() {
  localStorage.setItem("pharmacyPrescriptions", JSON.stringify(prescriptions));
}

function saveMedicines() {
  localStorage.setItem("pharmacyMedicines", JSON.stringify(medicines));
}

function resetMedicineForm() {
  $("medicineForm").reset();
  editingMedicineId = null;
  $("medicineFormTitle").textContent = "Add Medicine";
  $("medicineSubmitButton").textContent = "Add Medicine";
  $("cancelMedicineEdit").hidden = true;
}

function editMedicine(id) {
  const medicine = medicineById(id);
  if (!medicine) return;
  editingMedicineId = medicine.id;
  $("newMedicineName").value = medicine.name;
  $("newMedicineCategory").value = medicine.category;
  $("newMedicineStrength").value = medicine.strength;
  $("newMedicineStock").value = medicine.stock;
  $("medicineFormTitle").textContent = "Update Medicine";
  $("medicineSubmitButton").textContent = "Save Changes";
  $("cancelMedicineEdit").hidden = false;
  $("newMedicineName").focus();
}

function deleteMedicine(id) {
  const medicine = medicineById(id);
  if (!medicine) return;
  const usedByPrescription = prescriptions.some(p => p.medicineId === medicine.id);
  const message = usedByPrescription
    ? "This medicine is used in an existing prescription. Delete it from the catalogue anyway? Existing order records will remain, but the medicine name may no longer appear."
    : `Delete ${medicine.name} from the catalogue?`;
  if (!confirm(message)) return;
  medicines = medicines.filter(m => m.id !== medicine.id);
  saveMedicines();
  if (editingMedicineId === id) resetMedicineForm();
  renderAll();
}

function populateMedicineSelect() {
  const currentValue = $("medicineSelect").value;
  $("medicineSelect").innerHTML = '<option value="">Select a medicine</option>' +
    medicines.map(m => `<option value="${m.id}">${escapeHTML(m.name)} (${escapeHTML(m.strength)})</option>`).join("");
  if (medicines.some(m => String(m.id) === currentValue)) $("medicineSelect").value = currentValue;
}

function renderCatalogue(search = "") {
  const filtered = medicines.filter(m => (m.name + " " + m.category).toLowerCase().includes(search.toLowerCase()));
  $("catalogueBody").innerHTML = filtered.length ? filtered.map(m => `
    <tr><td><strong>${escapeHTML(m.name)}</strong></td><td>${escapeHTML(m.category)}</td><td>${escapeHTML(m.strength)}</td>
    <td>${m.stock}</td><td><span class="status ${m.stock > 0 ? "available" : "unavailable"}">${m.stock > 0 ? "In stock" : "Out of stock"}</span></td>
    <td><button class="small-btn approve" onclick="editMedicine(${m.id})">Edit</button><button class="small-btn reject" onclick="deleteMedicine(${m.id})">Delete</button></td></tr>
  `).join("") : '<tr><td colspan="6">No medicines found.</td></tr>';
}

function renderVerification() {
  $("verificationBody").innerHTML = prescriptions.length ? prescriptions.map(p => {
    const m = medicineById(p.medicineId);
    const availability = m && m.stock > 0;
    let decision = p.verification === "Pending"
      ? `<button class="small-btn approve" onclick="verifyPrescription(${p.id}, 'Approved')">Approve</button><button class="small-btn reject" onclick="verifyPrescription(${p.id}, 'Rejected')">Reject</button>`
      : `<span class="status ${p.verification.toLowerCase()}">${p.verification}</span>`;
    return `<tr><td><strong>${escapeHTML(p.patientName)}</strong><br><span class="hint">Age ${p.age}</span></td>
      <td>${m ? m.name : "Medicine unavailable"}</td><td>${escapeHTML(p.dosage)} · ${escapeHTML(p.frequency)} · ${escapeHTML(p.duration)}</td>
      <td><span class="status ${availability ? "available" : "unavailable"}">${availability ? "In stock" : "Out of stock"}</span></td><td>${decision}</td></tr>`;
  }).join("") : '<tr><td colspan="5">No prescriptions have been entered yet.</td></tr>';
}

function renderDispensing() {
  const approved = prescriptions.filter(p => p.verification === "Approved");
  $("dispensingBody").innerHTML = approved.length ? approved.map(p => {
    const m = medicineById(p.medicineId);
    return `<tr><td>#${p.id}</td><td>${escapeHTML(p.patientName)}</td><td>${m ? m.name : "—"}</td>
      <td><span class="status approved">Approved</span></td><td>
      <select aria-label="Dispensing status for order ${p.id}" onchange="updateDispensing(${p.id}, this.value)">
        ${["Pending","Processing","Dispensed"].map(s => `<option ${p.dispensing === s ? "selected" : ""}>${s}</option>`).join("")}
      </select></td></tr>`;
  }).join("") : '<tr><td colspan="5">No approved prescriptions are ready for dispensing.</td></tr>';
}

function renderSummary() {
  $("summaryContent").innerHTML = prescriptions.length ? prescriptions.slice().reverse().map(p => {
    const m = medicineById(p.medicineId);
    return `<article class="summary-card"><h3>Order #${p.id} · ${escapeHTML(p.patientName)}</h3>
      <div class="summary-grid">
        <div><strong>Patient age:</strong> ${p.age}</div><div><strong>Medicine:</strong> ${m ? m.name : "—"}</div>
        <div><strong>Dosage:</strong> ${escapeHTML(p.dosage)}</div><div><strong>Frequency:</strong> ${escapeHTML(p.frequency)}</div>
        <div><strong>Duration:</strong> ${escapeHTML(p.duration)}</div><div><strong>Verification:</strong> ${p.verification}</div>
        <div><strong>Dispensing:</strong> ${p.dispensing}</div><div><strong>Date:</strong> ${p.date}</div>
        <div><strong>Availability at entry:</strong> ${p.availableAtEntry ? "In stock" : "Out of stock"}</div>
        <div><strong>Notes:</strong> ${escapeHTML(p.notes || "None")}</div>
      </div></article>`;
  }).join("") : '<div class="empty">No order summaries yet. Add a prescription to get started.</div>';
}

function renderAll() {
  populateMedicineSelect();
  renderCatalogue($("medicineSearch").value);
  renderVerification();
  renderDispensing();
  renderSummary();
}

function verifyPrescription(id, decision) {
  const p = prescriptions.find(item => item.id === id);
  if (!p) return;
  const m = medicineById(p.medicineId);
  if (decision === "Approved" && (!m || m.stock <= 0)) {
    alert("This medicine is out of stock. The prescription cannot be approved until availability is confirmed.");
    return;
  }
  p.verification = decision;
  if (decision === "Approved") p.dispensing = "Pending";
  saveRecords();
  renderAll();
}

function updateDispensing(id, status) {
  const p = prescriptions.find(item => item.id === id);
  if (!p) return;
  const m = medicineById(p.medicineId);
  if (status === "Dispensed" && m && !p.stockDeducted) {
    if (m.stock <= 0) {
      alert("Medicine is out of stock.");
      renderDispensing();
      return;
    }
    m.stock -= 1;
    p.stockDeducted = true;
  }
  p.dispensing = status;
  saveRecords();
  renderAll();
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
}

$("prescriptionForm").addEventListener("submit", event => {
  event.preventDefault();
  const medicineId = Number($("medicineSelect").value);
  const medicine = medicineById(medicineId);
  if (!medicine) return;
  const record = {
    id: nextId++,
    patientName: $("patientName").value.trim(),
    age: Number($("patientAge").value),
    medicineId,
    dosage: $("dosage").value.trim(),
    frequency: $("frequency").value,
    duration: $("duration").value.trim(),
    notes: $("notes").value.trim(),
    availableAtEntry: medicine.stock > 0,
    verification: "Pending",
    dispensing: "Not started",
    stockDeducted: false,
    date: new Date().toLocaleDateString()
  };
  prescriptions.push(record);
  saveRecords();
  event.target.reset();
  $("entryMessage").textContent = `Prescription #${record.id} saved successfully. It is waiting for pharmacist verification.`;
  renderAll();
});


$("medicineForm").addEventListener("submit", event => {
  event.preventDefault();
  const name = $("newMedicineName").value.trim();
  const category = $("newMedicineCategory").value.trim();
  const strength = $("newMedicineStrength").value.trim();
  const stock = Number($("newMedicineStock").value);

  if (!name || !category || !strength || !Number.isInteger(stock) || stock < 0) {
    alert("Please enter valid medicine details and a stock amount of zero or more.");
    return;
  }

  if (editingMedicineId !== null) {
    const medicine = medicineById(editingMedicineId);
    if (!medicine) return;
    medicine.name = name;
    medicine.category = category;
    medicine.strength = strength;
    medicine.stock = stock;
  } else {
    const newId = medicines.length ? Math.max(...medicines.map(m => m.id)) + 1 : 1;
    medicines.push({id:newId, name, category, strength, stock});
  }

  saveMedicines();
  resetMedicineForm();
  renderAll();
});

$("cancelMedicineEdit").addEventListener("click", resetMedicineForm);

$("medicineSearch").addEventListener("input", event => renderCatalogue(event.target.value));

document.querySelectorAll(".nav-link").forEach(button => {
  button.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach(item => item.classList.remove("active"));
    document.querySelectorAll(".page").forEach(page => page.classList.remove("active"));
    button.classList.add("active");
    $(button.dataset.target).classList.add("active");
    renderAll();
  });
});

populateMedicineSelect();
renderAll();
