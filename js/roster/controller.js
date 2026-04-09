import {
    hideFieldError,
    renameInPlayerList,
    renameInRounds,
    renameInTournamentSeries,
    showFieldError,
} from "../shared/utils.js"
import { pairKey } from "../shuffle/core.js"
import { renderRoster } from "./render.js"

const playerNameInput = document.getElementById("player-name-input")
const addPlayerBtn = document.getElementById("add-player-btn")
const playerError = document.getElementById("player-error")
const rosterList = document.getElementById("roster-list")
const rosterEmpty = document.getElementById("roster-empty")

const renameDialog = document.getElementById("rename-dialog")
const renameInput = document.getElementById("rename-input")
const renameError = document.getElementById("rename-error")
const renameCancelBtn = document.getElementById("rename-cancel")
const renameConfirmBtn = document.getElementById("rename-confirm")

let globalState = null
let saveState = null
let askConfirm = null
let renameIndex = -1

function renameTeamObjects(teams, oldName, newName) {
    if (!Array.isArray(teams)) {
        return
    }
    for (const team of teams) {
        if (!Array.isArray(team?.players)) {
            continue
        }
        const idx = team.players.indexOf(oldName)
        if (idx !== -1) {
            team.players[idx] = newName
            team.name = team.players.join(" & ")
        }
    }
}

function renameUsedPairs(usedPairs, oldName, newName) {
    if (!Array.isArray(usedPairs)) {
        return usedPairs
    }

    return usedPairs.map((pk) => {
        const parts = pk.split("||")
        const newParts = parts.map((part) => (part === oldName ? newName : part))
        return pairKey(newParts[0], newParts[1])
    })
}

function renameAdvancedPairRows(rows, oldName, newName) {
    if (!Array.isArray(rows)) {
        return
    }
    for (const row of rows) {
        if (!Array.isArray(row)) {
            continue
        }
        const nextRow = row.map((value) => (value === oldName ? newName : value))
        row.splice(0, row.length, ...nextRow)
    }
}

function renameAdvancedSettings(advanced, oldName, newName) {
    if (!advanced) {
        return
    }
    renameAdvancedPairRows(advanced.singlesOpeningMatchups, oldName, newName)
    renameAdvancedPairRows(advanced.doublesLockedPairs, oldName, newName)
    renameAdvancedPairRows(advanced.doublesRestrictedTeams, oldName, newName)
    renameAdvancedPairRows(advanced.doublesByeTeams, oldName, newName)
    renameAdvancedPairRows(advanced.doublesNextUpTeams, oldName, newName)
    renameInPlayerList(advanced.singlesByePlayers || [], oldName, newName)
    renameInPlayerList(advanced.singlesNextUpPlayers || [], oldName, newName)
    if (advanced.forcedSitOutPlayer === oldName) {
        advanced.forcedSitOutPlayer = newName
    }
}

function renameRemixPayload(remix, oldName, newName) {
    if (!remix) {
        return
    }
    if (Array.isArray(remix.players)) {
        renameInPlayerList(remix.players, oldName, newName)
    }
    renameAdvancedSettings(remix.tournamentConfig?.advanced, oldName, newName)
}

function renameSessionRecord(session, oldName, newName) {
    if (!session) {
        return
    }

    if (Array.isArray(session.players)) {
        renameInPlayerList(session.players, oldName, newName)
    }
    if (Array.isArray(session.rounds)) {
        renameInRounds(session.rounds, oldName, newName)
    }
    renameTeamObjects(session.teams, oldName, newName)
    if (session.tournamentSeries) {
        renameInTournamentSeries(session.tournamentSeries, oldName, newName)
    }
    renameAdvancedSettings(session.tournamentConfig?.advanced, oldName, newName)
    session.usedPairs = renameUsedPairs(session.usedPairs, oldName, newName)
    renameRemixPayload(session.remix, oldName, newName)
}

function renameSessionCollection(sessions, oldName, newName) {
    if (!Array.isArray(sessions)) {
        return
    }

    for (const session of sessions) {
        renameSessionRecord(session, oldName, newName)
    }
}

function syncAddButton() {
    addPlayerBtn.disabled = !playerNameInput.value.trim()
}

function initRoster(state, persistFn, confirmFn) {
    globalState = state
    saveState = persistFn
    askConfirm = confirmFn

    addPlayerBtn.addEventListener("click", addPlayer)
    playerNameInput.addEventListener("input", syncAddButton)
    playerNameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            addPlayer()
        }
    })
    syncAddButton()

    renameCancelBtn.addEventListener("click", () => renameDialog.close())
    renameConfirmBtn.addEventListener("click", commitRename)
    renameInput.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
            commitRename()
        }
    })
}

function refreshRoster() {
    renderRoster(globalState.roster, rosterList, rosterEmpty, {
        onRename: openRenameDialog,
        onDelete: openDeletePlayerDialog,
    })
}

function addPlayer() {
    const name = playerNameInput.value.trim()
    if (!name) {
        return
    }

    const duplicate = globalState.roster.some((p) => p.toLowerCase() === name.toLowerCase())
    if (duplicate) {
        showFieldError(playerError, "That name is already on the roster.")
        return
    }

    globalState.roster.push(name)
    globalState.roster.sort((a, b) => a.localeCompare(b))
    saveState()
    playerNameInput.value = ""
    syncAddButton()
    playerNameInput.focus()
    hideFieldError(playerError)
    refreshRoster()
}

function openRenameDialog(index, currentName) {
    renameIndex = index
    renameInput.value = currentName
    hideFieldError(renameError)
    renameDialog.showModal()
    renameInput.focus()
    renameInput.select()
}

function commitRename() {
    const newName = renameInput.value.trim()
    if (!newName || renameIndex < 0 || renameIndex >= globalState.roster.length) {
        return
    }

    const oldName = globalState.roster[renameIndex]
    if (newName === oldName) {
        renameDialog.close()
        return
    }

    const duplicate = globalState.roster.some((p, i) => i !== renameIndex && p.toLowerCase() === newName.toLowerCase())
    if (duplicate) {
        showFieldError(renameError, "That name is already taken.")
        return
    }

    globalState.roster[renameIndex] = newName
    globalState.roster.sort((a, b) => a.localeCompare(b))
    updateSessionsWithNewName(oldName, newName)

    saveState()
    refreshRoster()
    renameDialog.close()
}

function updateSessionsWithNewName(oldName, newName) {
    renameSessionRecord(globalState.activeSession, oldName, newName)
    renameSessionCollection(globalState.history, oldName, newName)
    renameSessionCollection(globalState.archivedHistory, oldName, newName)
}

function openDeletePlayerDialog(index, name) {
    const activeSessionIncludesPlayer = globalState.activeSession?.players.includes(name) === true
    const message = activeSessionIncludesPlayer
        ? `Remove "${name}" from the roster?\nThis will also end the active session because its saved schedule can no longer be reconciled safely.`
        : `Remove "${name}" from the roster?`

    askConfirm("Remove Player", message, () => {
        const [removed] = globalState.roster.splice(index, 1)
        if (activeSessionIncludesPlayer && globalState.activeSession?.players.includes(removed)) {
            globalState.activeSession = null
        }
        saveState()
        refreshRoster()
    })
}

export { initRoster, refreshRoster }
