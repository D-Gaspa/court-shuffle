function renameInTeams(teams, oldName, newName) {
    for (const team of teams) {
        const ti = team.indexOf(oldName)
        if (ti !== -1) {
            team[ti] = newName
        }
    }
}

function renameInList(list, oldName, newName) {
    const idx = list.indexOf(oldName)
    if (idx !== -1) {
        list[idx] = newName
    }
}

function renameInStructuredRound(round, oldName, newName) {
    for (const match of round.matches) {
        renameInTeams(match.teams, oldName, newName)
    }
    if (round.sitOuts) {
        renameInList(round.sitOuts, oldName, newName)
    }
}

export function renameInRounds(rounds, oldName, newName) {
    for (const round of rounds) {
        if (round.matches) {
            renameInStructuredRound(round, oldName, newName)
        } else {
            renameInTeams(round, oldName, newName)
        }
    }
}

export function renameInPlayerList(players, oldName, newName) {
    renameInList(players, oldName, newName)
}

export function showFieldError(el, msg) {
    el.textContent = msg
    el.hidden = false
}

export function hideFieldError(el) {
    el.textContent = ""
    el.hidden = true
}

/**
 * Get display label for a session mode.
 */
export function getModeLabel(session) {
    if (session.mode === "singles") {
        return "1v1"
    }
    if (session.mode === "doubles") {
        return "2v2"
    }
    return `${session.teamCount} teams`
}
