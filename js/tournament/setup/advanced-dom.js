function getAdvancedSectionElements(root) {
    return {
        requiredSitOutSection: root.getElementById("advanced-required-sitout-section"),
        requiredSitOutSelect: root.getElementById("advanced-required-sitout-select"),
        singlesOpeningSection: root.getElementById("advanced-singles-opening-section"),
        singlesOpeningList: root.getElementById("advanced-singles-opening-list"),
        addSinglesMatchupBtn: root.getElementById("advanced-add-singles-matchup"),
        doublesPairsSection: root.getElementById("advanced-doubles-pairs-section"),
        doublesPairsList: root.getElementById("advanced-doubles-pairs-list"),
        addDoublesPairBtn: root.getElementById("advanced-add-doubles-pair"),
        singlesByesSection: root.getElementById("advanced-singles-byes-section"),
        singlesByesList: root.getElementById("advanced-singles-byes-list"),
        doublesByesSection: root.getElementById("advanced-doubles-byes-section"),
        doublesByesList: root.getElementById("advanced-doubles-byes-list"),
    }
}

function getAdvancedCardElements(root, sections) {
    return {
        requiredSitOut: {
            section: sections.requiredSitOutSection,
            toggle: root.getElementById("advanced-toggle-required-sitout"),
            body: root.getElementById("advanced-required-sitout-body"),
            status: root.getElementById("advanced-status-required-sitout"),
        },
        singlesOpening: {
            section: sections.singlesOpeningSection,
            toggle: root.getElementById("advanced-toggle-singles-opening"),
            body: root.getElementById("advanced-singles-opening-body"),
            status: root.getElementById("advanced-status-singles-opening"),
        },
        doublesPairs: {
            section: sections.doublesPairsSection,
            toggle: root.getElementById("advanced-toggle-doubles-pairs"),
            body: root.getElementById("advanced-doubles-pairs-body"),
            status: root.getElementById("advanced-status-doubles-pairs"),
        },
        singlesByes: {
            section: sections.singlesByesSection,
            toggle: root.getElementById("advanced-toggle-singles-byes"),
            body: root.getElementById("advanced-singles-byes-body"),
            status: root.getElementById("advanced-status-singles-byes"),
        },
        doublesByes: {
            section: sections.doublesByesSection,
            toggle: root.getElementById("advanced-toggle-doubles-byes"),
            body: root.getElementById("advanced-doubles-byes-body"),
            status: root.getElementById("advanced-status-doubles-byes"),
        },
    }
}

function getAdvancedSetupDom(root = document) {
    const sections = getAdvancedSectionElements(root)
    const advancedDialog = root.getElementById("tournament-advanced-dialog")
    return {
        advancedDialog,
        advancedRoot: advancedDialog?.querySelector(".advanced-modal") || advancedDialog,
        advancedBtn: root.getElementById("tournament-advanced-btn"),
        advancedCancelBtn: root.getElementById("advanced-cancel"),
        advancedApplyBtn: root.getElementById("advanced-apply"),
        tournamentAdvancedState: root.getElementById("tournament-advanced-state"),
        advancedModalError: root.getElementById("advanced-modal-error"),
        advancedValidationSummary: root.getElementById("advanced-validation-summary"),
        advancedCardElements: getAdvancedCardElements(root, sections),
        ...sections,
    }
}

export { getAdvancedSetupDom }
