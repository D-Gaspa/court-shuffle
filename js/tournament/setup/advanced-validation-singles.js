function getSinglesOpeningReservedError(left, right, byePlayers, nextUpPlayers) {
    if ((left && byePlayers.has(left)) || (right && byePlayers.has(right))) {
        return "Singles opening matchups cannot include players assigned to byes."
    }
    if ((left && nextUpPlayers.has(left)) || (right && nextUpPlayers.has(right))) {
        return "Singles opening matchups cannot include singles next-up players."
    }
    return null
}

function getSinglesOpeningReuseError(left, right, usedPlayers) {
    if ((left && usedPlayers.has(left)) || (right && usedPlayers.has(right))) {
        return "Singles opening matchups cannot reuse a player across rows."
    }
    return null
}

function trackSinglesOpeningPlayers(left, right, usedPlayers) {
    if (left) {
        usedPlayers.add(left)
    }
    if (right) {
        usedPlayers.add(right)
    }
}

function validateSinglesOpeningSelections(advancedDraft, tournamentTeamSize) {
    if (tournamentTeamSize !== 1) {
        return null
    }

    const byePlayers = new Set(advancedDraft.singlesByePlayers || [])
    const nextUpPlayers = new Set(advancedDraft.singlesNextUpPlayers || [])
    const usedPlayers = new Set()

    for (const [left, right] of advancedDraft.singlesOpeningMatchups || []) {
        if (!(left || right)) {
            continue
        }
        const reservedError = getSinglesOpeningReservedError(left, right, byePlayers, nextUpPlayers)
        if (reservedError) {
            return reservedError
        }
        const reuseError = getSinglesOpeningReuseError(left, right, usedPlayers)
        if (reuseError) {
            return reuseError
        }
        trackSinglesOpeningPlayers(left, right, usedPlayers)
    }

    return null
}

export { validateSinglesOpeningSelections }
