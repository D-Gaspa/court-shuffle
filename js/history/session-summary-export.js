import { drawRoundedRect, drawSummaryBadge } from "./session-summary-export-draw.js"
import { drawPlayerCard, PLAYER_CARD_HEIGHT } from "./session-summary-export-player.js"

const EXPORT_SCALE = 2
const EXPORT_WIDTH = 1560
const OUTER_PADDING = 40
const INNER_PADDING = 24
const GAP = 20
const HEADER_HEIGHT = 160
const BADGE_HEIGHT = 108
const PLAYER_MIN_COLUMNS = 2
const PLAYER_MAX_COLUMNS = 3
const SECTION_TITLE_HEIGHT = 70
const HEADER_BADGE_COUNT = 4
const BADGE_COLUMNS = 3
const CARD_STORY_LABEL_OFFSET_Y = 12
const CARD_STORY_VALUE_OFFSET_Y = 48
const CARD_RADIUS = 28
const BACKGROUND_MID_STOP = 0.65

function buildExportLayout(summary) {
    const columns = Math.max(
        PLAYER_MIN_COLUMNS,
        Math.min(PLAYER_MAX_COLUMNS, Math.ceil((summary.leaderboard || []).length / BADGE_COLUMNS)),
    )
    const notableCount = (summary.notableResults || []).length + (summary.miniTournamentWinners || []).length
    const badgeRows = notableCount > 0 ? Math.ceil(notableCount / BADGE_COLUMNS) : 0
    const badgeSectionHeight = badgeRows > 0 ? badgeRows * BADGE_HEIGHT + (badgeRows - 1) * GAP + GAP : 0
    const playerRows = Math.ceil((summary.leaderboard || []).length / columns)
    const contentHeight = playerRows * PLAYER_CARD_HEIGHT + Math.max(0, playerRows - 1) * GAP
    return {
        badgeRows,
        columns,
        height: OUTER_PADDING * 2 + HEADER_HEIGHT + badgeSectionHeight + SECTION_TITLE_HEIGHT + contentHeight,
    }
}

function createExportCanvas(height) {
    const canvas = document.createElement("canvas")
    canvas.width = EXPORT_WIDTH * EXPORT_SCALE
    canvas.height = height * EXPORT_SCALE
    const context = canvas.getContext("2d")
    context.scale(EXPORT_SCALE, EXPORT_SCALE)
    return { canvas, context }
}

function drawExportBackground(context, height) {
    const background = context.createLinearGradient(0, 0, EXPORT_WIDTH, height)
    background.addColorStop(0, "#241913")
    background.addColorStop(BACKGROUND_MID_STOP, "#151a24")
    background.addColorStop(1, "#131418")
    context.fillStyle = background
    context.fillRect(0, 0, EXPORT_WIDTH, height)

    drawRoundedRect({
        context,
        rect: {
            x: OUTER_PADDING,
            y: OUTER_PADDING,
            width: EXPORT_WIDTH - OUTER_PADDING * 2,
            height: height - OUTER_PADDING * 2,
        },
        radius: CARD_RADIUS,
        fillStyle: "#00000012",
        strokeStyle: "#ffffff14",
    })
}

function drawExportHeader(context, summary) {
    const headerWidth = Math.floor(
        (EXPORT_WIDTH - OUTER_PADDING * 2 - GAP * (HEADER_BADGE_COUNT - 1)) / HEADER_BADGE_COUNT,
    )
    const headerItems = [
        { label: "Session", value: summary.title },
        { label: "Mode", value: summary.leaderboardMode === "singles" ? "Singles" : "Doubles" },
        { label: "Tracked Games", value: String(summary.matchSummary.played) },
        { label: "Players", value: String((summary.players || []).length) },
    ]
    for (let index = 0; index < headerItems.length; index += 1) {
        drawSummaryBadge({
            context,
            ...headerItems[index],
            x: OUTER_PADDING + INNER_PADDING + index * (headerWidth + GAP),
            y: OUTER_PADDING + INNER_PADDING,
            width: headerWidth,
        })
    }
}

function drawExportBadges(context, summary, startY) {
    const badges = [
        ...(summary.notableResults || []).map((item) => ({ label: item.label, value: item.value })),
        ...(summary.miniTournamentWinners || []).map((item) => ({ label: item.label, value: item.winner })),
    ]
    if (badges.length === 0) {
        return startY
    }
    const badgeWidth = Math.floor(
        (EXPORT_WIDTH - OUTER_PADDING * 2 - INNER_PADDING * 2 - GAP * (BADGE_COLUMNS - 1)) / BADGE_COLUMNS,
    )
    for (let index = 0; index < badges.length; index += 1) {
        drawSummaryBadge({
            context,
            ...badges[index],
            x: OUTER_PADDING + INNER_PADDING + (index % BADGE_COLUMNS) * (badgeWidth + GAP),
            y: startY + Math.floor(index / BADGE_COLUMNS) * (BADGE_HEIGHT + GAP),
            width: badgeWidth,
        })
    }
    return startY + Math.ceil(badges.length / BADGE_COLUMNS) * (BADGE_HEIGHT + GAP)
}

function drawExportStoryHeading(context, summary, startY) {
    context.font = "700 18px Outfit, system-ui, sans-serif"
    context.fillStyle = "#d7ccb9"
    context.fillText("LEADERBOARD STORY", OUTER_PADDING + INNER_PADDING, startY + CARD_STORY_LABEL_OFFSET_Y)
    context.font = "700 28px Outfit, system-ui, sans-serif"
    context.fillStyle = "#fff6ec"
    context.fillText(
        `${summary.leaderboardMode === "singles" ? "Singles" : "Doubles"} ladder`,
        OUTER_PADDING + INNER_PADDING,
        startY + CARD_STORY_VALUE_OFFSET_Y,
    )
    return startY + SECTION_TITLE_HEIGHT
}

function drawExportPlayers(context, summary, columns, startY) {
    const playerCardWidth = Math.floor(
        (EXPORT_WIDTH - OUTER_PADDING * 2 - INNER_PADDING * 2 - GAP * (columns - 1)) / columns,
    )
    for (let index = 0; index < (summary.leaderboard || []).length; index += 1) {
        drawPlayerCard({
            context,
            row: summary.leaderboard[index],
            index,
            x: OUTER_PADDING + INNER_PADDING + (index % columns) * (playerCardWidth + GAP),
            y: startY + Math.floor(index / columns) * (PLAYER_CARD_HEIGHT + GAP),
            width: playerCardWidth,
        })
    }
}

function downloadCanvas(canvas) {
    const anchor = document.createElement("a")
    anchor.href = canvas.toDataURL("image/png")
    anchor.download = `court-shuffle-session-${Date.now()}.png`
    anchor.click()
}

function exportSummaryCardAsPng(summary) {
    const { columns, height } = buildExportLayout(summary)
    const { canvas, context } = createExportCanvas(height)
    drawExportBackground(context, height)
    drawExportHeader(context, summary)
    const badgesEndY = drawExportBadges(context, summary, OUTER_PADDING + HEADER_HEIGHT)
    const playerStartY = drawExportStoryHeading(context, summary, badgesEndY)
    drawExportPlayers(context, summary, columns, playerStartY)
    downloadCanvas(canvas)
}

export { exportSummaryCardAsPng }
