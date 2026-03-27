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
        doublesRestrictionsSection: root.getElementById("advanced-doubles-restrictions-section"),
        doublesRestrictionsList: root.getElementById("advanced-doubles-restrictions-list"),
        addDoublesRestrictionBtn: root.getElementById("advanced-add-doubles-restriction"),
        fillDoublesRestrictionBtn: root.getElementById("advanced-fill-doubles-restrictions"),
        fillDoublesRestrictionSessionBtn: root.getElementById("advanced-fill-doubles-restrictions-session"),
        singlesByesSection: root.getElementById("advanced-singles-byes-section"),
        singlesByesList: root.getElementById("advanced-singles-byes-list"),
        doublesByesSection: root.getElementById("advanced-doubles-byes-section"),
        doublesByesList: root.getElementById("advanced-doubles-byes-list"),
        singlesNextUpSection: root.getElementById("advanced-singles-next-up-section"),
        singlesNextUpList: root.getElementById("advanced-singles-next-up-list"),
        doublesNextUpSection: root.getElementById("advanced-doubles-next-up-section"),
        doublesNextUpList: root.getElementById("advanced-doubles-next-up-list"),
    }
}

function getAdvancedCardElements(root, sections) {
    return {
        requiredSitOut: {
            section: sections.requiredSitOutSection,
            status: root.getElementById("advanced-status-required-sitout"),
        },
        singlesOpening: {
            section: sections.singlesOpeningSection,
            status: root.getElementById("advanced-status-singles-opening"),
        },
        doublesPairs: {
            section: sections.doublesPairsSection,
            status: root.getElementById("advanced-status-doubles-pairs"),
        },
        doublesRestrictions: {
            section: sections.doublesRestrictionsSection,
            status: root.getElementById("advanced-status-doubles-restrictions"),
        },
        singlesByes: {
            section: sections.singlesByesSection,
            status: root.getElementById("advanced-status-singles-byes"),
        },
        doublesByes: {
            section: sections.doublesByesSection,
            status: root.getElementById("advanced-status-doubles-byes"),
        },
        singlesNextUp: {
            section: sections.singlesNextUpSection,
            status: root.getElementById("advanced-status-singles-next-up"),
        },
        doublesNextUp: {
            section: sections.doublesNextUpSection,
            status: root.getElementById("advanced-status-doubles-next-up"),
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
        advancedEmptyState: root.getElementById("advanced-empty-state"),
        advancedCardElements: getAdvancedCardElements(root, sections),
        ...sections,
    }
}

export { getAdvancedSetupDom }
