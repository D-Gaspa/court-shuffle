const MAX_SETS = 5
const FLASH_DURATION_MS = 1200

function normalizeSets(entry) {
    if (!entry) {
        return null
    }
    if (entry.sets && Array.isArray(entry.sets)) {
        return entry.sets
    }
    if (entry.score && Array.isArray(entry.score)) {
        return [entry.score]
    }
    return null
}

function formatSets(sets) {
    return sets.map((s) => `${s[0]}–${s[1]}`).join(", ")
}

function cloneSets(sets) {
    return sets.map((s) => [s[0], s[1]])
}

function parseScoreValue(raw) {
    if (raw === "") {
        return null
    }
    const n = Number(raw)
    if (!Number.isFinite(n) || n < 0) {
        return null
    }
    return Math.floor(n)
}

function isComplete(sets) {
    for (const [a, b] of sets) {
        if (a === null || b === null) {
            return false
        }
    }
    return sets.length > 0
}

const EDIT_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>'

const CHECK_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M20 6 9 17l-5-5"/></svg>'

const DELETE_SVG =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>'

function iconBtn({ className, label, svg, onClick }) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `btn-icon ${className}`.trim()
    btn.setAttribute("aria-label", label)
    btn.title = label
    btn.innerHTML = svg
    btn.addEventListener("click", onClick)
    return btn
}

function buildSetRow({ setIndex, pair, onChange, onRemove, canRemove, onAnyUpdate }) {
    const row = document.createElement("div")
    row.className = "set-row"

    const left = document.createElement("div")
    left.className = "set-left"

    const label = document.createElement("div")
    label.className = "set-label"
    label.textContent = `Set ${setIndex + 1}`

    const fields = document.createElement("div")
    fields.className = "set-fields"

    const a = document.createElement("input")
    a.type = "number"
    a.min = "0"
    a.className = "set-input"
    a.placeholder = "-"
    if (pair[0] !== null) {
        a.value = String(pair[0])
    }

    const dash = document.createElement("span")
    dash.className = "set-dash"
    dash.textContent = ":"

    const b = document.createElement("input")
    b.type = "number"
    b.min = "0"
    b.className = "set-input"
    b.placeholder = "-"
    if (pair[1] !== null) {
        b.value = String(pair[1])
    }

    fields.appendChild(a)
    fields.appendChild(dash)
    fields.appendChild(b)

    left.appendChild(label)
    left.appendChild(fields)

    const actions = document.createElement("div")
    actions.className = "set-actions"

    let editing = pair[0] === null && pair[1] === null

    const edit = iconBtn({
        className: "set-edit",
        label: `Edit set ${setIndex + 1}`,
        svg: EDIT_SVG,
        onClick: () => setEditing(!editing),
    })

    const del = iconBtn({
        className: "set-delete",
        label: `Delete set ${setIndex + 1}`,
        svg: DELETE_SVG,
        onClick: onRemove,
    })
    del.disabled = !canRemove

    actions.appendChild(edit)
    actions.appendChild(del)

    function emit() {
        onChange([parseScoreValue(a.value), parseScoreValue(b.value)])
        onAnyUpdate()
    }

    a.addEventListener("input", emit)
    b.addEventListener("input", emit)

    function setEditing(next) {
        editing = next
        row.classList.toggle("is-editing", editing)
        a.disabled = !editing
        b.disabled = !editing
        edit.innerHTML = editing ? CHECK_SVG : EDIT_SVG
        edit.title = editing ? `Done editing set ${setIndex + 1}` : `Edit set ${setIndex + 1}`
        edit.setAttribute("aria-label", editing ? `Done editing set ${setIndex + 1}` : `Edit set ${setIndex + 1}`)

        if (editing) {
            a.focus()
            a.select?.()
        }
    }

    // Initialize view/edit state
    setEditing(editing)

    row.appendChild(left)
    row.appendChild(actions)
    return row
}

function _buildSetRowsList({ draft, onUpdate, onRemove }) {
    const rows = document.createElement("div")
    rows.className = "set-rows"
    for (let i = 0; i < draft.length; i += 1) {
        rows.appendChild(
            buildSetRow({
                setIndex: i,
                pair: draft[i],
                onChange: (next) => onUpdate(i, next),
                onRemove: () => onRemove(i),
                canRemove: draft.length > 1,
            }),
        )
    }
    return rows
}

function createActionBtn(label, extraClass, onClick) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = `btn btn-ghost btn-sm ${extraClass}`.trim()
    btn.textContent = label
    btn.addEventListener("click", onClick)
    return btn
}

function createSaveBtn(draft, onSave) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "btn btn-accent btn-sm"
    btn.textContent = "Save"
    btn.disabled = !isComplete(draft)
    btn.addEventListener("click", onSave)
    return btn
}

function _buildEditorFooter({ draft, onClear, onCancel, onSave }) {
    const footer = document.createElement("div")
    footer.className = "result-editor-actions"
    footer.appendChild(createActionBtn("Clear", "btn-danger", onClear))
    footer.appendChild(createActionBtn("Cancel", "", onCancel))
    footer.appendChild(createSaveBtn(draft, onSave))
    return footer
}

function buildEditorContent({ draft, commitAndClose, revertAndClose }) {
    const container = document.createElement("div")

    const rows = document.createElement("div")
    rows.className = "set-rows"

    const addSetBtn = createActionBtn("Add set", "add-set-btn", () => {
        if (draft.length < MAX_SETS) {
            draft.push([null, null])
            renderRows()
            updateControls()
        }
    })

    const footer = document.createElement("div")
    footer.className = "result-editor-actions"

    const clearBtn = createActionBtn("Clear", "btn-danger", () => commitAndClose(null))
    const cancelBtn = createActionBtn("Cancel", "", revertAndClose)

    const saveBtn = createSaveBtn(draft, () => commitAndClose(draft.map((s) => [...s])))

    footer.appendChild(clearBtn)
    footer.appendChild(cancelBtn)
    footer.appendChild(saveBtn)

    function updateControls() {
        saveBtn.disabled = !isComplete(draft)
        addSetBtn.disabled = draft.length >= MAX_SETS
    }

    function renderRows() {
        rows.textContent = ""
        for (let i = 0; i < draft.length; i += 1) {
            rows.appendChild(
                buildSetRow({
                    setIndex: i,
                    pair: draft[i],
                    onChange: (next) => {
                        draft[i] = next
                    },
                    onAnyUpdate: updateControls,
                    onRemove: () => {
                        draft.splice(i, 1)
                        renderRows()
                        updateControls()
                    },
                    canRemove: draft.length > 1,
                }),
            )
        }
    }

    renderRows()
    updateControls()

    container.appendChild(rows)
    container.appendChild(addSetBtn)
    container.appendChild(footer)
    return container
}

function updateResultDisplay(elements, sets, editable) {
    const { value, toggleBtn } = elements
    if (sets && sets.length > 0) {
        value.textContent = formatSets(sets)
        value.classList.remove("muted")
        toggleBtn.textContent = editable ? "Edit" : "Score"
    } else {
        value.textContent = "No score"
        value.classList.add("muted")
        toggleBtn.textContent = editable ? "Add score" : "Score"
    }
}

function buildResultElements(onToggle) {
    const bar = document.createElement("div")
    bar.className = "match-result-bar"

    const label = document.createElement("div")
    label.className = "match-result-label"
    label.textContent = "Result"

    const value = document.createElement("div")
    value.className = "match-result-value"

    const saved = document.createElement("span")
    saved.className = "result-saved"
    saved.hidden = true
    saved.textContent = "✓ Saved"

    const actions = document.createElement("div")
    actions.className = "match-result-actions"

    const toggleBtn = createActionBtn("", "", onToggle)
    actions.appendChild(toggleBtn)

    bar.appendChild(label)
    bar.appendChild(value)
    bar.appendChild(saved)
    bar.appendChild(actions)

    const editor = document.createElement("div")
    editor.className = "match-result-editor"
    editor.hidden = true

    return { bar, value, saved, toggleBtn, editor }
}

export function buildMatchResultSection({ entry, editable, onCommit }) {
    const root = document.createElement("div")
    root.className = "match-result"

    let editing = false
    const initialSets = normalizeSets(entry)
    let draft = initialSets ? cloneSets(initialSets) : [[null, null]]

    const els = buildResultElements(() => {
        if (!editable) {
            return
        }
        editing = !editing
        els.editor.hidden = !editing
        if (editing) {
            const sets = normalizeSets(entry)
            draft = sets ? cloneSets(sets) : [[null, null]]
            renderEditor()
        }
    })

    function commitAndClose(newSets) {
        onCommit(newSets)
        entry = newSets ? { sets: newSets } : null
        editing = false
        els.editor.hidden = true
        updateResultDisplay(els, normalizeSets(entry), editable)

        els.saved.hidden = false
        setTimeout(() => {
            els.saved.hidden = true
        }, FLASH_DURATION_MS)
    }

    function renderEditor() {
        els.editor.textContent = ""
        const content = buildEditorContent({
            draft,
            commitAndClose,
            revertAndClose: () => {
                editing = false
                els.editor.hidden = true
                updateResultDisplay(els, normalizeSets(entry), editable)
            },
        })
        els.editor.appendChild(content)
    }

    updateResultDisplay(els, normalizeSets(entry), editable)

    root.appendChild(els.bar)
    root.appendChild(els.editor)

    return root
}
