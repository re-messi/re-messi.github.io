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
    .filter(({ target }) => target);
  let activeLink;
  let scrollQueued = false;

  const updateSection = () => {
    scrollQueued = false;
    let current = sections[0];
    for (const section of sections) {
      if (section.target.getBoundingClientRect().top > 120) break;
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

  window.addEventListener('scroll', () => {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateSection);
  }, { passive: true });
  window.addEventListener('resize', () => {
    activeLink = undefined;
    updateSection();
  });
  window.addEventListener('load', updateSection);
  updateSection();
}
