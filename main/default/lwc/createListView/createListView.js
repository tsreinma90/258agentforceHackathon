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
    pendingContext = null;

    normalizeIncomingFilter(f) {
        const op = f?.operator || 'Equals';
        const first = Array.isArray(f?.operandLabels) ? (f.operandLabels[0] ?? '') : '';
        const trimmed = String(first).trim();

        // Preserve blank for Equals/NotEqual, else require non-empty
        const allowsBlank = op === 'Equals' || op === 'NotEqual';
        if (!allowsBlank && trimmed.length === 0) return null;

        return {
            fieldApiName: f.fieldApiName,
            operator: op,
            value: allowsBlank && trimmed.length === 0 ? '' : trimmed
        };
    }

    @api
    preloadContext(context) {
        // Stash and try to apply when ready
        this.pendingContext = context ? { ...context } : null;
        this.applyPendingContextIfReady();
    }

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
        this.applyPendingContextIfReady();
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
        this.applyPendingContextIfReady(); 
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
        this.applyPendingContextIfReady();  
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

    applyPendingContextIfReady() {
        if (!this.pendingContext) return;
        if (this.isLoading) return;                 // wait for schema
        if (!this.selectedObject?.value) return;    // need object
        // We can apply filters/sort/columns even if selectedFields is still empty;
        // but for best UX we prefer to have them (so filter pickers have options).
        // We'll auto-select needed fields via the child API below.

        const ctx = this.pendingContext;

        // If a different object was suggested, you can optionally ignore or gate it.
        // Minimal change: only apply if it matches the current object (or no object provided).
        if (ctx.objectApiName && ctx.objectApiName !== this.selectedObject.value) {
            // Option A (minimal): skip applying until user switches object
            return;
            // Option B (proactive): switch object via child if you expose an @api for that
        }

        // --- Columns: pre-select any suggested columns in the child picker so they appear everywhere
        const desiredColumns = Array.isArray(ctx.fieldApiNames) ? ctx.fieldApiNames : [];
        const neededFields = new Set(desiredColumns);

        // --- Filters: map incoming to our row model; also collect referenced fields
        const incomingFilters = Array.isArray(ctx.filteredByInfo) ? ctx.filteredByInfo : [];
        const mapped = incomingFilters
            .map(f => this.normalizeIncomingFilter(f))
            .filter(Boolean);

        mapped.forEach(f => neededFields.add(f.fieldApiName));

        // Ask child to select needed fields (uses your earlier @api updateField)
        const picker = this.template.querySelector('c-sobject-picklist');
        if (picker) {
            neededFields.forEach(apiName => {
                try { picker.updateField(apiName, true); } catch (_) { }
            });
        }

        // Merge columns into our currently selectedFields (in case child event hasn’t fired yet)
        // This keeps Sort/Filter comboboxes populated immediately.
        const have = new Set(this.selectedFields.map(f => f.value));
        const mergedSelected = [...this.selectedFields];
        neededFields.forEach(api => {
            if (!have.has(api)) mergedSelected.push({ label: api, value: api });
        });
        this.selectedFields = mergedSelected;

        // Apply filters to UI rows
        if (mapped.length) {
            // Build N rows in our model
            this.filters = mapped.map((f, idx) => ({
                id: this.nextFilterId + idx,
                fieldApiName: f.fieldApiName,
                operator: f.operator,
                value: f.value
            }));
            this.nextFilterId += mapped.length;
        }

        // Apply logic mode/string
        if (ctx.filterLogicString && mapped.length > 1) {
            this.logicMode = 'CUSTOM';
            this.customLogic = ctx.filterLogicString;
        } else if (mapped.length > 1) {
            this.logicMode = 'AND'; // sensible default; UI can change it
            this.customLogic = '';
        }

        // Apply sort
        if (ctx.orderBy?.fieldApiName) {
            this.sortField = ctx.orderBy.fieldApiName;
            this.sortDirection = ctx.orderBy.isAscending ? 'ASC' : 'DESC';
            // ensure sort field is among selected so the picker shows it
            if (!neededFields.has(this.sortField)) {
                if (picker) { try { picker.updateField(this.sortField, true); } catch (_) { } }
                if (!have.has(this.sortField)) {
                    this.selectedFields = [...this.selectedFields, { label: this.sortField, value: this.sortField }];
                }
            }
        }

        // We’re done with the pending context
        this.pendingContext = null;

        // Emit updated value (so your response LWC sees the pre-populated state)
        this.dispatchValueChange();
    }
}