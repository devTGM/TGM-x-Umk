const getSectionData = (e, t, r) => ({ id: e, section: t, selector: r }),
  cartDrawer = document.querySelector("cart-drawer");
let sectionsToRender = [];
if (cartDrawer) {
  const e = document.getElementById("main-cart-items")?.dataset.id;
  sectionsToRender = e
    ? [
        getSectionData(
          `#shopify-section-${e}`,
          e,
          `#shopify-section-${e} cart-items`,
        ),
        getSectionData(
          "#cart-counter",
          "cart-counter",
          "#shopify-section-cart-counter",
        ),
        getSectionData(
          "#CartDrawer-Body",
          "cart-drawer",
          "#shopify-section-cart-drawer #CartDrawer-Body",
        ),
      ]
    : [
        getSectionData(
          "#CartDrawer-Body",
          "cart-drawer",
          "#shopify-section-cart-drawer #CartDrawer-Body",
        ),
      ];
} else {
  const e = document.getElementById("main-cart-items")?.dataset.id;
  sectionsToRender = e
    ? [
        getSectionData(
          `#shopify-section-${e}`,
          e,
          `#shopify-section-${e} cart-items`,
        ),
        getSectionData(
          "#cart-counter",
          "cart-counter",
          "#shopify-section-cart-counter",
        ),
      ]
    : [];
}
class CartRemoveButton extends HTMLElement {
  constructor() {
    (super(),
      this.addEventListener("click", (e) => {
        e.preventDefault();
        ((
          this.closest("cart-drawer-items") || this.closest("cart-items")
        ).updateQuantity(this.dataset.index, 0),
          updateFreeShipping());
      }));
  }
}
customElements.define("cart-remove-button", CartRemoveButton);
class CartItems extends HTMLElement {
  constructor() {
    (super(),
      (this.freeShipping = document.querySelectorAll("shipping-bar")),
      (this.currentItemCount = Array.from(
        this.querySelectorAll('[name="updates[]"]'),
      ).reduce((e, t) => e + parseInt(t.value), 0)),
      (this.debouncedOnChange = debounce((e) => {
        this.onChange(e);
      }, 300)),
      this.addEventListener("change", this.debouncedOnChange.bind(this)),
      updateFreeShipping());
  }
  calculateTotalItemCount(e) {
    return e.reduce((e, t) => e + t.quantity, 0);
  }
  onChange(e) {
    "updates[]" === e.target.name &&
      this.updateQuantity(
        e.target.dataset.index,
        e.target.value,
        document.activeElement.getAttribute("name"),
      );
  }
  getSectionsToRender() {
    return sectionsToRender;
  }
  updateQuantity(e, t, r) {
    this.classList.add("is-loading");
    const n = JSON.stringify({
      line: e,
      quantity: t,
      sections: this.getSectionsToRender().map((e) => e.section),
      sections_url: window.location.pathname,
    });
    fetch(`${routes.cart_change_url}`, { ...fetchConfig(), body: n })
      .then((e) => e.text())
      .then((t) => {
        const n = JSON.parse(t);
        (this.getSectionsToRender()?.forEach((e) => {
          const t =
            document.querySelector(e.selector) || document.querySelector(e.id);
          t
            ? n.errors ||
              (t.innerHTML = this.getSectionInnerHTML(
                n.sections[e.section],
                e.selector,
              ))
            : console.error(`Element with selector ${e.selector} not found`);
        }),
          n.errors ||
            (this.totalItemCount = this.calculateTotalItemCount(n.items)),
          this.updateLiveRegions(e, n.item_count, n.errors));
        const s = document.getElementById(`CartItem-${e}`);
        (s &&
          s.querySelector(`[name="${r}"]`) &&
          s.querySelector(`[name="${r}"]`).focus(),
          updateCartCounters(),
          updateFreeShipping());
      })
      .finally(() => this.classList.remove("is-loading"));
  }
  getSectionInnerHTML(e, t) {
    try {
      const doc = new DOMParser().parseFromString(e, "text/html");
      const el = doc.querySelector(t) || doc.querySelector("#CartDrawer-Body") || doc.querySelector("[data-cart-body]");
      return el ? el.innerHTML : "";
    } catch (err) {
      console.error(err);
      return "";
    }
  }
  updateLiveRegions(e, t, r) {
    (r &&
      document
        .querySelectorAll(`[data-line-item-error][data-line="${e}"]`)
        .forEach((e) => {
          e.innerHTML = r;
        }),
      (this.currentItemCount = t));
  }
}
customElements.define("cart-items", CartItems);
class CartDrawer extends HTMLElement {
  constructor() {
    (super(),
      this.addEventListener(
        "keyup",
        (e) => "ESCAPE" === e.code.toUpperCase() && this.close(),
      ),
      this.setCartLink(),
      this.parentElement.addEventListener("shopify:section:select", () =>
        this.open(),
      ),
      this.parentElement.addEventListener("shopify:section:deselect", () =>
        this.close(),
      ));
  }
  setCartLink() {
    const e = document.querySelector("[data-cart-link]");
    e
      ? (e.setAttribute("role", "button"),
        e.setAttribute("aria-haspopup", "dialog"),
        e.addEventListener("click", (t) => {
          (t.preventDefault(), this.open(e));
        }),
        e.addEventListener("keydown", (t) => {
          "SPACE" === t.code.toUpperCase() &&
            (t.preventDefault(), this.open(e));
        }))
      : console.error("Cart link not found");
  }
  open(e) {
    (e && this.setActiveElement(e),
      this.classList.add("is-visible"),
      (document.querySelector("body").style.overflow = "hidden"),
      this.addEventListener(
        "transitionend",
        () => {
          this.focusOnCartDrawer();
        },
        { once: !0 },
      ),
      setTimeout(() => {
        document.addEventListener("click", this.handleOutsideClick);
      }, 100));
    const t = document.querySelector(".product-recommendations");
    t &&
      (t.classList.contains("hidden")
        ? document
            .querySelector(".cart-drawer-items")
            ?.classList.add("cart-drawer-items__full")
        : document
            .querySelector(".cart-drawer-items")
            ?.classList.remove("cart-drawer-items__full"));
  }
  close() {
    (this.classList.remove("is-visible"),
      (document.querySelector("body").style.overflow = "auto"),
      removeTrapFocus(this.activeElement),
      document.removeEventListener("click", this.handleOutsideClick));
    if (
      !header.classList.contains("menu-open") &&
      "/cart" === window.location.pathname
    ) {
      const e = document.getElementById("CartDrawer-FormSummary");
      e && e.submit();
    }
  }
  handleOutsideClick = (e) => {
    const t = this.querySelector(".cart-drawer__inner");
    t && !t.contains(e.target) && this.close();
  };
  setActiveElement(e) {
    this.activeElement = e;
  }
  focusOnCartDrawer() {
    const e = this.firstElementChild,
      t = this.querySelector("[data-drawer-close]");
    trapFocus(e, t);
  }
  renderContents(e, t = !0) {
    this.getSectionsToRender()?.forEach((item) => {
      const targetEl =
        document.querySelector(item.id) || document.querySelector(item.selector);
      if (targetEl && e.sections && e.sections[item.section]) {
        const inner = this.getSectionInnerHTML(
          e.sections[item.section],
          item.selector,
        );
        if (inner) {
          targetEl.innerHTML = inner;
        }
      }
    });
    if (typeof updateCartCounters === "function") updateCartCounters();
    if (typeof updateFreeShipping === "function") updateFreeShipping();
    t && this.open();
  }
  getSectionsToRender() {
    return sectionsToRender;
  }
  getSectionInnerHTML(e, t) {
    try {
      const doc = new DOMParser().parseFromString(e, "text/html");
      const el = doc.querySelector(t) || doc.querySelector("#CartDrawer-Body") || doc.querySelector("[data-cart-body]");
      return el ? el.innerHTML : "";
    } catch (err) {
      console.error(err);
      return "";
    }
  }
}
customElements.define("cart-drawer", CartDrawer);
class CartDrawerItems extends CartItems {
  getSectionsToRender() {
    return sectionsToRender;
  }
}
customElements.define("cart-drawer-items", CartDrawerItems);

// Global click handler for recommendation ADD buttons
document.addEventListener("click", function (e) {
  const btn = e.target.closest(
    ".js-cart-quick-add-btn, .custom-add-btn, .quick-cart-drawer__trigger--recommendations",
  );
  if (!btn) return;
  if (btn.hasAttribute("disabled") || btn.classList.contains("is--loading")) {
    e.preventDefault();
    e.stopPropagation();
    return;
  }

  const hasMultipleVariants =
    btn.dataset.hasMultipleVariants === "true" ||
    (btn.classList.contains("quick-cart-drawer__trigger") && !btn.dataset.variantId);
  const productUrl = btn.dataset.productUrl;
  const variantId = btn.dataset.variantId;
  const quickCartDrawer = document.querySelector("quick-cart-drawer");

  if (hasMultipleVariants && quickCartDrawer && productUrl) {
    e.preventDefault();
    e.stopPropagation();
    quickCartDrawer.fetchProductForQuickCartDrawer(e, btn);
    return;
  }

  if (variantId) {
    e.preventDefault();
    e.stopPropagation();
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
        cart
          .getSectionsToRender()
          .map((s) => s.section)
          .join(","),
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
  }
});
