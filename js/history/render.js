import { createAnalyticsQueryPanel } from "../analytics/view.js"
import { buildHistoryCardHeader, formatDate } from "./render-header.js"
import { buildHistoryCardBody } from "./render-rounds.js"

function renderHistorySection({ title, subtitle, sessions, container, actions }) {
    const section = document.createElement("section")
    section.className = "history-section"

    const heading = document.createElement("div")
    heading.className = "history-section-header"
    heading.textContent = title
    section.appendChild(heading)

    if (subtitle) {
        const note = document.createElement("p")
        note.className = "history-section-note"
        note.textContent = subtitle
        section.appendChild(note)
    }

    if (sessions.length === 0) {
        const empty = document.createElement("div")
        empty.className = "history-query-empty"
        empty.innerHTML =
            "<strong>No sessions match this query.</strong><span>Adjust filters or reset the shared query.</span>"
        section.appendChild(empty)
        container.appendChild(section)
        return
    }

    const list = document.createElement("div")
    list.className = "history-list"

    for (const session of [...sessions].reverse()) {
        const card = document.createElement("div")
        card.className = "history-card"

        const dateStr = formatDate(session.date)
        const headerEl = buildHistoryCardHeader(session, dateStr)
        const sessionActions = typeof actions === "function" ? actions(session) : actions
        const body = buildHistoryCardBody(session, sessionActions)

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

function renderHistory({
    history,
    archivedHistory,
    container,
    emptyState,
    actions,
    analytics,
    onQueryChange,
    onResetQuery,
}) {
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

    container.appendChild(
        createAnalyticsQueryPanel({
            title: "History Filters",
            subtitle: "Filter saved sessions and keep the scouting dossier in sync.",
            query: analytics.query,
            options: analytics.options,
            summary: analytics.summary,
            onQueryChange,
            onResetQuery,
            idPrefix: "history",
        }),
    )

    const summary = document.createElement("div")
    summary.className = "history-query-summary"
    summary.appendChild(createSummaryPill(analytics.summary.resultSummary))
    summary.appendChild(createSummaryPill("Active history only"))
    container.appendChild(summary)

    renderHistorySection({
        title: hasArchived ? "Saved Sessions" : "Session History",
        subtitle: analytics.summary.timeLabel,
        sessions: analytics.filteredSessions,
        container,
        actions: actions.active,
    })

    if (hasArchived) {
        renderHistorySection({
            title: "Archived Sessions",
            subtitle: "Kept outside the shared analytics query until restored.",
            sessions: archivedHistory,
            container,
            actions: actions.archived,
        })
    }
}

function createSummaryPill(text) {
    const pill = document.createElement("span")
    pill.className = "history-query-pill"
    pill.textContent = text
    return pill
}

export { renderHistory }
