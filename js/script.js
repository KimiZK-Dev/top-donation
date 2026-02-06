// State Management
let allDonors = [];
let filteredDonors = [];
let currentPage = 1;
const ITEMS_PER_PAGE = 20;

// Debounce utility
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Format currency
function formatCurrency(amount) {
    return amount.toLocaleString('vi-VN') + '₫';
}

// Animate counting up
function animateValue(element, start, end, duration) {
    const startTimestamp = performance.now();
    const step = (timestamp) => {
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        const current = Math.floor(progress * (end - start) + start);
        element.textContent = formatCurrency(current);
        if (progress < 1) {
            requestAnimationFrame(step);
        }
    };
    requestAnimationFrame(step);
}

// Calculate and display total donation
function updateTotalDonation(donors) {
    const totalAmount = donors.reduce((sum, donor) => sum + donor.amount, 0);
    const totalElement = document.getElementById('totalAmount');
    if (totalElement) {
        animateValue(totalElement, 0, totalAmount, 1500);
    }
}

// Show/Hide loading states
function setLoading(isLoading) {
    const podiumContainer = document.getElementById('podiumContainer');
    const tableBody = document.getElementById('tableBody');

    if (isLoading) {
        // Show skeleton loading
        if (podiumContainer) {
            podiumContainer.innerHTML = `
                <div class="skeleton-podium">
                    <div class="skeleton-item rank-2">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-stand"></div>
                    </div>
                    <div class="skeleton-item rank-1">
                        <div class="skeleton-avatar large"></div>
                        <div class="skeleton-stand tall"></div>
                    </div>
                    <div class="skeleton-item rank-3">
                        <div class="skeleton-avatar"></div>
                        <div class="skeleton-stand short"></div>
                    </div>
                </div>
            `;
        }
        if (tableBody) {
            tableBody.innerHTML = `
                <tr class="skeleton-row">
                    <td><div class="skeleton-text small"></div></td>
                    <td><div class="skeleton-cell"><div class="skeleton-avatar-small"></div><div class="skeleton-text"></div></div></td>
                    <td><div class="skeleton-text"></div></td>
                </tr>
                <tr class="skeleton-row">
                    <td><div class="skeleton-text small"></div></td>
                    <td><div class="skeleton-cell"><div class="skeleton-avatar-small"></div><div class="skeleton-text"></div></div></td>
                    <td><div class="skeleton-text"></div></td>
                </tr>
                <tr class="skeleton-row">
                    <td><div class="skeleton-text small"></div></td>
                    <td><div class="skeleton-cell"><div class="skeleton-avatar-small"></div><div class="skeleton-text"></div></div></td>
                    <td><div class="skeleton-text"></div></td>
                </tr>
            `;
        }
    }
}

// Show empty state
function showEmptyState(searchTerm) {
    const emptyState = document.getElementById('emptyState');
    const emptySearchTerm = document.getElementById('emptySearchTerm');
    const tableBody = document.getElementById('tableBody');
    const table = document.querySelector('.leaderboard-table');

    if (emptyState && emptySearchTerm) {
        emptySearchTerm.textContent = searchTerm;
        emptyState.style.display = 'block';
        if (table) table.style.display = 'none';
    }
}

// Hide empty state
function hideEmptyState() {
    const emptyState = document.getElementById('emptyState');
    const table = document.querySelector('.leaderboard-table');

    if (emptyState) {
        emptyState.style.display = 'none';
        if (table) table.style.display = 'table';
    }
}

// Fetch Data
async function fetchDonors() {
    setLoading(true);

    try {
        const response = await fetch('./data/donors.json');
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        const data = await response.json();
        // Sort donors by amount descending
        data.sort((a, b) => b.amount - a.amount);

        allDonors = data;
        filteredDonors = data;

        // Simulate loading for better UX (remove in production if not needed)
        await new Promise(resolve => setTimeout(resolve, 500));

        // Initial render
        updateTotalDonation(allDonors);
        renderPodium(allDonors);
        renderTable();
    } catch (error) {
        console.error('Error fetching donors:', error);
        showErrorState();
    }
}

// Show error state
function showErrorState() {
    const podiumContainer = document.getElementById('podiumContainer');
    if (podiumContainer) {
        podiumContainer.innerHTML = `
            <div class="empty-state" style="padding: 40px;">
                <div class="empty-icon">⚠️</div>
                <h3 class="empty-title">Không thể tải dữ liệu</h3>
                <p class="empty-text">Vui lòng thử lại sau</p>
                <button onclick="location.reload()" 
                    style="margin-top: 20px; padding: 10px 25px; background: var(--primary-color); 
                    border: none; border-radius: 20px; cursor: pointer; font-weight: 700;">
                    Thử lại
                </button>
            </div>
        `;
    }
}

// Render Podium (Always Top 3 from Global List)
function renderPodium(donors) {
    const container = document.getElementById('podiumContainer');
    if (!container) return;

    container.innerHTML = ''; // Clear previous content
    const top3 = donors.slice(0, 3);

    if (top3.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">🏆</div>
                <h3 class="empty-title">Chưa có người ủng hộ</h3>
                <p class="empty-text">Hãy là người đầu tiên!</p>
            </div>
        `;
        return;
    }

    top3.forEach((donor, index) => {
        const rank = index + 1;

        const socialHtml = getSocialHtml(donor);

        const podiumHTML = `
            <div class="podium-item rank-${rank}">
                <div class="avatar-section">
                    ${rank === 1 ? '<div class="crown-badge">👑</div>' : ''}
                    ${rank === 1 ? '<div class="wings wing-left">🪽</div>' : ''}
                    <div class="podium-avatar-wrapper">
                        <img src="${donor.avatar}" alt="${donor.name}" class="podium-avatar" 
                             onerror="this.src='https://via.placeholder.com/150?text=Avatar'">
                    </div>
                    ${rank === 1 ? '<div class="wings wing-right">🪽</div>' : ''}
                </div>
                <div class="podium-stand">
                    <div class="donor-name">${donor.name}</div>
                    ${socialHtml}
                    <div class="donation-amount">${formatCurrency(donor.amount)}</div>
                </div>
            </div>
        `;
        container.innerHTML += podiumHTML;
    });
}

// Render Table with Pagination
function renderTable() {
    const tbody = document.getElementById('tableBody');
    if (!tbody) return;

    tbody.innerHTML = ''; // Clear previous content
    hideEmptyState();

    const searchInput = document.getElementById('searchInput');
    const isSearching = searchInput && searchInput.value.trim().length > 0;
    const searchTerm = searchInput ? searchInput.value.trim() : '';

    let displayList = filteredDonors;
    let rankOffset = 0;

    if (!isSearching) {
        displayList = filteredDonors.slice(3); // Skip top 3
        rankOffset = 3;
    }

    // Check for empty results when searching
    if (isSearching && displayList.length === 0) {
        showEmptyState(searchTerm);
        renderPaginationControl(0);
        return;
    }

    const totalPages = Math.ceil(displayList.length / ITEMS_PER_PAGE);
    if (currentPage > totalPages) currentPage = Math.max(1, totalPages);
    if (displayList.length === 0) currentPage = 1;

    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    const end = start + ITEMS_PER_PAGE;
    const pageItems = displayList.slice(start, end);

    if (pageItems.length === 0 && !isSearching) {
        tbody.innerHTML = `
            <tr>
                <td colspan="3" style="text-align: center; padding: 40px; opacity: 0.7;">
                    <div style="font-size: 2rem; margin-bottom: 10px;">📋</div>
                    Chỉ có ${allDonors.length} người ủng hộ
                </td>
            </tr>
        `;
        renderPaginationControl(0);
        return;
    }

    pageItems.forEach((donor, index) => {
        const globalRank = allDonors.indexOf(donor) + 1;
        const socialHtml = getSocialHtml(donor);

        const row = document.createElement('tr');
        row.style.animation = `fadeIn 0.3s ease-out ${index * 0.05}s backwards`;
        row.innerHTML = `
            <td class="rank-cell">#${globalRank}</td>
            <td>
                <div class="name-cell">
                    <img src="${donor.avatar}" alt="${donor.name}" class="table-avatar"
                         onerror="this.src='https://via.placeholder.com/40?text=A'">
                    <div class="name-info">
                        <span class="doner-name-text">${donor.name}</span>
                        ${socialHtml}
                    </div>
                </div>
            </td>
            <td class="amount-cell">${formatCurrency(donor.amount)}</td>
        `;
        tbody.appendChild(row);
    });

    renderPaginationControl(displayList.length);
}

// Generate Social HTML (Reuse for Podium and Table)
function getSocialHtml(donor) {
    if (donor.type === 'social' && donor.username) {
        let iconClass = 'fa-tiktok';
        let link = donor.social_link || '#';
        if (link.includes('facebook')) iconClass = 'fa-facebook';
        else if (link.includes('instagram')) iconClass = 'fa-instagram';
        else if (link.includes('youtube')) iconClass = 'fa-youtube';

        return `
            <a href="${link}" target="_blank" rel="noopener noreferrer" class="social-info">
                <i class="fa-brands ${iconClass} social-icon"></i>
                <span class="social-username">${donor.username}</span>
            </a>
        `;
    }
    return '';
}

// Render Pagination Controls
function renderPaginationControl(totalItems) {
    const totalPages = Math.ceil(totalItems / ITEMS_PER_PAGE);
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageInfo = document.getElementById('pageInfo');
    const paginationContainer = document.getElementById('paginationContainer');

    if (!pageInfo) return;

    // Hide pagination if only 1 page or no items
    if (paginationContainer) {
        paginationContainer.style.display = totalItems <= ITEMS_PER_PAGE ? 'none' : 'flex';
    }

    if (totalItems === 0) {
        pageInfo.textContent = `Trang 0 / 0`;
        if (prevBtn) prevBtn.disabled = true;
        if (nextBtn) nextBtn.disabled = true;
        return;
    }

    pageInfo.textContent = `Trang ${currentPage} / ${totalPages}`;
    if (prevBtn) prevBtn.disabled = currentPage === 1;
    if (nextBtn) nextBtn.disabled = currentPage === totalPages;
}

// Search Handler (debounced)
const handleSearch = debounce((e) => {
    const term = e.target.value.toLowerCase().trim();
    const clearBtn = document.getElementById('searchClear');

    // Show/hide clear button
    if (clearBtn) {
        clearBtn.style.display = term.length > 0 ? 'block' : 'none';
    }

    if (!term) {
        filteredDonors = allDonors;
    } else {
        filteredDonors = allDonors.filter(donor =>
            donor.name.toLowerCase().includes(term) ||
            (donor.username && donor.username.toLowerCase().includes(term))
        );
    }

    currentPage = 1;
    renderTable();
}, 300);

// Clear search
function clearSearch() {
    const searchInput = document.getElementById('searchInput');
    const clearBtn = document.getElementById('searchClear');

    if (searchInput) {
        searchInput.value = '';
        searchInput.focus();
    }
    if (clearBtn) {
        clearBtn.style.display = 'none';
    }

    filteredDonors = allDonors;
    currentPage = 1;
    renderTable();
}

// Pagination Handlers
function changePage(delta) {
    currentPage += delta;
    renderTable();

    // Scroll to table smoothly
    const tableWrapper = document.querySelector('.leaderboard-table-wrapper');
    if (tableWrapper) {
        tableWrapper.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    fetchDonors();

    // Search listener
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }

    // Clear search button
    const clearBtn = document.getElementById('searchClear');
    if (clearBtn) {
        clearBtn.addEventListener('click', clearSearch);
    }

    // Button listeners
    document.getElementById('prevBtn')?.addEventListener('click', () => changePage(-1));
    document.getElementById('nextBtn')?.addEventListener('click', () => changePage(1));

    // Keyboard navigation
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            clearSearch();
        }
    });
});
