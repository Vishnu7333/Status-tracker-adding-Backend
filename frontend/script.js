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

// Add real-time validation for alphabets only in Project Name, Module, and Submodule
function validateAlphabetsOnly(input) {
  input.addEventListener('input', (e) => {
    const value = e.target.value;
    const filtered = value.replace(/[^A-Za-z ]/g, '');
    if (value !== filtered) {
      e.target.value = filtered;
    }
  });
}

validateAlphabetsOnly(projectNameInput);
validateAlphabetsOnly(moduleInput);
validateAlphabetsOnly(submoduleInput);

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
  formMessage.textContent = message;
  formMessage.classList.add('error');
}

function clearFormError() {
  formMessage.textContent = '';
  formMessage.classList.remove('error');
}

function setFieldError(field, message) {
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
  const errorSpan = document.getElementById(`${field.id}-error`);
  if (errorSpan) {
    errorSpan.textContent = '';
    field.classList.remove('field-error-active');
  }
}

function clearAllFieldErrors() {
  [projectNameInput, moduleInput, submoduleInput, totalCountInput, passCountInput, failCountInput, onholdCountInput, pendingCountInput].forEach((field) => clearFieldError(field));
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
      <button class="remove-button" data-index="${index}" aria-label="Remove record">
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

function updateTable() {
  testcaseTableBody.innerHTML = '';

  if (!records.length) {
    const emptyRow = document.createElement('tr');
    emptyRow.innerHTML = '<td colspan="10" class="empty-state">Add a module and submodule total to begin tracking progress.</td>';
    testcaseTableBody.appendChild(emptyRow);
    return;
  }

  const groupedRecords = groupByModule();
  Object.entries(groupedRecords).forEach(([moduleName, moduleRecords]) => {
    const moduleSummary = moduleRecords.reduce(
      (summary, record) => {
        summary.total += record.total;
        summary.pass += record.pass;
        summary.fail += record.fail;
        summary.onhold += record.onhold;
        summary.pending += record.pending;
        return summary;
      },
      {
        total: 0,
        pass: 0,
        fail: 0,
        onhold: 0,
        pending: 0,
      },
    );

    testcaseTableBody.appendChild(createModuleHeaderRow(moduleName, moduleSummary));
    moduleRecords.forEach((record) => {
      const index = records.indexOf(record);
      testcaseTableBody.appendChild(createRow(record, index));
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
  totalCountEl.textContent = summary.totalSubmodules;
  submoduleTotalCountEl.textContent = summary.total;
  passCountEl.textContent = summary.pass;
  failCountEl.textContent = summary.fail;
  onholdCountEl.textContent = summary.onhold;
  pendingCountEl.textContent = summary.pending;
}

function parseTestcaseForm(event) {
  event.preventDefault();

  clearAllFieldErrors();
  const projectName = projectNameInput.value.trim();
  if (!projectName) {
    setFieldError(projectNameInput, 'Project Name is required.');
    scrollToField(projectNameInput);
    return;
  }

  const total = readOptionalCount(totalCountInput);
  const pass = readOptionalCount(passCountInput);
  const fail = readOptionalCount(failCountInput);
  const onhold = readOptionalCount(onholdCountInput);
  const pending = readOptionalCount(pendingCountInput);

  const values = { total, pass, fail, onhold, pending };
  if (Object.values(values).some((value) => Number.isNaN(value))) {
    let scrolled = false;
    if (isNaN(total)) {
      setFieldError(totalCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(totalCountInput);
        scrolled = true;
      }
    }
    if (isNaN(pass)) {
      setFieldError(passCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(passCountInput);
        scrolled = true;
      }
    }
    if (isNaN(fail)) {
      setFieldError(failCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(failCountInput);
        scrolled = true;
      }
    }
    if (isNaN(onhold)) {
      setFieldError(onholdCountInput, 'Enter a valid non-negative number.');
      if (!scrolled) {
        scrollToField(onholdCountInput);
        scrolled = true;
      }
    }
    if (isNaN(pending)) {
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
      setFieldError(totalCountInput, 'Counts exceed Total.');
      scrollToField(totalCountInput);
      return;
    }

    values[missingField] = missingValue;
  } else if (countTotal > values.total) {
    setFieldError(totalCountInput, 'Counts exceed Total.');
    scrollToField(totalCountInput);
    return;
  } else if (countTotal < values.total) {
    setFieldError(totalCountInput, 'Counts must equal Total.');
    scrollToField(totalCountInput);
    return;
  }

  if (values.total < countTotal) {
    setFieldError(totalCountInput, 'Counts exceed Total.');
    scrollToField(totalCountInput);
    return;
  }

  countFields.forEach((fieldName) => {
    values[fieldName] = toCount(values[fieldName]);
  });

  clearFormError();

  const record = {
    project: projectName,
    module: moduleInput.value.trim(),
    submodule: submoduleInput.value.trim(),
    total: values.total,
    pass: values.pass,
    fail: values.fail,
    onhold: values.onhold,
    pending: values.pending,
    comments: commentInput.value.trim(),
  };

  if (!record.module || !record.submodule || Number.isNaN(record.total)) {
    return;
  }

  const existingIndex = findRecordIndex(record.module, record.submodule);
  if (existingIndex >= 0) {
    const existingRecord = records[existingIndex];
    records[existingIndex] = {
      ...existingRecord,
      project: projectName,
      total: existingRecord.total + record.total,
      pass: existingRecord.pass + record.pass,
      fail: existingRecord.fail + record.fail,
      onhold: existingRecord.onhold + record.onhold,
      pending: existingRecord.pending + record.pending,
      comments: [existingRecord.comments, record.comments].filter(Boolean).join(' | '),
    };
  } else {
    records.push(record);
  }
  clearFormError();
  moduleInput.value = '';
  submoduleInput.value = '';
  totalCountInput.value = '';
  passCountInput.value = '';
  failCountInput.value = '';
  onholdCountInput.value = '';
  pendingCountInput.value = '';
  commentInput.value = '';

  refreshDashboard();
}

function refreshDashboard() {
  updateTable();
  updateSummaryUI(summarize());
}

function exportSummary() {
  const projectName = projectNameInput.value.trim();
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
  const projectName = projectNameInput.value.trim() || 'Untitled Project';
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
    Object.entries(groupByModule()).forEach(([moduleName, moduleRecords]) => {
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

  const projectName = projectNameInput.value.trim() || 'module-status-tracker';
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
  const projectName = projectNameInput.value.trim();
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

function buildCellStyle(thinBorder, rowIndex, columnIndex, grandTotalRowIndex) {
  const isHeaderRow = rowIndex === 2;
  const isProjectRow = rowIndex === 0;
  const isGrandTotalRow = rowIndex === grandTotalRowIndex;
  const isNumericColumn = columnIndex >= 2 && columnIndex <= 6;
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

  if (isProjectRow || isHeaderRow || (columnIndex === 0 && rowIndex > 2)) {
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

    const projectName = projectNameInput.value.trim();
    if (!projectName) {
      setFormError('Project Name is required.');
      return;
    }

    const groupedRecords = groupByModule();
    const summaryRows = [[`Project: ${projectName}`], [], ['Module', 'Submodule', 'Total', 'Pass', 'Fail', 'On Hold', 'Pending', 'Status', 'Comments']];
    const summaryMerges = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }];

    Object.entries(groupedRecords).forEach(([moduleName, moduleRecords]) => {
      const moduleStartRow = summaryRows.length;
      moduleRecords.forEach((record) => {
        summaryRows.push([moduleName, record.submodule, record.total, record.pass, record.fail, record.onhold, record.pending, getStatus(record), record.comments || '-']);
      });

      if (moduleRecords.length > 1) {
        summaryMerges.push({ s: { r: moduleStartRow, c: 0 }, e: { r: summaryRows.length - 1, c: 0 } });
      }
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

        summarySheet[cellRef].s = buildCellStyle(thinBorder, rowIndex, columnIndex, grandTotalRowIndex);
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

    summaryMerges.slice(1).forEach((merge) => {
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

    formMessage.textContent = '';
    formMessage.classList.remove('error');
    XLSX.writeFile(workbook, 'module-status-tracker.xlsx');
  } catch (error) {
    setFormError('Excel download is unavailable right now. Please try again.');
  }
}

function removeRecord(event) {
  if (!event.target.matches('.remove-button')) {
    return;
  }

  const index = Number(event.target.dataset.index);
  if (!Number.isNaN(index)) {
    records.splice(index, 1);
    refreshDashboard();
  }
}

function init() {
  testcaseForm.addEventListener('submit', parseTestcaseForm);
  testcaseTableBody.addEventListener('click', removeRecord);
  exportButton.addEventListener('click', exportSummary);
  exportExcelButton.addEventListener('click', downloadExcel);
  exportImageButton.addEventListener('click', downloadStatusImage);
  projectNameInput.addEventListener('input', () => {
    const projectName = projectNameInput.value.trim();
    projectDisplay.textContent = projectName || 'Untitled Project';
    document.title = projectName ? `${projectName} - Module Status Tracker` : 'Module Status Tracker';
  });
  projectDisplay.textContent = projectNameInput.value.trim() || 'Untitled Project';
  refreshDashboard();
}

init();
