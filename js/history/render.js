import { createAnalyticsQueryPanel } from "../analytics/view.js"
import { hasLinkedNightGroups, renderGroupedHistoryCards } from "./render-night-groups.js"
import { isMultiPhaseHistorySession } from "./session-phases.js"

function renderHistorySection({ title, subtitle, sessions, container, actions, groupActions }) {
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
    renderGroupedHistoryCards({ actions, groupActions, list, sessions })
    section.appendChild(list)
    container.appendChild(section)
}

function createSummaryPill(text) {
    const pill = document.createElement("span")
    pill.className = "history-query-pill"
    pill.textContent = text
    return pill
}

function buildHistorySectionSubtitle(timeLabelText, sessions) {
    const hasMultiPhase = sessions.some((session) => isMultiPhaseHistorySession(session))
    const hasLinkedNights = hasLinkedNightGroups(sessions)
    if (!(hasMultiPhase || hasLinkedNights)) {
        return timeLabelText
    }
    if (hasMultiPhase && hasLinkedNights) {
        return `${timeLabelText} Continued nights and linked nights stay grouped together.`
    }
    if (hasLinkedNights) {
        return `${timeLabelText} Linked nights stay grouped together.`
    }
    return `${timeLabelText} Continued nights stay grouped under one saved session.`
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
    if (analytics.filteredSessions.some((session) => isMultiPhaseHistorySession(session))) {
        summary.appendChild(createSummaryPill("Includes continuation phases"))
    }
    if (hasLinkedNightGroups(analytics.filteredSessions)) {
        summary.appendChild(createSummaryPill("Includes linked nights"))
    }
    container.appendChild(summary)

    renderHistorySection({
        title: hasArchived ? "Saved Sessions" : "Session History",
        subtitle: buildHistorySectionSubtitle(analytics?.summary?.timeLabel || "", analytics.filteredSessions),
        sessions: analytics.filteredSessions,
        container,
        actions: actions.active,
        groupActions: actions.activeGroup,
    })

    if (hasArchived) {
        renderHistorySection({
            title: "Archived Sessions",
            subtitle: "Kept outside the shared analytics query until restored.",
            sessions: archivedHistory,
            container,
            actions: actions.archived,
            groupActions: actions.archivedGroup,
        })
    }
}

export { renderHistory }
