import {
  auth,
  db,
  googleProvider,
  checkIsAdmin,
  syncUserProfile,
  submitMessage,
  submitWaitlist,
  BOOTSTRAP_ADMIN_EMAIL
} from './firebase';
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, getDoc, collection, getDocs, setDoc, increment } from 'firebase/firestore';

// Immediate Theme Initialization (Prevents FOUC)
export function getSavedTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') return 'light';
  const saved = localStorage.getItem('indlop-theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function applyTheme(theme: 'light' | 'dark') {
  if (typeof document === 'undefined') return;
  const isDark = theme === 'dark';
  document.documentElement.classList.toggle('dark', isDark);
  localStorage.setItem('indlop-theme', theme);
  updateThemeToggleButtons(theme);
}

// Apply immediately on script execution
if (typeof document !== 'undefined') {
  applyTheme(getSavedTheme());
}

// Initialize Client-side Firebase Integration for INDlop
export function initIndlopFirebase() {
  setupThemeToggle();
  setupLoadingBar();
  setupHeaderAuth();
  setupForms();
  hydratePageContent();
  syncCustomNavLinks();
  trackPrivacyFriendlyAnalytics();
}


// 1. Setup Auth Widget in Header and Auth Modal
function setupHeaderAuth() {
  const headerActions = document.querySelector('.header-actions');
  const mobileNav = document.querySelector('[data-mobile-nav]');

  // Inject Auth button into desktop header
  let authButton = document.getElementById('indlop-auth-btn') as HTMLButtonElement | null;
  if (!authButton && headerActions) {
    authButton = document.createElement('button');
    authButton.id = 'indlop-auth-btn';
    authButton.className = 'text-link';
    authButton.style.cssText = 'background:none; border:none; padding:0; cursor:pointer; font-size:12px; color:inherit; display:inline-flex; align-items:center; gap:6px;';
    authButton.textContent = 'Sign In';
    authButton.addEventListener('click', openAuthModal);
    headerActions.insertBefore(authButton, headerActions.firstChild);
  }

  // Inject into mobile nav as well
  let mobileAuthLink = document.getElementById('indlop-mobile-auth-btn') as HTMLButtonElement | null;
  if (!mobileAuthLink && mobileNav) {
    mobileAuthLink = document.createElement('button');
    mobileAuthLink.id = 'indlop-mobile-auth-btn';
    mobileAuthLink.className = 'text-link';
    mobileAuthLink.style.cssText = 'background:none; border:none; padding:10px 0; text-align:left; cursor:pointer; font-size:13px; color:inherit;';
    mobileAuthLink.textContent = 'Sign In';
    mobileAuthLink.addEventListener('click', openAuthModal);
    mobileNav.appendChild(mobileAuthLink);
  }

  // Track Firebase Auth state
  onAuthStateChanged(auth, async (currentUser) => {
    const adminLinkExists = document.getElementById('indlop-admin-link');
    if (adminLinkExists) adminLinkExists.remove();

    if (currentUser) {
      const displayName = currentUser.displayName || currentUser.email?.split('@')[0] || 'Member';
      if (authButton) {
        authButton.innerHTML = `<span>Account (${escapeHtml(displayName)})</span>`;
      }
      if (mobileAuthLink) {
        mobileAuthLink.innerHTML = `<span>Account (${escapeHtml(displayName)})</span>`;
      }

      // Check if user is an admin
      const isAdmin = await checkIsAdmin(currentUser);
      if (isAdmin) {
        localStorage.setItem('indlop_admin_logged_in', 'true');
        if (headerActions) {
          const adminLink = document.createElement('a');
          adminLink.id = 'indlop-admin-link';
          adminLink.href = getAdminPath();
          adminLink.className = 'button button-small button-dark';
          adminLink.style.cssText = 'background:#111; color:#fff; padding:6px 12px; font-size:11px; text-decoration:none; display:inline-flex; align-items:center; gap:4px;';
          adminLink.innerHTML = `Admin Console <span aria-hidden="true">↗</span>`;
          headerActions.insertBefore(adminLink, headerActions.lastChild);
        }
      }

      // Sync profile
      syncUserProfile(currentUser).catch(console.warn);
    } else {
      if (authButton) authButton.textContent = 'Sign In';
      if (mobileAuthLink) mobileAuthLink.textContent = 'Sign In';
    }
  });

  createModalElement();
}

function getAdminPath() {
  const isSubdir = window.location.pathname.includes('/about/') ||
    window.location.pathname.includes('/contact/') ||
    window.location.pathname.includes('/join/') ||
    window.location.pathname.includes('/faq/') ||
    window.location.pathname.includes('/features/') ||
    window.location.pathname.includes('/privacy/') ||
    window.location.pathname.includes('/why-indlop/') ||
    window.location.pathname.includes('/community/') ||
    window.location.pathname.includes('/leadership/');
  return isSubdir ? '../admin/' : 'admin/';
}

// 2. Create Modal Structure in DOM
function createModalElement() {
  if (document.getElementById('indlop-auth-modal')) return;

  const modalOverlay = document.createElement('div');
  modalOverlay.id = 'indlop-auth-modal';
  modalOverlay.style.cssText = 'position:fixed; inset:0; background:rgba(0,0,0,0.6); backdrop-filter:blur(4px); z-index:9999; display:none; align-items:center; justify-content:center; padding:16px;';

  modalOverlay.innerHTML = `
    <div id="indlop-modal-card" style="width:100%; max-width:400px; background:#fff; border:1px solid #111; padding:32px 28px; box-shadow:0 12px 35px rgba(0,0,0,0.25); position:relative; font-family:var(--sans); color:#111;">
      <button id="indlop-modal-close" type="button" aria-label="Close modal" style="position:absolute; right:16px; top:16px; background:none; border:none; font-size:20px; cursor:pointer; color:#777;">✕</button>

      <div id="indlop-modal-content"></div>
    </div>
  `;

  document.body.appendChild(modalOverlay);

  // Close on backdrop click
  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) closeAuthModal();
  });

  const closeBtn = document.getElementById('indlop-modal-close');
  if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
}

function openAuthModal() {
  const modal = document.getElementById('indlop-auth-modal');
  if (!modal) return;
  modal.style.display = 'flex';
  renderModalContent();
}

function closeAuthModal() {
  const modal = document.getElementById('indlop-auth-modal');
  if (modal) modal.style.display = 'none';
}

// Render dynamic modal content based on Auth state
async function renderModalContent() {
  const container = document.getElementById('indlop-modal-content');
  if (!container) return;

  const currentUser = auth.currentUser;

  if (currentUser) {
    const isAdmin = await checkIsAdmin(currentUser);
    container.innerHTML = `
      <div style="text-align:center;">
        <span style="display:inline-flex; align-items:flex-end; gap:2px; height:16px; margin-bottom:12px;">
          <span style="display:block; width:4px; height:7px; background:#111;"></span>
          <span style="display:block; width:4px; height:14px; background:#111;"></span>
          <span style="display:block; width:4px; height:9px; background:#111;"></span>
        </span>
        <h3 style="font-size:22px; font-weight:500; margin:0 0 6px;">Your <em>Account</em></h3>
        <p style="font-size:12px; color:#666; margin:0 0 20px;">Signed in as <strong>${escapeHtml(currentUser.email || '')}</strong></p>

        <div style="background:#f7f7f6; border:1px solid #ddd; padding:14px; text-align:left; font-size:12px; margin-bottom:20px;">
          <div style="margin-bottom:6px;"><strong>Name:</strong> ${escapeHtml(currentUser.displayName || 'Member')}</div>
          <div style="margin-bottom:6px;"><strong>Status:</strong> ${isAdmin ? 'Authorized Administrator' : 'Registered Member'}</div>
          <div><strong>Firebase ID:</strong> <span style="font-family:var(--mono); font-size:10px; color:#666;">${currentUser.uid}</span></div>
        </div>

        ${isAdmin ? `
          <a href="${getAdminPath()}" style="display:block; width:100%; padding:11px; background:#111; color:#fff; text-decoration:none; font-size:12px; font-weight:600; text-align:center; margin-bottom:10px; box-sizing:border-box;">
            Open Admin Console ↗
          </a>
        ` : ''}

        <button id="indlop-signout-btn" type="button" style="width:100%; padding:10px; background:#fff; border:1px solid #ccc; font-size:12px; cursor:pointer;">
          Sign Out
        </button>
      </div>
    `;

    document.getElementById('indlop-signout-btn')?.addEventListener('click', async () => {
      await signOut(auth);
      renderModalContent();
    });

  } else {
    // Unauthenticated: Sign In or Register tabs
    let currentMode: 'signin' | 'signup' = 'signin';

    function renderForm() {
      if (!container) return;
      container.innerHTML = `
        <div style="margin-bottom:20px;">
          <div style="display:flex; align-items:center; gap:8px; margin-bottom:12px;">
            <span style="display:inline-flex; align-items:flex-end; gap:2px; height:16px;">
              <span style="display:block; width:4px; height:7px; background:#111;"></span>
              <span style="display:block; width:4px; height:14px; background:#111;"></span>
              <span style="display:block; width:4px; height:9px; background:#111;"></span>
            </span>
            <span style="font-size:16px; font-weight:700; letter-spacing:-0.05em;">INDlop</span>
          </div>
          <h3 style="font-size:22px; font-weight:500; margin:0 0 6px;">
            ${currentMode === 'signin' ? 'Sign in to <em>INDlop</em>' : 'Create your <em>account</em>'}
          </h3>
          <p style="font-size:12px; color:#666; margin:0;">
            ${currentMode === 'signin' ? 'Access your INDlop profile and community features.' : 'Join the thoughtful social network.'}
          </p>
        </div>

        <button id="indlop-google-btn" type="button" style="width:100%; display:flex; align-items:center; justify-content:center; gap:10px; padding:11px; background:#fff; border:1px solid #111; font-size:12px; font-weight:600; cursor:pointer; margin-bottom:16px;">
          <svg width="16" height="16" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
          </svg>
          Continue with Google
        </button>

        <div style="display:flex; align-items:center; gap:8px; margin:16px 0; color:#888; font-size:10px; text-transform:uppercase; letter-spacing:0.08em;">
          <span style="flex:1; height:1px; background:#ddd;"></span>
          <span>Or with email</span>
          <span style="flex:1; height:1px; background:#ddd;"></span>
        </div>

        <div id="indlop-auth-error" style="display:none; background:#fee; border:1px solid #fcc; color:#b00; padding:8px 12px; font-size:11px; margin-bottom:12px;"></div>

        <form id="indlop-auth-form">
          ${currentMode === 'signup' ? `
            <div style="margin-bottom:12px;">
              <label style="display:block; font-size:11px; font-weight:600; color:#444; margin-bottom:4px;">Your Name</label>
              <input id="indlop-auth-name" type="text" required placeholder="How should we call you?" style="width:100%; padding:9px 10px; border:1px solid #ccc; font-size:13px; box-sizing:border-box;">
            </div>
          ` : ''}

          <div style="margin-bottom:12px;">
            <label style="display:block; font-size:11px; font-weight:600; color:#444; margin-bottom:4px;">Email Address</label>
            <input id="indlop-auth-email" type="email" required placeholder="you@example.com" style="width:100%; padding:9px 10px; border:1px solid #ccc; font-size:13px; box-sizing:border-box;">
          </div>

          <div style="margin-bottom:18px;">
            <label style="display:block; font-size:11px; font-weight:600; color:#444; margin-bottom:4px;">Password</label>
            <input id="indlop-auth-pass" type="password" required minlength="6" placeholder="At least 6 characters" style="width:100%; padding:9px 10px; border:1px solid #ccc; font-size:13px; box-sizing:border-box;">
          </div>

          <button id="indlop-submit-btn" type="submit" style="width:100%; padding:11px; background:#111; color:#fff; border:none; font-size:12px; font-weight:600; cursor:pointer;">
            ${currentMode === 'signin' ? 'Sign In ↗' : 'Create Account ↗'}
          </button>
        </form>

        <div style="margin-top:16px; text-align:center; font-size:11px; color:#666;">
          ${currentMode === 'signin' ? `
            Don’t have an account yet? <button id="indlop-toggle-mode" type="button" style="background:none; border:none; color:#111; font-weight:600; cursor:pointer; text-decoration:underline;">Create one</button>
          ` : `
            Already have an account? <button id="indlop-toggle-mode" type="button" style="background:none; border:none; color:#111; font-weight:600; cursor:pointer; text-decoration:underline;">Sign in</button>
          `}
        </div>
      `;

      // Event Listeners for form
      document.getElementById('indlop-toggle-mode')?.addEventListener('click', () => {
        currentMode = currentMode === 'signin' ? 'signup' : 'signin';
        renderForm();
      });

      document.getElementById('indlop-google-btn')?.addEventListener('click', async () => {
        try {
          const res = await signInWithPopup(auth, googleProvider);
          await syncUserProfile(res.user);
          renderModalContent();
        } catch (e: any) {
          showAuthError(e.message || 'Google sign in failed');
        }
      });

      document.getElementById('indlop-auth-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = (document.getElementById('indlop-auth-email') as HTMLInputElement)?.value;
        const pass = (document.getElementById('indlop-auth-pass') as HTMLInputElement)?.value;
        const name = (document.getElementById('indlop-auth-name') as HTMLInputElement)?.value;
        const submitBtn = document.getElementById('indlop-submit-btn') as HTMLButtonElement;

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.textContent = 'Processing...';
        }

        try {
          if (currentMode === 'signup') {
            const userCred = await createUserWithEmailAndPassword(auth, email, pass);
            await syncUserProfile({
              ...userCred.user,
              displayName: name || email.split('@')[0]
            } as any);
          } else {
            await signInWithEmailAndPassword(auth, email, pass);
          }
          renderModalContent();
        } catch (err: any) {
          showAuthError(err.message || 'Authentication failed. Please verify credentials.');
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = currentMode === 'signin' ? 'Sign In ↗' : 'Create Account ↗';
          }
        }
      });
    }

    renderForm();
  }
}

function showAuthError(msg: string) {
  const errBox = document.getElementById('indlop-auth-error');
  if (errBox) {
    errBox.textContent = msg;
    errBox.style.display = 'block';
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  })[m] || m);
}

// 3. Connect Public Contact and Waitlist Forms to Firestore
function setupForms() {
  // Check for contact forms
  document.querySelectorAll('[data-contact-form]').forEach((formElement) => {
    const form = formElement as HTMLFormElement;
    const formStatus = form.querySelector('[data-form-status]') as HTMLElement | null;
    const submitButton = form.querySelector('button[type="submit"]') as HTMLButtonElement | null;
    if (!submitButton) return;

    // Detect if this is the Contact form or the Join/Waitlist form
    const isJoinForm = window.location.pathname.includes('/join') || form.querySelector('#join-handle') !== null;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const originalText = submitButton.innerHTML;
      submitButton.disabled = true;
      submitButton.innerHTML = 'Sending to INDlop <span aria-hidden="true">· · ·</span>';

      try {
        const formData = new FormData(form);
        const name = (formData.get('name') as string) || '';
        const email = (formData.get('email') as string) || '';
        const message = (formData.get('message') as string) || '';

        if (isJoinForm) {
          const handle = (formData.get('handle') as string) || '';
          await submitWaitlist({
            name,
            email,
            handle,
            message
          });

          form.reset();
          submitButton.disabled = false;
          submitButton.innerHTML = 'Waitlist Reserved <span aria-hidden="true">✓</span>';
          if (formStatus) {
            formStatus.textContent = 'Thank you! You have been added to the early-access waitlist. We will reach out when invitations open.';
            formStatus.className = 'form-status show';
            formStatus.style.cssText = 'color:#166534; font-weight:600; margin-top:14px;';
          }
        } else {
          // Contact message
          await submitMessage({
            name,
            email,
            message,
            type: 'contact'
          });

          form.reset();
          submitButton.disabled = false;
          submitButton.innerHTML = 'Message Sent <span aria-hidden="true">✓</span>';
          if (formStatus) {
            formStatus.textContent = 'Thank you! Your note has been securely delivered to the INDlop team.';
            formStatus.className = 'form-status show';
            formStatus.style.cssText = 'color:#166534; font-weight:600; margin-top:14px;';
          }
        }
      } catch (err: any) {
        console.error('Submission error:', err);
        submitButton.disabled = false;
        submitButton.innerHTML = originalText;
        if (formStatus) {
          formStatus.textContent = 'Unable to send right now. Please check your network and try again.';
          formStatus.className = 'form-status show';
          formStatus.style.cssText = 'color:#b91c1c; font-weight:600; margin-top:14px;';
        }
      }
    });
  });
}

// 4. Hydrate Core Page Content from Firestore CMS
async function hydratePageContent() {
  const path = window.location.pathname;
  let slug = '';
  if (path.includes('/about')) slug = 'about';
  else if (path.includes('/privacy')) slug = 'privacy';
  else if (path.includes('/faq')) slug = 'faq';
  else if (path.includes('/features')) slug = 'features';
  else if (path.includes('/community')) slug = 'community';
  else if (path.includes('/contact')) slug = 'contact';
  else if (path.includes('/why-indlop')) slug = 'why-indlop';
  else if (path.includes('/join')) slug = 'join';

  if (!slug) return;

  try {
    const pageSnap = await getDoc(doc(db, 'pages', slug));
    if (pageSnap.exists()) {
      const data = pageSnap.data();
      if (data.status === 'draft') return;

      // Update hero title
      if (data.heroTitle) {
        const h1 = document.querySelector('.page-hero h1, .hero h1');
        if (h1) h1.innerHTML = formatHtmlHeading(data.heroTitle);
      }
      // Update hero subtitle
      if (data.heroSubtitle) {
        const p = document.querySelector('.page-hero p, .hero-lede');
        if (p) p.textContent = data.heroSubtitle;
      }
      // Update section title
      if (data.sectionTitle) {
        const h2 = document.querySelector('.page-section h2, .section h2, .contact-copy h2');
        if (h2) h2.innerHTML = formatHtmlHeading(data.sectionTitle);
      }
      // If custom body text is present, update or append content block
      if (data.bodyText && data.bodyText.trim()) {
        let customBlock = document.getElementById('indlop-cms-body-block');
        if (!customBlock) {
          customBlock = document.createElement('div');
          customBlock.id = 'indlop-cms-body-block';
          customBlock.className = 'container reveal is-visible';
          customBlock.style.cssText = 'max-width:860px; margin:32px auto; padding:24px; background:#fff; border-top:1px solid #ddd; font-size:15px; line-height:1.8; color:#333;';
          const main = document.querySelector('main');
          if (main) {
            const firstSection = main.querySelector('.page-section, .section');
            if (firstSection) firstSection.appendChild(customBlock);
            else main.appendChild(customBlock);
          }
        }
        customBlock.innerHTML = data.bodyText.split(/\n\s*\n/).map((para: string) => `<p style="margin-bottom:16px;">${escapeHtml(para.trim())}</p>`).join('');
      }
    }
  } catch (err) {
    console.warn('Page hydration error:', err);
  }
}

function formatHtmlHeading(text: string): string {
  if (text.includes('<em>') || text.includes('</em>') || text.includes('<br>')) {
    return text;
  }
  const words = text.split(' ');
  if (words.length > 2) {
    const lastWord = words.pop();
    return `${escapeHtml(words.join(' '))}<br><em>${escapeHtml(lastWord || '')}</em>`;
  }
  return escapeHtml(text);
}

// 5. Sync Custom Pages into Navigation
async function syncCustomNavLinks() {
  try {
    const qSnap = await getDocs(collection(db, 'pages'));
    const customPages: Array<{ slug: string; title: string }> = [];
    qSnap.forEach(d => {
      const p = d.data();
      if (p.isCustom && p.status !== 'draft') {
        customPages.push({ slug: d.id, title: p.title || d.id });
      }
    });

    if (customPages.length === 0) return;

    const desktopNav = document.querySelector('.desktop-nav');
    const mobileNav = document.querySelector('[data-mobile-nav]');
    const isSubdir = window.location.pathname.includes('/about/') ||
      window.location.pathname.includes('/contact/') ||
      window.location.pathname.includes('/join/') ||
      window.location.pathname.includes('/faq/') ||
      window.location.pathname.includes('/features/') ||
      window.location.pathname.includes('/privacy/') ||
      window.location.pathname.includes('/why-indlop/') ||
      window.location.pathname.includes('/community/') ||
      window.location.pathname.includes('/leadership/') ||
      window.location.pathname.includes('/page/');

    const prefix = isSubdir ? '../page/?slug=' : 'page/?slug=';

    customPages.forEach(cp => {
      const existingId = `custom-nav-${cp.slug}`;
      if (desktopNav && !document.getElementById(existingId)) {
        const link = document.createElement('a');
        link.id = existingId;
        link.href = `${prefix}${cp.slug}`;
        link.textContent = cp.title;
        desktopNav.appendChild(link);
      }
      if (mobileNav && !document.getElementById(`mobile-${existingId}`)) {
        const mLink = document.createElement('a');
        mLink.id = `mobile-${existingId}`;
        mLink.href = `${prefix}${cp.slug}`;
        mLink.textContent = cp.title;
        mobileNav.insertBefore(mLink, mobileNav.lastChild);
      }
    });
  } catch (e) {
    // Non-blocking navigation sync
  }
}

// 6. Setup Theme Toggle in Header and Mobile Nav
function setupThemeToggle() {
  const headerActions = document.querySelector('.header-actions');
  const mobileNav = document.querySelector('[data-mobile-nav]');
  const currentTheme = getSavedTheme();

  // Desktop Toggle
  if (headerActions && !document.getElementById('indlop-theme-toggle')) {
    const toggleBtn = document.createElement('button');
    toggleBtn.id = 'indlop-theme-toggle';
    toggleBtn.type = 'button';
    toggleBtn.className = 'theme-toggle-btn';
    toggleBtn.setAttribute('aria-label', `Switch to ${currentTheme === 'dark' ? 'light' : 'dark'} mode`);
    toggleBtn.innerHTML = getThemeIcon(currentTheme);
    toggleBtn.addEventListener('click', () => {
      const nextTheme = getSavedTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
    headerActions.appendChild(toggleBtn);
  }

  // Mobile Toggle
  if (mobileNav && !document.getElementById('indlop-mobile-theme-toggle')) {
    const mContainer = document.createElement('div');
    mContainer.id = 'indlop-mobile-theme-container';
    mContainer.style.cssText = 'display:flex; align-items:center; justify-content:space-between; padding:12px 0; border-top:1px solid var(--line); margin-top:8px; font-size:13px;';
    mContainer.innerHTML = `
      <span>Theme Preference</span>
      <button id="indlop-mobile-theme-toggle" type="button" class="theme-toggle-btn" aria-label="Toggle theme">
        ${getThemeIcon(currentTheme)}
      </button>
    `;
    const mBtn = mContainer.querySelector('#indlop-mobile-theme-toggle');
    mBtn?.addEventListener('click', () => {
      const nextTheme = getSavedTheme() === 'dark' ? 'light' : 'dark';
      applyTheme(nextTheme);
    });
    mobileNav.appendChild(mContainer);
  }
}

function getThemeIcon(theme: 'light' | 'dark'): string {
  if (theme === 'dark') {
    // Sun icon to switch to light mode
    return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>`;
  }
  // Moon icon to switch to dark mode
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:14px;height:14px;"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>`;
}

function updateThemeToggleButtons(theme: 'light' | 'dark') {
  const icon = getThemeIcon(theme);
  const label = `Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`;

  const desktopBtn = document.getElementById('indlop-theme-toggle');
  if (desktopBtn) {
    desktopBtn.innerHTML = icon;
    desktopBtn.setAttribute('aria-label', label);
  }

  const mobileBtn = document.getElementById('indlop-mobile-theme-toggle');
  if (mobileBtn) {
    mobileBtn.innerHTML = icon;
    mobileBtn.setAttribute('aria-label', label);
  }
}

// 7. Setup Top Loading Bar & Smooth Page Transitions
function setupLoadingBar() {
  let bar = document.getElementById('indlop-loading-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.id = 'indlop-loading-bar';
    document.body.prepend(bar);
  }

  // Brief initial load animation
  bar.style.width = '35%';
  bar.style.opacity = '1';
  setTimeout(() => {
    if (bar) bar.style.width = '100%';
    setTimeout(() => {
      if (bar) {
        bar.style.opacity = '0';
        setTimeout(() => {
          if (bar) bar.style.width = '0%';
        }, 400);
      }
    }, 200);
  }, 100);

  // Link click listener for seamless feel
  document.addEventListener('click', (e) => {
    const target = (e.target as HTMLElement)?.closest('a');
    if (!target) return;
    const href = target.getAttribute('href');
    if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || target.target === '_blank') return;
    if (href.startsWith('http') && !href.includes(window.location.host)) return;

    if (bar) {
      bar.style.opacity = '1';
      bar.style.width = '65%';
    }
  });
}

// 8. Privacy-Friendly Traffic Analytics Tracker with Server-Side Deduplication & Admin Exclusion
async function trackPrivacyFriendlyAnalytics() {
  try {
    // 1. Exclude Admin Visits & Dashboard completely
    const currentPath = window.location.pathname || '/';
    if (currentPath.includes('/admin') || currentPath.startsWith('/admin')) {
      return;
    }
    if (
      localStorage.getItem('indlop_admin_logged_in') === 'true' ||
      sessionStorage.getItem('indlop_admin_logged_in') === 'true' ||
      auth.currentUser?.email === BOOTSTRAP_ADMIN_EMAIL
    ) {
      return;
    }

    // 2. Respect Do Not Track (DNT)
    if (navigator.doNotTrack === '1') return;

    const today = new Date().toISOString().slice(0, 10);

    // 3. Persistent, Privacy-Friendly Anonymous Visitor ID (localStorage)
    const visitorStorageKey = 'indlop_unique_vid';
    let visitorId = localStorage.getItem(visitorStorageKey);
    if (!visitorId) {
      visitorId = 'vid_' + Math.random().toString(36).slice(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(visitorStorageKey, visitorId);
    }

    // 4. Server-Side Deduplication in Firestore
    // One device/browser counts as one unique visitor per day, verified against database record
    const visitorDocId = `${today}_${visitorId}`;
    const visitorDocRef = doc(db, 'analytics_visitors', visitorDocId);
    let isUniqueVisitorToday = false;

    try {
      const visitorSnap = await getDoc(visitorDocRef);
      if (!visitorSnap.exists()) {
        isUniqueVisitorToday = true;
        await setDoc(visitorDocRef, {
          date: today,
          visitorId,
          firstSeen: new Date().toISOString()
        });
      }
    } catch {
      // If Firestore read fails due to offline/network, fallback to client-side date record
      const clientLastVisit = localStorage.getItem('indlop_last_visit_date');
      if (clientLastVisit !== today) {
        isUniqueVisitorToday = true;
        localStorage.setItem('indlop_last_visit_date', today);
      }
    }

    // 5. Throttling: Prevent repeated page refreshes from inflating views count
    const safePath = 'p_' + currentPath.replace(/[^a-zA-Z0-9]/g, '_').replace(/^_+|_+$/g, '') || 'p_home';
    const now = Date.now();
    const lastViewKey = `indlop_view_debounce_${safePath}`;
    const lastViewTime = parseInt(sessionStorage.getItem(lastViewKey) || '0', 10);
    const isRefresh = (now - lastViewTime) < 45000; // 45 seconds debounce per route in session
    sessionStorage.setItem(lastViewKey, now.toString());

    // If it's an immediate page refresh and not a new unique visitor, do not submit duplicate stats
    if (isRefresh && !isUniqueVisitorToday) {
      return;
    }

    const width = window.innerWidth;
    const deviceType = width < 640 ? 'mobile' : width < 1024 ? 'tablet' : 'desktop';

    let referrerHost = 'direct';
    if (document.referrer) {
      try {
        const refUrl = new URL(document.referrer);
        if (refUrl.hostname && !refUrl.hostname.includes(window.location.host)) {
          referrerHost = refUrl.hostname.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 50);
        }
      } catch (_) {}
    }

    const docRef = doc(db, 'analytics_daily', today);
    const payload: Record<string, any> = {
      date: today,
      lastUpdated: new Date().toISOString()
    };

    if (!isRefresh) {
      payload.totalViews = increment(1);
      payload[`paths.${safePath}`] = increment(1);
      payload[`devices.${deviceType}`] = increment(1);
      payload[`referrers.${referrerHost}`] = increment(1);
    }

    if (isUniqueVisitorToday) {
      payload.uniqueVisitors = increment(1);
      payload.uniqueSessions = increment(1);
    }

    if (Object.keys(payload).length > 2) {
      await setDoc(docRef, payload, { merge: true });
    }
  } catch (err) {
    // Silent fail so client UX is never interrupted
  }
}


// Automatically initialize when DOM is ready
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initIndlopFirebase);
  } else {
    initIndlopFirebase();
  }
}
