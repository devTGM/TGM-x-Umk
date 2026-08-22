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
}