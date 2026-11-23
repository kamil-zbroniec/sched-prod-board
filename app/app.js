import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const board = document.querySelector('[data-testid="board"]');
const loader = document.querySelector('[data-testid="loader"]');

const acked = new Set(); // ids acked this session, kept across refreshes
let loading = true;

/** Day before month for EU-style locales (dd/mm), otherwise the locale's own order. */
function formatTime(iso) {
  const d = new Date(iso);
  const test = new Date(Date.UTC(2026, 10, 30)); // 30/11: day-first locales show 30/11
  const dayFirst = new Intl.DateTimeFormat(undefined, { dateStyle: 'short' }).format(test).startsWith('30');
  const dateFmt = new Intl.DateTimeFormat(undefined, {
    day: dayFirst ? '2-digit' : undefined,
    month: dayFirst ? '2-digit' : 'short',
  });
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' });
  return `${dateFmt.format(d)} ${timeFmt.format(d)}`;
}

function render(incidents) {
  list.innerHTML = incidents
    .map((i) => {
      const isAcked = acked.has(i.id);
      return `<li data-testid="incident-row" data-id="${i.id}" class="row ${i.severity}">
        <span class="id">${i.id}</span>
        <span class="sev">${i.severity}</span>
        <span class="what">${i.service} · ${i.region} · ${i.summary}</span>
        <time datetime="${i.openedAt}">${formatTime(i.openedAt)}</time>
        ${isAcked
          ? '<span data-testid="acked" class="acked">acked ✓</span>'
          : `<button data-testid="ack" class="ack" data-id="${i.id}" type="button">Ack</button>`}
      </li>`;
    })
    .join('');
}

async function refresh() {
  try {
    const page = await fetchIncidents();
    if (loading) {
      loading = false;
      loader.remove();
    }
    if (page.incidents.length === 0 && !document.querySelector('[data-testid="empty"]')) {
      list.innerHTML = '<li data-testid="empty" class="empty">no incidents tonight</li>';
    } else if (page.incidents.length > 0) {
      render(page.incidents);
    }
  } catch (err) {
    console.error('refresh failed', err);
  }
}

board.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-testid="ack"]');
  if (!btn) return;
  const id = btn.dataset.id;
  btn.disabled = true;
  ack(id)
    .then(() => {
      acked.add(id);
      btn.outerHTML = '<span data-testid="acked" class="acked">acked ✓</span>';
    })
    .catch((err) => {
      console.error('ack failed', id, err);
      btn.disabled = false;
    });
});

await refresh();
setInterval(refresh, 2000);
