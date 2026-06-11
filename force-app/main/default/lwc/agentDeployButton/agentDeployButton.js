import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import deployAgent from '@salesforce/apex/NextGenAgentDeployer.deployAgent';

/**
 * OPTIONAL ACCELERATOR button — one-click deploy + publish + activate of the starter
 * Agent Script agent, plus agent-access perm-set assignment.
 *
 * This is a convenience / backup path, NOT the workshop's main exercise (attendees
 * normally build the agent themselves in Agent Studio). It is intended to run from a
 * Visualforce-hosted context so the Apex self-callout gets an API-enabled session; when
 * `sessionId` is provided by the host page it is forwarded to Apex.
 */
export default class AgentDeployButton extends LightningElement {
    // Configurable in App Builder / by the host.
    @api agentApiName = 'Note_taking_agent';
    @api agentLabel = 'Employee Agent V1';
    @api staticResourceName = 'Note_taking_agent_afscript';
    @api accessPermSet = 'Employee_Agent_Workshop';
    // When hosted in a Visualforce page, the page passes its API-enabled session id here.
    @api sessionId = '';

    @track result;
    isRunning = false;
    error;

    get isDone() {
        return this.result && this.result.success;
    }

    get buttonLabel() {
        if (this.isRunning) return 'Deploying agent…';
        return this.isDone ? 'Re-deploy agent' : 'Deploy agent for me';
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
                sessionId: this.sessionId || ''
            });
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Agent deployed',
                    message: 'Your agent was published and activated. Open it from any app.',
                    variant: 'success'
                })
            );
        } catch (e) {
            this.error = this.reduceError(e);
            this.dispatchEvent(
                new ShowToastEvent({ title: 'Deploy failed', message: this.error, variant: 'error' })
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
