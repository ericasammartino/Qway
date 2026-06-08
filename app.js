(() => {
  const sections = [
    { id: "home", label: "HOME" },
    { id: "new-release", label: "NEW RELEASE" },
    { id: "tour", label: "TOUR" },
    { id: "watch", label: "WATCH" },
    { id: "listen", label: "LISTEN" },
    { id: "merch", label: "MERCH" },
    { id: "contact", label: "CONTACT" },
  ];

  const app = document.querySelector(".app");
  if (!app) return;

  const leftRailNav = document.getElementById("leftRailNav");
  const rightRailNav = document.getElementById("rightRailNav");
  const panelTrack = document.getElementById("panelTrack");
  const viewport = document.getElementById("viewport");
  const panels = sections.map((section) => document.getElementById(section.id));

  const panelIndexById = Object.fromEntries(
    sections.map((section, index) => [section.id, index])
  );

  let activeIndex = 0;
  let scrollLocked = false;
  let touchStartX = 0;
  let touchStartY = 0;

  const isDesktop = () => window.matchMedia("(min-width: 961px)").matches;

  function createTab(section, index, isActive) {
    const tab = document.createElement("button");
    tab.type = "button";
    tab.className = `rail-tab${isActive ? " active" : ""}`;
    tab.textContent = section.label;
    tab.setAttribute("aria-label", section.label);
    tab.addEventListener("click", () => setActive(index));
    return tab;
  }

  function renderRails() {
    if (!leftRailNav || !rightRailNav) return;
    leftRailNav.innerHTML = "";
    rightRailNav.innerHTML = "";

    const opened = sections.slice(0, activeIndex + 1);
    const upcoming = sections.slice(activeIndex + 1);

    opened.forEach((section) => {
      const idx = panelIndexById[section.id];
      leftRailNav.appendChild(createTab(section, idx, idx === activeIndex));
    });

    upcoming.forEach((section) => {
      const idx = panelIndexById[section.id];
      rightRailNav.appendChild(createTab(section, idx, false));
    });
  }

  function updateA11y() {
    panels.forEach((panel, index) => {
      if (!panel) return;
      const isActive = index === activeIndex;
      panel.setAttribute("aria-hidden", String(!isActive));
      if (isActive) {
        panel.removeAttribute("inert");
      } else {
        panel.setAttribute("inert", "");
      }
    });
  }

  function updateTrackPosition() {
    if (!panelTrack) return;
    if (!isDesktop()) {
      panelTrack.style.transform = "none";
      return;
    }
    panelTrack.style.transform = `translateX(-${activeIndex * 100}%)`;
  }

  function updateHash() {
    const id = sections[activeIndex].id;
    history.replaceState(null, "", `#${id}`);
  }

  function clampIndex(value) {
    return Math.min(sections.length - 1, Math.max(0, value));
  }

  function setActive(index, options = {}) {
    const nextIndex = clampIndex(index);
    activeIndex = nextIndex;
    renderRails();
    updateA11y();
    updateTrackPosition();
    if (!options.skipHash) {
      updateHash();
    }
  }

  function moveBy(delta) {
    setActive(activeIndex + delta);
  }

  function syncFromHash() {
    const hashId = decodeURIComponent(location.hash.replace("#", "")).trim();
    if (!hashId || !(hashId in panelIndexById)) {
      setActive(0, { skipHash: true });
      return;
    }
    setActive(panelIndexById[hashId], { skipHash: true });
  }

  function handleWheel(event) {
    if (!isDesktop()) return;
    if (scrollLocked) return;

    const delta =
      Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
    if (Math.abs(delta) < 14) return;

    event.preventDefault();
    scrollLocked = true;
    moveBy(delta > 0 ? 1 : -1);

    window.setTimeout(() => {
      scrollLocked = false;
    }, 560);
  }

  function handleKeydown(event) {
    if (!isDesktop()) return;
    if (event.key === "ArrowRight" || event.key === "PageDown") {
      event.preventDefault();
      moveBy(1);
    } else if (event.key === "ArrowLeft" || event.key === "PageUp") {
      event.preventDefault();
      moveBy(-1);
    }
  }

  function handleTouchStart(event) {
    touchStartX = event.touches[0].clientX;
    touchStartY = event.touches[0].clientY;
  }

  function handleTouchEnd(event) {
    if (!isDesktop()) return;
    const deltaX = event.changedTouches[0].clientX - touchStartX;
    const deltaY = event.changedTouches[0].clientY - touchStartY;
    if (Math.abs(deltaX) < 42 || Math.abs(deltaX) < Math.abs(deltaY)) return;
    moveBy(deltaX < 0 ? 1 : -1);
  }

  window.addEventListener("hashchange", syncFromHash);
  window.addEventListener("resize", updateTrackPosition);
  window.addEventListener("keydown", handleKeydown);
  window.addEventListener("touchstart", handleTouchStart, { passive: true });
  window.addEventListener("touchend", handleTouchEnd, { passive: true });
  window.addEventListener("wheel", handleWheel, { passive: false });
  if (viewport) {
    viewport.addEventListener("wheel", handleWheel, { passive: false });
  }

  syncFromHash();
})();
