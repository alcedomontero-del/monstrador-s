export function money(n) {
  return 'RD$' + (Number(n) || 0).toLocaleString('es-DO', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
export function hora(ts) {
  return new Date(ts || Date.now()).toLocaleTimeString('es-DO', { hour: '2-digit', minute: '2-digit' });
}
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
export function showMsg(elId, text, ok) {
  document.getElementById(elId).innerHTML = `<div class="msg ${ok ? 'ok' : 'err'}">${text}</div>`;
}
export function show(id) { document.getElementById(id).classList.remove('hidden'); }
export function hide(id) { document.getElementById(id).classList.add('hidden'); }
