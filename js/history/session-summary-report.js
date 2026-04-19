import { getAvatarClass, getInitials } from "../roster/render.js"

function createEl(tag, className, text) {
    const el = document.createElement(tag)
    if (className) {
        el.className = className
    }
    if (text !== undefined) {
        el.textContent = text
    }
    return el
}

function formatSignedValue(value) {
    if (!Number.isFinite(value) || value === 0) {
        return "0"
    }
    return `${value > 0 ? "+" : ""}${value}`
}

function formatRank(rank) {
    return rank ? `#${rank}` : "—"
}

function formatRankShift(rankDelta) {
    if (rankDelta === 0) {
        return "="
    }
    const magnitude = Math.abs(rankDelta)
    return `${rankDelta > 0 ? "+" : "-"}${magnitude} ${magnitude === 1 ? "rank" : "ranks"}`
}

function formatRecordAndWinRate(row) {
    return `${row.wins}-${row.losses} (${row.winRate})`
}

function createSummaryText(label, value) {
    const wrap = createEl("div", "session-summary-header-item")
    wrap.appendChild(createEl("span", "session-summary-label", label))
    wrap.appendChild(createEl("strong", "session-summary-value", value))
    return wrap
}

function createMetaPill(text, tone = "") {
    return createEl("span", `session-summary-pill${tone ? ` is-${tone}` : ""}`, text)
}

function createAvatar(name, index) {
    const avatar = createEl("div", `player-avatar session-summary-avatar ${getAvatarClass(index)}`)
    avatar.textContent = getInitials(name).toUpperCase()
    return avatar
}

function resolveRowTone(row) {
    if (row.rankDelta > 0) {
        return "up"
    }
    if (row.rankDelta < 0) {
        return "down"
    }
    if (row.wasActiveInSession) {
        return "flat"
    }
    return ""
}

function resolveDeltaTone(value) {
    if (value > 0) {
        return "up"
    }
    if (value < 0) {
        return "down"
    }
    return "flat"
}

function createMovementText(row) {
    const beforeRank = formatRank(row.beforeRank)
    const afterRank = formatRank(row.afterRank)
    const beforeRating = Number.isFinite(row.beforeRating) ? row.beforeRating : "—"
    const afterRating = Number.isFinite(row.afterRating) ? row.afterRating : "—"
    return {
        rank: `${beforeRank} -> ${afterRank}`,
        rating: `${beforeRating} -> ${afterRating}`,
    }
}

function createHeroHeader(summary) {
    const hero = createEl("section", "session-summary-hero")
    const intro = createEl("div", "session-summary-hero-intro")
    intro.appendChild(createEl("h3", "session-summary-hero-title", summary.title))
    hero.appendChild(intro)

    const stats = createEl("div", "session-summary-hero-stats")
    stats.appendChild(createSummaryText("Mode", summary.leaderboardMode === "singles" ? "Singles" : "Doubles"))
    stats.appendChild(createSummaryText("Tracked Games", String(summary.matchSummary.played)))
    stats.appendChild(createSummaryText("Players", String((summary.players || []).length)))
    stats.appendChild(createSummaryText("Date", new Date(summary.date).toLocaleDateString()))
    hero.appendChild(stats)
    return hero
}

function createSummaryScoreLine(row) {
    const scoreLine = createEl("div", "session-summary-player-topline")
    scoreLine.appendChild(createEl("strong", "session-summary-player-rating", String(row.afterRating ?? "—")))
    if (row.wasActiveInSession) {
        scoreLine.appendChild(createMetaPill(formatSignedValue(row.ratingDelta), resolveDeltaTone(row.ratingDelta)))
    }
    return scoreLine
}

function createSummaryDetails(row) {
    const movement = createMovementText(row)
    const details = createEl("div", "session-summary-player-details")
    details.appendChild(createSummaryText("Rank", movement.rank))
    details.appendChild(createSummaryText("Rating", movement.rating))
    return details
}

function createRankShiftPill(row) {
    if (!(row.rankDelta !== 0 || row.wasActiveInSession)) {
        return null
    }
    return createMetaPill(formatRankShift(row.rankDelta), resolveDeltaTone(row.rankDelta))
}

function createSummaryMeta(row) {
    const meta = createEl("div", "session-summary-player-meta")
    meta.appendChild(createMetaPill(`${row.games} games`))
    const rankShift = createRankShiftPill(row)
    if (rankShift) {
        meta.appendChild(rankShift)
    }
    meta.appendChild(createMetaPill(formatRecordAndWinRate(row)))
    return meta
}

function createSummaryLeaderboardCard(row, index) {
    const tone = resolveRowTone(row)
    const card = createEl("article", `session-summary-player${tone ? ` is-${tone}` : ""}`)
    card.appendChild(createAvatar(row.name, index))
    const isExistingRank = Number.isFinite(row.beforeRank)
    const rankStatus = isExistingRank ? (row.rankDelta === 0 ? "Still" : "Now") : "New"

    const body = createEl("div", "session-summary-player-body")
    body.appendChild(createEl("strong", "session-summary-player-name", row.name))
    body.appendChild(createEl("span", "session-summary-player-rank", `${rankStatus} ${formatRank(row.afterRank)}`))
    body.appendChild(createSummaryScoreLine(row))
    body.appendChild(createSummaryDetails(row))
    body.appendChild(createSummaryMeta(row))

    card.appendChild(body)
    return card
}

function createLeaderboardSection(summary) {
    const section = createEl("section", "session-summary-leaderboard")
    section.appendChild(
        createSummaryText(
            "Leaderboard Story",
            `${summary.leaderboardMode === "singles" ? "Singles" : "Doubles"} ladder`,
        ),
    )
    const grid = createEl("div", "session-summary-grid")
    for (let index = 0; index < (summary.leaderboard || []).length; index += 1) {
        grid.appendChild(createSummaryLeaderboardCard(summary.leaderboard[index], index))
    }
    section.appendChild(grid)
    return section
}

function getMatchTeamTone(match, team) {
    if (team.won) {
        return " is-winner"
    }
    return match.winnerLabel ? " is-loser" : ""
}

function createMatchRecapCard(match) {
    const card = createEl("article", "session-summary-match")
    const header = createEl("div", "session-summary-match-header")
    header.appendChild(createEl("span", "session-summary-match-court", match.courtLabel))
    if (match.pool) {
        header.appendChild(
            createMetaPill(match.pool === "losers" ? "Losers" : "Winners", match.pool === "losers" ? "down" : "up"),
        )
    }
    card.appendChild(header)

    const teams = createEl("div", "session-summary-match-teams")
    for (const team of match.teams || []) {
        const row = createEl("div", `session-summary-match-team${getMatchTeamTone(match, team)}`)
        row.appendChild(createEl("span", "session-summary-match-team-name", team.players.join(" / ")))
        const meta = createEl("div", "session-summary-match-team-meta")
        if (team.ratingImpact?.text) {
            meta.appendChild(createMetaPill(team.ratingImpact.text, resolveDeltaTone(team.ratingImpact.ratingDelta)))
        }
        if (meta.childElementCount > 0) {
            row.appendChild(meta)
        }
        teams.appendChild(row)
    }
    card.appendChild(teams)
    card.appendChild(createEl("div", "session-summary-match-score", match.score))
    return card
}

function createRoundRecap(round) {
    const section = createEl("section", "session-summary-round")
    section.appendChild(createEl("div", "session-summary-round-label", round.label))
    const grid = createEl("div", "session-summary-match-grid")
    for (const match of round.matches || []) {
        grid.appendChild(createMatchRecapCard(match))
    }
    section.appendChild(grid)
    return section
}

function createTournamentRecap(tournament) {
    const section = createEl("section", "session-summary-tournament")
    const header = createEl("div", "session-summary-tournament-header")
    header.appendChild(createEl("strong", "session-summary-tournament-title", tournament.label))
    if (tournament.winner) {
        header.appendChild(createMetaPill(tournament.winner, "up"))
    }
    section.appendChild(header)
    for (const round of tournament.rounds || []) {
        section.appendChild(createRoundRecap(round))
    }
    return section
}

function createTournamentSection(summary) {
    const recap = createEl("section", "session-summary-tournaments")
    for (const phase of summary.tournamentRecap || []) {
        const phaseSection = createEl("div", "session-summary-phase")
        phaseSection.appendChild(createEl("div", "session-summary-phase-label", phase.label))
        for (const tournament of phase.tournaments || []) {
            phaseSection.appendChild(createTournamentRecap(tournament))
        }
        recap.appendChild(phaseSection)
    }
    return recap
}

function buildSessionSummaryReport(summary) {
    const article = createEl("article", "session-summary-card")
    article.appendChild(createHeroHeader(summary))
    if ((summary.notableResults || []).length > 0) {
        const notable = createEl("div", "session-summary-strip")
        for (const item of summary.notableResults || []) {
            notable.appendChild(createSummaryText(item.label, item.value))
        }
        article.appendChild(notable)
    }

    article.appendChild(createLeaderboardSection(summary))
    if ((summary.tournamentRecap || []).some((phase) => (phase.tournaments || []).length > 0)) {
        article.appendChild(createTournamentSection(summary))
    }
    return article
}

export { buildSessionSummaryReport }
