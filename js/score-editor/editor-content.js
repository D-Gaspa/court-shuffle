import { buildSetRow } from "./set-row.js"
import { isComplete } from "./sets.js"

function createActionBtn(label, extraClass, onClick) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `btn btn-ghost btn-sm ${extraClass}`.trim()
    btn.textContent = label
    btn.addEventListener("click", onClick)
    return btn
}

function createSaveBtn(onSave) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "btn btn-accent btn-sm"
    btn.textContent = "Save"
    btn.addEventListener("click", onSave)
    return btn
}

function updateControls({ draft, maxSets, addSetBtn, saveBtn }) {
    saveBtn.disabled = !isComplete(draft)
    addSetBtn.disabled = draft.length >= maxSets
}

function renderRows({ rows, draft, onAnyUpdate, onRemoveAt }) {
    rows.textContent = ""
    for (let i = 0; i < draft.length; i += 1) {
        rows.appendChild(
            buildSetRow({
                setIndex: i,
                pair: draft[i],
                canRemove: draft.length > 1,
                onChange: (next) => {
                    draft[i] = next
                },
                onAnyUpdate,
                onRemove: () => onRemoveAt(i),
            }),
        )
    }
}

function buildFooter({ draft, commitAndClose, revertAndClose }) {
    const footer = document.createElement("div")
    footer.className = "result-editor-actions"

    footer.appendChild(createActionBtn("Clear", "btn-danger", () => commitAndClose(null)))
    footer.appendChild(createActionBtn("Cancel", "", revertAndClose))

    const saveBtn = createSaveBtn(() => commitAndClose(draft.map((s) => [...s])))
    footer.appendChild(saveBtn)

    return { footer, saveBtn }
}

export function buildEditorContent({ draft, maxSets, commitAndClose, revertAndClose }) {
    const container = document.createElement("div")
    const rows = document.createElement("div")
    rows.className = "set-rows"

    const { footer, saveBtn } = buildFooter({ draft, commitAndClose, revertAndClose })

    const sync = () => updateControls({ draft, maxSets, addSetBtn, saveBtn })
    const onRemoveAt = (i) => {
        draft.splice(i, 1)
        renderRows({ rows, draft, onAnyUpdate: sync, onRemoveAt })
        sync()
    }

    const addSetBtn = createActionBtn("Add set", "add-set-btn", () => {
        if (draft.length < maxSets) {
            draft.push([null, null])
            renderRows({ rows, draft, onAnyUpdate: sync, onRemoveAt })
            sync()
        }
    })

    renderRows({ rows, draft, onAnyUpdate: sync, onRemoveAt })
    sync()

    container.appendChild(rows)
    container.appendChild(addSetBtn)
    container.appendChild(footer)
    return container
}
