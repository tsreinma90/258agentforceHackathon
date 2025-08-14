import { LightningElement } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class CreateListView extends NavigationMixin(LightningElement) {
    apiName;

    isLoading = true;

    // existing state
    listViewLabel = '';
    selectedObject;
    selectedFields = [];
    selectedFieldsLoaded = true;

    sortField = '';
    sortDirection = 'ASC'; // 'ASC' | 'DESC'

    // NEW: placeholders (no UI yet)
    filteredByInfo = null;
    orderBy = null;

    handleSchemaLoaded() {
    this.isLoading = false;
  }
  
    // ---- helpers ----
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

    dispatchValueChange() {
        this.dispatchEvent(new CustomEvent('valuechange', {
            detail: {
                value: {
                    apiName: this.computedApiName,
                    label: this.listViewLabel,
                    objectApiName: this.objectApiName,
                    fieldApiNames: this.fieldApiNames,

                    // NEW (optional) – safe to be null/undefined for now
                    filteredByInfo: this.filteredByInfo,
                    orderBy: this.orderBy
                }
            },
            bubbles: true,
            composed: true
        }));
    }

    // ---- handlers (unchanged) ----
    handleInputChange(event) {
        this.listViewLabel = event.target.value;
        this.dispatchValueChange();
    }

    setObject(event) {
        this.selectedObject = event.detail;
        this.selectedFields = [];
        this.dispatchValueChange();
    }

    setFields(event) {
        const fields = event.detail;
        this.selectedFields = Array.isArray(fields) ? fields.slice() : [];
        this.dispatchValueChange();
    }

    get hasSortOptions() {
        // show sort controls only when we have at least one field to choose from
        return Array.isArray(this.selectedFields) && this.selectedFields.length > 0;
    }

    get sortFieldOptions() {
        // always return an array
        const list = Array.isArray(this.selectedFields) ? this.selectedFields : [];
        return list.map(f => ({ label: f.label || f.value, value: f.value }));
    }

    handleSortFieldChange(event) {
        this.sortField = event.detail.value;
        this.dispatchValueChange();
    }

    handleSortDirChange(event) {
        // defensive default to avoid undefined
        this.sortDirection = event.detail?.value || 'ASC';
        this.dispatchValueChange();
    }

    // Sort direction options (ensure this exists and always returns an array)
    get sortDirectionOptions() {
        return [
            { label: 'Ascending', value: 'ASC' },
            { label: 'Descending', value: 'DESC' }
        ];
    }
}