/* ===== State ===== */
const state = {
  donors: [],
  filtered: [],
  batchSize: 12,
  visibleCount: 0,
  query: '',
  sortBy: 'amount-desc',
  isAppending: false
};

const moneyFormat = new Intl.NumberFormat('vi-VN');

/* ===== DOM Cache ===== */
const els = {
  totalAmount: document.getElementById('totalAmount'),
  supporterCount: document.getElementById('supporterCount'),
  searchInput: document.getElementById('searchInput'),
  clearSearch: document.getElementById('clearSearch'),
  perPageSelect: document.getElementById('perPageSelect'),
  sortSelect: document.getElementById('sortSelect'),
  resultCount: document.getElementById('resultCount'),
  topList: document.getElementById('topList'),
  donorList: document.getElementById('donorList'),
  emptyState: document.getElementById('emptyState'),
  loadInfo: document.getElementById('loadInfo'),
  loadZone: document.getElementById('loadZone'),
  loadMoreBtn: document.getElementById('loadMoreBtn'),
  loadMoreSentinel: document.getElementById('loadMoreSentinel'),
  skeleton: document.getElementById('skeleton'),
  scrollTopBtn: document.getElementById('scrollTopBtn')
};

let observer;

/* ===== Utilities ===== */
function formatMoney(amount) {
  return `${moneyFormat.format(amount)}đ`;
}

function toSafeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

function toTitleCase(str) {
  return str
    .toLowerCase()
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function parseDate(dateStr) {
  if (!dateStr) return 0;
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    return new Date(`${parts[2]}-${parts[1]}-${parts[0]}`).getTime() || 0;
  }
  return new Date(dateStr).getTime() || 0;
}

/* ===== Data Processing ===== */
function normalizeDonors(list) {
  return list
    .map((raw) => {
      const amount = toSafeNumber(raw.amount);
      if (!amount) return null;

      const rawName = String(raw.name || '').trim();
      const name = rawName ? toTitleCase(rawName) : 'Ẩn danh';
      const date = String(raw.date || '').trim();

      return { name, amount, date };
    })
    .filter(Boolean);
}

function sortDonors(donors, sortBy) {
  const sorted = [...donors];
  switch (sortBy) {
    case 'amount-desc':
      sorted.sort((a, b) => b.amount - a.amount);
      break;
    case 'amount-asc':
      sorted.sort((a, b) => a.amount - b.amount);
      break;
    case 'date-desc':
      sorted.sort((a, b) => parseDate(b.date) - parseDate(a.date));
      break;
    case 'date-asc':
      sorted.sort((a, b) => parseDate(a.date) - parseDate(b.date));
      break;
    case 'name-asc':
      sorted.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
      break;
    default:
      sorted.sort((a, b) => b.amount - a.amount);
  }
  return sorted.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

/* ===== Animation ===== */
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

/* ===== Card Building ===== */
const medalIcons = { 1: '🥇', 2: '🥈', 3: '🥉' };

function buildCard(item, isTop = false, animIndex = 0) {
  const initial = item.name.slice(0, 1).toUpperCase();
  const topClass = isTop ? `top top-${item.rank}` : '';
  const medal = isTop && medalIcons[item.rank] ? `<span class="medal-badge">${medalIcons[item.rank]}</span> ` : '';
  const delay = animIndex * 50;

  return `
    <article class="donor-card ${topClass} card-animate" style="--delay:${delay}ms">
      <div class="card-inner">
        <div class="donor-head">
          <div class="avatar avatar-fallback">${initial}</div>
          <div>
            <p class="donor-name">${medal}${item.name}</p>
            <p class="donor-rank mb-0">Top #${item.rank}</p>
          </div>
        </div>
        <div class="donor-meta">
          <span class="donor-amount">${formatMoney(item.amount)}</span>
          ${item.date ? `<span class="donor-date"><i class="fa-regular fa-calendar"></i> ${item.date}</span>` : ''}
        </div>
      </div>
    </article>
  `;
}

/* ===== Rendering ===== */
function renderTop() {
  // Top 3 always sorted by amount (descending), independent of user sort choice
  const topByAmount = sortDonors(state.filtered, 'amount-desc').slice(0, 3);
  els.topList.innerHTML = '';

  if (!topByAmount.length) {
    els.topList.innerHTML = '<div class="col-12"><div class="empty-state">Chưa có donor để hiển thị.</div></div>';
    return;
  }

  const fragment = document.createDocumentFragment();
  topByAmount.forEach((item, i) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-md-4';
    col.innerHTML = buildCard(item, true, i);
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
  chunk.forEach((item, i) => {
    const col = document.createElement('div');
    col.className = 'col-12 col-sm-6 col-xl-4';
    col.innerHTML = buildCard(item, false, i);
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

/* ===== Filter & Sort ===== */
function applyFilter() {
  const q = state.query;
  let list = state.donors;

  if (q) {
    list = list.filter((d) => d.name.toLowerCase().includes(q));
  }

  state.filtered = sortDonors(list, state.sortBy);

  renderTop();
  resetListAndRender();
}

/* ===== Debounce ===== */
function debounce(fn, delay = 180) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ===== Infinite Scroll ===== */
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

/* ===== Skeleton ===== */
function showSkeleton() {
  if (els.skeleton) els.skeleton.classList.remove('d-none');
}

function hideSkeleton() {
  if (els.skeleton) els.skeleton.classList.add('d-none');
}

/* ===== Scroll to Top ===== */
function setupScrollToTop() {
  if (!els.scrollTopBtn) return;

  const toggle = () => {
    els.scrollTopBtn.classList.toggle('hidden', window.scrollY < 400);
  };

  window.addEventListener('scroll', toggle, { passive: true });
  toggle();

  els.scrollTopBtn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ===== Data Loading ===== */
async function loadData() {
  showSkeleton();

  try {
    const res = await fetch('./data/donors.json');
    if (!res.ok) throw new Error('Fetch failed');

    const raw = await res.json();
    state.donors = normalizeDonors(Array.isArray(raw) ? raw : []);
    state.filtered = sortDonors(state.donors, state.sortBy);

    const totalAmount = state.donors.reduce((sum, item) => sum + item.amount, 0);
    els.supporterCount.textContent = String(state.donors.length);
    animateCount(els.totalAmount, totalAmount);

    hideSkeleton();
    renderTop();
    resetListAndRender();
  } catch (err) {
    console.error(err);
    hideSkeleton();
    els.topList.innerHTML = '<div class="col-12"><div class="empty-state">Không tải được dữ liệu donor.</div></div>';
    els.donorList.innerHTML = '';
    els.emptyState.classList.remove('d-none');
    els.resultCount.textContent = '0 kết quả';
    els.loadZone.classList.add('d-none');
  }
}

/* ===== Events ===== */
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

  if (els.sortSelect) {
    els.sortSelect.addEventListener('change', (e) => {
      state.sortBy = e.target.value;
      applyFilter();
    });
  }

  els.loadMoreBtn.addEventListener('click', appendNextBatch);
}

/* ===== Init ===== */
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();
  setupInfiniteScroll();
  setupScrollToTop();
  loadData();
});
