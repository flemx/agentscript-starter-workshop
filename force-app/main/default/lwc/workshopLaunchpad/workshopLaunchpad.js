import { LightningElement, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import getConfig from '@salesforce/apex/WorkshopSetupController.getConfig';
import getStatus from '@salesforce/apex/WorkshopSetupController.getStatus';
import runSetup from '@salesforce/apex/WorkshopSetupController.runSetup';

/**
 * The workshop launchpad — the Home page of the package's Lightning app.
 *
 * Welcomes the attendee, links out to the self-guided workshop guide, and runs the
 * one-click post-install setup: assigning the required permission sets / groups to
 * the running user. (Building and publishing the agent itself happens in Agent Studio,
 * guided by the web app — publishing an Agent Script bundle has no in-org API.)
 */
export default class WorkshopLaunchpad extends LightningElement {
    @track config;
    @track items = [];
    isLoading = true;
    isRunning = false;
    setupComplete = false;
    error;

    connectedCallback() {
        this.loadConfigAndStatus();
    }

    async loadConfigAndStatus() {
        this.isLoading = true;
        try {
            this.config = await getConfig();
            const status = await getStatus();
            this.applyStatus(status);
        } catch (e) {
            this.error = this.reduceError(e);
        } finally {
            this.isLoading = false;
        }
    }

    async handleRunSetup() {
        this.isRunning = true;
        this.error = undefined;
        try {
            const results = await runSetup();
            this.applyStatus(results);
            if (this.allReady) {
                this.setupComplete = true;
                this.toast('You\'re all set', 'Permission sets assigned — you\'re ready to build your agent.', 'success');
            } else if (this.hasErrors) {
                this.toast('Setup needs attention', 'Some items could not be assigned. Review the list below or re-run setup.', 'warning');
            } else {
                this.toast('Setup incomplete', 'Some items were not found in this org. Check that the package installed fully.', 'warning');
            }
        } catch (e) {
            this.error = this.reduceError(e);
            this.toast('Setup failed', this.error, 'error');
        } finally {
            this.isRunning = false;
        }
    }

    handleOpenGuide() {
        if (this.config && this.config.workshopGuideUrl) {
            window.open(this.config.workshopGuideUrl, '_blank', 'noopener');
        }
    }

    /** Maps Apex ItemResult rows into display-ready rows with an icon + variant. */
    applyStatus(results) {
        this.items = (results || []).map((r) => {
            const ready = r.status === 'assigned' || r.status === 'already';
            return {
                key: `${r.type}:${r.name}`,
                name: r.name,
                typeLabel: r.type === 'PermissionSetGroup' ? 'Permission Set Group' : 'Permission Set',
                status: r.status,
                message: r.message,
                ready,
                iconName: ready ? 'utility:success' : r.status === 'error' ? 'utility:error' : 'utility:clock',
                iconVariant: ready ? 'success' : r.status === 'error' ? 'error' : 'warning'
            };
        });
    }

    get hasItems() {
        return this.items && this.items.length > 0;
    }

    get allReady() {
        return this.hasItems && this.items.every((i) => i.ready);
    }

    get hasErrors() {
        return this.items.some((i) => i.status === 'error');
    }

    get hasGuideUrl() {
        return !!(this.config && this.config.workshopGuideUrl);
    }

    get setupButtonLabel() {
        if (this.isRunning) {
            return 'Running setup…';
        }
        return this.allReady ? 'Re-run setup' : 'Run setup';
    }

    get statusBannerClass() {
        return this.allReady
            ? 'slds-box slds-theme_success slds-m-top_medium'
            : 'slds-box slds-theme_shade slds-m-top_medium';
    }

    get statusBannerText() {
        if (this.allReady) {
            return 'Setup complete — your permissions are assigned. Head to Agent Studio to build Employee Agent V1.';
        }
        return 'Click Run Setup to assign the permission sets you need for the workshop.';
    }

    toast(title, message, variant) {
        this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
    }

    reduceError(error) {
        if (Array.isArray(error.body)) {
            return error.body.map((e) => e.message).join(', ');
        } else if (error.body && typeof error.body.message === 'string') {
            return error.body.message;
        } else if (typeof error.message === 'string') {
            return error.message;
        }
        return 'Unknown error';
    }
}
