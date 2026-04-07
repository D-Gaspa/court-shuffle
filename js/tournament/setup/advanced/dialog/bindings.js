function bindAdvancedActionButtons({
    advancedBtn,
    advancedCancelBtn,
    advancedApplyBtn,
    advancedDialog,
    requiredSitOutSelect,
    addSinglesMatchupBtn,
    addDoublesPairBtn,
    onOpenDialog,
    onApplyDialog,
    onCloseDialog,
    onRequiredSitOutChange,
    onAddSinglesMatchup,
    onAddDoublesPair,
}) {
    advancedBtn?.addEventListener("click", onOpenDialog)
    advancedCancelBtn?.addEventListener("click", () => advancedDialog?.close())
    advancedApplyBtn?.addEventListener("click", onApplyDialog)
    advancedDialog?.addEventListener("close", onCloseDialog)
    advancedDialog?.addEventListener("click", (event) => {
        if (event.target === advancedDialog) {
            advancedDialog.close()
        }
    })

    requiredSitOutSelect?.addEventListener("change", () => {
        onRequiredSitOutChange(requiredSitOutSelect.value)
    })

    addSinglesMatchupBtn?.addEventListener("click", onAddSinglesMatchup)
    addDoublesPairBtn?.addEventListener("click", onAddDoublesPair)
}

export { bindAdvancedActionButtons }
