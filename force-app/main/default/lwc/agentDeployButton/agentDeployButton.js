import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import deployAgent from '@salesforce/apex/NextGenAgentDeployer.deployAgent';

/**
 * STARTER-AGENT INSTALLER button — one-click install of the workshop's starter template
 * agent (Employee Agent V1): deploy + publish + activate the Agent Script bundle, then
 * grant the running user access to it. The attendee then ADDS instructions and actions to
 * this starter in Agent Studio during the guide.
 *
 * Re-running is safe: by default, if the agent already exists it is NOT duplicated — the
 * button reports it as already installed and (re)grants access. Tick "Deploy a fresh copy"
 * to deliberately create another agent under the next free name and grant access to that one.
 *
 * Runs from a Visualforce-hosted context so the Apex self-callout gets an API-enabled
 * session; when `sessionId` is provided by the host page it is forwarded to Apex.
 */
export default class AgentDeployButton extends LightningElement {
    // Configurable in App Builder / by the host.
    @api agentApiName = 'Note_taking_agent';
    @api agentLabel = 'Employee Agent V1';
    @api staticResourceName = 'Note_taking_agent_afscript';
    @api accessPermSet = 'Employee_Agent_Workshop';
    @api cardTitle = 'Install the starter agent';
    @api cardDescription =
        'Installs your starting point — the Employee Agent V1 template — and grants you access.';
    // When hosted in a Visualforce page, the page passes its API-enabled session id here.
    @api sessionId = '';

    @track result;
    isRunning = false;
    forceNew = false;
    error;

    get isDone() {
        return this.result && this.result.success;
    }

    get buttonLabel() {
        if (this.isRunning) return 'Installing agent…';
        return this.isDone ? 'Re-run install' : 'Install starter agent';
    }

    handleForceNewChange(event) {
        this.forceNew = event.target.checked;
    }

    async handleDeploy() {
        this.isRunning = true;
        this.error = undefined;
        try {
            this.result = await deployAgent({
                apiName: this.agentApiName,
                label: this.agentLabel,
                staticResourceName: this.staticResourceName,
                accessPermSetName: this.accessPermSet,
                forceNew: this.forceNew,
                sessionId: this.sessionId || ''
            });
            this.dispatchEvent(
                new ShowToastEvent({
                    title: this.result.alreadyExisted ? 'Agent already installed' : 'Agent installed',
                    message: this.result.message,
                    variant: 'success'
                })
            );
        } catch (e) {
            this.error = this.reduceError(e);
            this.dispatchEvent(
                new ShowToastEvent({ title: 'Install failed', message: this.error, variant: 'error' })
            );
        } finally {
            this.isRunning = false;
        }
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
