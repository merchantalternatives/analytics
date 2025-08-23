let clickstreamData = [];
let shortlinksData = [];
let selectedUrl = null;
let detailCharts = {};
let currentPage = 1;
const clicksPerPage = 10;

// Load data on page load
window.addEventListener('DOMContentLoaded', () => {
    console.log('Loading CSV files for URL analysis...');
    
    Promise.all([
        fetch('data/clickstream.csv')
            .then(r => {
                if (!r.ok) throw new Error('Failed to load clickstream.csv');
                return r.text();
            }),
        fetch('data/shortlinks.csv')
            .then(r => {
                if (!r.ok) throw new Error('Failed to load shortlinks.csv');
                return r.text();
            })
    ]).then(([clickstreamText, shortlinksText]) => {
        // Parse clickstream data
        Papa.parse(clickstreamText, {
            header: true,
            complete: function(results) {
                clickstreamData = results.data.filter(row => row['Short link']);
                console.log('Loaded clickstream data:', clickstreamData.length, 'rows');
                
                // Parse shortlinks data
                Papa.parse(shortlinksText, {
                    header: true,
                    complete: function(results) {
                        shortlinksData = results.data.filter(row => row.short_url);
                        console.log('Loaded shortlinks data:', shortlinksData.length, 'rows');
                        
                        // Initialize the page
                        renderUrlCards();
                    }
                });
            }
        });
    }).catch(error => {
        console.error('Error loading CSV files:', error);
    });
});

// Event listeners
document.getElementById('search').addEventListener('input', renderUrlCards);
document.getElementById('sort').addEventListener('change', renderUrlCards);
document.getElementById('filter-type').addEventListener('change', renderUrlCards);
if (document.getElementById('time-filter')) {
    document.getElementById('time-filter').addEventListener('change', renderUrlCards);
}

function isAffiliate(url) {
    if (!url) return false;
    const affiliatePatterns = [
        'tag=',
        'irclickid=',
        'irgwc=',
        'partner=',
        'affpt=',
        'utm_channel=affiliates',
        'utm_source=',
        'iradid='
    ];
    return affiliatePatterns.some(pattern => url.includes(pattern));
}

function parseDate(dateStr, timeStr) {
    const [month, day, year] = dateStr.split('/');
    const [time, period] = timeStr.split(' ');
    const [hours, minutes, seconds] = time.split(':');
    
    let hour = parseInt(hours);
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    
    return new Date(year, month - 1, day, hour, minutes, seconds);
}

function filterDataByTime(data, days) {
    if (days === 'all') return data;
    
    const now = new Date();
    const cutoff = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000));
    
    return data.filter(row => {
        const clickDate = parseDate(row.Date, row.Time);
        return clickDate >= cutoff;
    });
}

function getUrlStats(shortUrl, timeFilter = 'all') {
    let clicks = clickstreamData.filter(click => click['Short link'] === shortUrl);
    
    // Apply time filter
    if (timeFilter !== 'all') {
        clicks = filterDataByTime(clicks, timeFilter);
    }
    
    const stats = {
        totalClicks: clicks.length,
        uniqueCountries: new Set(clicks.map(c => c.Country || 'Unknown')).size,
        uniqueBrowsers: new Set(clicks.map(c => c.Browser || 'Unknown')).size,
        sources: {},
        lastClick: null
    };
    
    clicks.forEach(click => {
        const source = click['UTM medium'] || 'Direct/Unknown';
        stats.sources[source] = (stats.sources[source] || 0) + 1;
        
        const clickDate = parseDate(click.Date, click.Time);
        if (!stats.lastClick || clickDate > stats.lastClick) {
            stats.lastClick = clickDate;
        }
    });
    
    stats.topSource = Object.entries(stats.sources)
        .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
    
    return stats;
}

function renderUrlCards() {
    const searchTerm = document.getElementById('search').value.toLowerCase();
    const sortBy = document.getElementById('sort').value;
    const filterType = document.getElementById('filter-type').value;
    const timeFilter = document.getElementById('time-filter') ? document.getElementById('time-filter').value : 'all';
    
    // Filter shortlinks
    let filteredLinks = shortlinksData.filter(link => {
        // Search filter
        const matchesSearch = !searchTerm || 
            link.name.toLowerCase().includes(searchTerm) ||
            link.short_url.toLowerCase().includes(searchTerm);
        
        // Type filter
        const isAff = isAffiliate(link.original_url);
        const matchesType = filterType === 'all' ||
            (filterType === 'affiliate' && isAff) ||
            (filterType === 'non-affiliate' && !isAff);
        
        return matchesSearch && matchesType;
    });
    
    // Add stats to each link
    filteredLinks = filteredLinks.map(link => ({
        ...link,
        stats: getUrlStats(link.short_url, timeFilter)
    }));
    
    // Sort links
    filteredLinks.sort((a, b) => {
        switch(sortBy) {
            case 'clicks-desc':
                return b.stats.totalClicks - a.stats.totalClicks;
            case 'clicks-asc':
                return a.stats.totalClicks - b.stats.totalClicks;
            case 'name-asc':
                return a.name.localeCompare(b.name);
            case 'name-desc':
                return b.name.localeCompare(a.name);
            case 'recent':
                const aTime = a.stats.lastClick?.getTime() || 0;
                const bTime = b.stats.lastClick?.getTime() || 0;
                return bTime - aTime;
            default:
                return 0;
        }
    });
    
    // Render cards
    const grid = document.getElementById('url-grid');
    grid.innerHTML = '';
    
    filteredLinks.forEach(link => {
        const card = createUrlCard(link);
        grid.appendChild(card);
    });
    
    if (filteredLinks.length === 0) {
        grid.innerHTML = '<div style="color: white; text-align: center; grid-column: 1 / -1; font-size: 1.2rem;">No URLs match your filters</div>';
    }
}

function createUrlCard(link) {
    const card = document.createElement('div');
    card.className = 'url-card';
    if (selectedUrl === link.short_url) {
        card.classList.add('selected');
    }
    
    const isAff = isAffiliate(link.original_url);
    const stats = link.stats;
    
    card.innerHTML = `
        <div class="url-name">${link.name || 'Unnamed Link'}</div>
        <div class="url-link">${link.short_url}</div>
        <div class="url-stats">
            <div class="url-stat">
                <span class="url-stat-label">Total Clicks:</span>
                <span class="url-stat-value">${stats.totalClicks.toLocaleString()}</span>
            </div>
            <div class="url-stat">
                <span class="url-stat-label">Countries:</span>
                <span class="url-stat-value">${stats.uniqueCountries}</span>
            </div>
            <div class="url-stat">
                <span class="url-stat-label">Top Source:</span>
                <span class="url-stat-value">${stats.topSource}</span>
            </div>
            <div class="url-stat">
                <span class="url-stat-label">Browsers:</span>
                <span class="url-stat-value">${stats.uniqueBrowsers}</span>
            </div>
        </div>
        <div class="affiliate-badge ${isAff ? 'affiliate-yes' : 'affiliate-no'}">
            ${isAff ? '💰 Affiliate Link' : '🔗 Regular Link'}
        </div>
    `;
    
    card.addEventListener('click', (e) => showUrlDetail(link, e));
    
    return card;
}

function showUrlDetail(link, clickEvent) {
    selectedUrl = link.short_url;
    currentPage = 1;
    
    // Update selected card styling
    document.querySelectorAll('.url-card').forEach(card => {
        card.classList.remove('selected');
    });
    if (clickEvent && clickEvent.currentTarget) {
        clickEvent.currentTarget.classList.add('selected');
    }
    
    // Show detail panel
    const panel = document.getElementById('detail-panel');
    panel.classList.add('active');
    
    // Update header
    document.getElementById('detail-title').textContent = link.name || 'Unnamed Link';
    document.getElementById('detail-short-url').textContent = link.short_url;
    document.getElementById('detail-original-url').textContent = 'Target: ' + link.original_url;
    
    // Get time filter
    const timeFilter = document.getElementById('time-filter') ? document.getElementById('time-filter').value : 'all';
    
    // Get clicks for this URL and apply time filter
    let clicks = clickstreamData.filter(click => click['Short link'] === link.short_url);
    if (timeFilter !== 'all') {
        clicks = filterDataByTime(clicks, timeFilter);
    }
    
    // Update stats
    updateDetailStats(clicks, link);
    
    // Update charts
    updateDetailCharts(clicks);
    
    // Update clicks table
    updateClicksTable(clicks);
    
    // Scroll to detail panel
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function closeDetail() {
    selectedUrl = null;
    document.getElementById('detail-panel').classList.remove('active');
    document.querySelectorAll('.url-card').forEach(card => {
        card.classList.remove('selected');
    });
}

function updateDetailStats(clicks, link) {
    const isAff = isAffiliate(link.original_url);
    const humanClicks = clicks.filter(c => c['Is human'] === 'true').length;
    const botClicks = clicks.length - humanClicks;
    const humanRate = clicks.length > 0 ? ((humanClicks / clicks.length) * 100).toFixed(1) : 0;
    
    // Calculate unique metrics
    const uniqueIPs = new Set(clicks.map(c => c.IP)).size;
    const uniqueCountries = new Set(clicks.map(c => c.Country || 'Unknown')).size;
    const uniqueCities = new Set(clicks.map(c => c.City || 'Unknown')).size;
    
    const statsHTML = `
        <div class="detail-stat-card">
            <div class="detail-stat-value">${clicks.length.toLocaleString()}</div>
            <div class="detail-stat-label">Total Clicks</div>
        </div>
        <div class="detail-stat-card">
            <div class="detail-stat-value">${uniqueIPs.toLocaleString()}</div>
            <div class="detail-stat-label">Unique IPs</div>
        </div>
        <div class="detail-stat-card">
            <div class="detail-stat-value">${humanClicks.toLocaleString()}</div>
            <div class="detail-stat-label">Human Clicks</div>
        </div>
        <div class="detail-stat-card">
            <div class="detail-stat-value">${humanRate}%</div>
            <div class="detail-stat-label">Human Rate</div>
        </div>
        <div class="detail-stat-card">
            <div class="detail-stat-value">${uniqueCountries}</div>
            <div class="detail-stat-label">Countries</div>
        </div>
        <div class="detail-stat-card">
            <div class="detail-stat-value">${uniqueCities}</div>
            <div class="detail-stat-label">Cities</div>
        </div>
        <div class="detail-stat-card">
            <div class="detail-stat-value" style="color: ${isAff ? '#0e7c3a' : '#c41e3a'}">
                ${isAff ? 'Yes' : 'No'}
            </div>
            <div class="detail-stat-label">Affiliate</div>
        </div>
        <div class="detail-stat-card">
            <div class="detail-stat-value">${botClicks}</div>
            <div class="detail-stat-label">Bot Clicks</div>
        </div>
    `;
    
    document.getElementById('detail-stats').innerHTML = statsHTML;
}

function updateDetailCharts(clicks) {
    // Timeline chart
    updateDetailTimelineChart(clicks);
    
    // Source chart
    updateDetailSourceChart(clicks);
    
    // Country chart
    updateDetailCountryChart(clicks);
    
    // Browser chart
    updateDetailBrowserChart(clicks);
}

function updateDetailTimelineChart(clicks) {
    const ctx = document.getElementById('detail-timeline-chart').getContext('2d');
    
    // Group clicks by date
    const clicksByDate = {};
    clicks.forEach(click => {
        const date = click.Date;
        clicksByDate[date] = (clicksByDate[date] || 0) + 1;
    });
    
    // Sort dates
    const sortedDates = Object.keys(clicksByDate).sort((a, b) => {
        const dateA = parseDate(a, '12:00:00 PM');
        const dateB = parseDate(b, '12:00:00 PM');
        return dateA - dateB;
    });
    
    const data = sortedDates.map(date => clicksByDate[date]);
    
    if (detailCharts.timeline) {
        detailCharts.timeline.destroy();
    }
    
    detailCharts.timeline = new Chart(ctx, {
        type: 'line',
        data: {
            labels: sortedDates,
            datasets: [{
                label: 'Clicks',
                data: data,
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function updateDetailSourceChart(clicks) {
    const ctx = document.getElementById('detail-source-chart').getContext('2d');
    
    // Group by UTM medium
    const sources = {};
    clicks.forEach(click => {
        const medium = click['UTM medium'] || 'Direct/Unknown';
        sources[medium] = (sources[medium] || 0) + 1;
    });
    
    // Sort and take top 10
    const sortedSources = Object.entries(sources)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (detailCharts.source) {
        detailCharts.source.destroy();
    }
    
    detailCharts.source = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: sortedSources.map(s => s[0]),
            datasets: [{
                data: sortedSources.map(s => s[1]),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#fda085',
                    '#84fab0',
                    '#8fd3f4',
                    '#a8edea',
                    '#fed6e3',
                    '#ffeaa7',
                    '#dfe6e9'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function updateDetailCountryChart(clicks) {
    const ctx = document.getElementById('detail-country-chart').getContext('2d');
    
    // Group by country
    const countries = {};
    clicks.forEach(click => {
        const country = click.Country || 'Unknown';
        countries[country] = (countries[country] || 0) + 1;
    });
    
    // Sort and take top 10
    const sortedCountries = Object.entries(countries)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);
    
    if (detailCharts.country) {
        detailCharts.country.destroy();
    }
    
    detailCharts.country = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedCountries.map(c => c[0]),
            datasets: [{
                label: 'Clicks',
                data: sortedCountries.map(c => c[1]),
                backgroundColor: '#764ba2',
                borderRadius: 5
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                },
                x: {
                    ticks: {
                        maxRotation: 45,
                        minRotation: 45
                    }
                }
            }
        }
    });
}

function updateDetailBrowserChart(clicks) {
    const ctx = document.getElementById('detail-browser-chart').getContext('2d');
    
    // Group by browser
    const browsers = {};
    clicks.forEach(click => {
        const browser = click.Browser || 'Unknown';
        browsers[browser] = (browsers[browser] || 0) + 1;
    });
    
    // Sort and take all
    const sortedBrowsers = Object.entries(browsers)
        .sort((a, b) => b[1] - a[1]);
    
    if (detailCharts.browser) {
        detailCharts.browser.destroy();
    }
    
    detailCharts.browser = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: sortedBrowsers.map(b => b[0]),
            datasets: [{
                data: sortedBrowsers.map(b => b[1]),
                backgroundColor: [
                    '#667eea',
                    '#764ba2',
                    '#f093fb',
                    '#fda085',
                    '#84fab0',
                    '#8fd3f4',
                    '#a8edea',
                    '#fed6e3',
                    '#ffeaa7',
                    '#dfe6e9'
                ]
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        padding: 10,
                        font: {
                            size: 11
                        }
                    }
                }
            }
        }
    });
}

function updateClicksTable(clicks) {
    // Sort clicks by date (most recent first)
    const sortedClicks = [...clicks].sort((a, b) => {
        const dateA = parseDate(a.Date, a.Time);
        const dateB = parseDate(b.Date, b.Time);
        return dateB - dateA;
    });
    
    // Paginate
    const startIdx = (currentPage - 1) * clicksPerPage;
    const endIdx = startIdx + clicksPerPage;
    const pageClicks = sortedClicks.slice(startIdx, endIdx);
    
    // Render table
    const tbody = document.querySelector('#clicks-table tbody');
    tbody.innerHTML = '';
    
    pageClicks.forEach(click => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${click.Date} ${click.Time}</td>
            <td>${click.Country || 'Unknown'}</td>
            <td>${click.City || 'Unknown'}</td>
            <td>${click.Browser || 'Unknown'}</td>
            <td>${click['UTM medium'] || 'Direct/Unknown'}</td>
            <td>${click.Referrer || '-'}</td>
        `;
    });
    
    // Update pagination
    updatePagination(sortedClicks.length);
}

function updatePagination(totalClicks) {
    const totalPages = Math.ceil(totalClicks / clicksPerPage);
    const pagination = document.getElementById('pagination');
    pagination.innerHTML = '';
    
    if (totalPages <= 1) return;
    
    // Previous button
    if (currentPage > 1) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'page-btn';
        prevBtn.textContent = '← Previous';
        prevBtn.onclick = () => {
            currentPage--;
            const timeFilter = document.getElementById('time-filter') ? document.getElementById('time-filter').value : 'all';
            let clicks = clickstreamData.filter(click => click['Short link'] === selectedUrl);
            if (timeFilter !== 'all') {
                clicks = filterDataByTime(clicks, timeFilter);
            }
            updateClicksTable(clicks);
        };
        pagination.appendChild(prevBtn);
    }
    
    // Page numbers
    for (let i = 1; i <= Math.min(totalPages, 5); i++) {
        const pageBtn = document.createElement('button');
        pageBtn.className = 'page-btn';
        if (i === currentPage) pageBtn.classList.add('active');
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
            currentPage = i;
            const timeFilter = document.getElementById('time-filter') ? document.getElementById('time-filter').value : 'all';
            let clicks = clickstreamData.filter(click => click['Short link'] === selectedUrl);
            if (timeFilter !== 'all') {
                clicks = filterDataByTime(clicks, timeFilter);
            }
            updateClicksTable(clicks);
        };
        pagination.appendChild(pageBtn);
    }
    
    // Next button
    if (currentPage < totalPages) {
        const nextBtn = document.createElement('button');
        nextBtn.className = 'page-btn';
        nextBtn.textContent = 'Next →';
        nextBtn.onclick = () => {
            currentPage++;
            const timeFilter = document.getElementById('time-filter') ? document.getElementById('time-filter').value : 'all';
            let clicks = clickstreamData.filter(click => click['Short link'] === selectedUrl);
            if (timeFilter !== 'all') {
                clicks = filterDataByTime(clicks, timeFilter);
            }
            updateClicksTable(clicks);
        };
        pagination.appendChild(nextBtn);
    }
}