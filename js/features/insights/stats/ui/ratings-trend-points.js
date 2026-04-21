const X_AXIS_LABEL_COUNT = 3

function buildDisplayPoints(points, grouping) {
    if (grouping === "session") {
        return buildSessionDisplayPoints(points)
    }
    return buildMatchDisplayPoints(points)
}

function buildMatchDisplayPoints(points) {
    return points.map((point, index) => ({
        ...point,
        tooltipDate: formatPointDate(point.sessionDate),
        tooltipTitle: index === 0 ? "Season Baseline" : `Match ${point.matchNumber}`,
        xLabel: buildMatchHorizontalAxisLabel(point, index, points.length),
    }))
}

function buildSessionDisplayPoints(points) {
    if (!Array.isArray(points) || points.length === 0) {
        return []
    }
    const [baseline, ...matches] = points
    const groupedMatches = []
    for (const point of matches) {
        const lastGroup = groupedMatches.at(-1)
        if (lastGroup && lastGroup.nightGroupId === resolvePointNightGroupId(point)) {
            lastGroup.points.push(point)
            lastGroup.lastPoint = point
            continue
        }
        groupedMatches.push({
            nightGroupId: resolvePointNightGroupId(point),
            sessionDate: point.sessionDate,
            sessionId: point.sessionId,
            points: [point],
            lastPoint: point,
        })
    }
    return [
        {
            ...baseline,
            tooltipDate: "Before season play",
            tooltipTitle: "Season Baseline",
            xLabel: "",
        },
        ...groupedMatches.map((group, index) => ({
            ...group.lastPoint,
            nightGroupId: group.nightGroupId,
            sessionDate: group.sessionDate,
            sessionId: group.sessionId,
            sessionMatchCount: group.points.length,
            tooltipDate: formatPointDate(group.sessionDate),
            tooltipTitle: `Night ${index + 1}`,
            xLabel: formatShortDate(group.sessionDate),
        })),
    ]
}

function resolvePointNightGroupId(point) {
    return point.nightGroupId || point.sessionId
}

function buildMatchHorizontalAxisLabel(point, index, pointCount) {
    if (index === 0 || index === pointCount - 1) {
        return formatShortDate(point.sessionDate)
    }
    return ""
}

function formatPointDate(isoDate) {
    if (!isoDate) {
        return ""
    }
    return new Date(isoDate).toLocaleDateString()
}

function formatShortDate(isoDate) {
    if (!isoDate) {
        return ""
    }
    return new Date(isoDate).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
    })
}

function resolveHorizontalAxisLabelIndexes(points) {
    return new Set([0, Math.max(0, Math.floor((points.length - 1) / (X_AXIS_LABEL_COUNT - 1))), points.length - 1])
}

function resolveHorizontalAxisAnchor(index, points) {
    if (index === 0) {
        return "start"
    }
    if (index === points.length - 1) {
        return "end"
    }
    return "middle"
}

export { buildDisplayPoints, resolveHorizontalAxisAnchor, resolveHorizontalAxisLabelIndexes }
