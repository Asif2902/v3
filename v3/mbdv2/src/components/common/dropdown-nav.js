
// Navigation dropdown functionality
document.addEventListener('DOMContentLoaded', function() {
  // Desktop dropdown functionality
  const desktopDropdowns = document.querySelectorAll('.nav-dropdown');
  
  desktopDropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.nav-dropdown-trigger');
    const menu = dropdown.querySelector('.nav-dropdown-menu');
    
    if (trigger && menu) {
      let hoverTimeout;
      
      // Show dropdown on hover
      dropdown.addEventListener('mouseenter', () => {
        clearTimeout(hoverTimeout);
        dropdown.classList.add('active');
      });
      
      // Hide dropdown when leaving
      dropdown.addEventListener('mouseleave', () => {
        hoverTimeout = setTimeout(() => {
          dropdown.classList.remove('active');
        }, 150);
      });
      
      // Click functionality for mobile-like behavior
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        dropdown.classList.toggle('active');
        
        // Close other dropdowns
        desktopDropdowns.forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('active');
          }
        });
      });
    }
  });
  
  // Mobile dropdown functionality
  const mobileDropdowns = document.querySelectorAll('.mobile-footer-dropdown');
  
  mobileDropdowns.forEach(dropdown => {
    const trigger = dropdown.querySelector('.mobile-footer-trigger');
    const menu = dropdown.querySelector('.mobile-footer-dropdown-menu');
    
    if (trigger && menu) {
      let touchTimeout;
      
      // Touch/click functionality
      trigger.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        dropdown.classList.toggle('active');
        
        // Close other mobile dropdowns
        mobileDropdowns.forEach(otherDropdown => {
          if (otherDropdown !== dropdown) {
            otherDropdown.classList.remove('active');
          }
        });
      });
      
      // Show on hover for devices that support it
      dropdown.addEventListener('mouseenter', () => {
        clearTimeout(touchTimeout);
        dropdown.classList.add('active');
      });
      
      dropdown.addEventListener('mouseleave', () => {
        touchTimeout = setTimeout(() => {
          dropdown.classList.remove('active');
        }, 150);
      });
    }
  });
  
  // Close dropdowns when clicking outside
  document.addEventListener('click', (e) => {
    const isDropdownClick = e.target.closest('.nav-dropdown, .mobile-footer-dropdown');
    
    if (!isDropdownClick) {
      // Close all desktop dropdowns
      desktopDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
      
      // Close all mobile dropdowns
      mobileDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
  
  // Handle escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      desktopDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
      
      mobileDropdowns.forEach(dropdown => {
        dropdown.classList.remove('active');
      });
    }
  });
});
