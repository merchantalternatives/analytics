let clickstreamData = [];
let shortlinksData = [];
let charts = {};

// Auto-load CSV files when page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('Loading CSV files...');
    
    // Load clickstream.csv
    fetch('data/clickstream.csv')
        .then(response => response.text())
        .then(text => {
            Papa.parse(text, {
                header: true,
                complete: function(results) {
                    clickstreamData = results.data.filter(row => row['Short link']);
                    console.log('Loaded', clickstreamData.length, 'clicks');
                    
                    // If we have data, show it immediately
                    if (clickstreamData.length > 0) {
                        showData();
                    }
                }
            });
        })
        .catch(err => console.error('Error loading clickstream:', err));
    
    // Load shortlinks.csv (optional for name mapping)
    fetch('data/shortlinks.csv')
        .then(response => response.text())
        .then(text => {
            Papa.parse(text, {
                header: true,
                complete: function(results) {
                    shortlinksData = results.data.filter(row => row.short_url);
                    console.log('Loaded', shortlinksData.length, 'shortlinks');
                    // Re-show data with names if available
                    if (clickstreamData.length > 0) {
                        showData();
                    }
                }
            });
        })
        .catch(err => console.error('Error loading shortlinks:', err));
});

function showData() {
    console.log('Showing data...');
    
    // Create shortlinks lookup map
    const shortlinkMap = {};
    shortlinksData.forEach(link => {
        shortlinkMap[link.short_url] = link;
    });
    
    // Filter clicks to only those in shortlinks.csv
    const filteredClicks = clickstreamData.filter(click => {
        return shortlinkMap[click['Short link']];
    });
    
    console.log('Filtered to', filteredClicks.length, 'clicks matching shortlinks');
    
    // Group clicks by URL
    const linkStats = {};
    filteredClicks.forEach(click => {
        const url = click['Short link'];
        if (!linkStats[url]) {
            linkStats[url] = {
                clicks: 0,
                countries: {},
                sources: {},
                name: shortlinkMap[url] ? shortlinkMap[url].name : ''
            };
        }
        linkStats[url].clicks++;
        
        const country = click.Country || 'Unknown';
        linkStats[url].countries[country] = (linkStats[url].countries[country] || 0) + 1;
        
        const source = click['UTM medium'] || 'Direct';
        linkStats[url].sources[source] = (linkStats[url].sources[source] || 0) + 1;
    });
    
    // Sort by clicks
    const sorted = Object.entries(linkStats)
        .sort((a, b) => b[1].clicks - a[1].clicks)
        .slice(0, 20);
    
    // Update stats (use filtered data)
    document.getElementById('total-clicks').textContent = filteredClicks.length;
    document.getElementById('unique-links').textContent = Object.keys(linkStats).length;
    
    // Count affiliate clicks from shortlinks
    const affiliateClicks = filteredClicks.filter(click => {
        const linkInfo = shortlinkMap[click['Short link']];
        if (!linkInfo) return false;
        const url = linkInfo.original_url || '';
        return url.includes('tag=') || 
               url.includes('irclickid=') || 
               url.includes('utm_source=') ||
               url.includes('affpt=') ||
               url.includes('partner=');
    }).length;
    document.getElementById('affiliate-clicks').textContent = affiliateClicks;
    document.getElementById('conversion-rate').textContent = 
        filteredClicks.length > 0 ? ((affiliateClicks / filteredClicks.length) * 100).toFixed(1) + '%' : '0%';
    
    // Update table
    const tbody = document.querySelector('#links-table tbody');
    tbody.innerHTML = '';
    
    sorted.forEach(([url, stats]) => {
        // Use name from shortlinks
        const name = stats.name || url.split('/').pop();
        
        const topCountry = Object.entries(stats.countries)
            .sort((a, b) => b[1] - a[1])[0][0];
        const topSource = Object.entries(stats.sources)
            .sort((a, b) => b[1] - a[1])[0][0];
        
        // Check if affiliate based on original URL
        const linkInfo = shortlinkMap[url];
        const originalUrl = linkInfo ? linkInfo.original_url : '';
        const isAffiliate = originalUrl.includes('tag=') || 
                          originalUrl.includes('irclickid=') || 
                          originalUrl.includes('utm_source=') ||
                          originalUrl.includes('affpt=') ||
                          originalUrl.includes('partner=');
        
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><a href="${url}" target="_blank" style="color: #667eea;">${url}</a></td>
            <td>${name}</td>
            <td>${stats.clicks}</td>
            <td><span class="affiliate-badge ${isAffiliate ? 'affiliate-yes' : 'affiliate-no'}">
                ${isAffiliate ? 'Affiliate' : 'Regular'}
            </span></td>
            <td>${topSource}</td>
            <td>${topCountry}</td>
        `;
    });
    
    if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #999;">No clicks found for Merchant Alternatives links</td></tr>';
    }
    
    console.log('Table updated with', sorted.length, 'rows');
}

// Add event listeners if elements exist
if (document.getElementById('time-filter')) {
    document.getElementById('time-filter').addEventListener('change', showData);
}
if (document.getElementById('medium-filter')) {
    document.getElementById('medium-filter').addEventListener('change', showData);
}
if (document.getElementById('affiliate-filter')) {
    document.getElementById('affiliate-filter').addEventListener('change', showData);
}