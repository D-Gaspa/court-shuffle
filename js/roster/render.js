/**
 * Roster management module — handles the player list UI and interactions.
 */

const AVATAR_COLOR_COUNT = 8
const MAX_STAGGER_INDEX = 8
const WHITESPACE_PATTERN = /\s+/
const MIN_INITIALS_PARTS = 2

const RENAME_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>'

const DELETE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'

function getAvatarClass(index) {
    return `avatar-${index % AVATAR_COLOR_COUNT}`
}

function getInitials(name) {
    const parts = name.trim().split(WHITESPACE_PATTERN)
    if (parts.length >= MIN_INITIALS_PARTS) {
        return parts[0][0] + parts[1][0]
    }
    return name.slice(0, MIN_INITIALS_PARTS)
}

function escapeHtml(str) {
    const el = document.createElement("span")
    el.textContent = str
    return el.innerHTML
}

/**
 * Build a single roster item DOM element.
 */
function buildRosterItem(player, index, callbacks) {
    const item = document.createElement("div")
    item.className = `roster-item stagger-${Math.min(index, MAX_STAGGER_INDEX)}`

    const avatar = document.createElement("div")
    avatar.className = `player-avatar ${getAvatarClass(index)}`
    avatar.textContent = getInitials(player)

    const nameSpan = document.createElement("span")
    nameSpan.className = "player-name"
    nameSpan.textContent = player

    const actions = document.createElement("div")
    actions.className = "player-actions"

    const renameBtn = document.createElement("button")
    renameBtn.type = "button"
    renameBtn.className = "rename-btn"
    renameBtn.setAttribute("aria-label", `Rename ${escapeHtml(player)}`)
    renameBtn.title = "Rename"
    renameBtn.innerHTML = RENAME_SVG

    const deleteBtn = document.createElement("button")
    deleteBtn.type = "button"
    deleteBtn.className = "delete-btn"
    deleteBtn.setAttribute("aria-label", `Remove ${escapeHtml(player)}`)
    deleteBtn.title = "Remove"
    deleteBtn.innerHTML = DELETE_SVG

    renameBtn.addEventListener("click", () => callbacks.onRename(index, player))
    deleteBtn.addEventListener("click", () => callbacks.onDelete(index, player))

    actions.appendChild(renameBtn)
    actions.appendChild(deleteBtn)
    item.appendChild(avatar)
    item.appendChild(nameSpan)
    item.appendChild(actions)

    return item
}

/**
 * Render the full roster list into the container.
 */
function renderRoster(roster, container, emptyState, callbacks) {
    container.textContent = ""

    if (roster.length === 0) {
        container.hidden = true
        emptyState.hidden = false
        return
    }

    container.hidden = false
    emptyState.hidden = true

    let i = 0
    while (i < roster.length) {
        container.appendChild(buildRosterItem(roster[i], i, callbacks))
        i += 1
    }
}

export { getAvatarClass, getInitials, renderRoster }
