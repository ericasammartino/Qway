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
    const mobileHomeReturn = document.getElementById("mobileHomeReturn");
    const mobileSectionLabel = document.getElementById("mobileSectionLabel");
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

    function getRailTabSides() {
        const sides = new Map();
        leftRailNav.querySelectorAll(".rail-tab").forEach((tab) => {
            if (tab.dataset.target) sides.set(tab.dataset.target, "left");
        });
        rightRailNav.querySelectorAll(".rail-tab").forEach((tab) => {
            if (tab.dataset.target) sides.set(tab.dataset.target, "right");
        });
        return sides;
    }

    function fadeOutTab(tab) {
        // Detach the tab from its rail and pin it at its current screen
        // position so the rail can collapse around it. The tab then fades to
        // opacity 0 and removes itself from the DOM. Used for the HOME tab
        // when collapsing back to the hero, where the tab won't exist in the
        // next render at all.
        const rect = tab.getBoundingClientRect();
        document.body.appendChild(tab);
        tab.style.position = "fixed";
        tab.style.top = `${rect.top}px`;
        tab.style.left = `${rect.left}px`;
        tab.style.width = `${rect.width}px`;
        tab.style.height = `${rect.height}px`;
        tab.style.margin = "0";
        tab.style.zIndex = "1";
        tab.style.pointerEvents = "none";
        tab.style.transition = "opacity var(--panel-slide-duration) var(--ease-cinematic)";
        tab.setAttribute("tabindex", "-1");
        tab.setAttribute("aria-hidden", "true");
        tab.offsetHeight;
        window.requestAnimationFrame(() => {
            tab.style.opacity = "0";
        });
        window.setTimeout(() => {
            tab.remove();
        }, 520);
    }

    function animateRailTabMoves(previousRects, previousSides) {
        if (!isDesktop() || prefersReducedMotion() || !previousRects) return;

        // The new active page slides exactly one viewport width into view.
        // Any rail tab that's hopping between the left and right rail should
        // ride along on that same translation so it stays glued to the page,
        // while tabs that are merely shifting position inside the same rail
        // use a FLIP delta so they don't visibly jump when the rail resizes.
        const viewportWidth = viewport ? viewport.offsetWidth : 0;
        const allTabs = [
            ...leftRailNav.querySelectorAll(".rail-tab"),
            ...rightRailNav.querySelectorAll(".rail-tab"),
        ];

        // Tabs that exist now but didn't in the previous render (e.g. the
        // HOME tab the first time the user leaves the hero) fade in from
        // opacity 0 instead of popping into place.
        const enteringTabs = allTabs.filter((tab) => {
            const target = tab.dataset.target;
            return target && !previousRects.has(target);
        });
        enteringTabs.forEach((tab) => {
            tab.style.transition = "none";
            tab.style.opacity = "0";
        });

        const movingTabs = allTabs.filter((tab) => {
            const target = tab.dataset.target;
            const previousRect = previousRects.get(target);
            if (!previousRect) return false;

            const previousSide = previousSides ? previousSides.get(target) : null;
            const currentSide = tab.closest("#leftRailNav") ? "left" : "right";

            let deltaX;
            if (previousSide === "right" && currentSide === "left") {
                deltaX = viewportWidth;
            } else if (previousSide === "left" && currentSide === "right") {
                deltaX = -viewportWidth;
            } else {
                const currentRect = tab.getBoundingClientRect();
                deltaX = previousRect.left - currentRect.left;
            }

            if (Math.abs(deltaX) < 1) return false;

            tab.classList.add("rail-tab-moving");
            tab.style.transition = "none";
            tab.style.setProperty("--rail-tab-slide-x", `${deltaX}px`);
            return true;
        });

        if (!movingTabs.length && !enteringTabs.length) return;

        (movingTabs[0] || enteringTabs[0]).offsetHeight;

        window.requestAnimationFrame(() => {
            movingTabs.forEach((tab) => {
                tab.style.transition = "";
                tab.style.setProperty("--rail-tab-slide-x", "0px");
            });
            enteringTabs.forEach((tab) => {
                tab.style.transition = "opacity var(--panel-slide-duration) var(--ease-cinematic)";
                tab.style.opacity = "1";
            });

            window.setTimeout(() => {
                movingTabs.forEach((tab) => {
                    tab.classList.remove("rail-tab-moving");
                    tab.style.removeProperty("--rail-tab-slide-x");
                });
                enteringTabs.forEach((tab) => {
                    tab.style.transition = "";
                    tab.style.opacity = "";
                });
            }, 520);
        });
    }

    function updateRailWidths() {
        // The HOME tab is suppressed while the hero is active, so the left
        // rail collapses to zero width on the home page.
        const leftTabCount = activeIndex === 0 ? 0 : activeIndex + 1;
        const leftWidth = leftTabCount * RAIL_TAB_WIDTH;
        const rightWidth =
            (sections.length - activeIndex - 1) * RAIL_TAB_WIDTH + SOCIAL_RAIL_WIDTH;

        root.style.setProperty("--left-rail-width", `${leftWidth}px`);
        root.style.setProperty("--right-rail-width", `${rightWidth}px`);
    }

    function renderRails() {
        if (!leftRailNav || !rightRailNav) return;
        const desktop = isDesktop();
        const previousRects = desktop ? getRailTabRects() : null;
        const previousSides = desktop ? getRailTabSides() : null;

        // Build the set of section ids that will be present after this
        // render so we can detect tabs that are about to leave the DOM
        // entirely (currently only ever the HOME tab when collapsing back
        // to the hero).
        const newTargets = new Set();
        sections.forEach((section) => {
            if (section.id === "home" && activeIndex === 0) return;
            newTargets.add(section.id);
        });

        if (desktop && !prefersReducedMotion()) {
            [
                ...leftRailNav.querySelectorAll(".rail-tab"),
                ...rightRailNav.querySelectorAll(".rail-tab"),
            ].forEach((tab) => {
                const target = tab.dataset.target;
                if (target && !newTargets.has(target)) {
                    fadeOutTab(tab);
                }
            });
        }

        updateRailWidths();
        leftRailNav.innerHTML = "";
        rightRailNav.innerHTML = "";

        const opened = sections.slice(0, activeIndex + 1);
        const upcoming = sections.slice(activeIndex + 1);

        opened.forEach((section) => {
            const idx = panelIndexById[section.id];
            // While the hero (home) page is active there's nothing to navigate
            // back to, so suppress its rail tab. The HOME tab reappears as
            // soon as the user moves to another section.
            if (section.id === "home" && activeIndex === 0) return;
            leftRailNav.appendChild(createTab(section, idx, idx === activeIndex));
        });

        upcoming.forEach((section) => {
            const idx = panelIndexById[section.id];
            rightRailNav.appendChild(createTab(section, idx, false));
        });

        // Hide the "Opened sections" landmark from assistive tech when it has
        // no tabs (i.e. on the hero) so screen readers don't announce an
        // empty navigation region.
        if (leftRailNav.children.length === 0) {
            leftRailNav.setAttribute("aria-hidden", "true");
        } else {
            leftRailNav.removeAttribute("aria-hidden");
        }

        animateRailTabMoves(previousRects, previousSides);
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
        app.dataset.activeSection = sections[activeIndex].id;
        if (mobileSectionLabel) {
            mobileSectionLabel.textContent = sections[activeIndex].label;
        }
        renderRails();
        updateA11y();
        updatePanelClasses();
        // Undo any spurious scrolling the browser performed when an anchor
        // link tried to bring the target panel into view. Without this the
        // .viewport's scrollLeft can end up at one viewport width, pushing
        // the absolutely-positioned panels into the visible area.
        if (viewport) {
            viewport.scrollLeft = 0;
            viewport.scrollTop = 0;
        }
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
        // Scroll-based auto-activation has been disabled. With non-sticky
        // rails and collapse-on-flip, switching the active section while
        // the user was scrolling produced a layout shift that immediately
        // pushed the next rail under the activation threshold, triggering
        // another flip, which collapsed the new section and re-anchored
        // the scroll, and so on. Sections now switch only when the user
        // taps a rail, taps the HOME bar, or follows a #hash link --
        // mirroring the desktop's click/wheel discrete-step model.
    }

    function handleScroll() {
        if (mobileScrollFrameId) return;

        mobileScrollFrameId = window.requestAnimationFrame(() => {
            mobileScrollFrameId = null;
            handleMobileRailScroll();
        });
    }

    // Intercept clicks on hash-only anchor links (e.g. the home page CTAs
    // <a href="#listen">) so the browser doesn't try to scroll the absolutely-
    // positioned target panel into view, which would shove the viewport
    // sideways and expose every parked panel at once.
    document.addEventListener("click", (event) => {
        const link = event.target.closest('a[href^="#"]');
        if (!link) return;
        const hash = decodeURIComponent(link.getAttribute("href").slice(1)).trim();
        if (!hash || !(hash in panelIndexById)) return;
        event.preventDefault();
        const index = panelIndexById[hash];
        setActive(index);
        scrollPanelIntoView(index);
    });

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

    if (mobileHomeReturn) {
        mobileHomeReturn.addEventListener("click", () => {
            setActive(0);
            scrollPanelIntoView(0);
        });
    }

    bindMobileRails();
    syncFromHash();
    updatePanelClasses();
})();
