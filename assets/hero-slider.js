if (!customElements.get("hero-slider")) {
  class HeroSlider extends HTMLElement {
    constructor() {
      super();
      if (window.Shopify && window.Shopify.designMode) {
        window.addEventListener("shopify:section:load", () => {
          this.mountSlider();
        });
      }
      this.mountSlider();
      window.addEventListener("shopify:block:select", (e) => {
        const t = +e.target.dataset.index;
        if (this.slider) this.slider.slideTo(t, 600);
      });
      this.lastActiveIndex = null;
      this.addKeyboardNavigation();
    }

    mountSlider() {
      const autoplayDelay = parseInt(this.dataset.autoplayInterval, 10) || 6000;
      const enableAutoplay = "true" === this.dataset.autoplay && autoplayDelay > 0;
      const autoplayConfig = enableAutoplay ? { delay: autoplayDelay, disableOnInteraction: false } : false;

      this.slider = new Swiper(this, {
        rewind: true,
        slidesPerView: 1,
        speed: 600,
        followFinger: false,
        navigation: {
          nextEl: ".swiper-button--next",
          prevEl: ".swiper-button--prev"
        },
        pagination: {
          el: ".swiper-pagination",
          clickable: true,
          renderBullet: function (index, className) {
            return `
            <button class="${className}">
              <span>0${index + 1}</span>
              <svg class="square-progress" width="26" height="26">
                <rect class="square-origin" width="26" height="26" rx="5" ry="5" />
              </svg>
              <svg class="progress" width="18" height="18" style="inset-inline-start: ${0 - (2.4 * index + 3.4)}rem">
                <circle class="circle-origin" r="8" cx="9.5" cy="9.5"></circle>
              </svg>
            </button>
            `;
          }
        },
        autoplay: autoplayConfig,
        on: {
          init: this.handleSlideChange.bind(this),
          slideChange: this.handleSlideChange.bind(this)
        }
      });

      if (enableAutoplay && this.slider && this.slider.autoplay) {
        const isDesignMode = window.Shopify && window.Shopify.designMode;
        if (!isDesignMode) {
          this.slider.autoplay.stop();
          let started = false;
          const startAutoplay = () => {
            if (started) return;
            started = true;
            ["touchstart", "pointerdown", "scroll", "keydown"].forEach((evt) => {
              window.removeEventListener(evt, startAutoplay, { passive: true });
            });
            if (this.slider && this.slider.autoplay) {
              this.slider.autoplay.start();
            }
          };

          ["touchstart", "pointerdown", "scroll", "keydown"].forEach((evt) => {
            window.addEventListener(evt, startAutoplay, { once: true, passive: true });
          });

          window.addEventListener("load", () => {
            setTimeout(startAutoplay, 8000);
          }, { once: true });
        }
      }
    }

    handleSlideChange(e) {
      this.handleSlideChangeAnimations(e);
      const headerInner = document.querySelector(".header__inner");
      const heroInners = document.querySelectorAll(".hero__inner");
      if (headerInner && heroInners && heroInners[e.activeIndex]) {
        document.documentElement.style.setProperty(
          "--transparent-header-menu-text-color",
          heroInners[e.activeIndex].dataset.headerMenuTextColor
        );
      }
    }

    handleSlideChangeAnimations(e) {
      let delay = 300;
      const selector = `[data-index="${e.activeIndex}"]`;
      const activeSlide = e.wrapperEl.querySelector(selector);
      if (!activeSlide) return;
      const animations = [...(activeSlide.querySelectorAll(".hero__animation") || [])];
      if (!animations.length) return;

      const isMobileScreen = window.innerWidth < 750;
      const disableMobileAnim = "true" !== e.wrapperEl.closest(".hero__content")?.dataset.animationMobile && isMobileScreen;

      if (disableMobileAnim) {
        animations.forEach((el) => {
          el.classList.remove("in-delay");
        });
      } else {
        animations.forEach((el) => {
          el.classList.add("in-delay");
        });
        if (this.lastActiveIndex > e.activeIndex) {
          delay = 650 + delay;
          e.wrapperEl.style.transitionDuration = "1000ms";
          e.wrapperEl.style.transitionTimingFunction = "cubic-bezier(0.45, 0.00, 0.15, 0.95)";
        } else if (this.lastActiveIndex < e.activeIndex) {
          delay = 1000 + delay;
          e.wrapperEl.style.transitionDuration = "1000ms";
          e.wrapperEl.style.transitionTimingFunction = "cubic-bezier(0.45, 0.00, 0.15, 0.95)";
        }
        setTimeout(() => {
          if (this.lastActiveIndex > e.activeIndex) {
            delay = 325 + delay;
          } else if (this.lastActiveIndex < e.activeIndex) {
            delay = 500 + delay;
          }
          animations.forEach((el, idx) => {
            if (idx === 1) delay += 50;
            else if (idx === 2) delay += 175;
            else if (idx === 3) delay += 300;
            el.classList.remove("in-delay");
          });
        }, delay);
        this.lastActiveIndex = e.activeIndex;
      }
    }

    addKeyboardNavigation() {
      document.addEventListener("keydown", (e) => {
        if (this.isInViewport()) {
          if (e.key === "ArrowRight") {
            const nextBtn = this.querySelector(".swiper-button--next");
            if (nextBtn) nextBtn.click();
          }
          if (e.key === "ArrowLeft") {
            const prevBtn = this.querySelector(".swiper-button--prev");
            if (prevBtn) prevBtn.click();
          }
        }
      });
    }

    isInViewport() {
      const rect = this.getBoundingClientRect();
      return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
    }
  }

  customElements.define("hero-slider", HeroSlider);
}
