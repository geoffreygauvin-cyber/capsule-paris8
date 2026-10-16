/* Chaleur discrète de la plateforme : sur l'Accueil, un soleil ou une lune devant la date et « Bonsoir » à partir de 18 h.
   Le reste (ombres douces, fond des messages vides, tasse des jours sans rendez-vous) est dans le bloc « Chaleur discrète » de gestion.html. */
(function () {
  var SUN = '<circle cx="12" cy="12" r="4"/><path d="M12 3v2M12 19v2M3 12h2M19 12h2M5.6 5.6L7 7M17 17l1.4 1.4M18.4 5.6L17 7M7 17l-1.4 1.4"/>';
  var MOON = '<path d="M20 14.5A8 8 0 1 1 9.5 4 6.5 6.5 0 0 0 20 14.5z"/>';
  function pass() {
    var hr = new Date().getHours(), soir = hr >= 18 || hr < 5;
    var d = document.getElementById('hdate');
    if (d && d.textContent && !d.querySelector('.tod')) d.insertAdjacentHTML('afterbegin', '<span class="tod" aria-hidden="true"><svg viewBox="0 0 24 24">' + (soir ? MOON : SUN) + '</svg></span>');
    var g = document.getElementById('hhi');
    if (g && soir && /^Bonjour /.test(g.textContent)) g.textContent = g.textContent.replace(/^Bonjour /, 'Bonsoir ');
  }
  var h = document.getElementById('v11');
  if (!h) return;
  new MutationObserver(pass).observe(h, { childList: true, subtree: true });
  pass();
})();
