function renameInTeams(teams, oldName, newName) {
    for (const team of teams) {
        if (Array.isArray(team)) {
            const ti = team.indexOf(oldName)
            if (ti !== -1) {
                team[ti] = newName
            }
            continue
        }
        if (Array.isArray(team.players)) {
            const pi = team.players.indexOf(oldName)
            if (pi !== -1) {
                team.players[pi] = newName
                team.name = team.players.join(" & ")
            }
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

export function renameInTournamentSeries(series, oldName, newName) {
    if (!series?.tournaments) {
        return
    }
    for (const run of series.tournaments) {
        if (Array.isArray(run.players)) {
            renameInPlayerList(run.players, oldName, newName)
        }
        if (Array.isArray(run.tournamentLevelSitOuts)) {
            renameInList(run.tournamentLevelSitOuts, oldName, newName)
        }
        if (Array.isArray(run.teams)) {
            renameInTeams(run.teams, oldName, newName)
        }
        if (Array.isArray(run.rounds)) {
            renameInRounds(run.rounds, oldName, newName)
        }
    }
    if (
        series.constraints?.tournamentSitOutCounts &&
        Object.hasOwn(series.constraints.tournamentSitOutCounts, oldName)
    ) {
        series.constraints.tournamentSitOutCounts[newName] = series.constraints.tournamentSitOutCounts[oldName]
        delete series.constraints.tournamentSitOutCounts[oldName]
    }
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
    if (session.mode === "tournament") {
        const formatLabels = {
            elimination: "Elimination",
            consolation: "Consolation",
            "round-robin": "Round Robin",
        }
        const series = session.tournamentSeries
        const format = formatLabels[series?.format || session.tournamentFormat] || "Tournament"
        const sizeLabel =
            (series?.matchType || (session.tournamentTeamSize === 1 ? "singles" : "doubles")) === "singles"
                ? "Singles"
                : "Doubles"
        return `${format} · ${sizeLabel}`
    }
    return `${session.teamCount} teams`
}
