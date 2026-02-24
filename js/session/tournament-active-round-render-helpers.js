const roundOpenEditorsByMatchIndex = new WeakMap()

function getRoundOpenEditors(round) {
    let openEditors = roundOpenEditorsByMatchIndex.get(round)
    if (!openEditors) {
        openEditors = new Set()
        roundOpenEditorsByMatchIndex.set(round, openEditors)
    }
    return openEditors
}

function splitTournamentMatchesByPool(round) {
    const winnersMatches = []
    const losersMatches = []
    const matchIndices = { winners: [], losers: [] }

    for (let i = 0; i < round.matches.length; i += 1) {
        const pool = round.matches[i].bracketPool || "winners"
        if (pool === "losers") {
            losersMatches.push(round.matches[i])
            matchIndices.losers.push(i)
        } else {
            winnersMatches.push(round.matches[i])
            matchIndices.winners.push(i)
        }
    }

    return { winnersMatches, losersMatches, matchIndices }
}

function filterIndexedMatches(matches, indices, includeSet) {
    if (!includeSet) {
        return { matches, indices }
    }
    const nextMatches = []
    const nextIndices = []
    for (let i = 0; i < indices.length; i += 1) {
        if (includeSet.has(indices[i])) {
            nextMatches.push(matches[i])
            nextIndices.push(indices[i])
        }
    }
    return { matches: nextMatches, indices: nextIndices }
}

function appendSectionLabel(container, text, className = "section-label") {
    const label = document.createElement("h3")
    label.className = className
    label.textContent = text
    container.appendChild(label)
}

export { appendSectionLabel, filterIndexedMatches, getRoundOpenEditors, splitTournamentMatchesByPool }
