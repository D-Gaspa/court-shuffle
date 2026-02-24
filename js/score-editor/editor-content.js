import { buildSetRow } from "./set-row.js"

function createActionBtn(label, extraClass, onClick) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `btn btn-ghost btn-sm ${extraClass}`.trim()
    btn.textContent = label
    btn.addEventListener("click", onClick)
    return btn
}

function renderRows({ rows, draft, tiebreaks, onAnyUpdate, onRemoveAt, onAutoSave }) {
    rows.textContent = ""
    let lastRow = null
    for (let i = 0; i < draft.length; i += 1) {
        const pair = draft[i]
        // Attach tiebreak metadata if present
        if (tiebreaks[i]) {
            pair[2] = { tb: [...tiebreaks[i]] }
        } else if (pair.length > 2) {
            pair.splice(2)
        }
        const row = buildSetRow({
            setIndex: i,
            pair,
            canRemove: draft.length > 1,
            onChange: (next) => {
                draft[i] = next
            },
            onAnyUpdate,
            onAutoSave,
            onRemove: () => onRemoveAt(i),
            onTiebreakChange: (tbPair) => {
                tiebreaks[i] = tbPair
            },
        })
        rows.appendChild(row)
        lastRow = row
    }
    return lastRow
}

export function buildEditorContent({ draft, tiebreaks, maxSets, onAutoSave, onClear }) {
    const container = document.createElement("div")
    const rows = document.createElement("div")
    rows.className = "set-rows"

    const getAddSetLabel = () => {
        if (draft.length >= maxSets) {
            return `Max ${maxSets} sets reached`
        }
        return "+ Add set"
    }

    const sync = () => {
        addSetBtn.disabled = draft.length >= maxSets
        addSetBtn.textContent = getAddSetLabel()
    }

    const onRemoveAt = (i) => {
        draft.splice(i, 1)
        tiebreaks.splice(i, 1)
        renderRows({ rows, draft, tiebreaks, onAnyUpdate: sync, onRemoveAt, onAutoSave })
        sync()
        onAutoSave?.()
    }

    const addSetBtn = createActionBtn(getAddSetLabel(), "add-set-btn", () => {
        if (draft.length < maxSets) {
            draft.push([null, null])
            tiebreaks.push(null)
            const lastRow = renderRows({ rows, draft, tiebreaks, onAnyUpdate: sync, onRemoveAt, onAutoSave })
            sync()
            if (lastRow?.focusFirst) {
                lastRow.focusFirst()
            }
        }
    })

    const lastRow = renderRows({ rows, draft, tiebreaks, onAnyUpdate: sync, onRemoveAt, onAutoSave })
    sync()

    // Auto-focus first input when opening with empty score
    if (draft.length === 1 && draft[0][0] === null && draft[0][1] === null && lastRow?.focusFirst) {
        requestAnimationFrame(() => lastRow.focusFirst())
    }

    container.appendChild(rows)

    const bottomBar = document.createElement("div")
    bottomBar.className = "editor-bottom-bar"
    bottomBar.appendChild(addSetBtn)

    const clearLink = createActionBtn("Clear score", "clear-link btn-danger", () => {
        onClear()
    })
    bottomBar.appendChild(clearLink)

    container.appendChild(bottomBar)
    return container
}
