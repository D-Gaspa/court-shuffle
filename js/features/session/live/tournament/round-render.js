import { ensureTournamentCourtSchedule, getQueuePendingIndexes } from "../../../../domains/tournament/engine/courts.js"
import { teamByPlayers } from "../../../../domains/tournament/engine/utils.js"
import {
    appendSectionLabel,
    filterIndexedMatches,
    getMatchHeaderLabel,
    getRoundOpenEditors,
    resolveDisplayCourt,
    splitTournamentMatchesByPool,
} from "./round-render-helpers.js"
import { renderSingleMatch } from "./round-render-match.js"
import { appendExecutionInfo, getTournamentRoundDisplayState } from "./round-state.js"
import { canEditTournamentRoundScores } from "./score-editing.js"

const noopRefreshNav = () => undefined
const noopCommitScore = () => undefined

function makeTeamNameResolver(session) {
    return (players) => {
        const team = teamByPlayers(session.teams, players)
        return team ? team.name : players.join(", ")
    }
}

function renderMatchGroup({
    matches,
    indices,
    round,
    saveState,
    container,
    teamNames,
    refreshNav,
    onAfterScoreSave,
    commitScore,
    allowScoreEditing = true,
    editableIndices = null,
    showCourtSlots = false,
    queueLabelMode = "court",
    openEditors = null,
}) {
    const handleAfterScoreSave = (options) => {
        if (options?.partial) {
            refreshNav()
            return
        }
        ;(onAfterScoreSave || refreshNav)(options)
    }

    for (let j = 0; j < matches.length; j += 1) {
        const match = matches[j]
        const globalIdx = indices[j]
        const scoreEntry = round.scores ? round.scores[globalIdx] : null
        let canEdit = true
        if (!allowScoreEditing) {
            canEdit = false
        } else if (!scoreEntry && editableIndices) {
            canEdit = editableIndices.has(globalIdx)
        }

        renderSingleMatch({
            match,
            globalIdx,
            localIdx: j,
            round,
            scoreEntry,
            showCourtSlots,
            queueLabelMode,
            container,
            teamNames,
            openEditors,
            canEdit,
            commitScore,
            saveState,
            handleAfterScoreSave,
            resolveDisplayCourt,
            getMatchHeaderLabel,
        })
    }
}

function renderPendingQueue(round, container, teamNames) {
    const pending = getQueuePendingIndexes(round)
    if (pending.length === 0) {
        return
    }

    appendSectionLabel(container, "Next Up")
    renderMatchGroup({
        matches: pending.map((i) => round.matches[i]),
        indices: pending,
        round,
        saveState: null,
        container,
        teamNames,
        refreshNav: noopRefreshNav,
        commitScore: noopCommitScore,
        editableIndices: new Set(),
        showCourtSlots: true,
        queueLabelMode: "next",
    })
}

function renderTournamentPoolSections({
    session,
    round,
    saveState,
    container,
    teamNames,
    refreshNav,
    onAfterScoreSave,
    commitScore,
    allowScoreEditing = true,
    displayState,
    openEditors,
}) {
    const { winnersMatches, losersMatches, matchIndices } = splitTournamentMatchesByPool(round)
    const winners = filterIndexedMatches(winnersMatches, matchIndices.winners, displayState.mainVisibleIndices)
    const losers = filterIndexedMatches(losersMatches, matchIndices.losers, displayState.mainVisibleIndices)

    if (winners.matches.length > 0) {
        appendSectionLabel(
            container,
            session.tournamentFormat === "consolation" ? "Winners Bracket" : "Bracket",
            "bracket-pool-label winners-label",
        )
        renderMatchGroup({
            matches: winners.matches,
            indices: winners.indices,
            round,
            saveState,
            container,
            teamNames,
            refreshNav,
            onAfterScoreSave,
            commitScore,
            allowScoreEditing,
            editableIndices: displayState.editableIndices,
            showCourtSlots: true,
            queueLabelMode: "court",
            openEditors,
        })
    }

    if (losers.matches.length > 0) {
        appendSectionLabel(container, "Losers Bracket", "bracket-pool-label losers-label")
        renderMatchGroup({
            matches: losers.matches,
            indices: losers.indices,
            round,
            saveState,
            container,
            teamNames,
            refreshNav,
            onAfterScoreSave,
            commitScore,
            allowScoreEditing,
            editableIndices: displayState.editableIndices,
            showCourtSlots: true,
            queueLabelMode: "court",
            openEditors,
        })
    }
}

function renderByeInfo(round, teams, container) {
    const allByes = [...(round.byes || []), ...(round.losersByes || [])]
    if (allByes.length === 0) {
        return
    }

    const byeSection = document.createElement("div")
    byeSection.className = "bye-info"
    appendSectionLabel(byeSection, "Byes (auto-advance)")

    const list = document.createElement("div")
    list.className = "bye-list"
    for (const teamId of allByes) {
        const team = teams.find((t) => t.id === teamId)
        if (!team) {
            continue
        }
        const chip = document.createElement("div")
        chip.className = "bye-chip"
        chip.textContent = team.name
        list.appendChild(chip)
    }
    byeSection.appendChild(list)
    container.appendChild(byeSection)
}

function renderTournamentRound({ session, roundInfo, round, saveState, ui, refreshNav, rerenderView, commitScore }) {
    ui.bracketContainer.textContent = ""
    ensureTournamentCourtSchedule(round, session.courtCount || 1)
    const teamNames = makeTeamNameResolver(session)
    const displayState = getTournamentRoundDisplayState(round)
    const allowScoreEditing = canEditTournamentRoundScores(session, roundInfo?.current)
    const openEditors = getRoundOpenEditors(round)

    appendExecutionInfo(round, session, ui.bracketContainer)

    if (session.tournamentFormat === "consolation" || session.tournamentFormat === "elimination") {
        renderTournamentPoolSections({
            session,
            round,
            saveState,
            container: ui.bracketContainer,
            teamNames,
            refreshNav,
            onAfterScoreSave: rerenderView,
            commitScore,
            allowScoreEditing,
            displayState,
            openEditors,
        })
        if (round.courtSchedule?.mode === "queue") {
            renderPendingQueue(round, ui.bracketContainer, teamNames)
        }
        renderByeInfo(round, session.teams, ui.bracketContainer)
        return
    }

    const indices = [...displayState.mainVisibleIndices].sort((a, b) => a - b)
    renderMatchGroup({
        matches: indices.map((i) => round.matches[i]),
        indices,
        round,
        saveState,
        container: ui.bracketContainer,
        teamNames,
        refreshNav,
        onAfterScoreSave: rerenderView,
        commitScore,
        allowScoreEditing,
        editableIndices: displayState.editableIndices,
        showCourtSlots: true,
        queueLabelMode: "court",
        openEditors,
    })
    if (round.courtSchedule?.mode === "queue") {
        renderPendingQueue(round, ui.bracketContainer, teamNames)
    }
}

export { renderTournamentRound }
