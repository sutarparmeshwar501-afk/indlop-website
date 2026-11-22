import '/src/indlop-firebase.ts';

(function () {
  'use strict';

  var motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  var reduceMotion = motionQuery.matches;
  var header = document.querySelector('[data-header]');
  var menuToggle = document.querySelector('[data-menu-toggle]');
  var mobileNav = document.querySelector('[data-mobile-nav]');
  var scrollFrame = 0;
  var scrollY = window.scrollY || window.pageYOffset;
  var privacyStart = 0;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function refreshSectionOffsets() {
    var privacy = document.querySelector('.privacy-section');
    privacyStart = privacy ? privacy.offsetTop : 0;
  }

  function updateMotion() {
    scrollFrame = 0;
    scrollY = window.scrollY || window.pageYOffset;

    if (header) header.classList.toggle('is-scrolled', scrollY > 20);
    if (reduceMotion) return;

    var phone = document.querySelector('[data-parallax]');
    var firstNotification = document.querySelector('.notification-one');
    var secondNotification = document.querySelector('.notification-two');
    var heroOrbitOne = document.querySelector('.hero-orbit-one');
    var heroOrbitTwo = document.querySelector('.hero-orbit-two');
    var privacyPanel = document.querySelector('.privacy-panel');
    var privacyOrb = document.querySelector('.privacy-orb');
    var privacyProgress = clamp((scrollY - privacyStart + window.innerHeight * 0.35) / (window.innerHeight * 1.4), 0, 1);

    if (phone) phone.style.setProperty('--parallax-y', clamp(scrollY * 0.07, 0, 48).toFixed(2) + 'px');
    if (firstNotification) firstNotification.style.setProperty('--scroll-shift', clamp(scrollY * 0.045, 0, 31).toFixed(2) + 'px');
    if (secondNotification) secondNotification.style.setProperty('--scroll-shift', clamp(scrollY * 0.095, 0, 52).toFixed(2) + 'px');
    if (heroOrbitOne) heroOrbitOne.style.setProperty('--scroll-y', clamp(scrollY * -0.035, -28, 0).toFixed(2) + 'px');
    if (heroOrbitTwo) heroOrbitTwo.style.setProperty('--scroll-y', clamp(scrollY * -0.06, -45, 0).toFixed(2) + 'px');
    if (privacyPanel) privacyPanel.style.setProperty('--scroll-y', (privacyProgress * -18).toFixed(2) + 'px');
    if (privacyOrb) privacyOrb.style.setProperty('--scroll-y', (privacyProgress * 24).toFixed(2) + 'px');
  }

  function requestMotionUpdate() {
    if (!scrollFrame) scrollFrame = window.requestAnimationFrame(updateMotion);
  }

  function closeMobileNav() {
    if (!menuToggle || !mobileNav) return;
    mobileNav.classList.remove('is-open');
    menuToggle.setAttribute('aria-expanded', 'false');
    menuToggle.setAttribute('aria-label', 'Open navigation');
  }

  function normalizePath(path) {
    var normalized = (path || '/').replace(/\/index\.html$/, '').replace(/\/+$/, '');
    return normalized || '/';
  }

  function setActiveNavigation() {
    var currentPath = normalizePath(window.location.pathname);
    document.querySelectorAll('[data-nav]').forEach(function (link) {
      var linkPath;
      try {
        linkPath = normalizePath(new URL(link.href, window.location.href).pathname);
      } catch (error) {
        return;
      }
      var isCurrent = linkPath === currentPath;
      link.classList.toggle('is-active', isCurrent);
      if (isCurrent) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }

  if (menuToggle && mobileNav) {
    menuToggle.addEventListener('click', function () {
      var isOpen = mobileNav.classList.toggle('is-open');
      menuToggle.setAttribute('aria-expanded', String(isOpen));
      menuToggle.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    });
    mobileNav.querySelectorAll('a').forEach(function (link) {
      link.addEventListener('click', closeMobileNav);
    });
  }

  setActiveNavigation();

  document.querySelectorAll('a[href^="#"]').forEach(function (link) {
    link.addEventListener('click', function (event) {
      var id = link.getAttribute('href');
      if (!id || id === '#') return;
      var target = document.querySelector(id);
      if (!target) return;
      event.preventDefault();
      closeMobileNav();
      target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
      if (window.history && window.history.replaceState) window.history.replaceState(null, '', id);
      if (link.classList.contains('skip-link')) {
        window.setTimeout(function () { target.setAttribute('tabindex', '-1'); target.focus({ preventScroll: true }); }, reduceMotion ? 0 : 450);
      }
    });
  });

  window.addEventListener('scroll', requestMotionUpdate, { passive: true });
  window.addEventListener('resize', function () {
    refreshSectionOffsets();
    requestMotionUpdate();
  }, { passive: true });
  refreshSectionOffsets();
  requestMotionUpdate();

  var reveals = document.querySelectorAll('.reveal');
  var staggerSelectors = '.eyebrow,h1,h2,h3,p,.button,.hero-note,.feature-card-top,.privacy-list,.stat,.monetization-card-copy,.price-line,.inline-link';
  reveals.forEach(function (item) {
    item.querySelectorAll(staggerSelectors).forEach(function (child, index) {
      child.classList.add('motion-item');
      child.style.setProperty('--motion-delay', Math.min(index, 5) * 82 + 'ms');
    });
  });

  if (!reduceMotion && 'IntersectionObserver' in window) {
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -5% 0px' });
    reveals.forEach(function (item) { observer.observe(item); });
  } else {
    reveals.forEach(function (item) { item.classList.add('is-visible'); });
  }

  var counters = document.querySelectorAll('[data-counter]');
  if ('IntersectionObserver' in window && !reduceMotion) {
    var counterObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        var target = Number(el.getAttribute('data-counter'));
        var suffix = el.getAttribute('data-suffix') || '';
        var startTime = null;
        function tick(time) {
          if (!startTime) startTime = time;
          var progress = Math.min((time - startTime) / 1100, 1);
          var eased = 1 - Math.pow(1 - progress, 3);
          el.textContent = Math.floor(target * eased) + suffix;
          if (progress < 1) window.requestAnimationFrame(tick);
        }
        window.requestAnimationFrame(tick);
        counterObserver.unobserve(el);
      });
    }, { threshold: 0.65 });
    counters.forEach(function (counter) { counterObserver.observe(counter); });
  } else {
    counters.forEach(function (counter) {
      counter.textContent = counter.getAttribute('data-counter') + (counter.getAttribute('data-suffix') || '');
    });
  }

  var faqItems = document.querySelectorAll('.faq-list details');
  faqItems.forEach(function (detail) {
    var summary = detail.querySelector('summary');
    var answer = detail.querySelector('.faq-answer');
    if (!summary || !answer) return;

    answer.classList.add('faq-answer--animated');
    answer.style.height = detail.open ? answer.scrollHeight + 'px' : '0px';
    summary.setAttribute('aria-expanded', String(detail.open));
    detail.classList.toggle('is-expanded', detail.open);

    summary.addEventListener('click', function (event) {
      event.preventDefault();
      var shouldOpen = !detail.open;
      if (detail._faqCleanup) detail._faqCleanup();

      if (shouldOpen) {
        detail.open = true;
        detail.classList.add('is-expanded');
        summary.setAttribute('aria-expanded', 'true');
        answer.style.height = '0px';
        window.requestAnimationFrame(function () {
          answer.style.height = answer.scrollHeight + 'px';
        });
        detail._faqCleanup = function () {
          answer.style.height = 'auto';
          answer.classList.remove('is-animating');
          detail._faqCleanup = null;
        };
        answer.classList.add('is-animating');
        answer.addEventListener('transitionend', function onEnd(event) {
          if (event.propertyName !== 'height') return;
          answer.removeEventListener('transitionend', onEnd);
          if (detail._faqCleanup) detail._faqCleanup();
        });
      } else {
        answer.style.height = answer.scrollHeight + 'px';
        detail.classList.remove('is-expanded');
        summary.setAttribute('aria-expanded', 'false');
        window.requestAnimationFrame(function () {
          answer.style.height = '0px';
        });
        detail._faqCleanup = function () {
          detail.open = false;
          answer.classList.remove('is-animating');
          detail._faqCleanup = null;
        };
        answer.classList.add('is-animating');
        answer.addEventListener('transitionend', function onEnd(event) {
          if (event.propertyName !== 'height') return;
          answer.removeEventListener('transitionend', onEnd);
          if (detail._faqCleanup) detail._faqCleanup();
        });
      }
    });
  });

  // Real form submission & authentication are handled securely via /src/indlop-firebase.ts connected to Firebase


  if (!reduceMotion) {
    var phone = document.querySelector('[data-parallax]');
    var stage = document.querySelector('.hero-stage');
    var pointerFrame = 0;
    var pointerX = 0;
    var pointerTilt = 0;
    if (phone && stage) {
      stage.addEventListener('pointermove', function (event) {
        var rect = stage.getBoundingClientRect();
        pointerX = ((event.clientX - rect.left) / rect.width - 0.5) * 7;
        pointerTilt = ((event.clientX - rect.left) / rect.width - 0.5) * 3;
        if (!pointerFrame) {
          pointerFrame = window.requestAnimationFrame(function () {
            phone.style.setProperty('--pointer-x', pointerX.toFixed(2) + 'px');
            phone.style.setProperty('--pointer-tilt', pointerTilt.toFixed(2) + 'deg');
            pointerFrame = 0;
          });
        }
      });
      stage.addEventListener('pointerleave', function () {
        phone.style.setProperty('--pointer-x', '0px');
        phone.style.setProperty('--pointer-tilt', '0deg');
      });
    }
  }

  motionQuery.addEventListener('change', function (event) {
    reduceMotion = event.matches;
    if (reduceMotion) {
      document.querySelectorAll('.reveal').forEach(function (item) { item.classList.add('is-visible'); });
      requestMotionUpdate();
    }
  });
}());