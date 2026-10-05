// Anchors remain readable without JavaScript; enhanced navigation swaps chapters.
const chapters = [...document.querySelectorAll('.chapter')];
const chapterLinks = [...document.querySelectorAll('.contents a')];
const chapterIds = new Set(chapters.map(chapter => chapter.id));
function showChapter(moveFocus = false) {
  const id = chapterIds.has(location.hash.slice(1)) ? location.hash.slice(1) : 'overview';
  for (const chapter of chapters) chapter.hidden = chapter.id !== id;
  for (const link of chapterLinks) {
    if (link.hash === `#${id}`) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  }
  document.body.classList.add('book-ready');
  document.title = `Melville Clothing — ${{ overview: 'Overview', idea: 'Idea & goal', references: 'References' }[id]} — Rebecca Messier`;
  if (moveFocus) {
    document.querySelector(`#${id} h1, #${id} h2`).focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }
}
showChapter();
window.addEventListener('hashchange', () => showChapter(true));
const viewer = document.querySelector('.image-viewer');
const viewerImage = viewer.querySelector('img');
for (const button of document.querySelectorAll('[data-full]')) {
  button.addEventListener('click', () => {
    viewerImage.src = button.dataset.full;
    viewerImage.alt = button.querySelector('img').alt;
    viewer.showModal();
  });
}
viewer.querySelector('.viewer-close').addEventListener('click', () => viewer.close());
viewer.addEventListener('click', event => { if (event.target === viewer) viewer.close(); });
