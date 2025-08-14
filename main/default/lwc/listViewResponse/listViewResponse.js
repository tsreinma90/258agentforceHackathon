import { LightningElement, api } from 'lwc';
import { createListInfo } from 'lightning/uiListsApi';

export default class ListViewResponse extends LightningElement {
    @api
    get value() {
        return this._value;
    }

    /**
     * @param {} value
     */
    set value(value) {
        this._value = value;
    }

    label;
    apiName;
    recordId;
    objectName

    generatedUrl;
    jobComplete = false;

    connectedCallback() {
        let value = JSON.parse(JSON.stringify(this.value)); // deep clone

        console.log('***', JSON.stringify(value));

        this.label = value.label;
        this.apiName = value.apiName.replace(/\s+/g, '_');;
        this.objectName = value.objectApiName;
    
       this.handleCreateListView();
    }

    handleCreateListView() {
        const emails = ['tom.reinman@gmail.com'];
        /*this.rawInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);*/

        // Build the filters
        const filters = emails.map(email => ({
            fieldApiName: 'Email',
            operator: 'Equals',
            operandLabels: [email]
        }));
        // Build the logic string: "(1 OR 2 OR 3...)"
        const logic = `(${filters.map((_, i) => i + 1).join(' OR ')})`;

        const payload = {
            objectApiName: this.objectName,
            listViewApiName: this.apiName,
            label: this.label,
            displayColumns: ['FirstName', 'LastName', 'Email'],
            filteredByInfo: filters,
            filterLogicString: logic,
            visibility: 'Private'
        };

        console.log('***', JSON.stringify(payload, undefined, 2));

        createListInfo(payload)
            .then(result => {
                const baseUrl = window.location.origin; // e.g. https://your-domain.lightning.force.com

                this.generatedUrl = `${baseUrl}/lightning/o/Contact/list?filterName=${this.apiName}`;
                this.jobComplete = true;
            })
            .catch(err => {
                console.log('*** Failed to create list view', JSON.stringify(err));
            });
    }
}