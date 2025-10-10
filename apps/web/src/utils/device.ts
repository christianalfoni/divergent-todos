export function isMobileDevice(): boolean {
  // Check user agent for mobile devices
  const userAgent = window.navigator.userAgent.toLowerCase();
  const mobileKeywords = ['android', 'webos', 'iphone', 'ipad', 'ipod', 'blackberry', 'windows phone'];

  // Check if any mobile keyword is in user agent
  const hasMobileUserAgent = mobileKeywords.some(keyword => userAgent.includes(keyword));

  // Check screen size (mobile devices typically have narrower screens)
  const hasSmallScreen = window.innerWidth <= 768;

  // Check for touch support (mobile devices support touch)
  const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;

  // Consider it mobile if user agent indicates mobile OR if it's a small touchscreen device
  return hasMobileUserAgent || (hasSmallScreen && hasTouch);
}
