const PERCENT_SCALE = 100

function formatPercent(value) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "—"
    }
    return `${Math.round(value * PERCENT_SCALE)}%`
}

function formatRecord(wins, losses) {
    return `${wins}-${losses}`
}

function formatSignedNumber(value, digits = 1) {
    if (typeof value !== "number" || Number.isNaN(value)) {
        return "—"
    }
    const rounded = value.toFixed(digits)
    if (value > 0) {
        return `+${rounded}`
    }
    return rounded
}

function formatCountLabel(value, singular, plural = `${singular}s`) {
    const n = Number.isFinite(value) ? value : 0
    return `${n} ${n === 1 ? singular : plural}`
}

export { formatPercent, formatRecord, formatSignedNumber, formatCountLabel }
