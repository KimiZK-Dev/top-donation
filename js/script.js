const state = {
  donors: [],
  filtered: [],
  batchSize: 12,
  visibleCount: 0,
  query: '',
  isAppending: false
};

const moneyFormat = new Intl.NumberFormat('vi-VN');
const iconMap = {
  facebook: 'fa-facebook',
  instagram: 'fa-instagram',
  tiktok: 'fa-tiktok',
  youtube: 'fa-youtube',
  threads: 'fa-threads',
  twitter: 'fa-x-twitter',
  x: 'fa-x-twitter',
  discord: 'fa-discord',
  github: 'fa-github',
  telegram: 'fa-telegram'
};

const els = {
  totalAmount: document.getElementById('totalAmount'),
  supporterCount: document.getElementById('supporterCount'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  perPageSelect: document.getElementById('perPageSelect'),
  resultCount: document.getElementById('resultCount'),
  topList: document.getElementById('topList'),
  donorList: document.getElementById('donorList'),
  emptyState: document.getElementById('emptyState'),
  loadInfo: document.getElementById('loadInfo'),
  loadZone: document.getElementById('loadZone'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  loadMoreSentinel: document.getElementById('loadMoreSentinel')
};

let observer;

function formatMoney(amount) {
  return `${moneyFormat.format(amount)}đ`;
}

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function normalizeUid(uid = '', platform = '') {
  let value = String(uid).trim();
  if (!value) return '';

  if (value.startsWith('@')) {
    value = value.slice(1);
  }

  if (platform === 'youtube' && /^channel\//i.test(value)) {
    return value;
  }

  return value;
}

function parseUidFromUrl(url, platform) {
  if (!url) return '';

  try {
    const pathname = new URL(url).pathname;
    const parts = pathname.split('/').filter(Boolean);
    if (!parts.length) return '';

    if (platform === 'tiktok') {
      return normalizeUid(parts[0], platform);
    }

    if (platform === 'youtube') {
      if (parts[0] === 'channel' && parts[1]) return `channel/${parts[1]}`;
      return normalizeUid(parts[0], platform);
    }

    return normalizeUid(parts[0], platform);
  } catch {
    return '';
  }
}

function buildSocialUrl(platform, uid) {
  const id = normalizeUid(uid, platform);
  if (!platform || !id) return '';

  switch (platform) {
    case 'facebook':
      return `https://facebook.com/${id}`;
    case 'instagram':
      return `https://instagram.com/${id}`;
    case 'tiktok':
      return `https://www.tiktok.com/@${id}`;
    case 'threads':
      return `https://www.threads.net/@${id}`;
    case 'twitter':
    case 'x':
      return `https://x.com/${id}`;
    case 'youtube':
      return id.startsWith('channel/')
        ? `https://www.youtube.com/${id}`
        : `https://www.youtube.com/@${id}`;
    case 'github':
      return `https://github.com/${id}`;
    case 'telegram':
      return `https://t.me/${id}`;
    case 'discord':
      return `https://discord.com/users/${id}`;
    default:
      return '';
  }
}

function socialNeedsAt(platform) {
  return ['tiktok', 'instagram', 'threads', 'twitter', 'x', 'telegram', 'youtube'].includes(platform);
}

function normalizeSocial(raw) {
  if (!raw) return null;

  if (typeof raw === 'string') {
    const platformOnly = raw.toLowerCase();
    return { platform: platformOnly, uid: '', username: '', url: '' };
  }

  const platform = String(raw.platform || raw.network || raw.name || '').toLowerCase().trim();
  const username = String(raw.username || raw.handle || '').trim();
  const legacyUrl = String(raw.url || raw.link || '').trim();

  const uidFromRaw = String(raw.uid || '').trim();
  const uidFromUserName = normalizeUid(username, platform);
  const uidFromUrl = parseUidFromUrl(legacyUrl, platform);
  const uid = normalizeUid(uidFromRaw || uidFromUserName || uidFromUrl, platform);
  const url = buildSocialUrl(platform, uid) || legacyUrl;

  if (!platform && !username && !uid && !url) return null;
  return { platform, uid, username, url };
}

function getAnonymousFlag(raw) {
  return raw?.anynomous === true || raw?.anonymous === true;
}

function normalizeDonors(list) {
  let anonymousCount = 0;

  return list
    .map((raw) => {
      const isAnonymous = getAnonymousFlag(raw);
      const amount = toSafeNumber(raw.amount);
      if (!amount) return null;

      const rawName = String(raw.name || '').trim();
      if (isAnonymous) anonymousCount += 1;

      const name = isAnonymous
        ? rawName || `Ẩn danh ${anonymousCount}`
        : rawName || 'Không tên';

      const social = isAnonymous
        ? null
        : normalizeSocial(raw.social) || normalizeSocial({
          platform: raw.type,
          username: raw.username,
          uid: raw.uid,
          url: raw.social_link
        });

      const avatar = isAnonymous ? '' : String(raw.avatar || '').trim();

      return {
        name,
        amount,
        avatar,
        anynomous: isAnonymous,
        social
      };
    })
    .filter(Boolean)
    .sort((a, b) => b.amount - a.amount)
    .map((item, idx) => ({ ...item, rank: idx + 1 }));
}

function animateCount(element, endValue, duration = 650) {
  const start = performance.now();

  function frame(now) {
    const progress = Math.min((now - start) / duration, 1);
    const current = Math.round(endValue * progress);
    element.textContent = formatMoney(current);
    if (progress < 1) requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

function buildAvatar(item) {
  if (item.avatar) {
    return `<img class="avatar" loading="lazy" src="${item.avatar}" alt="${item.name}" onerror="this.remove(); this.parentElement.insertAdjacentHTML('afterbegin', '<div class=&quot;avatar avatar-fallback&quot;>?</div>')">`;
  }

  const label = item.anynomous ? '<i class="fa-solid fa-user-secret"></i>' : item.name.slice(0, 1).toUpperCase();
  return `<div class="avatar avatar-fallback">${label}</div>`;
}

function buildSocial(item) {
  if (!item.social) return '';

  const platform = item.social.platform || 'globe';
  const icon = iconMap[platform] || 'fa-globe';
  const uid = item.social.uid || '';
  const username = item.social.username || (socialNeedsAt(platform) && uid ? `@${uid}` : uid || platform);
  const url = item.social.url || buildSocialUrl(platform, uid);

  if (!url) {
    return `<span class="social-link"><i class="fa-brands ${icon}"></i> ${username}</span>`;
  }

  return `<a class="social-link" href="${url}" target="_blank" rel="noopener noreferrer"><i class="fa-brands ${icon}"></i> ${username}</a>`;
}

function buildCard(item, isTop = false) {
  return `
    <article class="donor-card ${isTop ? 'top' : ''}">
      <div class="card-inner">
        <div class="donor-head">
          ${buildAvatar(item)}
          <div>
            <p class="donor-name">${item.name}</p>
            <p class="donor-rank mb-0">Top #${item.rank}</p>
          </div>
        </div>
        <div class="donor-meta">
          <span class="donor-amount">${formatMoney(item.amount)}</span>
          ${buildSocial(item)}
        </div>
      </div>
    </article>
  `;
}

function renderTop() {
  const list = state.filtered.slice(0, 3);
  els.topList.innerHTML = '';

  if (!list.length) {
    els.topList.innerHTML = '<div class="col-12"><div class="empty-state">Chưa có donor để hiển thị.</div></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  list.forEach((item) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-4';
    col.innerHTML = buildCard(item, true);
    fragment.appendChild(col);
  });
  els.topList.appendChild(fragment);
}

function updateLoadStatus() {
  const total = state.filtered.length;
  const shown = Math.min(state.visibleCount, total);

  els.resultCount.textContent = `${total} kết quả`;
  els.loadInfo.textContent = `Đã hiển thị ${shown} / ${total}`;
  els.emptyState.classList.toggle('d-none', total !== 0);

  const done = shown >= total;
  els.loadZone.classList.toggle('d-none', total === 0);
  els.loadMoreBtn.classList.toggle('d-none', total === 0 || done);
}

function appendNextBatch() {
  if (state.isAppending) return;
  if (state.visibleCount >= state.filtered.length) return;

  state.isAppending = true;

  const from = state.visibleCount;
  const to = from + state.batchSize;
  const chunk = state.filtered.slice(from, to);

  const fragment = document.createDocumentFragment();
  chunk.forEach((item) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-6 col-xl-4';
    col.innerHTML = buildCard(item, false);
    fragment.appendChild(col);
  });

  els.donorList.appendChild(fragment);
  state.visibleCount += chunk.length;
  state.isAppending = false;

  updateLoadStatus();
}

function resetListAndRender() {
  state.visibleCount = 0;
  els.donorList.innerHTML = '';
  updateLoadStatus();

  if (state.filtered.length > 0) {
    appendNextBatch();
  }
}

function applyFilter() {
  const q = state.query;
  if (!q) {
    state.filtered = state.donors;
  } else {
    state.filtered = state.donors.filter((d) => {
      const socialName = d.social?.username || '';
      const socialUid = d.social?.uid || '';
      const platform = d.social?.platform || '';
      return (
        d.name.toLowerCase().includes(q) ||
        socialName.toLowerCase().includes(q) ||
        socialUid.toLowerCase().includes(q) ||
        platform.toLowerCase().includes(q)
      );
    });
  }

  renderTop();
  resetListAndRender();
}

function debounce(fn, delay = 180) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function setupInfiniteScroll() {
  if (!('IntersectionObserver' in window)) {
    els.loadMoreBtn.classList.remove('d-none');
    return;
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          appendNextBatch();
        }
      });
    },
    {
      root: null,
      rootMargin: '320px 0px',
      threshold: 0
    }
  );

  observer.observe(els.loadMoreSentinel);
}

async function loadData() {
  try {
    const res = await fetch('./data/donors.json', { cache: 'no-store' });
    if (!res.ok) throw new Error('Fetch failed');

    const raw = await res.json();
    state.donors = normalizeDonors(Array.isArray(raw) ? raw : []);
    state.filtered = state.donors;

    const totalAmount = state.donors.reduce((sum, item) => sum + item.amount, 0);
    els.supporterCount.textContent = String(state.donors.length);
    animateCount(els.totalAmount, totalAmount);

    renderTop();
    resetListAndRender();
  } catch (err) {
    console.error(err);
    els.topList.innerHTML = '<div class="col-12"><div class="empty-state">Không tải được dữ liệu donor.</div></div>';
    els.donorList.innerHTML = '';
    els.emptyState.classList.remove('d-none');
    els.resultCount.textContent = '0 kết quả';
    els.loadZone.classList.add('d-none');
  }
}

const onSearch = debounce((value) => {
  state.query = value.trim().toLowerCase();
  applyFilter();
});

function bindEvents() {
  els.searchInput.addEventListener('input', (e) => onSearch(e.target.value));

  els.clearSearch.addEventListener('click', () => {
    els.searchInput.value = '';
    state.query = '';
    applyFilter();
  });

  els.perPageSelect.addEventListener('change', (e) => {
    state.batchSize = Number(e.target.value) || 12;
    resetListAndRender();
  });

  els.loadMoreBtn.addEventListener('click', appendNextBatch);
}

document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  setupInfiniteScroll();
  loadData();
});
