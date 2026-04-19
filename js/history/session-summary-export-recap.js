import { drawRoundedRect } from "./session-summary-export-draw.js"

const OUTER_PADDING = 40
const INNER_PADDING = 24
const GAP = 20
const EXPORT_WIDTH = 1560
const RECAP_TITLE_HEIGHT = 54
const RECAP_COLUMNS = 2
const CARD_STORY_LABEL_OFFSET_Y = 12
const CARD_STORY_VALUE_OFFSET_Y = 40
const RECAP_CARD_HEIGHT = 236
const RECAP_CARD_TEXT_OFFSET_X = 20
const RECAP_PHASE_OFFSET_Y = 28
const RECAP_TITLE_OFFSET_Y = 54
const RECAP_ROUND_OFFSET_Y = 88
const RECAP_ROUND_STEP = 66
const RECAP_MATCH_STEP = 22
const RECAP_ROUND_MAX_MATCHES = 2
const RECAP_MATCH_TEXT_OFFSET_X = 12
const RECAP_SCORE_OFFSET_X = 20
const RECAP_DIVIDER_OFFSET_Y = 10

function flattenRecap(summary) {
    return (summary.tournamentRecap || []).flatMap((phase) =>
        (phase.tournaments || []).map((tournament) => ({
            phaseLabel: phase.label,
            tournament,
        })),
    )
}

function drawExportRecapHeading(context, startY) {
    context.font = "700 18px Outfit, system-ui, sans-serif"
    context.fillStyle = "#d7ccb9"
    context.fillText("TOURNAMENT TRAIL", OUTER_PADDING + INNER_PADDING, startY + CARD_STORY_LABEL_OFFSET_Y)
    context.font = "700 28px Outfit, system-ui, sans-serif"
    context.fillStyle = "#fff6ec"
    context.fillText("Full results", OUTER_PADDING + INNER_PADDING, startY + CARD_STORY_VALUE_OFFSET_Y)
}

function drawRecapMatch({ cardWidth, context, match, x, y }) {
    const firstTeam = match.teams?.[0]
    const secondTeam = match.teams?.[1]
    const firstName = firstTeam?.players?.join(" / ") || "Team 1"
    const secondName = secondTeam?.players?.join(" / ") || "Team 2"
    context.font = "600 13px Outfit, system-ui, sans-serif"
    context.fillStyle = firstTeam?.won ? "#9fe3b1" : "#fff6ec"
    context.fillText(
        firstTeam?.ratingImpact?.text ? `${firstName} (${firstTeam.ratingImpact.text})` : firstName,
        x + RECAP_CARD_TEXT_OFFSET_X + RECAP_MATCH_TEXT_OFFSET_X,
        y,
    )
    context.fillStyle = "#f0d08d"
    context.fillText(match.score || "—", x + cardWidth / 2 - RECAP_SCORE_OFFSET_X, y)
    context.fillStyle = secondTeam?.won ? "#9fe3b1" : "#d7ccb9"
    context.fillText(
        secondTeam?.ratingImpact?.text ? `${secondName} (${secondTeam.ratingImpact.text})` : secondName,
        x + RECAP_CARD_TEXT_OFFSET_X + RECAP_MATCH_TEXT_OFFSET_X,
        y + RECAP_MATCH_STEP,
    )
    context.fillStyle = "#ffffff14"
    context.fillRect(
        x + RECAP_CARD_TEXT_OFFSET_X,
        y + RECAP_MATCH_STEP + RECAP_DIVIDER_OFFSET_Y,
        cardWidth - RECAP_CARD_TEXT_OFFSET_X * 2,
        1,
    )
}

function drawExportRecapCard({ context, item, x, y, cardWidth }) {
    drawRoundedRect({
        context,
        rect: { x, y, width: cardWidth, height: RECAP_CARD_HEIGHT },
        radius: 18,
        fillStyle: "#ffffff0a",
        strokeStyle: "#ffffff14",
    })
    context.font = "700 16px Outfit, system-ui, sans-serif"
    context.fillStyle = "#f0d08d"
    context.fillText(item.phaseLabel, x + RECAP_CARD_TEXT_OFFSET_X, y + RECAP_PHASE_OFFSET_Y)
    context.font = "700 24px Outfit, system-ui, sans-serif"
    context.fillStyle = "#fff6ec"
    context.fillText(item.tournament.label, x + RECAP_CARD_TEXT_OFFSET_X, y + RECAP_TITLE_OFFSET_Y)
    let lineY = y + RECAP_ROUND_OFFSET_Y
    for (const round of item.tournament.rounds || []) {
        context.font = "700 14px Outfit, system-ui, sans-serif"
        context.fillStyle = "#d7ccb9"
        context.fillText(round.label, x + RECAP_CARD_TEXT_OFFSET_X, lineY)
        lineY += RECAP_MATCH_STEP
        for (const match of (round.matches || []).slice(0, RECAP_ROUND_MAX_MATCHES)) {
            drawRecapMatch({ cardWidth, context, match, x, y: lineY })
            lineY += RECAP_ROUND_STEP
        }
    }
}

function drawExportTournamentRecap({ context, summary, startY }) {
    const recapItems = flattenRecap(summary)
    if (recapItems.length === 0) {
        return
    }
    drawExportRecapHeading(context, startY)
    const cardWidth = Math.floor((EXPORT_WIDTH - OUTER_PADDING * 2 - INNER_PADDING * 2 - GAP) / RECAP_COLUMNS)
    for (let index = 0; index < recapItems.length; index += 1) {
        const item = recapItems[index]
        const x = OUTER_PADDING + INNER_PADDING + (index % RECAP_COLUMNS) * (cardWidth + GAP)
        const y = startY + RECAP_TITLE_HEIGHT + Math.floor(index / RECAP_COLUMNS) * (RECAP_CARD_HEIGHT + GAP)
        drawExportRecapCard({ context, item, x, y, cardWidth })
    }
}

export { drawExportTournamentRecap }
