import { drawRoundedRect } from "./session-summary-export-draw.js"
import { drawPlayerCard, PLAYER_CARD_HEIGHT } from "./session-summary-export-player.js"

const EXPORT_SCALE = 2
const EXPORT_WIDTH = 1560
const OUTER_PADDING = 40
const INNER_PADDING = 24
const GAP = 20
const PLAYER_MIN_COLUMNS = 2
const PLAYER_MAX_COLUMNS = 3
const PLAYER_COLUMN_TARGET = 3
const CARD_RADIUS = 28
const BACKGROUND_MID_STOP = 0.65

function buildExportLayout(summary) {
    const columns = Math.max(
        PLAYER_MIN_COLUMNS,
        Math.min(PLAYER_MAX_COLUMNS, Math.ceil((summary.leaderboard || []).length / PLAYER_COLUMN_TARGET)),
    )
    const playerRows = Math.ceil((summary.leaderboard || []).length / columns)
    const contentHeight = playerRows * PLAYER_CARD_HEIGHT + Math.max(0, playerRows - 1) * GAP
    return {
        columns,
        height: OUTER_PADDING * 2 + INNER_PADDING * 2 + contentHeight,
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
    drawExportPlayers(context, summary, columns, OUTER_PADDING + INNER_PADDING)
    downloadCanvas(canvas)
}

export { exportSummaryCardAsPng }
