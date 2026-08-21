if (!customElements.get("quick-cart-drawer")) {
  class QuickCartDrawer extends HTMLElement {
    constructor() {
      super();
      this.sliderInstance = null;
      this.toggleState = false;
      if (Shopify.designMode) {
        window.addEventListener("shopify:section:load", this.init.bind(this));
        this.parentElement?.addEventListener("shopify:section:select", () => this.open());
        this.parentElement?.addEventListener("shopify:section:deselect", () => this.close());
      }
    }

    connectedCallback() {
      this.init();
    }

    init() {
      this.toggleState = false;
      if (!this.classList.contains("is--open")) {
        document.body.classList.remove("overflow-hidden");
      }
      this.querySelector(".button--close")?.addEventListener("click", this.close.bind(this));
      this.querySelector(".quick-cart-drawer__backdrop")?.addEventListener("click", this.close.bind(this));
      this.querySelector(".quick-cart-drawer__blocks")?.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.toggleState) {
          this.close();
        }
        if (this.toggleState) {
          const focusables = this.querySelectorAll(
            'button, [href], input, select, label, textarea, [tabindex]:not([tabindex="-1"])'
          );
          if (focusables.length > 0) {
            const first = focusables[0];
            const last = focusables[focusables.length - 1];
            if (e.key !== "Tab") return;
            if (e.shiftKey) {
              if (document.activeElement === first) {
                e.preventDefault();
                last.focus();
              }
            } else {
              if (document.activeElement === last) {
                e.preventDefault();
                first.focus();
              }
            }
          }
        }
      });
      this.initTriggers();
    }

    initTriggers() {
      if (this._triggersInitialized) return;
      this._triggersInitialized = true;

      document.addEventListener("click", (e) => {
        const trigger = e.target.closest(".quick-cart-drawer__trigger");
        if (trigger && !trigger.classList.contains("js-cart-quick-add-btn")) {
          e.preventDefault();
          const drawer = document.querySelector("quick-cart-drawer");
          if (drawer && typeof drawer.fetchProductForQuickCartDrawer === "function") {
            drawer.fetchProductForQuickCartDrawer(e, trigger);
          }
        }
      });
    }

    async fetchProductForQuickCartDrawer(e, directTrigger = null) {
      const trigger = directTrigger || e.target.closest(".quick-cart-drawer__trigger");
      if (!trigger) return;

      const cardSlider = trigger.closest("card-product-slider");
      if (cardSlider) {
        cardSlider.slider?.autoplay?.stop();
        cardSlider.classList.add("product--open-on-quick-cart");
      }

      const isRecommendations = trigger.classList.contains("quick-cart-drawer__trigger--recommendations");
      const productCard = trigger.closest("product-card");
      let checkedInputs = null;
      if (!isRecommendations && productCard) {
        checkedInputs = productCard.querySelectorAll('input[type="radio"]:checked, select');
      }

      const productUrlEl = trigger.closest("[data-product-url]") || trigger;
      productUrlEl.classList.add("is--loading");

      try {
        let rawUrl = productUrlEl.dataset.productUrl || trigger.dataset.productUrl || "";
        if (!rawUrl.startsWith("http") && !rawUrl.startsWith("/")) {
          rawUrl = "/" + rawUrl;
        }

        let localePrefix = "";
        if (
          window.Shopify?.routes?.root &&
          window.Shopify?.locale &&
          window.Shopify.routes.root.includes(`/${window.Shopify.locale}/`)
        ) {
          localePrefix = `/${window.Shopify.locale}`;
        }

        let fetchUrl = `${localePrefix}${rawUrl}`;
        const sep = fetchUrl.includes("?") ? "&" : (fetchUrl.endsWith("/") ? "?" : "/?");
        let response = await fetch(`${fetchUrl}${sep}view=quick-cart`);

        if (!response || !response.ok) {
          const sep2 = fetchUrl.includes("?") ? "&" : "?";
          response = await fetch(`${fetchUrl}${sep2}view=quick-cart`);
        }

        if (!response || !response.ok) {
          const sep3 = rawUrl.includes("?") ? "&" : "?";
          response = await fetch(`${rawUrl}${sep3}view=quick-cart`);
        }

        if (!response || !response.ok) {
          console.error("Failed to fetch quick cart view:", response?.status);
          return;
        }

        const html = await response.text();
        const div = document.createElement("div");
        div.innerHTML = html;
        const productContent = div.querySelector(".quick-cart-product");
        if (!productContent) {
          console.error("quick-cart-product not found in response HTML");
          return;
        }

        const mainContainer = this.querySelector(".quick-cart-drawer__main");
        if (mainContainer) {
          mainContainer.innerHTML = "";
          mainContainer.append(productContent);
        }

        if (typeof Swiper !== "undefined") {
          this.sliderInstance = new Swiper(".quick-cart-drawer__media-swiper", {
            slidesPerView: 1.25,
            spaceBetween: 8,
            freeMode: { enabled: true },
            breakpoints: { 750: { slidesPerView: 2 } }
          });
        }

        const innerCard = this.querySelector("product-card");
        if (innerCard && typeof innerCard.init === "function") {
          innerCard.init();
        }

        if (!isRecommendations && checkedInputs && checkedInputs.length > 0 && productCard) {
          checkedInputs.forEach((input) => {
            const targetInput = this.querySelector(`[name="${input.name}"][value="${input.value}"]`);
            const legend = targetInput?.parentElement?.parentElement?.querySelector("legend");
            this.querySelectorAll(`[name="${input.name}"]`).forEach((el) => {
              el.removeAttribute("checked");
              el.closest("li")?.classList.remove("checked");
            });
            if (targetInput) {
              targetInput.setAttribute("checked", "");
              const selectedVariantText = legend?.querySelector("[data-selected-variant]");
              if (selectedVariantText) {
                selectedVariantText.innerHTML = input.value;
              }
            }
            if (innerCard) {
              const innerIdInput = innerCard.querySelector('input[name="id"]');
              const cardIdInput = productCard.querySelector('input[name="id"]');
              if (innerIdInput && cardIdInput) {
                innerIdInput.value = cardIdInput.value;
              }
              targetInput?.closest("li")?.classList.add("checked");
            }
          });
          if (innerCard && typeof innerCard.init === "function") {
            innerCard.init();
          }
        }

        // Setup variant option change listeners
        this.querySelector(".quick-cart-drawer__main")
          ?.querySelectorAll(".variant-option-radio-input")
          ?.forEach((radio) => {
            radio.addEventListener("change", (event) => {
              const fieldset = event.target.closest(".product__variant-options");
              const label = fieldset?.querySelector("[data-selected-variant]");
              if (label) {
                label.innerHTML = event.target.value;
              }
              // Update visual active state on variant pills
              fieldset?.querySelectorAll(".button--variant").forEach((vBtn) => {
                const r = vBtn.querySelector('input[type="radio"]');
                vBtn.classList.toggle("checked", !!r?.checked);
              });

              const card = this.querySelector("product-card");
              const variantId = this.querySelector(".product-card__add-to-cart--form input[name='id']")?.value;
              if (card && card.variantsObj && variantId) {
                const mediaId = card.variantsObj.find((v) => v.id == variantId)?.featured_media?.id;
                if (mediaId) {
                  this.setActiveMedia(mediaId);
                }
              }
            });
          });

        // Setup quantity stepper buttons in drawer
        this.querySelectorAll("quantity-input").forEach((qInput) => {
          const input = qInput.querySelector("input.quantity__input");
          qInput.querySelectorAll("button.quantity__button").forEach((btn) => {
            if (!btn._qbound) {
              btn._qbound = true;
              btn.addEventListener("click", (e) => {
                e.preventDefault();
                if (!input) return;
                const isInc = btn.getAttribute("name") === "increment" || btn.querySelector(".icon-theme-plus");
                let cur = parseInt(input.value, 10) || 1;
                if (isInc) {
                  cur = Math.min(99, cur + 1);
                } else {
                  cur = Math.max(1, cur - 1);
                }
                input.value = cur;
                input.dispatchEvent(new Event("change", { bubbles: true }));
              });
            }
          });
        });

        this.open();
      } catch (err) {
        console.error("Error in fetchProductForQuickCartDrawer:", err);
      } finally {
        productUrlEl.classList.remove("is--loading");
      }
    }

    setActiveMedia(mediaId) {
      const slide = Array.from(this.querySelectorAll("[data-media-id]")).find(
        (el) => Number(el.dataset.mediaId) === mediaId
      );
      if (slide && this.sliderInstance) {
        this.sliderInstance.slideTo(Number(slide.dataset.index));
      }
    }

    toggle() {
      this.toggleState ? this.close() : this.open();
    }

    open() {
      this.toggleState = true;
      document.body.classList.add("overflow-hidden");
      const blocks = this.querySelector(".quick-cart-drawer__blocks");
      const closeBtn = blocks?.querySelector(".button--close");
      blocks?.setAttribute("tabindex", "0");
      closeBtn?.setAttribute("tabindex", "0");
      this.classList.add("is--open");
      this.opened();
      const focusable = this.querySelector(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      focusable?.focus();
    }

    close() {
      this.toggleState = false;
      const shopLookDrawer = document.querySelector("shop-the-look-drawer");
      if (!shopLookDrawer || !shopLookDrawer.classList.contains("is--open")) {
        document.body.classList.remove("overflow-hidden");
      }
      this.classList.remove("is--open");
      this.closed();
      this.toggleAriaExpanded();
      const openCardSlider = document.querySelector("card-product-slider.product--open-on-quick-cart");
      if (openCardSlider) {
        openCardSlider.slider?.autoplay?.start();
        openCardSlider.classList.remove("product--open-on-quick-cart");
      }
    }

    toggleAriaExpanded(e) {
      if (e) {
        e.target.closest("button")?.setAttribute("aria-expanded", "true");
        this.querySelector(".button--close")?.setAttribute("aria-expanded", "true");
      } else {
        document.querySelectorAll('[aria-controls="quick-cart-drawer"]').forEach((el) => {
          el.setAttribute("aria-expanded", "false");
        });
      }
    }

    opened() {
      this.dispatchEvent(new Event("opened", { bubbles: true }));
    }

    closed() {
      this.dispatchEvent(new Event("closed", { bubbles: true }));
    }
  }
  customElements.define("quick-cart-drawer", QuickCartDrawer);
}