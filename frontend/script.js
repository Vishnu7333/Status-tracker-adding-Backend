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
const BASE_URL = 'https://status-tracker-api.onrender.com';
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

if (projectNameInput) validateProjectNameInput(projectNameInput);
if (moduleInput) validateAlphabetsOnly(moduleInput);
if (submoduleInput) validateAlphabetsOnly(submoduleInput);

function readOptionalCount(input) {
  const rawValue = input.value.trim();
  if (rawValue === '') {
    return null;
  }

  const number = Number(rawValue);
  return Number.isFinite(number) && number >= 0 ? number : NaN;
}

function toCount(value) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : 0;
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
  [projectNameInput, moduleInput, submoduleInput, totalCountInput, passCountInput, failCountInput, onholdCountInput, pendingCountInput].forEach((field) => {
    if (field) clearFieldError(field);
  });
}

function getStatus(record) {
  if (record.total > 0 && record.pass === record.total) {
    return 'Pass';
  }

  if (record.pending > 0 && (record.pass > 0 || record.fail > 0)) {
    return 'Inprogress';
  }

  if (record.fail > 0) {
    return 'Fail';
  }

  if (record.onhold > 0) {
    return 'On Hold';
  }

  if (record.pending > 0) {
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
  if (summary.total > 0 && summary.pass === summary.total) {
    return 'Pass';
  }

  if (summary.pending > 0 && (summary.pass > 0 || summary.fail > 0)) {
    return 'Inprogress';
  }

  if (summary.fail > 0) {
    return 'Fail';
  }

  if (summary.onhold > 0) {
    return 'On Hold';
  }

  if (summary.pending > 0) {
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
    <td colspan="10">
      <strong>${moduleName}</strong>
      <span class="module-header-meta">Total: ${moduleSummary.total} | Pass: ${moduleSummary.pass} | Fail: ${moduleSummary.fail} | On Hold: ${moduleSummary.onhold} | Pending: ${moduleSummary.pending} | Status: ${status}</span>
    </td>
  `;
  return tr;
}

function createRow(record, index) {
  const status = getStatus(record);
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${record.module}</td>
    <td>${record.submodule}</td>
    <td>${record.total}</td>
    <td class="status-pass">${record.pass}</td>
    <td class="status-fail">${record.fail}</td>
    <td class="status-onhold">${record.onhold}</td>
    <td class="status-pending">${record.pending}</td>
    <td><span class="status-badge ${getStatusClass(status)}">${status}</span></td>
    <td class="comment-cell">${record.comments || '-'}</td>
    <td>
      <button class="remove-button" data-index="${index}" data-id="${record.id}" aria-label="Remove record">
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      </button>
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
    <td colspan="10">
      <strong>Customer: ${projectName}</strong>
    </td>
  `;
  return tr;
}

function updateTable() {
  if (!testcaseTableBody) return;
  testcaseTableBody.innerHTML = '';

  if (!records.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="10" class="empty-state">Add a module and submodule total to begin tracking progress.</td>';
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
          return summary;
        },
        { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0 }
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
      return summary;
    },
    {
      totalSubmodules: 0,
      total: 0,
      pass: 0,
      fail: 0,
      onhold: 0,
      pending: 0,
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

  const total = totalCountInput ? readOptionalCount(totalCountInput) : null;
  const pass = passCountInput ? readOptionalCount(passCountInput) : null;
  const fail = failCountInput ? readOptionalCount(failCountInput) : null;
  const onhold = onholdCountInput ? readOptionalCount(onholdCountInput) : null;
  const pending = pendingCountInput ? readOptionalCount(pendingCountInput) : null;

  const values = { total, pass, fail, onhold, pending };
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
    return;
  }

  const countFields = ['pass', 'fail', 'onhold', 'pending'];
  const blankCountFields = countFields.filter((fieldName) => values[fieldName] === null);
  const countTotal = countFields.reduce((sum, fieldName) => sum + (values[fieldName] ?? 0), 0);

  if (values.total === null) {
    values.total = countTotal;
  } else if (blankCountFields.length === 1) {
    const missingField = blankCountFields[0];
    const missingValue = values.total - countTotal;
    if (missingValue < 0) {
      if (totalCountInput) {
        setFieldError(totalCountInput, 'Counts exceed Total.');
        scrollToField(totalCountInput);
      }
      return;
    }

    values[missingField] = missingValue;
  } else if (countTotal > values.total) {
    if (totalCountInput) {
      setFieldError(totalCountInput, 'Counts exceed Total.');
      scrollToField(totalCountInput);
    }
    return;
  } else if (countTotal < values.total) {
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

  const record = {
    project: projectName,
    module: moduleInput ? moduleInput.value.trim() : '',
    submodule: submoduleInput ? submoduleInput.value.trim() : '',
    total: values.total,
    pass: values.pass,
    fail: values.fail,
    onhold: values.onhold,
    pending: values.pending,
    comments: commentInput ? commentInput.value.trim() : '',
  };

  if (!record.module || !record.submodule || Number.isNaN(record.total)) {
    return;
  }

  // Add locally to draft workspace instead of hitting backend immediately
  records.push(record);
  updateTable();
  updateDraftSummary();

  // Clear submodule specific inputs
  if (moduleInput) moduleInput.value = '';
  if (submoduleInput) submoduleInput.value = '';
  if (totalCountInput) totalCountInput.value = '';
  if (passCountInput) passCountInput.value = '';
  if (failCountInput) failCountInput.value = '';
  if (onholdCountInput) onholdCountInput.value = '';
  if (pendingCountInput) pendingCountInput.value = '';
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
    ['On Hold', summary.onhold],
    ['Pending', summary.pending],
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
  const thead = document.createElement('thead');
  thead.innerHTML = `
    <tr>
      <th>Module</th>
      <th>Submodule</th>
      <th>Total</th>
      <th>Pass</th>
      <th>Fail</th>
      <th>On Hold</th>
      <th>Pending</th>
      <th>Status</th>
      <th>Comments</th>
    </tr>
  `;

  const tbody = document.createElement('tbody');
  if (!records.length) {
    const row = document.createElement('tr');
    const cell = document.createElement('td');
    cell.colSpan = 9;
    cell.className = 'empty-state';
    cell.textContent = 'No status records available.';
    row.appendChild(cell);
    tbody.appendChild(row);
  } else {
    Object.entries(groupByProjectAndModule(records)).forEach(([projectName, modules]) => {
      const projectRow = document.createElement('tr');
      projectRow.innerHTML = `<td colspan="9" style="background: #e2efda; color: #375623; font-weight: 800; padding: 0.7rem;">Customer: ${projectName}</td>`;
      tbody.appendChild(projectRow);

      Object.entries(modules).forEach(([moduleName, moduleRecords]) => {
        const moduleSummary = moduleRecords.reduce(
          (accumulator, record) => {
            accumulator.total += record.total;
            accumulator.pass += record.pass;
            accumulator.fail += record.fail;
            accumulator.onhold += record.onhold;
            accumulator.pending += record.pending;
            return accumulator;
          },
          { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0 },
        );

        const moduleRow = document.createElement('tr');
        moduleRow.className = 'image-report-module-row';
        const moduleCell = document.createElement('td');
        moduleCell.colSpan = 9;
        moduleCell.textContent = `${moduleName} - Total: ${moduleSummary.total} | Pass: ${moduleSummary.pass} | Fail: ${moduleSummary.fail} | On Hold: ${moduleSummary.onhold} | Pending: ${moduleSummary.pending} | Status: ${getModuleStatus(moduleSummary)}`;
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
  }

  table.append(thead, tbody);
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

function buildCellStyle(thinBorder, rowIndex, columnIndex, grandTotalRowIndex, projectHeaderRows) {
  const isHeaderRow = rowIndex === 2;
  const isTitleRow = rowIndex === 0;
  const isGrandTotalRow = rowIndex === grandTotalRowIndex;
  const isProjectHeaderRow = projectHeaderRows && projectHeaderRows.has(rowIndex);
  const isCommentsColumn = columnIndex === 8;

  const style = {
    alignment: {
      horizontal: 'center',
      vertical: 'center',
      wrapText: isCommentsColumn,
    },
    border: thinBorder,
  };

  if (isGrandTotalRow) {
    style.alignment.horizontal = 'center';
    style.fill = { fgColor: { rgb: 'FFF2CC' } };
  }

  if (isHeaderRow) {
    style.fill = { fgColor: { rgb: 'D9EAF7' } };
    style.font = { bold: true, color: { rgb: '17365D' }, sz: 12 };
  }

  if (isProjectHeaderRow) {
    style.fill = { fgColor: { rgb: 'E2EFDA' } };
    style.font = { bold: true, color: { rgb: '375623' }, sz: 13 };
    style.alignment.horizontal = 'left';
  }

  if (isTitleRow || isHeaderRow || (columnIndex === 0 && rowIndex > 2)) {
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

    const summaryRows = [['Module Status Tracker'], [], ['Module', 'Submodule', 'Total', 'Pass', 'Fail', 'On Hold', 'Pending', 'Status', 'Comments']];
    const summaryMerges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];
    const projectHeaderRows = new Set();

    Object.entries(groupedByProject).forEach(([projName, projRecords]) => {
      // Add project header row
      const projectRowIndex = summaryRows.length;
      summaryRows.push([`Project: ${projName}`, '', '', '', '', '', '', '', '']);
      summaryMerges.push({ s: { r: projectRowIndex, c: 0 }, e: { r: projectRowIndex, c: 8 } });
      projectHeaderRows.add(projectRowIndex);

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
          summaryRows.push([moduleName, record.submodule, record.total, record.pass, record.fail, record.onhold, record.pending, getStatus(record), record.comments || '-']);
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
      { wch: 14 },
      { wch: 28 },
    ];
    summarySheet['!rows'] = [{ hpt: 30 }, { hpt: 8 }, { hpt: 23 }];

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

        summarySheet[cellRef].s = buildCellStyle(thinBorder, rowIndex, columnIndex, grandTotalRowIndex, projectHeaderRows);
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
      for (let c = 0; c < 9; c++) {
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
    Array.from({ length: 9 }, (_, columnIndex) => columnIndex).forEach((columnIndex) => {
      const cellRef = XLSX.utils.encode_cell({ r: grandTotalRowIndex, c: columnIndex });
      if (!summarySheet[cellRef]) {
        summarySheet[cellRef] = { t: 's', v: '' };
      }

      if (summarySheet[cellRef]) {
        summarySheet[cellRef].s = {
          alignment: { horizontal: 'center', vertical: 'center' },
          border: thinBorder,
          fill: { fgColor: { rgb: 'FFF2CC' } },
          font: { bold: true, sz: 13, color: { rgb: '7F6000' } },
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

function removeDraftRecord(event) {
  const button = event.target.closest('.remove-button');
  if (!button) {
    return;
  }

  const index = parseInt(button.dataset.index, 10);
  if (!isNaN(index) && index >= 0 && index < records.length) {
    records.splice(index, 1);
    updateTable();
    updateDraftSummary();
  }
}

function createHistoryRow(record) {
  const status = getStatus(record);
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td><strong>${record.project || '-'}</strong></td>
    <td>${record.module}</td>
    <td>${record.submodule}</td>
    <td>${record.total}</td>
    <td class="status-pass">${record.pass}</td>
    <td class="status-fail">${record.fail}</td>
    <td class="status-onhold">${record.onhold}</td>
    <td class="status-pending">${record.pending}</td>
    <td><span class="status-badge ${getStatusClass(status)}">${status}</span></td>
    <td class="comment-cell">${record.comments || '-'}</td>
    <td>
      <button class="remove-history-button" data-id="${record.id}" aria-label="Remove record from database">
        <svg viewBox="0 0 24 24" aria-hidden="true" style="width: 1.15rem; height: 1.15rem; fill: none; stroke: currentColor; stroke-width: 1.9; stroke-linecap: round; stroke-linejoin: round; pointer-events: none;">
          <path d="M3 6h18" />
          <path d="M8 6V4h8v2" />
          <path d="M19 6l-1 14H6L5 6" />
          <path d="M10 11v5" />
          <path d="M14 11v5" />
        </svg>
      </button>
    </td>
  `;
  return tr;
}

function updateHistoryTable() {
  if (!historyTableBody) return;
  historyTableBody.innerHTML = '';

  if (!historyRecords.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="11" class="empty-state">No saved entries in the database history.</td>';
    historyTableBody.appendChild(emptyRow);
    return;
  }

  const grouped = groupByProjectAndModule(historyRecords);
  Object.entries(grouped).forEach(([projectName, modules]) => {
    const projectHeader = document.createElement('tr');
    projectHeader.className = 'project-header-row-ui';
    projectHeader.innerHTML = `<td colspan="11"><strong>Customer: ${projectName}</strong></td>`;
    historyTableBody.appendChild(projectHeader);

    Object.entries(modules).forEach(([moduleName, moduleRecords]) => {
      const moduleSummary = moduleRecords.reduce(
        (summary, record) => {
          summary.total += record.total;
          summary.pass += record.pass;
          summary.fail += record.fail;
          summary.onhold += record.onhold;
          summary.pending += record.pending;
          return summary;
        },
        { total: 0, pass: 0, fail: 0, onhold: 0, pending: 0 }
      );

      const moduleHeader = document.createElement('tr');
      moduleHeader.className = 'module-header-row';
      const status = getModuleStatus(moduleSummary);
      moduleHeader.innerHTML = `
        <td colspan="11">
          <strong>${moduleName}</strong>
          <span class="module-header-meta">Total: ${moduleSummary.total} | Pass: ${moduleSummary.pass} | Fail: ${moduleSummary.fail} | On Hold: ${moduleSummary.onhold} | Pending: ${moduleSummary.pending} | Status: ${status}</span>
        </td>
      `;
      historyTableBody.appendChild(moduleHeader);

      moduleRecords.forEach((record) => {
        historyTableBody.appendChild(createHistoryRow(record));
      });
    });
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

async function fetchMyHistory() {
  try {
    const response = await fetch(`${BASE_URL}/api/entries/mine`, {
      method: 'GET',
      headers: API_HEADERS
    });
    const result = await response.json();
    if (result && result.success && result.data) {
      historyRecords.length = 0;
      historyRecords.push(...result.data);
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

  try {
    const savePromises = records.map(async (record) => {
      const response = await fetch(`${BASE_URL}/api/entries`, {
        method: 'POST',
        headers: API_HEADERS,
        body: JSON.stringify(record)
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
        if (projectDisplay) projectDisplay.textContent = 'Untitled Customer';
      }
      document.title = 'Module Status Tracker';

      await fetchMyHistory();

      if (formMessage) {
        formMessage.textContent = 'Process completed! All entries saved successfully.';
        formMessage.classList.remove('error');
        formMessage.style.color = '#6df5a4';
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
    fetchMyHistory();
  }
}

function showLoginModal() {
  if (loginModal) {
    loginModal.style.display = 'flex';
  }
}

function hideLoginModal() {
  if (loginModal) {
    loginModal.style.display = 'none';
  }
}

function updateProfileUI(name, email) {
  if (currentUserDisplay) {
    currentUserDisplay.textContent = name;
  }
  
  // Update Admin button visibility based on admin email check
  const emailLower = email.toLowerCase();
  const isAdmin = emailLower === 'vvnair7333@gmail.com';
  if (adminDashboardBtn) {
    adminDashboardBtn.style.display = isAdmin ? 'inline-flex' : 'none';
  }
}

function handleLoginSubmit(event) {
  event.preventDefault();
  const email = loginEmailInput ? loginEmailInput.value.trim() : '';
  if (!email) return;
  
  const name = extractNameFromEmail(email);
  localStorage.setItem('userEmail', email);
  localStorage.setItem('userName', name);
  
  hideLoginModal();
  updateProfileUI(name, email);
  
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
  
  if (historyTableBody) {
    historyTableBody.innerHTML = '<td colspan="11" class="empty-state">No saved entries in the database history.</td>';
  }
  
  showLoginModal();
}

function init() {
  if (testcaseForm) testcaseForm.addEventListener('submit', parseTestcaseForm);
  if (testcaseTableBody) testcaseTableBody.addEventListener('click', removeDraftRecord);
  
  const completeBtn = document.getElementById('complete-process');
  if (completeBtn) completeBtn.addEventListener('click', completeProcess);
  
  const historyTable = document.getElementById('history-table');
  const historyTableBodyEl = historyTable ? historyTable.querySelector('tbody') : null;
  if (historyTableBodyEl) historyTableBodyEl.addEventListener('click', removeHistoryRecord);

  if (exportButton) exportButton.addEventListener('click', exportSummary);
  if (exportExcelButton) exportExcelButton.addEventListener('click', downloadExcel);
  if (exportImageButton) exportImageButton.addEventListener('click', downloadStatusImage);

  if (projectNameInput) {
    projectNameInput.addEventListener('input', () => {
      const projectName = projectNameInput.value.trim();
      if (projectDisplay) {
        projectDisplay.textContent = projectName || 'Untitled Customer';
      }
      document.title = projectName ? `${projectName} - Module Status Tracker` : 'Module Status Tracker';
    });
    if (projectDisplay) {
      projectDisplay.textContent = projectNameInput.value.trim() || 'Untitled Customer';
    }
  }
  
  if (loginForm) loginForm.addEventListener('submit', handleLoginSubmit);
  if (switchUserBtn) switchUserBtn.addEventListener('click', handleSwitchUser);
  
  checkUserSession();
  updateTable();
  updateDraftSummary();
}

init();
