/**
 * 沿途科技（深圳）有限公司 - 企业官网
 * Main JavaScript
 */

document.addEventListener('DOMContentLoaded', function () {
  // Initialize all modules
  initHeaderScroll();
  initMobileMenu();
  initScrollAnimations();
  initActiveNavLink();
  initSmoothScroll();
  initContactForm();
});

// --- Header scroll effect ---
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  window.addEventListener('scroll', function () {
    if (window.scrollY > 10) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  });

  // Initial check
  if (window.scrollY > 10) {
    header.classList.add('scrolled');
  }
}

// --- Mobile menu toggle ---
function initMobileMenu() {
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', function () {
    nav.classList.toggle('open');
    const spans = toggle.querySelectorAll('span');
    if (nav.classList.contains('open')) {
      spans[0].style.transform = 'rotate(45deg) translate(5px, 5px)';
      spans[1].style.opacity = '0';
      spans[2].style.transform = 'rotate(-45deg) translate(5px, -5px)';
    } else {
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    }
  });

  // Close menu on link click
  nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', function () {
      nav.classList.remove('open');
      const spans = toggle.querySelectorAll('span');
      spans[0].style.transform = '';
      spans[1].style.opacity = '';
      spans[2].style.transform = '';
    });
  });
}

// --- Scroll-based animations ---
function initScrollAnimations() {
  const elements = document.querySelectorAll('.fade-up');

  const observer = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  elements.forEach(function (el) {
    observer.observe(el);
  });
}

// --- Active nav link highlighting ---
function initActiveNavLink() {
  const currentPath = window.location.pathname.split('/').pop() || 'index.html';
  const navLinks = document.querySelectorAll('.nav a');

  navLinks.forEach(function (link) {
    const href = link.getAttribute('href');
    if (href === currentPath || (currentPath === '' && href === 'index.html')) {
      link.classList.add('active');
    }
  });
}

// --- Smooth scroll for anchor links ---
function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(function (anchor) {
    anchor.addEventListener('click', function (e) {
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        e.preventDefault();
        const headerHeight = document.querySelector('.header')?.offsetHeight || 72;
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - headerHeight;
        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth'
        });
      }
    });
  });
}

// --- Contact form handling ---
function initContactForm() {
  const form = document.querySelector('.contact-form form');
  if (!form) return;

  // Decode obfuscated endpoint at runtime
  const _ep = 'Y29udGFjdEB5YW50dS5uZXQuY24=';
  const endpoint = 'https://formsubmit.co/ajax/' + atob(_ep);

  form.addEventListener('submit', function (e) {
    e.preventDefault();

    const submitBtn = form.querySelector('button[type="submit"]');
    const originalText = submitBtn.textContent;

    // Simple validation feedback
    let hasError = false;
    const inputs = form.querySelectorAll('input[required], textarea[required]');
    inputs.forEach(function (input) {
      if (!input.value.trim()) {
        input.style.borderColor = 'var(--color-danger)';
        hasError = true;
      } else {
        input.style.borderColor = '';
      }
    });

    if (hasError) {
      showToast('请填写所有必填字段', 'error');
      return;
    }

    // Email validation
    const emailInput = form.querySelector('input[type="email"]');
    if (emailInput && !isValidEmail(emailInput.value)) {
      emailInput.style.borderColor = 'var(--color-danger)';
      showToast('请输入有效的邮箱地址', 'error');
      return;
    }

    // Send to server
    submitBtn.textContent = '提交中...';
    submitBtn.disabled = true;

    const formData = {
      name: form.querySelector('#name')?.value || '',
      company: form.querySelector('#company')?.value || '',
      email: form.querySelector('#email')?.value || '',
      phone: form.querySelector('#phone')?.value || '',
      service: form.querySelector('#service')?.value || '',
      message: form.querySelector('#message')?.value || '',
    };

    fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(formData),
    })
      .then(res => res.json())
      .then(data => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        if (data.success) {
          form.reset();
          showToast(data.message || '感谢您的留言，我们会尽快与您联系！', 'success');
        } else {
          showToast(data.error || '提交失败，请稍后重试', 'error');
        }
      })
      .catch(() => {
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        showToast('网络错误，请稍后重试', 'error');
      });
  });
}

// --- Email validation ---
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

// --- Toast notification ---
function showToast(message, type) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.textContent = message;

  const style = document.createElement('style');
  style.textContent = `
    .toast {
      position: fixed;
      bottom: 30px;
      right: 30px;
      padding: 1rem 1.5rem;
      border-radius: var(--radius-md);
      font-size: 0.95rem;
      font-weight: 500;
      z-index: 9999;
      animation: toast-in 0.3s ease, toast-out 0.3s ease 2.7s forwards;
      box-shadow: var(--shadow-lg);
    }
    .toast-success {
      background: var(--color-success);
      color: white;
    }
    .toast-error {
      background: var(--color-danger);
      color: white;
    }
    @keyframes toast-in {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
    @keyframes toast-out {
      from { transform: translateX(0); opacity: 1; }
      to { transform: translateX(100%); opacity: 0; }
    }
  `;

  document.head.appendChild(style);
  document.body.appendChild(toast);

  setTimeout(function () {
    toast.remove();
    style.remove();
  }, 3200);
}
