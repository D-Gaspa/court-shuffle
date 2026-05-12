import { buildHistoryActionRow } from "./action-buttons.js"
import { buildHistoryCardMeta, formatDate } from "./card-header.js"
import { buildHistoryCardBody } from "./card-rounds.js"

function isDialogBackdropClick(event, dialog) {
    const rect = dialog.getBoundingClientRect()
    return (
        event.clientX < rect.left ||
        event.clientX > rect.right ||
        event.clientY < rect.top ||
        event.clientY > rect.bottom
    )
}

function renderDialogActions({ actionsContainer, dialog, session, sessionActions }) {
    actionsContainer.replaceChildren()
    const row = buildHistoryActionRow(session, sessionActions, {
        beforeAction: () => dialog.close(),
    })
    actionsContainer.hidden = !row
    if (!row) {
        return
    }

    actionsContainer.appendChild(row)
}

function createHistorySessionDialogController(elements) {
    const { actions, body, closeButton, dialog, kicker, meta, title } = elements
    let currentSession = null

    function clear() {
        currentSession = null
        body.replaceChildren()
        actions.replaceChildren()
    }

    function show(session, sessionActions = []) {
        if (!session) {
            return
        }
        currentSession = session
        kicker.textContent = session.provisional ? "Live Session" : "Saved Session"
        title.textContent = formatDate(session.date)
        meta.textContent = buildHistoryCardMeta(session)
        body.replaceChildren(buildHistoryCardBody(session, [], { includeActions: false }))
        renderDialogActions({ actionsContainer: actions, dialog, session, sessionActions })
        document.body.classList.add("has-modal-open")
        dialog.showModal()
    }

    function setup() {
        closeButton.addEventListener("click", () => dialog.close())
        dialog.addEventListener("click", (event) => {
            if (isDialogBackdropClick(event, dialog)) {
                dialog.close()
            }
        })
        dialog.addEventListener("close", () => {
            document.body.classList.remove("has-modal-open")
            clear()
        })
    }

    return {
        getCurrentSession: () => currentSession,
        setup,
        show,
    }
}

export { createHistorySessionDialogController }
