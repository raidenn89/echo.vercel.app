// Makes Echo behave like a native app when added to the home screen:
// measures the real safe areas (notch / Dynamic Island / home bar), tracks the
// on-screen keyboard, and exposes everything as CSS variables.
const ua = navigator.userAgent;
const isIOS = /iPhone|iPad|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

export const isStandalone = () =>
  matchMedia('(display-mode: standalone)').matches ||
  matchMedia('(display-mode: fullscreen)').matches ||
  (navigator as Navigator & { standalone?: boolean }).standalone === true;

export function setupViewport() {
  const root = document.documentElement;
  const probe = document.createElement('div');
  probe.setAttribute('aria-hidden', 'true');
  probe.style.cssText =
    'position:fixed;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)';
  document.body.appendChild(probe);

  const update = () => {
    const cs = getComputedStyle(probe);
    let top = parseFloat(cs.paddingTop) || 0;
    let bottom = parseFloat(cs.paddingBottom) || 0;
    const left = parseFloat(cs.paddingLeft) || 0;
    const right = parseFloat(cs.paddingRight) || 0;
    const vv = window.visualViewport;
    const h = vv?.height ?? innerHeight;
    const keyboard = isIOS || /Android/.test(ua) ? innerHeight - h > 120 : false;
    const standalone = isStandalone();
    const portrait = innerHeight > innerWidth;

    // iOS home-screen (Add to Home Screen) can run edge-to-edge while reporting 0 safe-area.
    // Push content below the status / Dynamic Island bar so header buttons are never covered.
    if (standalone && isIOS) {
      const sh = Math.max(screen.width, screen.height);
      const sw = Math.min(screen.width, screen.height);
      if (portrait && top < 20) {
        // Prefer measured env(); only fall back when the OS reports nothing useful.
        if (top === 0 && sh - innerHeight < 12) {
          // Dynamic Island / notch devices ~47–59; older 20.
          top = [852, 874, 932, 956, 844, 926].includes(sh) || sw >= 390 ? 59 : sh >= 812 ? 47 : 20;
        } else if (top > 0 && top < 44) {
          // Some WebViews under-report; bump to a safe minimum so the white header isn't under the black bar.
          top = Math.max(top, 47);
        }
      }
      if (portrait && bottom < 20 && sh >= 812) bottom = Math.max(bottom, 34);
    }
    if (keyboard) bottom = 0;

    root.style.setProperty('--sat', `${top}px`);
    root.style.setProperty('--sab', `${bottom}px`);
    root.style.setProperty('--sal', `${left}px`);
    root.style.setProperty('--sar', `${right}px`);
    root.style.setProperty('--vvh', `${h}px`);
    root.style.setProperty('--vvt', `${vv?.offsetTop ?? 0}px`);
    root.classList.toggle('pwa', standalone);
    root.classList.toggle('ios', isIOS);
    root.classList.toggle('kb', keyboard);
    root.classList.toggle('phone', Math.min(innerWidth, innerHeight) < 640);
    // Keep the app pinned under the status bar when the visual viewport shifts on iOS PWA.
    if (isIOS && standalone && vv && vv.offsetTop > 0) window.scrollTo(0, 0);
  };

  update();
  requestAnimationFrame(update);
  setTimeout(update, 300);
  addEventListener('resize', update);
  addEventListener('orientationchange', () => setTimeout(update, 250));
  window.visualViewport?.addEventListener('resize', update);
  window.visualViewport?.addEventListener('scroll', update);
  matchMedia('(display-mode: standalone)').addEventListener?.('change', update);
}

export const haptic = (ms = 8) => { try { navigator.vibrate?.(ms); } catch { /* unsupported */ } };
