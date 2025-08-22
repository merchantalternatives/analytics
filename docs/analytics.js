let clickstreamData = [];
let shortlinksData = [];
let charts = {};

document.getElementById('clickstream-file').addEventListener('change', handleClickstreamUpload);
document.getElementById('shortlinks-file').addEventListener('change', handleShortlinksUpload);
document.getElementById('time-filter').addEventListener('change', updateDashboard);
document.getElementById('medium-filter').addEventListener('change', updateDashboard);
document.getElementById('affiliate-filter').addEventListener('change', updateDashboard);

function handleClickstreamUpload(event) {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            complete: function(results) {
                clickstreamData = results.data.filter(row => row['Short link']);
                console.log('Loaded clickstream data:', clickstreamData.length, 'rows');
                updateMediumFilter();
                if (shortlinksData.length > 0) {
                    updateDashboard();
                }
            }
        });
    }
}

function handleShortlinksUpload(event) {
    const file = event.target.files[0];
    if (file) {
        Papa.parse(file, {
            header: true,
            complete: function(results) {
                shortlinksData = results.data.filter(row => row.short_url);
                console.log('Loaded shortlinks data:', shortlinksData.length, 'rows');
                if (clickstreamData.length > 0) {
                    updateDashboard();
                }
            }
        });
    }
}

function updateMediumFilter() {
    const mediums = new Set(['all']);
    clickstreamData.forEach(row => {
        if (row['UTM medium'] && row['UTM medium'] !== '') {
            mediums.add(row['UTM medium']);
        }
    });
    
    const select = document.getElementById('medium-filter');
    select.innerHTML = '<option value="all">All Sources</option>';
    Array.from(mediums).sort().forEach(medium => {
        if (medium !== 'all') {
            const option = document.createElement('option');
            option.value = medium;
            option.textContent = medium;
            select.appendChild(option);
        }
    });
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

function updateDashboard() {
    if (clickstreamData.length === 0 || shortlinksData.length === 0) {
        return;
    }
    
    const timeFilter = document.getElementById('time-filter').value;
    const mediumFilter = document.getElementById('medium-filter').value;
    const affiliateFilter = document.getElementById('affiliate-filter').value;
    
    // Create lookup map for shortlinks
    const shortlinkMap = {};
    shortlinksData.forEach(link => {
        shortlinkMap[link.short_url] = link;
    });
    
    // Filter relevant clicks (only those in shortlinks)
    let relevantClicks = clickstreamData.filter(click => {
        const shortUrl = click['Short link'];
        return shortlinkMap[shortUrl];
    });
    
    // Apply time filter
    relevantClicks = filterDataByTime(relevantClicks, timeFilter);
    
    // Apply medium filter
    if (mediumFilter !== 'all') {
        relevantClicks = relevantClicks.filter(click => 
            click['UTM medium'] === mediumFilter
        );
    }
    
    // Apply affiliate filter
    if (affiliateFilter !== 'all') {
        relevantClicks = relevantClicks.filter(click => {
            const shortUrl = click['Short link'];
            const linkInfo = shortlinkMap[shortUrl];
            const isAff = isAffiliate(linkInfo.original_url);
            return affiliateFilter === 'affiliate' ? isAff : !isAff;
        });
    }
    
    // Update statistics
    updateStatistics(relevantClicks, shortlinkMap);
    
    // Update charts
    updateTimelineChart(relevantClicks);
    updateSourceChart(relevantClicks);
    updateBrowserChart(relevantClicks);
    updateCountryChart(relevantClicks);
    
    // Update table
    updateLinksTable(relevantClicks, shortlinkMap);
}

function updateStatistics(clicks, shortlinkMap) {
    const totalClicks = clicks.length;
    const uniqueLinks = new Set(clicks.map(c => c['Short link'])).size;
    const affiliateClicks = clicks.filter(click => {
        const linkInfo = shortlinkMap[click['Short link']];
        return isAffiliate(linkInfo.original_url);
    }).length;
    
    const affiliateRate = totalClicks > 0 ? ((affiliateClicks / totalClicks) * 100).toFixed(1) : 0;
    
    document.getElementById('total-clicks').textContent = totalClicks.toLocaleString();
    document.getElementById('unique-links').textContent = uniqueLinks.toLocaleString();
    document.getElementById('affiliate-clicks').textContent = affiliateClicks.toLocaleString();
    document.getElementById('conversion-rate').textContent = affiliateRate + '%';
}

function updateTimelineChart(clicks) {
    const ctx = document.getElementById('timeline-chart').getContext('2d');
    
    // Group clicks by date
    const clicksByDate = {};
    clicks.forEach(click => {
        const date = click.Date;
        clicksByDate[date] = (clicksByDate[date] || 0) + 1;
    });
    
    // Sort dates and prepare data
    const sortedDates = Object.keys(clicksByDate).sort((a, b) => {
        const dateA = parseDate(a, '12:00:00 PM');
        const dateB = parseDate(b, '12:00:00 PM');
        return dateA - dateB;
    });
    
    const data = sortedDates.map(date => clicksByDate[date]);
    
    if (charts.timeline) {
        charts.timeline.destroy();
    }
    
    charts.timeline = new Chart(ctx, {
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

function updateSourceChart(clicks) {
    const ctx = document.getElementById('source-chart').getContext('2d');
    
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
    
    if (charts.source) {
        charts.source.destroy();
    }
    
    charts.source = new Chart(ctx, {
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
                    position: 'right'
                }
            }
        }
    });
}

function updateBrowserChart(clicks) {
    const ctx = document.getElementById('browser-chart').getContext('2d');
    
    // Group by browser
    const browsers = {};
    clicks.forEach(click => {
        const browser = click.Browser || 'Unknown';
        browsers[browser] = (browsers[browser] || 0) + 1;
    });
    
    // Sort and take top 8
    const sortedBrowsers = Object.entries(browsers)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8);
    
    if (charts.browser) {
        charts.browser.destroy();
    }
    
    charts.browser = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: sortedBrowsers.map(b => b[0]),
            datasets: [{
                label: 'Clicks',
                data: sortedBrowsers.map(b => b[1]),
                backgroundColor: '#667eea',
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
                }
            }
        }
    });
}

function updateCountryChart(clicks) {
    const ctx = document.getElementById('country-chart').getContext('2d');
    
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
    
    if (charts.country) {
        charts.country.destroy();
    }
    
    charts.country = new Chart(ctx, {
        type: 'horizontalBar',
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
            indexAxis: 'y',
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function updateLinksTable(clicks, shortlinkMap) {
    // Group clicks by short URL
    const linkStats = {};
    
    clicks.forEach(click => {
        const shortUrl = click['Short link'];
        if (!linkStats[shortUrl]) {
            linkStats[shortUrl] = {
                clicks: 0,
                sources: {},
                countries: {}
            };
        }
        linkStats[shortUrl].clicks++;
        
        const source = click['UTM medium'] || 'Direct/Unknown';
        linkStats[shortUrl].sources[source] = (linkStats[shortUrl].sources[source] || 0) + 1;
        
        const country = click.Country || 'Unknown';
        linkStats[shortUrl].countries[country] = (linkStats[shortUrl].countries[country] || 0) + 1;
    });
    
    // Sort by clicks
    const sortedLinks = Object.entries(linkStats)
        .sort((a, b) => b[1].clicks - a[1].clicks)
        .slice(0, 20);
    
    const tbody = document.querySelector('#links-table tbody');
    tbody.innerHTML = '';
    
    sortedLinks.forEach(([shortUrl, stats]) => {
        const linkInfo = shortlinkMap[shortUrl];
        if (!linkInfo) return;
        
        const topSource = Object.entries(stats.sources)
            .sort((a, b) => b[1] - a[1])[0][0];
        const topCountry = Object.entries(stats.countries)
            .sort((a, b) => b[1] - a[1])[0][0];
        
        const isAff = isAffiliate(linkInfo.original_url);
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><a href="${shortUrl}" target="_blank" style="color: #667eea;">${shortUrl}</a></td>
            <td>${linkInfo.name || '-'}</td>
            <td>${stats.clicks.toLocaleString()}</td>
            <td><span class="affiliate-badge ${isAff ? 'affiliate-yes' : 'affiliate-no'}">${isAff ? 'Affiliate' : 'Regular'}</span></td>
            <td>${topSource}</td>
            <td>${topCountry}</td>
        `;
    });
    
    if (sortedLinks.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No data available for selected filters</td></tr>';
    }
}

// Auto-load CSV files from the repository
window.addEventListener('DOMContentLoaded', () => {
    console.log('Auto-loading CSV files from repository...');
    
    // Load both CSV files automatically
    Promise.all([
        fetch('clickstream.csv')
            .then(r => {
                if (!r.ok) throw new Error('Failed to load clickstream.csv');
                return r.text();
            }),
        fetch('shortlinks.csv')
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
                console.log('Auto-loaded clickstream data:', clickstreamData.length, 'rows');
                updateMediumFilter();
                
                // Parse shortlinks data
                Papa.parse(shortlinksText, {
                    header: true,
                    complete: function(results) {
                        shortlinksData = results.data.filter(row => row.short_url);
                        console.log('Auto-loaded shortlinks data:', shortlinksData.length, 'rows');
                        
                        // Update dashboard once both files are loaded
                        updateDashboard();
                        
                        // Update UI to show files are loaded
                        document.getElementById('clickstream-file').style.borderColor = '#4ade80';
                        document.getElementById('shortlinks-file').style.borderColor = '#4ade80';
                    }
                });
            }
        });
    }).catch(error => {
        console.error('Error loading CSV files:', error);
        console.log('Please ensure clickstream.csv and shortlinks.csv are in the same directory as index.html');
    });
});