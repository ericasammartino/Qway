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
  const root = document.documentElement;
  const RAIL_TAB_WIDTH = 52;
  const SOCIAL_RAIL_WIDTH = 58;
  const MOTION_BUFFER_MS = 180;

  const panelIndexById = Object.fromEntries(
    sections.map((section, index) => [section.id, index])
  );

  let activeIndex = 0;
  let previousIndex = 0;
  let scrollLocked = false;
  let touchStartX = 0;
  let touchStartY = 0;
  let cleanupTimerId = null;

  const isDesktop = () => window.matchMedia("(min-width: 961px)").matches;

  function cssTimeToMs(value, fallback) {
    const trimmed = value.trim();
    if (!trimmed) return fallback;
    if (trimmed.endsWith("ms")) {
      const duration = Number.parseFloat(trimmed);
      return Number.isFinite(duration) ? duration : fallback;
    }
    if (trimmed.endsWith("s")) {
      const duration = Number.parseFloat(trimmed) * 1000;
      return Number.isFinite(duration) ? duration : fallback;
    }
    return fallback;
  }

  function getMotionDurationMs(propertyName, fallback) {
    return cssTimeToMs(getComputedStyle(root).getPropertyValue(propertyName), fallback);
  }

  function updateRailWidths() {
    const leftWidth = (activeIndex + 1) * RAIL_TAB_WIDTH;
    const rightWidth =
      (sections.length - activeIndex - 1) * RAIL_TAB_WIDTH + SOCIAL_RAIL_WIDTH;

    root.style.setProperty("--left-rail-width", `${leftWidth}px`);
    root.style.setProperty("--right-rail-width", `${rightWidth}px`);
  }

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
    updateRailWidths();
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

  function updatePanelClasses() {
    panels.forEach((panel, index) => {
      if (!panel) return;
      panel.classList.toggle("is-active", index === activeIndex);
      panel.classList.toggle(
        "was-active",
        index === previousIndex && previousIndex !== activeIndex
      );
    });

    if (cleanupTimerId) {
      window.clearTimeout(cleanupTimerId);
    }

    cleanupTimerId = window.setTimeout(() => {
      panels.forEach((panel) => panel && panel.classList.remove("was-active"));
    }, getMotionDurationMs("--content-fade-duration", 880) + MOTION_BUFFER_MS);
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
    previousIndex = activeIndex;

    if (nextIndex > previousIndex) {
      root.setAttribute("data-direction", "next");
    } else if (nextIndex < previousIndex) {
      root.setAttribute("data-direction", "prev");
    }

    activeIndex = nextIndex;
    renderRails();
    updateA11y();
    updatePanelClasses();
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
    }, getMotionDurationMs("--panel-slide-duration", 1250) + MOTION_BUFFER_MS);
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
  updatePanelClasses();
})();
