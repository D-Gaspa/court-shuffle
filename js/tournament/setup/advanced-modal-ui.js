const SECTION_PRIORITY = [
    "requiredSitOut",
    "singlesOpening",
    "doublesPairs",
    "singlesByes",
    "doublesByes",
    "singlesNextUp",
    "doublesNextUp",
]

function getErrorSectionKey(errorText) {
    const normalized = String(errorText || "").toLowerCase()
    if (!normalized) {
        return null
    }
    if (normalized.includes("sit-out")) {
        return "requiredSitOut"
    }
    if (normalized.includes("singles opening matchup")) {
        return "singlesOpening"
    }
    if (
        normalized.includes("locked doubles pair") ||
        normalized.includes("locked pairs") ||
        normalized.includes("locked doubles team") ||
        normalized.includes("locked doubles teams")
    ) {
        return "doublesPairs"
    }
    if (normalized.includes("bye")) {
        return normalized.includes("singles") ? "singlesByes" : "doublesByes"
    }
    if (normalized.includes("next-up") || normalized.includes("next up") || normalized.includes("queue")) {
        return normalized.includes("singles") ? "singlesNextUp" : "doublesNextUp"
    }
    return null
}

function getVisibleSectionKeys(activeSummary) {
    return SECTION_PRIORITY.filter((key) => activeSummary.sections[key]?.visible)
}

function resolveActiveSectionKey(activeSectionKey, activeSummary, errorSectionKey) {
    const visibleKeys = getVisibleSectionKeys(activeSummary)
    if (visibleKeys.length === 0) {
        return null
    }
    if (errorSectionKey && visibleKeys.includes(errorSectionKey)) {
        return errorSectionKey
    }
    if (activeSectionKey && visibleKeys.includes(activeSectionKey)) {
        return activeSectionKey
    }
    return visibleKeys[0]
}

function syncPanelVisibility(cardElements, activeSummary, activeSectionKey, advancedEmptyState) {
    const visibleKeys = new Set(getVisibleSectionKeys(activeSummary))
    if (advancedEmptyState) {
        advancedEmptyState.hidden = visibleKeys.size > 0
    }
    for (const [key, entry] of Object.entries(cardElements)) {
        if (!entry.section) {
            continue
        }
        entry.section.hidden = !(visibleKeys.has(key) && key === activeSectionKey)
    }
}

function setStatusChipState(statusEl, sectionSummary, hasError) {
    if (!statusEl) {
        return
    }
    const visible = Boolean(sectionSummary?.visible)
    const activeCount = sectionSummary?.activeCount || 0

    statusEl.textContent = visible ? sectionSummary.label : ""
    if (hasError) {
        statusEl.dataset.state = "error"
    } else if (visible) {
        statusEl.dataset.state = activeCount > 0 ? "active" : "auto"
    } else {
        statusEl.dataset.state = "muted"
    }
}

function setNavButtonState(button, sectionSummary, hasError, isSelected) {
    if (!button) {
        return
    }
    const visible = Boolean(sectionSummary?.visible)
    const activeCount = sectionSummary?.activeCount || 0

    button.hidden = !visible
    button.disabled = !visible
    button.classList.toggle("is-disabled", !visible)
    button.classList.toggle("is-active", visible && activeCount > 0)
    button.classList.toggle("is-error", hasError)
    button.classList.toggle("is-selected", visible && isSelected)
    button.setAttribute("aria-pressed", String(visible && isSelected))
}

function setValidationSummaryText(validationSummaryEl, errorText, activeSummary) {
    if (!validationSummaryEl) {
        return
    }
    if (errorText) {
        validationSummaryEl.textContent = "Resolve the highlighted issue before applying overrides."
        validationSummaryEl.dataset.state = "error"
        return
    }
    if (getVisibleSectionKeys(activeSummary).length === 0) {
        validationSummaryEl.textContent = "No advanced overrides are available for the current setup."
        validationSummaryEl.dataset.state = "auto"
        return
    }
    if (activeSummary.totalActive > 0) {
        validationSummaryEl.textContent = `${activeSummary.triggerLabel} configured for Tournament 1.`
        validationSummaryEl.dataset.state = "ready"
        return
    }
    validationSummaryEl.textContent = "No overrides set. Tournament 1 will use automatic pairing rules."
    validationSummaryEl.dataset.state = "auto"
}

function renderMeta({
    advancedModalError,
    advancedValidationSummary,
    tournamentAdvancedState,
    advancedEmptyState,
    cardElements,
    railButtons,
    committedSummary,
    activeSummary,
    activeSectionKey,
}) {
    const errorText = advancedModalError?.hidden ? "" : advancedModalError?.textContent?.trim()
    const errorSectionKey = getErrorSectionKey(errorText)
    const nextActiveSectionKey = resolveActiveSectionKey(activeSectionKey, activeSummary, errorSectionKey)
    const hasVisibleSections = getVisibleSectionKeys(activeSummary).length > 0

    if (tournamentAdvancedState) {
        tournamentAdvancedState.textContent = hasVisibleSections ? committedSummary.triggerLabel : "N/A"
        if (hasVisibleSections) {
            tournamentAdvancedState.dataset.state = committedSummary.totalActive > 0 ? "active" : "auto"
        } else {
            tournamentAdvancedState.dataset.state = "muted"
        }
    }

    syncPanelVisibility(cardElements, activeSummary, nextActiveSectionKey, advancedEmptyState)

    for (const [key, entry] of Object.entries(cardElements)) {
        const sectionSummary = activeSummary.sections[key]
        const navButton = railButtons.find((button) => button.dataset.advancedNavTarget === entry.section?.id)
        const hasError = errorSectionKey === key
        setStatusChipState(entry.status, sectionSummary, hasError)
        setNavButtonState(navButton, sectionSummary, hasError, nextActiveSectionKey === key)
    }

    setValidationSummaryText(advancedValidationSummary, errorText, activeSummary)
    return nextActiveSectionKey
}

function getSectionKeyById(cardElements, sectionId) {
    for (const [key, entry] of Object.entries(cardElements)) {
        if (entry.section?.id === sectionId) {
            return key
        }
    }
    return null
}

function createAdvancedModalUiController({
    rootElement,
    advancedModalError,
    advancedValidationSummary,
    tournamentAdvancedState,
    advancedEmptyState,
    cardElements,
    getCommittedSummary,
    getActiveSummary,
}) {
    const railButtons = rootElement ? [...rootElement.querySelectorAll("[data-advanced-nav-target]")] : []
    let activeSectionKey = null

    const syncUi = () => {
        activeSectionKey = renderMeta({
            advancedModalError,
            advancedValidationSummary,
            tournamentAdvancedState,
            advancedEmptyState,
            cardElements,
            railButtons,
            committedSummary: getCommittedSummary(),
            activeSummary: getActiveSummary(),
            activeSectionKey,
        })
    }

    return {
        bindInteractions: () => {
            for (const button of railButtons) {
                button.addEventListener("click", () => {
                    const sectionId = button.dataset.advancedNavTarget
                    const key = sectionId ? getSectionKeyById(cardElements, sectionId) : null
                    if (!key) {
                        return
                    }
                    const activeSummary = getActiveSummary()
                    if (!activeSummary.sections[key]?.visible) {
                        return
                    }
                    activeSectionKey = key
                    syncUi()
                })
            }
        },
        renderMeta: syncUi,
        resetActiveSection: () => {
            activeSectionKey = null
        },
    }
}

export { createAdvancedModalUiController }
