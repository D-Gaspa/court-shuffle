import { ID_RADIX, ID_SLICE_END, ID_SLICE_START } from "./constants.js"
import { renderBracket, renderPlayerSelection, updateTeamSizeHint } from "./session.js"
import { canGenerateMore, extractPairs, generateRound } from "./shuffle.js"

const sessionSetup = document.getElementById("session-setup")
const sessionActive = document.getElementById("session-active")
const noRosterWarning = document.getElementById("no-roster-warning")
const sessionConfig = document.getElementById("session-config")
const playerSelection = document.getElementById("player-selection")
const selectAllBtn = document.getElementById("select-all-btn")
const deselectAllBtn = document.getElementById("deselect-all-btn")
const teamsDecBtn = document.getElementById("teams-dec")
const teamsIncBtn = document.getElementById("teams-inc")
const teamCountValue = document.getElementById("team-count-value")
const teamSizeHint = document.getElementById("team-size-hint")
const startSessionBtn = document.getElementById("start-session-btn")
const roundNumber = document.getElementById("round-number")
const roundInfo = document.getElementById("round-info")
const nextRoundBtn = document.getElementById("next-round-btn")
const endSessionBtn = document.getElementById("end-session-btn")
const bracketContainer = document.getElementById("bracket-container")
const noMoreRounds = document.getElementById("no-more-rounds")

let selectedPlayers = new Set()
let teamCount = 2
let globalState = null
let saveState = null
let askConfirm = null

function initSession(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn
    askConfirm = confirmFn

    teamsDecBtn.addEventListener("click", onTeamsDecClick)
    teamsIncBtn.addEventListener("click", onTeamsIncClick)
    selectAllBtn.addEventListener("click", onSelectAllClick)
    deselectAllBtn.addEventListener("click", onDeselectAllClick)
    startSessionBtn.addEventListener("click", onStartSessionClick)
    nextRoundBtn.addEventListener("click", onNextRoundClick)
    endSessionBtn.addEventListener("click", onEndSessionClick)
}

function onTeamsDecClick() {
    if (teamCount > 2) {
        teamCount -= 1
        onSelectionChange()
    }
}

function onTeamsIncClick() {
    if (teamCount < selectedPlayers.size) {
        teamCount += 1
        onSelectionChange()
    }
}

function onSelectAllClick() {
    selectedPlayers = new Set(globalState.roster)
    renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)
    onSelectionChange()
}

function onDeselectAllClick() {
    selectedPlayers.clear()
    renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)
    onSelectionChange()
}

function onStartSessionClick() {
    const players = [...selectedPlayers]
    if (players.length < 2) {
        return
    }

    const usedPairs = new Set()
    const firstRound = generateRound(players, teamCount, usedPairs)
    if (!firstRound) {
        return
    }

    const pairs = extractPairs(firstRound)
    for (const p of pairs) {
        usedPairs.add(p)
    }

    globalState.activeSession = {
        id: Date.now().toString(ID_RADIX) + Math.random().toString(ID_RADIX).slice(ID_SLICE_START, ID_SLICE_END),
        date: new Date().toISOString(),
        players,
        teamCount,
        rounds: [firstRound],
        usedPairs: [...usedPairs],
    }

    saveState()
    refreshSessionView()
}

function onNextRoundClick() {
    const session = globalState.activeSession
    if (!session) {
        return
    }

    const usedPairs = new Set(session.usedPairs)
    const newRound = generateRound(session.players, session.teamCount, usedPairs)

    if (!newRound) {
        nextRoundBtn.disabled = true
        noMoreRounds.hidden = false
        return
    }

    const pairs = extractPairs(newRound)
    for (const p of pairs) {
        usedPairs.add(p)
    }

    session.rounds.push(newRound)
    session.usedPairs = [...usedPairs]
    saveState()
    renderActiveSession()
}

function endSession(save) {
    if (save) {
        const session = globalState.activeSession
        if (session) {
            globalState.history.push({
                id: session.id,
                date: session.date,
                players: session.players,
                teamCount: session.teamCount,
                rounds: session.rounds,
            })
        }
    }
    globalState.activeSession = null
    saveState()
    refreshSessionView()
}

function onEndSessionClick() {
    const opts = {
        okLabel: "Save & End",
        okClass: "btn-primary",
        extraLabel: "Discard",
        onExtra: () => endSession(false),
    }
    askConfirm("End Session", "Save this session to history, or discard it?", () => endSession(true), opts)
}

function onSelectionChange() {
    const count = selectedPlayers.size
    clampTeamCount()
    teamCountValue.textContent = teamCount
    updateTeamSizeHint(count, teamCount, teamSizeHint)
    startSessionBtn.disabled = count < 2
}

function clampTeamCount() {
    const max = Math.max(2, selectedPlayers.size)
    if (teamCount > max) {
        teamCount = max
    }
    if (teamCount < 2) {
        teamCount = 2
    }
    teamCountValue.textContent = teamCount
    teamsDecBtn.disabled = teamCount <= 2
    teamsIncBtn.disabled = teamCount >= selectedPlayers.size || selectedPlayers.size < 2
}

function renderActiveSession() {
    const session = globalState.activeSession
    if (!session) {
        return
    }

    const currentRound = session.rounds.length
    roundNumber.textContent = currentRound
    roundInfo.textContent = `${session.players.length} players · ${session.teamCount} teams`

    const latestTeams = session.rounds[currentRound - 1]
    renderBracket(latestTeams, bracketContainer)

    const usedPairs = new Set(session.usedPairs)
    const moreRoundsPossible = canGenerateMore(session.players, session.teamCount, usedPairs)

    nextRoundBtn.disabled = !moreRoundsPossible
    noMoreRounds.hidden = moreRoundsPossible
}

function refreshSessionView() {
    if (globalState.activeSession) {
        sessionSetup.hidden = true
        sessionActive.hidden = false
        renderActiveSession()
        return
    }

    sessionSetup.hidden = false
    sessionActive.hidden = true

    if (globalState.roster.length < 2) {
        noRosterWarning.hidden = false
        sessionConfig.hidden = true
        return
    }

    noRosterWarning.hidden = true
    sessionConfig.hidden = false

    const validSelected = new Set()
    for (const p of selectedPlayers) {
        if (globalState.roster.includes(p)) {
            validSelected.add(p)
        }
    }
    selectedPlayers = validSelected

    renderPlayerSelection(globalState.roster, selectedPlayers, playerSelection, onSelectionChange)
    clampTeamCount()
    onSelectionChange()
}

export { initSession, refreshSessionView }
