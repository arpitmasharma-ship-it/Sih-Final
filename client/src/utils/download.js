import api from '../services/api';

export async function downloadReportPdf(idOrRef, defaultName = 'report') {
  const res = await api.get(`/reports/${idOrRef}/pdf`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const name = defaultName.endsWith('.pdf') ? defaultName : `${defaultName}.pdf`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}

export async function exportReportJson(idOrRef, defaultName = 'report') {
  const res = await api.get(`/reports/${idOrRef}/export.json`, { responseType: 'blob' });
  const blob = new Blob([res.data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  const name = defaultName.endsWith('.json') ? defaultName : `${defaultName}.json`;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
