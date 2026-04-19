const SUMMARY_WORD_SPLIT_PATTERN = /\s+/
const SUMMARY_PILL_HEIGHT = 34
const SUMMARY_PILL_RADIUS = 17
const SUMMARY_PILL_TEXT_OFFSET_X = 14
const SUMMARY_PILL_TEXT_OFFSET_Y = 23
const SUMMARY_PILL_HORIZONTAL_PADDING = 28
const SUMMARY_BADGE_HEIGHT = 108
const SUMMARY_BADGE_RADIUS = 18
const SUMMARY_BADGE_LABEL_OFFSET_X = 18
const SUMMARY_BADGE_LABEL_OFFSET_Y = 28
const SUMMARY_BADGE_VALUE_OFFSET_Y = 60
const SUMMARY_BADGE_SIDE_PADDING = 36
const SUMMARY_BADGE_LINE_HEIGHT = 30

function wrapCanvasText(context, text, maxWidth) {
    const words = String(text || "").split(SUMMARY_WORD_SPLIT_PATTERN)
    const lines = []
    let current = words.shift() || ""
    for (const word of words) {
        const candidate = `${current} ${word}`
        if (context.measureText(candidate).width <= maxWidth) {
            current = candidate
            continue
        }
        lines.push(current)
        current = word
    }
    if (current) {
        lines.push(current)
    }
    return lines.length > 0 ? lines : [""]
}

function drawRoundedRect({ context, rect, radius, fillStyle, strokeStyle = "" }) {
    const { height, width, x, y } = rect
    context.beginPath()
    context.moveTo(x + radius, y)
    context.arcTo(x + width, y, x + width, y + height, radius)
    context.arcTo(x + width, y + height, x, y + height, radius)
    context.arcTo(x, y + height, x, y, radius)
    context.arcTo(x, y, x + width, y, radius)
    context.closePath()
    context.fillStyle = fillStyle
    context.fill()
    if (strokeStyle) {
        context.strokeStyle = strokeStyle
        context.stroke()
    }
}

function fillWrappedText({ context, text, x, y, maxWidth, lineHeight, color }) {
    const lines = wrapCanvasText(context, text, maxWidth)
    context.fillStyle = color
    for (let index = 0; index < lines.length; index += 1) {
        context.fillText(lines[index], x, y + index * lineHeight)
    }
}

function drawSummaryPill({ context, text, x, y, toneColor, strokeStyle }) {
    context.font = "600 22px Outfit, system-ui, sans-serif"
    const width = context.measureText(text).width + SUMMARY_PILL_HORIZONTAL_PADDING
    drawRoundedRect({
        context,
        rect: { x, y, width, height: SUMMARY_PILL_HEIGHT },
        radius: SUMMARY_PILL_RADIUS,
        fillStyle: "#00000030",
        strokeStyle,
    })
    context.fillStyle = toneColor
    context.fillText(text, x + SUMMARY_PILL_TEXT_OFFSET_X, y + SUMMARY_PILL_TEXT_OFFSET_Y)
    return width
}

function drawSummaryBadge({ context, label, value, x, y, width }) {
    drawRoundedRect({
        context,
        rect: { x, y, width, height: SUMMARY_BADGE_HEIGHT },
        radius: SUMMARY_BADGE_RADIUS,
        fillStyle: "#ffffff10",
        strokeStyle: "#ffffff14",
    })
    context.font = "700 18px Outfit, system-ui, sans-serif"
    context.fillStyle = "#d7ccb9"
    context.fillText(label.toUpperCase(), x + SUMMARY_BADGE_LABEL_OFFSET_X, y + SUMMARY_BADGE_LABEL_OFFSET_Y)
    context.font = "700 28px Outfit, system-ui, sans-serif"
    fillWrappedText({
        context,
        text: value,
        x: x + SUMMARY_BADGE_LABEL_OFFSET_X,
        y: y + SUMMARY_BADGE_VALUE_OFFSET_Y,
        maxWidth: width - SUMMARY_BADGE_SIDE_PADDING,
        lineHeight: SUMMARY_BADGE_LINE_HEIGHT,
        color: "#fff6ec",
    })
}

export { drawRoundedRect, drawSummaryBadge, drawSummaryPill, wrapCanvasText }
