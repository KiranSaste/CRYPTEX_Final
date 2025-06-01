
// This is the login page script
document.addEventListener('DOMContentLoaded', () => {
    const loginContainer = document.querySelector('.login-container');
    const createAccountLinks = document.querySelectorAll('.create-account-link, .create-account-btn');
    const loginLinks = document.querySelectorAll('.login-link, .login-btn');
    createAccountLinks.forEach(link => {
        link.addEventListener('click', () => {
            loginContainer.classList.add('active');
        });
    });
    loginLinks.forEach(link => {
        link.addEventListener('click', () => {
            loginContainer.classList.remove('active');
        });
    });
});