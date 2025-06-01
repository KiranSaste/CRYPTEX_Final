document.addEventListener("DOMContentLoaded", function () {
    // Fetch Crypto Prices
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum&vs_currencies=usd")
        .then(response => response.json())
        .then(data => {
            document.getElementById("btc-price").innerText = `$${data.bitcoin.usd}`;
            document.getElementById("eth-price").innerText = `$${data.ethereum.usd}`;
        });
    // Buy Form Submission
    document.getElementById("buy-form").addEventListener("submit", function (event) {
        event.preventDefault();
        let crypto = document.getElementById("crypto-select").value;
        let amount = document.getElementById("amount").value;
        fetch("http://127.0.0.1:5000/buy", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ crypto, amount })
        })
        .then(response => response.json())
        .then(data => {
            document.getElementById("response-message").innerText = data.message;
        });
    });
});
