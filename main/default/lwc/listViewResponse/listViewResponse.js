import { LightningElement, api } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { NavigationMixin } from 'lightning/navigation';
import { createListInfo } from 'lightning/uiListsApi';

export default class ListViewResponse extends NavigationMixin(LightningElement) {
  _value;

  // Accept either flat { ... } or { details: { ... } }
  normalize(v) {
    return v && v.details ? v.details : v || {};
  }

  @api
  get value() {
    return this._value;
  }
  set value(v) {
    this._value = v;
    if (this.isConnected) this.initializeFromValue();
  }

  // inbound props (derived)
  label;
  apiName;
  objectName;
  fieldApiNames = [];
  filteredByInfo = null;
  filterLogicString = null;   // <-- important
  orderBy = null;

  // state
  jobComplete = false;
  isWorking = false;
  generatedUrl;
  listViewId;

  connectedCallback() {
    this.initializeFromValue();
  }

  normalizeOperand(val) {
    const s = String(val ?? '').trim();
    if (s === '') return s; // allow blank (for Equals/NotEqual blank checks)
    const low = s.toLowerCase();
    if (low === 'true' || low === '1' || low === 'yes' || low === 'y') return '1';
    if (low === 'false' || low === '0' || low === 'no' || low === 'n') return '0';
    return s; // leave other values as-is
  }

  initializeFromValue() {
    const value = this.normalize(this._value);
    if (!value || !value.objectApiName) return;

    this.label = value.label;
    this.apiName = (value.apiName || value.label || '').replace(/\s+/g, '_');
    this.objectName = value.objectApiName;
    this.fieldApiNames = value.fieldApiNames || [];
    this.filteredByInfo = value.filteredByInfo || null;
    this.filterLogicString = value.filterLogicString || null;  // <-- read it
    this.orderBy = value.orderBy || null;

    this.handleCreateListView();
  }

  async handleCreateListView() {
    this.isWorking = true;

    try {
      // Put sort field first (UI API has no explicit sort param)
      let displayColumns = [...(this.fieldApiNames || [])];
      if (this.orderBy?.fieldApiName) {
        const sortField = this.orderBy.fieldApiName;
        displayColumns = [sortField, ...displayColumns.filter(c => c !== sortField)];
      }

      const hasFilters = Array.isArray(this.filteredByInfo) && this.filteredByInfo.length > 0;

      // Normalize operands (e.g., boolean true/false -> "1"/"0")
      let normalizedFilters = undefined;
      if (hasFilters) {
        normalizedFilters = this.filteredByInfo.map(f => ({
          ...f,
          operandLabels: (Array.isArray(f.operandLabels) ? f.operandLabels : [])
            .map(v => this.normalizeOperand(v))
        }));
      }

      // logic string (existing)
      let logic =
        (typeof this.filterLogicString === 'string' && this.filterLogicString.trim())
          ? this.filterLogicString.trim()
          : undefined;
      if (!logic && hasFilters && this.filteredByInfo.length > 1) {
        logic = `(${Array.from({ length: this.filteredByInfo.length }, (_, i) => i + 1).join(' AND ')})`;
      }

      const payload = {
        objectApiName: this.objectName,
        listViewApiName: this.apiName,
        label: this.label,
        visibility: 'Private',
        displayColumns,
        ...(hasFilters ? { filteredByInfo: normalizedFilters } : {}),
        ...(logic ? { filterLogicString: logic } : {})
      };

      // Debug payload
      // eslint-disable-next-line no-console
      console.log('*** createListInfo payload', JSON.stringify(payload));

      const result = await createListInfo(payload);
      this.listViewId = result?.id;

      const baseUrl = window.location.origin;
      this.generatedUrl = `${baseUrl}/lightning/o/${this.objectName}/list?filterName=${this.apiName}`;
      this.jobComplete = true;
    } catch (err) {
      // Pull the most helpful message from the UI API error shape
      const body = err?.body || {};
      const top = body.message;

      const opErrors = Array.isArray(body?.output?.errors)
        ? body.output.errors.map(e => e.message).filter(Boolean)
        : [];

      // field-level messages are nested by field; flatten them
      const fieldErrObj = body?.output?.fieldErrors || {};
      const fieldMsgs = Object.values(fieldErrObj)
        .flat()
        .map(e => e.message)
        .filter(Boolean);

      const allMsgs = [top, ...opErrors, ...fieldMsgs].filter(Boolean);
      const message = allMsgs.length ? allMsgs.join(' • ') : (err?.message || 'Unknown error');

      this.dispatchEvent(new ShowToastEvent({
        title: 'Failed to create list view',
        message,
        variant: 'error'
      }));

      // eslint-disable-next-line no-console
      console.error('*** createListInfo error', JSON.stringify(err, null, 2));
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
    this[NavigationMixin.Navigate]({
      type: 'standard__objectPage',
      attributes: { objectApiName: this.objectName, actionName: 'list' },
      state: { filterName: this.apiName }
    });
  }

  async handleCopy() {
    try {
      await navigator.clipboard.writeText(this.generatedUrl);
      this.dispatchEvent(new ShowToastEvent({
        title: 'Link copied',
        message: 'List view link copied to clipboard.',
        variant: 'success'
      }));
    } catch {
      this.dispatchEvent(new ShowToastEvent({
        title: 'Copy failed',
        message: 'Could not copy link.',
        variant: 'warning'
      }));
    }
  }
}