import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { createListInfo } from 'lightning/uiListsApi';

export default class ListViewResponse extends NavigationMixin(LightningElement) {
    _value;

    @api
    get value() {
        return this._value;
    }
    set value(v) {
        this._value = v;
    }

    // inbound props (derived)
    label;
    apiName;      // developerName we’ll use for filterName
    objectName;
    fieldApiNames = [];

    // state
    jobComplete = false;
    isWorking = false;
    generatedUrl;
    listViewId; // optional, if you ever need it

    connectedCallback() {
        const value = JSON.parse(JSON.stringify(this.value || {}));
        this.label = value.label;
        this.apiName = (value.apiName || value.label || '').replace(/\s+/g, '_');
        this.objectName = value.objectApiName;
        this.fieldApiNames = value.fieldApiNames || [];
        this.handleCreateListView();
    }

    async handleCreateListView() {
        this.isWorking = true;

        try {
            // Example: build filters dynamically; swap in your actual emails
            const emails = ['tom.reinman@gmail.com'];

            const filters = emails.map(email => ({
                fieldApiName: 'Email',
                operator: 'Equals',
                operandLabels: [email]
            }));
            const logic = `(${filters.map((_, i) => i + 1).join(' OR ')})`;

            const payload = {
                objectApiName: this.objectName,
                listViewApiName: this.apiName,
                label: this.label,
                displayColumns: this.fieldApiNames,
                filteredByInfo: filters,
                filterLogicString: logic,
                visibility: 'Private'
            };

            const result = await createListInfo(payload);
            this.listViewId = result?.id;

            // Build a link the user can bookmark/share (works with developerName)
            const baseUrl = window.location.origin;
            this.generatedUrl = `${baseUrl}/lightning/o/${this.objectName}/list?filterName=${this.apiName}`;

            this.jobComplete = true;
        } catch (err) {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Failed to create list view',
                    message: (err && (err.body?.message || err.message)) || 'Unknown error',
                    variant: 'error'
                })
            );
        } finally {
            this.isWorking = false;
        }
    }

    get cardTitle() {
        return `List View: ${this.label || ''}`;
    }

    get hasFields() {
        return (this.fieldApiNames || []).length > 0;
    }

    handleOpen() {
        // Navigate using NavigationMixin so it opens inside Lightning
        this[NavigationMixin.Navigate]({
            type: 'standard__objectPage',
            attributes: {
                objectApiName: this.objectName,
                actionName: 'list'
            },
            state: {
                filterName: this.apiName
            }
        });
    }

    async handleCopy() {
        try {
            await navigator.clipboard.writeText(this.generatedUrl);
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Link copied',
                    message: 'List view link copied to clipboard.',
                    variant: 'success'
                })
            );
        } catch {
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Copy failed',
                    message: 'Could not copy link.',
                    variant: 'warning'
                })
            );
        }
    }
}