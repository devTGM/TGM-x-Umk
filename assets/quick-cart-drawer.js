/* quick-cart-drawer.js */
(function () {
  function formatMoney(cents) {
    if (typeof cents === "string") cents = cents.replace(".", "");
    const value = (cents / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 2,
      minimumFractionDigits: 0
    });
    return "Rs. " + value;
  }

  window.closeQuickCartDrawer = function (e) {
    if (e) {
      if (typeof e.preventDefault === "function") e.preventDefault();
      if (typeof e.stopPropagation === "function") e.stopPropagation();
    }
    const drawers = document.querySelectorAll("quick-cart-drawer");
    drawers.forEach((drawer) => {
      drawer.classList.remove("is--open");
      drawer.toggleState = false;
      drawer.style.display = "none";
      drawer.dispatchEvent(new Event("closed", { bubbles: true }));
    });
    const shopLookDrawer = document.querySelector("shop-the-look-drawer");
    if (!shopLookDrawer || !shopLookDrawer.classList.contains("is--open")) {
      document.body.classList.remove("overflow-hidden");
      document.body.style.overflow = "";
    }
  };

  function getDrawerElement() {
    let drawer = document.querySelector("quick-cart-drawer");
    if (!drawer) {
      drawer = document.createElement("quick-cart-drawer");
      drawer.innerHTML = `
        <div class="quick-cart-drawer__blocks slim-scrollbar" tabindex="-1">
          <div class="quick-cart-drawer__header">
            <h5>SELECT SIZE & QUANTITY</h5>
            <button type="button" class="button--close" aria-label="Close" onclick="window.closeQuickCartDrawer && window.closeQuickCartDrawer(event)">
              <svg class="icon icon-theme-close" viewBox="0 0 16 16" width="16" height="16">
                <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              </svg>
            </button>
          </div>
          <div class="quick-cart-drawer__main"></div>
        </div>
        <div class="quick-cart-drawer__backdrop" onclick="window.closeQuickCartDrawer && window.closeQuickCartDrawer(event)"></div>
      `;
      document.body.appendChild(drawer);
    }
    return drawer;
  }

  class QuickCartDrawer extends HTMLElement {
    constructor() {
      super();
      this.sliderInstance = null;
      this.toggleState = false;
      if (window.Shopify && window.Shopify.designMode) {
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
      const closeBtn = this.querySelector(".button--close");
      if (closeBtn) {
        closeBtn.onclick = (e) => window.closeQuickCartDrawer(e);
      }
      const backdrop = this.querySelector(".quick-cart-drawer__backdrop");
      if (backdrop) {
        backdrop.onclick = (e) => window.closeQuickCartDrawer(e);
      }
      this.querySelector(".quick-cart-drawer__blocks")?.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && this.toggleState) this.close();
      });
    }

    open() {
      this.toggleState = true;
      this.style.display = "flex";
      document.body.classList.add("overflow-hidden");
      this.classList.add("is--open");
      const blocks = this.querySelector(".quick-cart-drawer__blocks");
      blocks?.setAttribute("tabindex", "0");
      this.dispatchEvent(new Event("opened", { bubbles: true }));
    }

    close() {
      this.toggleState = false;
      this.classList.remove("is--open");
      this.style.display = "none";
      const shopLookDrawer = document.querySelector("shop-the-look-drawer");
      if (!shopLookDrawer || !shopLookDrawer.classList.contains("is--open")) {
        document.body.classList.remove("overflow-hidden");
        document.body.style.overflow = "";
      }
      this.dispatchEvent(new Event("closed", { bubbles: true }));
    }

    setActiveMedia(mediaId) {
      const slide = Array.from(this.querySelectorAll("[data-media-id]")).find(
        (el) => Number(el.dataset.mediaId) === mediaId
      );
      if (slide && this.sliderInstance) {
        this.sliderInstance.slideTo(Number(slide.dataset.index));
      }
    }

    renderFromProductJson(product) {
      const main = this.querySelector(".quick-cart-drawer__main");
      if (!main) return;

      const hasComparePrice = product.compare_at_price > product.price;
      const firstAvailableVariant = product.variants.find((v) => v.available) || product.variants[0];

      let mediaHtml = "";
      if (product.images && product.images.length > 0) {
        const slides = product.images
          .map(
            (img, idx) => `
          <div class="swiper-slide" data-index="${idx}">
            <img src="${img}" alt="${product.title}" loading="lazy" />
          </div>
        `
          )
          .join("");
        mediaHtml = `
          <div class="quick-cart-drawer__slider-wrapper">
            <div class="swiper quick-cart-drawer__media-swiper">
              <div class="swiper-wrapper">
                ${slides}
              </div>
            </div>
          </div>
        `;
      } else if (product.featured_image) {
        mediaHtml = `
          <div class="quick-cart-drawer__slider-wrapper">
            <div class="swiper-slide">
              <img src="${product.featured_image}" alt="${product.title}" />
            </div>
          </div>
        `;
      }

      // Variant options HTML
      let optionsHtml = "";
      if (product.variants.length > 1) {
        const optionsList = product.options
          .map((option, optIdx) => {
            const optNum = optIdx + 1;
            const optNameLower = (option.name || "").toLowerCase();

            // Render single delivery timeline option as a clean badge
            if (
              option.values.length === 1 &&
              (optNameLower.includes("delivery") ||
                optNameLower.includes("ship") ||
                optNameLower.includes("timeline"))
            ) {
              return `
                <div class="quick-cart-delivery-badge">
                  <span class="delivery-icon">⚡</span>
                  <span class="delivery-text">${option.name}: <strong>${option.values[0]}</strong></span>
                </div>
              `;
            }

            const valuesHtml = option.values
              .map((val) => {
                const isSelected = firstAvailableVariant[`option${optNum}`] === val;
                const isAvailable = product.variants.some(
                  (v) => v[`option${optNum}`] === val && v.available
                );
                return `
                <div class="button--variant ${isSelected ? "checked" : ""} ${!isAvailable ? "disabled" : ""}" data-value="${val}" data-opt-index="${optNum}">
                  <label>${val}</label>
                </div>
              `;
              })
              .join("");

            return `
            <div class="product__variant-options js-product-card-options" data-option-num="${optNum}">
              <legend>
                <span class="option-name">${option.name}:</span>
                <span class="option-selected-val" data-selected-variant>${firstAvailableVariant[`option${optNum}`] || ""}</span>
              </legend>
              <div class="variant-pills-row">${valuesHtml}</div>
            </div>
          `;
          })
          .join("");

        optionsHtml = `<div class="product-card__variants">${optionsList}</div>`;
      }

      const priceFormatted = formatMoney(firstAvailableVariant.price);
      const comparePriceFormatted = hasComparePrice ? formatMoney(firstAvailableVariant.compare_at_price) : "";

      main.innerHTML = `
        <div class="quick-cart-product product">
          ${mediaHtml}
          <div class="product__content">
            <div class="quick-cart-product-header">
              <h3 class="quick-cart-product-title">${product.title}</h3>
              <div class="quick-cart-product-price">
                ${hasComparePrice ? `<s>${comparePriceFormatted}</s> ` : ""}
                <span class="price">${priceFormatted}</span>
              </div>
              <div class="snapmint_emi_detail_custom">
                <div class="snapmint-emi-info" style="display:flex;align-items:center;gap:6px;flex-wrap:wrap;">
                  <span style="background:#28a745;color:#fff;font-size:10px;font-weight:700;padding:2px 6px;border-radius:4px;">NEW</span>
                  <span>OR <strong>₹${Math.round(firstAvailableVariant.price / 400).toLocaleString("en-IN")}</strong> /MONTH (4 MONTHS)</span>
                  <span style="color:#666;font-size:11px;">0% EMI ON UPI • <strong>snapmint</strong></span>
                </div>
                <button type="button" class="snapmint-emi-btn">BUY ON EMI</button>
              </div>
            </div>

            ${optionsHtml}

            <form class="product-card__add-to-cart--form product__form">
              <input type="hidden" name="id" value="${firstAvailableVariant.id}">
              <div class="quick-cart-actions-row">
                <div class="product-selector__quantity">
                  <div class="quantity__wrapper">
                    <button class="quantity__button" name="decrement" type="button" aria-label="Decrease quantity">
                      <svg width="12" height="2" viewBox="0 0 12 2" fill="none"><path d="M1 1H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                    <input class="quantity__input" type="number" name="quantity" min="1" max="99" value="1" aria-label="Quantity">
                    <button class="quantity__button" name="increment" type="button" aria-label="Increase quantity">
                      <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M6 1V11M1 6H11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>
                    </button>
                  </div>
                </div>
                <button type="submit" class="button product-card__submit-btn" ${!firstAvailableVariant.available ? "disabled" : ""}>
                  <span>${firstAvailableVariant.available ? "ADD TO CART" : "SOLD OUT"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      `;

      // Initialize Swiper if multiple images
      if (typeof Swiper !== "undefined" && product.images && product.images.length > 1) {
        this.sliderInstance = new Swiper(this.querySelector(".quick-cart-drawer__media-swiper"), {
          slidesPerView: 1.25,
          spaceBetween: 8,
          freeMode: { enabled: true },
          breakpoints: { 750: { slidesPerView: 2 } }
        });
      }

      // Handle Variant Clicks
      const formIdInput = main.querySelector("input[name='id']");
      const submitBtn = main.querySelector("button.product-card__submit-btn");
      const priceEl = main.querySelector(".product__price");

      const updateSelectedVariant = () => {
        const selectedOpts = [];
        main.querySelectorAll(".product__variant-options").forEach((optGroup) => {
          const checked = optGroup.querySelector(".button--variant.checked");
          if (checked) selectedOpts.push(checked.dataset.value);
        });

        const matchingVariant = product.variants.find((v) => {
          return selectedOpts.every((optVal, i) => v[`option${i + 1}`] === optVal);
        });

        if (matchingVariant) {
          if (formIdInput) formIdInput.value = matchingVariant.id;
          if (priceEl) {
            const hasComp = matchingVariant.compare_at_price > matchingVariant.price;
            priceEl.innerHTML = `
              ${hasComp ? `<s>${formatMoney(matchingVariant.compare_at_price)}</s> ` : ""}
              <span class="price">${formatMoney(matchingVariant.price)}</span>
            `;
          }
          if (submitBtn) {
            if (matchingVariant.available) {
              submitBtn.removeAttribute("disabled");
              submitBtn.innerHTML = "<span>ADD TO CART</span>";
            } else {
              submitBtn.setAttribute("disabled", "disabled");
              submitBtn.innerHTML = "<span>SOLD OUT</span>";
            }
          }
        }
      };

      main.querySelectorAll(".button--variant").forEach((pill) => {
        pill.addEventListener("click", () => {
          const group = pill.closest(".product__variant-options");
          group.querySelectorAll(".button--variant").forEach((p) => p.classList.remove("checked"));
          pill.classList.add("checked");
          const label = group.querySelector("[data-selected-variant]");
          if (label) label.textContent = pill.dataset.value;
          updateSelectedVariant();
        });
      });

      // Quantity controls
      const qtyInput = main.querySelector("input.quantity__input");
      main.querySelector(".quantity__button[name='decrement']")?.addEventListener("click", () => {
        if (!qtyInput) return;
        let v = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = Math.max(1, v - 1);
      });
      main.querySelector(".quantity__button[name='increment']")?.addEventListener("click", () => {
        if (!qtyInput) return;
        let v = parseInt(qtyInput.value, 10) || 1;
        qtyInput.value = Math.min(99, v + 1);
      });

      // Form Submit
      const form = main.querySelector("form.product-card__add-to-cart--form");
      form?.addEventListener("submit", async (evt) => {
        evt.preventDefault();
        const variantId = formIdInput?.value;
        const qty = parseInt(qtyInput?.value, 10) || 1;
        if (!variantId) return;

        submitBtn?.setAttribute("disabled", "disabled");
        const prevText = submitBtn?.innerHTML || "";
        if (submitBtn) submitBtn.innerHTML = "<span>ADDING...</span>";

        try {
          const cart = document.querySelector("cart-drawer");
          const sections = cart && typeof cart.getSectionsToRender === "function"
            ? cart.getSectionsToRender().map((s) => s.section).join(",")
            : "";

          const bodyData = new FormData();
          bodyData.append("id", variantId);
          bodyData.append("quantity", qty.toString());
          if (sections) {
            bodyData.append("sections", sections);
            bodyData.append("sections_url", window.location.pathname);
          }

          const res = await fetch("/cart/add.js", {
            method: "POST",
            body: bodyData
          });
          const data = await res.json();

          if (data.errors) {
            alert(data.errors);
          } else {
            this.close();
            if (cart && typeof cart.renderContents === "function") {
              cart.renderContents(data);
            } else if (typeof updateCartCounters === "function") {
              updateCartCounters();
            }
          }
        } catch (err) {
          console.error("Cart Add Error:", err);
        } finally {
          submitBtn?.removeAttribute("disabled");
          if (submitBtn) submitBtn.innerHTML = prevText;
        }
      });

      this.open();
    }

    async fetchProductForQuickCartDrawer(e, directTrigger = null) {
      const trigger = directTrigger || (e && e.target ? e.target.closest(".quick-cart-drawer__trigger") : null);
      if (!trigger) return;

      const productUrlEl = trigger.closest("[data-product-url]") || trigger;
      productUrlEl.classList.add("is--loading");

      let rawUrl = productUrlEl.dataset.productUrl || trigger.dataset.productUrl || "";
      if (!rawUrl.startsWith("http") && !rawUrl.startsWith("/")) {
        rawUrl = "/" + rawUrl;
      }
      rawUrl = rawUrl.split("?")[0];

      // Extract handle
      const handleMatch = rawUrl.match(/\/products\/([^/?#]+)/);
      const productHandle = handleMatch ? handleMatch[1] : "";

      try {
        let loaded = false;

        // Strategy 1: Fetch HTML template view
        try {
          const viewUrl = rawUrl.endsWith("/") ? `${rawUrl}?view=quick-cart` : `${rawUrl}/?view=quick-cart`;
          const res = await fetch(viewUrl);
          if (res.ok) {
            const html = await res.text();
            const div = document.createElement("div");
            div.innerHTML = html;
            const productContent = div.querySelector(".quick-cart-product");
            if (productContent) {
              const main = this.querySelector(".quick-cart-drawer__main");
              if (main) {
                main.innerHTML = "";
                main.append(productContent);
              }

              if (typeof Swiper !== "undefined") {
                this.sliderInstance = new Swiper(this.querySelector(".quick-cart-drawer__media-swiper"), {
                  slidesPerView: 1.25,
                  spaceBetween: 8,
                  freeMode: { enabled: true },
                  breakpoints: { 750: { slidesPerView: 2 } }
                });
              }

              const form = main.querySelector("form.product-card__add-to-cart--form");
              const formIdInput = form?.querySelector("input[name='id']");
              const submitBtn = form?.querySelector("button[type='submit']");
              const qtyInput = form?.querySelector("input[name='quantity']");

              // Handle variant pill clicks
              main.querySelectorAll(".button--variant").forEach((pill) => {
                pill.addEventListener("click", () => {
                  const fieldset = pill.closest(".product__variant-options");
                  fieldset?.querySelectorAll(".button--variant").forEach((p) => p.classList.remove("checked"));
                  pill.classList.add("checked");

                  const radio = pill.querySelector("input[type='radio']");
                  if (radio) {
                    radio.checked = true;
                    radio.dispatchEvent(new Event("change", { bubbles: true }));
                  }

                  const selectedLabel = fieldset?.querySelector("[data-selected-variant]");
                  if (selectedLabel && radio) {
                    selectedLabel.textContent = radio.value;
                  }
                });
              });

              // Handle quantity buttons
              main.querySelector(".quantity__button[name='decrement']")?.addEventListener("click", () => {
                if (!qtyInput) return;
                let v = parseInt(qtyInput.value, 10) || 1;
                qtyInput.value = Math.max(1, v - 1);
              });
              main.querySelector(".quantity__button[name='increment']")?.addEventListener("click", () => {
                if (!qtyInput) return;
                let v = parseInt(qtyInput.value, 10) || 1;
                qtyInput.value = Math.min(99, v + 1);
              });

              // Form submit
              form?.addEventListener("submit", async (evt) => {
                evt.preventDefault();
                const variantId = formIdInput?.value;
                const qty = parseInt(qtyInput?.value, 10) || 1;
                if (!variantId) return;

                submitBtn?.setAttribute("disabled", "disabled");
                const prevText = submitBtn?.innerHTML || "";
                if (submitBtn) submitBtn.innerHTML = "<span>ADDING...</span>";

                try {
                  const cart = document.querySelector("cart-drawer");
                  const sections = cart && typeof cart.getSectionsToRender === "function"
                    ? cart.getSectionsToRender().map((s) => s.section).join(",")
                    : "";

                  const bodyData = new FormData();
                  bodyData.append("id", variantId);
                  bodyData.append("quantity", qty.toString());
                  if (sections) {
                    bodyData.append("sections", sections);
                    bodyData.append("sections_url", window.location.pathname);
                  }

                  const res = await fetch("/cart/add.js", {
                    method: "POST",
                    body: bodyData
                  });
                  const data = await res.json();

                  if (data.errors) {
                    alert(data.errors);
                  } else {
                    this.close();
                    if (cart && typeof cart.renderContents === "function") {
                      cart.renderContents(data);
                    } else if (typeof updateCartCounters === "function") {
                      updateCartCounters();
                    }
                  }
                } catch (err) {
                  console.error("Cart Add Error:", err);
                } finally {
                  submitBtn?.removeAttribute("disabled");
                  if (submitBtn) submitBtn.innerHTML = prevText;
                }
              });

              this.open();
              loaded = true;
            }
          }
        } catch (err) {
          console.warn("HTML quick-cart fetch failed, falling back to JSON API:", err);
        }

        // Strategy 2: If HTML view didn't work, fetch Product JSON API
        if (!loaded && productHandle) {
          const jsonRes = await fetch(`/products/${productHandle}.js`);
          if (jsonRes.ok) {
            const productJson = await jsonRes.json();
            this.renderFromProductJson(productJson);
            loaded = true;
          }
        }
      } catch (err) {
        console.error("Quick cart drawer error:", err);
      } finally {
        productUrlEl.classList.remove("is--loading");
      }
    }
  }

  if (!customElements.get("quick-cart-drawer")) {
    customElements.define("quick-cart-drawer", QuickCartDrawer);
  }

  // Global click listener for closing drawer and opening triggers
  document.addEventListener("click", (e) => {
    // 1. Check if clicked close button or backdrop
    const closeBtn = e.target.closest(
      "quick-cart-drawer .button--close, [aria-controls='quick-cart-drawer'].button--close, .quick-cart-drawer__backdrop"
    );
    if (closeBtn) {
      e.preventDefault();
      e.stopPropagation();
      const drawer = document.querySelector("quick-cart-drawer");
      if (drawer) {
        if (typeof drawer.close === "function") {
          drawer.close();
        } else {
          drawer.classList.remove("is--open");
        }
        document.body.classList.remove("overflow-hidden");
        document.body.style.overflow = "";
      }
      return;
    }

    // 2. Check if clicked trigger
    const trigger = e.target.closest(".quick-cart-drawer__trigger, .product-card__add-to-cart--button");
    if (trigger) {
      if (trigger.classList.contains("js-cart-quick-add-btn")) return;
      e.preventDefault();
      e.stopPropagation();

      const drawer = getDrawerElement();
      if (drawer && typeof drawer.fetchProductForQuickCartDrawer === "function") {
        drawer.fetchProductForQuickCartDrawer(e, trigger);
      }
    }
  });

  // ESC key listener to close drawer
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" || e.code === "Escape") {
      const drawer = document.querySelector("quick-cart-drawer.is--open");
      if (drawer) {
        if (typeof drawer.close === "function") {
          drawer.close();
        } else {
          drawer.classList.remove("is--open");
        }
        document.body.classList.remove("overflow-hidden");
        document.body.style.overflow = "";
      }
    }
  });
})();