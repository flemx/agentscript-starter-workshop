import { LightningElement, api, track, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getNotes from '@salesforce/apex/NoteViewerController.getNotes';
import getNote from '@salesforce/apex/NoteViewerController.getNote';

/**
 * Read-only viewer for HTML Notes (ContentNote).
 *
 * Lists the org's notes, renders the selected note's HTML in a clean, formatted view, and
 * offers a "Download PDF" that opens a print-friendly window (browser → Save as PDF). This
 * showcases the richly-formatted notes the workshop's HTML-note feature produces.
 */
export default class NoteViewer extends LightningElement {
    // Optionally open straight to one note (e.g. when dropped on a record page).
    @api recordId;

    @track notes = [];
    @track selected; // { contentDocumentId, title, html, linkedRecordName, linkedRecordId, linkedRecordUrl }
    isLoading = true;
    error;
    urlNoteId;

    @wire(CurrentPageReference)
    getPageReference(pageRef) {
        if (pageRef && pageRef.state) {
            // Check for both 'id' and 'c__id' (namespaced)
            this.urlNoteId = pageRef.state.id || pageRef.state.c__id;
        }
    }

    connectedCallback() {
        this.loadNotes();
    }

    async loadNotes() {
        this.isLoading = true;
        try {
            this.notes = await getNotes({ limitSize: 20 });
            // Priority: URL param > recordId prop > first note
            if (this.urlNoteId) {
                await this.open(this.urlNoteId);
            } else if (this.recordId) {
                await this.open(this.recordId);
            } else if (this.notes.length) {
                await this.open(this.notes[0].contentDocumentId);
            }
        } catch (e) {
            this.error = this.reduceError(e);
        } finally {
            this.isLoading = false;
        }
    }

    async handleSelect(event) {
        const id = event.currentTarget.dataset.id;
        await this.open(id);
    }

    async open(contentDocumentId) {
        this.error = undefined;
        try {
            this.selected = await getNote({ contentDocumentId });
            // Render the HTML after selection
            this.renderNoteHtml();
        } catch (e) {
            this.error = this.reduceError(e);
        }
    }

    renderNoteHtml() {
        // Use renderedCallback to ensure the DOM is ready
        if (this.selected && this.selected.html) {
            requestAnimationFrame(() => {
                const container = this.template.querySelector('.note-html-container');
                if (container) {
                    container.innerHTML = this.selected.html;
                }
            });
        }
    }

    get hasNotes() {
        return this.notes && this.notes.length > 0;
    }

    get noteList() {
        return (this.notes || []).map((n) => ({
            ...n,
            cssClass:
                this.selected && this.selected.contentDocumentId === n.contentDocumentId
                    ? 'note-item note-item_active'
                    : 'note-item'
        }));
    }

    /** Opens the note's HTML in a print window so the user can Save as PDF. */
    handleDownloadPdf() {
        if (!this.selected) {
            return;
        }
        const title = this.escapeText(this.selected.title || 'Note');
        const html = this.selected.html || '';
        const doc = `<!doctype html><html><head><meta charset="utf-8"/><title>${title}</title>
<style>
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;
    color:#16325c;line-height:1.5;max-width:760px;margin:40px auto;padding:0 24px;}
  h1,h2,h3{color:#032d60;}
  table{border-collapse:collapse;width:100%;} td,th{border:1px solid #d8dde6;padding:6px 10px;}
  img{max-width:100%;height:auto;}
  @media print{body{margin:0;}}
</style></head><body><h1>${title}</h1>${html}</body></html>`;
        const w = window.open('', '_blank');
        if (w) {
            w.document.open();
            w.document.write(doc);
            w.document.close();
            // Trigger print from parent after a short delay to ensure content is loaded
            setTimeout(() => {
                if (w && !w.closed) {
                    w.focus();
                    w.print();
                }
            }, 100);
        }
    }

    escapeText(s) {
        return String(s).replace(/[&<>"]/g, (c) =>
            ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])
        );
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
