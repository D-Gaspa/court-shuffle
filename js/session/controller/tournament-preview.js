function getCountLabel(value, singular, plural) {
    return `${value} ${value === 1 ? singular : plural}`
}

function buildTournamentSeed(players, config, courtCount) {
    const sortedPlayers = [...players].sort((a, b) => a.localeCompare(b))
    const payload = {
        players: sortedPlayers,
        format: config.format,
        teamSize: config.teamSize,
        courtCount,
        allowNotStrictDoubles: config.allowNotStrictDoubles,
        advanced: config.advanced,
    }
    return `setup:${JSON.stringify(payload)}`
}

function clearTournamentDistribution({
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentAdvancedError,
}) {
    tournamentDistributionGroup.hidden = true
    tournamentDistributionHint.textContent = ""
    tournamentAdvancedError.hidden = true
    tournamentAdvancedError.textContent = ""
}

function renderTournamentDistributionSummary(preview, courtCount, tournamentDistributionHint) {
    if (!preview?.ok) {
        tournamentDistributionHint.textContent = ""
        return
    }

    const { distribution } = preview
    const summaryParts = [
        getCountLabel(courtCount, "court", "courts"),
        `${getCountLabel(distribution.onCourtMatches, "match", "matches")} on court`,
    ]
    if (distribution.nextUpMatches > 0) {
        summaryParts.push(`${getCountLabel(distribution.nextUpMatches, "match", "matches")} next up`)
    }

    const lines = [summaryParts.join(" · ")]
    if (distribution.sitOutPlayers.length > 0) {
        const verb = distribution.sitOutPlayers.length === 1 ? "is" : "are"
        lines.push(`${distribution.sitOutPlayers.join(", ")} ${verb} sitting out`)
    }
    if (distribution.byeTeams.length > 0) {
        const verb = distribution.byeTeams.length === 1 ? "has" : "have"
        lines.push(`${distribution.byeTeams.join(", ")} ${verb} a bye`)
    }
    tournamentDistributionHint.textContent = lines.join("\n")
}

function showTournamentPreviewPendingState({
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentAdvancedError,
}) {
    tournamentDistributionGroup.hidden = false
    tournamentDistributionHint.textContent = ""
    tournamentAdvancedError.hidden = true
    tournamentAdvancedError.textContent = ""
}

function showTournamentPreviewError(error, tournamentDistributionHint, tournamentAdvancedError) {
    tournamentDistributionHint.textContent = ""
    tournamentAdvancedError.hidden = false
    tournamentAdvancedError.textContent = error || "Unable to build the Tournament 1 preview."
}

function updateTournamentPreview({
    selectedPlayers,
    count,
    minPlayers,
    getCourtCount,
    getNotStrictDoubles,
    getTournamentConfig,
    buildTournamentPreview,
    tournamentDistributionGroup,
    tournamentDistributionHint,
    tournamentAdvancedError,
}) {
    const players = [...selectedPlayers]
    const courtCount = getCourtCount()
    const config = getTournamentConfig(players, getNotStrictDoubles())
    const seed = buildTournamentSeed(players, config, courtCount)
    const tournamentBuildConfig = { ...config, seed }

    if (count < minPlayers) {
        showTournamentPreviewPendingState({
            tournamentDistributionGroup,
            tournamentDistributionHint,
            tournamentAdvancedError,
        })
        return {
            canStartTournament: false,
            tournamentPreview: null,
            tournamentBuildConfig,
        }
    }

    const tournamentPreview = buildTournamentPreview({
        players,
        format: tournamentBuildConfig.format,
        teamSize: tournamentBuildConfig.teamSize,
        courtCount,
        courtHandling: tournamentBuildConfig.courtHandling,
        allowNotStrictDoubles: tournamentBuildConfig.allowNotStrictDoubles,
        seed,
        advanced: tournamentBuildConfig.advanced,
    })

    tournamentDistributionGroup.hidden = false
    if (tournamentPreview.ok) {
        renderTournamentDistributionSummary(tournamentPreview, courtCount, tournamentDistributionHint)
        tournamentAdvancedError.hidden = true
        tournamentAdvancedError.textContent = ""
        return {
            canStartTournament: true,
            tournamentPreview,
            tournamentBuildConfig,
        }
    }

    showTournamentPreviewError(tournamentPreview.errors[0], tournamentDistributionHint, tournamentAdvancedError)
    return {
        canStartTournament: false,
        tournamentPreview,
        tournamentBuildConfig,
    }
}

export { clearTournamentDistribution, updateTournamentPreview }
