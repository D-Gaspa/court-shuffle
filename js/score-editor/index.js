import { buildEditorContent } from "./editor-content.js"
import { cloneSets, formatSets, normalizeSets } from "./sets.js"

const MAX_SETS = 5
const FLASH_DURATION_MS = 1200

function createToggleBtn(onClick) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "btn btn-ghost btn-sm"
    btn.addEventListener("click", onClick)
    return btn
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

    const toggleBtn = createToggleBtn(onToggle)
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
    let draft = [[null, null]]

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

    function flashSaved() {
        els.saved.hidden = false
        setTimeout(() => {
            els.saved.hidden = true
        }, FLASH_DURATION_MS)
    }

    function commitAndClose(newSets) {
        onCommit(newSets)
        entry = newSets ? { sets: newSets } : null
        editing = false
        els.editor.hidden = true
        updateResultDisplay(els, normalizeSets(entry), editable)
        flashSaved()
    }

    function renderEditor() {
        els.editor.textContent = ""
        els.editor.appendChild(
            buildEditorContent({
                draft,
                maxSets: MAX_SETS,
                commitAndClose,
                revertAndClose: () => {
                    editing = false
                    els.editor.hidden = true
                    updateResultDisplay(els, normalizeSets(entry), editable)
                },
            }),
        )
    }

    updateResultDisplay(els, normalizeSets(entry), editable)
    root.appendChild(els.bar)
    root.appendChild(els.editor)
    return root
}
