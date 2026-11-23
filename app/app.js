import { fetchIncidents, ack } from './api.js';

const list = document.querySelector('[data-testid="incident-list"]');
const board = document.querySelector('[data-testid="board"]');
const loader = document.querySelector('[data-testid="loader"]');
const panel = document.querySelector('[data-testid="incident-panel"]');
const panelBody = panel.querySelector('.panel-body');
const panelClose = panel.querySelector('.panel-close');

const acked = new Set(); // ids acked this session, kept across refreshes
let openId = null; // the incident whose panel is open
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
      const isOpen = i.id === openId;
      const isAcked = acked.has(i.id);
      return `<li data-testid="incident-row" data-id="${i.id}" class="row ${i.severity}${isOpen ? ' selected' : ''}" tabindex="0">
        <span class="id">${i.id}</span>
        <span class="sev">${i.severity}</span>
        <span class="what">${i.service} · ${i.region} · ${i.summary}</span>
        <time datetime="${i.openedAt}">${formatTime(i.openedAt)}</time>
        ${isAcked ? '<span data-testid="acked" class="acked">acked ✓</span>' : ''}
      </li>`;
    })
    .join('');
  renderPanel(incidents.find((i) => i.id === openId));
}

function renderPanel(incident) {
  if (!incident) {
    panel.hidden = true;
    panelBody.innerHTML = '';
    return;
  }
  panel.hidden = false;
  panel.dataset.id = incident.id;
  panel.setAttribute('aria-label', `incident ${incident.id}`);
  const isAcked = acked.has(incident.id);
  panelBody.innerHTML = `
    <h2>${incident.id} · ${incident.severity}</h2>
    <p>${incident.service} · ${incident.region}</p>
    <p>${incident.summary}</p>
    <p class="when">opened <time datetime="${incident.openedAt}">${formatTime(incident.openedAt)}</time></p>
    ${isAcked
      ? '<p data-testid="acked" class="acked">acked ✓</p>'
      : `<button data-testid="panel-ack" class="ack" data-id="${incident.id}" type="button">Ack</button>`}
  `;
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

// A row click opens that incident's panel; Ack lives in the panel, keyed to the
// incident id, so a list shift can never redirect the ack.
list.addEventListener('click', (e) => {
  const row = e.target.closest('[data-testid="incident-row"]');
  if (!row) return;
  openId = row.dataset.id === openId ? null : row.dataset.id;
  refresh();
});
list.addEventListener('keydown', (e) => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('[data-testid="incident-row"]');
  if (!row) return;
  e.preventDefault();
  openId = row.dataset.id === openId ? null : row.dataset.id;
  refresh();
});

panel.addEventListener('click', (e) => {
  if (e.target === panelClose) {
    openId = null;
    refresh();
    return;
  }
  const btn = e.target.closest('[data-testid="panel-ack"]');
  if (!btn) return;
  const id = btn.dataset.id;
  btn.disabled = true;
  ack(id)
    .then(() => {
      acked.add(id);
      refresh();
    })
    .catch((err) => {
      console.error('ack failed', id, err);
      btn.disabled = false;
    });
});

await refresh();
setInterval(refresh, 2000);
