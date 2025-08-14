import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class CreateListView extends NavigationMixin(LightningElement) {
    // inbound
    @api apiName;

    // ui state
    listViewLabel = '';
    selectedObject;          // expect { value: 'Contact', label: 'Contact', ... } from child
    selectedFields = [];     // expect array of field objects [{label, value, ...}]
    selectedFieldsLoaded = true;

    // ---- helpers ----
    get computedApiName() {
        // precedence: explicit @api apiName, else label-based slug, else empty
        return (this.apiName && this.apiName.trim())
            ? this.apiName
            : (this.listViewLabel || '').replace(/\s+/g, '_');
    }

    get objectApiName() {
        // child sends object API name in event.detail (e.g., 'Contact')
        return this.selectedObject?.value || 'Contact';
    }

    get fieldApiNames() {
        // normalize to string[] of API names
        return (this.selectedFields || []).map(f => f.value);
    }

    dispatchValueChange() {
        this.dispatchEvent(
            new CustomEvent('valuechange', {
                detail: {
                    value: {
                        apiName: this.computedApiName,
                        label: this.listViewLabel,
                        objectApiName: this.objectApiName,
                        fieldApiNames: this.fieldApiNames
                    }
                },
                bubbles: true,
                composed: true
            })
        );
    }

    // ---- handlers ----
    handleInputChange(event) {
        this.listViewLabel = event.target.value;
        this.dispatchValueChange();
    }

    // Called when child component sObject is selected
    setObject(event) {
        this.selectedObject = event.detail;   // { value: 'Contact', ... }
        this.selectedFields = [];             // reset fields when object changes (optional)
        this.dispatchValueChange();
    }

    // Called when child component fields are selected / deselected 
    setFields(event) {
        const fields = event.detail;          // array of field objects
        this.selectedFields = Array.isArray(fields) ? fields.slice() : [];
        this.dispatchValueChange();
    }
}