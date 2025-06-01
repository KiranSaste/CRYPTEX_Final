// DOM Elements
const walletTabs = document.querySelectorAll('.wallet-tab');
const assetsContent = document.getElementById('assets-content');
const transactionsContent = document.getElementById('transactions-content');
const portfolioItems = document.querySelectorAll('.portfolio-item');
// Tab switching
walletTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        // Update active state
        walletTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        // Show corresponding content
        const tabType = tab.dataset.tab;
        if (tabType === 'assets') {
            assetsContent.style.display = 'block';
            transactionsContent.style.display = 'none';
        } else {
            assetsContent.style.display = 'none';
            transactionsContent.style.display = 'block';
        }
    });
});
// Portfolio chart initialization
document.addEventListener('DOMContentLoaded', () => {
    // Portfolio chart
    const portfolioCtx = document.getElementById('portfolioChart').getContext('2d');
    
    // Sample data for 30 days
    const dates = [];
    const portfolioValues = [];
    
    // Generate sample data
    const now = new Date();
    for (let i = 30; i >= 0; i--) {
        const date = new Date(now);
        date.setDate(date.getDate() - i);
        dates.push(date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }));
        
        // Create some random but trending upward data
        const baseValue = 11000;
        const randomFactor = Math.random() * 300 - 100; // Random fluctuation
        const trendFactor = i * 50; // Upward trend
        portfolioValues.push(baseValue + randomFactor + trendFactor);
    }
    
    // Create chart
    const portfolioChart = new Chart(portfolioCtx, {
        type: 'line',
        data: {
            labels: dates,
            datasets: [{
                label: 'Portfolio Value (USD)',
                data: portfolioValues,
                borderColor: '#3772FF',
                backgroundColor: 'rgba(55, 114, 255, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#8794BA',
                        maxTicksLimit: 7
                    }
                },
                y: {
                    grid: {
                        color: 'rgba(255, 255, 255, 0.05)'
                    },
                    ticks: {
                        color: '#8794BA',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                }
            },
            plugins: {
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return '$' + context.parsed.y.toLocaleString();
                        }
                    }
                },
                legend: {
                    display: false
                }
            }
        }
    });
    
    // Fetch current prices for portfolio assets
    fetchPortfolioPrices();
    
    // Make portfolio items clickable to go to trade page
    portfolioItems.forEach(item => {
        item.addEventListener('click', () => {
            const coin = item.dataset.coin;
            window.location.href = "{{ url_for('main.trade') }}";
        });
    });
});
// Function to fetch current prices for portfolio assets
async function fetchPortfolioPrices() {
    try {
        // Get all coin IDs from portfolio items
        const coinIds = Array.from(portfolioItems).map(item => item.dataset.coin).join(',');
        
        // Fetch current prices from CoinGecko
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinIds}&order=market_cap_desc&per_page=100&page=1&sparkline=false&price_change_percentage=24h`);
        const data = await response.json();
        
        // Update portfolio items with live data
        data.forEach(coin => {
            const portfolioItem = document.querySelector(`.portfolio-item[data-coin="${coin.id}"]`);
            if (portfolioItem) {
                // Get amount from portfolio item
                const amountEl = portfolioItem.querySelector('.coin-amount');
                const amountText = amountEl.textContent;
                const amount = parseFloat(amountText.split(' ')[0]);
                
                // Calculate value based on current price
                const value = amount * coin.current_price;
                
                // Update price and change
                const priceEl = portfolioItem.querySelector('.coin-price');
                priceEl.textContent = `$${value.toLocaleString(undefined, {maximumFractionDigits: 2})}`;
                
                // Update 24h change percentage
                const changeEl = portfolioItem.querySelector('.coin-change');
                const change = coin.price_change_percentage_24h;
                const isPositive = change >= 0;
                
                changeEl.textContent = `${isPositive ? '+' : ''}${change.toFixed(2)}%`;
                changeEl.className = `coin-change ${isPositive ? 'positive-change' : 'negative-change'}`;
            }
        });
        
    } catch (error) {
        console.error('Error fetching portfolio prices:', error);
    }
}