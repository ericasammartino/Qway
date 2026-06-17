const app = document.querySelector(".app");
const panels = Array.from(document.querySelectorAll("[data-section]"));
const controls = Array.from(document.querySelectorAll("[data-section-target]"));
const mobileSectionLabel = document.querySelector("[data-mobile-section-label]");
const sectionIds = panels.map((panel) => panel.dataset.section);
const sectionLabels = {
    home: "Home",
    release: "Release",
    tour: "Tour",
    watch: "Watch",
    listen: "Listen",
    merch: "Merch",
    contact: "Contact",
};

function getSectionLabel(sectionId) {
    return sectionLabels[sectionId] || "Home";
}

function activateSection(sectionId, options = {}) {
    const targetId = sectionIds.includes(sectionId) ? sectionId : "home";
    const activeIndex = sectionIds.indexOf(targetId);

    app.dataset.activeSection = targetId;

    panels.forEach((panel, index) => {
        const isActive = panel.dataset.section === targetId;
        const panelShell = panel.querySelector(".panel-shell");

        panel.classList.toggle("is-active", isActive);
        panel.classList.toggle("parked-left", index < activeIndex);

        if (panelShell) {
            panelShell.toggleAttribute("inert", !isActive);
            panelShell.setAttribute("aria-hidden", String(!isActive));
        }
    });

    controls.forEach((control) => {
        const isCurrent = control.dataset.sectionTarget === targetId;

        control.classList.toggle("active", isCurrent);
        control.setAttribute("aria-current", isCurrent ? "page" : "false");
    });

    if (mobileSectionLabel) {
        mobileSectionLabel.textContent = getSectionLabel(targetId);
    }

    if (!options.skipHash) {
        const nextHash = targetId === "home" ? window.location.pathname : `#${targetId}`;
        window.history.pushState({ sectionId: targetId }, "", nextHash);
    }

    if (options.scrollIntoView) {
        document.getElementById(targetId)?.scrollIntoView({ block: "start", behavior: "smooth" });
    }
}

controls.forEach((control) => {
    control.addEventListener("click", (event) => {
        event.preventDefault();
        activateSection(control.dataset.sectionTarget, { scrollIntoView: true });
    });
});

window.addEventListener("popstate", () => {
    activateSection(window.location.hash.replace("#", "") || "home", { skipHash: true });
});

activateSection(window.location.hash.replace("#", "") || "home", { skipHash: true });
