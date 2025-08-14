import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

// Operators supported by uiListsApi
const DEFAULT_OPERATORS = [
    { label: 'Equals', value: 'Equals' },
    { label: 'Not Equal', value: 'NotEqual' },
    { label: 'Contains', value: 'Contains' },
    { label: 'Starts With', value: 'StartsWith' },
    { label: 'Less Than', value: 'LessThan' },
    { label: 'Less Or Equal', value: 'LessOrEqual' },
    { label: 'Greater Than', value: 'GreaterThan' },
    { label: 'Greater Or Equal', value: 'GreaterOrEqual' },
    { label: 'Includes (MS picklist)', value: 'Includes' },
    { label: 'Excludes (MS picklist)', value: 'Excludes' }
];

export default class CreateListView extends NavigationMixin(LightningElement) {
    // ---- inbound ----
    @api apiName;

    // ---- loading gate for child schema ----
    isLoading = true;

    // ---- base state ----
    listViewLabel = '';
    selectedObject;           // { value:'Contact', label:'Contact', ... }
    selectedFields = [];
    selectedFieldsLoaded = true;

    // ---- sort state ----
    sortField = '';
    sortDirection = 'ASC';    // 'ASC' | 'DESC'
    orderBy = null;

    // ---- multi-filter state ----
    filters = [];             // rows: { id, fieldApiName, operator, value }
    nextFilterId = 1;
    logicMode = 'AND';        // 'AND' | 'OR' | 'CUSTOM'
    customLogic = '';         // e.g. (1 OR (2 AND 3))
    filteredByInfo = null;

    // =========================
    // Helpers & derived values
    // =========================
    get computedApiName() {
        return (this.apiName && this.apiName.trim())
            ? this.apiName
            : (this.listViewLabel || '').replace(/\s+/g, '_');
    }

    get objectApiName() {
        return this.selectedObject?.value || 'Contact';
    }

    get fieldApiNames() {
        return (this.selectedFields || []).map(f => f.value);
    }

    // Sort options (render only when there are choices)
    get hasSortOptions() {
        return Array.isArray(this.selectedFields) && this.selectedFields.length > 0;
    }
    get sortFieldOptions() {
        const list = Array.isArray(this.selectedFields) ? this.selectedFields : [];
        return list.map(f => ({ label: f.label || f.value, value: f.value }));
    }
    get sortDirectionOptions() {
        return [
            { label: 'Ascending', value: 'ASC' },
            { label: 'Descending', value: 'DESC' }
        ];
    }

    // Filter options
    get hasFilterOptions() {
        return Array.isArray(this.selectedFields) && this.selectedFields.length > 0;
    }
    get filterFieldOptions() {
        const list = Array.isArray(this.selectedFields) ? this.selectedFields : [];
        return list.map(f => ({ label: f.label || f.value, value: f.value }));
    }
    get operatorOptions() { return DEFAULT_OPERATORS; }

    // Render helpers
    get filtersWithIndex() {
        return (this.filters || []).map((f, i) => ({ ...f, displayIndex: i + 1 }));
    }
    get logicModeOptions() {
        return [
            { label: 'AND all', value: 'AND' },
            { label: 'OR all', value: 'OR' },
            { label: 'Custom', value: 'CUSTOM' }
        ];
    }
    get showCustomLogic() { return this.logicMode === 'CUSTOM'; }

    dispatchValueChange() {
        // ----- Sort -----
        this.orderBy = this.sortField
            ? { fieldApiName: this.sortField, isAscending: this.sortDirection === 'ASC' }
            : null;

        // ----- Filters: build from rows -----
        const rows = Array.isArray(this.filters) ? this.filters : [];

        // Keep rows that have a field AND either:
        //  - value is non-empty, OR
        //  - operator allows blank (Equals / NotEqual)
        const filteredByInfo = rows
            .filter(f => {
                if (!f.fieldApiName) return false;
                const op = f.operator || 'Equals';
                const trimmed = ((f.value ?? '') + '').trim();
                const allowsBlank = op === 'Equals' || op === 'NotEqual';
                return allowsBlank ? true : trimmed.length > 0;
            })
            .map(f => {
                const op = f.operator || 'Equals';
                const trimmed = ((f.value ?? '') + '').trim();
                const operands =
                    (op === 'Equals' || op === 'NotEqual') && trimmed.length === 0
                        ? ['']       // treat empty input as (blank)
                        : [trimmed];
                return {
                    fieldApiName: f.fieldApiName,
                    operator: op,
                    operandLabels: operands
                };
            });

        const hasFilters = filteredByInfo.length > 0;

        // ----- Logic string (only when 2+ filters) -----
        let filterLogicString;
        if (filteredByInfo.length > 1) {
            if (this.logicMode === 'CUSTOM') {
                const s = (this.customLogic || '').trim();
                filterLogicString = s || undefined;
            } else {
                const glue = ` ${this.logicMode} `;
                // indexes are 1-based in filter logic
                filterLogicString = `(${Array.from({ length: filteredByInfo.length }, (_, i) => i + 1).join(glue)})`;
            }
        }

        // Stash for completeness (optional)
        this.filteredByInfo = hasFilters ? filteredByInfo : null;

        // ----- Emit unified value -----
        this.dispatchEvent(new CustomEvent('valuechange', {
            detail: {
                value: {
                    apiName: this.computedApiName,
                    label: this.listViewLabel,
                    objectApiName: this.objectApiName,
                    fieldApiNames: this.fieldApiNames,
                    filteredByInfo: this.filteredByInfo,           // null or [{...}]
                    ...(filterLogicString ? { filterLogicString } : {}),
                    orderBy: this.orderBy                          // null or {...}
                }
            },
            bubbles: true,
            composed: true
        }));
    }

    // =========================
    // Handlers
    // =========================
    handleSchemaLoaded() {
        this.isLoading = false;
    }

    handleInputChange(event) {
        this.listViewLabel = event.target.value;
        this.dispatchValueChange();
    }

    // Child: object selected
    setObject(e) {
        this.selectedObject = e.detail;
        this.selectedFields = [];

        // Reset sort + filters on object change
        this.sortField = '';
        this.sortDirection = 'ASC';

        this.filters = [];
        this.nextFilterId = 1;
        this.logicMode = 'AND';
        this.customLogic = '';

        this.dispatchValueChange();
    }

    // Child: fields selected
    setFields(e) {
        const fields = e.detail;
        this.selectedFields = Array.isArray(fields) ? fields.slice() : [];

        // Prune invalid sort
        if (this.sortField && !this.selectedFields.find(f => f.value === this.sortField)) {
            this.sortField = '';
        }
        // Prune invalid filters
        this.filters = this.filters.filter(f =>
            !f.fieldApiName || this.selectedFields.find(sf => sf.value === f.fieldApiName)
        );

        this.dispatchValueChange();
    }

    // Sort handlers
    handleSortFieldChange(e) {
        this.sortField = e.detail.value;
        this.dispatchValueChange();
    }
    handleSortDirChange(e) {
        this.sortDirection = e.detail?.value || 'ASC';
        this.dispatchValueChange();
    }

    // Filter row management
    addFilterRow() {
        this.filters = [
            ...this.filters,
            { id: this.nextFilterId++, fieldApiName: '', operator: 'Equals', value: '' }
        ];
        this.dispatchValueChange();
    }
    removeFilterRow(e) {
        const id = Number(e.currentTarget.dataset.id);
        this.filters = this.filters.filter(f => f.id !== id);
        this.dispatchValueChange();
    }
    handleFilterFieldChange(e) {
        const id = Number(e.currentTarget.dataset.id);
        const fieldApiName = e.detail.value;
        this.filters = this.filters.map(f => f.id === id ? { ...f, fieldApiName } : f);
        this.dispatchValueChange();
    }
    handleFilterOperatorChange(e) {
        const id = Number(e.currentTarget.dataset.id);
        const operator = e.detail.value;
        this.filters = this.filters.map(f => f.id === id ? { ...f, operator } : f);
        this.dispatchValueChange();
    }
    handleFilterValueChange(e) {
        const id = Number(e.currentTarget.dataset.id);
        const value = e.target.value;
        this.filters = this.filters.map(f => f.id === id ? { ...f, value } : f);
        this.dispatchValueChange();
    }

    // Logic mode
    handleLogicModeChange(e) {
        this.logicMode = e.detail.value;
        this.dispatchValueChange();
    }
    handleCustomLogicChange(e) {
        this.customLogic = e.target.value;
        this.logicMode = 'CUSTOM';
        this.dispatchValueChange();
    }

    get hasAnyFilters() {
        return Array.isArray(this.filters) && this.filters.length > 0;
    }
}