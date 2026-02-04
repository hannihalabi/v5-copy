(() => {
  const banner = document.querySelector('[data-cookie-banner]');
  const storageKey = 'cookie_consent';
  const cookieName = 'cookie_consent';
  const acceptedValue = 'accepted';
  const gtmId = 'GTM-KJV6RV8L';

  const loadAnalytics = () => {
    if (!gtmId || window.__gtmLoaded) {
      return;
    }
    window.__gtmLoaded = true;
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push({ 'gtm.start': new Date().getTime(), event: 'gtm.js' });

    const script = document.createElement('script');
    script.async = true;
    script.src = `https://www.googletagmanager.com/gtm.js?id=${gtmId}`;
    document.head.appendChild(script);
  };

  const hasLocalConsent = () => {
    try {
      return localStorage.getItem(storageKey) === acceptedValue;
    } catch (error) {
      return false;
    }
  };

  const hasCookieConsent = () => {
    const cookies = document.cookie.split(';');
    return cookies.some((cookie) => cookie.trim().startsWith(`${cookieName}=${acceptedValue}`));
  };

  const setCookie = () => {
    const maxAge = 60 * 60 * 24 * 365;
    let value = `${cookieName}=${acceptedValue}; Max-Age=${maxAge}; Path=/; SameSite=Lax`;
    if (window.location.protocol === 'https:') {
      value += '; Secure';
    }
    document.cookie = value;
  };

  const setConsent = () => {
    try {
      localStorage.setItem(storageKey, acceptedValue);
    } catch (error) {
      // Ignore storage failures and rely on cookies instead.
    }
    setCookie();
  };

  if (hasLocalConsent() || hasCookieConsent()) {
    if (banner) {
      banner.hidden = true;
    }
    loadAnalytics();
    return;
  }

  if (!banner) {
    return;
  }

  banner.hidden = false;
  const acceptButton = banner.querySelector('[data-cookie-accept]');

  if (acceptButton) {
    acceptButton.addEventListener('click', () => {
      setConsent();
      banner.hidden = true;
      loadAnalytics();
    });
  }
})();
