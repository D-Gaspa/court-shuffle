import { renderBracket } from "../render.js"

function makeSingleMatchRound(match, scoreEntry, displayCourt, headerLabel) {
    return {
        matches: [{ ...match, court: displayCourt, headerLabel }],
        scores: scoreEntry ? [scoreEntry] : null,
    }
}

function renderSingleMatch({
    match,
    globalIdx,
    localIdx,
    round,
    scoreEntry,
    showCourtSlots,
    queueLabelMode,
    container,
    teamNames,
    openEditors,
    canEdit,
    commitScore,
    saveState,
    handleAfterScoreSave,
    resolveDisplayCourt,
    getMatchHeaderLabel,
}) {
    const displayCourt = resolveDisplayCourt({
        round,
        match,
        globalIdx,
        localIdx,
        showCourtSlots,
    })
    const tempRound = makeSingleMatchRound(
        match,
        scoreEntry,
        displayCourt,
        getMatchHeaderLabel(displayCourt, queueLabelMode),
    )
    const matchDiv = document.createElement("div")
    container.appendChild(matchDiv)

    renderBracket(tempRound, matchDiv, {
        editable: canEdit,
        isEditing: (matchIndex) => matchIndex === 0 && openEditors?.has(globalIdx),
        onEditingChange: (matchIndex, isEditing) => {
            if (matchIndex !== 0 || !openEditors) {
                return
            }
            if (isEditing) {
                openEditors.add(globalIdx)
                return
            }
            openEditors.delete(globalIdx)
        },
        onCommit: (_, sets, options) => {
            if (!canEdit) {
                return
            }
            commitScore({
                round,
                matchIndex: globalIdx,
                sets,
                saveState,
                onAfterSave: handleAfterScoreSave,
                options,
            })
        },
        teamNames,
    })
}

export { renderSingleMatch }
