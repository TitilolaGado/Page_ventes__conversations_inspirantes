(() => {
  "use strict";

  /**
   * CONFIGURATION CENTRALE
   * -----------------------------------------------------------------
   * Renseigner uniquement des valeurs réelles avant la mise en ligne.
   * Si un lien reste vide, le site affiche une information au lieu de
   * simuler une inscription ou un paiement.
   */
  const SITE_CONFIG = {
    ci: {
      applicationOpenDate: "2026-11-15T00:00:00+01:00",
      applicationCloseDate: null,
      applicationUrl: "",
      waitlistUrl: ""
    },
    ascension: {
      capacity: 10,
      checkoutUrl: "",
      // Option 1 : renseigner manuellement un nombre réel entre 0 et 10.
      // Laisser null tant que la donnée n'est pas vérifiée.
      remainingSeats: null,
      // Option 2 : renseigner un endpoint retournant par exemple
      // { "remaining": 7 } ou { "capacity": 10, "booked": 3 }.
      availabilityEndpoint: ""
    },
    support: {
      donorUrl: "",
      sponsorUrl: "",
      contactEmail: "contact@fondationhysteresis.bj"
    }
  };

  const $ = (selector, scope = document) => scope.querySelector(selector);
  const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

  // Année du footer
  const yearEl = $("#year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // Navigation mobile
  const menuToggle = $(".menu-toggle");
  const nav = $("#primaryNav");
  if (menuToggle && nav) {
    menuToggle.addEventListener("click", () => {
      const open = nav.classList.toggle("open");
      menuToggle.setAttribute("aria-expanded", String(open));
      menuToggle.setAttribute("aria-label", open ? "Fermer le menu" : "Ouvrir le menu");
    });
    $$("a", nav).forEach((link) => link.addEventListener("click", () => {
      nav.classList.remove("open");
      menuToggle.setAttribute("aria-expanded", "false");
    }));
  }

  // Animation au défilement
  const revealEls = $$(".reveal");
  if ("IntersectionObserver" in window && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12 });
    revealEls.forEach((el) => observer.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("visible"));
  }

  // Modale informative de secours
  const dialog = $("#actionDialog");
  const dialogTitle = $("#dialogTitle");
  const dialogText = $("#dialogText");
  const dialogEyebrow = $("#dialogEyebrow");
  const dialogLink = $("#dialogLink");

  function openInfo({ eyebrow = "INFORMATION", title, text, url = "", linkLabel = "Continuer" }) {
    if (!dialog) return;
    dialogEyebrow.textContent = eyebrow;
    dialogTitle.textContent = title;
    dialogText.textContent = text;
    if (url) {
      dialogLink.href = url;
      dialogLink.textContent = linkLabel;
      dialogLink.hidden = false;
    } else {
      dialogLink.hidden = true;
      dialogLink.removeAttribute("href");
    }
    dialog.showModal();
  }

  $$('[data-close-dialog]').forEach((btn) => btn.addEventListener("click", () => dialog?.close()));
  dialog?.addEventListener("click", (event) => {
    const card = $(".modal-card", dialog);
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) dialog.close();
  });

  // -------------------------
  // Conversations Inspirantes
  // -------------------------
  function getCiState() {
    const now = new Date();
    const open = SITE_CONFIG.ci.applicationOpenDate ? new Date(SITE_CONFIG.ci.applicationOpenDate) : null;
    const close = SITE_CONFIG.ci.applicationCloseDate ? new Date(SITE_CONFIG.ci.applicationCloseDate) : null;
    if (open && now < open) return "before";
    if (close && now > close) return "closed";
    return "open";
  }

  function configureCiActions() {
    const state = getCiState();
    const buttons = $$(".ci-primary-action");
    const note = $(".ci-action-note");

    buttons.forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (state === "open" && SITE_CONFIG.ci.applicationUrl) {
          window.location.href = SITE_CONFIG.ci.applicationUrl;
          return;
        }
        if (state !== "open" && SITE_CONFIG.ci.waitlistUrl) {
          window.location.href = SITE_CONFIG.ci.waitlistUrl;
          return;
        }
        openInfo({
          eyebrow: state === "open" ? "CANDIDATURE" : "PROCHAINE COHORTE",
          title: state === "open" ? "Le lien de candidature sera bientôt disponible" : "Ouverture des candidatures : 15 novembre 2026",
          text: state === "open"
            ? "Le formulaire officiel de candidature doit être relié à ce bouton avant la mise en ligne."
            : "Le lien d'inscription à la newsletter ou à la liste d'information doit être configuré avant la publication.",
          url: ""
        });
      });
    });

    if (state === "open") {
      buttons.forEach((button) => button.textContent = "Je candidate à Conversations Inspirantes");
      if (note) note.textContent = "Les candidatures sont ouvertes pendant la période annoncée.";
    } else if (state === "closed") {
      buttons.forEach((button) => button.textContent = "Être informé(e) de la prochaine cohorte");
      if (note) note.textContent = "Les candidatures de cette cohorte sont closes.";
    }
  }

  // ----------------------------------------
  // L'Ascension : disponibilité sans fiction
  // ----------------------------------------
  const availabilityEl = $("#ascensionAvailability");

  function normalizeRemaining(value) {
    const n = Number(value);
    if (!Number.isInteger(n)) return null;
    if (n < 0 || n > SITE_CONFIG.ascension.capacity) return null;
    return n;
  }

  function renderAvailability(remaining) {
    if (!availabilityEl) return;
    const value = normalizeRemaining(remaining);
    availabilityEl.removeAttribute("data-status");

    if (value === null) {
      availabilityEl.innerHTML = '<span class="status-dot"></span><strong>Disponibilité à confirmer</strong><small>Aucun nombre n’est affiché sans donnée réelle.</small>';
      return;
    }

    if (value === 0) {
      availabilityEl.dataset.status = "full";
      availabilityEl.innerHTML = '<span class="status-dot"></span><strong>Cohorte complète</strong><small>Les 10 places sont actuellement réservées.</small>';
      $$(".ascension-primary-action").forEach((button) => {
        button.textContent = "Cohorte complète";
        button.setAttribute("aria-disabled", "true");
        button.classList.add("is-disabled");
      });
      return;
    }

    availabilityEl.dataset.status = "available";
    availabilityEl.innerHTML = `<span class="status-dot"></span><strong>${value} place${value > 1 ? "s" : ""} disponible${value > 1 ? "s" : ""} sur ${SITE_CONFIG.ascension.capacity}</strong><small>Donnée réelle de disponibilité.</small>`;
  }

  async function loadAvailability() {
    if (SITE_CONFIG.ascension.availabilityEndpoint) {
      try {
        const response = await fetch(SITE_CONFIG.ascension.availabilityEndpoint, { headers: { Accept: "application/json" }, cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        const remaining = data.remaining ?? (Number.isInteger(data.capacity) && Number.isInteger(data.booked) ? data.capacity - data.booked : null);
        renderAvailability(remaining);
        return;
      } catch (error) {
        console.warn("Disponibilité L’Ascension indisponible :", error);
        renderAvailability(null);
        return;
      }
    }
    renderAvailability(SITE_CONFIG.ascension.remainingSeats);
  }

  function configureAscensionActions() {
    $$(".ascension-primary-action").forEach((button) => {
      button.addEventListener("click", (event) => {
        event.preventDefault();
        if (button.getAttribute("aria-disabled") === "true") return;
        if (SITE_CONFIG.ascension.checkoutUrl) {
          window.location.href = SITE_CONFIG.ascension.checkoutUrl;
          return;
        }
        openInfo({
          eyebrow: "L’ASCENSION",
          title: "Le paiement sécurisé doit être relié à ce bouton",
          text: "Avant la mise en ligne, renseigne l’URL du parcours d’inscription/paiement dans SITE_CONFIG.ascension.checkoutUrl. Le compteur ne sera décrémenté qu’après confirmation réelle du paiement côté serveur.",
          url: ""
        });
      });
    });
  }

  // -------------------------
  // Donateurs et sponsors
  // -------------------------
  function configureSupportActions() {
    $$(".donor-action").forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault();
      if (SITE_CONFIG.support.donorUrl) {
        window.location.href = SITE_CONFIG.support.donorUrl;
      } else {
        const mailto = `mailto:${SITE_CONFIG.support.contactEmail}?subject=${encodeURIComponent("Je souhaite faire un don à la Fondation Hystérésis")}`;
        openInfo({ eyebrow: "FAIRE UN DON", title: "Soutenir Conversations Inspirantes", text: "Le formulaire de don n’est pas encore relié. Tu peux contacter directement la Fondation.", url: mailto, linkLabel: "Contacter la Fondation" });
      }
    }));

    $$(".sponsor-action").forEach((button) => button.addEventListener("click", (event) => {
      event.preventDefault();
      if (SITE_CONFIG.support.sponsorUrl) {
        window.location.href = SITE_CONFIG.support.sponsorUrl;
      } else {
        const mailto = `mailto:${SITE_CONFIG.support.contactEmail}?subject=${encodeURIComponent("Proposition de partenariat — Conversations Inspirantes")}`;
        openInfo({ eyebrow: "PARTENARIAT", title: "Devenir partenaire d’impact", text: "Le formulaire partenaire n’est pas encore relié. Tu peux contacter directement la Fondation.", url: mailto, linkLabel: "Contacter la Fondation" });
      }
    }));
  }

  configureCiActions();
  configureAscensionActions();
  configureSupportActions();
  loadAvailability();
})();
