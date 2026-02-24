import { iconButton } from "./dom.js"
import { ICON_TRASH } from "./icons.js"
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
    if (value !== null && value !== undefined) {
        input.value = String(value)
    }
    // Select all content on focus so user can retype immediately
    input.addEventListener("focus", () => {
        input.select()
    })
    return input
}

function createDash() {
    const dash = document.createElement("span")
    dash.className = "set-dash"
    dash.textContent = ":"
    return dash
}

function createTiebreakInput(value) {
    const input = document.createElement("input")
    input.type = "number"
    input.min = "0"
    input.className = "set-input tb-input"
    input.placeholder = "-"
    if (value !== null && value !== undefined) {
        input.value = String(value)
    }
    input.addEventListener("focus", () => {
        input.select()
    })
    return input
}

function buildTiebreakFields(tb, onTbChange) {
    const wrap = document.createElement("div")
    wrap.className = "tb-fields"

    const openParen = document.createElement("span")
    openParen.className = "tb-paren"
    openParen.textContent = "("

    const tbA = createTiebreakInput(tb ? tb[0] : null)
    const tbDash = document.createElement("span")
    tbDash.className = "set-dash tb-dash"
    tbDash.textContent = "–"
    const tbB = createTiebreakInput(tb ? tb[1] : null)

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
        if (tbB.value !== "") {
            tbB.blur()
        }
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
    return Math.abs(a - b) === 1
}

function getTiebreakValidationMessage(scoreA, scoreB, tbFirstValue, tbSecondValue) {
    if (tbFirstValue === null || tbSecondValue === null) {
        return ""
    }
    if (tbFirstValue === tbSecondValue) {
        return "Tiebreak cannot be tied."
    }
    if (scoreA > scoreB && tbFirstValue <= tbSecondValue) {
        return "Winning side tiebreak must be higher."
    }
    if (scoreB > scoreA && tbSecondValue <= tbFirstValue) {
        return "Winning side tiebreak must be higher."
    }
    return ""
}

function applyTiebreakValidity(tbFields, message) {
    if (!tbFields) {
        return
    }
    const invalid = message !== ""
    tbFields.tbA.classList.toggle("invalid", invalid)
    tbFields.tbB.classList.toggle("invalid", invalid)
    tbFields.tbA.setCustomValidity(message)
    tbFields.tbB.setCustomValidity(message)
}

function syncTiebreakValidity(tbFields, scoreA, scoreB) {
    if (!tbFields) {
        return
    }
    const tbFirstValue = parseScoreValue(tbFields.tbA.value)
    const tbSecondValue = parseScoreValue(tbFields.tbB.value)
    const message = getTiebreakValidationMessage(scoreA, scoreB, tbFirstValue, tbSecondValue)
    applyTiebreakValidity(tbFields, message)
}

function createTiebreakController({ pair, a, b, onAnyUpdate, onTiebreakChange }) {
    const tbContainer = document.createElement("div")
    tbContainer.className = "tb-container"
    tbContainer.hidden = true

    let currentTb = pair[2]?.tb || null
    let tbFields = null

    const syncFromInputs = () => syncTiebreakValidity(tbFields, parseScoreValue(a.value), parseScoreValue(b.value))

    const ensureFields = () => {
        if (tbFields) {
            return
        }
        tbFields = buildTiebreakFields(currentTb, (tbPair) => {
            currentTb = tbPair
            onTiebreakChange?.(tbPair)
            onAnyUpdate()
        })
        tbContainer.appendChild(tbFields.wrap)
        tbFields.tbA.addEventListener("input", syncFromInputs)
        tbFields.tbB.addEventListener("input", syncFromInputs)
    }

    const update = (scoreA, scoreB) => {
        const eligible = isTiebreakEligible(scoreA, scoreB)
        tbContainer.hidden = !eligible
        if (eligible) {
            ensureFields()
            syncTiebreakValidity(tbFields, scoreA, scoreB)
            return
        }
        if (currentTb) {
            currentTb = null
            onTiebreakChange?.(null)
        }
        applyTiebreakValidity(tbFields, "")
    }

    return { tbContainer, update }
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
            b.select()
        }
    })
    b.addEventListener("input", () => {
        emit()
        if (b.value !== "") {
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

function buildScoreFields(pair, { onChange, onAnyUpdate, onTiebreakChange }) {
    const fields = document.createElement("div")
    fields.className = "set-fields"

    const a = createScoreInput(pair[0])
    const b = createScoreInput(pair[1])
    fields.appendChild(a)
    fields.appendChild(createDash())
    fields.appendChild(b)

    const tiebreak = createTiebreakController({ pair, a, b, onAnyUpdate, onTiebreakChange })
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
    })

    return { fields, a }
}

export function buildSetRow({ setIndex, pair, onChange, onRemove, canRemove, onAnyUpdate, onTiebreakChange }) {
    const row = document.createElement("div")
    row.className = "set-row"

    const left = document.createElement("div")
    left.className = "set-left"

    const { fields, a } = buildScoreFields(pair, { onChange, onAnyUpdate, onTiebreakChange })

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
