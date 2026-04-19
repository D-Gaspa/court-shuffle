function normalizeTeamKey(players) {
    return [...players].sort().join("||")
}

function validateKnownPlayers(values, playersSet, label, errors) {
    for (const value of values) {
        if (!playersSet.has(value)) {
            errors.push(`${label}: unknown player "${value}".`)
        }
    }
}

export { normalizeTeamKey, validateKnownPlayers }
