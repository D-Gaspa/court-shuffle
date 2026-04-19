function normalizeByeTeam(team) {
    if (!Array.isArray(team) || team.length === 0) {
        return ["", ""]
    }
    if (team.length === 1) {
        return [team[0] || "", ""]
    }
    return [team[0] || "", team[1] || ""]
}

function normalizeTeamPlayers(team) {
    return [...new Set(normalizeByeTeam(team).filter(Boolean))]
}

function normalizeTeamKey(teamPlayers) {
    return [...teamPlayers].sort().join("||")
}

function toLockedTeamPlayers(row, allowSolo = false) {
    const left = typeof row?.[0] === "string" ? row[0] : ""
    const right = typeof row?.[1] === "string" ? row[1] : ""
    if (left && right) {
        if (left === right) {
            return null
        }
        return [left, right]
    }
    if (!allowSolo) {
        return null
    }
    const solo = left || right
    return solo ? [solo] : null
}

function getConfiguredDoublesTeamsByKey(rows, allowSolo = false) {
    const byKey = new Map()
    for (const row of rows || []) {
        const teamPlayers = toLockedTeamPlayers(row, allowSolo)
        if (!teamPlayers) {
            continue
        }
        const key = normalizeTeamKey(teamPlayers)
        if (!byKey.has(key)) {
            byKey.set(key, teamPlayers)
        }
    }
    return byKey
}

function collectLockedPairKeySet(rows, allowSolo = false) {
    const keys = new Set()
    for (const row of rows || []) {
        const teamPlayers = toLockedTeamPlayers(row, allowSolo)
        if (!teamPlayers) {
            continue
        }
        keys.add(normalizeTeamKey(teamPlayers))
    }
    return keys
}

function filterByeTeamsToLockedPairs(byeTeams, lockedPairKeySet, allowSolo = false) {
    const uniqueKeys = new Set()
    const filtered = []
    for (const team of byeTeams) {
        const uniquePlayers = normalizeTeamPlayers(team)
        const validTeamSize = uniquePlayers.length === 2 || (allowSolo && uniquePlayers.length === 1)
        if (!validTeamSize) {
            continue
        }
        const key = normalizeTeamKey(uniquePlayers)
        if (!(lockedPairKeySet.has(key) && !uniqueKeys.has(key))) {
            continue
        }
        uniqueKeys.add(key)
        filtered.push(uniquePlayers)
    }
    return filtered
}

function reconcilePairRows(rows, keepEmpty = false) {
    const nextRows = []
    for (const row of rows || []) {
        const a = typeof row?.[0] === "string" ? row[0] : ""
        const b = typeof row?.[1] === "string" ? row[1] : ""
        if (keepEmpty || a || b) {
            nextRows.push([a, b])
        }
    }
    return nextRows
}

function reconcileByeTeams(teams, keepEmpty = false) {
    const next = []
    for (const rawTeam of teams || []) {
        const uniquePlayers = normalizeTeamPlayers(rawTeam)
        if (!(keepEmpty || uniquePlayers.length > 0)) {
            continue
        }
        next.push(uniquePlayers)
    }
    return next
}

function formatCountLabel(count, singular, plural) {
    return `${count} ${count === 1 ? singular : plural}`
}

function nextPowerOf2(value) {
    let next = 1
    while (next < value) {
        next *= 2
    }
    return next
}

function getBracketByeSlotCount({ selectedPlayers, tournamentTeamSize, allowNotStrictDoubles, minRequiredSitOutPool }) {
    const playerCount = Array.isArray(selectedPlayers) ? selectedPlayers.length : 0
    let entrants = playerCount

    if (
        tournamentTeamSize === 2 &&
        !allowNotStrictDoubles &&
        playerCount >= minRequiredSitOutPool &&
        playerCount % 2 !== 0
    ) {
        entrants -= 1
    }

    if (entrants < tournamentTeamSize * 2) {
        return 0
    }

    const teamCount = tournamentTeamSize === 1 ? entrants : Math.ceil(entrants / 2)
    if (teamCount <= 1) {
        return 0
    }

    return nextPowerOf2(teamCount) - teamCount
}

function validateSinglesRows(rows, label) {
    for (const [a, b] of rows) {
        if (!(a || b)) {
            continue
        }
        if (!(a && b)) {
            return `Every ${label} row must select two players.`
        }
        if (a === b) {
            if (label === "singles opening matchup") {
                return "Singles opening matchup players must be different."
            }
            return "Doubles locked pairs must use two different players."
        }
    }
    return null
}

function validateDoublesByeTeams(teams, allowNotStrictDoubles) {
    const seenKeys = new Set()
    for (const team of teams) {
        const normalized = normalizeTeamPlayers(team)
        if (normalized.length === 0) {
            return "Every doubles bye team row must include at least one player."
        }
        if (!allowNotStrictDoubles && normalized.length < 2) {
            return "Strict doubles bye teams must include exactly two players."
        }
        if (normalized.length > 2) {
            return "A doubles bye team can include at most two players."
        }
        if (normalized.length === 2 && normalized[0] === normalized[1]) {
            return "Doubles bye team players must be different."
        }
        const key = normalizeTeamKey(normalized)
        if (seenKeys.has(key)) {
            return "Doubles bye teams cannot contain duplicates."
        }
        seenKeys.add(key)
    }
    return null
}

export {
    collectLockedPairKeySet,
    filterByeTeamsToLockedPairs,
    formatCountLabel,
    getConfiguredDoublesTeamsByKey,
    getBracketByeSlotCount,
    normalizeByeTeam,
    normalizeTeamKey,
    normalizeTeamPlayers,
    reconcileByeTeams,
    reconcilePairRows,
    validateDoublesByeTeams,
    validateSinglesRows,
    toLockedTeamPlayers,
}
