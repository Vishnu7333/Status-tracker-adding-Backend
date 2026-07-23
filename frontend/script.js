const testcaseForm = document.getElementById('testcase-form');
const projectNameInput = document.getElementById('project-name');
const projectDisplay = document.getElementById('project-display');
const moduleInput = document.getElementById('module-name');
const submoduleInput = document.getElementById('submodule-name');
const totalCountInput = document.getElementById('total-count-input');
const passCountInput = document.getElementById('pass-count-input');
const failCountInput = document.getElementById('fail-count-input');
const onholdCountInput = document.getElementById('onhold-count-input');
const pendingCountInput = document.getElementById('pending-count-input');
const naCountInput = document.getElementById('na-count-input');
const functionalTeamCountInput = document.getElementById('functional-team-count-input');
const commentInput = document.getElementById('comment-text');
const formMessage = document.getElementById('form-message');
const testcaseTableBody = document.querySelector('#testcase-table tbody');
const totalCountEl = document.getElementById('total-count');
const submoduleTotalCountEl = document.getElementById('submodule-total-count');
const passCountEl = document.getElementById('pass-count');
const failCountEl = document.getElementById('fail-count');
const onholdCountEl = document.getElementById('onhold-count');
const pendingCountEl = document.getElementById('pending-count');
const exportButton = document.getElementById('export-json');
const exportExcelButton = document.getElementById('export-excel');
const exportImageButton = document.getElementById('export-image');

const records = [];
const historyRecords = [];
let employeeChart = null;
const BASE_URL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.protocol === 'file:'
  ? 'http://localhost:8080'
  : 'https://status-tracker-api.onrender.com';
const API_HEADERS = {
  get 'Content-Type'() { return 'application/json'; },
  get 'X-User-Email'() { return localStorage.getItem('userEmail') || ''; },
  get 'X-User-Name'() { return localStorage.getItem('userName') || ''; }
};
const historyTableBody = document.querySelector('#history-table tbody');

// Add real-time validation for alphabets only in Module and Submodule
function validateAlphabetsOnly(input) {
  if (!input) return;
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    const filtered = value.replace(/[^A-Za-z ]/g, '');
    if (value !== filtered) {
      e.target.value = filtered;
    }
  });
}

// Add real-time validation for project name (alphabets, spaces, dots, hyphens)
function validateProjectNameInput(input) {
  if (!input) return;
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    const filtered = value.replace(/[^A-Za-z .-]/g, '');
    if (value !== filtered) {
      e.target.value = filtered;
    }
  });
}

// Prevent entering decimal values in count/number fields
function validateIntegerOnly(input) {
  if (!input) return;

  // 1. Prevent invalid characters from being typed
  input.addEventListener('keydown', (e) => {
    // Allow navigation, control keys, and digits
    const allowedKeys = [
      'Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 
      'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 
      'Home', 'End'
    ];
    if (allowedKeys.includes(e.key)) {
      return;
    }
    // Block '.', ',', 'e', 'E', '-', '+'
    if (['.', ',', 'e', 'E', '-', '+'].includes(e.key)) {
      e.preventDefault();
    }
  });

  // 2. Prevent pasting decimal or non-numeric values
  input.addEventListener('paste', (e) => {
    const pasteData = e.clipboardData.getData('text');
    if (/[^0-9]/.test(pasteData)) {
      e.preventDefault();
      // Extract integer portion if possible
      const parsed = parseInt(pasteData, 10);
      if (!isNaN(parsed) && parsed >= 0) {
        e.target.value = parsed.toString();
        e.target.dispatchEvent(new Event('input'));
      }
    }
  });

  // 3. Clean up any invalid inputs (e.g. from drag & drop or auto-fill)
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    const filtered = value.replace(/[^0-9]/g, '');
    if (value !== filtered) {
      e.target.value = filtered;
      e.target.dispatchEvent(new Event('input'));
    }
  });
}

function updateCustomerDisplay() {
  const projectName = projectNameInput ? projectNameInput.value.trim() : '';
  const projectDisplayContainer = projectDisplay ? projectDisplay.closest('.project-display') : null;
  if (projectName) {
    if (projectDisplay) projectDisplay.textContent = projectName;
    if (projectDisplayContainer) projectDisplayContainer.style.display = 'block';
    document.title = `${projectName} - Module Status Tracker`;
  } else {
    if (projectDisplay) projectDisplay.textContent = '';
    if (projectDisplayContainer) projectDisplayContainer.style.display = 'none';
    document.title = 'Module Status Tracker';
  }
}

const submodulesMap = {
  'FIN': ['General Ledger', 'Payables', 'Receivables', 'Fixed Assets', 'Cash Management', 'Expenses', 'Tax'],
  'HCM': ['Core HR', 'Payroll', 'Benefits', 'Talent Management', 'Learning', 'Workforce Management'],
  'SCM': ['Procurement', 'Inventory', 'Product Management', 'Manufacturing', 'Order Management', 'Logistics'],
  'WMS': ['Warehouse Operations', 'Inventory Tracking', 'Receiving', 'Shipping', 'Cycle Counting'],
  'ORC': ['Recruiting', 'Candidate Experience', 'Job Requisitions', 'Offers', 'Onboarding integrations'],
  'EPM': ['FCCS', 'EPBCS (Planning)', 'ARCS', 'EDMCS', 'NRCS', 'PCMCS', 'TRCS']
};

function populateModules(selectedValue = '') {
  if (!moduleInput) return;
  const standardModules = ['FIN', 'HCM', 'SCM', 'WMS', 'ORC', 'EPM'];
  
  const currentVal = selectedValue || moduleInput.value;
  moduleInput.innerHTML = '<option value="" disabled selected>Select Module</option>';
  
  const modulesList = [...standardModules, 'Others'];
  
  modulesList.forEach(mod => {
    const opt = document.createElement('option');
    opt.value = mod;
    opt.textContent = mod;
    moduleInput.appendChild(opt);
  });
  
  if (currentVal) {
    if (modulesList.includes(currentVal)) {
      moduleInput.value = currentVal;
    } else {
      moduleInput.value = 'Others';
    }
  }
}

function populateSubmodules(selectedModule, selectedValue = '') {
  console.log('populateSubmodules called with selectedModule:', selectedModule, 'selectedValue:', selectedValue);
  if (!submoduleInput) {
    console.log('submoduleInput element not found!');
    return;
  }
  
  const currentVal = selectedValue || submoduleInput.value;
  submoduleInput.innerHTML = '<option value="" disabled selected>Select Submodule</option>';
  
  if (!selectedModule) {
    console.log('No selectedModule, disabling submoduleInput');
    submoduleInput.disabled = true;
    return;
  }
  
  const subList = submodulesMap[selectedModule] ? [...submodulesMap[selectedModule]] : [];
  console.log('Found subList for module:', selectedModule, subList);
  if (currentVal && !subList.includes(currentVal) && currentVal !== 'Select Submodule') {
    subList.push(currentVal);
  }
  
  subList.forEach(sub => {
    const opt = document.createElement('option');
    opt.value = sub;
    opt.textContent = sub;
    submoduleInput.appendChild(opt);
  });
  
  submoduleInput.disabled = subList.length === 0;
  if (currentVal && subList.includes(currentVal)) {
    submoduleInput.value = currentVal;
  }
  console.log('submoduleInput enabled:', !submoduleInput.disabled, 'options count:', submoduleInput.options.length);
}

if (projectNameInput) validateProjectNameInput(projectNameInput);

if (totalCountInput) validateIntegerOnly(totalCountInput);
if (passCountInput) validateIntegerOnly(passCountInput);
if (failCountInput) validateIntegerOnly(failCountInput);
if (onholdCountInput) validateIntegerOnly(onholdCountInput);
if (naCountInput) validateIntegerOnly(naCountInput);
if (functionalTeamCountInput) validateIntegerOnly(functionalTeamCountInput);

function readOptionalCount(input) {
  const rawValue = input.value.trim();
  if (rawValue === '') {
    return null;
  }

  const number = Number(rawValue);
  return Number.isFinite(number) && Number.isInteger(number) && number >= 0 ? number : NaN;
}

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && Number.isInteger(number) && number >= 0 ? number : 0;
}

function getEntryDateString(recordOrEntry) {
  if (!recordOrEntry) return '';
  
  if (typeof recordOrEntry === 'string') {
    return recordOrEntry;
  }
  if (Array.isArray(recordOrEntry)) {
    const year = recordOrEntry[0];
    const month = String(recordOrEntry[1]).padStart(2, '0');
    const day = String(recordOrEntry[2]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  const dateVal = recordOrEntry.entryDate;
  if (!dateVal) return '';

  if (typeof dateVal === 'string') {
    return dateVal;
  }
  if (Array.isArray(dateVal)) {
    const year = dateVal[0];
    const month = String(dateVal[1]).padStart(2, '0');
    const day = String(dateVal[2]).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  return String(dateVal);
}

function calculatePending() {
  const totalVal = readOptionalCount(totalCountInput);
  if (totalVal !== null && !isNaN(totalVal)) {
    const passVal = readOptionalCount(passCountInput) ?? 0;
    const failVal = readOptionalCount(failCountInput) ?? 0;
    const onholdVal = readOptionalCount(onholdCountInput) ?? 0;
    const naVal = readOptionalCount(naCountInput) ?? 0;
    const ftVal = readOptionalCount(functionalTeamCountInput) ?? 0;
    const pendingVal = totalVal - passVal - failVal - onholdVal - naVal - ftVal;
    if (pendingCountInput) pendingCountInput.value = pendingVal >= 0 ? pendingVal : 0;
  } else {
    if (pendingCountInput) pendingCountInput.value = '';
  }
}

function downloadCanvasAsImage(canvasId, fileName) {
  try {
    const canvas = document.getElementById(canvasId);
    if (!canvas) {
      console.error('Canvas element not found:', canvasId);
      return;
    }

    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = canvas.width;
    tempCanvas.height = canvas.height;
    const tempCtx = tempCanvas.getContext('2d');

    tempCtx.fillStyle = '#191c24';
    tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

    tempCtx.drawImage(canvas, 0, 0);

    const imageURI = tempCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = fileName;
    link.href = imageURI;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Error downloading canvas as image:', error);
  }
}

function getExistingPassCount() {
  const proj = projectNameInput ? projectNameInput.value.trim() : '';
  const mod = moduleInput ? moduleInput.value.trim() : '';
  const sub = submoduleInput ? submoduleInput.value.trim() : '';
  if (!proj || !mod || !sub) return 0;

  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  // Check local draft records first
  const draftExisting = records.find(r => 
    r.project.toLowerCase() === proj.toLowerCase() && 
    r.module.toLowerCase() === mod.toLowerCase() && 
    r.submodule.toLowerCase() === sub.toLowerCase()
  );
  if (draftExisting) {
    const dateStr = getEntryDateString(draftExisting);
    if (dateStr && dateStr.startsWith(currentYearMonth)) {
      return draftExisting.pass || 0;
    }
    return 0;
  }

  // Check saved history records
  const historyExisting = historyRecords.find(r => 
    r.project.toLowerCase() === proj.toLowerCase() && 
    r.module.toLowerCase() === mod.toLowerCase() && 
    r.submodule.toLowerCase() === sub.toLowerCase()
  );
  if (historyExisting) {
    const dateStr = getEntryDateString(historyExisting);
    if (dateStr && dateStr.startsWith(currentYearMonth)) {
      return historyExisting.pass || 0;
    }
    return 0;
  }

  return 0;
}

function setFormError(message) {
  if (formMessage) {
    formMessage.textContent = message;
    formMessage.classList.add('error');
  }
}

function clearFormError() {
  if (formMessage) {
    formMessage.textContent = '';
    formMessage.classList.remove('error');
  }
}

function setFieldError(field, message) {
  if (!field) return;
  const errorSpan = document.getElementById(`${field.id}-error`);
  if (errorSpan) {
    errorSpan.textContent = message;
    field.classList.add('field-error-active');
  }
}

function scrollToField(field) {
  if (field && typeof field.scrollIntoView === 'function') {
    field.scrollIntoView({ behavior: 'smooth', block: 'center' });
    field.focus({ preventScroll: true });
  }
}

function clearFieldError(field) {
  if (!field) return;
  const errorSpan = document.getElementById(`${field.id}-error`);
  if (errorSpan) {
    errorSpan.textContent = '';
    field.classList.remove('field-error-active');
  }
}

function clearAllFieldErrors() {
  [projectNameInput, moduleInput, submoduleInput, totalCountInput, passCountInput, failCountInput, onholdCountInput, pendingCountInput, naCountInput, functionalTeamCountInput].forEach((field) => {
    if (field) clearFieldError(field);
  });
}

function getStatus(record) {
  const pass = record.pass || 0;
  const na = record.na || 0;
  const functionalTeam = record.functionalTeam || 0;
  const fail = record.fail || 0;
  const onhold = record.onhold || 0;
  const pending = record.pending || 0;
  const total = record.total || 0;

  if (total > 0 && (pass + na + functionalTeam) === total) {
    return 'Pass';
  }

  if (pending > 0 && (pass > 0 || fail > 0)) {
    return 'Inprogress';
  }

  if (fail > 0) {
    return 'Fail';
  }

  if (onhold > 0) {
    return 'On Hold';
  }

  if (pending > 0) {
    return 'Pending';
  }

  return 'Pending';
}

function findRecordIndex(moduleName, submoduleName) {
  return records.findIndex((record) => record.module === moduleName && record.submodule === submoduleName);
}

function groupByModule() {
  return records.reduce((groups, record) => {
    const key = record.module;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(record);
    return groups;
  }, {});
}

function getModuleStatus(summary) {
  const pass = summary.pass || 0;
  const na = summary.na || 0;
  const functionalTeam = summary.functionalTeam || 0;
  const fail = summary.fail || 0;
  const onhold = summary.onhold || 0;
  const pending = summary.pending || 0;
  const total = summary.total || 0;

  if (total > 0 && (pass + na + functionalTeam) === total) {
    return 'Pass';
  }

  if (pending > 0 && (pass > 0 || fail > 0)) {
    return 'Inprogress';
  }

  if (fail > 0) {
    return 'Fail';
  }

  if (onhold > 0) {
    return 'On Hold';
  }

  if (pending > 0) {
    return 'Pending';
  }

  return 'Pending';
}

function getStatusClass(status) {
  return `status-${status.toLowerCase().replace(/\s+/g, '')}`;
}

function createModuleHeaderRow(moduleName, moduleSummary) {
  const status = getModuleStatus(moduleSummary);
  const tr = document.createElement('tr');
  tr.className = 'module-header-row';
  tr.innerHTML = `
    <td colspan="11">
      <strong>${moduleName}</strong>
      <span class="module-header-meta">Total: ${moduleSummary.total} | Pass: ${moduleSummary.pass} | Fail: ${moduleSummary.fail} | On-Hold: ${moduleSummary.onhold} | Pending: ${moduleSummary.pending} | N/A: ${moduleSummary.na || 0} | Taken care by functional team: ${moduleSummary.functionalTeam || 0} | Status: ${status}</span>
    </td>
  `;
  return tr;
}

function createRow(record, index) {
  const status = getStatus(record);
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${record.submodule}</td>
    <td>${record.total}</td>
    <td class="status-pass">${record.pass}</td>
    <td class="status-fail">${record.fail}</td>
    <td class="status-onhold">${record.onhold}</td>
    <td class="status-pending">${record.pending}</td>
    <td class="status-na">${record.na ?? 0}</td>
    <td class="status-functional">${record.functionalTeam ?? 0}</td>
    <td><span class="status-badge ${getStatusClass(status)}">${status}</span></td>
    <td class="comment-cell">${record.comments || '-'}</td>
    <td>
      <div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center;">
        <button class="edit-draft-button retrieve-button" data-index="${index}" title="Edit draft record" aria-label="Edit draft">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; pointer-events: none;">
            <path d="M12 20h9M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
          </svg>
        </button>
        <button class="remove-button" data-index="${index}" data-id="${record.id}" aria-label="Remove record">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; pointer-events: none;">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <line x1="10" y1="11" x2="10" y2="17" />
            <line x1="14" y1="11" x2="14" y2="17" />
          </svg>
        </button>
      </div>
    </td>
  `;
  return tr;
}

function groupByProjectAndModule(recordList) {
  return recordList.reduce((groups, record) => {
    const proj = record.project || 'Untitled Customer';
    const mod = record.module || 'General';
    if (!groups[proj]) {
      groups[proj] = {};
    }
    if (!groups[proj][mod]) {
      groups[proj][mod] = [];
    }
    groups[proj][mod].push(record);
    return groups;
  }, {});
}

function createProjectHeaderRow(projectName) {
  const tr = document.createElement('tr');
  tr.className = 'project-header-row-ui';
  tr.innerHTML = `
    <td colspan="11">
      <strong style="color: #ffffff; font-weight: 800;">Customer: </strong><strong style="color: #38bdf8; font-weight: 800;">${projectName}</strong>
    </td>
  `;
  return tr;
}

function updateTable() {
  if (!testcaseTableBody) return;
  testcaseTableBody.innerHTML = '';

  if (!records.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="11" class="empty-state">Add a module and submodule total to begin tracking progress.</td>';
    testcaseTableBody.appendChild(emptyRow);
    return;
  }

  const grouped = groupByProjectAndModule(records);
  Object.entries(grouped).forEach(([projectName, modules]) => {
    testcaseTableBody.appendChild(createProjectHeaderRow(projectName));

    Object.entries(modules).forEach(([moduleName, moduleRecords]) => {
      const moduleSummary = moduleRecords.reduce(
        (summary, record) => {
          summary.total += record.total;
          summary.pass += record.pass;
          summary.fail += record.fail;
          summary.onhold += record.onhold;
          summary.pending += record.pending;
          summary.na += record.na || 0;
          summary.functionalTeam += record.functionalTeam || 0;
          return summary;
        },
        { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0, na: 0, functionalTeam: 0 }
      );

      testcaseTableBody.appendChild(createModuleHeaderRow(moduleName, moduleSummary));
      moduleRecords.forEach((record) => {
        const index = records.indexOf(record);
        testcaseTableBody.appendChild(createRow(record, index));
      });
    });
  });
}

function summarize() {
  return records.reduce(
    (summary, record) => {
      summary.totalSubmodules += 1;
      summary.total += record.total;
      summary.pass += record.pass;
      summary.fail += record.fail;
      summary.onhold += record.onhold;
      summary.pending += record.pending;
      summary.na += record.na || 0;
      summary.functionalTeam += record.functionalTeam || 0;
      return summary;
    },
    {
      totalSubmodules: 0,
      total: 0,
      pass: 0,
      fail: 0,
      onhold: 0,
      pending: 0,
      na: 0,
      functionalTeam: 0,
    },
  );
}

function updateSummaryUI(summary) {
  if (!summary) return;
  if (totalCountEl) totalCountEl.textContent = summary.totalSubmodules ?? 0;
  if (submoduleTotalCountEl) submoduleTotalCountEl.textContent = summary.total ?? 0;
  if (passCountEl) passCountEl.textContent = summary.pass ?? 0;
  if (failCountEl) failCountEl.textContent = summary.fail ?? 0;
  if (onholdCountEl) onholdCountEl.textContent = summary.onhold ?? 0;
  if (pendingCountEl) pendingCountEl.textContent = summary.pending ?? 0;
  if (document.getElementById('na-count')) document.getElementById('na-count').textContent = summary.na ?? 0;
  if (document.getElementById('functional-team-count')) document.getElementById('functional-team-count').textContent = summary.functionalTeam ?? 0;
}

function updateDraftSummary() {
  const summary = summarize();
  updateSummaryUI(summary);
}

async function parseTestcaseForm(event) {
  event.preventDefault();

  clearAllFieldErrors();
  const projectName = projectNameInput ? projectNameInput.value.trim() : '';
  if (!projectName) {
    if (projectNameInput) {
      setFieldError(projectNameInput, 'Customer Name is required.');
      scrollToField(projectNameInput);
    }
    return;
  }

  if (!/[A-Za-z]/.test(projectName)) {
    if (projectNameInput) {
      setFieldError(projectNameInput, 'Customer Name must contain at least one letter.');
      scrollToField(projectNameInput);
    }
    return;
  }

  let moduleName = moduleInput ? moduleInput.value : '';
  let submoduleName = submoduleInput ? submoduleInput.value : '';

  if (moduleName === 'Others') {
    const customModuleInput = document.getElementById('custom-module-name');
    const customSubmoduleInput = document.getElementById('custom-submodule-name');
    const customModule = customModuleInput ? customModuleInput.value.trim() : '';
    const customSubmodule = customSubmoduleInput ? customSubmoduleInput.value.trim() : '';
    
    let hasErr = false;
    if (!customModule) {
      if (customModuleInput) setFieldError(customModuleInput, 'Custom Module is required.');
      hasErr = true;
    }
    if (!customSubmodule) {
      if (customSubmoduleInput) setFieldError(customSubmoduleInput, 'Custom Submodule is required.');
      hasErr = true;
    }
    if (hasErr) {
      if (customModuleInput && !customModule) scrollToField(customModuleInput);
      else if (customSubmoduleInput && !customSubmodule) scrollToField(customSubmoduleInput);
      return;
    }
    moduleName = customModule;
    submoduleName = customSubmodule;
  } else {
    let hasErr = false;
    if (!moduleName) {
      if (moduleInput) setFieldError(moduleInput, 'Module is required.');
      hasErr = true;
    }
    if (!submoduleName) {
      if (submoduleInput) setFieldError(submoduleInput, 'Submodule is required.');
      hasErr = true;
    }
    if (hasErr) {
      if (moduleInput && !moduleName) scrollToField(moduleInput);
      else if (submoduleInput && !submoduleName) scrollToField(submoduleInput);
      return;
    }
  }

  const total = totalCountInput ? readOptionalCount(totalCountInput) : null;
  const pass = passCountInput ? readOptionalCount(passCountInput) : null;
  const fail = failCountInput ? readOptionalCount(failCountInput) : null;
  const onhold = onholdCountInput ? readOptionalCount(onholdCountInput) : null;
  const pending = pendingCountInput ? readOptionalCount(pendingCountInput) : null;
  let na = naCountInput ? readOptionalCount(naCountInput) : null;
  let functionalTeam = functionalTeamCountInput ? readOptionalCount(functionalTeamCountInput) : null;

  const values = { total, pass, fail, onhold, pending, na, functionalTeam };

  if (values.na === null) {
    values.na = 0;
  }
  if (values.functionalTeam === null) {
    values.functionalTeam = 0;
  }

  if (values.total !== null && !isNaN(values.total)) {
    if (values.total > 99999) {
      if (totalCountInput) {
        setFieldError(totalCountInput, 'Only up to 5 digits allowed.');
        scrollToField(totalCountInput);
      }
      return;
    }
    const pVal = values.pass ?? 0;
    const fVal = values.fail ?? 0;
    const ohVal = values.onhold ?? 0;
    const naVal = values.na ?? 0;
    const ftVal = values.functionalTeam ?? 0;
    values.pending = values.total - pVal - fVal - ohVal - naVal - ftVal;
    if (values.pending < 0) values.pending = 0;
    if (pendingCountInput) pendingCountInput.value = values.pending;

    values.pass = pVal;
    values.fail = fVal;
    values.onhold = ohVal;
  }
  if (Object.values(values).some((value) => Number.isNaN(value))) {
    let scrolled = false;
    if (isNaN(total) && totalCountInput) {
      setFieldError(totalCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(totalCountInput);
        scrolled = true;
      }
    }
    if (isNaN(pass) && passCountInput) {
      setFieldError(passCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(passCountInput);
        scrolled = true;
      }
    }
    if (isNaN(fail) && failCountInput) {
      setFieldError(failCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(failCountInput);
        scrolled = true;
      }
    }
    if (isNaN(onhold) && onholdCountInput) {
      setFieldError(onholdCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(onholdCountInput);
        scrolled = true;
      }
    }
    if (isNaN(pending) && pendingCountInput) {
      setFieldError(pendingCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(pendingCountInput);
        scrolled = true;
      }
    }
    if (isNaN(na) && naCountInput) {
      setFieldError(naCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(naCountInput);
        scrolled = true;
      }
    }
    if (isNaN(functionalTeam) && functionalTeamCountInput) {
      setFieldError(functionalTeamCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(functionalTeamCountInput);
        scrolled = true;
      }
    }
    return;
  }

  const existingPass = getExistingPassCount();
  if (values.pass !== null && values.pass < existingPass) {
    if (passCountInput) {
      setFieldError(passCountInput, `Pass count cannot be less than the previously saved count (${existingPass}).`);
      scrollToField(passCountInput);
    }
    return;
  }

  const countFields = ['pass', 'fail', 'onhold', 'pending', 'na', 'functionalTeam'];
  const executionFields = ['pass', 'fail', 'onhold', 'pending', 'na', 'functionalTeam'];
  const blankExecutionFields = executionFields.filter((fieldName) => values[fieldName] === null);
  const executionTotal = executionFields.reduce((sum, fieldName) => sum + (values[fieldName] ?? 0), 0);
  const countTotal = countFields.reduce((sum, fieldName) => sum + (values[fieldName] ?? 0), 0);

  if (values.total === null) {
    values.total = countTotal;
  } else if (blankExecutionFields.length === 1) {
    const missingField = blankExecutionFields[0];
    const missingValue = values.total - executionTotal;
    if (missingValue < 0) {
      if (totalCountInput) {
        setFieldError(totalCountInput, 'Counts exceed Total.');
        scrollToField(totalCountInput);
      }
      return;
    }

    values[missingField] = missingValue;
  } else if (executionTotal > values.total) {
    if (totalCountInput) {
      setFieldError(totalCountInput, 'Counts exceed Total.');
      scrollToField(totalCountInput);
    }
    return;
  } else if (executionTotal < values.total) {
    if (totalCountInput) {
      setFieldError(totalCountInput, 'Counts must equal Total.');
      scrollToField(totalCountInput);
    }
    return;
  }

  if (values.total < countTotal) {
    if (totalCountInput) {
      setFieldError(totalCountInput, 'Counts exceed Total.');
      scrollToField(totalCountInput);
    }
    return;
  }

  // Validate Total is greater than zero
  if (values.total === 0) {
    if (totalCountInput) {
      setFieldError(totalCountInput, 'Add some value');
      scrollToField(totalCountInput);
    }
    return;
  }

  countFields.forEach((fieldName) => {
    values[fieldName] = toCount(values[fieldName]);
  });

  clearFormError();

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const localDateStr = `${year}-${month}-${day}`;

  const record = {
    project: projectName,
    module: moduleName,
    submodule: submoduleName,
    total: values.total,
    pass: values.pass,
    fail: values.fail,
    onhold: values.onhold,
    pending: values.pending,
    na: values.na,
    functionalTeam: values.functionalTeam,
    comments: commentInput ? commentInput.value.trim() : '',
    entryDate: localDateStr
  };

  if (!record.module || !record.submodule || Number.isNaN(record.total)) {
    return;
  }

  // Add locally to draft workspace instead of hitting backend immediately
  const existingDraftIndex = records.findIndex(r => 
    r.project.toLowerCase() === record.project.toLowerCase() &&
    r.module.toLowerCase() === record.module.toLowerCase() &&
    r.submodule.toLowerCase() === record.submodule.toLowerCase()
  );

  if (existingDraftIndex !== -1) {
    records[existingDraftIndex] = record;
  } else {
    records.push(record);
  }

  const userEmail = localStorage.getItem('userEmail');
  if (userEmail) {
    localStorage.setItem(`draftRecords_${userEmail}`, JSON.stringify(records));
  }

  updateTable();
  updateDraftSummary();

  // Clear submodule specific inputs
  if (moduleInput) {
    moduleInput.value = '';
    populateSubmodules('');
  }
  if (submoduleInput) {
    submoduleInput.disabled = true;
    submoduleInput.required = true;
    const submoduleLabel = submoduleInput.closest('label');
    if (submoduleLabel) {
      submoduleLabel.style.display = 'block';
    }
  }
  const customContainer = document.getElementById('custom-module-container');
  const customModuleInput = document.getElementById('custom-module-name');
  const customSubmoduleInput = document.getElementById('custom-submodule-name');
  if (customContainer) customContainer.style.display = 'none';
  if (customModuleInput) {
    customModuleInput.value = '';
    customModuleInput.required = false;
  }
  if (customSubmoduleInput) {
    customSubmoduleInput.value = '';
    customSubmoduleInput.required = false;
  }

  if (totalCountInput) totalCountInput.value = '';
  if (passCountInput) passCountInput.value = '';
  if (failCountInput) failCountInput.value = '';
  if (onholdCountInput) onholdCountInput.value = '';
  if (pendingCountInput) pendingCountInput.value = '';
  if (naCountInput) naCountInput.value = '';
  if (functionalTeamCountInput) functionalTeamCountInput.value = '';
  if (commentInput) commentInput.value = '';
}


function exportSummary() {
  const projectName = projectNameInput ? projectNameInput.value.trim() : '';
  if (!projectName) {
    setFormError('Project Name is required.');
    return;
  }

  const summary = summarize();
  const payload = {
    projectName,
    generatedAt: new Date().toISOString(),
    summary,
    records,
  };

  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'module-submodule-totals.json';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function createImageReport() {
  const projectName = projectNameInput ? projectNameInput.value.trim() : 'Untitled Project';
  const summary = summarize();
  const report = document.createElement('section');
  report.className = 'image-report';

  const header = document.createElement('div');
  header.className = 'image-report-header';

  const title = document.createElement('h1');
  title.textContent = projectName;

  const subtitle = document.createElement('p');
  subtitle.textContent = 'Module Status Tracker';

  header.append(title, subtitle);
  report.appendChild(header);

  const summaryGrid = document.createElement('div');
  summaryGrid.className = 'image-report-summary';

  [
    ['Total Submodules', summary.totalSubmodules],
    ['Total Count', summary.total],
    ['Pass', summary.pass],
    ['Fail', summary.fail],
    ['On-Hold', summary.onhold],
    ['Pending', summary.pending],
    ['N/A', summary.na || 0],
    ['Taken care by functional team', summary.functionalTeam || 0],
  ].forEach(([label, value]) => {
    const item = document.createElement('div');
    const strong = document.createElement('strong');
    const count = document.createElement('span');
    strong.textContent = label;
    count.textContent = value;
    item.append(strong, count);
    summaryGrid.appendChild(item);
  });

  report.appendChild(summaryGrid);

  const table = document.createElement('table');
  table.className = 'image-report-table';

  const tbody = document.createElement('tbody');
  if (!records.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 11;
    cell.className = 'empty-state';
    cell.textContent = 'No status records available.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    Object.entries(groupByProjectAndModule(records)).forEach(([projectName, modules]) => {
      // 1. Project/Customer row
      const projectRow = document.createElement('tr');
      projectRow.innerHTML = `<td colspan="11" style="background: #d9e1f2; color: #1f4e79; font-weight: 800; padding: 0.7rem;">Customer: ${projectName}</td>`;
      tbody.appendChild(projectRow);

      // 2. Column Headers row
      const headerRow = document.createElement('tr');
      headerRow.innerHTML = `
        <th>Module</th>
        <th>Submodule</th>
        <th>Total Count</th>
        <th>Pass</th>
        <th>Fail</th>
        <th>On-Hold</th>
        <th>Pending</th>
        <th>N/A</th>
        <th>Taken care by functional team</th>
        <th>Status</th>
        <th>Comments</th>
      `;
      tbody.appendChild(headerRow);

      Object.entries(modules).forEach(([moduleName, moduleRecords]) => {
        const moduleSummary = moduleRecords.reduce(
          (accumulator, record) => {
            accumulator.total += record.total;
            accumulator.pass += record.pass;
            accumulator.fail += record.fail;
            accumulator.onhold += record.onhold;
            accumulator.pending += record.pending;
            accumulator.na += record.na || 0;
            accumulator.functionalTeam += record.functionalTeam || 0;
            return accumulator;
          },
          { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0, na: 0, functionalTeam: 0 },
        );

        const moduleRow = document.createElement('tr');
        moduleRow.className = 'image-report-module-row';
        const moduleCell = document.createElement('td');
        moduleCell.colSpan = 11;
        moduleCell.textContent = `${moduleName} - Total: ${moduleSummary.total} | Pass: ${moduleSummary.pass} | Fail: ${moduleSummary.fail} | On-Hold: ${moduleSummary.onhold} | Pending: ${moduleSummary.pending} | N/A: ${moduleSummary.na ?? 0} | Taken care by functional team: ${moduleSummary.functionalTeam ?? 0} | Status: ${getModuleStatus(moduleSummary)}`;
        moduleRow.appendChild(moduleCell);
        tbody.appendChild(moduleRow);

        moduleRecords.forEach((record, recordIndex) => {
          const row = document.createElement('tr');

          const moduleCell = document.createElement('td');
          moduleCell.textContent = recordIndex === 0 ? record.module : '';
          row.appendChild(moduleCell);

          [
            record.submodule,
            record.total,
            record.pass,
            record.fail,
            record.onhold,
            record.pending,
            record.na ?? 0,
            record.functionalTeam ?? 0,
            getStatus(record),
            record.comments || '-',
          ].forEach((value) => {
            const cell = document.createElement('td');
            cell.textContent = value;
            row.appendChild(cell);
          });
          tbody.appendChild(row);
        });
      });
    });

    // Add Grand Total row styled matching the Excel total row
    const grandTotalRow = document.createElement('tr');
    grandTotalRow.className = 'image-report-grand-total';
    grandTotalRow.innerHTML = `
      <td colspan="2" style="text-align: center;">Grand Total</td>
      <td>${summary.total}</td>
      <td>${summary.pass}</td>
      <td>${summary.fail}</td>
      <td>${summary.onhold}</td>
      <td>${summary.pending}</td>
      <td>${summary.na ?? 0}</td>
      <td>${summary.functionalTeam ?? 0}</td>
      <td></td>
      <td></td>
    `;
    tbody.appendChild(grandTotalRow);
  }

  table.appendChild(tbody);
  report.appendChild(table);
  return report;
}

async function downloadStatusImage() {
  const html2canvas = window.html2canvas;
  if (!html2canvas) {
    setFormError('Image download library is not loaded. Please refresh the page and try again.');
    return;
  }

  const projectName = projectNameInput ? projectNameInput.value.trim() : 'module-status-tracker';
  const fileName = `${projectName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'module-status-tracker'}-status.png`;
  const report = createImageReport();
  document.body.appendChild(report);

  try {
    clearFormError();
    const canvas = await html2canvas(report, {
      backgroundColor: '#ffffff',
      scale: Math.min(window.devicePixelRatio || 1, 2),
    });

    const link = document.createElement('a');
    link.href = canvas.toDataURL('image/png');
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    setFormError('Image download is unavailable right now. Please try again.');
  } finally {
    report.remove();
  }
}

function getModuleSummaries() {
  const projectName = projectNameInput ? projectNameInput.value.trim() : '';
  const groupedRecords = groupByModule();
  return Object.entries(groupedRecords).map(([moduleName, moduleRecords]) => {
    const summary = moduleRecords.reduce(
      (accumulator, record) => {
        accumulator.total += record.total;
        accumulator.pass += record.pass;
        accumulator.fail += record.fail;
        accumulator.onhold += record.onhold;
        accumulator.pending += record.pending;
        return accumulator;
      },
      {
        total: 0,
        pass: 0,
        fail: 0,
        onhold: 0,
        pending: 0,
      },
    );

    return {
      project: projectName,
      module: moduleName,
      submodules: moduleRecords.map((record) => record.submodule).join(', '),
      total: summary.total,
      pass: summary.pass,
      fail: summary.fail,
      onhold: summary.onhold,
      pending: summary.pending,
      status: getModuleStatus(summary),
    };
  });
}

function buildCellStyle(thinBorder, rowIndex, columnIndex, grandTotalRowIndex, projectHeaderRows, headerRows) {
  const isHeaderRow = headerRows ? headerRows.has(rowIndex) : (rowIndex === 2);
  const isTitleRow = rowIndex === 0;
  const isGrandTotalRow = rowIndex === grandTotalRowIndex;
  const isProjectHeaderRow = projectHeaderRows && projectHeaderRows.has(rowIndex);
  const isCommentsColumn = columnIndex === 10;
  const shouldWrap = isCommentsColumn || columnIndex === 1 || columnIndex === 8;

  const style = {
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: shouldWrap,
    },
    border: thinBorder,
  };

  if (isGrandTotalRow) {
    style.alignment.horizontal = 'center';
    style.fill = { fgColor: { rgb: 'FFF2CC' } };
    style.font = { bold: true, sz: 12 };
  }

  if (isHeaderRow) {
    style.fill = { fgColor: { rgb: 'D9EAF7' } };
    style.font = { bold: true, color: { rgb: '17365D' }, sz: 12 };
  }

  if (isProjectHeaderRow) {
    style.fill = { fgColor: { rgb: 'D9E1F2' } };
    style.font = { bold: true, color: { rgb: '1F4E79' }, sz: 13 };
    style.alignment.horizontal = 'left';
  }

  if (isTitleRow || isHeaderRow || (columnIndex === 0 && !isProjectHeaderRow && !isGrandTotalRow && rowIndex > 1)) {
    style.font = { ...style.font, bold: true };
  }

  return style;
}

async function downloadExcel() {
  if (!records.length) {
    setFormError('Add at least one record before downloading Excel.');
    return;
  }

  try {
    const XLSX = window.XLSX;
    if (!XLSX) {
      setFormError('Excel library is not loaded. Please refresh the page and try again.');
      return;
    }

    // Group records by project, then by module within each project
    const groupedByProject = records.reduce((groups, record) => {
      const key = record.project || 'Untitled Project';
      if (!groups[key]) groups[key] = [];
      groups[key].push(record);
      return groups;
    }, {});

    const summaryRows = [['Module Status Tracker'], []];
    const summaryMerges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 10 } }];
    const projectHeaderRows = new Set();
    const headerRows = new Set();

    Object.entries(groupedByProject).forEach(([projName, projRecords]) => {
      // 1. Add project header row above column headers
      const projectRowIndex = summaryRows.length;
      summaryRows.push([`Customer: ${projName}`, '', '', '', '', '', '', '', '', '', '']);
      summaryMerges.push({ s: { r: projectRowIndex, c: 0 }, e: { r: projectRowIndex, c: 10 } });
      projectHeaderRows.add(projectRowIndex);

      // 2. Add column headers row below the project row
      const headerRowIndex = summaryRows.length;
      summaryRows.push(['Module', 'Submodule', 'Total Count', 'Pass', 'Fail', 'On-Hold', 'Pending', 'N/A', 'Taken care by functional team', 'Status', 'Comments']);
      headerRows.add(headerRowIndex);

      // Group this project's records by module
      const moduleGroups = projRecords.reduce((groups, record) => {
        const key = record.module;
        if (!groups[key]) groups[key] = [];
        groups[key].push(record);
        return groups;
      }, {});

      Object.entries(moduleGroups).forEach(([moduleName, moduleRecords]) => {
        const moduleStartRow = summaryRows.length;
        moduleRecords.forEach((record) => {
          summaryRows.push([moduleName, record.submodule, record.total, record.pass, record.fail, record.onhold, record.pending, record.na ?? 0, record.functionalTeam ?? 0, getStatus(record), record.comments || '-']);
        });

        if (moduleRecords.length > 1) {
          summaryMerges.push({ s: { r: moduleStartRow, c: 0 }, e: { r: summaryRows.length - 1, c: 0 } });
        }
      });
    });

    const summaryTotals = summarize();
    summaryRows.push([]);
    summaryRows.push([
      'Grand Total',
      '',
      summaryTotals.total,
      summaryTotals.pass,
      summaryTotals.fail,
      summaryTotals.onhold,
      summaryTotals.pending,
      summaryTotals.na || 0,
      summaryTotals.functionalTeam || 0,
      '',
      '',
    ]);

    const workbook = XLSX.utils.book_new();
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryRows);
    summarySheet['!merges'] = summaryMerges;
    summarySheet['!cols'] = [
      { wch: 22 },
      { wch: 24 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 14 },
      { wch: 14 },
      { wch: 12 },
      { wch: 18 },
      { wch: 14 },
      { wch: 28 },
    ];
    summarySheet['!rows'] = [];
    summarySheet['!rows'][0] = { hpt: 30 };
    summarySheet['!rows'][1] = { hpt: 8 };

    headerRows.forEach((rowIdx) => {
      summarySheet['!rows'][rowIdx] = { hpt: 35 };
    });

    const thinBorder = {
      top: { style: 'thin', color: { rgb: '000000' } },
      bottom: { style: 'thin', color: { rgb: '000000' } },
      left: { style: 'thin', color: { rgb: '000000' } },
      right: { style: 'thin', color: { rgb: '000000' } },
    };

    const grandTotalRowIndex = summaryRows.length - 1;
    summaryRows.forEach((row, rowIndex) => {
      row.forEach((cellValue, columnIndex) => {
        const cellRef = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
        if (!summarySheet[cellRef]) {
          return;
        }

        summarySheet[cellRef].s = buildCellStyle(thinBorder, rowIndex, columnIndex, grandTotalRowIndex, projectHeaderRows, headerRows);
      });
    });

    if (summarySheet['A1']) {
      summarySheet['A1'].s = {
        alignment: { horizontal: 'center', vertical: 'center' },
        fill: { fgColor: { rgb: '1F4E78' } },
        font: { bold: true, sz: 18, color: { rgb: 'FFFFFF' } },
        border: thinBorder,
      };
    }

    // Style project header rows
    projectHeaderRows.forEach((rowIdx) => {
      for (let c = 0; c < 11; c++) {
        const cellRef = XLSX.utils.encode_cell({ r: rowIdx, c: c });
        if (!summarySheet[cellRef]) {
          summarySheet[cellRef] = { t: 's', v: '' };
        }
        summarySheet[cellRef].s = {
          alignment: { horizontal: c === 0 ? 'left' : 'center', vertical: 'center' },
          fill: { fgColor: { rgb: 'E2EFDA' } },
          font: { bold: true, color: { rgb: '375623' }, sz: 13 },
          border: thinBorder,
        };
      }
      summarySheet['!rows'][rowIdx] = { hpt: 26 };
    });

    // Style module merge cells
    summaryMerges.filter((m) => !projectHeaderRows.has(m.s.r) && m.s.r !== 0).forEach((merge) => {
      const cellRef = XLSX.utils.encode_cell({ r: merge.s.r, c: merge.s.c });
      if (summarySheet[cellRef]) {
        summarySheet[cellRef].s = {
          alignment: { horizontal: 'center', vertical: 'top' },
          font: { bold: true },
          border: thinBorder,
        };
      }
    });

    summarySheet['!rows'][grandTotalRowIndex] = { hpt: 26 };
    Array.from({ length: 11 }, (_, columnIndex) => columnIndex).forEach((columnIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: grandTotalRowIndex, c: columnIndex });
      if (!summarySheet[cellRef]) {
        summarySheet[cellRef] = { t: 's', v: '' };
      }

      if (summarySheet[cellRef]) {
        summarySheet[cellRef].s = {
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
          fill: { fgColor: { rgb: 'FFF2CC' } },
          font: { bold: true, sz: 12, color: { rgb: '000000' } },
        };
      }
    });

    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

    clearFormError();
    XLSX.writeFile(workbook, 'module-status-tracker.xlsx');
  } catch (error) {
    setFormError('Excel download is unavailable right now. Please try again.');
  }
}

function editDraftRecord(index) {
  const record = records[index];
  if (!record) return;

  if (projectNameInput) {
    projectNameInput.value = record.project || '';
    projectNameInput.dispatchEvent(new Event('input'));
  }

  const customContainer = document.getElementById('custom-module-container');
  const customModuleInput = document.getElementById('custom-module-name');
  const customSubmoduleInput = document.getElementById('custom-submodule-name');

  if (record.module && !submodulesMap[record.module]) {
    // Custom module!
    if (moduleInput) {
      moduleInput.value = 'Others';
    }
    if (customContainer) customContainer.style.display = 'flex';
    if (customModuleInput) {
      customModuleInput.value = record.module || '';
      customModuleInput.required = true;
    }
    if (customSubmoduleInput) {
      customSubmoduleInput.value = record.submodule || '';
      customSubmoduleInput.required = true;
    }
    if (submoduleInput) {
      submoduleInput.innerHTML = '<option value="" disabled selected>Select Submodule</option>';
      submoduleInput.disabled = true;
      submoduleInput.required = false;
    }
  } else {
    // Standard module
    if (moduleInput) {
      moduleInput.value = record.module || '';
    }
    if (customContainer) customContainer.style.display = 'none';
    if (customModuleInput) {
      customModuleInput.value = '';
      customModuleInput.required = false;
    }
    if (customSubmoduleInput) {
      customSubmoduleInput.value = '';
      customSubmoduleInput.required = false;
    }
    if (submoduleInput) {
      submoduleInput.required = true;
      populateModules(record.module || '');
      populateSubmodules(record.module || '', record.submodule || '');
    }
  }

  if (totalCountInput) totalCountInput.value = record.total !== undefined ? record.total : '';
  if (passCountInput) passCountInput.value = record.pass !== undefined ? record.pass : '';
  if (failCountInput) failCountInput.value = record.fail !== undefined ? record.fail : '';
  if (onholdCountInput) onholdCountInput.value = record.onhold !== undefined ? record.onhold : '';
  if (naCountInput) naCountInput.value = record.na !== undefined && record.na !== null ? record.na : '';
  if (functionalTeamCountInput) functionalTeamCountInput.value = record.functionalTeam !== undefined && record.functionalTeam !== null ? record.functionalTeam : '';
  if (commentInput) commentInput.value = record.comments || '';

  calculatePending();
  clearAllFieldErrors();
  clearFormError();

  if (projectNameInput) {
    projectNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  records.splice(index, 1);
  const userEmail = localStorage.getItem('userEmail');
  if (userEmail) {
    localStorage.setItem(`draftRecords_${userEmail}`, JSON.stringify(records));
  }
  updateTable();
  updateDraftSummary();
}

function handleDraftTableClick(event) {
  const removeBtn = event.target.closest('.remove-button');
  const editBtn = event.target.closest('.edit-draft-button');

  if (removeBtn) {
    const index = parseInt(removeBtn.dataset.index, 10);
    if (!isNaN(index) && index >= 0 && index < records.length) {
      records.splice(index, 1);
      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        localStorage.setItem(`draftRecords_${userEmail}`, JSON.stringify(records));
      }
      updateTable();
      updateDraftSummary();
    }
  } else if (editBtn) {
    const index = parseInt(editBtn.dataset.index, 10);
    if (!isNaN(index) && index >= 0 && index < records.length) {
      editDraftRecord(index);
    }
  }
}

function createHistoryRow(record) {
  const status = getStatus(record);
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${record.submodule}</td>
    <td>${record.total}</td>
    <td class="status-pass">${record.pass}</td>
    <td class="status-fail">${record.fail}</td>
    <td class="status-onhold">${record.onhold}</td>
    <td class="status-pending">${record.pending}</td>
    <td class="status-na">${record.na ?? 0}</td>
    <td class="status-functional">${record.functionalTeam ?? 0}</td>
    <td><span class="status-badge ${getStatusClass(status)}">${status}</span></td>
    <td class="comment-cell">${record.comments || '-'}</td>
    <td>
      <div style="display: flex; gap: 0.5rem; justify-content: center; align-items: center;">
        <button class="retrieve-button retrieve-history-button" data-id="${record.id}" title="Retrieve to fields for update" aria-label="Retrieve record">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; pointer-events: none;">
            <path d="M12 19V5M5 12l7-7 7 7"/>
          </svg>
        </button>
        <button class="remove-button remove-history-button" data-id="${record.id}" aria-label="Remove record from database">
          <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; pointer-events: none;">
            <path d="M3 6h18" />
            <path d="M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6" />
            <path d="M10 11v5" />
            <path d="M14 11v5" />
          </svg>
        </button>
      </div>
    </td>
  `;
  return tr;
}

function populateHistoryMonthFilter() {
  const filterSelect = document.getElementById('history-month-filter');
  if (!filterSelect) return;

  const prevSelected = filterSelect.value;
  const monthsSet = new Set();
  historyRecords.forEach(record => {
    const dateStr = getEntryDateString(record);
    if (dateStr) {
      const yyyymm = dateStr.substring(0, 7);
      monthsSet.add(yyyymm);
    }
  });

  const sortedMonths = Array.from(monthsSet).sort().reverse();

  filterSelect.innerHTML = '<option value="all">All Months</option>';

  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  sortedMonths.forEach(ym => {
    const [year, monthStr] = ym.split('-');
    const monthIdx = parseInt(monthStr, 10) - 1;
    const label = `${monthNames[monthIdx]} ${year}`;
    
    const opt = document.createElement('option');
    opt.value = ym;
    opt.textContent = label;
    filterSelect.appendChild(opt);
  });

  const today = new Date();
  const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;

  if (prevSelected && Array.from(filterSelect.options).some(o => o.value === prevSelected)) {
    filterSelect.value = prevSelected;
  } else if (Array.from(filterSelect.options).some(o => o.value === currentYearMonth)) {
    filterSelect.value = currentYearMonth;
  } else if (sortedMonths.length > 0) {
    filterSelect.value = sortedMonths[0];
  } else {
    filterSelect.value = 'all';
  }
}

function updateHistoryTable() {
  if (!historyTableBody) return;
  historyTableBody.innerHTML = '';

  const filterSelect = document.getElementById('history-month-filter');
  const selectedMonth = filterSelect ? filterSelect.value : 'all';

  const recordsToRender = historyRecords.filter(record => {
    if (selectedMonth === 'all') return true;
    const dateStr = getEntryDateString(record);
    if (!dateStr) return false;
    return dateStr.startsWith(selectedMonth);
  });

  if (!recordsToRender.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="11" class="empty-state">No saved entries match the selected filter.</td>';
    historyTableBody.appendChild(emptyRow);
    return;
  }

  const grouped = groupByProjectAndModule(recordsToRender);
  Object.entries(grouped).forEach(([projectName, modules]) => {
    const projectHeader = document.createElement('tr');
    projectHeader.className = 'project-header-row-ui';
    projectHeader.innerHTML = `<td colspan="11"><strong style="color: #ffffff; font-weight: 800;">Customer: </strong><strong style="color: #38bdf8; font-weight: 800;">${projectName}</strong></td>`;
    historyTableBody.appendChild(projectHeader);

    Object.entries(modules).forEach(([moduleName, moduleRecords]) => {
      const moduleSummary = moduleRecords.reduce(
        (summary, record) => {
          summary.total += record.total;
          summary.pass += record.pass;
          summary.fail += record.fail;
          summary.onhold += record.onhold;
          summary.pending += record.pending;
          summary.na += record.na || 0;
          summary.functionalTeam += record.functionalTeam || 0;
          return summary;
        },
        { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0, na: 0, functionalTeam: 0 }
      );

      const moduleHeader = document.createElement('tr');
      moduleHeader.className = 'module-header-row';
      const status = getModuleStatus(moduleSummary);
      moduleHeader.innerHTML = `
        <td colspan="11">
          <strong>${moduleName}</strong>
          <span class="module-header-meta">Total: ${moduleSummary.total} | Pass: ${moduleSummary.pass} | Fail: ${moduleSummary.fail} | On-Hold: ${moduleSummary.onhold} | Pending: ${moduleSummary.pending} | N/A: ${moduleSummary.na ?? 0} | Taken care by functional team: ${moduleSummary.functionalTeam ?? 0} | Status: ${status}</span>
        </td>
      `;
      historyTableBody.appendChild(moduleHeader);

      moduleRecords.forEach((record) => {
        historyTableBody.appendChild(createHistoryRow(record));
      });
    });
  });
  updateProgressChart(recordsToRender);
}

function updateProgressChart(records = historyRecords) {
  const chartCanvas = document.getElementById('employee-progress-chart');
  if (!chartCanvas) return;

  const dailyData = {};
  records.forEach(record => {
    const date = getEntryDateString(record);
    if (!date) return;
    if (!dailyData[date]) {
      dailyData[date] = { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0, na: 0, functionalTeam: 0 };
    }
    dailyData[date].total += record.total || 0;
    dailyData[date].pass += record.pass || 0;
    dailyData[date].fail += record.fail || 0;
    dailyData[date].onhold += record.onhold || 0;
    dailyData[date].pending += record.pending || 0;
    dailyData[date].na += record.na || 0;
    dailyData[date].functionalTeam += record.functionalTeam || 0;
  });

  let sortedDates = Object.keys(dailyData).sort();

  // Show exactly the last 14 consecutive calendar days ending at the latest date
  if (sortedDates.length > 0) {
    const latestDateStr = sortedDates[sortedDates.length - 1];
    const latestDate = new Date(latestDateStr);
    const fourteenDays = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(latestDate);
      d.setDate(latestDate.getDate() - i);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      fourteenDays.push(`${yyyy}-${mm}-${dd}`);
    }
    sortedDates = fourteenDays;
  }

  const labels = sortedDates.map(dateStr => {
    try {
      return new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    } catch(e) {
      return dateStr;
    }
  });

  const passPoints = sortedDates.map(d => (dailyData[d] || { pass: 0 }).pass);
  const failPoints = sortedDates.map(d => (dailyData[d] || { fail: 0 }).fail);
  const onholdPoints = sortedDates.map(d => (dailyData[d] || { onhold: 0 }).onhold);
  const pendingPoints = sortedDates.map(d => (dailyData[d] || { pending: 0 }).pending);
  const naPoints = sortedDates.map(d => (dailyData[d] || { na: 0 }).na);
  const functionalTeamPoints = sortedDates.map(d => (dailyData[d] || { functionalTeam: 0 }).functionalTeam);
  const passRatePoints = sortedDates.map(d => {
    const data = dailyData[d] || { total: 0, pass: 0 };
    const total = data.total;
    return total > 0 ? parseFloat((data.pass / total * 100).toFixed(1)) : 0;
  });

  if (employeeChart) {
    employeeChart.destroy();
  }

  if (sortedDates.length === 0) {
    return;
  }

  const ctx = chartCanvas.getContext('2d');
  employeeChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          type: 'line',
          label: 'Pass Rate (%)',
          data: passRatePoints,
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74, 222, 128, 0.12)',
          borderWidth: 3,
          tension: 0.35,
          pointRadius: 4,
          pointHoverRadius: 6,
          yAxisID: 'y1',
          zIndex: 10
        },
        {
          label: 'Pass',
          data: passPoints,
          backgroundColor: 'rgba(74, 222, 128, 0.45)',
          borderColor: 'rgba(74, 222, 128, 0.8)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'Fail',
          data: failPoints,
          backgroundColor: 'rgba(248, 113, 113, 0.45)',
          borderColor: 'rgba(248, 113, 113, 0.8)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'On-Hold',
          data: onholdPoints,
          backgroundColor: 'rgba(245, 158, 11, 0.45)',
          borderColor: 'rgba(245, 158, 11, 0.8)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'Pending',
          data: pendingPoints,
          backgroundColor: 'rgba(250, 204, 21, 0.45)',
          borderColor: 'rgba(250, 204, 21, 0.8)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'N/A',
          data: naPoints,
          backgroundColor: 'rgba(167, 139, 250, 0.45)',
          borderColor: 'rgba(167, 139, 250, 0.8)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        },
        {
          label: 'Functional Team',
          data: functionalTeamPoints,
          backgroundColor: 'rgba(244, 114, 182, 0.45)',
          borderColor: 'rgba(244, 114, 182, 0.8)',
          borderWidth: 1,
          stack: 'status',
          yAxisID: 'y'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false
      },
      plugins: {
        legend: {
          position: 'top',
          labels: {
            color: '#e2e8f0',
            font: { family: 'Inter, sans-serif', size: 11 }
          }
        },
        tooltip: {
          callbacks: {
            label: function(context) {
              let label = context.dataset.label || '';
              if (label) {
                label += ': ';
              }
              if (context.parsed.y !== null) {
                if (context.datasetIndex === 0) {
                  label += context.parsed.y + '%';
                } else {
                  label += context.parsed.y + ' cases';
                }
              }
              return label;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#b2c0f0', font: { family: 'Inter, sans-serif' } }
        },
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          stacked: true,
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#b2c0f0', font: { family: 'Inter, sans-serif' } },
          title: {
            display: true,
            text: 'Number of Cases',
            color: '#b2c0f0',
            font: { family: 'Inter, sans-serif', weight: 'bold' }
          }
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          min: 0,
          max: 100,
          grid: { drawOnChartArea: false },
          ticks: {
            color: '#4ade80',
            font: { family: 'Inter, sans-serif' },
            callback: function(value) {
              return value + '%';
            }
          },
          title: {
            display: true,
            text: 'Pass Rate (%)',
            color: '#4ade80',
            font: { family: 'Inter, sans-serif', weight: 'bold' }
          }
        }
      }
    }
  });
}

async function removeHistoryRecord(event) {
  const button = event.target.closest('.remove-history-button');
  if (!button) {
    return;
  }

  const id = button.dataset.id;
  if (id) {
    if (confirm('Are you sure you want to permanently delete this record from the database?')) {
      try {
        const response = await fetch(`${BASE_URL}/api/entries/${id}`, {
          method: 'DELETE',
          headers: API_HEADERS
        });
        const result = await response.json();
        if (result.success) {
          await fetchMyHistory();
        } else {
          setFormError(result.message || 'Failed to delete record.');
        }
      } catch (error) {
        console.error('Error deleting record:', error);
        setFormError('Error communicating with server.');
      }
    }
  }
}

function retrieveHistoryRecord(id) {
  const record = historyRecords.find(r => r.id === id);
  if (!record) return;

  if (projectNameInput) {
    projectNameInput.value = record.project || '';
    projectNameInput.dispatchEvent(new Event('input'));
  }

  const customContainer = document.getElementById('custom-module-container');
  const customModuleInput = document.getElementById('custom-module-name');
  const customSubmoduleInput = document.getElementById('custom-submodule-name');

  if (record.module && !submodulesMap[record.module]) {
    // Custom module!
    if (moduleInput) {
      moduleInput.value = 'Others';
    }
    if (customContainer) customContainer.style.display = 'flex';
    if (customModuleInput) {
      customModuleInput.value = record.module || '';
      customModuleInput.required = true;
    }
    if (customSubmoduleInput) {
      customSubmoduleInput.value = record.submodule || '';
      customSubmoduleInput.required = true;
    }
    if (submoduleInput) {
      submoduleInput.innerHTML = '<option value="" disabled selected>Select Submodule</option>';
      submoduleInput.disabled = true;
      submoduleInput.required = false;
    }
  } else {
    // Standard module
    if (moduleInput) {
      moduleInput.value = record.module || '';
    }
    if (customContainer) customContainer.style.display = 'none';
    if (customModuleInput) {
      customModuleInput.value = '';
      customModuleInput.required = false;
    }
    if (customSubmoduleInput) {
      customSubmoduleInput.value = '';
      customSubmoduleInput.required = false;
    }
    if (submoduleInput) {
      submoduleInput.required = true;
      populateModules(record.module || '');
      populateSubmodules(record.module || '', record.submodule || '');
    }
  }

  if (totalCountInput) totalCountInput.value = record.total !== undefined ? record.total : '';
  if (passCountInput) passCountInput.value = record.pass !== undefined ? record.pass : '';
  if (failCountInput) failCountInput.value = record.fail !== undefined ? record.fail : '';
  if (onholdCountInput) onholdCountInput.value = record.onhold !== undefined ? record.onhold : '';
  if (naCountInput) naCountInput.value = record.na !== undefined && record.na !== null ? record.na : '';
  if (functionalTeamCountInput) functionalTeamCountInput.value = record.functionalTeam !== undefined && record.functionalTeam !== null ? record.functionalTeam : '';
  if (commentInput) commentInput.value = record.comments || '';

  calculatePending();
  clearAllFieldErrors();
  clearFormError();

  if (projectNameInput) {
    projectNameInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
}

async function handleHistoryTableClick(event) {
  const removeBtn = event.target.closest('.remove-history-button');
  const retrieveBtn = event.target.closest('.retrieve-history-button');

  if (removeBtn) {
    await removeHistoryRecord(event);
  } else if (retrieveBtn) {
    retrieveHistoryRecord(retrieveBtn.dataset.id);
  }
}

async function fetchMyHistory() {
  try {
    const response = await fetch(`${BASE_URL}/api/entries/mine`, {
      method: 'GET',
      headers: API_HEADERS
    });
    if (response.status === 403) {
      alert("Your account is inactive. Access denied.");
      handleSwitchUser();
      return;
    }
    const result = await response.json();
    if (result && result.success && result.data) {
      historyRecords.length = 0;
      historyRecords.push(...result.data);
      populateHistoryMonthFilter();
    } else {
      historyRecords.length = 0;
    }
  } catch (error) {
    console.error('Error fetching database history:', error);
    historyRecords.length = 0;
  }
  updateHistoryTable();
}

async function completeProcess() {
  if (records.length === 0) {
    setFormError('Please add at least one submodule before completing the process.');
    return;
  }

  const completeBtn = document.getElementById('complete-process');
  if (completeBtn) {
    completeBtn.disabled = true;
    completeBtn.textContent = 'Saving...';
  }

  clearFormError();
  clearAllFieldErrors();

  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const localDateStr = `${year}-${month}-${day}`;

  try {
    const savePromises = records.map(async (record) => {
      const payload = { ...record, entryDate: localDateStr };
      const response = await fetch(`${BASE_URL}/api/entries`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(payload)
      });
      return response.json();
    });

    const results = await Promise.all(savePromises);
    const failed = results.filter(res => !res.success);

    if (failed.length > 0) {
      setFormError('Failed to save some entries. Please try again.');
    } else {
      records.length = 0;
      updateTable();
      updateDraftSummary();

      if (projectNameInput) {
        projectNameInput.value = '';
      }
      const customContainer = document.getElementById('custom-module-container');
      const customModuleInput = document.getElementById('custom-module-name');
      const customSubmoduleInput = document.getElementById('custom-submodule-name');
      if (customContainer) customContainer.style.display = 'none';
      if (customModuleInput) {
        customModuleInput.value = '';
        customModuleInput.required = false;
      }
      if (customSubmoduleInput) {
        customSubmoduleInput.value = '';
        customSubmoduleInput.required = false;
      }

      updateCustomerDisplay();
      document.title = 'Module Status Tracker';

      const userEmail = localStorage.getItem('userEmail');
      if (userEmail) {
        localStorage.removeItem(`draftRecords_${userEmail}`);
      }

      await fetchMyHistory();

      if (formMessage) {
        formMessage.textContent = 'Process completed! All entries saved successfully.';
        formMessage.classList.remove('error');
        formMessage.style.color = '#4ade80';
        setTimeout(() => {
          formMessage.textContent = '';
          formMessage.style.color = '';
        }, 5000);
      }
    }
  } catch (error) {
    console.error('Error completing process:', error);
    setFormError('Error communicating with server.');
  } finally {
    if (completeBtn) {
      completeBtn.disabled = false;
      completeBtn.textContent = 'Complete Process';
    }
  }
}

function extractNameFromEmail(email) {
  if (!email) return '';
  const prefix = email.split('@')[0];
  const parts = prefix.split(/[._-]/);
  return parts
    .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');
}

const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email-input');
const loginUsernameInput = document.getElementById('login-username-input');
const currentUserDisplay = document.getElementById('current-user-display');
const switchUserBtn = document.getElementById('switch-user-btn');
const adminDashboardBtn = document.getElementById('admin-dashboard-btn');

function checkUserSession() {
  const email = localStorage.getItem('userEmail');
  const name = localStorage.getItem('userName');
  
  if (!email || !name) {
    showLoginModal();
  } else {
    hideLoginModal();
    updateProfileUI(name, email);
    
    // Load saved draft from localStorage
    const savedDraft = localStorage.getItem(`draftRecords_${email}`);
    if (savedDraft) {
      try {
        records.length = 0;
        records.push(...JSON.parse(savedDraft));
      } catch (e) {
        console.error('Error parsing saved draft:', e);
      }
    }
    
    fetchMyHistory();
  }
}

function showLoginModal() {
  if (loginEmailInput) loginEmailInput.value = '';
  if (loginUsernameInput) loginUsernameInput.value = '';
  const usernameLabel = loginUsernameInput ? loginUsernameInput.closest('label') : null;
  if (usernameLabel) {
    usernameLabel.style.display = 'block';
  }
  if (loginModal) {
    loginModal.style.display = 'flex';
  }

  // Periodically check for browser autofill shortly after modal shows
  let checkCount = 0;
  const autofillInterval = setInterval(() => {
    handleEmailInputForUsername();
    checkCount++;
    if (checkCount >= 10 || (loginModal && loginModal.style.display === 'none')) {
      clearInterval(autofillInterval);
    }
  }, 300);
}

function hideLoginModal() {
  if (loginModal) {
    loginModal.style.display = 'none';
  }
}

async function updateProfileUI(name, email) {
  if (currentUserDisplay) {
    currentUserDisplay.textContent = name;
  }
  
  const emailLower = email.toLowerCase();
  const isHardcodedAdmin = emailLower === 'vvnair7333@gmail.com';

  // If hardcoded admin, show it immediately so they don't lose access if backend is offline/deploying
  if (adminDashboardBtn) {
    adminDashboardBtn.style.display = isHardcodedAdmin ? 'inline-flex' : 'none';
  }

  // Verify role dynamically in the background
  try {
    const response = await fetch(`${BASE_URL}/api/users/me`, {
      method: 'GET',
      headers: API_HEADERS
    });
    if (response.ok) {
      const result = await response.json();
      if (result && result.success && result.data) {
        const role = result.data.role;
        const isAdmin = (role === 'ADMIN') || (role === 'SUPER_ADMIN') || isHardcodedAdmin;
        if (adminDashboardBtn) {
          adminDashboardBtn.style.display = isAdmin ? 'inline-flex' : 'none';
        }
      }
    } else if (response.status === 403) {
      alert("Your account is inactive. Access denied.");
      handleSwitchUser();
    }
  } catch (error) {
    console.error('Failed to fetch user profile:', error);
  }
}

let emailLookupTimeout = null;

function handleEmailInputForUsername() {
  const email = loginEmailInput ? loginEmailInput.value.trim().toLowerCase() : '';
  let emailToName = {};
  try {
    emailToName = JSON.parse(localStorage.getItem('emailToName') || '{}');
  } catch (e) {}

  const usernameLabel = loginUsernameInput ? loginUsernameInput.closest('label') : null;
  if (email && emailToName[email]) {
    if (loginUsernameInput) {
      loginUsernameInput.value = emailToName[email];
    }
    if (usernameLabel) {
      usernameLabel.style.display = 'none';
    }
    return;
  }

  if (emailLookupTimeout) {
    clearTimeout(emailLookupTimeout);
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(email)) {
    emailLookupTimeout = setTimeout(async () => {
      try {
        const response = await fetch(`${BASE_URL}/api/users/lookup?email=${encodeURIComponent(email)}`);
        if (response.ok) {
          const result = await response.json();
          if (result && result.success && result.data) {
            const displayName = result.data.displayName;
            if (loginUsernameInput) {
              loginUsernameInput.value = displayName;
            }
            if (usernameLabel) {
              usernameLabel.style.display = 'none';
            }
            emailToName[email] = displayName;
            localStorage.setItem('emailToName', JSON.stringify(emailToName));
            return;
          }
        }
      } catch (err) {
        console.warn('Email lookup failed:', err);
      }
      resetUsernameInput();
    }, 400);
  } else {
    resetUsernameInput();
  }

  function resetUsernameInput() {
    if (usernameLabel && usernameLabel.style.display === 'none') {
      if (loginUsernameInput) {
        loginUsernameInput.value = '';
      }
    }
    if (usernameLabel) {
      usernameLabel.style.display = 'block';
    }
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const email = loginEmailInput ? loginEmailInput.value.trim() : '';
  let username = loginUsernameInput ? loginUsernameInput.value.trim() : '';
  
  // If username is empty but we have a saved mapping for the email, retrieve it
  if (!username && email) {
    let emailToName = {};
    try {
      emailToName = JSON.parse(localStorage.getItem('emailToName') || '{}');
    } catch (e) {}
    if (emailToName[email.toLowerCase()]) {
      username = emailToName[email.toLowerCase()];
      if (loginUsernameInput) {
        loginUsernameInput.value = username;
      }
    }
  }

  if (!email || !username) return;
  
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userName', username);
  localStorage.setItem('lastUserEmail', email);
  
  // Save mapping of email -> username
  let emailToName = {};
  try {
    emailToName = JSON.parse(localStorage.getItem('emailToName') || '{}');
  } catch (e) {}
  emailToName[email.toLowerCase()] = username;
  localStorage.setItem('emailToName', JSON.stringify(emailToName));
  
  hideLoginModal();
  updateProfileUI(username, email);
  
  // Clear draft
  records.length = 0;
  updateTable();
  updateDraftSummary();
  
  // Load database history
  fetchMyHistory();
}

function handleSwitchUser() {
  localStorage.removeItem('userEmail');
  localStorage.removeItem('userName');
  
  if (currentUserDisplay) currentUserDisplay.textContent = '-';
  if (adminDashboardBtn) adminDashboardBtn.style.display = 'none';
  
  records.length = 0;
  updateTable();
  updateDraftSummary();
  
  if (projectNameInput) projectNameInput.value = '';
  if (moduleInput) {
    moduleInput.value = '';
    populateSubmodules('');
  }
  const customContainer = document.getElementById('custom-module-container');
  const customModuleInput = document.getElementById('custom-module-name');
  const customSubmoduleInput = document.getElementById('custom-submodule-name');
  if (customContainer) customContainer.style.display = 'none';
  if (customModuleInput) {
    customModuleInput.value = '';
    customModuleInput.required = false;
  }
  if (customSubmoduleInput) {
    customSubmoduleInput.value = '';
    customSubmoduleInput.required = false;
  }
  if (totalCountInput) totalCountInput.value = '';
  if (passCountInput) passCountInput.value = '';
  if (failCountInput) failCountInput.value = '';
  if (onholdCountInput) onholdCountInput.value = '';
  if (pendingCountInput) pendingCountInput.value = '';
  if (naCountInput) naCountInput.value = '';
  if (functionalTeamCountInput) functionalTeamCountInput.value = '';
  if (commentInput) commentInput.value = '';
  updateCustomerDisplay();
  document.title = 'Module Status Tracker';
  clearAllFieldErrors();
  
  if (historyTableBody) {
    historyTableBody.innerHTML = '<td colspan="11" class="empty-state">No saved entries in the database history.</td>';
  }
  
  showLoginModal();
}

function init() {
  // Initialize module and submodule dropdowns
  populateModules('');
  populateSubmodules('');
  if (moduleInput) {
    moduleInput.addEventListener('change', () => {
      const isOthers = moduleInput.value === 'Others';
      const customContainer = document.getElementById('custom-module-container');
      const customModuleInput = document.getElementById('custom-module-name');
      const customSubmoduleInput = document.getElementById('custom-submodule-name');
      const submoduleLabel = submoduleInput ? submoduleInput.closest('label') : null;
      
      if (isOthers) {
        if (customContainer) customContainer.style.display = 'flex';
        if (customModuleInput) {
          customModuleInput.required = true;
          customModuleInput.value = '';
        }
        if (customSubmoduleInput) {
          customSubmoduleInput.required = true;
          customSubmoduleInput.value = '';
        }
        if (submoduleInput) {
          submoduleInput.required = false;
          submoduleInput.disabled = true;
          submoduleInput.innerHTML = '<option value="" disabled selected>Select Submodule</option>';
        }
        if (submoduleLabel) {
          submoduleLabel.style.display = 'none';
        }
      } else {
        if (customContainer) customContainer.style.display = 'none';
        if (customModuleInput) {
          customModuleInput.required = false;
          customModuleInput.value = '';
        }
        if (customSubmoduleInput) {
          customSubmoduleInput.required = false;
          customSubmoduleInput.value = '';
        }
        if (submoduleInput) {
          submoduleInput.required = true;
          submoduleInput.disabled = false;
        }
        if (submoduleLabel) {
          submoduleLabel.style.display = 'block';
        }
        populateSubmodules(moduleInput.value);
      }
    });
  }

  if (testcaseForm) testcaseForm.addEventListener('submit', parseTestcaseForm);
  if (testcaseTableBody) testcaseTableBody.addEventListener('click', handleDraftTableClick);
  
  const completeBtn = document.getElementById('complete-process');
  if (completeBtn) completeBtn.addEventListener('click', completeProcess);
  
  const historyTable = document.getElementById('history-table');
  const historyTableBodyEl = historyTable ? historyTable.querySelector('tbody') : null;
  if (historyTableBodyEl) historyTableBodyEl.addEventListener('click', handleHistoryTableClick);

  const historyMonthFilter = document.getElementById('history-month-filter');
  if (historyMonthFilter) {
    historyMonthFilter.addEventListener('change', updateHistoryTable);
  }

  if (exportButton) exportButton.addEventListener('click', exportSummary);
  if (exportExcelButton) exportExcelButton.addEventListener('click', downloadExcel);
  if (exportImageButton) exportImageButton.addEventListener('click', downloadStatusImage);

  const downloadEmployeeChartBtn = document.getElementById('download-employee-chart');
  if (downloadEmployeeChartBtn) {
    downloadEmployeeChartBtn.addEventListener('click', () => {
      downloadCanvasAsImage('employee-progress-chart', 'employee-progress-chart.png');
    });
  }

  if (projectNameInput) {
    projectNameInput.addEventListener('input', updateCustomerDisplay);
  }
  updateCustomerDisplay();
  
  [totalCountInput, passCountInput, failCountInput, onholdCountInput, naCountInput, functionalTeamCountInput].forEach(input => {
    if (input) input.addEventListener('input', calculatePending);
  });

  const customModuleInput = document.getElementById('custom-module-name');
  const customSubmoduleInput = document.getElementById('custom-submodule-name');
  if (customModuleInput) {
    customModuleInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^A-Za-z]/g, '');
    });
  }
  if (customSubmoduleInput) {
    customSubmoduleInput.addEventListener('input', function() {
      this.value = this.value.replace(/[^A-Za-z]/g, '');
    });
  }

  // Remove local calculatePending function as it has been moved to the global scope



  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  if (switchUserBtn) switchUserBtn.addEventListener('click', handleSwitchUser);
  if (loginEmailInput) {
    loginEmailInput.addEventListener('input', handleEmailInputForUsername);
    loginEmailInput.addEventListener('change', handleEmailInputForUsername);
    loginEmailInput.addEventListener('focus', handleEmailInputForUsername);
    loginEmailInput.addEventListener('blur', handleEmailInputForUsername);
  }

  checkUserSession();
  updateTable();
  updateDraftSummary();
}

init();

// Auto-populate Total Count from history records when project, module, and submodule are selected
function autoPopulateTotalCount() {
  const projInput = document.getElementById('project-name');
  const modInput = document.getElementById('module-name');
  const subInput = document.getElementById('submodule-name');
  const totInput = document.getElementById('total-count-input');

  if (!projInput || !modInput || !subInput || !totInput) return;

  const proj = projInput.value.trim().toLowerCase();
  const mod = modInput.value;
  const sub = subInput.value;

  if (!proj || !mod || !sub) return;

  // Search historyRecords for matching (project, module, submodule)
  // Take the most recent one
  let bestMatch = null;
  historyRecords.forEach(e => {
    if (
      e.project && e.project.trim().toLowerCase() === proj &&
      e.module === mod &&
      e.submodule === sub
    ) {
      const dateStr = getEntryDateString(e);
      const bestMatchDateStr = getEntryDateString(bestMatch);
      if (!bestMatch || (dateStr && dateStr.localeCompare(bestMatchDateStr) > 0)) {
        bestMatch = e;
      }
    }
  });

  if (bestMatch && bestMatch.total !== undefined && bestMatch.total !== null) {
    totInput.value = bestMatch.total;
    // Trigger input event to update pending calculation
    totInput.dispatchEvent(new Event('input'));
  }
}

// Bind event listeners to auto-populate the total count
document.addEventListener('DOMContentLoaded', () => {
  const projInput = document.getElementById('project-name');
  const modInput = document.getElementById('module-name');
  const subInput = document.getElementById('submodule-name');

  if (projInput) projInput.addEventListener('input', autoPopulateTotalCount);
  if (modInput) modInput.addEventListener('change', autoPopulateTotalCount);
  if (subInput) subInput.addEventListener('change', autoPopulateTotalCount);
});
