import { buildEditorContent } from "./editor-content.js"
import { cloneSets, countSetWins, formatSets, normalizeSets } from "./sets.js"

const MAX_SETS = 5

function createToggleBtn(onClick) {
    const btn = document.createElement("button")
    btn.type = "button"
    btn.className = "btn btn-ghost btn-sm"
    btn.addEventListener("click", onClick)
    return btn
}

function buildSummaryDom(sets, teamLabels) {
    const [labelA, labelB] = teamLabels
    const { winsA, winsB } = countSetWins(sets)
    if (winsA === 0 && winsB === 0) {
        return null
    }

    const frag = document.createDocumentFragment()

    const spanA = document.createElement("span")
    spanA.className = "result-team-a"
    spanA.textContent = `${labelA} (${winsA})`

    const sep = document.createElement("span")
    sep.className = "result-summary-sep"
    sep.textContent = " – "

    const spanB = document.createElement("span")
    spanB.className = "result-team-b"
    spanB.textContent = `${labelB} (${winsB})`

    frag.appendChild(spanA)
    frag.appendChild(sep)
    frag.appendChild(spanB)
    return frag
}

function buildDrawWarning() {
    const warn = document.createElement("span")
    warn.className = "result-draw-warning"
    warn.textContent = "Draw — add a deciding set"
    return warn
}

function getCompleteSets(sets) {
    return sets ? sets.filter(([a, b]) => a !== null && b !== null) : []
}

function updateDrawBadge(drawBadge, completeSets) {
    if (!drawBadge) {
        return
    }
    if (completeSets.length === 0) {
        drawBadge.hidden = true
        return
    }
    const { winsA, winsB } = countSetWins(completeSets)
    drawBadge.hidden = winsA !== winsB
}

function renderScoreValue(value, completeSets, teamLabels) {
    value.innerHTML = ""
    if (teamLabels) {
        const summaryFrag = buildSummaryDom(completeSets, teamLabels)
        if (summaryFrag) {
            value.appendChild(summaryFrag)

            const dot = document.createElement("span")
            dot.className = "result-separator"
            dot.textContent = " · "
            value.appendChild(dot)
        }
    }

    const detailSpan = document.createElement("span")
    detailSpan.className = "result-detail"
    detailSpan.textContent = formatSets(completeSets)
    value.appendChild(detailSpan)
}

function getToggleLabel({ editable, editing, hasScore }) {
    if (!editable) {
        return ""
    }
    if (editing) {
        return "Close"
    }
    return hasScore ? "Edit" : "Score"
}

function updateResultDisplay({ elements, sets, editable, teamLabels, editing = false }) {
    const { value, toggleBtn, drawBadge } = elements
    toggleBtn.hidden = !editable

    const completeSets = getCompleteSets(sets)

    if (completeSets.length > 0) {
        renderScoreValue(value, completeSets, teamLabels)
        value.classList.remove("muted")
        toggleBtn.textContent = getToggleLabel({ editable, editing, hasScore: true })
        updateDrawBadge(drawBadge, completeSets)
    } else {
        value.textContent = "No score"
        value.classList.add("muted")
        toggleBtn.textContent = getToggleLabel({ editable, editing, hasScore: false })
        updateDrawBadge(drawBadge, completeSets)
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

    const actions = document.createElement("div")
    actions.className = "match-result-actions"

    const toggleBtn = createToggleBtn(onToggle)
    actions.appendChild(toggleBtn)

    bar.appendChild(label)
    bar.appendChild(value)
    bar.appendChild(actions)

    const drawBadge = document.createElement("div")
    drawBadge.className = "result-draw-badge"
    drawBadge.hidden = true
    drawBadge.appendChild(buildDrawWarning())

    const editor = document.createElement("div")
    editor.className = "match-result-editor"
    editor.hidden = true

    return { bar, value, toggleBtn, editor, drawBadge }
}

function extractTiebreaks(sets) {
    return sets.map((s) => (s[2]?.tb ? [...s[2].tb] : null))
}

function buildSetsFromDraft(draft, tiebreaks) {
    // Only include complete sets (both scores non-null)
    return draft
        .map((pair, i) => {
            const base = [pair[0], pair[1]]
            if (hasCompleteTiebreak(tiebreaks[i])) {
                base.push({ tb: [...tiebreaks[i]] })
            }
            return base
        })
        .filter(([a, b]) => a !== null && b !== null)
}

function hasCompleteSet(draft) {
    return draft.some(([a, b]) => a !== null && b !== null)
}

function hasCompleteTiebreak(tb) {
    if (!tb) {
        return false
    }
    const [tbA, tbB] = tb
    return tbA !== null && tbB !== null
}

function getDraftStateFromEntry(entry) {
    const sets = normalizeSets(entry)
    return {
        draft: sets ? cloneSets(sets) : [[null, null]],
        tiebreaks: sets ? extractTiebreaks(sets) : [null],
    }
}

function renderMatchResultEditor({ editor, draft, tiebreaks, onAutoSave, onClear }) {
    editor.textContent = ""
    editor.appendChild(
        buildEditorContent({
            draft,
            tiebreaks,
            maxSets: MAX_SETS,
            onAutoSave,
            onClear,
        }),
    )
}

function applyEditingState({ editable, editing, nextEditing, elements, onEditingChange }) {
    const normalized = Boolean(editable && nextEditing)
    if (editing === normalized) {
        return editing
    }
    elements.editor.hidden = !normalized
    onEditingChange?.(normalized)
    return normalized
}

export function buildMatchResultSection({
    entry,
    editable,
    onCommit,
    onEntryChange,
    onEditingChange,
    teamLabels,
    startEditing = false,
}) {
    const root = document.createElement("div")
    root.className = "match-result"
    let editing = Boolean(editable && startEditing)
    let draft = [[null, null]]
    let tiebreaks = [null]
    const els = buildResultElements(() => {
        if (!editable) {
            return
        }
        if (editing) {
            editing = applyEditingState({ editable, editing, nextEditing: false, elements: els, onEditingChange })
            commit(hasCompleteSet(draft) ? buildSetsFromDraft(draft, tiebreaks) : null)
            return
        }
        editing = applyEditingState({ editable, editing, nextEditing: true, elements: els, onEditingChange })
        updateResultDisplay({ elements: els, sets: normalizeSets(entry), editable, teamLabels, editing })
        if (editing) {
            ;({ draft, tiebreaks } = getDraftStateFromEntry(entry))
            renderEditor()
        }
    })

    function commit(newSets, options) {
        onCommit(newSets, options)
        entry = newSets ? { sets: newSets } : null
        onEntryChange?.(entry)
        updateResultDisplay({ elements: els, sets: normalizeSets(entry), editable, teamLabels, editing })
    }

    function renderEditor() {
        renderMatchResultEditor({
            editor: els.editor,
            draft,
            tiebreaks,
            onAutoSave: () => {
                commit(hasCompleteSet(draft) ? buildSetsFromDraft(draft, tiebreaks) : null, { partial: true })
            },
            onClear: () => {
                commit(null, { partial: true })
                draft = [[null, null]]
                tiebreaks = [null]
                renderEditor()
            },
        })
    }

    updateResultDisplay({ elements: els, sets: normalizeSets(entry), editable, teamLabels, editing })
    if (editing) {
        els.editor.hidden = false
        ;({ draft, tiebreaks } = getDraftStateFromEntry(entry))
        renderEditor()
    }
    root.appendChild(els.bar)
    root.appendChild(els.drawBadge)
    root.appendChild(els.editor)
    return root
}
