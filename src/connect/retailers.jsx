import { useRef, useState } from 'react';
import { FileSpreadsheet, Upload } from 'lucide-react';
import connectApi, { downloadFile, errorText } from './api';
import { Badge, Button, Card, ErrorNote, Modal, Notice } from './ui.jsx';

// Pieces for retailers, shared by the producer portal and the superadmin console: the Excel / CSV
// bulk upload, and a QR batch's "Who can mark sold" setting.

// ---------- Bulk upload ----------

// `endpoint` takes multipart { file, ...fields }; `templateEndpoint` streams the .xlsx template.
// `extra` renders above the file picker (e.g. the superadmin's producer choice); `fields` go with it.
export const BulkUploadModal = ({ title = 'Upload retailers', endpoint, templateEndpoint, extra, fields = {}, note, onClose, onDone }) => {
  const inputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const upload = async () => {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const body = new FormData();
      Object.entries(fields).forEach(([k, v]) => body.append(k, v ?? ''));
      body.append('file', file);
      const { data } = await connectApi.post(endpoint, body);
      setResult(data);
      onDone(data);
    } catch (err) {
      setError(errorText(err, 'Could not upload the file.'));
    } finally {
      setBusy(false);
    }
  };

  const template = async () => {
    try {
      await downloadFile(templateEndpoint, 'retailers-template.xlsx');
    } catch (err) {
      setError(errorText(err, 'Could not download the template.'));
    }
  };

  return (
    <Modal
      title={title}
      onClose={onClose}
      wide
      footer={
        result ? (
          <Button onClick={onClose}>Done</Button>
        ) : (
          <>
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button busy={busy} disabled={!file} onClick={upload}>
              <Upload size={16} /> Upload
            </Button>
          </>
        )
      }
    >
      {result ? (
        <div className="cx-stack" style={{ gap: 12 }}>
          <Notice tone={result.result.skipped.length ? 'warning' : 'success'}>{result.message}</Notice>
          {result.result.skipped.length > 0 && (
            <div className="cx-table-wrap">
              <table className="cx-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Name</th>
                    <th>Mobile</th>
                    <th>Why it was skipped</th>
                  </tr>
                </thead>
                <tbody>
                  {result.result.skipped.map((s) => (
                    <tr key={s.row}>
                      <td>{s.row}</td>
                      <td>{s.name || '—'}</td>
                      <td className="cx-mono">{s.mobile || '—'}</td>
                      <td>{s.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="cx-stack" style={{ gap: 14 }}>
          <p className="cx-muted" style={{ margin: 0 }}>
            An Excel (.xlsx) or CSV file, up to 1,000 retailers. The first row holds the column headings: <strong>Name</strong> and <strong>Mobile</strong> (required),{' '}
            <strong>Email</strong>, and optionally Business name, City and Address. Each mobile becomes a retailer login (OTP); an existing app account is made a retailer.
          </p>
          {note}
          <div>
            <Button variant="ghost" className="small" onClick={template}>
              <FileSpreadsheet size={16} /> Download the Excel template
            </Button>
          </div>
          {extra}
          <div className="cx-upload">
            <button type="button" className="cx-upload-btn" onClick={() => inputRef.current?.click()}>
              <FileSpreadsheet size={18} />
              {file ? file.name : 'Choose the Excel or CSV file'}
            </button>
            <input
              ref={inputRef}
              type="file"
              hidden
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                e.target.value = '';
              }}
            />
          </div>
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Modal>
  );
};

// ---------- Who can mark sold ----------

export const SOLD_ACCESS = [
  { value: 'all', label: 'All retailers', hint: 'This producer’s retailers and general retailers (not linked to any producer).' },
  { value: 'producer', label: 'Only this producer’s retailers', hint: 'General retailers can scan but not mark sold.' },
];
export const soldAccessText = (value, producerName) =>
  value === 'producer' ? `Only ${producerName ? `${producerName}’s` : 'the producer’s'} retailers` : 'All retailers (the producer’s + general)';

// `endpoint` is PUT { soldAccess }. Without `canEdit` it only shows the setting.
export const SoldAccessCard = ({ batch, endpoint, canEdit, onSaved }) => {
  const [busy, setBusy] = useState(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const current = batch.soldAccess || 'all';
  const choose = async (value) => {
    if (value === current || !canEdit) return;
    setBusy(value);
    setError('');
    setMessage('');
    try {
      const { data } = await connectApi.put(endpoint, { soldAccess: value });
      setMessage(data.message);
      onSaved(data.batch);
    } catch (err) {
      setError(errorText(err, 'Could not save.'));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card title="Who can mark sold" actions={!canEdit && <Badge>Set by the producer admin</Badge>}>
      <div className="cx-stack" style={{ gap: 10 }}>
        <div className="cx-choice-row" role="radiogroup" aria-label="Who can mark sold">
          {SOLD_ACCESS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={current === o.value}
              className={`cx-choice ${current === o.value ? 'active' : ''}`}
              disabled={!canEdit || Boolean(busy)}
              onClick={() => choose(o.value)}
            >
              <strong>
                {o.label}
                {o.value === 'all' && <span className="cx-muted"> · default</span>}
              </strong>
              <span>{o.hint}</span>
              {busy === o.value && <span className="cx-muted">Saving…</span>}
            </button>
          ))}
        </div>
        <p className="cx-small cx-muted" style={{ margin: 0 }}>
          The producer and OriginHash can always mark sold; other producers and their retailers can only scan.
        </p>
        {message && <Notice tone="success">{message}</Notice>}
        <ErrorNote>{error}</ErrorNote>
      </div>
    </Card>
  );
};
