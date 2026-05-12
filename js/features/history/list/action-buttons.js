function buildHistoryActionButton(action, target, options = {}) {
    const button = document.createElement("button")
    button.type = "button"
    button.className = [action.className, options.extraClass].filter(Boolean).join(" ")
    button.textContent = action.label
    button.addEventListener("click", (event) => {
        if (options.stopPropagation) {
            event.stopPropagation()
        }
        options.beforeAction?.()
        action.onClick(target)
    })
    return button
}

function buildHistoryActionRow(target, actions, options = {}) {
    if (!Array.isArray(actions) || actions.length === 0) {
        return null
    }

    const row = document.createElement("div")
    row.className = options.rowClassName || "history-actions"
    for (const action of actions) {
        row.appendChild(buildHistoryActionButton(action, target, options))
    }
    return row
}

export { buildHistoryActionButton, buildHistoryActionRow }
