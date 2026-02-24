let nextSetRowFieldScopeId = 1

function applyManualEntryAttrs(input, { id, name, ariaLabel }) {
    input.id = id
    input.name = name
    input.setAttribute("aria-label", ariaLabel)
    input.autocomplete = "off"
    input.autocapitalize = "off"
    input.setAttribute("autocorrect", "off")
    input.spellcheck = false
}

function createScopedNumberInput(value, className, fieldKind, { fieldScopeId, setIndex, teamIndex }) {
    const input = document.createElement("input")
    input.type = "number"
    input.min = "0"
    input.className = className
    input.placeholder = "-"
    applyManualEntryAttrs(input, {
        id: `score-field-${fieldScopeId}-set-${setIndex + 1}-team-${teamIndex + 1}-${fieldKind}`,
        name: `score_field_${fieldScopeId}_set_${setIndex + 1}_team_${teamIndex + 1}_${fieldKind}`,
        ariaLabel: `Set ${setIndex + 1} team ${teamIndex + 1} ${fieldKind}`,
    })
    if (value !== null && value !== undefined) {
        input.value = String(value)
    }
    input.addEventListener("focus", () => {
        input.select()
    })
    return input
}

function createScoreInput(value, opts) {
    return createScopedNumberInput(value, "set-input", "games", opts)
}

function createTiebreakInput(value, opts) {
    return createScopedNumberInput(value, "set-input tb-input", "tiebreak", opts)
}

function createNextSetRowFieldScopeId() {
    const id = nextSetRowFieldScopeId
    nextSetRowFieldScopeId += 1
    return id
}

export { createNextSetRowFieldScopeId, createScoreInput, createTiebreakInput }
