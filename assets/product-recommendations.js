if (!customElements.get("product-recommendations")) {
  class ProductRecommendations extends HTMLElement {
    constructor() {
      super();
      this.slider = null;
    }
    connectedCallback() {
      this.performRecommendations();
    }
    performRecommendations() {
      const container = this.querySelector("[data-recommendations]");
      if (!container || !this.dataset.url) return;

      fetch(this.dataset.url)
        .then((res) => res.text())
        .then((html) => {
          const parsed = new DOMParser().parseFromString(html, "text/html");
          const recHtml = parsed.querySelector("[data-recommendations]")?.innerHTML;
          if (recHtml && recHtml.trim() !== "") {
            this.classList.remove("hidden");
            const fullItems = document.querySelector(".cart-drawer-items__full");
            if (fullItems) fullItems.classList.remove("cart-drawer-items__full");
            container.innerHTML = recHtml;
            this.initSlider();
          }
        })
        .catch((err) => console.error("Error loading recommendations:", err));
    }
    initSlider() {
      const swiperEl = this.querySelector(".swiper");
      if (swiperEl && typeof Swiper !== "undefined") {
        this.slider = new Swiper(swiperEl, {
          slidesPerView: "auto",
          spaceBetween: 16,
          navigation: {
            nextEl: ".swiper-button-next",
            prevEl: ".swiper-button-prev",
          },
        });
      }
    }
  }
  customElements.define("product-recommendations", ProductRecommendations);

  // Global click handler for 1-variant direct add-to-cart buttons
  document.addEventListener("click", function (e) {
    const btn = e.target.closest(".js-cart-quick-add-btn");
    if (!btn) return;
    e.preventDefault();
    const variantId = btn.dataset.variantId;
    if (!variantId) return;

    btn.setAttribute("disabled", "disabled");
    const originalContent = btn.innerHTML;
    btn.innerHTML = `<span>⏳</span> ADDING...`;

    const cart = document.querySelector("cart-drawer");
    const formData = new FormData();
    formData.append("id", variantId);
    formData.append("quantity", "1");

    if (cart && typeof cart.getSectionsToRender === "function") {
      formData.append(
        "sections",
        cart.getSectionsToRender().map((s) => s.section),
      );
      formData.append("sections_url", window.location.pathname);
    }

    const addUrl = window.routes?.cart_add_url || "/cart/add.js";

    fetch(addUrl, {
      method: "POST",
      headers: {
        "X-Requested-With": "XMLHttpRequest",
        Accept: "application/json",
      },
      body: formData,
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.errors) {
          console.error("Cart add error:", data.errors);
          btn.innerHTML = originalContent;
          btn.removeAttribute("disabled");
        } else {
          if (cart && typeof cart.renderContents === "function") {
            cart.renderContents(data);
          }
          if (typeof updateCartCounters === "function") updateCartCounters();
          if (typeof updateFreeShipping === "function") updateFreeShipping();

          btn.innerHTML = `<span>✓</span> ADDED`;
          setTimeout(() => {
            btn.innerHTML = originalContent;
            btn.removeAttribute("disabled");
          }, 1500);
        }
      })
      .catch((err) => {
        console.error("Cart add exception:", err);
        btn.innerHTML = originalContent;
        btn.removeAttribute("disabled");
      });
  });
}