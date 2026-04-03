/**
 * Enquiry Modal — Storefront JavaScript
 * Vanilla JS, no framework dependencies.
 * Expects window.ENQUIRY_APP_URL and window.ENQUIRY_SHOP_DOMAIN to be set by the liquid embed.
 */

(function () {
  "use strict";

  // ── Config ──────────────────────────────────────────────────────────────────

  var APP_URL = (window.ENQUIRY_APP_URL || "").replace(/\/$/, "");
  var SHOP_DOMAIN = window.ENQUIRY_SHOP_DOMAIN || "";
  var MODAL_TITLE = window.ENQUIRY_MODAL_TITLE || "Product Enquiry";
  var MODAL_SUBTITLE =
    window.ENQUIRY_MODAL_SUBTITLE ||
    "Fill in your details and we'll get back to you.";
  var DEBOUNCE_MS = 300;
  var MIN_SEARCH_CHARS = 2;

  // ── State ───────────────────────────────────────────────────────────────────

  var modalEl = null;
  var overlayEl = null;
  var currentProductId = null;
  var currentProductTitle = null;
  var searchDebounceTimer = null;
  var autocompleteIndex = -1;
  var autocompleteResults = [];
  var isSubmitting = false;
  var globalTriggerHandlersBound = false;

  // ── Utility Functions ───────────────────────────────────────────────────────

  function debounce(fn, delay) {
    return function () {
      var args = arguments;
      var ctx = this;
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(function () {
        fn.apply(ctx, args);
      }, delay);
    };
  }

  function escapeHtml(str) {
    if (!str) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  function buildPrefilledComment(productTitle) {
    if (productTitle) {
      return 'I would like to get a quote for the product: "' + productTitle + '" here.';
    }

    return "I would like to get a quote for this product here.";
  }

  function applyPrefilledComment() {
    if (!overlayEl) return;

    var commentsInput = overlayEl.querySelector("#em-comments");
    if (!commentsInput) return;

    commentsInput.value = buildPrefilledComment(currentProductTitle);
  }

  // ── Modal HTML ──────────────────────────────────────────────────────────────

  function createModal() {
    var overlay = document.createElement("div");
    overlay.className = "em-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-labelledby", "em-modal-title");
    overlay.id = "em-overlay";

    overlay.innerHTML = [
      '<div class="em-modal" id="em-modal">',
      '  <div class="em-modal__header">',
      '    <div>',
      '      <h2 class="em-modal__title" id="em-modal-title">' + escapeHtml(MODAL_TITLE) + '</h2>',
      '      <p class="em-modal__subtitle">' + escapeHtml(MODAL_SUBTITLE) + '</p>',
      '    </div>',
      '    <button class="em-modal__close" id="em-close-btn" type="button" aria-label="Close enquiry modal">',
      '      &#x2715;',
      '    </button>',
      '  </div>',
      '  <div class="em-modal__body">',
      '    <div id="em-form-container">',
      '      <form class="em-form" id="em-enquiry-form" novalidate>',
      '        <div class="em-field--row em-field--row-compact">',
      '          <div class="em-field">',
      '            <label class="em-label" for="em-product">Product Title</label>',
      '            <div class="em-autocomplete" id="em-autocomplete">',
      '              <input',
      '                class="em-input"',
      '                type="text"',
      '                id="em-product"',
      '                name="productTitle"',
      '                placeholder="Search for a product…"',
      '                autocomplete="off"',
      '                aria-autocomplete="list"',
      '                aria-controls="em-autocomplete-dropdown"',
      '                aria-expanded="false"',
      '              />',
      '              <input type="hidden" id="em-product-id" name="productId" />',
      '              <div class="em-autocomplete__dropdown" id="em-autocomplete-dropdown" role="listbox"></div>',
      '            </div>',
      '          </div>',
      '          <div class="em-field em-field--quantity">',
      '            <label class="em-label" for="em-quantity">Quantity</label>',
      '            <input',
      '              class="em-input"',
      '              type="number"',
      '              id="em-quantity"',
      '              name="quantity"',
      '              min="1"',
      '              max="50"',
      '              placeholder="1"',
      '              value="1"',
      '            />',
      '          </div>',
      '        </div>',
      '        <div class="em-divider"></div>',
      '        <div class="em-field--row">',
      '          <div class="em-field">',
      '            <label class="em-label em-label--required" for="em-name">Your Name</label>',
      '            <input',
      '              class="em-input"',
      '              type="text"',
      '              id="em-name"',
      '              name="name"',
      '              placeholder="Jane Smith"',
      '              autocomplete="name"',
      '              required',
      '            />',
      '            <span class="em-field-error" id="em-name-error" style="display:none;"></span>',
      '          </div>',
      '          <div class="em-field">',
      '            <label class="em-label em-label--required" for="em-email">Email Address</label>',
      '            <input',
      '              class="em-input"',
      '              type="email"',
      '              id="em-email"',
      '              name="email"',
      '              placeholder="jane@example.com"',
      '              autocomplete="email"',
      '              required',
      '            />',
      '            <span class="em-field-error" id="em-email-error" style="display:none;"></span>',
      '          </div>',
      '        </div>',
      '        <div class="em-field">',
      '          <label class="em-label" for="em-phone">Phone Number</label>',
      '          <input',
      '            class="em-input"',
      '            type="tel"',
      '            id="em-phone"',
      '            name="phone"',
      '            placeholder="+61 400 000 000"',
      '            autocomplete="tel"',
      '          />',
      '        </div>',
      '        <div class="em-field">',
      '          <label class="em-label" for="em-comments">Comments</label>',
      '          <textarea',
      '            class="em-textarea"',
      '            id="em-comments"',
      '            name="comments"',
      '            placeholder="Tell us more about your enquiry…"',
      '            rows="2"',
      '          ></textarea>',
      '        </div>',
      '        <div id="em-submit-error" style="display:none;"></div>',
      '        <button class="em-btn em-btn--primary" type="submit" id="em-submit-btn">',
      '          Send Enquiry',
      '        </button>',
      '      </form>',
      '    </div>',
      '    <div id="em-success-container" style="display:none;">',
      '      <div class="em-success-state">',
      '        <div class="em-success-state__icon">&#x2713;</div>',
      '        <h3 class="em-success-state__title">Enquiry Sent!</h3>',
      '        <p class="em-success-state__message">',
      '          Thanks for your enquiry. We\'ll be in touch with you shortly.',
      '        </p>',
      '        <button class="em-btn em-btn--primary" id="em-done-btn" type="button">',
      '          Close',
      '        </button>',
      '      </div>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join("\n");

    return overlay;
  }

  // ── Inject Modal ─────────────────────────────────────────────────────────────

  function ensureModal() {
    if (!overlayEl) {
      overlayEl = createModal();
      document.body.appendChild(overlayEl);
      modalEl = overlayEl.querySelector("#em-modal");
      attachModalEvents();
    }
  }

  // ── Open / Close ─────────────────────────────────────────────────────────────

  function normalizePrefillProduct(productRef, productTitle) {
    if (!productRef) return { id: "", title: "" };

    if (typeof productRef === "object") {
      return {
        id: productRef.id ? String(productRef.id).trim() : "",
        title: productRef.title ? String(productRef.title).trim() : "",
      };
    }

    return {
      id: String(productRef).trim(),
      title: productTitle ? String(productTitle).trim() : "",
    };
  }

  function openModal(productRef, productTitle) {
    ensureModal();
    resetForm();

    var prefillProduct = normalizePrefillProduct(productRef, productTitle);

    // Pre-fill product if id supplied
    if (prefillProduct.id) {
      currentProductId = prefillProduct.id;
      currentProductTitle = prefillProduct.title || null;
      var productInput = overlayEl.querySelector("#em-product");
      var productIdInput = overlayEl.querySelector("#em-product-id");

      productIdInput.value = prefillProduct.id;
      productInput.value = prefillProduct.title || prefillProduct.id;
      productInput.disabled = true;
    }

    applyPrefilledComment();

    // Show modal
    overlayEl.classList.add("em-is-open");
    document.body.style.overflow = "hidden";

    // Focus first input after transition
    setTimeout(function () {
      var firstInput = overlayEl.querySelector(
        prefillProduct.id ? "#em-quantity" : "#em-product"
      );
      if (firstInput) firstInput.focus();
    }, 50);
  }

  function closeModal() {
    if (!overlayEl) return;
    overlayEl.classList.remove("em-is-open");
    document.body.style.overflow = "";
    closeAutocomplete();
  }

  function resetForm() {
    currentProductId = null;
    currentProductTitle = null;
    autocompleteResults = [];
    autocompleteIndex = -1;
    isSubmitting = false;

    var form = overlayEl && overlayEl.querySelector("#em-enquiry-form");
    if (form) form.reset();

    var productInput = overlayEl && overlayEl.querySelector("#em-product");
    var productIdInput = overlayEl && overlayEl.querySelector("#em-product-id");
    if (productInput) {
      productInput.disabled = false;
      productInput.value = "";
      productInput.classList.remove("em-input--error");
    }
    if (productIdInput) productIdInput.value = "";
    applyPrefilledComment();

    // Clear errors
    var errorEls = overlayEl && overlayEl.querySelectorAll(".em-field-error");
    if (errorEls) {
      errorEls.forEach(function (el) {
        el.style.display = "none";
        el.textContent = "";
      });
    }

    var inputs = overlayEl && overlayEl.querySelectorAll(".em-input--error, .em-textarea--error");
    if (inputs) {
      inputs.forEach(function (el) {
        el.classList.remove("em-input--error", "em-textarea--error");
      });
    }

    var submitError = overlayEl && overlayEl.querySelector("#em-submit-error");
    if (submitError) submitError.style.display = "none";

    var submitBtn = overlayEl && overlayEl.querySelector("#em-submit-btn");
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.innerHTML = "Send Enquiry";
    }

    // Show form, hide success
    var formContainer = overlayEl && overlayEl.querySelector("#em-form-container");
    var successContainer = overlayEl && overlayEl.querySelector("#em-success-container");
    if (formContainer) formContainer.style.display = "";
    if (successContainer) successContainer.style.display = "none";
  }

  // ── Autocomplete ─────────────────────────────────────────────────────────────

  function searchProducts(query, callback) {
    if (!query || query.length < MIN_SEARCH_CHARS) {
      callback([]);
      return;
    }

    fetch(
      "/search/suggest.json?q=" +
        encodeURIComponent(query) +
        "&resources[type]=product&resources[options][fields]=title,handle&resources[options][limit]=6"
    )
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var products =
          (data &&
            data.resources &&
            data.resources.results &&
            data.resources.results.products) ||
          [];
        callback(products);
      })
      .catch(function () { callback([]); });
  }

  function openAutocomplete() {
    var dropdown = overlayEl.querySelector("#em-autocomplete-dropdown");
    var productInput = overlayEl.querySelector("#em-product");
    if (dropdown) {
      dropdown.classList.add("em-is-open");
      productInput.setAttribute("aria-expanded", "true");
    }
  }

  function closeAutocomplete() {
    if (!overlayEl) return;
    var dropdown = overlayEl.querySelector("#em-autocomplete-dropdown");
    var productInput = overlayEl.querySelector("#em-product");
    if (dropdown) {
      dropdown.classList.remove("em-is-open");
      dropdown.innerHTML = "";
    }
    if (productInput) productInput.setAttribute("aria-expanded", "false");
    autocompleteIndex = -1;
    autocompleteResults = [];
  }

  function renderAutocomplete(products, isLoading) {
    var dropdown = overlayEl.querySelector("#em-autocomplete-dropdown");
    if (!dropdown) return;

    if (isLoading) {
      dropdown.innerHTML =
        '<div class="em-autocomplete__loading"><span class="em-spinner"></span> Searching…</div>';
      openAutocomplete();
      return;
    }

    if (!products || products.length === 0) {
      dropdown.innerHTML =
        '<div class="em-autocomplete__no-results">No products found</div>';
      openAutocomplete();
      return;
    }

    autocompleteResults = products;
    autocompleteIndex = -1;

    var html = products
      .map(function (product, idx) {
        var img = product.featured_image && product.featured_image.url
          ? '<img class="em-autocomplete__item-image" src="' +
            escapeHtml(product.featured_image.url) +
            '" alt="" loading="lazy" />'
          : '<div class="em-autocomplete__item-image--placeholder">&#x1F4E6;</div>';

        return [
          '<div class="em-autocomplete__item"',
          ' role="option"',
          ' data-index="' + idx + '"',
          ' data-id="' + escapeHtml(product.id ? String(product.id) : "") + '"',
          ' data-title="' + escapeHtml(product.title) + '"',
          ' tabindex="-1"',
          '>',
          img,
          '<span class="em-autocomplete__item-title">' + escapeHtml(product.title) + '</span>',
          '</div>',
        ].join("");
      })
      .join("");

    dropdown.innerHTML = html;
    openAutocomplete();

    // Attach click events
    dropdown.querySelectorAll(".em-autocomplete__item").forEach(function (item) {
      item.addEventListener("mousedown", function (e) {
        e.preventDefault(); // Don't blur the input
        selectProduct(item.dataset.id, item.dataset.title);
      });
    });
  }

  function selectProduct(productId, title) {
    var productInput = overlayEl.querySelector("#em-product");
    var productIdInput = overlayEl.querySelector("#em-product-id");

    if (productInput) productInput.value = title || productId;
    if (productIdInput) productIdInput.value = productId;

    currentProductId = productId || null;
    currentProductTitle = title || productId;
    applyPrefilledComment();

    closeAutocomplete();
  }

  function updateAutocompleteHighlight() {
    var dropdown = overlayEl.querySelector("#em-autocomplete-dropdown");
    if (!dropdown) return;

    var items = dropdown.querySelectorAll(".em-autocomplete__item");
    items.forEach(function (item, idx) {
      if (idx === autocompleteIndex) {
        item.classList.add("em-is-focused");
        item.setAttribute("aria-selected", "true");
      } else {
        item.classList.remove("em-is-focused");
        item.removeAttribute("aria-selected");
      }
    });
  }

  // ── Form Events ──────────────────────────────────────────────────────────────

  function attachModalEvents() {
    // Close on overlay click (but not modal click)
    overlayEl.addEventListener("click", function (e) {
      if (e.target === overlayEl) closeModal();
    });

    // Close button
    overlayEl.querySelector("#em-close-btn").addEventListener("click", closeModal);

    // Done button (success state)
    overlayEl.querySelector("#em-done-btn").addEventListener("click", closeModal);

    // Escape key
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlayEl.classList.contains("em-is-open")) {
        closeModal();
      }
    });

    // Product search input
    var productInput = overlayEl.querySelector("#em-product");
    var debouncedSearch = debounce(function (query) {
      if (query.length < MIN_SEARCH_CHARS) {
        closeAutocomplete();
        return;
      }
      renderAutocomplete(null, true); // show loading
      searchProducts(query, function (products) {
        renderAutocomplete(products, false);
      });
    }, DEBOUNCE_MS);

    productInput.addEventListener("input", function () {
      var query = this.value.trim();

      // Clear handle if user types something new
      var productIdInput = overlayEl.querySelector("#em-product-id");
      if (productIdInput) productIdInput.value = "";
      currentProductId = null;
      currentProductTitle = null;
      applyPrefilledComment();

      if (query.length < MIN_SEARCH_CHARS) {
        closeAutocomplete();
        return;
      }

      debouncedSearch(query);
    });

    productInput.addEventListener("keydown", function (e) {
      var dropdown = overlayEl.querySelector("#em-autocomplete-dropdown");
      var isOpen = dropdown && dropdown.classList.contains("em-is-open");

      if (!isOpen) return;

      if (e.key === "ArrowDown") {
        e.preventDefault();
        autocompleteIndex = Math.min(
          autocompleteIndex + 1,
          autocompleteResults.length - 1
        );
        updateAutocompleteHighlight();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        autocompleteIndex = Math.max(autocompleteIndex - 1, -1);
        updateAutocompleteHighlight();
      } else if (e.key === "Enter") {
        if (autocompleteIndex >= 0 && autocompleteResults[autocompleteIndex]) {
          e.preventDefault();
          var item = autocompleteResults[autocompleteIndex];
          selectProduct(item.id ? String(item.id) : "", item.title);
        }
      } else if (e.key === "Escape") {
        closeAutocomplete();
      }
    });

    productInput.addEventListener("blur", function () {
      // Delay to allow mousedown on dropdown items to fire first
      setTimeout(closeAutocomplete, 150);
    });

    var quantityInput = overlayEl.querySelector("#em-quantity");
    quantityInput.addEventListener("input", function () {
      var quantity = parseInt(this.value, 10);

      if (!this.value || Number.isNaN(quantity)) return;
      if (quantity < 1) this.value = "1";
      if (quantity > 50) this.value = "50";
    });

    // Form submit
    overlayEl.querySelector("#em-enquiry-form").addEventListener("submit", function (e) {
      e.preventDefault();
      handleSubmit();
    });
  }

  // ── Validation ───────────────────────────────────────────────────────────────

  function validateForm() {
    var valid = true;

    var name = overlayEl.querySelector("#em-name").value.trim();
    var email = overlayEl.querySelector("#em-email").value.trim();
    var quantityInput = overlayEl.querySelector("#em-quantity");
    var quantity = parseInt(quantityInput.value, 10);
    var nameError = overlayEl.querySelector("#em-name-error");
    var emailError = overlayEl.querySelector("#em-email-error");
    var nameInput = overlayEl.querySelector("#em-name");
    var emailInput = overlayEl.querySelector("#em-email");

    // Reset
    nameInput.classList.remove("em-input--error");
    emailInput.classList.remove("em-input--error");
    nameError.style.display = "none";
    emailError.style.display = "none";

    if (!name || name.length < 2) {
      nameInput.classList.add("em-input--error");
      nameError.textContent = "Please enter your name (at least 2 characters)";
      nameError.style.display = "flex";
      valid = false;
    }

    if (!email || !isValidEmail(email)) {
      emailInput.classList.add("em-input--error");
      emailError.textContent = "Please enter a valid email address";
      emailError.style.display = "flex";
      valid = false;
    }

    quantityInput.classList.remove("em-input--error");
    if (Number.isNaN(quantity) || quantity < 1 || quantity > 50) {
      quantityInput.classList.add("em-input--error");
      valid = false;
    }

    return valid;
  }

  // ── Submit Handler ───────────────────────────────────────────────────────────

  function handleSubmit() {
    if (isSubmitting) return;
    if (!validateForm()) return;

    isSubmitting = true;

    var submitBtn = overlayEl.querySelector("#em-submit-btn");
    var submitError = overlayEl.querySelector("#em-submit-error");

    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="em-spinner"></span> Sending…';
    submitError.style.display = "none";

    var productInput = overlayEl.querySelector("#em-product");
    var productIdInput = overlayEl.querySelector("#em-product-id");
    var quantityInput = overlayEl.querySelector("#em-quantity");
    var nameInput = overlayEl.querySelector("#em-name");
    var emailInput = overlayEl.querySelector("#em-email");
    var phoneInput = overlayEl.querySelector("#em-phone");
    var commentsInput = overlayEl.querySelector("#em-comments");

    var payload = {
      shop: SHOP_DOMAIN,
      productId: productIdInput.value || currentProductId || null,
      productTitle:
        currentProductTitle ||
        productInput.value ||
        null,
      quantity: quantityInput.value ? parseInt(quantityInput.value, 10) : null,
      name: nameInput.value.trim(),
      email: emailInput.value.trim().toLowerCase(),
      phone: phoneInput.value.trim() || null,
      comments: commentsInput.value.trim() || null,
    };

    fetch(APP_URL + "/api/enquiry", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          return { ok: res.ok, data: data };
        });
      })
      .then(function (result) {
        if (result.ok && result.data.success) {
          showSuccess();
          fireGtagEvent();
        } else {
          throw new Error(
            result.data.error || "Something went wrong. Please try again."
          );
        }
      })
      .catch(function (err) {
        isSubmitting = false;
        submitBtn.disabled = false;
        submitBtn.innerHTML = "Send Enquiry";

        submitError.innerHTML = [
          '<div class="em-message em-message--error">',
          '  <span class="em-message__icon">&#x26A0;</span>',
          '  <div class="em-message__text">',
          '    <div class="em-message__title">Submission failed</div>',
          "    " + escapeHtml(err.message),
          "  </div>",
          "</div>",
        ].join("");
        submitError.style.display = "block";
      });
  }

  function showSuccess() {
    var formContainer = overlayEl.querySelector("#em-form-container");
    var successContainer = overlayEl.querySelector("#em-success-container");
    if (formContainer) formContainer.style.display = "none";
    if (successContainer) successContainer.style.display = "block";

    // Scroll to top of modal
    if (modalEl) modalEl.scrollTop = 0;
  }

  // ── GTag / Analytics ─────────────────────────────────────────────────────────

  function fireGtagEvent() {
    if (!APP_URL || !SHOP_DOMAIN) return;

    fetch(APP_URL + "/api/public/settings?shop=" + encodeURIComponent(SHOP_DOMAIN))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data && data.gtagCode && data.gtagCode.trim()) {
          try {
            // Execute the gtag code in a function scope
            var fn = new Function(data.gtagCode); // eslint-disable-line no-new-func
            fn();
          } catch (e) {
            console.warn("[EnquiryModal] GTag code execution error:", e);
          }
        }
      })
      .catch(function (e) {
        console.warn("[EnquiryModal] Failed to fetch settings for GTag:", e);
      });
  }

  // ── Bind Triggers ────────────────────────────────────────────────────────────

  function bindTriggers() {
    var triggers = document.querySelectorAll("[data-enquiry-trigger]");
    triggers.forEach(function (el) {
      // Avoid double-binding
      if (el.dataset.enquiryBound) return;
      el.dataset.enquiryBound = "1";

      el.addEventListener("click", function (e) {
        e.preventDefault();
        var productId = el.dataset.enquiryTrigger || "";
        var productTitle = el.dataset.enquiryProductTitle || "";
        openModal(productId, productTitle);
      });

      // Keyboard accessibility
      if (!el.getAttribute("tabindex")) {
        el.setAttribute("tabindex", "0");
      }
      el.addEventListener("keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          var productId = el.dataset.enquiryTrigger || "";
          var productTitle = el.dataset.enquiryProductTitle || "";
          openModal(productId, productTitle);
        }
      });
    });
  }

  function findTriggerElement(target) {
    if (!target || typeof target.closest !== "function") return null;
    return target.closest("[data-enquiry-trigger]");
  }

  function bindGlobalTriggerHandlers() {
    if (globalTriggerHandlersBound) return;
    globalTriggerHandlersBound = true;

    document.addEventListener("click", function (e) {
      var trigger = findTriggerElement(e.target);
      if (!trigger) return;

      e.preventDefault();
      openModal(
        trigger.dataset.enquiryTrigger || "",
        trigger.dataset.enquiryProductTitle || "",
      );
    });

    document.addEventListener("keydown", function (e) {
      var trigger = findTriggerElement(e.target);
      if (!trigger) return;
      if (e.key !== "Enter" && e.key !== " ") return;

      e.preventDefault();
      openModal(
        trigger.dataset.enquiryTrigger || "",
        trigger.dataset.enquiryProductTitle || "",
      );
    });
  }

  // ── Init ─────────────────────────────────────────────────────────────────────

  function init() {
    bindGlobalTriggerHandlers();
    bindTriggers();
  }

  // Wait for DOM
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // Re-bind after Shopify section loads (theme editor / dynamic sections)
  document.addEventListener("shopify:section:load", function () {
    bindTriggers();
  });

  // Also support Turbo/SPA navigations if theme uses them
  document.addEventListener("page:load", init);
  document.addEventListener("turbo:load", init);

  // Expose public API for manual integration
  window.EnquiryModal = {
    open: openModal,
    close: closeModal,
    bindTriggers: bindTriggers,
  };
})();
