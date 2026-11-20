// DevMeDoAnDrOiD

const OVERLAY_ID = 'shaha-security-shield-overlay';

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (target.isContentEditable) return true;
  return Boolean(target.closest('.select-text'));
}

function showSecurityOverlay(reason: string, autoClearMs?: number) {
  if (typeof document === 'undefined') return;
  const root = document.getElementById('root');
  if (root) {
    root.style.filter = 'blur(18px)';
    root.style.pointerEvents = 'none';
    root.style.userSelect = 'none';
  }

  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = OVERLAY_ID;
    overlay.setAttribute('dir', 'rtl');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483647',
      'display:flex',
      'align-items:center',
      'justify-content:center',
      'padding:24px',
      'background:rgba(10,15,24,0.88)',
      'backdrop-filter:blur(14px)',
      '-webkit-backdrop-filter:blur(14px)',
      'color:#ffffff',
      'font-family:Cairo,Tajawal,sans-serif',
      'text-align:center',
      'user-select:none'
    ].join(';');

    overlay.innerHTML = `
      <div style="max-width:420px;width:100%;background:rgba(18,26,38,0.96);border:1px solid rgba(16,185,129,0.35);border-radius:28px;padding:28px 24px;box-shadow:0 24px 60px rgba(0,0,0,0.55);">
        <div style="width:56px;height:56px;margin:0 auto 16px;border-radius:18px;background:linear-gradient(135deg,#059669,#047857);display:flex;align-items:center;justify-content:center;box-shadow:0 10px 25px rgba(5,150,105,0.35);">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <h2 style="margin:0 0 8px;font-size:19px;font-weight:900;color:#f8fafc;">درع الحماية الأمني نشط</h2>
        <p id="shaha-shield-reason" style="margin:0 0 14px;font-size:13.5px;line-height:1.7;color:#cbd5e1;font-weight:600;"></p>
        <div style="font-size:11.5px;color:#34d399;background:rgba(16,185,129,0.12);border:1px solid rgba(16,185,129,0.25);border-radius:12px;padding:8px 12px;font-weight:700;">
          أغلق أدوات المطور للمتابعة بشكل طبيعي • SHAHA ONE SECURITY
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  }

  const reasonEl = overlay.querySelector('#shaha-shield-reason');
  if (reasonEl) {
    reasonEl.textContent = reason;
  }

  if (autoClearMs) {
    window.setTimeout(() => hideSecurityOverlay(), autoClearMs);
  }
}

function hideSecurityOverlay() {
  if (typeof document === 'undefined') return;
  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) overlay.remove();
  const root = document.getElementById('root');
  if (root) {
    root.style.filter = '';
    root.style.pointerEvents = '';
    root.style.userSelect = '';
  }
}

export function initSecurityShield(): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {};
  }

  const onContextMenu = (e: MouseEvent) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  };

  const onDragStart = (e: DragEvent) => {
    if (isEditableTarget(e.target)) return;
    e.preventDefault();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key = (e.key || '').toUpperCase();
    const ctrlOrMeta = e.ctrlKey || e.metaKey;

    const isDevToolsShortcut =
      key === 'F12' ||
      (ctrlOrMeta && e.shiftKey && ['I', 'J', 'C', 'K', 'E'].includes(key)) ||
      (e.metaKey && e.altKey && ['I', 'J', 'C', 'U'].includes(key)) ||
      (ctrlOrMeta && ['U', 'S'].includes(key));

    if (isDevToolsShortcut) {
      e.preventDefault();
      e.stopPropagation();
      if (import.meta.env.PROD) {
        showSecurityOverlay(
          'تم حظر اختصارات وضع المطور وفحص الكود المصدري لحماية بيانات وأمان منصة شها ون.',
          2600
        );
      }
      return false;
    }
  };

  document.addEventListener('contextmenu', onContextMenu, { capture: true });
  document.addEventListener('dragstart', onDragStart, { capture: true });
  window.addEventListener('keydown', onKeyDown, { capture: true });

  let devToolsInterval: number | undefined;
  let wasDockedOpen = false;

  if (import.meta.env.PROD && !navigator.webdriver) {
    const checkDockedDevTools = () => {
      if (window.innerWidth < 768 || window.outerWidth === 0) {
        if (wasDockedOpen) {
          wasDockedOpen = false;
          hideSecurityOverlay();
        }
        return;
      }
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      const isDockedOpen = widthDelta > 210 || heightDelta > 240;

      if (isDockedOpen && !wasDockedOpen) {
        wasDockedOpen = true;
        showSecurityOverlay(
          'تم رصد فتح أدوات المطور (DevTools). تم إخفاء المحتوى مؤقتاً لحماية خصوصية وأمان المنصة.'
        );
      } else if (!isDockedOpen && wasDockedOpen) {
        wasDockedOpen = false;
        hideSecurityOverlay();
      }
    };

    devToolsInterval = window.setInterval(checkDockedDevTools, 1200);
    window.addEventListener('resize', checkDockedDevTools);

    return () => {
      document.removeEventListener('contextmenu', onContextMenu, { capture: true });
      document.removeEventListener('dragstart', onDragStart, { capture: true });
      window.removeEventListener('keydown', onKeyDown, { capture: true });
      if (devToolsInterval) window.clearInterval(devToolsInterval);
      window.removeEventListener('resize', checkDockedDevTools);
      hideSecurityOverlay();
    };
  }

  return () => {
    document.removeEventListener('contextmenu', onContextMenu, { capture: true });
    document.removeEventListener('dragstart', onDragStart, { capture: true });
    window.removeEventListener('keydown', onKeyDown, { capture: true });
    hideSecurityOverlay();
  };
}
// Copyright (c) 2026 MeDoAnDrOiD. All Rights Reserved.
