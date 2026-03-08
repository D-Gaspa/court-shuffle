function buildCountLabel(count, singular, plural) {
    if (count <= 0) {
        return "Auto"
    }
    return `${count} ${count === 1 ? singular : plural}`
}

function countConfiguredRows(rows) {
    return rows.filter(([a, b]) => Boolean(a || b)).length
}

function createRequiredSitOutSection(normalized, requiredSitOutVisible) {
    let label = "N/A"
    if (requiredSitOutVisible) {
        label = normalized.forcedSitOutPlayer ? "Locked" : "Auto"
    }
    return {
        visible: requiredSitOutVisible,
        activeCount: requiredSitOutVisible && normalized.forcedSitOutPlayer ? 1 : 0,
        label,
    }
}

function createOptionalSection({ visible, activeCount, singular, plural }) {
    return {
        visible,
        activeCount: visible ? activeCount : 0,
        label: buildCountLabel(activeCount, singular, plural),
    }
}

function buildSectionStats({
    normalized,
    tournamentTeamSize,
    bracketFormat,
    requiredSitOutVisible,
    byeSlotCount,
    nextUpSlotCount,
}) {
    const configuredDoublesPairs = countConfiguredRows(normalized.doublesLockedPairs)
    const singlesOpeningVisible = tournamentTeamSize === 1 && bracketFormat
    const doublesPairsVisible = tournamentTeamSize === 2
    const singlesByesVisible = tournamentTeamSize === 1 && bracketFormat && byeSlotCount > 0
    const doublesByesVisible = tournamentTeamSize === 2 && bracketFormat && byeSlotCount > 0
    const singlesNextUpVisible = tournamentTeamSize === 1 && nextUpSlotCount > 0
    const doublesNextUpVisible = tournamentTeamSize === 2 && nextUpSlotCount > 0

    return {
        requiredSitOut: createRequiredSitOutSection(normalized, requiredSitOutVisible),
        singlesOpening: createOptionalSection({
            visible: singlesOpeningVisible,
            activeCount: normalized.singlesOpeningMatchups.length,
            singular: "matchup",
            plural: "matchups",
        }),
        doublesPairs: createOptionalSection({
            visible: doublesPairsVisible,
            activeCount: configuredDoublesPairs,
            singular: "team lock",
            plural: "team locks",
        }),
        singlesByes: createOptionalSection({
            visible: singlesByesVisible,
            activeCount: normalized.singlesByePlayers.length,
            singular: "player",
            plural: "players",
        }),
        doublesByes: createOptionalSection({
            visible: doublesByesVisible,
            activeCount: normalized.doublesByeTeams.length,
            singular: "team",
            plural: "teams",
        }),
        singlesNextUp: createOptionalSection({
            visible: singlesNextUpVisible,
            activeCount: normalized.singlesNextUpPlayers.length,
            singular: "player",
            plural: "players",
        }),
        doublesNextUp: createOptionalSection({
            visible: doublesNextUpVisible,
            activeCount: normalized.doublesNextUpTeams.length,
            singular: "team",
            plural: "teams",
        }),
    }
}

export { buildSectionStats }
