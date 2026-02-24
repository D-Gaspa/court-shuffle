import { pairKey } from "../shuffle/core.js"
import {
    hideFieldError,
    renameInPlayerList,
    renameInRounds,
    renameInTournamentSeries,
    showFieldError,
} from "../utils.js"
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
    if (globalState.activeSession) {
        renameInPlayerList(globalState.activeSession.players, oldName, newName)
        renameInRounds(globalState.activeSession.rounds, oldName, newName)
        renameTeamObjects(globalState.activeSession.teams, oldName, newName)
        if (globalState.activeSession.tournamentSeries) {
            renameInTournamentSeries(globalState.activeSession.tournamentSeries, oldName, newName)
        }
        if (globalState.activeSession.usedPairs) {
            globalState.activeSession.usedPairs = globalState.activeSession.usedPairs.map((pk) => {
                const parts = pk.split("||")
                const newParts = parts.map((p) => (p === oldName ? newName : p))
                return pairKey(newParts[0], newParts[1])
            })
        }
    }

    for (const session of globalState.history) {
        renameInPlayerList(session.players, oldName, newName)
        renameInRounds(session.rounds, oldName, newName)
        renameTeamObjects(session.teams, oldName, newName)
        if (session.tournamentSeries) {
            renameInTournamentSeries(session.tournamentSeries, oldName, newName)
        }
    }
}

function openDeletePlayerDialog(index, name) {
    askConfirm(
        "Remove Player",
        `Remove "${name}" from the roster?\nThey'll also be removed from any active session.`,
        () => {
            const [removed] = globalState.roster.splice(index, 1)
            if (globalState.activeSession) {
                globalState.activeSession.players = globalState.activeSession.players.filter((p) => p !== removed)
            }
            saveState()
            refreshRoster()
        },
    )
}

export { initRoster, refreshRoster }
