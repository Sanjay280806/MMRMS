import { useEffect, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { api, getToken } from '../../api/client.js';
import { Badge } from '../../components/ui/Badge.jsx';
import { Button } from '../../components/ui/Button.jsx';
import { DataTable } from '../../components/ui/DataTable.jsx';
import { EmptyState } from '../../components/ui/EmptyState.jsx';
import { SectionCard, SectionTable } from '../../components/ui/SectionCard.jsx';
import { StatTile } from '../../components/ui/StatTile.jsx';

export function ExcelUploadSection({ onUploadSuccess, onNavigate }) {
  const [activeTab, setActiveTab] = useState('upload'); // 'upload' | 'history' | 'guide'
  const [uploadMode, setUploadMode] = useState('master'); // 'master' | 'attendance'
  const [selectedFile, setSelectedFile] = useState(null);
  const [sheetNames, setSheetNames] = useState([]);
  const [selectedSheet, setSelectedSheet] = useState('');
  const [parsedRows, setParsedRows] = useState([]);
  const [detectedColumns, setDetectedColumns] = useState([]);
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState(null);

  // Server dry-run validation state
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState(null);

  // Commit state
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState(null);
  const [commitError, setCommitError] = useState(null);

  // History state
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Drag over state
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Fetch history on mount and when tab becomes active
  useEffect(() => {
    loadHistory();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      loadHistory();
    }
  }, [activeTab]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await api('/coordinator/me/upload/history');
      const list = Array.isArray(res) ? res : (Array.isArray(res?.data) ? res.data : []);
      setHistory(list);
    } catch (err) {
      console.error('Failed to load upload history:', err);
    } finally {
      setHistoryLoading(false);
    }
  }

  function handleFileDrop(e) {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }

  function handleFileSelect(e) {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  }

  function processFile(file) {
    const ext = file.name.split('.').pop().toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext)) {
      setParseError('Unsupported file type. Please upload a .xlsx, .xls, or .csv spreadsheet.');
      return;
    }

    // Auto-detect mode based on file name
    const lowerName = file.name.toLowerCase();
    if (lowerName.includes('faculty') || lowerName.includes('professor') || lowerName.includes('staff')) {
      setUploadMode('faculty');
    } else if (lowerName.includes('attendance') || lowerName.includes('shortage')) {
      setUploadMode('attendance');
    } else if (lowerName.includes('enroll') || lowerName.includes('student') || lowerName.includes('roster')) {
      setUploadMode('master');
    }

    setSelectedFile(file);
    setParseError(null);
    setValidationResult(null);
    setCommitResult(null);
    setCommitError(null);
    setParsing(true);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array', cellDates: true });
        setSheetNames(workbook.SheetNames);
        const targetSheet = workbook.SheetNames[0];
        setSelectedSheet(targetSheet);
        parseWorksheet(workbook, targetSheet);
      } catch (err) {
        setParseError(`Could not read Excel file: ${err.message}`);
        setParsing(false);
      }
    };
    reader.onerror = () => {
      setParseError('Failed to read file from disk.');
      setParsing(false);
    };
    reader.readAsArrayBuffer(file);
  }

  const KNOWN_HEADER_TOKENS = [
    'roll', 'reg', 'regn', 'student', 'name', 'course', 'sem', 'credit',
    'hour', 'attend', 'absent', 'leave', 'duty', 'mark', 'gpa', 'cgpa',
    'staff', 'mentor', 'dept', 'program', 's_no', 'sno', 'employee',
    'professor', 'faculty', 'designation', 'mail', 'mailid'
  ];

  function findHeaderRowIndex(rawRows) {
    if (!Array.isArray(rawRows) || rawRows.length === 0) return 0;
    let bestIdx = 0;
    let bestScore = 0;
    const maxScan = Math.min(rawRows.length, 35);
    for (let i = 0; i < maxScan; i++) {
      const row = rawRows[i];
      if (!Array.isArray(row)) continue;
      let score = 0;
      for (const cell of row) {
        const cleaned = String(cell || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '_');
        if (!cleaned) continue;
        if (KNOWN_HEADER_TOKENS.some((t) => cleaned.includes(t))) {
          score++;
        }
      }
      if (score > bestScore) {
        bestScore = score;
        bestIdx = i;
      }
    }
    return bestScore >= 2 ? bestIdx : 0;
  }

  function parseWorksheet(workbook, sheetName) {
    const worksheet = workbook.Sheets[sheetName];
    if (!worksheet) {
      setParseError(`Sheet "${sheetName}" not found.`);
      setParsing(false);
      return;
    }

    const rawJson = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' });
    if (rawJson.length < 2) {
      setParseError('The selected sheet has no data rows.');
      setParsedRows([]);
      setDetectedColumns([]);
      setParsing(false);
      return;
    }

    // Automatically detect header row index (skips institutional banners / top title rows)
    const headerIdx = findHeaderRowIndex(rawJson);
    const headers = rawJson[headerIdx].map((h) => String(h || '').trim()).filter(Boolean);
    setDetectedColumns(headers);

    const rows = [];
    for (let i = headerIdx + 1; i < rawJson.length; i++) {
      const rawRow = rawJson[i];
      if (!rawRow || rawRow.every((val) => val === '' || val === null || val === undefined)) {
        continue;
      }
      const rowObj = { _rowIndex: i + 1 };
      headers.forEach((h, colIndex) => {
        rowObj[h] = rawRow[colIndex] !== undefined ? rawRow[colIndex] : '';
      });
      rows.push(rowObj);
    }

    setParsedRows(rows);
    setParsing(false);
  }

  async function handleValidateDryRun() {
    if (!selectedFile) return;
    setValidating(true);
    setCommitError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', uploadMode);

      const token = getToken();
      const res = await fetch('/api/coordinator/me/upload/validate', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || json.message || 'Validation failed');
      }

      setValidationResult(json.data || json);
    } catch (err) {
      setCommitError(err.message);
    } finally {
      setValidating(false);
    }
  }

  async function handleCommitUpload() {
    if (!selectedFile) return;
    setCommitting(true);
    setCommitError(null);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('mode', uploadMode);

      const token = getToken();
      const res = await fetch('/api/coordinator/me/upload/commit', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });

      const json = await res.json();
      if (!res.ok || json.success === false) {
        throw new Error(json.error?.message || json.message || 'Import failed');
      }

      const result = json.data || json;
      setCommitResult(result);

      if (onUploadSuccess) {
        onUploadSuccess();
      }
    } catch (err) {
      setCommitError(err.message);
    } finally {
      setCommitting(false);
    }
  }

  async function downloadTemplate(type) {
    try {
      const token = getToken();
      const filename = type === 'faculty'
        ? 'Faculty_Directory_Template.xlsx'
        : (type === 'attendance' ? 'Attendance_Academic_Template.xlsx' : 'Student_Master_Template.xlsx');
      const res = await fetch(`/api/coordinator/me/upload/template?type=${type}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Download failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Template download error:', err);
    }
  }

  async function downloadExport() {
    try {
      const token = getToken();
      const res = await fetch('/api/coordinator/me/export/excel', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error('Export failed');
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'MMRMS_2024_BCS_Students_Export.xlsx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    }
  }

  function resetForm() {
    setSelectedFile(null);
    setParsedRows([]);
    setDetectedColumns([]);
    setValidationResult(null);
    setCommitResult(null);
    setCommitError(null);
    setParseError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  return (
    <div className="space-y-6">
      {/* Top Banner & Quick Actions */}
      <div className="rounded-2xl border border-line bg-gradient-to-r from-brand-50/70 via-white to-purple-50/50 p-6 shadow-card">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-lg bg-brand-500 text-white shadow-sm">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </span>
              <h2 className="font-display text-[18px] font-semibold text-ink">Institutional Excel & ERP Batch Uploader</h2>
              <Badge tone="indigo">Year Coordinator</Badge>
            </div>
            <p className="mt-1 text-[13px] text-muted">
              Import student master rosters, attendance data, or academic marks from MyCamu ERP (.xlsx, .xls, .csv).
              Automatic column mapping, dry-run validation, and live updates to the year dashboard.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadTemplate('master')}
              title="Download empty template matching KCT MMRMS master schema"
            >
              📥 Student Master Template
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadTemplate('attendance')}
              title="Download template for bulk attendance and marks update"
            >
              📥 Attendance Template
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => downloadTemplate('faculty')}
              title="Download template for onboarding faculty and mentors"
            >
              📥 Faculty Directory Template
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={downloadExport}
              title="Export current active students dataset as Excel file"
            >
              📊 Export Current Dataset
            </Button>
          </div>
        </div>

        {/* Tab switcher */}
        <div className="mt-6 flex border-b border-line">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'upload'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <span>Upload & Import</span>
            {parsedRows.length > 0 && (
              <span className="rounded-full bg-brand-100 px-2 py-0.5 text-[11px] text-brand-700">
                {parsedRows.length} rows
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'history'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <span>Upload History & Audit Log</span>
          </button>
          <button
            onClick={() => setActiveTab('guide')}
            className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-[13px] font-semibold transition-colors ${
              activeTab === 'guide'
                ? 'border-brand-500 text-brand-600'
                : 'border-transparent text-muted hover:text-ink'
            }`}
          >
            <span>Column Schema & Guide</span>
          </button>
        </div>
      </div>

      {/* TAB 1: UPLOAD & IMPORT */}
      {activeTab === 'upload' && (
        <div className="space-y-6">
          {/* Mode Selector */}
          <div className="flex flex-wrap items-center gap-3">
            <span className="text-[12.5px] font-semibold text-muted">Upload Purpose:</span>
            <button
              type="button"
              onClick={() => setUploadMode('master')}
              className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${
                uploadMode === 'master'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-muted border border-line hover:text-ink'
              }`}
            >
              🎓 Student Master Roster (Student Enrollment)
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('attendance')}
              className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${
                uploadMode === 'attendance'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-muted border border-line hover:text-ink'
              }`}
            >
              📅 Attendance & Arrears Update (Attendance Dump)
            </button>
            <button
              type="button"
              onClick={() => setUploadMode('faculty')}
              className={`rounded-lg px-3.5 py-1.5 text-[12.5px] font-semibold transition-all ${
                uploadMode === 'faculty'
                  ? 'bg-brand-500 text-white shadow-sm'
                  : 'bg-white text-muted border border-line hover:text-ink'
              }`}
            >
              👨‍🏫 Faculty & Mentor Directory (FACULTY DETAILS)
            </button>
          </div>

          {/* Success Banner */}
          {commitResult && (
            <div className="rounded-xl border border-good-300 bg-good-50/80 p-5 shadow-sm animate-fadeRise">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-good-500 text-white font-semibold text-lg">
                    ✓
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-good-900">
                      {commitResult.mode === 'faculty'
                        ? 'Faculty & Mentor Directory Imported Successfully!'
                        : 'Excel Import Completed Successfully!'}
                    </h3>
                    <p className="text-[13px] text-good-700 mt-0.5">
                      {commitResult.message}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2 text-[12px]">
                      <span className="rounded bg-white px-2.5 py-1 font-semibold text-good-800 border border-good-200">
                        {commitResult.importedCount} {commitResult.mode === 'faculty' ? 'New Faculty Onboarded' : 'New Student(s) Enrolled'}
                      </span>
                      <span className="rounded bg-white px-2.5 py-1 font-semibold text-good-800 border border-good-200">
                        {commitResult.updatedCount} {commitResult.mode === 'faculty' ? 'Existing Faculty Updated' : 'Existing Student(s) Updated'}
                      </span>
                      <span className="rounded bg-white px-2.5 py-1 font-semibold text-good-800 border border-good-200">
                        Total {commitResult.totalCommitted} Records Committed
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  {commitResult.mode === 'faculty' ? (
                    <Button size="sm" onClick={() => onNavigate?.('mentors')}>
                      View Mentor Tracker →
                    </Button>
                  ) : (
                    <Button size="sm" onClick={() => onNavigate?.('students')}>
                      View Student Directory →
                    </Button>
                  )}
                  <Button size="sm" variant="secondary" onClick={resetForm}>
                    Upload Another File
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Drag & Drop File Zone */}
          {!selectedFile && (
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleFileDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`group flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed p-10 text-center transition-all ${
                isDragging
                  ? 'border-brand-500 bg-brand-50/50 scale-[1.01]'
                  : 'border-line-strong bg-white hover:border-brand-400 hover:bg-brand-50/20 shadow-inner'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                onChange={handleFileSelect}
                className="hidden"
              />

              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600 shadow-sm transition-transform group-hover:scale-110">
                <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
              </div>

              <h3 className="mt-4 text-[15.5px] font-semibold text-ink">
                Drag and drop your Excel or CSV file here
              </h3>
              <p className="mt-1 text-[13px] text-muted">
                or <span className="font-semibold text-brand-600 underline">browse files</span> from your computer
              </p>
              <div className="mt-3 flex items-center gap-2 text-[11.5px] text-muted-soft">
                <span>Supports Microsoft Excel (.xlsx, .xls)</span>
                <span>•</span>
                <span>Comma-Separated Values (.csv)</span>
                <span>•</span>
                <span>Up to 10 MB</span>
              </div>
            </div>
          )}

          {/* Selected File Card */}
          {selectedFile && (
            <div className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-good-100 text-good-700 font-semibold">
                    XLS
                  </div>
                  <div>
                    <h4 className="text-[14px] font-semibold text-ink">{selectedFile.name}</h4>
                    <p className="text-[12px] text-muted">
                      {(selectedFile.size / 1024).toFixed(1)} KB · {parsedRows.length} data rows detected
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {sheetNames.length > 1 && (
                    <div className="flex items-center gap-1.5 text-[12.5px]">
                      <span className="text-muted">Sheet:</span>
                      <select
                        value={selectedSheet}
                        onChange={(e) => {
                          setSelectedSheet(e.target.value);
                          // Re-read with selected sheet
                          processFile(selectedFile);
                        }}
                        className="rounded-lg border border-line bg-white px-2.5 py-1 text-[12.5px] font-medium"
                      >
                        {sheetNames.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <Button size="sm" variant="secondary" onClick={resetForm}>
                    Change File
                  </Button>
                </div>
              </div>
            </div>
          )}

          {parseError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-[13px] text-bad-ink">
              ⚠️ {parseError}
            </div>
          )}

          {commitError && (
            <div className="rounded-xl border border-rose-300 bg-rose-50 p-4 text-[13px] text-bad-ink">
              ❌ {commitError}
            </div>
          )}

          {/* Live Preview & Verification Summary */}
          {parsedRows.length > 0 && !commitResult && (
            <div className="space-y-5 animate-fadeRise">
              {/* Detected Columns Chips */}
              <div className="rounded-xl border border-line bg-white p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[12px] font-semibold text-muted uppercase tracking-wider">
                    Detected Headers ({detectedColumns.length})
                  </span>
                  <span className="text-[11.5px] text-good-700 font-medium">
                    ✓ Headers successfully mapped to MMRMS schema
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {detectedColumns.map((col) => (
                    <span
                      key={col}
                      className="rounded-md bg-canvas px-2.5 py-1 text-[11.5px] font-medium text-ink border border-line"
                    >
                      {col}
                    </span>
                  ))}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-brand-200 bg-brand-50/50 p-4">
                <div className="flex items-center gap-3">
                  <div className="text-[13px]">
                    <span className="font-semibold text-brand-900">{parsedRows.length} rows</span> ready for processing.
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    loading={validating}
                    onClick={handleValidateDryRun}
                  >
                    🔍 Validate (Dry Run)
                  </Button>
                  <Button
                    size="sm"
                    loading={committing}
                    onClick={handleCommitUpload}
                  >
                    🚀 Confirm & Commit to MMRMS
                  </Button>
                </div>
              </div>

              {/* Dry-Run Validation Summary Card */}
              {validationResult && (
                <div className="space-y-4 rounded-xl border border-line bg-white p-5 shadow-sm">
                  <div className="flex items-center justify-between">
                    <h4 className="text-[14px] font-semibold text-ink">Dry-Run Pre-validation Results</h4>
                    {validationResult.mode === 'faculty' ? (
                      <span className="rounded-full bg-purple-100 px-2.5 py-0.5 text-[11px] font-semibold text-purple-800">
                        Faculty & Mentor Roster
                      </span>
                    ) : validationResult.isCourseWise && (
                      <span className="rounded-full bg-sky-100 px-2.5 py-0.5 text-[11px] font-semibold text-sky-800">
                        Course-Wise ERP Aggregated
                      </span>
                    )}
                  </div>

                  {validationResult.mode === 'faculty' && (
                    <div className="rounded-lg border border-purple-200 bg-purple-50/80 p-3.5 flex items-start gap-3">
                      <span className="text-base text-purple-600">👨‍🏫</span>
                      <div className="text-[12.5px] text-purple-900 leading-snug">
                        <strong className="font-semibold">Faculty & Mentor Directory Roster Recognized:</strong>{' '}
                        Found <strong>{validationResult.totalRows}</strong> faculty professors across academic titles (Professors, Associate Professors, Assistant Professors) ready to be onboarded as mentors.
                      </div>
                    </div>
                  )}

                  {validationResult.isCourseWise && (
                    <div className="rounded-lg border border-sky-200 bg-sky-50/80 p-3.5 flex items-start gap-3">
                      <span className="text-base text-sky-600">📊</span>
                      <div className="text-[12.5px] text-sky-900 leading-snug">
                        <strong className="font-semibold">Institutional Course-Wise Attendance Report Recognized:</strong>{' '}
                        Automatically aggregated <strong>{validationResult.rawRowCount?.toLocaleString()}</strong> course entries across subjects into{' '}
                        <strong>{validationResult.totalRows?.toLocaleString()}</strong> unique student records with calculated overall attendance % and shortage subjects.
                      </div>
                    </div>
                  )}

                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <StatTile
                      label={validationResult.mode === 'faculty' ? "Total faculty" : (validationResult.isCourseWise ? "Unique students" : "Total rows")}
                      value={validationResult.totalRows}
                      footer={validationResult.mode === 'faculty' ? "Professors in department" : (validationResult.isCourseWise ? `From ${validationResult.rawRowCount} course entries` : "In uploaded spreadsheet")}
                    />
                    <StatTile
                      label="Valid records"
                      value={validationResult.validCount}
                      tone="green"
                      footer="Ready to be committed"
                    />
                    <StatTile
                      label={validationResult.mode === 'faculty' ? "New faculty" : "New students"}
                      value={validationResult.newCount}
                      tone="indigo"
                      footer={validationResult.mode === 'faculty' ? "Will be onboarded as mentors" : "Will be enrolled in 2024 BCS"}
                    />
                    <StatTile
                      label="Existing updates"
                      value={validationResult.updateCount}
                      tone="amber"
                      footer={validationResult.mode === 'faculty' ? "Faculty profiles updated" : "Marks / attendance updated"}
                    />
                  </div>

                  {/* Warnings / Errors */}
                  {validationResult.errors?.length > 0 && (
                    <div className="rounded-lg border border-rose-200 bg-rose-50/60 p-4">
                      <p className="text-[12.5px] font-semibold text-bad-ink">
                        Validation Errors ({validationResult.errors.length})
                      </p>
                      <ul className="mt-2 max-h-36 overflow-y-auto space-y-1 text-[12px] text-bad-ink">
                        {validationResult.errors.map((e, idx) => (
                          <li key={idx}>
                            • Row {e.row} ({e.field}): {e.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {validationResult.warnings?.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/60 p-4">
                      <p className="text-[12.5px] font-semibold text-warn-ink">
                        Notices & Warnings ({validationResult.warnings.length})
                      </p>
                      <ul className="mt-2 max-h-36 overflow-y-auto space-y-1 text-[12px] text-warn-ink">
                        {validationResult.warnings.map((w, idx) => (
                          <li key={idx}>
                            • Row {w.row} ({w.field}): {w.message}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Data Preview Table */}
              <SectionTable
                title="Spreadsheet Preview (First 10 Rows)"
                subtitle="Review values before importing into institutional record books"
              >
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-[12.5px]">
                    <thead>
                      <tr className="border-b border-line bg-canvas/60 text-muted font-semibold">
                        <th className="py-2.5 px-3">#</th>
                        {detectedColumns.slice(0, 8).map((h) => (
                          <th key={h} className="py-2.5 px-3">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {parsedRows.slice(0, 10).map((row, idx) => (
                        <tr key={idx} className="hover:bg-brand-50/30 transition-colors">
                          <td className="py-2 px-3 text-muted font-mono">{idx + 1}</td>
                          {detectedColumns.slice(0, 8).map((h) => (
                            <td key={h} className="py-2 px-3 font-medium text-ink">
                              {String(row[h] !== undefined ? row[h] : '—')}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </SectionTable>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: UPLOAD HISTORY & AUDIT LOG */}
      {activeTab === 'history' && (
        <SectionTable
          title="Upload History & Audit Log"
          subtitle="Complete record of all spreadsheets processed by Year Coordinators"
          action={
            <Button size="sm" variant="secondary" onClick={loadHistory} loading={historyLoading}>
              Refresh Log
            </Button>
          }
        >
          <DataTable
            rows={history}
            rowKey={(r) => r.id}
            empty={
              <EmptyState
                title="No upload logs yet"
                description="Upload a student spreadsheet to see an audit trail here."
                icon="✓"
              />
            }
            columns={[
              {
                key: 'file',
                header: 'Spreadsheet File',
                render: (r) => (
                  <div>
                    <p className="font-semibold text-ink">{r.filename}</p>
                    <p className="text-[11.5px] text-muted font-mono">{r.id}</p>
                  </div>
                ),
              },
              {
                key: 'mode',
                header: 'Type',
                render: (r) => (
                  <Badge tone={r.mode === 'attendance' ? 'amber' : 'indigo'}>
                    {r.mode === 'attendance' ? 'Attendance Dump' : 'Master Roster'}
                  </Badge>
                ),
              },
              {
                key: 'counts',
                header: 'Records Processed',
                align: 'right',
                render: (r) => (
                  <div className="text-right">
                    <p className="font-semibold text-ink">{r.totalRows} rows</p>
                    <p className="text-[11px] text-muted">
                      +{r.insertedCount} new · {r.updatedCount} updated
                    </p>
                  </div>
                ),
              },
              {
                key: 'uploadedBy',
                header: 'Coordinator',
                align: 'right',
                render: (r) => <span className="font-medium text-ink">{r.uploadedBy}</span>,
              },
              {
                key: 'date',
                header: 'Date & Time',
                align: 'right',
                render: (r) => (
                  <span className="text-muted text-[11.5px]">
                    {r.uploadedAt ? new Date(r.uploadedAt).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' }) : '—'}
                  </span>
                ),
              },
              {
                key: 'status',
                header: 'Status',
                align: 'right',
                render: () => <Badge tone="green">Completed</Badge>,
              },
            ]}
          />
        </SectionTable>
      )}

      {/* TAB 3: COLUMN SCHEMA & GUIDE */}
      {activeTab === 'guide' && (
        <SectionCard
          title="Institutional Column Mapping Reference"
          subtitle="MMRMS automatically normalizes variations in column names from ERP dumps"
        >
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[13px]">
              <thead>
                <tr className="border-b border-line bg-canvas/70 font-semibold text-muted">
                  <th className="py-2.5 px-3">Canonical Field</th>
                  <th className="py-2.5 px-3">Accepted Column Headers (Case-Insensitive)</th>
                  <th className="py-2.5 px-3">Format / Constraints</th>
                  <th className="py-2.5 px-3">Default Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-brand-600">Roll Number *</td>
                  <td className="py-2.5 px-3 text-muted">Roll Number, Roll No, Register No, Reg No, Roll</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">e.g. 24BCS001 (Unique)</td>
                  <td className="py-2.5 px-3 text-muted-soft">Required</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-brand-600">Student Name *</td>
                  <td className="py-2.5 px-3 text-muted">Student Name, Name, Full Name, Candidate Name</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">Text</td>
                  <td className="py-2.5 px-3 text-muted-soft">Required</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-brand-600">Mentor Email</td>
                  <td className="py-2.5 px-3 text-muted">Mentor Email, Faculty Email, Mentor, Staff Code</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">bharathi.priya@kct.ac.in</td>
                  <td className="py-2.5 px-3 text-muted-soft">Section mentor</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-brand-600">CGPA / GPA</td>
                  <td className="py-2.5 px-3 text-muted">CGPA, GPA, SGPA, Current CGPA</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">0.0 – 10.0 scale</td>
                  <td className="py-2.5 px-3 text-muted-soft">7.5</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-brand-600">Attendance %</td>
                  <td className="py-2.5 px-3 text-muted">Attendance %, Attendance, Total Attendance, Att %</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">0 – 100 percentage</td>
                  <td className="py-2.5 px-3 text-muted-soft">85%</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-brand-600">Standing Arrears</td>
                  <td className="py-2.5 px-3 text-muted">Standing Arrears, Arrears, Backlogs, Active Arrears</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">Integer (&gt;= 0)</td>
                  <td className="py-2.5 px-3 text-muted-soft">0</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-brand-600">Section</td>
                  <td className="py-2.5 px-3 text-muted">Section, Class, Sec</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">2024 BCS / Section A / Section B</td>
                  <td className="py-2.5 px-3 text-muted-soft">2024 BCS</td>
                </tr>
                <tr className="bg-canvas/50">
                  <td colSpan={4} className="py-2 px-3 font-semibold text-[11.5px] uppercase tracking-wider text-purple-700">
                    👨‍🏫 Faculty & Mentor Onboarding Columns (FACULTY DETAILS.xlsx)
                  </td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-purple-700">EMPLOYEE CODE *</td>
                  <td className="py-2.5 px-3 text-muted">EMPLOYEE CODE, Staff Code, Faculty Code, Staff ID, Emp Code</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">e.g. KCT00175, KCT01251</td>
                  <td className="py-2.5 px-3 text-muted-soft">Required</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-purple-700">Name Of the Professor *</td>
                  <td className="py-2.5 px-3 text-muted">Name Of the Professor, Faculty Name, Professor Name, Name</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">e.g. Dr.E.A.Vimal</td>
                  <td className="py-2.5 px-3 text-muted-soft">Required</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-purple-700">Designation</td>
                  <td className="py-2.5 px-3 text-muted">Designation, Role, Post, Academic Title</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">ASSOCIATE PROFESSOR, PROFESSOR, ASSISTANT PROFESSOR</td>
                  <td className="py-2.5 px-3 text-muted-soft">Assistant Professor</td>
                </tr>
                <tr>
                  <td className="py-2.5 px-3 font-semibold text-purple-700">Mailid *</td>
                  <td className="py-2.5 px-3 text-muted">Mailid, Mail ID, Faculty Email, Email</td>
                  <td className="py-2.5 px-3 font-mono text-[11.5px]">vimal.ea.cse@kct.ac.in</td>
                  <td className="py-2.5 px-3 text-muted-soft">Required</td>
                </tr>
              </tbody>
            </table>
          </div>
        </SectionCard>
      )}
    </div>
  );
}
