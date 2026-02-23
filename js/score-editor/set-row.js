import { iconButton } from "./dom.js"
import { ICON_CHECK, ICON_EDIT, ICON_TRASH } from "./icons.js"
import { parseScoreValue } from "./sets.js"

function createLabel(setIndex) {
    const label = document.createElement("div")
    label.className = "set-label"
    label.textContent = `Set ${setIndex + 1}`
    return label
}

function createScoreInput(value) {
    const input = document.createElement("input")
    input.type = "number"
    input.min = "0"
    input.className = "set-input"
    input.placeholder = "-"
    if (value !== null) {
        input.value = String(value)
    }
    return input
}

function createDash() {
    const dash = document.createElement("span")
    dash.className = "set-dash"
    dash.textContent = ":"
    return dash
}

function wireInputs({ a, b, onChange, onAnyUpdate }) {
    function emit() {
        onChange([parseScoreValue(a.value), parseScoreValue(b.value)])
        onAnyUpdate()
    }
    a.addEventListener("input", () => {
        emit()
        if (a.value !== "") {
            b.focus()
            b.select?.()
        }
    })
    b.addEventListener("input", () => {
        emit()
        if (b.value !== "") {
            b.blur()
        }
    })
}

function createActions({ setIndex, canRemove, onRemove, onToggleEdit }) {
    const actions = document.createElement("div")
    actions.className = "set-actions"

    const edit = iconButton({
        className: "set-edit",
        label: `Edit set ${setIndex + 1}`,
        svg: ICON_EDIT,
        onClick: onToggleEdit,
    })

    const del = iconButton({
        className: "set-delete",
        label: `Delete set ${setIndex + 1}`,
        svg: ICON_TRASH,
        onClick: onRemove,
    })
    del.disabled = !canRemove

    actions.appendChild(edit)
    actions.appendChild(del)
    return { actions, edit }
}

function setEditingState({ row, a, b, editBtn, setIndex, editing }) {
    row.classList.toggle("is-editing", editing)
    a.disabled = !editing
    b.disabled = !editing
    editBtn.innerHTML = editing ? ICON_CHECK : ICON_EDIT

    const label = editing ? `Done editing set ${setIndex + 1}` : `Edit set ${setIndex + 1}`
    editBtn.title = label
    editBtn.setAttribute("aria-label", label)

    if (editing) {
        a.focus()
        a.select?.()
    }
}

export function buildSetRow({ setIndex, pair, onChange, onRemove, canRemove, onAnyUpdate }) {
    const row = document.createElement("div")
    row.className = "set-row"

    const left = document.createElement("div")
    left.className = "set-left"

    const fields = document.createElement("div")
    fields.className = "set-fields"

    const a = createScoreInput(pair[0])
    const b = createScoreInput(pair[1])
    fields.appendChild(a)
    fields.appendChild(createDash())
    fields.appendChild(b)

    left.appendChild(createLabel(setIndex))
    left.appendChild(fields)

    let editing = pair[0] === null && pair[1] === null
    const { actions, edit } = createActions({
        setIndex,
        canRemove,
        onRemove,
        onToggleEdit: () => {
            editing = !editing
            setEditingState({ row, a, b, editBtn: edit, setIndex, editing })
        },
    })

    wireInputs({ a, b, onChange, onAnyUpdate })
    row.appendChild(left)
    row.appendChild(actions)

    setEditingState({ row, a, b, editBtn: edit, setIndex, editing })
    return row
}
