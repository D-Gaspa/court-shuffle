function createConfirmDialogController(elements) {
    const { cancelButton, dialog, extraButton, message, okButton, title } = elements
    let confirmCallback = null
    let confirmExtraCallback = null

    function show(titleText, messageText, onOk, options = {}) {
        title.textContent = titleText
        message.textContent = messageText
        confirmCallback = onOk
        okButton.textContent = options.okLabel ?? "Confirm"
        okButton.className = `btn ${options.okClass ?? "btn-danger"}`
        if (options.extraLabel && options.onExtra) {
            extraButton.textContent = options.extraLabel
            extraButton.className = `btn ${options.extraClass ?? "btn-ghost btn-danger"}`
            confirmExtraCallback = options.onExtra
            extraButton.hidden = false
        } else {
            extraButton.hidden = true
            confirmExtraCallback = null
        }
        dialog.showModal()
    }

    function resetCallbacks() {
        confirmCallback = null
        confirmExtraCallback = null
    }

    function setup() {
        cancelButton.addEventListener("click", () => {
            dialog.close()
            resetCallbacks()
        })

        extraButton.addEventListener("click", () => {
            confirmExtraCallback?.()
            dialog.close()
            resetCallbacks()
        })

        okButton.addEventListener("click", () => {
            confirmCallback?.()
            dialog.close()
            resetCallbacks()
        })
    }

    return {
        setup,
        show,
    }
}

export { createConfirmDialogController }
