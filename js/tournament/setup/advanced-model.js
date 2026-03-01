function getDefaultAdvancedSettings() {
    return {
        singlesOpeningMatchups: [],
        doublesLockedPairs: [],
        forcedSitOutPlayer: null,
        singlesByePlayers: [],
        doublesByeTeams: [],
    }
}

function cloneAdvancedSettings(value = getDefaultAdvancedSettings()) {
    return {
        singlesOpeningMatchups: (value.singlesOpeningMatchups || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        doublesLockedPairs: (value.doublesLockedPairs || []).map((pair) => [pair?.[0] || "", pair?.[1] || ""]),
        forcedSitOutPlayer: value.forcedSitOutPlayer || null,
        singlesByePlayers: [...(value.singlesByePlayers || [])],
        doublesByeTeams: (value.doublesByeTeams || []).map((team) =>
            Array.isArray(team) ? [...team].filter((player) => typeof player === "string") : [],
        ),
    }
}

function isBracketFormat(tournamentFormat) {
    return tournamentFormat !== "round-robin"
}

function requiresForcedSitOut({ tournamentTeamSize, allowNotStrictDoubles, selectedPlayers, minRequiredSitOutPool }) {
    return (
        tournamentTeamSize === 2 &&
        !allowNotStrictDoubles &&
        selectedPlayers.length >= minRequiredSitOutPool &&
        selectedPlayers.length % 2 !== 0
    )
}

function normalizeByeTeam(team) {
    if (!Array.isArray(team) || team.length === 0) {
        return ["", ""]
    }
    if (team.length === 1) {
        return [team[0] || "", ""]
    }
    return [team[0] || "", team[1] || ""]
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
        const [a, b] = normalizeByeTeam(rawTeam)
        if (!(keepEmpty || a || b)) {
            continue
        }
        next.push([a, b].filter(Boolean))
    }
    return next
}

function reconcileAdvancedForSelection(tournamentAdvanced, selectedPlayers) {
    const selected = new Set(selectedPlayers)

    tournamentAdvanced.singlesOpeningMatchups = reconcilePairRows(tournamentAdvanced.singlesOpeningMatchups)
        .map(([a, b]) => [selected.has(a) ? a : "", selected.has(b) ? b : ""])
        .filter(([a, b]) => a || b)

    tournamentAdvanced.doublesLockedPairs = reconcilePairRows(tournamentAdvanced.doublesLockedPairs)
        .map(([a, b]) => [selected.has(a) ? a : "", selected.has(b) ? b : ""])
        .filter(([a, b]) => a || b)

    tournamentAdvanced.singlesByePlayers = tournamentAdvanced.singlesByePlayers.filter((player) => selected.has(player))

    tournamentAdvanced.doublesByeTeams = reconcileByeTeams(tournamentAdvanced.doublesByeTeams)
        .map((team) => team.filter((player) => selected.has(player)))
        .filter((team) => team.length > 0)

    if (tournamentAdvanced.forcedSitOutPlayer && !selected.has(tournamentAdvanced.forcedSitOutPlayer)) {
        tournamentAdvanced.forcedSitOutPlayer = null
    }
}

function reconcileAdvancedForMode({
    tournamentAdvanced,
    tournamentTeamSize,
    tournamentFormat,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    if (tournamentTeamSize === 1) {
        tournamentAdvanced.doublesLockedPairs = []
        tournamentAdvanced.doublesByeTeams = []
        tournamentAdvanced.forcedSitOutPlayer = null
        if (!isBracketFormat(tournamentFormat)) {
            tournamentAdvanced.singlesOpeningMatchups = []
            tournamentAdvanced.singlesByePlayers = []
        }
        return
    }

    tournamentAdvanced.singlesOpeningMatchups = []
    tournamentAdvanced.singlesByePlayers = []
    if (!isBracketFormat(tournamentFormat)) {
        tournamentAdvanced.doublesByeTeams = []
    }
    if (
        !requiresForcedSitOut({
            tournamentTeamSize,
            allowNotStrictDoubles,
            selectedPlayers,
            minRequiredSitOutPool,
        })
    ) {
        tournamentAdvanced.forcedSitOutPlayer = null
    }
}

function validateSinglesRows(rows, label) {
    for (const [a, b] of rows) {
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
    for (const team of teams) {
        const normalized = normalizeByeTeam(team).filter(Boolean)
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
    }
    return null
}

function validateAdvancedDraft({
    advancedDraft,
    tournamentFormat,
    tournamentTeamSize,
    allowNotStrictDoubles,
    selectedPlayers,
    minRequiredSitOutPool,
}) {
    if (tournamentFormat === "round-robin" && tournamentTeamSize === 1) {
        const hasMatchups = advancedDraft.singlesOpeningMatchups.some(([a, b]) => Boolean(a || b))
        if (hasMatchups) {
            return "Singles opening matchups are not supported for round-robin."
        }
    }

    const singlesError = validateSinglesRows(advancedDraft.singlesOpeningMatchups, "singles opening matchup")
    if (singlesError) {
        return singlesError
    }

    const doublesError = validateSinglesRows(advancedDraft.doublesLockedPairs, "locked doubles pair")
    if (doublesError) {
        return doublesError
    }

    const byeError = validateDoublesByeTeams(advancedDraft.doublesByeTeams, allowNotStrictDoubles)
    if (byeError) {
        return byeError
    }

    const forcedSitOutRequired = requiresForcedSitOut({
        tournamentTeamSize,
        allowNotStrictDoubles,
        selectedPlayers,
        minRequiredSitOutPool,
    })
    if (!forcedSitOutRequired && advancedDraft.forcedSitOutPlayer) {
        return "Required sit-out can only be set when strict doubles has an odd player count."
    }
    return null
}

function normalizeAdvancedForConfig(source) {
    return {
        singlesOpeningMatchups: reconcilePairRows(source.singlesOpeningMatchups)
            .filter(([a, b]) => a && b)
            .map(([a, b]) => [a, b]),
        doublesLockedPairs: reconcilePairRows(source.doublesLockedPairs)
            .filter(([a, b]) => a && b)
            .map(([a, b]) => [a, b]),
        forcedSitOutPlayer: source.forcedSitOutPlayer || null,
        singlesByePlayers: [...new Set((source.singlesByePlayers || []).filter(Boolean))],
        doublesByeTeams: reconcileByeTeams(source.doublesByeTeams)
            .map((team) => [...new Set(team.filter(Boolean))])
            .filter((team) => team.length > 0),
    }
}

export {
    cloneAdvancedSettings,
    getDefaultAdvancedSettings,
    isBracketFormat,
    normalizeAdvancedForConfig,
    normalizeByeTeam,
    reconcileAdvancedForMode,
    reconcileAdvancedForSelection,
    validateAdvancedDraft,
    requiresForcedSitOut,
}
