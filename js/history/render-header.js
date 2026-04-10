import { getModeLabel } from "../shared/utils.js"

function formatDate(isoString) {
    try {
        const d = new Date(isoString)
        if (Number.isNaN(d.getTime())) {
            return isoString
        }
        return d.toLocaleDateString(undefined, {
            weekday: "short",
            year: "numeric",
            month: "short",
            day: "numeric",
        })
    } catch {
        return isoString
    }
}

function buildChevronSvg() {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg")
    svg.setAttribute("class", "history-card-toggle")
    svg.setAttribute("viewBox", "0 0 24 24")
    svg.setAttribute("fill", "none")
    svg.setAttribute("stroke", "currentColor")
    svg.setAttribute("stroke-width", "2")
    svg.setAttribute("stroke-linecap", "round")
    svg.setAttribute("width", "20")
    svg.setAttribute("height", "20")
    const polyline = document.createElementNS("http://www.w3.org/2000/svg", "polyline")
    polyline.setAttribute("points", "6 9 12 15 18 9")
    svg.appendChild(polyline)
    return svg
}

function getScoredTournamentRuns(session) {
    if (!Array.isArray(session.tournamentSeries?.tournaments)) {
        return null
    }
    return session.tournamentSeries.tournaments.filter((run) => Array.isArray(run.rounds) && run.rounds.length > 0)
}

function resolveSessionChampionName(session) {
    if (
        session.mode === "tournament" &&
        session.bracket?.champion !== null &&
        session.bracket?.champion !== undefined
    ) {
        const champion = session.teams?.find((team) => team.id === session.bracket.champion)
        if (champion) {
            return champion.name
        }
    }

    const seriesRuns = getScoredTournamentRuns(session)
    if (!seriesRuns) {
        return null
    }

    for (let index = seriesRuns.length - 1; index >= 0; index -= 1) {
        const run = seriesRuns[index]
        if (run.bracket?.champion === null || run.bracket?.champion === undefined) {
            continue
        }
        const champion = run.teams?.find((team) => team.id === run.bracket.champion)
        if (champion) {
            return champion.name
        }
    }

    return null
}

function buildHistoryCardMeta(session) {
    const seriesTournaments = getScoredTournamentRuns(session)
    const roundCount = seriesTournaments
        ? seriesTournaments.reduce((sum, run) => sum + (run.rounds?.length || 0), 0)
        : session.rounds.length
    const modeLabel = getModeLabel(session)
    let metaText = `${session.players.length} players · ${roundCount} round${roundCount !== 1 ? "s" : ""} · ${modeLabel}`
    if (seriesTournaments && seriesTournaments.length > 0) {
        metaText += ` · ${seriesTournaments.length} tournament${seriesTournaments.length !== 1 ? "s" : ""}`
    }

    const championName = resolveSessionChampionName(session)
    if (championName) {
        metaText += ` · Champion: ${championName}`
    }

    return metaText
}

function buildHistoryCardHeader(session, dateStr) {
    const headerEl = document.createElement("div")
    headerEl.className = "history-card-header"

    const info = document.createElement("div")
    info.className = "history-card-info"

    const dateSpan = document.createElement("span")
    dateSpan.className = "history-card-date"
    dateSpan.textContent = dateStr

    const meta = document.createElement("span")
    meta.className = "history-card-meta"
    meta.textContent = buildHistoryCardMeta(session)

    info.appendChild(dateSpan)
    info.appendChild(meta)
    headerEl.appendChild(info)
    headerEl.appendChild(buildChevronSvg())

    return headerEl
}

export { buildHistoryCardHeader, buildHistoryCardMeta, formatDate, getScoredTournamentRuns, resolveSessionChampionName }
