import { ensureTournamentCourtSchedule } from "../tournament/courts.js"
import { renderStandingsTable, renderTournamentOverview } from "../tournament/render.js"
import { buildTournamentNavState, updateTournamentNavigation } from "./tournament-active-nav.js"
import { renderTournamentRound } from "./tournament-active-round-render.js"
import { renderTournamentLevelSitOuts } from "./tournament-active-round-state.js"

export function renderTournamentActive({ session, roundInfo, saveState, ui, commitScore, renderSitOutsSection }) {
    ensureTournamentCourtSchedule(roundInfo.round, session.courtCount || 1)

    const roundLabel = roundInfo.round.tournamentRoundLabel || `Round ${roundInfo.current + 1}`

    if (ui.roundPrefix) {
        ui.roundPrefix.hidden = true
    }
    ui.roundNumber.textContent = roundLabel
    ui.roundTotal.textContent = roundInfo.total

    const refreshNav = () => {
        const navState = buildTournamentNavState(session, roundInfo)
        updateTournamentNavigation(session, navState, ui)
    }

    const rerenderView = () => {
        renderTournamentActive({ session, roundInfo, saveState, ui, commitScore, renderSitOutsSection })
    }

    renderTournamentRound({
        session,
        roundInfo,
        round: roundInfo.round,
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

    renderSitOutsSection(roundInfo.round, ui)
    renderTournamentLevelSitOuts(session, ui)
    refreshNav()
}
