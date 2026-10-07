const lightbox = document.querySelector('.lightbox');
const lightboxImage = lightbox?.querySelector('img');
const closeButton = lightbox?.querySelector('.lightbox-close');

document.querySelectorAll('.gallery-item').forEach((button) => {
  button.addEventListener('click', () => {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = button.dataset.full;
    lightboxImage.alt = button.querySelector('img')?.alt || 'Project screenshot';
    lightbox.showModal();
  });
});

closeButton?.addEventListener('click', () => lightbox.close());
lightbox?.addEventListener('click', (event) => {
  if (event.target === lightbox) lightbox.close();
});

const sectionNav = document.querySelector('.section-nav');
if (sectionNav) {
  const sections = [...sectionNav.querySelectorAll('a[href^="#"]')]
    .map((link) => ({ link, target: document.querySelector(link.getAttribute('href')) }))
    .filter(({ target }) => target)
    .map((section) => ({
      ...section,
      region: section.target.closest('.story-row, .section') || section.target,
    }));
  let activeLink;
  let scrollQueued = false;

  const navInset = () => getComputedStyle(sectionNav).position === 'sticky'
    ? sectionNav.offsetHeight : 0;

  const navigateToSection = (section) => {
    const bounds = [section.region, ...section.region.querySelectorAll('.gallery-item')]
      .map((element) => element.getBoundingClientRect());
    const top = Math.min(...bounds.map((rect) => rect.top));
    const bottom = Math.max(...bounds.map((rect) => rect.bottom));
    const height = bottom - top;
    const inset = navInset();
    const availableHeight = window.innerHeight - inset;
    // Include the tilted photos when centering. Tall sections start below the nav.
    const offset = height <= availableHeight - 48
      ? inset + (availableHeight - height) / 2 : inset + 24;
    window.scrollTo({ top: window.scrollY + top - offset, behavior: 'instant' });
  };

  const updateSection = () => {
    scrollQueued = false;
    const inset = navInset();
    const readingLine = inset + (window.innerHeight - inset) / 2;
    let current = sections[0];
    for (const section of sections) {
      if (section.region.getBoundingClientRect().top > readingLine) break;
      current = section;
    }
    if (!current || current.link === activeLink) return;
    sections.forEach(({ link }) => link.removeAttribute('aria-current'));
    activeLink = current.link;
    activeLink.setAttribute('aria-current', 'location');

    if (sectionNav.scrollWidth > sectionNav.clientWidth) {
      const linkLeft = activeLink.offsetLeft;
      const linkRight = linkLeft + activeLink.offsetWidth;
      if (linkLeft < sectionNav.scrollLeft) sectionNav.scrollLeft = linkLeft - 24;
      else if (linkRight > sectionNav.scrollLeft + sectionNav.clientWidth) {
        sectionNav.scrollLeft = linkRight - sectionNav.clientWidth + 24;
      }
    }
  };

  sections.forEach((section) => {
    section.link.addEventListener('click', (event) => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      const hash = section.link.getAttribute('href');
      if (window.location.hash !== hash) window.history.pushState(null, '', hash);
      navigateToSection(section);
      updateSection();
    });
  });

  const navigateToHash = () => {
    const section = sections.find(({ link }) => link.getAttribute('href') === window.location.hash);
    if (section) navigateToSection(section);
    updateSection();
  };

  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateSection);
  }, { passive: true });
  window.addEventListener('resize', () => {
    activeLink = undefined;
    updateSection();
  });
  window.addEventListener('hashchange', navigateToHash);
  window.addEventListener('load', navigateToHash);
  updateSection();
}
