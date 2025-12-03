document.addEventListener('DOMContentLoaded', function() {
  // Smooth fade-in animation for the container
  const container = document.querySelector('.container');
  if (container) {
    container.style.opacity = '0';
    container.style.transform = 'translateY(20px)';
    container.style.transition = 'opacity 0.5s ease, transform 0.5s ease';

    setTimeout(() => {
      container.style.opacity = '1';
      container.style.transform = 'translateY(0)';
    }, 100);
  }

  // Mobile Navigation Setup
  setupMobileNavigation();

  // Button hover effects (slight lift effect)
  const buttons = document.querySelectorAll('button');
  buttons.forEach(button => {
    button.addEventListener('mouseenter', function() {
      this.style.transform = 'translateY(-2px)';
    });

    button.addEventListener('mouseleave', function() {
      this.style.transform = '';
    });
  });

  // Smooth scrolling for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      document.querySelector(this.getAttribute('href')).scrollIntoView({
        behavior: 'smooth'
      });
    });
  });

  // Auto-hide notifications after 5 seconds
  const notifications = document.querySelectorAll('.notification');
  notifications.forEach(notification => {
    setTimeout(() => {
      notification.classList.add('hide');
      setTimeout(() => {
        notification.remove();
      }, 500);
    }, 5000);
  });

  // Ripple effect on button clicks
  function createRipple(event) {
    const button = event.currentTarget;
    const circle = document.createElement('span');
    const diameter = Math.max(button.clientWidth, button.clientHeight);

    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${event.clientX - button.offsetLeft - diameter / 2}px`;
    circle.style.top = `${event.clientY - button.offsetTop - diameter / 2}px`;
    circle.classList.add('ripple');

    const ripple = button.getElementsByClassName('ripple')[0];
    if (ripple) {
      ripple.remove();
    }

    button.appendChild(circle);
  }

  // Apply ripple effect to all buttons
  buttons.forEach(button => {
    button.addEventListener('click', createRipple);
  });

  // Add ripple animation styles
  const style = document.createElement('style');
  style.textContent = `
    .ripple {
      position: absolute;
      border-radius: 50%;
      background: rgba(0, 0, 0, 0.2);
      transform: scale(0);
      animation: ripple 0.6s linear;
    }

    @keyframes ripple {
      to {
        transform: scale(4);
        opacity: 0;
      }
    }
  `;
  document.head.appendChild(style);
});

// Mobile navigation setup function (simplified for new footer nav)
function setupMobileNavigation() {
  // Set active state for current page
  const currentPage = window.location.pathname;
  const footerItems = document.querySelectorAll('.mobile-footer-item');
  const desktopItems = document.querySelectorAll('.desktop-nav .nav-item');
  
  // Remove active class from all items
  footerItems.forEach(item => item.classList.remove('active'));
  desktopItems.forEach(item => item.classList.remove('active'));
  
  // Add active class to current page
  footerItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPage || 
        (currentPage === '/' && href === '/index.html') ||
        (currentPage === '/index.html' && href === '/index.html')) {
      item.classList.add('active');
    }
  });
  
  desktopItems.forEach(item => {
    const href = item.getAttribute('href');
    if (href === currentPage || 
        (currentPage === '/' && href === '/index.html') ||
        (currentPage === '/index.html' && href === '/index.html')) {
      item.classList.add('active');
    }
  });
}