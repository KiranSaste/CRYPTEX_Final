// Current coin being viewed
let currentCoin = 'bitcoin';
let currentDays = 1;
let priceChart;
// DOM Elements
const cryptoOptions = document.querySelectorAll('.crypto-option');
const timeOptions = document.querySelectorAll('.time-option');
const tradeTabs = document.querySelectorAll('.trade-tab');
const tradeButton = document.getElementById('trade-button');
const tradeForm = document.getElementById('trade-form');
const tradeAmountInput = document.getElementById('trade-amount');
const tradeQuantityInput = document.getElementById('trade-quantity');
// When page loads
document.addEventListener('DOMContentLoaded', () => {
    // Fetch data for default coin
    fetchCoinData(currentCoin);
    fetchChartData(currentCoin, currentDays);
    generateOrderBook();
    generateMarketTrades();
    // Set crypto ID on initial load
    const firstCoin = document.querySelector('.crypto-option.active');
    if (firstCoin) {
        const cryptoId = firstCoin.dataset.cryptoId;
        document.getElementById('crypto-id').value = cryptoId;
    }
    // Update quantity on amount input
    tradeAmountInput.addEventListener('input', updateQuantity);
    tradeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('💥 Trade form submit handler triggered');
        const amount = parseFloat(tradeAmountInput.value);
        if (isNaN(amount) || amount <= 0) {
            alert('Please enter a valid amount greater than 0');
            return;
        }
    
        const csrfToken = document.querySelector('input[name="csrf_token"]').value;
        const loginUrl = document.getElementById('login-url')?.value || '/login';
    
        const formData = new FormData(tradeForm);
        formData.append('csrf_token', csrfToken); // Just in case
        const formBody = new URLSearchParams(formData);
    
        try {
            console.log('Submitting form to:', tradeForm.action);
    
            const response = await fetch(tradeForm.action, {
                method: 'POST',
                credentials: 'include', // Ensures session cookies are sent
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-CSRFToken': csrfToken
                },
                body: formBody
            });
    
            if (response.redirected) {
                // Possibly redirected to login or trade page with a flash message
                console.log('Redirected to:', response.url);
                if (response.url.includes('/login')) {
                    alert('Please login to place an order.');
                }
                window.location.href = response.url;
                return;
            }
    
            const result = await response.json();
            if (result.success) {
                alert('Order placed successfully!');
                tradeForm.reset();
                updateQuantity(); // Reset quantity + fee
            } else {
                alert(result.message || 'Failed to place order');
            }
        } catch (error) {
            console.error('Error during form submission:', error);
            alert('An error occurred while placing your order. Please try again.');
        }
    });
    
});
// Switch between coins
cryptoOptions.forEach(option => {
    option.addEventListener('click', () => {
        cryptoOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentCoin = option.dataset.coin;
        // Set crypto ID in hidden input
        const cryptoId = option.dataset.cryptoId;
        document.getElementById('crypto-id').value = cryptoId;
        fetchCoinData(currentCoin);
        fetchChartData(currentCoin, currentDays);
        generateOrderBook();
        generateMarketTrades();
    });
});
// Switch between time periods
timeOptions.forEach(option => {
    option.addEventListener('click', () => {
        timeOptions.forEach(opt => opt.classList.remove('active'));
        option.classList.add('active');
        currentDays = option.dataset.days;
        fetchChartData(currentCoin, currentDays);
    });
});
// Switch between buy/sell tabs
tradeTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        tradeTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const mode = tab.dataset.tab;
        tradeButton.textContent = mode === 'buy' ? 'Buy Now' : 'Sell Now';
        // Set transaction type in hidden input
        document.getElementById('transaction-type').value = mode;
    });
});
// Fetch coin data
async function fetchCoinData(coin) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}?localization=false&tickers=false&market_data=true&community_data=false&developer_data=false&sparkline=false`);
        const data = await response.json();
        document.getElementById('current-price').textContent = `$${data.market_data.current_price.usd.toLocaleString()}`;
        const priceChange = data.market_data.price_change_percentage_24h;
        const priceChangeElement = document.getElementById('price-change');
        priceChangeElement.textContent = `${priceChange.toFixed(2)}%`;
        priceChangeElement.className = `price-value ${priceChange >= 0 ? 'change-positive' : 'change-negative'}`;
        document.getElementById('price-high').textContent = `$${data.market_data.high_24h.usd.toLocaleString()}`;
        document.getElementById('price-low').textContent = `$${data.market_data.low_24h.usd.toLocaleString()}`;
        const symbol = data.symbol.toUpperCase();
        document.getElementById('exchange-rate').textContent = `1 ${symbol} = $${data.market_data.current_price.usd.toLocaleString()}`;
        updateQuantity();
    } catch (error) {
        console.error(`Error fetching data for ${coin}:`, error);
    }
}
// Fetch chart data
async function fetchChartData(coin, days) {
    try {
        const response = await fetch(`https://api.coingecko.com/api/v3/coins/${coin}/market_chart?vs_currency=usd&days=${days}`);
        const data = await response.json();
        const prices = data.prices;
        const labels = prices.map(price => {
            const date = new Date(price[0]);
            return days <= 1 ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : date.toLocaleDateString();
        });
        const priceData = prices.map(price => price[1]);
        if (priceChart) {
            priceChart.data.labels = labels;
            priceChart.data.datasets[0].data = priceData;
            priceChart.update();
        } else {
            const ctx = document.getElementById('priceChart').getContext('2d');
            priceChart = new Chart(ctx, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: `${coin.charAt(0).toUpperCase() + coin.slice(1)} Price (USD)`,
                        data: priceData,
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
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
                            ticks: { color: '#8794BA' }
                        },
                        y: {
                            grid: { color: 'rgba(255, 255, 255, 0.05)' },
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
                        }
                    }
                }
            });
        }
    } catch (error) {
        console.error(`Error fetching chart data for ${coin}:`, error);
    }
}
// Generate dummy order book
function generateOrderBook() {
    const orderBook = document.getElementById('order-book');
    orderBook.innerHTML = '';
    const currentPrice = parseFloat(document.getElementById('current-price').textContent.replace('$', '').replace(',', ''));
    for (let i = 5; i > 0; i--) {
        const price = currentPrice + (currentPrice * 0.001 * i);
        const amount = (Math.random() * 2).toFixed(5);
        const total = (price * amount).toFixed(2);
        const orderItem = document.createElement('div');
        orderItem.className = 'trade-item sell-order';
        orderItem.innerHTML = `<div>$${price.toFixed(2)}</div><div>${amount}</div><div>$${total}</div>`;
        orderBook.appendChild(orderItem);
    }
    for (let i = 0; i < 5; i++) {
        const price = currentPrice - (currentPrice * 0.001 * (i + 1));
        const amount = (Math.random() * 2).toFixed(5);
        const total = (price * amount).toFixed(2);
        const orderItem = document.createElement('div');
        orderItem.className = 'trade-item buy-order';
        orderItem.innerHTML = `<div>$${price.toFixed(2)}</div><div>${amount}</div><div>$${total}</div>`;
        orderBook.appendChild(orderItem);
    }
}
// Generate dummy market trades
function generateMarketTrades() {
    const marketTrades = document.getElementById('market-trades');
    marketTrades.innerHTML = '';
    const currentPrice = parseFloat(document.getElementById('current-price').textContent.replace('$', '').replace(',', ''));
    for (let i = 0; i < 10; i++) {
        const isBuy = Math.random() > 0.5;
        const price = currentPrice + (currentPrice * 0.002 * (Math.random() - 0.5));
        const amount = (Math.random() * 2).toFixed(5);
        const minutes = Math.floor(Math.random() * 60);
        const seconds = Math.floor(Math.random() * 60);
        const timeStr = `${minutes}m ${seconds}s ago`;
        const tradeItem = document.createElement('div');
        tradeItem.className = `trade-item ${isBuy ? 'buy-order' : 'sell-order'}`;
        tradeItem.innerHTML = `<div>$${price.toFixed(2)}</div><div>${amount}</div><div>${timeStr}</div>`;
        marketTrades.appendChild(tradeItem);
    }
}
// Update quantity and fees based on input
function updateQuantity() {
    const amount = parseFloat(tradeAmountInput.value) || 0;
    const currentPrice = parseFloat(document.getElementById('current-price').textContent.replace('$', '').replace(',', ''));
    if (currentPrice > 0) {
        const quantity = amount / currentPrice;
        tradeQuantityInput.value = quantity.toFixed(8);
        const fee = amount * 0.015;
        document.getElementById('fee-amount').textContent = `$${fee.toFixed(2)}`;
        document.getElementById('total-amount').textContent = `$${(amount + fee).toFixed(2)}`;
    }
}
