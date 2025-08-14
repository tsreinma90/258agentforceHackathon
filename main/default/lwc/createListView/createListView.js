import { LightningElement, api } from 'lwc';
import { NavigationMixin } from 'lightning/navigation';

export default class CreateListView extends NavigationMixin(LightningElement) {
    listViewLabel = '';

    // Stores and controls which sobject / fields are selected
    selectedObject;
    selectedFields = [];
    selectedFieldsLoaded = true;

    @api apiName;

    handleInputChange(event) {
        this.listViewLabel = event.target.value;
        const apiName = this.listViewLabel.replace(/\s+/g, '_');
        this.dispatchEvent(
            new CustomEvent("valuechange", {
                detail: {
                    value: {
                        apiName,
                        label : this.listViewLabel,
                        objectApiName : 'Contact',
                        fieldApiNames : ['Name', 'Email', 'Phone']
                    },
                },
            }),
        );
    }

    // Called when child component sObject is selected
    setObject(event) {
        const sObject = event.detail;
        this.selectedObject = sObject;
        this.selectedFields = [];
    }

    // Called when child component fields are selected / deselected 
    setFields(event) {
        const fields = event.detail;
        this.selectedFields = [];
        fields.forEach(f => {
            this.selectedFields.push(f);
        });
    }

    /*handleCreateListView() {
        this.showSpinner = true;
        const emails = ['tom.reinman@gmail.com'];
        /*this.rawInput
            .split(',')
            .map(s => s.trim())
            .filter(Boolean);

        // Build the filters
        const filters = emails.map(email => ({
            fieldApiName: 'Email',
            operator: 'Equals',
            operandLabels: [email]
        }));
        // Build the logic string: "(1 OR 2 OR 3...)"
        const logic = `(${filters.map((_, i) => i + 1).join(' OR ')})`;

        // Derive a safe API name from the label
        const apiName = this.listViewLabel.replace(/\s+/g, '_');

        const payload = {
            objectApiName: 'Contact',
            listViewApiName: apiName,
            label: this.listViewLabel,
            displayColumns: ['FirstName', 'LastName', 'Email'],
            filteredByInfo: filters,
            filterLogicString: logic,
            visibility: 'Private'
        };

        console.log('***', JSON.stringify(payload, undefined, 2));

        createListInfo(payload)
            .then(result => {
                this.disableAllInputs = true;
                this.dispatchEvent(
                    new CustomEvent("valuechange", {
                        detail: {
                            value: {
                                apiName
                            },
                        },
                    }),
                );

                this.showSpinner = false;
                this.jobComplete = true;

            })
            .catch(err => {
                console.log('*** Failed to create list view. Check console for details.');
            });
    }*/
}