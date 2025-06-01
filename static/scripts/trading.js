// WebSocket connection
const socket = io();
socket.on('connect', () => {
    console.log('Connected to WebSocket');
});
// Real-time price updates
socket.on('price_update', (data) => {
    updatePriceDisplay(data);
});
// Order book updates
socket.on('order_update', (data) => {
    updateOrderBook(data);
});
// Place order function
async function placeOrder(orderData) {
    try {
        const response = await fetch('/api/place_order', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content
            },
            body: JSON.stringify(orderData)
        });
        const result = await response.json();
        if (result.status === 'success') {
            showNotification('Order placed successfully');
        }
    } catch (error) {
        console.error('Error placing order:', error);
    }
} 