import { LightningElement, api } from 'lwc';
import getsObjects from '@salesforce/apex/ObjectController.getObjectList';

export default class SobjectPicklist extends LightningElement {
    @api flexipageRegionWidth;
    timeout;

    // sObject variables
    OBJECT_SEARCH_TERMS = [];
    sObjectList = [];
    selectedObject = '';
    filteredObjects = [];
    objectFilter = '';

    // Field variables
    ALL_FIELDS = [];
    FIELD_SEARCH_TERMS = [];
    selectableFields = [];
    selectedFields = new Map();
    filteredFields = [];
    fieldFilter = '';

    // Render variables
    dataProcessed = false;
    fieldsUpdated = true;
    objectFilterRunning = false;
    fieldsProcessed = false;
    fieldFilterRunning = false;

    connectedCallback() {
        getsObjects({ dmlType: null }).then(result => {
            this.loadSObjectList(result);
            this.dataProcessed = true;
        }).then(_ => {
            this.dispatchEvent(new CustomEvent('schemaloaded'));
            this.dispatchEvent(new CustomEvent('objectselected', {
                detail: this.selectedObject.value
            }));
        });
    }

    @api
    updateField(field, selected) {
        // Update master
        this.selectableFields = this.selectableFields.map(f =>
            f.value === field ? { ...f, selected } : f
        );

        // Update filtered view if the item is visible
        this.filteredFields = this.filteredFields.map(f =>
            f.value === field ? { ...f, selected } : f
        );

        if (selected) {
            const obj = this.selectableFields.find(f => f.value === field);
            this.selectedFields.set(field, obj);
        } else {
            this.selectedFields.delete(field);
        }

        this.dispatchEvent(
            new CustomEvent('fieldsupdated', { detail: Array.from(this.selectedFields.values()) })
        );
    }

    updateFieldAlias(event) {
        const key = event.target.name;
        const value = event.target.value;

        this.filteredFields.forEach((f, x) => {
            if (f.value === key) {
                this.filteredFields[x].alias = value;

                if (f.selected) {
                    this.dispatchEvent(new CustomEvent('fieldsupdated', {
                        detail: Array.from(this.selectedFields.values())
                    }));
                }
            }
        });
    }

    toggleSelected(event) {
        const selected = event.target.checked;
        const key = event.target.name;
        this.updateField(key, selected);
    }

    @api
    clearAllFields() {
        this.fieldsProcessed = false;
        this.selectedFields.clear();
        this.filteredFields.forEach(f => {
            f.selected = false;
            f.alias = '';
        });
        this.fieldFilter = '';
        this.fieldsProcessed = true;
    }

    loadSObjectList(schema) {
        var sObjects = [];
        sObjects = JSON.parse(schema);

        for (let i = 0; i < sObjects.length; i++) {
            let objLabel = sObjects[i][0];
            let objName = sObjects[i][1];
            let objFields = JSON.parse(sObjects[i][2]);
            let fieldOptions = [];

            for (let x = 0; x < objFields.length; x++) {
                // this is where instead of parsing List<String>, parse List<Object> and set the properties 
                var fieldOption = { label: objFields[x].label, value: objFields[x].value, type: objFields[x].type, index: x, selected: false, alias: '' };
                this.ALL_FIELDS.push(fieldOption);
                this.FIELD_SEARCH_TERMS.push({
                    field: objFields[x].label.toUpperCase() + objFields[x].value.toUpperCase(),
                    object: objName
                });
                fieldOptions.push(fieldOption);
            }

            fieldOptions.sort((a, b) => {
                const x = a.value.toUpperCase();
                const y = b.value.toUpperCase();

                return x > y ? 1 : -1;
            });

            let selectOption = {
                label: objLabel,
                value: objName,
                fields: fieldOptions,
                selected: false
            };

            this.sObjectList.push(selectOption);
        }

        // Sort sObject Picklist Alphabetically by Label
        this.sObjectList.sort((a, b) => {
            const x = a.label.toUpperCase();
            const y = b.label.toUpperCase();

            return x > y ? 1 : -1;
        });

        this.filteredObjects = this.sObjectList; // clone the object list onto a filterable list
        this.selectedObject = this.sObjectList[0];
        this.selectableFields = this.sObjectList[0].fields; // default to the first object in the list 
        this.filteredFields = this.selectableFields; // clone the field list onto a filterable list

        this.fieldsProcessed = true;

        // Create search term index (i.e., "CUSTOM OBJECTCUSTOM_OBJECT__C")
        for (let i = 0; i < this.sObjectList.length; i++) {
            this.OBJECT_SEARCH_TERMS.push(
                JSON.stringify(this.sObjectList[i].label.toUpperCase() + this.sObjectList[i].value.toUpperCase())
            );
        }
    }

    searchFields(event) {
        this.fieldFilter = event.target.value;

        setTimeout(() => {
            this.filterFields();
        }, 200);
    }

    filterFields() {
        clearTimeout(this.timeout);

        this.timeout = setTimeout(() => {
            this.fieldFilterRunning = true;
            this.filteredFields = [];

            if (this.fieldFilter.length === 0) {
                this.filteredFields = this.selectableFields;
            } else {
                const filter = this.fieldFilter.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1").toUpperCase();

                for (let i = 0; i < this.FIELD_SEARCH_TERMS.length; i++) {
                    if (
                        this.FIELD_SEARCH_TERMS[i].field.includes(filter) &&
                        this.FIELD_SEARCH_TERMS[i].object === this.selectedObject.value
                    ) {
                        this.filteredFields.push(this.ALL_FIELDS[i]);
                    }
                }

                const selectedVals = new Set(this.selectedFieldValues); // from your map
                const inList = new Set(this.filteredFields.map(f => f.value));
                this.selectableFields.forEach(f => {
                    if (selectedVals.has(f.value) && !inList.has(f.value)) {
                        this.filteredFields.push(f);
                    }
                });
            }

            this.fieldFilterRunning = false;
        }, 400);
    }

    searchObjects(event) {
        this.objectFilter = event.target.value;

        setTimeout(() => {
            this.filterObjects();
        }, 200);
    }

    filterObjects() {
        clearTimeout(this.timeout);

        this.timeout = setTimeout(() => {
            this.dataProcessed = false;
            this.objectFilterRunning = true;
            this.filteredObjects = [];
            if (this.objectFilter.length === 0) {
                this.filteredObjects = this.sObjectList;

            } else if (this.objectFilter.length > 0) {
                this.fieldsProcessed = false;
                var filter = this.objectFilter.replace(/([.?*+^$[\]\\(){}|-])/g, "\\$1").toUpperCase();

                for (let i = 0; i < this.OBJECT_SEARCH_TERMS.length - 1; i++) {
                    if (this.OBJECT_SEARCH_TERMS[i].includes(filter)) {
                        this.filteredObjects.push(this.sObjectList[i]);
                    }
                }

                if (this.filteredObjects.length > 0) {
                    this.selectedObject = this.filteredObjects[0];
                    this.selectableFields = this.filteredObjects[0].fields;
                    this.filteredFields = this.selectableFields;

                    this.dispatchEvent(new CustomEvent('objectselected', {
                        detail: this.selectedObject.value
                    }));
                } else {
                    this.selectableFields = '';
                }
            }
            this.fieldsProcessed = true;
            this.dataProcessed = true;
            this.objectFilterRunning = false;

            if (this.fieldFilter) {
                this.filterFields()
            }
        }, 400);
    }

    getFields(event) {
        this.fieldsProcessed = false;

        const objSelected = this.sObjectList.find(obj => {
            return obj.value === event.target.value;
        });

        this.selectedObject = objSelected;
        this.selectableFields = objSelected.fields;
        this.filteredFields = this.selectableFields;
        this.filteredFields.forEach((f, x) => {
            this.filteredFields[x].selected = false;
        });
        this.selectedFields.clear();
        this.fieldsProcessed = true;

        this.dispatchEvent(new CustomEvent('objectselected', {
            detail: this.selectedObject.value
        }));
    }

    // Dual listbox options come from the *filtered* list you already maintain
    get fieldOptions() {
        return (this.filteredFields || []).map(f => ({ label: f.label, value: f.value }));
    }

    // Dual listbox "value" is the array of selected values
    get selectedFieldValues() {
        return Array.from(this.selectedFields.keys());
    }

    // Fired when user moves items between lists
    handleFieldsChange(event) {
        const picked = new Set(event.detail.value); // full selection

        // Update the master list for this object
        this.selectableFields = this.selectableFields.map(f => ({
            ...f,
            selected: picked.has(f.value)
        }));

        // Rebuild the selection map from the master list
        this.selectedFields.clear();
        this.selectableFields.forEach(f => {
            if (f.selected) this.selectedFields.set(f.value, f);
        });

        // Reflect the updated selection into the current filtered view
        const byValue = new Map(this.selectableFields.map(f => [f.value, f]));
        this.filteredFields = this.filteredFields.map(f => byValue.get(f.value) || f);

        this.dispatchEvent(
            new CustomEvent('fieldsupdated', { detail: Array.from(this.selectedFields.values()) })
        );
    }

    /*handleDragStart(event){ 
        event.dataTransfer.setData("field_value", event.target.dataset.item);
    }*/
}