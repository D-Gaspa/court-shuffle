import { loadState, saveState } from "./core/storage.js"
import { renderHistory } from "./history/render.js"
import { initRoster, refreshRoster } from "./roster/controller.js"
import { initSession, refreshSessionView } from "./session/controller.js"
import { renderStats } from "./stats/render.js"

const state = loadState()
state.roster.sort((a, b) => a.localeCompare(b))

const tabs = document.querySelectorAll(".tab")
const views = {
    roster: document.getElementById("view-roster"),
    session: document.getElementById("view-session"),
    stats: document.getElementById("view-stats"),
    history: document.getElementById("view-history"),
}

const historyList = document.getElementById("history-list")
const historyEmpty = document.getElementById("history-empty")
const statsRoot = document.getElementById("stats-root")

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
    } else if (viewName === "stats") {
        refreshStats()
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
    renderHistory({
        history: state.history,
        archivedHistory: state.archivedHistory,
        container: historyList,
        emptyState: historyEmpty,
        actions: {
            active: [
                {
                    label: "Archive Session",
                    className: "btn btn-ghost btn-sm btn-danger",
                    onClick: (session) => {
                        showConfirmDialog("Archive Session", "Move this session into the archive?", () => {
                            state.history = state.history.filter((entry) => entry.id !== session.id)
                            state.archivedHistory.unshift(session)
                            persist()
                            refreshHistory()
                        })
                    },
                },
            ],
            archived: [
                {
                    label: "Restore",
                    className: "btn btn-ghost btn-sm",
                    onClick: (session) => {
                        state.archivedHistory = state.archivedHistory.filter((entry) => entry.id !== session.id)
                        state.history.push(session)
                        persist()
                        refreshHistory()
                    },
                },
                {
                    label: "Delete Permanently",
                    className: "btn btn-ghost btn-sm btn-danger",
                    onClick: (session) => {
                        showConfirmDialog("Delete Permanently", "Remove this archived session for good?", () => {
                            state.archivedHistory = state.archivedHistory.filter((entry) => entry.id !== session.id)
                            persist()
                            refreshHistory()
                        })
                    },
                },
            ],
        },
    })
}

function refreshStats() {
    renderStats(state.history, statsRoot)
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
