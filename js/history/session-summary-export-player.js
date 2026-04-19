import { getInitials } from "../roster/render.js"
import { drawRoundedRect, drawSummaryPill, wrapCanvasText } from "./session-summary-export-draw.js"

const AVATAR_SWATCHES = [
    { background: "#c4613a30", color: "#e69070" },
    { background: "#d08c2f30", color: "#f0c36d" },
    { background: "#4f8f5b30", color: "#8fddb0" },
    { background: "#2c7a8f30", color: "#75d0ef" },
    { background: "#6d59a830", color: "#b9a4ff" },
    { background: "#9a4e7630", color: "#ef9cc7" },
]
const INLINE_PILL_GAP = 8
const AVATAR_OFFSET_X = 22
const AVATAR_OFFSET_Y = 20
const AVATAR_SIZE = 58
const AVATAR_RADIUS = 29
const AVATAR_TEXT_X = 51
const AVATAR_TEXT_Y = 57
const PLAYER_NAME_OFFSET_X = 98
const PLAYER_NAME_LINE_ONE_Y = 42
const PLAYER_NAME_LINE_TWO_Y = 74
const PLAYER_NAME_MAX_WIDTH_OFFSET = 128
const PLAYER_RANK_OFFSET_Y_COMPACT = 72
const PLAYER_RANK_OFFSET_Y_WRAPPED = 102
const PLAYER_RATING_Y_COMPACT = 118
const PLAYER_RATING_Y_WRAPPED = 146
const PLAYER_RATING_OFFSET_X = 22
const PLAYER_LIVE_PILL_OFFSET_X = 140
const PLAYER_LIVE_PILL_OFFSET_Y = 30
const PLAYER_META_LABEL_OFFSET_Y = 92
const PLAYER_META_VALUE_OFFSET_Y = 62
const PLAYER_BOTTOM_PILL_Y = 40
const PLAYER_CARD_HEIGHT = 270
const PLAYER_CARD_RADIUS = 22

function formatRank(rank) {
    return rank ? `#${rank}` : "—"
}

function formatSignedValue(value) {
    if (!Number.isFinite(value) || value === 0) {
        return "0"
    }
    return `${value > 0 ? "+" : ""}${value}`
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

function resolveTone(value) {
    if (value > 0) {
        return "up"
    }
    if (value < 0) {
        return "down"
    }
    return "flat"
}

function resolveRowTone(row) {
    if (row.rankDelta !== 0) {
        return resolveTone(row.rankDelta)
    }
    return row.wasActiveInSession ? "flat" : ""
}

function getAvatarSwatch(index) {
    return AVATAR_SWATCHES[index % AVATAR_SWATCHES.length]
}

function getToneColor(tone) {
    if (tone === "up") {
        return "#9fe3b1"
    }
    if (tone === "down") {
        return "#ffb0b0"
    }
    if (tone === "flat") {
        return "#f0d08d"
    }
    return "#e5dbc8"
}

function getCardStroke(tone) {
    if (tone === "up") {
        return "#7fe2a944"
    }
    if (tone === "down") {
        return "#ff8f8f40"
    }
    if (tone === "flat") {
        return "#f0d08d40"
    }
    return "#ffffff14"
}

function drawPlayerHeader({ context, row, index, width, x, y }) {
    const swatch = getAvatarSwatch(index)
    drawRoundedRect({
        context,
        rect: { x: x + AVATAR_OFFSET_X, y: y + AVATAR_OFFSET_Y, width: AVATAR_SIZE, height: AVATAR_SIZE },
        radius: AVATAR_RADIUS,
        fillStyle: swatch.background,
    })
    context.font = "700 24px Outfit, system-ui, sans-serif"
    context.fillStyle = swatch.color
    context.textAlign = "center"
    context.fillText(getInitials(row.name).toUpperCase(), x + AVATAR_TEXT_X, y + AVATAR_TEXT_Y)
    context.textAlign = "left"

    context.font = "700 30px Outfit, system-ui, sans-serif"
    const nameLines = wrapCanvasText(context, row.name, width - PLAYER_NAME_MAX_WIDTH_OFFSET)
    context.fillStyle = "#fff6ec"
    context.fillText(nameLines[0], x + PLAYER_NAME_OFFSET_X, y + PLAYER_NAME_LINE_ONE_Y)
    if (nameLines[1]) {
        context.fillText(nameLines[1], x + PLAYER_NAME_OFFSET_X, y + PLAYER_NAME_LINE_TWO_Y)
    }

    context.font = "600 20px Outfit, system-ui, sans-serif"
    context.fillStyle = "#d7ccb9"
    context.fillText(
        `${row.rankDelta === 0 ? "Still" : "Now"} ${formatRank(row.afterRank)}`,
        x + PLAYER_NAME_OFFSET_X,
        y + (nameLines[1] ? PLAYER_RANK_OFFSET_Y_WRAPPED : PLAYER_RANK_OFFSET_Y_COMPACT),
    )
    return nameLines
}

function drawPlayerRating({ context, row, x, y, nameLines }) {
    context.font = '700 44px "Syne", Outfit, system-ui, sans-serif'
    context.fillStyle = "#fff6ec"
    const ratingY = y + (nameLines[1] ? PLAYER_RATING_Y_WRAPPED : PLAYER_RATING_Y_COMPACT)
    context.fillText(String(row.afterRating ?? "—"), x + PLAYER_RATING_OFFSET_X, ratingY)
    if (row.wasActiveInSession) {
        drawSummaryPill({
            context,
            text: formatSignedValue(row.ratingDelta),
            x: x + PLAYER_LIVE_PILL_OFFSET_X,
            y: ratingY - PLAYER_LIVE_PILL_OFFSET_Y,
            toneColor: getToneColor(resolveTone(row.ratingDelta)),
            strokeStyle: `${getToneColor(resolveTone(row.ratingDelta))}33`,
        })
    }
}

function drawPlayerSnapshots({ context, row, width, x, y }) {
    context.font = "700 18px Outfit, system-ui, sans-serif"
    context.fillStyle = "#d7ccb9"
    context.fillText("RANK", x + PLAYER_RATING_OFFSET_X, y + PLAYER_CARD_HEIGHT - PLAYER_META_LABEL_OFFSET_Y)
    context.fillText("RATING", x + width / 2, y + PLAYER_CARD_HEIGHT - PLAYER_META_LABEL_OFFSET_Y)
    context.font = "700 22px Outfit, system-ui, sans-serif"
    context.fillStyle = "#fff6ec"
    context.fillText(
        `${formatRank(row.beforeRank)} -> ${formatRank(row.afterRank)}`,
        x + PLAYER_RATING_OFFSET_X,
        y + PLAYER_CARD_HEIGHT - PLAYER_META_VALUE_OFFSET_Y,
    )
    context.fillText(
        `${Number.isFinite(row.beforeRating) ? row.beforeRating : "—"} -> ${Number.isFinite(row.afterRating) ? row.afterRating : "—"}`,
        x + width / 2,
        y + PLAYER_CARD_HEIGHT - PLAYER_META_VALUE_OFFSET_Y,
    )
}

function drawPlayerMeta({ context, row, x, y }) {
    let pillX = x + PLAYER_RATING_OFFSET_X
    const pillY = y + PLAYER_CARD_HEIGHT - PLAYER_BOTTOM_PILL_Y
    pillX +=
        drawSummaryPill({
            context,
            text: `${row.games} games`,
            x: pillX,
            y: pillY,
            toneColor: getToneColor(""),
            strokeStyle: "#ffffff20",
        }) + INLINE_PILL_GAP
    if (row.rankDelta !== 0 || row.wasActiveInSession) {
        pillX +=
            drawSummaryPill({
                context,
                text: formatRankShift(row.rankDelta),
                x: pillX,
                y: pillY,
                toneColor: getToneColor(resolveTone(row.rankDelta)),
                strokeStyle: `${getToneColor(resolveTone(row.rankDelta))}33`,
            }) + INLINE_PILL_GAP
    }
    drawSummaryPill({
        context,
        text: formatRecordAndWinRate(row),
        x: pillX,
        y: pillY,
        toneColor: getToneColor(""),
        strokeStyle: "#ffffff20",
    })
}

function drawPlayerCard({ context, row, index, x, y, width }) {
    drawRoundedRect({
        context,
        rect: { x, y, width, height: PLAYER_CARD_HEIGHT },
        radius: PLAYER_CARD_RADIUS,
        fillStyle: "#ffffff0c",
        strokeStyle: getCardStroke(resolveRowTone(row)),
    })
    const nameLines = drawPlayerHeader({ context, row, index, width, x, y })
    drawPlayerRating({ context, row, x, y, nameLines })
    drawPlayerSnapshots({ context, row, width, x, y })
    drawPlayerMeta({ context, row, x, y })
}

export { drawPlayerCard, PLAYER_CARD_HEIGHT }
