function getDefaultCardExpansion(teamSize = 1) {
    return {
        requiredSitOut: true,
        singlesOpening: teamSize === 1,
        doublesPairs: teamSize === 2,
        singlesByes: false,
        doublesByes: false,
    }
}

function getAdvancedCardKeyBySectionId(cardElements, sectionId) {
    for (const [key, entry] of Object.entries(cardElements)) {
        if (entry.section?.id === sectionId) {
            return key
        }
    }
    return null
}

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
        return "doublesByes"
    }
    return null
}

function syncCardLayout(cardElements, cardExpansion) {
    for (const [key, entry] of Object.entries(cardElements)) {
        if (!(entry.section && entry.toggle && entry.body)) {
            continue
        }
        const visible = !entry.section.hidden
        if (!visible) {
            cardExpansion[key] = false
        }
        const expanded = visible && Boolean(cardExpansion[key])
        entry.section.classList.toggle("advanced-card-collapsed", visible && !expanded)
        entry.toggle.disabled = !visible
        entry.toggle.tabIndex = visible ? 0 : -1
        entry.toggle.setAttribute("aria-expanded", String(expanded))
        entry.body.hidden = !expanded
    }
}

function setStatusChipState(statusEl, sectionSummary, hasError) {
    if (!statusEl) {
        return
    }
    const visible = Boolean(sectionSummary?.visible)
    const activeCount = sectionSummary?.activeCount || 0

    statusEl.textContent = visible ? sectionSummary.label : "N/A"
    if (hasError) {
        statusEl.dataset.state = "error"
    } else if (visible) {
        statusEl.dataset.state = activeCount > 0 ? "active" : "auto"
    } else {
        statusEl.dataset.state = "muted"
    }
}

function setNavButtonState(button, sectionSummary, hasError) {
    if (!button) {
        return
    }
    const visible = Boolean(sectionSummary?.visible)
    const activeCount = sectionSummary?.activeCount || 0

    button.disabled = !visible
    button.classList.toggle("is-disabled", !visible)
    button.classList.toggle("is-active", visible && activeCount > 0)
    button.classList.toggle("is-error", hasError)
}

function setValidationSummaryText(validationSummaryEl, errorText, activeSummary) {
    if (!validationSummaryEl) {
        return
    }
    if (errorText) {
        validationSummaryEl.textContent = "Resolve the highlighted issue before applying overrides."
        validationSummaryEl.dataset.state = "error"
    } else if (activeSummary.totalActive > 0) {
        validationSummaryEl.textContent = `${activeSummary.triggerLabel} configured for Tournament 1.`
        validationSummaryEl.dataset.state = "ready"
    } else {
        validationSummaryEl.textContent = "No overrides set. Tournament 1 will use automatic pairing rules."
        validationSummaryEl.dataset.state = "auto"
    }
}

function renderMeta({
    advancedModalError,
    advancedValidationSummary,
    tournamentAdvancedState,
    cardElements,
    railButtons,
    committedSummary,
    activeSummary,
}) {
    const errorText = advancedModalError?.hidden ? "" : advancedModalError?.textContent?.trim()
    const errorSectionKey = getErrorSectionKey(errorText)

    if (tournamentAdvancedState) {
        tournamentAdvancedState.textContent = committedSummary.triggerLabel
        tournamentAdvancedState.dataset.state = committedSummary.totalActive > 0 ? "active" : "auto"
    }

    for (const [key, entry] of Object.entries(cardElements)) {
        const sectionSummary = activeSummary.sections[key]
        const navButton = railButtons.find((button) => button.dataset.advancedNavTarget === entry.section?.id)
        const hasError = errorSectionKey === key
        setStatusChipState(entry.status, sectionSummary, hasError)
        setNavButtonState(navButton, sectionSummary, hasError)
    }

    setValidationSummaryText(advancedValidationSummary, errorText, activeSummary)
}

function jumpToSection(sectionId, cardElements, cardExpansion) {
    const key = getAdvancedCardKeyBySectionId(cardElements, sectionId)
    const entry = key ? cardElements[key] : null
    if (!(entry?.section && !entry.section.hidden)) {
        return
    }
    if (!cardExpansion[key]) {
        cardExpansion[key] = true
        syncCardLayout(cardElements, cardExpansion)
    }
    entry.section.scrollIntoView({ block: "nearest" })
    entry.toggle?.focus({ preventScroll: true })
}

function bindInteractions(cardElements, cardExpansion, railButtons) {
    for (const entry of Object.values(cardElements)) {
        entry.toggle?.addEventListener("click", () => {
            const key = entry.toggle?.dataset.advancedToggle
            if (!(key && cardElements[key]?.section && !cardElements[key].section.hidden)) {
                return
            }
            cardExpansion[key] = !cardExpansion[key]
            syncCardLayout(cardElements, cardExpansion)
        })
    }

    for (const button of railButtons) {
        button.addEventListener("click", () => {
            const sectionId = button.dataset.advancedNavTarget
            if (!sectionId) {
                return
            }
            jumpToSection(sectionId, cardElements, cardExpansion)
        })
    }
}

function createAdvancedModalUiController({
    advancedDialog,
    advancedModalError,
    advancedValidationSummary,
    tournamentAdvancedState,
    cardElements,
    getCommittedSummary,
    getActiveSummary,
}) {
    const railButtons = advancedDialog ? [...advancedDialog.querySelectorAll("[data-advanced-nav-target]")] : []
    let cardExpansion = getDefaultCardExpansion(1)

    return {
        bindInteractions: () => bindInteractions(cardElements, cardExpansion, railButtons),
        renderMeta: () =>
            renderMeta({
                advancedModalError,
                advancedValidationSummary,
                tournamentAdvancedState,
                cardElements,
                railButtons,
                committedSummary: getCommittedSummary(),
                activeSummary: getActiveSummary(),
            }),
        resetCardExpansion: (teamSize) => {
            cardExpansion = getDefaultCardExpansion(teamSize)
        },
        syncCardLayout: () => syncCardLayout(cardElements, cardExpansion),
    }
}

export { createAdvancedModalUiController }
