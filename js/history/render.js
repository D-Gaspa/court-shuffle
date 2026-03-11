import { buildHistoryCardHeader, formatDate } from "./render-header.js"
import { buildHistoryCardBody } from "./render-rounds.js"

function renderHistorySection({ title, sessions, container, actions }) {
    if (sessions.length === 0) {
        return
    }

    const section = document.createElement("section")
    section.className = "history-section"

    const heading = document.createElement("div")
    heading.className = "history-section-header"
    heading.textContent = title
    section.appendChild(heading)

    const list = document.createElement("div")
    list.className = "history-list"

    for (const session of [...sessions].reverse()) {
        const card = document.createElement("div")
        card.className = "history-card"

        const dateStr = formatDate(session.date)
        const headerEl = buildHistoryCardHeader(session, dateStr)
        const body = buildHistoryCardBody(session, actions)

        headerEl.addEventListener("click", () => {
            card.classList.toggle("expanded")
        })

        card.appendChild(headerEl)
        card.appendChild(body)
        list.appendChild(card)
    }

    section.appendChild(list)
    container.appendChild(section)
}

export function renderHistory({ history, archivedHistory, container, emptyState, actions }) {
    container.textContent = ""

    const hasHistory = history.length > 0
    const hasArchived = archivedHistory.length > 0
    if (!(hasHistory || hasArchived)) {
        container.hidden = true
        emptyState.hidden = false
        return
    }

    container.hidden = false
    emptyState.hidden = true

    renderHistorySection({
        title: hasArchived ? "Saved Sessions" : "Session History",
        sessions: history,
        container,
        actions: actions.active,
    })
    renderHistorySection({
        title: "Archived Sessions",
        sessions: archivedHistory,
        container,
        actions: actions.archived,
    })
}
