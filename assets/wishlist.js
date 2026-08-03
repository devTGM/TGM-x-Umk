const Wishlist = {
  getItems() {
    return JSON.parse(localStorage.getItem('wishlist') || '[]');
  },
  addItem(handle) {
    const items = this.getItems();
    if (!items.includes(handle)) {
      items.push(handle);
      localStorage.setItem('wishlist', JSON.stringify(items));
    }
    this.updateUI();
  },
  removeItem(handle) {
    const items = this.getItems();
    const newItems = items.filter(i => i !== handle);
    localStorage.setItem('wishlist', JSON.stringify(newItems));
    this.updateUI();
    
    // Remove visually from drawer
    const card = document.querySelector(`.wishlist-drawer-grid .wishlist-item[data-product-handle="${handle}"]`);
    if (card) {
      card.remove();
      this.checkEmptyState();
    }
  },
  toggleItem(handle) {
    if (this.getItems().includes(handle)) {
      this.removeItem(handle);
    } else {
      this.addItem(handle);
    }
  },
  checkEmptyState() {
    const items = this.getItems();
    const grid = document.querySelector('.wishlist-drawer-grid');
    const emptyState = document.querySelector('.wishlist-empty');
    if (grid && emptyState) {
      if (items.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
      } else {
        grid.style.display = 'grid';
        emptyState.style.display = 'none';
      }
    }
  },
  updateUI() {
    const items = this.getItems();
    // Update badge count
    const badges = document.querySelectorAll('.wishlist-count-badge');
    badges.forEach(badge => {
      badge.textContent = items.length;
      badge.style.display = items.length > 0 ? 'inline-flex' : 'none';
    });
    // Update all wishlist buttons
    document.querySelectorAll('.wishlist-btn').forEach(btn => {
      const handle = btn.dataset.productHandle;
      if (items.includes(handle)) {
        btn.classList.add('is-active');
        btn.setAttribute('aria-label', 'Remove from wishlist');
      } else {
        btn.classList.remove('is-active');
        btn.setAttribute('aria-label', 'Add to wishlist');
      }
    });
  },
  async loadWishlistDrawer() {
    const items = this.getItems();
    const grid = document.querySelector('.wishlist-drawer-grid');
    if (!grid) return;
    
    this.checkEmptyState();
    if (items.length === 0) return;
    
    grid.innerHTML = '<p style="grid-column: 1/-1;">Loading your wishlist...</p>';
    
    try {
      let html = '';
      const fetchPromises = items.map(handle => 
        fetch(`/products/${handle}?view=card`)
          .then(res => res.text())
      );
      
      const results = await Promise.all(fetchPromises);
      html = results.map((result, i) => {
          return `<div class="wishlist-item" data-product-handle="${items[i]}">${result}</div>`;
      }).join('');
      
      grid.innerHTML = html;
      this.updateUI(); // Ensure new buttons get active states
      
    } catch (error) {
      console.error('Error loading wishlist:', error);
      grid.innerHTML = '<p style="grid-column: 1/-1;">There was an error loading your wishlist.</p>';
    }
  },
  openDrawer(e) {
    if(e) e.preventDefault();
    const drawer = document.getElementById('wishlist-drawer');
    const overlay = document.getElementById('wishlist-drawer-overlay');
    if(drawer && overlay) {
      drawer.style.transform = 'translateX(0)';
      overlay.style.opacity = '1';
      overlay.style.pointerEvents = 'auto';
      document.body.style.overflow = 'hidden';
      this.loadWishlistDrawer();
    }
  },
  closeDrawer() {
    const drawer = document.getElementById('wishlist-drawer');
    const overlay = document.getElementById('wishlist-drawer-overlay');
    if(drawer && overlay) {
      drawer.style.transform = 'translateX(100%)';
      overlay.style.opacity = '0';
      overlay.style.pointerEvents = 'none';
      document.body.style.overflow = '';
    }
  },
  injectCSS() {
    if (!document.getElementById('wishlist-css')) {
      const style = document.createElement('style');
      style.id = 'wishlist-css';
      style.innerHTML = `
        .wishlist-btn svg, .wishlist-btn svg path { fill: none !important; stroke: currentColor !important; }
        .wishlist-btn.is-active svg, .wishlist-btn.is-active svg path { fill: #000 !important; stroke: #000 !important; }
        .wishlist-btn:hover { transform: scale(1.1); }
        #wishlist-drawer { background-color: #ffffff !important; opacity: 1 !important; }
      `;
      document.head.appendChild(style);
    }
  },
  init() {
    this.injectCSS();
    this.updateUI();
    document.addEventListener('click', (e) => {
      // Toggle button
      const btn = e.target.closest('.wishlist-btn');
      if (btn) {
        e.preventDefault();
        const handle = btn.dataset.productHandle;
        if (handle) {
          this.toggleItem(handle);
        }
      }
      
      // Drawer trigger
      const trigger = e.target.closest('.wishlist-drawer-trigger');
      if (trigger) {
        e.preventDefault();
        const drawer = document.getElementById('wishlist-drawer');
        if (drawer && (drawer.style.transform === 'translateX(0px)' || drawer.style.transform === 'translateX(0)')) {
          this.closeDrawer();
        } else {
          this.openDrawer();
        }
      }
      
      // Close drawer
      if (e.target.closest('.wishlist-drawer__close') || e.target.id === 'wishlist-drawer-overlay') {
        e.preventDefault();
        this.closeDrawer();
      }
    });
  }
};
document.addEventListener('DOMContentLoaded', () => Wishlist.init());
