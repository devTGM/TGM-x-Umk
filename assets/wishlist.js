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
    
    // If we're on the wishlist page, we might want to remove the card visually immediately
    const card = document.querySelector(`.wishlist-item[data-product-handle="${handle}"]`);
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
    const grid = document.querySelector('.wishlist-grid');
    const emptyState = document.querySelector('.wishlist-empty');
    if (grid && emptyState) {
      if (items.length === 0) {
        grid.style.display = 'none';
        emptyState.style.display = 'block';
      } else {
        grid.style.display = 'grid'; // or whatever display you use
        emptyState.style.display = 'none';
      }
    }
  },
  updateUI() {
    const items = this.getItems();
    // Update badge count
    const badge = document.querySelector('.wishlist-count-badge');
    if (badge) {
      badge.textContent = items.length;
      badge.style.display = items.length > 0 ? 'inline-flex' : 'none';
    }
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
  async loadWishlistPage() {
    const items = this.getItems();
    const grid = document.querySelector('.wishlist-grid');
    if (!grid) return;
    
    this.checkEmptyState();
    if (items.length === 0) return;
    
    grid.innerHTML = '<p>Loading your wishlist...</p>';
    
    try {
      // Fetch product cards via Section Rendering API using a dummy collection or search
      // Actually, since we only have handles, it's easiest to fetch each product page and extract the card
      // A more robust way is querying products by handle but Shopify doesn't have an endpoint for multiple handles.
      // So we fetch them individually or use a custom search endpoint if possible.
      // For lightweight custom: fetch individually.
      
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
      grid.innerHTML = '<p>There was an error loading your wishlist.</p>';
    }
  },
  init() {
    this.updateUI();
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('.wishlist-btn');
      if (btn) {
        e.preventDefault();
        const handle = btn.dataset.productHandle;
        if (handle) {
          this.toggleItem(handle);
        }
      }
    });
    
    if (document.querySelector('.wishlist-grid')) {
      this.loadWishlistPage();
    }
  }
};
document.addEventListener('DOMContentLoaded', () => Wishlist.init());
