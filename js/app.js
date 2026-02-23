import { renderHistory } from "./history/render.js"
import { initRoster, refreshRoster } from "./roster/controller.js"
import { initSession, refreshSessionView } from "./session/controller.js"
import { loadState, saveState } from "./storage.js"

const state = loadState()
state.roster.sort((a, b) => a.localeCompare(b))

const tabs = document.querySelectorAll(".tab")
const views = {
    roster: document.getElementById("view-roster"),
    session: document.getElementById("view-session"),
    history: document.getElementById("view-history"),
}

const historyList = document.getElementById("history-list")
const historyEmpty = document.getElementById("history-empty")

const confirmDialog = document.getElementById("confirm-dialog")
const confirmTitle = document.getElementById("confirm-title")
const confirmMessage = document.getElementById("confirm-message")
const confirmCancelBtn = document.getElementById("confirm-cancel")
const confirmExtraBtn = document.getElementById("confirm-extra")
const confirmOkBtn = document.getElementById("confirm-ok")

let confirmCallback = null
let confirmExtraCallback = null

function persist() {
    saveState(state)
}

function switchView(viewName) {
    for (const tab of tabs) {
        const isActive = tab.dataset.view === viewName
        tab.classList.toggle("active", isActive)
        tab.setAttribute("aria-selected", String(isActive))
    }
    for (const [key, el] of Object.entries(views)) {
        el.classList.toggle("active", key === viewName)
    }

    if (viewName === "roster") {
        refreshRoster()
    } else if (viewName === "session") {
        refreshSessionView()
    } else if (viewName === "history") {
        refreshHistory()
    }
}

function setupTabs() {
    for (const tab of tabs) {
        tab.addEventListener("click", () => switchView(tab.dataset.view))
    }
}

function showConfirmDialog(title, message, onOk, options = {}) {
    confirmTitle.textContent = title
    confirmMessage.textContent = message
    confirmCallback = onOk
    confirmOkBtn.textContent = options.okLabel ?? "Confirm"
    confirmOkBtn.className = `btn ${options.okClass ?? "btn-danger"}`
    if (options.extraLabel && options.onExtra) {
        confirmExtraBtn.textContent = options.extraLabel
        confirmExtraCallback = options.onExtra
        confirmExtraBtn.hidden = false
    } else {
        confirmExtraBtn.hidden = true
        confirmExtraCallback = null
    }
    confirmDialog.showModal()
}

function setupConfirmDialog() {
    confirmCancelBtn.addEventListener("click", () => {
        confirmDialog.close()
        confirmCallback = null
        confirmExtraCallback = null
    })

    confirmExtraBtn.addEventListener("click", () => {
        if (confirmExtraCallback) {
            confirmExtraCallback()
        }
        confirmDialog.close()
        confirmCallback = null
        confirmExtraCallback = null
    })

    confirmOkBtn.addEventListener("click", () => {
        if (confirmCallback) {
            confirmCallback()
        }
        confirmDialog.close()
        confirmCallback = null
        confirmExtraCallback = null
    })
}

function refreshHistory() {
    renderHistory(state.history, historyList, historyEmpty, (sessionId) => {
        showConfirmDialog("Delete Session", "Permanently delete this session from history?", () => {
            state.history = state.history.filter((s) => s.id !== sessionId)
            persist()
            refreshHistory()
        })
    })
}

function init() {
    setupTabs()
    setupConfirmDialog()
    initRoster(state, persist, showConfirmDialog)
    initSession(state, persist, showConfirmDialog)

    refreshRoster()
    if (state.activeSession) {
        switchView("session")
    }
}

init()

export { showConfirmDialog }
