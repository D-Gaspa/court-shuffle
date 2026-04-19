import { buildRatingsModel, buildSeasonSnapshots } from "./model.js"
import {
    archiveCurrentRatingSeason,
    createEmptyRatingsState,
    getActiveRatingSeason,
    startNewRatingSeason,
} from "./seasons.js"

function formatDateInputValue(date) {
    return date.toISOString().slice(0, 10)
}

function getEarliestHistoryDate(history) {
    let earliestTimestamp = null
    for (const session of history || []) {
        const timestamp = Date.parse(session?.date || "")
        if (!Number.isFinite(timestamp)) {
            continue
        }
        if (earliestTimestamp === null || timestamp < earliestTimestamp) {
            earliestTimestamp = timestamp
        }
    }
    return earliestTimestamp === null ? null : new Date(earliestTimestamp)
}

function resolveInitialSeasonStartDate({ history, ratings }) {
    const activeSeason = getActiveRatingSeason(ratings)
    if (activeSeason) {
        return formatDateInputValue(new Date())
    }
    const earliestHistoryDate = getEarliestHistoryDate(history)
    return formatDateInputValue(earliestHistoryDate || new Date())
}

function buildSeasonDateHint({ history, ratings }) {
    const activeSeason = getActiveRatingSeason(ratings)
    if (activeSeason) {
        return "Matches saved on or after this date will count toward the new season."
    }
    if (getEarliestHistoryDate(history)) {
        return "Defaulting to your earliest active saved session so the first season can be retroactive."
    }
    return "No saved history yet, so the first season will begin from today forward."
}

function convertDateInputToIso(dateInput) {
    const resolved = new Date(`${dateInput}T00:00:00.000Z`)
    return Number.isNaN(resolved.getTime()) ? null : resolved.toISOString()
}

function setupSeasonLabelDialogEvents({ close, elements, resetDialogState, submit }) {
    elements.cancelButton.addEventListener("click", close)
    elements.confirmButton.addEventListener("click", submit)
    elements.input.addEventListener("keydown", (event) => {
        if (event.key === "Enter") {
            event.preventDefault()
            submit()
        }
    })
    elements.dialog.addEventListener("close", resetDialogState)
}

function prepareSeasonLabelDialog({ elements, history, ratings, resetDialogState }) {
    const initialDateValue = resolveInitialSeasonStartDate({ history, ratings })
    elements.title.textContent = "Start Rating Season"
    elements.message.textContent = "Give the season a label and choose when rated history should begin counting."
    elements.input.value = ""
    elements.dateInput.value = initialDateValue
    elements.dateHint.textContent = buildSeasonDateHint({ history, ratings })
    elements.oldestDateButton.hidden = getEarliestHistoryDate(history) === null
    resetDialogState()
}

function validateSeasonLabelSubmission({ elements, showValidationError }) {
    const label = elements.input.value.trim()
    if (!label) {
        showValidationError("Season label is required.", elements.input)
        return null
    }
    const startedAt = convertDateInputToIso(elements.dateInput.value)
    if (!startedAt) {
        showValidationError("A valid season start date is required.", elements.dateInput)
        return null
    }
    return { label, startedAt }
}

function createDialogStateHelpers(elements) {
    function resetDialogState() {
        elements.error.hidden = true
        elements.error.textContent = ""
    }

    function showValidationError(message, focusTarget) {
        elements.error.textContent = message
        elements.error.hidden = false
        focusTarget.focus()
    }

    return { resetDialogState, showValidationError }
}

function openSeasonLabelDialog({ elements, history, onSubmit, ratings, resetDialogState, setCallback }) {
    const oldestEligibleDateValue = resolveInitialSeasonStartDate({
        history,
        ratings: createEmptyRatingsState(),
    })
    prepareSeasonLabelDialog({ elements, history, ratings, resetDialogState })
    setCallback(onSubmit)
    elements.dialog.showModal()
    elements.input.focus()
    elements.input.select()
    return oldestEligibleDateValue
}

function submitSeasonLabelDialog({ close, elements, getCallback, showValidationError }) {
    const submission = validateSeasonLabelSubmission({ elements, showValidationError })
    if (!submission) {
        return
    }
    const callback = getCallback()
    if (callback) {
        callback(submission)
    }
    close()
}

function createSeasonLabelDialogController(elements) {
    let seasonLabelCallback = null
    let oldestEligibleDateValue = ""
    const { resetDialogState, showValidationError } = createDialogStateHelpers(elements)

    function open({ history, onSubmit, ratings }) {
        oldestEligibleDateValue = openSeasonLabelDialog({
            elements,
            history,
            onSubmit,
            ratings,
            resetDialogState,
            setCallback: (callback) => {
                seasonLabelCallback = callback
            },
        })
    }

    function close() {
        elements.dialog.close()
        seasonLabelCallback = null
        resetDialogState()
    }

    function submit() {
        submitSeasonLabelDialog({
            close,
            elements,
            getCallback: () => seasonLabelCallback,
            showValidationError,
        })
    }

    function setupDialog() {
        setupSeasonLabelDialogEvents({
            close,
            elements,
            submit,
            resetDialogState: () => {
                seasonLabelCallback = null
                resetDialogState()
            },
        })
        elements.oldestDateButton.addEventListener("click", () => {
            if (!oldestEligibleDateValue) {
                return
            }
            elements.dateInput.value = oldestEligibleDateValue
            resetDialogState()
        })
    }

    return {
        open,
        setupDialog,
    }
}

function createNextRatingsState(state, { label, startedAt }) {
    const activeSeason = getActiveRatingSeason(state.ratings)
    const snapshots = activeSeason
        ? buildSeasonSnapshots(
              buildRatingsModel({
                  history: state.history,
                  ratings: state.ratings,
              }),
          )
        : undefined
    return startNewRatingSeason({
        ratings: state.ratings || createEmptyRatingsState(),
        label,
        startedAt,
        snapshots,
    })
}

function archiveActiveRatingsState(state, endedAt = new Date().toISOString()) {
    const activeSeason = getActiveRatingSeason(state.ratings)
    if (!activeSeason) {
        return state.ratings || createEmptyRatingsState()
    }
    return archiveCurrentRatingSeason({
        ratings: state.ratings || createEmptyRatingsState(),
        endedAt,
        snapshots: buildSeasonSnapshots(
            buildRatingsModel({
                history: state.history,
                ratings: state.ratings,
            }),
        ),
    })
}

function showSeasonRolloverConfirm({ activeSeason, label, onConfirm, showConfirmDialog, startedAt }) {
    showConfirmDialog(
        "Start New Rating Season",
        `Archive "${activeSeason.label}" and start "${label}" from ${startedAt.slice(0, 10)} with a fresh ladder baseline?`,
        onConfirm,
        {
            okLabel: "Start Season",
            okClass: "btn-primary",
        },
    )
}

function createRatingSeasonController({ elements, persist, refreshRatings, refreshStats, showConfirmDialog, state }) {
    const seasonLabelDialog = createSeasonLabelDialogController(elements)

    function handleStartRatingSeason() {
        seasonLabelDialog.open({
            history: state.history,
            ratings: state.ratings,
            onSubmit: ({ label, startedAt }) => {
                const activeSeason = getActiveRatingSeason(state.ratings)
                const commit = () => {
                    state.ratings = createNextRatingsState(state, { label, startedAt })
                    persist()
                    refreshStats()
                    refreshRatings()
                }

                if (!activeSeason) {
                    commit()
                    return
                }

                showSeasonRolloverConfirm({
                    activeSeason,
                    label,
                    onConfirm: commit,
                    showConfirmDialog,
                    startedAt,
                })
            },
        })
    }

    function handleArchiveCurrentSeason() {
        const activeSeason = getActiveRatingSeason(state.ratings)
        if (!activeSeason) {
            return
        }
        showConfirmDialog(
            "Archive Current Rating Season",
            `Archive "${activeSeason.label}" and stop ratings until you explicitly start the next season?`,
            () => {
                state.ratings = archiveActiveRatingsState(state)
                persist()
                refreshStats()
                refreshRatings()
            },
            {
                okLabel: "Archive Season",
                okClass: "btn-accent",
            },
        )
    }

    return {
        handleArchiveCurrentSeason,
        handleStartRatingSeason,
        setupDialog: seasonLabelDialog.setupDialog,
    }
}

export {
    buildSeasonDateHint,
    convertDateInputToIso,
    createRatingSeasonController,
    getEarliestHistoryDate,
    resolveInitialSeasonStartDate,
}
