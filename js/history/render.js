import { buildHistoryCardHeader, formatDate } from "./render-header.js"
import { buildHistoryCardBody } from "./render-rounds.js"

export function renderHistory(history, container, emptyState, onDelete) {
    container.textContent = ""

    if (history.length === 0) {
        container.hidden = true
        emptyState.hidden = false
        return
    }

    container.hidden = false
    emptyState.hidden = true

    const sorted = [...history].reverse()

    for (const session of sorted) {
        const card = document.createElement("div")
        card.className = "history-card"

        const dateStr = formatDate(session.date)
        const headerEl = buildHistoryCardHeader(session, dateStr)
        const body = buildHistoryCardBody(session, onDelete)

        headerEl.addEventListener("click", () => {
            card.classList.toggle("expanded")
        })

        card.appendChild(headerEl)
        card.appendChild(body)
        container.appendChild(card)
    }
}
