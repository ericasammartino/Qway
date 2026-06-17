const app = document.querySelector(".app");
const panels = Array.from(document.querySelectorAll("[data-section]"));
const controls = Array.from(document.querySelectorAll("[data-section-target]"));
const mobileSectionLabel = document.querySelector("[data-mobile-section-label]");
const sectionIds = panels.map((panel) => panel.dataset.section);

function getSectionLabel(sectionId) {
    const control = controls.find((button) => button.dataset.sectionTarget === sectionId);
    return control ? control.textContent.trim() : "Home";
}

function activateSection(sectionId, options = {}) {
    const targetId = sectionIds.includes(sectionId) ? sectionId : "home";
    const activeIndex = sectionIds.indexOf(targetId);

    app.dataset.activeSection = targetId;

    panels.forEach((panel, index) => {
        const isActive = panel.dataset.section === targetId;

        panel.classList.toggle("is-active", isActive);
        panel.classList.toggle("parked-left", index < activeIndex);
        panel.toggleAttribute("inert", !isActive);
        panel.setAttribute("aria-hidden", String(!isActive));
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
