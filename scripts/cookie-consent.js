(() => {
  const banner = document.querySelector('[data-cookie-banner]');
  if (!banner) {
    return;
  }

  const acceptButton = banner.querySelector('[data-cookie-accept]');
  const storageKey = 'cookie_consent';
  const cookieName = 'cookie_consent';
  const acceptedValue = 'accepted';

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
    banner.hidden = true;
    return;
  }

  banner.hidden = false;

  if (acceptButton) {
    acceptButton.addEventListener('click', () => {
      setConsent();
      banner.hidden = true;
    });
  }
})();
