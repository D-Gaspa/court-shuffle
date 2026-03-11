import { ensureTournamentCourtSchedule } from "../../../tournament/courts.js"
import { renderStandingsTable, renderTournamentOverview } from "../../../tournament/render.js"
import { buildTournamentNavState, updateTournamentNavigation } from "./nav.js"
import { renderTournamentRound } from "./round-render.js"
import { renderTournamentLevelSitOuts } from "./round-state.js"

function getCurrentRoundInfo(session) {
    const current = session.currentRound ?? 0
    const total = session.rounds.length
    return {
        current,
        total,
        isLast: current >= total - 1,
        round: session.rounds[current],
    }
}

export function renderTournamentActive({ session, saveState, ui, commitScore, renderSitOutsSection }) {
    const activeRoundInfo = getCurrentRoundInfo(session)
    ensureTournamentCourtSchedule(activeRoundInfo.round, session.courtCount || 1)

    const roundLabel = activeRoundInfo.round.tournamentRoundLabel || `Round ${activeRoundInfo.current + 1}`

    if (ui.roundPrefix) {
        ui.roundPrefix.hidden = true
    }
    ui.roundNumber.textContent = roundLabel
    ui.roundTotal.textContent = activeRoundInfo.total

    const refreshNav = () => {
        const navState = buildTournamentNavState(getCurrentRoundInfo(session))
        updateTournamentNavigation(session, navState, ui)
    }

    const rerenderView = () => {
        renderTournamentActive({ session, saveState, ui, commitScore, renderSitOutsSection })
    }

    renderTournamentRound({
        session,
        roundInfo: activeRoundInfo,
        round: activeRoundInfo.round,
        saveState,
        ui,
        refreshNav,
        rerenderView,
        commitScore,
    })

    if (session.tournamentFormat === "round-robin") {
        renderStandingsTable(session.teams, session.rounds, ui.bracketContainer)
    } else {
        renderTournamentOverview(session, ui.bracketContainer)
    }

    renderSitOutsSection(activeRoundInfo.round, ui)
    renderTournamentLevelSitOuts(session, ui)
    refreshNav()
}
