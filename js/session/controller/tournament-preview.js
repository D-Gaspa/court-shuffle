function getCountLabel(value, singular, plural) {
    return `${value} ${value === 1 ? singular : plural}`
}

function formatDoublesTeamLabel(team) {
    const members = Array.isArray(team) ? team.filter(Boolean) : []
    if (members.length === 0) {
        return ""
    }
    if (members.length === 1) {
        return `${members[0]} (solo)`
    }
    return `${members[0]} & ${members[1]}`
}

function pushOverrideLine(lines, label, values) {
    if (values.length > 0) {
        lines.push(`${label}: ${values.join(", ")}`)
    }
}

function collectSinglesOverrideLines(advanced) {
    const lines = []
    pushOverrideLine(
        lines,
        "Singles opening locks",
        (advanced.singlesOpeningMatchups || []).filter(([a, b]) => a && b).map(([a, b]) => `${a} vs ${b}`),
    )
    pushOverrideLine(lines, "Singles bye locks", [...new Set((advanced.singlesByePlayers || []).filter(Boolean))])
    pushOverrideLine(lines, "Singles next up", [...new Set((advanced.singlesNextUpPlayers || []).filter(Boolean))])
    return lines
}

function collectDoublesOverrideLines(advanced) {
    const lines = []
    pushOverrideLine(
        lines,
        "Doubles team locks",
        (advanced.doublesLockedPairs || []).map((team) => formatDoublesTeamLabel(team)).filter(Boolean),
    )
    pushOverrideLine(
        lines,
        "Doubles team restrictions",
        (advanced.doublesRestrictedTeams || []).map((team) => formatDoublesTeamLabel(team)).filter(Boolean),
    )
    pushOverrideLine(
        lines,
        "Doubles bye locks",
        (advanced.doublesByeTeams || []).map((team) => formatDoublesTeamLabel(team)).filter(Boolean),
    )
    pushOverrideLine(
        lines,
        "Doubles next up",
        (advanced.doublesNextUpTeams || []).map((team) => formatDoublesTeamLabel(team)).filter(Boolean),
    )
    if (advanced.forcedSitOutPlayer) {
        lines.push(`Forced sit-out: ${advanced.forcedSitOutPlayer}`)
    }
    return lines
}

function collectRoundOneOverrideLines(config) {
    const advanced = config?.advanced || {}
    return config?.teamSize === 1 ? collectSinglesOverrideLines(advanced) : collectDoublesOverrideLines(advanced)
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
        nonce: crypto.randomUUID(),
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

function renderTournamentDistributionSummary(preview, courtCount, tournamentDistributionHint, config) {
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
        const count = distribution.sitOutPlayers.length
        const noun = count === 1 ? "player" : "players"
        const verb = count === 1 ? "is" : "are"
        lines.push(`${count} ${noun} ${verb} sitting out`)
    }
    if (distribution.byeTeams.length > 0) {
        const count = distribution.byeTeams.length
        const noun = count === 1 ? "team" : "teams"
        const verb = count === 1 ? "has" : "have"
        lines.push(`${count} ${noun} ${verb} a bye`)
    }

    const overrideLines = collectRoundOneOverrideLines(config)
    if (overrideLines.length > 0) {
        lines.push("Round 1 overrides:")
        for (const line of overrideLines) {
            lines.push(`- ${line}`)
        }
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
        renderTournamentDistributionSummary(
            tournamentPreview,
            courtCount,
            tournamentDistributionHint,
            tournamentBuildConfig,
        )
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

export {
    buildTournamentSeed,
    clearTournamentDistribution,
    renderTournamentDistributionSummary,
    showTournamentPreviewError,
    showTournamentPreviewPendingState,
    updateTournamentPreview,
}
