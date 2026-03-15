// Telegram WebApp инициализация
const tg = window.Telegram?.WebApp;
if (tg) {
    tg.ready();
    tg.expand();
}

// ===== ОБЩИЕ ФУНКЦИИ =====

// Плавный скролл
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({ behavior: 'smooth' });
        }
    });
});

// Анимация появления
const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in');
        }
    });
});
document.querySelectorAll('section').forEach(section => observer.observe(section));

// Обновление кнопки авторизации
function updateAuthButton() {
    const licenseKey = localStorage.getItem('licenseKey');
    const loginBtn = document.querySelector('.nav-links .btn-primary');
    
    if (loginBtn) {
        if (licenseKey) {
            loginBtn.textContent = 'Личный кабинет';
            loginBtn.href = '/dashboard.html';
        } else {
            loginBtn.textContent = 'Войти';
            loginBtn.href = '/login.html';
        }
    }
}

// Скролл тарифов
function scrollPricing(direction) {
    const grid = document.querySelector('.pricing-grid');
    const scrollAmount = 300;
    
    if (direction === 'left') {
        grid.scrollLeft -= scrollAmount;
    } else {
        grid.scrollLeft += scrollAmount;
    }
}

window.scrollPricing = scrollPricing;

document.addEventListener('DOMContentLoaded', updateAuthButton);
window.addEventListener('storage', updateAuthButton);

// Мобильное меню
function toggleMobileMenu() {
    const navLinks = document.querySelector('.nav-links');
    navLinks.classList.toggle('active');
}

document.addEventListener('click', function(event) {
    const navLinks = document.querySelector('.nav-links');
    const menuBtn = document.querySelector('.mobile-menu-btn');
    
    if (navLinks && menuBtn && !navLinks.contains(event.target) && !menuBtn.contains(event.target)) {
        navLinks.classList.remove('active');
    }
});

window.toggleMobileMenu = toggleMobileMenu;