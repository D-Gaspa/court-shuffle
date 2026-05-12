import { getModeLabel } from "../../../ui/common/utils.js"
import {
    getHistorySessionPlayers,
    getHistoryTournamentPhases,
    getHistoryTournamentRuns,
} from "../summary/session-phases.js"

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

    const seriesRuns = getHistoryTournamentRuns(session)
    if (seriesRuns.length === 0) {
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
    const seriesTournaments = getHistoryTournamentRuns(session)
    const phaseCount = getHistoryTournamentPhases(session).length
    const playerCount = getHistorySessionPlayers(session).length
    const hasSeriesRuns = seriesTournaments.length > 0
    const roundCount = hasSeriesRuns
        ? seriesTournaments.reduce((sum, run) => sum + (run.rounds?.length || 0), 0)
        : session.rounds.length
    const modeLabel = getModeLabel(session)
    let metaText = `${playerCount} players · ${roundCount} round${roundCount !== 1 ? "s" : ""} · ${modeLabel}`
    if (hasSeriesRuns) {
        metaText += ` · ${seriesTournaments.length} tournament${seriesTournaments.length !== 1 ? "s" : ""}`
    }
    if (phaseCount > 1) {
        metaText += ` · ${phaseCount} phases`
    }

    const championName = resolveSessionChampionName(session)
    if (championName) {
        metaText += ` · Champion: ${championName}`
    }

    return metaText
}

export { buildHistoryCardMeta, formatDate, resolveSessionChampionName }
