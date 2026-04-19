import { getAvatarClass, getInitials } from "../roster/render.js"
import { exportSummaryCardAsPng } from "./session-summary-export.js"

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

function createSummaryBadge(label, value) {
    const badge = createEl("div", "session-summary-badge")
    badge.appendChild(createSummaryText(label, value))
    return badge
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

    const body = createEl("div", "session-summary-player-body")
    body.appendChild(createEl("strong", "session-summary-player-name", row.name))
    body.appendChild(createEl("span", "session-summary-player-rank", `Now ${formatRank(row.afterRank)}`))
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

function buildSessionSummaryReport(summary) {
    const article = createEl("article", "session-summary-card")

    const header = createEl("div", "session-summary-header")
    header.appendChild(createSummaryText("Session", summary.title))
    header.appendChild(createSummaryText("Mode", summary.leaderboardMode === "singles" ? "Singles" : "Doubles"))
    header.appendChild(createSummaryText("Tracked Games", String(summary.matchSummary.played)))
    header.appendChild(createSummaryText("Players", String((summary.players || []).length)))
    article.appendChild(header)

    const notable = createEl("div", "session-summary-strip")
    for (const item of summary.notableResults || []) {
        notable.appendChild(createSummaryBadge(item.label, item.value))
    }
    for (const winner of summary.miniTournamentWinners || []) {
        notable.appendChild(createSummaryBadge(winner.label, winner.winner))
    }
    if (notable.childElementCount > 0) {
        article.appendChild(notable)
    }

    article.appendChild(createLeaderboardSection(summary))
    return article
}

function reportExportFailure(appStatus) {
    appStatus.set({
        ok: false,
        code: "summary_export_failed",
        message: "Session summary PNG export failed in this browser.",
        error: null,
        source: "save",
    })
}

function createSessionSummaryDialogController({ appStatus, elements }) {
    const { closeButton, dialog, exportButton, report, subtitle, title } = elements
    let currentSummary = null

    function renderSummary(summary) {
        currentSummary = summary
        title.textContent = "Session Summary"
        subtitle.textContent = `${new Date(summary.date).toLocaleDateString()} · ${summary.matchSummary.played} games · ${summary.leaderboardMode === "singles" ? "Singles" : "Doubles"}`
        report.replaceChildren(buildSessionSummaryReport(summary))
    }

    function show(summaryEntry) {
        if (!summaryEntry) {
            return
        }
        renderSummary(summaryEntry.sessionSummary || summaryEntry)
        dialog.showModal()
    }

    function setup() {
        closeButton.addEventListener("click", () => dialog.close())
        exportButton.addEventListener("click", () => {
            if (!currentSummary) {
                return
            }
            exportSummaryCardAsPng(currentSummary).catch(() => reportExportFailure(appStatus))
        })
    }

    return {
        setup,
        show,
    }
}

export { createSessionSummaryDialogController }
