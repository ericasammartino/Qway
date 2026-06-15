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
    const viewport = document.getElementById("viewport");
    const panels = sections.map((section) => document.getElementById(section.id));
    const root = document.documentElement;
    const RAIL_TAB_WIDTH = 52;
    const SOCIAL_RAIL_WIDTH = 58;
    const MOBILE_RAIL_ACTIVATION_OFFSET = 64;

    const panelIndexById = Object.fromEntries(
        sections.map((section, index) => [section.id, index])
    );

    let activeIndex = 0;
    let previousIndex = 0;
    let scrollLocked = false;
    let touchStartX = 0;
    let touchStartY = 0;
    let cleanupTimerId = null;
    let mobileScrollFrameId = null;

    const isDesktop = () => window.matchMedia("(min-width: 961px)").matches;
    const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const mobileRailTabs = Array.from(document.querySelectorAll(".mobile-panel-rail"));

    function createTab(section, index, isActive) {
        const tab = document.createElement("button");
        tab.type = "button";
        tab.className = `rail-tab${isActive ? " active" : ""}`;
        tab.dataset.target = section.id;
        tab.textContent = section.label;
        tab.setAttribute("aria-label", section.label);
        tab.addEventListener("click", () => {
            setActive(index);

            if (!isDesktop() && panels[index]) {
                panels[index].scrollIntoView({
                    behavior: prefersReducedMotion() ? "auto" : "smooth",
                    block: "start",
                });
            }
        });
        return tab;
    }

    function scrollPanelIntoView(index) {
        if (!isDesktop() && panels[index]) {
            panels[index].scrollIntoView({
                behavior: prefersReducedMotion() ? "auto" : "smooth",
                block: "start",
            });
        }
    }

    function bindMobileRails() {
        mobileRailTabs.forEach((tab) => {
            const index = panelIndexById[tab.dataset.target];
            if (index === undefined) return;

            tab.addEventListener("click", () => {
                setActive(index);
                scrollPanelIntoView(index);
            });
        });
    }

    function getRailTabRects() {
        const tabs = [
            ...leftRailNav.querySelectorAll(".rail-tab"),
            ...rightRailNav.querySelectorAll(".rail-tab"),
        ];

        return new Map(
            tabs
                .filter((tab) => tab.dataset.target)
                .map((tab) => [tab.dataset.target, tab.getBoundingClientRect()])
        );
    }

    function animateRailTabMoves(previousRects) {
        if (!isDesktop() || prefersReducedMotion() || !previousRects) return;

        const movingTabs = [
            ...leftRailNav.querySelectorAll(".rail-tab"),
            ...rightRailNav.querySelectorAll(".rail-tab"),
        ].filter((tab) => {
            const previousRect = previousRects.get(tab.dataset.target);
            if (!previousRect) return false;

            const currentRect = tab.getBoundingClientRect();
            const deltaX = previousRect.left - currentRect.left;
            if (Math.abs(deltaX) < 1) return false;

            tab.classList.add("rail-tab-moving");
            tab.style.transition = "none";
            tab.style.setProperty("--rail-tab-slide-x", `${deltaX}px`);
            return true;
        });

        if (!movingTabs.length) return;

        movingTabs[0].offsetHeight;

        window.requestAnimationFrame(() => {
            movingTabs.forEach((tab) => {
                tab.style.transition = "";
                tab.style.setProperty("--rail-tab-slide-x", "0px");
            });

            window.setTimeout(() => {
                movingTabs.forEach((tab) => {
                    tab.classList.remove("rail-tab-moving");
                    tab.style.removeProperty("--rail-tab-slide-x");
                });
            }, 520);
        });
    }

    function updateRailWidths() {
        const leftWidth = (activeIndex + 1) * RAIL_TAB_WIDTH;
        const rightWidth =
            (sections.length - activeIndex - 1) * RAIL_TAB_WIDTH + SOCIAL_RAIL_WIDTH;

        root.style.setProperty("--left-rail-width", `${leftWidth}px`);
        root.style.setProperty("--right-rail-width", `${rightWidth}px`);
    }

    function renderRails() {
        if (!leftRailNav || !rightRailNav) return;
        const previousRects = isDesktop() ? getRailTabRects() : null;

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

        animateRailTabMoves(previousRects);
    }

    function updateA11y() {
        const desktop = isDesktop();

        panels.forEach((panel, index) => {
            if (!panel) return;

            if (!desktop) {
                panel.setAttribute("aria-hidden", "false");
                panel.removeAttribute("inert");
                return;
            }

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
        const desktop = isDesktop();
        const moved = previousIndex !== activeIndex;
        const animatingIndices = new Set([activeIndex, previousIndex]);

        if (desktop && moved) {
            // Snap any panel that's not the outgoing or incoming one to its
            // parked position without a visible slide so only the active and
            // previously-active panels animate across the viewport.
            panels.forEach((panel, index) => {
                if (!panel) return;
                if (!animatingIndices.has(index)) {
                    panel.style.transition = "none";
                }
            });
        }

        panels.forEach((panel, index) => {
            if (!panel) return;
            panel.classList.toggle("is-active", index === activeIndex);
            panel.classList.toggle("parked-left", desktop && index < activeIndex);
            panel.classList.toggle(
                "was-active",
                index === previousIndex && previousIndex !== activeIndex
            );
        });

        if (desktop && moved) {
            // Force a synchronous style flush so the snapped panels commit
            // their new position before we restore their transitions.
            if (viewport) {
                viewport.getBoundingClientRect();
            } else {
                document.body.getBoundingClientRect();
            }
            window.requestAnimationFrame(() => {
                panels.forEach((panel) => {
                    if (!panel) return;
                    panel.style.transition = "";
                });
            });
        }

        if (cleanupTimerId) {
            window.clearTimeout(cleanupTimerId);
        }

        cleanupTimerId = window.setTimeout(() => {
            panels.forEach((panel) => panel && panel.classList.remove("was-active"));
        }, 300);
    }

    function handleResize() {
        updateA11y();
        updateMobilePanelStyles();
        handleMobileRailScroll();
    }

    function updateMobilePanelStyles() {
        if (isDesktop()) return;
        // On mobile we let the CSS media query stack the panels; ensure no
        // inline transition overrides linger from a previous desktop session.
        panels.forEach((panel) => {
            if (!panel) return;
            panel.style.transition = "";
        });
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
        }, 500);
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

    function handleMobileRailScroll() {
        if (isDesktop() || !mobileRailTabs.length) return;

        let nextIndex = activeIndex;
        mobileRailTabs.forEach((tab) => {
            const index = panelIndexById[tab.dataset.target];
            if (index === undefined) return;

            if (tab.getBoundingClientRect().top <= MOBILE_RAIL_ACTIVATION_OFFSET) {
                nextIndex = index;
            }
        });

        if (nextIndex !== activeIndex) {
            setActive(nextIndex, { skipHash: true });
        }
    }

    function handleScroll() {
        if (mobileScrollFrameId) return;

        mobileScrollFrameId = window.requestAnimationFrame(() => {
            mobileScrollFrameId = null;
            handleMobileRailScroll();
        });
    }

    window.addEventListener("hashchange", syncFromHash);
    window.addEventListener("resize", handleResize);
    window.addEventListener("keydown", handleKeydown);
    window.addEventListener("touchstart", handleTouchStart, { passive: true });
    window.addEventListener("touchend", handleTouchEnd, { passive: true });
    window.addEventListener("wheel", handleWheel, { passive: false });
    if (viewport) {
        viewport.addEventListener("wheel", handleWheel, { passive: false });
    }
    window.addEventListener("scroll", handleScroll, { passive: true });

    bindMobileRails();
    syncFromHash();
    updatePanelClasses();
})();
