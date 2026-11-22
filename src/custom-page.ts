import { db } from './firebase';
import { doc, getDoc } from 'firebase/firestore';

async function loadCustomPage() {
  const urlParams = new URLSearchParams(window.location.search);
  const slug = urlParams.get('slug') || window.location.hash.replace('#', '') || 'privacy-policy';

  const headTitle = document.getElementById('custom-page-head-title');
  const heroTitle = document.getElementById('custom-page-hero-title');
  const heroSub = document.getElementById('custom-page-hero-sub');
  const crumb = document.getElementById('custom-page-crumb');
  const bodyContainer = document.getElementById('custom-page-body');

  try {
    const docRef = doc(db, 'pages', slug);
    const snap = await getDoc(docRef);

    if (snap.exists()) {
      const data = snap.data();

      if (headTitle) headTitle.textContent = `${data.title || 'Page'} — INDlop`;
      if (crumb) crumb.innerHTML = `<span>✦</span> ${escapeHtml(data.title || 'Page')}`;
      if (heroTitle) {
        heroTitle.innerHTML = formatHeading(data.heroTitle || data.title || 'Page');
      }
      if (heroSub) {
        heroSub.textContent = data.heroSubtitle || '';
      }

      if (bodyContainer) {
        bodyContainer.innerHTML = formatBodyContent(data.bodyText || '');
      }
    } else {
      // Document not found
      if (heroTitle) heroTitle.innerHTML = 'Page <em>Not Found</em>';
      if (heroSub) heroSub.textContent = 'This page has not been published yet or has been removed by the administrator.';
      if (bodyContainer) {
        bodyContainer.innerHTML = `
          <div style="padding: 40px 0; border-top: 1px solid #ddd; margin-top: 20px;">
            <p style="color: #666; margin-bottom: 24px;">The requested page slug <code>${escapeHtml(slug)}</code> was not found in the INDlop database.</p>
            <a href="../" class="button button-dark" style="display:inline-flex;">Return to Home ↗</a>
          </div>
        `;
      }
    }
  } catch (error) {
    console.error('Error loading custom page:', error);
    if (heroTitle) heroTitle.innerHTML = 'Unable to <em>load page</em>';
    if (heroSub) heroSub.textContent = 'A connection error occurred. Please check your network and refresh.';
  }
}

function formatHeading(text: string): string {
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

function formatBodyContent(raw: string): string {
  if (!raw.trim()) {
    return '<p style="color:#777; font-style:italic;">No content has been added to this page yet.</p>';
  }

  // If content contains HTML tags, render it safely or format paragraphs
  const paragraphs = raw.split(/\n\s*\n/);
  return paragraphs.map(p => {
    const trimmed = p.trim();
    if (trimmed.startsWith('## ')) {
      return `<h2 style="font-size: 28px; font-weight: 500; letter-spacing: -0.04em; margin: 38px 0 16px; color: #111;">${escapeHtml(trimmed.replace('## ', ''))}</h2>`;
    }
    if (trimmed.startsWith('### ')) {
      return `<h3 style="font-size: 20px; font-weight: 600; margin: 28px 0 12px; color: #111;">${escapeHtml(trimmed.replace('### ', ''))}</h3>`;
    }
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items = trimmed.split('\n').map(line => `<li>${escapeHtml(line.replace(/^[-*]\s*/, ''))}</li>`).join('');
      return `<ul style="padding-left: 20px; margin: 16px 0; color: #444; line-height: 1.8;">${items}</ul>`;
    }
    return `<p style="margin-bottom: 20px; color: #333; line-height: 1.8;">${escapeHtml(trimmed)}</p>`;
  }).join('');
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

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCustomPage);
  } else {
    loadCustomPage();
  }
}
