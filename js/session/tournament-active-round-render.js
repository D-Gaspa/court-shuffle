import { ensureTournamentCourtSchedule, getQueuePendingIndexes } from "../tournament/courts.js"
import { teamByPlayers } from "../tournament/utils.js"
import { renderBracket } from "./render.js"
import { appendExecutionInfo, getTournamentRoundDisplayState } from "./tournament-active-round-state.js"

function noopRefreshNav() {
    // Intentional no-op for read-only queue previews.
}

function noopCommitScore() {
    // Intentional no-op for read-only queue previews.
}

function makeTeamNameResolver(session) {
    return (players) => {
        const team = teamByPlayers(session.teams, players)
        return team ? team.name : players.join(", ")
    }
}

function splitTournamentMatchesByPool(round) {
    const winnersMatches = []
    const losersMatches = []
    const matchIndices = { winners: [], losers: [] }

    for (let i = 0; i < round.matches.length; i += 1) {
        const pool = round.matches[i].bracketPool || "winners"
        if (pool === "losers") {
            losersMatches.push(round.matches[i])
            matchIndices.losers.push(i)
        } else {
            winnersMatches.push(round.matches[i])
            matchIndices.winners.push(i)
        }
    }

    return { winnersMatches, losersMatches, matchIndices }
}

function filterIndexedMatches(matches, indices, includeSet) {
    if (!includeSet) {
        return { matches, indices }
    }
    const nextMatches = []
    const nextIndices = []
    for (let i = 0; i < indices.length; i += 1) {
        if (includeSet.has(indices[i])) {
            nextMatches.push(matches[i])
            nextIndices.push(indices[i])
        }
    }
    return { matches: nextMatches, indices: nextIndices }
}

function makeSingleMatchRound(match, scoreEntry, displayCourt) {
    return {
        matches: [{ ...match, court: displayCourt }],
        scores: scoreEntry ? [scoreEntry] : null,
    }
}

function appendSectionLabel(container, text, className = "section-label") {
    const label = document.createElement("h3")
    label.className = className
    label.textContent = text
    container.appendChild(label)
}

function renderMatchGroup({
    matches,
    indices,
    round,
    saveState,
    container,
    teamNames,
    refreshNav,
    commitScore,
    editableIndices = null,
    showCourtSlots = false,
}) {
    for (let j = 0; j < matches.length; j += 1) {
        const match = matches[j]
        const globalIdx = indices[j]
        const scoreEntry = round.scores ? round.scores[globalIdx] : null
        let canEdit = true
        if (!scoreEntry && editableIndices) {
            canEdit = editableIndices.has(globalIdx)
        }

        const tempRound = makeSingleMatchRound(match, scoreEntry, showCourtSlots ? j + 1 : match.court)
        const matchDiv = document.createElement("div")
        container.appendChild(matchDiv)

        renderBracket(tempRound, matchDiv, {
            editable: canEdit,
            onCommit: (_, sets) => {
                if (!canEdit) {
                    return
                }
                commitScore({
                    round,
                    matchIndex: globalIdx,
                    sets,
                    saveState,
                    onAfterSave: refreshNav,
                })
            },
            teamNames,
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
    })
}

function renderTournamentPoolSections({
    session,
    round,
    saveState,
    container,
    teamNames,
    refreshNav,
    commitScore,
    displayState,
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
            commitScore,
            editableIndices: displayState.editableIndices,
            showCourtSlots: true,
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
            commitScore,
            editableIndices: displayState.editableIndices,
            showCourtSlots: true,
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

function renderTournamentRound({ session, round, saveState, ui, refreshNav, commitScore }) {
    ui.bracketContainer.textContent = ""
    ensureTournamentCourtSchedule(round, session.courtCount || 1, session.tournamentSeries?.courtHandling || "queue")
    const teamNames = makeTeamNameResolver(session)
    const displayState = getTournamentRoundDisplayState(round)

    appendExecutionInfo(round, session, ui.bracketContainer)

    if (session.tournamentFormat === "consolation" || session.tournamentFormat === "elimination") {
        renderTournamentPoolSections({
            session,
            round,
            saveState,
            container: ui.bracketContainer,
            teamNames,
            refreshNav,
            commitScore,
            displayState,
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
        commitScore,
        editableIndices: displayState.editableIndices,
        showCourtSlots: true,
    })
    if (round.courtSchedule?.mode === "queue") {
        renderPendingQueue(round, ui.bracketContainer, teamNames)
    }
}

export { renderTournamentRound }
