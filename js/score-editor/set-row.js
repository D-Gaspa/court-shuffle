import { iconButton } from "./dom.js"
import { ICON_TRASH } from "./icons.js"
import { createNextSetRowFieldScopeId, createScoreInput, createTiebreakInput } from "./set-row-inputs.js"
import { getSetValidationMessage, parseScoreValue } from "./sets.js"

const TIEBREAK_SET_WINNER_GAMES = 7
const TIEBREAK_SET_LOSER_GAMES = 6

function createLabel(setIndex) {
    const label = document.createElement("div")
    label.className = "set-label"
    label.textContent = `Set ${setIndex + 1}`
    return label
}

function createDash() {
    const dash = document.createElement("span")
    dash.className = "set-dash"
    dash.textContent = ":"
    return dash
}

function buildTiebreakFields(tb, onTbChange, onAutoSave, { fieldScopeId, setIndex }) {
    const wrap = document.createElement("div")
    wrap.className = "tb-fields"

    const openParen = document.createElement("span")
    openParen.className = "tb-paren"
    openParen.textContent = "("

    const tbA = createTiebreakInput(tb ? tb[0] : null, { fieldScopeId, setIndex, teamIndex: 0 })
    const tbDash = document.createElement("span")
    tbDash.className = "set-dash tb-dash"
    tbDash.textContent = "–"
    const tbB = createTiebreakInput(tb ? tb[1] : null, { fieldScopeId, setIndex, teamIndex: 1 })

    const closeParen = document.createElement("span")
    closeParen.className = "tb-paren"
    closeParen.textContent = ")"

    function emitTb() {
        onTbChange([parseScoreValue(tbA.value), parseScoreValue(tbB.value)])
    }

    tbA.addEventListener("input", () => {
        emitTb()
        if (tbA.value !== "") {
            tbB.focus()
            tbB.select()
        }
    })
    tbB.addEventListener("input", () => {
        emitTb()
    })
    tbB.addEventListener("change", () => {
        if (tbB.value === "") {
            return
        }
        onAutoSave?.()
    })

    wrap.appendChild(openParen)
    wrap.appendChild(tbA)
    wrap.appendChild(tbDash)
    wrap.appendChild(tbB)
    wrap.appendChild(closeParen)

    return { wrap, tbA, tbB }
}

function isTiebreakEligible(a, b) {
    if (a === null || b === null) {
        return false
    }
    return (
        (a === TIEBREAK_SET_WINNER_GAMES && b === TIEBREAK_SET_LOSER_GAMES) ||
        (a === TIEBREAK_SET_LOSER_GAMES && b === TIEBREAK_SET_WINNER_GAMES)
    )
}

function buildSetScoreSnapshot(scoreA, scoreB, tbFields) {
    const snapshot = [scoreA, scoreB]
    if (!tbFields) {
        return snapshot
    }
    const tbFirstValue = parseScoreValue(tbFields.tbA.value)
    const tbSecondValue = parseScoreValue(tbFields.tbB.value)
    if (tbFirstValue !== null || tbSecondValue !== null) {
        snapshot.push({
            tb: [tbFirstValue, tbSecondValue],
        })
    }
    return snapshot
}

function applySetValidity(fields, message) {
    for (const field of fields) {
        if (!field) {
            continue
        }
        field.classList.toggle("invalid", message !== "")
        field.setCustomValidity(message)
    }
}

function syncSetValidity(a, b, tbFields) {
    const scoreA = parseScoreValue(a.value)
    const scoreB = parseScoreValue(b.value)
    const message = getSetValidationMessage(buildSetScoreSnapshot(scoreA, scoreB, tbFields))
    applySetValidity([a, b, tbFields?.tbA, tbFields?.tbB], message)
}

function createTiebreakController({ pair, a, b, fieldScopeId, setIndex, onAnyUpdate, onTiebreakChange, onAutoSave }) {
    const tbContainer = document.createElement("div")
    tbContainer.className = "tb-container"
    tbContainer.hidden = true

    let currentTb = pair[2]?.tb || null
    let tbFields = null

    const syncFromInputs = () => syncSetValidity(a, b, tbFields)

    const ensureFields = () => {
        if (tbFields) {
            return
        }
        tbFields = buildTiebreakFields(
            currentTb,
            (tbPair) => {
                currentTb = tbPair
                onTiebreakChange?.(tbPair)
                onAnyUpdate()
            },
            onAutoSave,
            { fieldScopeId, setIndex },
        )
        tbContainer.appendChild(tbFields.wrap)
        tbFields.tbA.addEventListener("input", syncFromInputs)
        tbFields.tbB.addEventListener("input", syncFromInputs)
    }

    const update = (scoreA, scoreB) => {
        const eligible = isTiebreakEligible(scoreA, scoreB)
        tbContainer.hidden = !eligible
        if (eligible) {
            ensureFields()
            syncSetValidity(a, b, tbFields)
            return
        }
        if (currentTb) {
            currentTb = null
            onTiebreakChange?.(null)
        }
        if (tbFields) {
            tbFields.tbA.value = ""
            tbFields.tbB.value = ""
        }
        syncSetValidity(a, b, tbFields)
    }

    return {
        tbContainer,
        update,
        sync: () => syncSetValidity(a, b, tbFields),
    }
}

function wireInputs({ a, b, onChange, onAnyUpdate, onAutoSave }) {
    function emit() {
        onChange([parseScoreValue(a.value), parseScoreValue(b.value)])
        onAnyUpdate()
    }
    a.addEventListener("input", () => {
        emit()
        if (a.value !== "") {
            b.focus()
            b.select()
        }
    })
    b.addEventListener("input", () => {
        emit()
        if (b.value !== "") {
            onAutoSave?.()
            b.blur()
        }
    })
}

function createActions({ setIndex, canRemove, onRemove }) {
    const actions = document.createElement("div")
    actions.className = "set-actions"

    const del = iconButton({
        className: "set-delete",
        label: `Delete set ${setIndex + 1}`,
        svg: ICON_TRASH,
        onClick: onRemove,
    })
    del.disabled = !canRemove

    actions.appendChild(del)
    return { actions }
}

function buildScoreFields(pair, { fieldScopeId, setIndex, onChange, onAnyUpdate, onTiebreakChange, onAutoSave }) {
    const fields = document.createElement("div")
    fields.className = "set-fields"

    const a = createScoreInput(pair[0], { fieldScopeId, setIndex, teamIndex: 0 })
    const b = createScoreInput(pair[1], { fieldScopeId, setIndex, teamIndex: 1 })
    fields.appendChild(a)
    fields.appendChild(createDash())
    fields.appendChild(b)

    const tiebreak = createTiebreakController({
        pair,
        a,
        b,
        fieldScopeId,
        setIndex,
        onAnyUpdate,
        onTiebreakChange,
        onAutoSave,
    })
    tiebreak.update(pair[0], pair[1])
    fields.appendChild(tiebreak.tbContainer)

    wireInputs({
        a,
        b,
        onChange: (next) => {
            onChange(next)
            tiebreak.update(next[0], next[1])
        },
        onAnyUpdate,
        onAutoSave,
    })

    tiebreak.sync()

    return { fields, a }
}

export function buildSetRow({
    setIndex,
    pair,
    onChange,
    onRemove,
    canRemove,
    onAnyUpdate,
    onTiebreakChange,
    onAutoSave,
}) {
    const fieldScopeId = createNextSetRowFieldScopeId()

    const row = document.createElement("div")
    row.className = "set-row"

    const left = document.createElement("div")
    left.className = "set-left"

    const { fields, a } = buildScoreFields(pair, {
        fieldScopeId,
        setIndex,
        onChange,
        onAnyUpdate,
        onTiebreakChange,
        onAutoSave,
    })

    left.appendChild(createLabel(setIndex))
    left.appendChild(fields)

    const { actions } = createActions({ setIndex, canRemove, onRemove })

    row.appendChild(left)
    row.appendChild(actions)

    row.focusFirst = () => {
        a.focus()
        a.select()
    }

    return row
}
