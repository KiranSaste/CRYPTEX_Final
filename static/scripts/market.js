// Global variables
let marketData = [];
let filteredData = [];
let currentPage = 1;
const itemsPerPage = 15;
let currentCategory = 'all';
// DOM Elements
const marketTableBody = document.getElementById('market-data');
const searchInput = document.getElementById('market-search-input');
const prevPageBtn = document.getElementById('prev-page');
const nextPageBtn = document.getElementById('next-page');
const currentPageIndicator = document.getElementById('current-page');
const marketTabs = document.querySelectorAll('.market-tab');
// When page loads, fetch market data
document.addEventListener('DOMContentLoaded', () => {
    fetchMarketData();
    
    // Set up event listeners
    searchInput.addEventListener('input', filterMarketData);
    prevPageBtn.addEventListener('click', () => changePage(-1));
    nextPageBtn.addEventListener('click', () => changePage(1));
    
    // Tab switching
    marketTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            marketTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            currentCategory = tab.dataset.cat;
            currentPage = 1;
            filterMarketData();
        });
    });
});
// Function to fetch market data from CoinGecko API
async function fetchMarketData() {
    try {
        const response = await fetch('https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=100&page=1&sparkline=true&price_change_percentage=24h,7d');
        marketData = await response.json();
        
        // Initialize filtered data with all market data
        filteredData = [...marketData];
        
        // Display data
        displayMarketData();
        
    } catch (error) {
        console.error('Error fetching market data:', error);
        // Show error message
        marketTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 30px;">
                    <p>Failed to load market data. Please try again later.</p>
                    <button class="btn btn-primary" onclick="fetchMarketData()">Retry</button>
                </td>
            </tr>
        `;
    }
}
// Function to filter market data based on search and category
function filterMarketData() {
    const searchTerm = searchInput.value.toLowerCase();
    
    // First filter by category
    let categoryFiltered = marketData;
    
    if (currentCategory !== 'all') {
        // For demo purposes, we'll use some simple category filtering
        // In a real app, you would have category data from the API
        switch(currentCategory) {
            case 'defi':
                // Example DeFi coins (just for demo)
                categoryFiltered = marketData.filter(coin => 
                    ['chainlink', 'uniswap', 'aave', 'compound', 'maker', 'curve'].includes(coin.id));
                break;
            case 'nft':
                // Example NFT coins
                categoryFiltered = marketData.filter(coin => 
                    ['flow', 'enjin', 'decentraland', 'sandbox', 'theta', 'render'].includes(coin.id));
                break;
            case 'gaming':
                // Example Gaming coins
                categoryFiltered = marketData.filter(coin => 
                    ['axie-infinity', 'the-sandbox', 'decentraland', 'enjin', 'gala', 'illuvium'].includes(coin.id));
                break;
            case 'stablecoins':
                // Example Stablecoins
                categoryFiltered = marketData.filter(coin => 
                    ['tether', 'usd-coin', 'binance-usd', 'dai', 'frax', 'true-usd'].includes(coin.id));
                break;
            // Add more categories as needed
        }
    }
    
    // Then filter by search term
    if (searchTerm) {
        filteredData = categoryFiltered.filter(coin => 
            coin.name.toLowerCase().includes(searchTerm) || 
            coin.symbol.toLowerCase().includes(searchTerm)
        );
    } else {
        filteredData = categoryFiltered;
    }
    
    // Reset to first page when filtering
    currentPage = 1;
    currentPageIndicator.textContent = currentPage;
    
    // Display filtered data
    displayMarketData();
}
// Function to display market data
function displayMarketData() {
    // Clear current data
    marketTableBody.innerHTML = '';
    
    // Calculate pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const pageData = filteredData.slice(startIndex, endIndex);
    
    // If no data after filtering
    if (pageData.length === 0) {
        marketTableBody.innerHTML = `
            <tr>
                <td colspan="9" style="text-align: center; padding: 30px;">
                    <p>No cryptocurrencies found matching your criteria.</p>
                </td>
            </tr>
        `;
        return;
    }
    
    // Create rows for each coin
    pageData.forEach((coin, index) => {
        const row = document.createElement('tr');
        
        // Format 24h change
        const change24h = coin.price_change_percentage_24h;
        const change24hClass = change24h >= 0 ? 'positive-change' : 'negative-change';
        const change24hSign = change24h >= 0 ? '+' : '';
        
        // Format 7d change
        const change7d = coin.price_change_percentage_7d_in_currency;
        const change7dClass = change7d >= 0 ? 'positive-change' : 'negative-change';
        const change7dSign = change7d >= 0 ? '+' : '';
        
        // Row content
        row.innerHTML = `
            <td>${startIndex + index + 1}</td>
            <td>
                <div class="coin-info">
                    <img src="${coin.image}" alt="${coin.name}">
                    <div class="coin-name-container">
                        <div class="coin-name">${coin.name}</div>
                        <div class="coin-symbol">${coin.symbol.toUpperCase()}</div>
                    </div>
                </div>
            </td>
            <td>$${coin.current_price.toLocaleString()}</td>
            <td class="${change24hClass}">${change24hSign}${change24h?.toFixed(2) || '0.00'}%</td>
            <td class="${change7dClass}">${change7dSign}${change7d?.toFixed(2) || '0.00'}%</td>
            <td>$${formatMarketCap(coin.market_cap)}</td>
            <td>$${formatNumber(coin.total_volume)}</td>
            <td>
                <div class="sparkline-container">
                    <svg width="120" height="40" id="sparkline-${coin.id}"></svg>
                </div>
            </td>
            <td>
                <a href="{{ url_for('main.trade') }}" class="btn btn-small" style="padding: 5px 10px; font-size: 12px;">Trade</a>
            </td>
        `;
        
        marketTableBody.appendChild(row);
        
        // Add sparkline chart
        if (coin.sparkline_in_7d && coin.sparkline_in_7d.price) {
            const prices = coin.sparkline_in_7d.price;
            const sparklineElement = document.getElementById(`sparkline-${coin.id}`);
            if (sparklineElement) {
                const sparklineColor = change7d >= 0 ? "#0ECB81" : "#F6465D";
                window.sparkline.sparkline(
                    sparklineElement, 
                    prices, 
                    {
                        stroke: sparklineColor,
                        fill: "rgba(0,0,0,0)",
                        width: 120,
                        height: 40
                    }
                );
            }
        }
    });
    
    // Update pagination controls
    updatePaginationControls();
    
    // Add row click for navigation
    const rows = marketTableBody.querySelectorAll('tr');
    rows.forEach(row => {
        row.addEventListener('click', (e) => {
            // Don't navigate if clicking on trade button
            if (e.target.tagName === 'A' || e.target.closest('a')) {
                return;
            }
            // Get coin info from the row and navigate to trade page
            const coinName = row.querySelector('.coin-name')?.textContent;
            if (coinName) {
                window.location.href = "{{ url_for('main.trade') }}";
            }
        });
    });
}
// Function to change page
function changePage(direction) {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    // Calculate new page
    const newPage = currentPage + direction;
    
    // Check if new page is valid
    if (newPage >= 1 && newPage <= totalPages) {
        currentPage = newPage;
        currentPageIndicator.textContent = currentPage;
        displayMarketData();
    }
}
// Function to update pagination controls
function updatePaginationControls() {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    
    // Disable/enable buttons based on current page
    prevPageBtn.disabled = currentPage === 1;
    nextPageBtn.disabled = currentPage === totalPages;
    
    // Update styles based on button state
    prevPageBtn.style.opacity = prevPageBtn.disabled ? '0.5' : '1';
    nextPageBtn.style.opacity = nextPageBtn.disabled ? '0.5' : '1';
    
    // Update page indicator
    currentPageIndicator.textContent = currentPage;
}
// Helper function to format large numbers
function formatNumber(num) {
    if (num >= 1e9) {
        return (num / 1e9).toFixed(2) + 'B';
    }
    if (num >= 1e6) {
        return (num / 1e6).toFixed(2) + 'M';
    }
    if (num >= 1e3) {
        return (num / 1e3).toFixed(2) + 'K';
    }
    return num.toLocaleString();
}
// Helper function for market cap formatting
function formatMarketCap(marketCap) {
    if (marketCap >= 1e12) {
        return (marketCap / 1e12).toFixed(2) + 'T';
    }
    if (marketCap >= 1e9) {
        return (marketCap / 1e9).toFixed(2) + 'B';
    }
    if (marketCap >= 1e6) {
        return (marketCap / 1e6).toFixed(2) + 'M';
    }
    return marketCap.toLocaleString();
}
