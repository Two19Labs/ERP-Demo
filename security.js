// Shared output-sanitization helpers. Load BEFORE any page script that
// interpolates DB values into innerHTML.
(function (global) {
 const ENTITY_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

 function escapeHtml(value) {
 if (value === null || value === undefined) return '';
 return String(value).replace(/[&<>"']/g, (ch) => ENTITY_MAP[ch]);
 }

 // Allow only http(s) URLs for href targets sourced from user input. Anything
 // else (javascript:, data:, vbscript:, relative junk) collapses to '#'.
 function safeUrl(value) {
 if (!value) return '#';
 try {
 const u = new URL(String(value), window.location.origin);
 if (u.protocol === 'http:' || u.protocol === 'https:') {
 return escapeHtml(u.toString());
 }
 } catch (_) { /* fallthrough */ }
 return '#';
 }

 global.escapeHtml = escapeHtml;
 global.safeUrl = safeUrl;
})(window);
