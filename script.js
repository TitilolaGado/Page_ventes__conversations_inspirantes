(() => {
  const MAX_SEATS = 10;
  const ASC_KEY = 'hysteresis_ci_ascension_test_registrations_v1';
  const CANDIDATE_KEY = 'hysteresis_ci_candidates_test_v1';
  const DONOR_KEY = 'hysteresis_ci_donors_test_v1';
  const SPONSOR_KEY = 'hysteresis_ci_sponsors_test_v1';

  const readList = (key) => {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
  };
  const writeList = (key, value) => localStorage.setItem(key, JSON.stringify(value));

  const getRemaining = () => Math.max(0, MAX_SEATS - readList(ASC_KEY).length);

  function renderSeats() {
    const remaining = getRemaining();
    document.querySelectorAll('.remaining-count').forEach(el => el.textContent = remaining);
    document.querySelectorAll('.seat-bar-fill').forEach(el => el.style.width = `${(remaining / MAX_SEATS) * 100}%`);
    document.querySelectorAll('.seat-dots').forEach(el => {
      el.innerHTML = '';
      for (let i = 0; i < MAX_SEATS; i++) {
        const dot = document.createElement('span');
        dot.className = 'seat-dot' + (i >= remaining ? ' taken' : '');
        el.appendChild(dot);
      }
    });
    document.querySelectorAll('.ascension-register, .ascension-submit').forEach(btn => {
      btn.disabled = remaining === 0;
      if (remaining === 0) {
        if (btn.classList.contains('ascension-register')) btn.textContent = 'Cohorte complète';
        else btn.textContent = 'Plus de place disponible';
      } else if (btn.classList.contains('ascension-register')) {
        if (btn.closest('.final-actions')) btn.innerHTML = `Je rejoins L’Ascension — <span class="remaining-count">${remaining}</span> place(s)`;
        else btn.textContent = 'Je réserve ma place';
      }
    });
  }

  document.querySelectorAll('[data-open-dialog]').forEach(btn => {
    btn.addEventListener('click', () => {
      const dialog = document.getElementById(btn.dataset.openDialog);
      if (!dialog || btn.disabled) return;
      dialog.showModal();
    });
  });
  document.querySelectorAll('[data-close-dialog]').forEach(btn => btn.addEventListener('click', () => btn.closest('dialog').close()));
  document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', (e) => {
    const rect = dialog.querySelector('.modal-card').getBoundingClientRect();
    const inCard = e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
    if (!inCard) dialog.close();
  }));

  const candidateForm = document.getElementById('candidateForm');
  candidateForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const fd = new FormData(candidateForm);
    const email = String(fd.get('email')).trim().toLowerCase();
    const list = readList(CANDIDATE_KEY);
    const status = candidateForm.querySelector('.form-status');
    if (list.some(r => r.email === email)) {
      status.textContent = 'Cette adresse a déjà envoyé une candidature test.';
      return;
    }
    list.push({name: fd.get('name'), email, phone: fd.get('phone'), goal: fd.get('goal'), createdAt: new Date().toISOString()});
    writeList(CANDIDATE_KEY, list);
    status.textContent = 'Candidature test enregistrée. Merci !';
    status.classList.add('success');
    candidateForm.reset();
  });

  const ascensionForm = document.getElementById('ascensionForm');
  ascensionForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const status = ascensionForm.querySelector('.form-status');
    if (getRemaining() <= 0) {
      status.textContent = 'La cohorte test est complète.';
      renderSeats();
      return;
    }
    const fd = new FormData(ascensionForm);
    const email = String(fd.get('email')).trim().toLowerCase();
    const list = readList(ASC_KEY);
    if (list.some(r => r.email === email)) {
      status.textContent = 'Cette adresse a déjà réservé une place test. Le compteur n’a pas été modifié.';
      return;
    }
    list.push({name: fd.get('name'), email, phone: fd.get('phone'), createdAt: new Date().toISOString()});
    writeList(ASC_KEY, list);
    status.textContent = `Inscription test enregistrée. Il reste maintenant ${Math.max(0, MAX_SEATS - list.length)} place(s).`;
    status.classList.add('success');
    ascensionForm.reset();
    renderSeats();
  });


  // ----------------------------------------------------------
  // DONATEURS - VERSION TEST
  // En production, remplacer ce stockage local par l'appel au
  // prestataire de paiement puis enregistrer le don côté serveur.
  // ----------------------------------------------------------
  const donorForm = document.getElementById('donorForm');
  if (donorForm) {
    donorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(donorForm);
      const email = String(fd.get('email')).trim().toLowerCase();
      const list = readList(DONOR_KEY);
      const status = donorForm.querySelector('.form-status');
      list.push({
        name: fd.get('name'),
        email,
        phone: fd.get('phone'),
        amount: fd.get('amount'),
        message: fd.get('message'),
        createdAt: new Date().toISOString()
      });
      writeList(DONOR_KEY, list);
      status.textContent = 'Merci. Ton intention de don test a été enregistrée. La Fondation pourra te recontacter.';
      status.classList.add('success');
      donorForm.reset();
    });
  }

  // ----------------------------------------------------------
  // SPONSORS / PARTENAIRES - VERSION TEST
  // Facile à connecter ensuite à un CRM, une adresse email ou
  // un endpoint API sans modifier le reste de la page.
  // ----------------------------------------------------------
  const sponsorForm = document.getElementById('sponsorForm');
  if (sponsorForm) {
    sponsorForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const fd = new FormData(sponsorForm);
      const email = String(fd.get('email')).trim().toLowerCase();
      const list = readList(SPONSOR_KEY);
      const status = sponsorForm.querySelector('.form-status');
      list.push({
        organization: fd.get('organization'),
        contactName: fd.get('contactName'),
        email,
        phone: fd.get('phone'),
        supportType: fd.get('supportType'),
        message: fd.get('message'),
        createdAt: new Date().toISOString()
      });
      writeList(SPONSOR_KEY, list);
      status.textContent = 'Demande de partenariat test enregistrée. Merci pour votre intérêt.';
      status.classList.add('success');
      sponsorForm.reset();
    });
  }

  document.querySelector('.reset-test').addEventListener('click', () => {
    if (!confirm('Réinitialiser les candidatures et les 10 places de la version test ?')) return;
    localStorage.removeItem(ASC_KEY);
    localStorage.removeItem(CANDIDATE_KEY);
    localStorage.removeItem(DONOR_KEY);
    localStorage.removeItem(SPONSOR_KEY);
    document.querySelectorAll('.form-status').forEach(el => { el.textContent = ''; el.classList.remove('success'); });
    renderSeats();
  });

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => { if (entry.isIntersecting) entry.target.classList.add('visible'); });
  }, {threshold: .12});
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  renderSeats();
})();
