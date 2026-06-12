system:
    instructions: |
        You are the Use-Case Research Agent for Agentforce design-thinking workshops.

        Your job: a workshop participant gives you (a) a summarized meeting transcript of someone
        presenting the use cases they designed, and (b) an LLM-generated description of the Lucid
        board from the workshop (an impact/effort matrix of candidate AI/agent use cases). You
        research those use cases on the web and in Salesforce documentation, then produce a
        beautiful, useful HTML report the participant can take back to their team, and you save it
        as a Salesforce Note so they have a clickable link.

        The user's current context is:
        Current Record ID: {!@variables.currentRecordId}
    messages:
        welcome: |
            Hi! Paste in your workshop transcript and the Lucid board description, and I'll research
            the use cases and build you a polished report you can take back to your team.
        error: "Something went wrong. Try again."

config:
    agent_label: "Use-Case Research Agent"
    agent_template: "EmployeeCopilot__AgentforceEmployeeAgent"
    developer_name: "Use_Case_Research_Agent"
    agent_type: "AgentforceEmployeeAgent"
    description: "Researches Agentforce/AI use cases from a workshop transcript and Lucid board, then generates a beautiful HTML report and saves it as a Salesforce Note."

language:
    default_locale: "en_US"
    additional_locales: "en_GB"
    all_additional_locales: False

variables:
    currentRecordId: mutable string
        description: "The Salesforce ID of the current record (used to associate the saved note)"
        visibility: "External"

knowledge:
    rag_feature_config_id: ""
    citations_url: ""
    citations_enabled: False

start_agent use_case_research:
    label: "Use-Case Research"
    description: "Research workshop use cases and produce a polished HTML report saved as a note."
    model_config:
        model: "model://sfdc_ai__DefaultVertexAIGemini35Flash"
    reasoning:
        instructions: ->
            | You turn a design-thinking workshop's output into a researched, beautiful report.
            |
            | INPUT you will receive from the user (in their message):
            |   1) A summarized meeting transcript (e.g. from Granola) of someone presenting the
            |      use cases they designed.
            |   2) An LLM-generated description of the Lucid board (an impact/effort matrix of
            |      candidate AI/agent use cases) from the same workshop.
            |
            | Follow these steps IN ORDER. Do not skip the research.
            |
            | STEP 1 — Understand. Read the transcript and board description. Identify the client/
            | company, the prioritized use cases, and the recurring themes (e.g. order status,
            | complaint triage, case classification, knowledge coverage, translation).
            |
            | STEP 2 — Research the web. Use the Search The Web action to find relevant, current
            | information for these use cases: industry context, comparable AI/agent deployments,
            | benchmarks, and best practices. Run it for the most important themes (e.g. the top
            | 2-3 use cases). Capture the key findings and the citation source links.
            |
            | STEP 3 — Research Salesforce documentation. Use the Answer Questions with Salesforce
            | Documentation action to find how Agentforce / Salesforce features map to these use
            | cases (e.g. Employee Agent, Flow actions, Knowledge, Prompt Templates, case
            | classification). Capture the guidance and the source article links.
            |
            | STEP 4 — Build the report. Call the Build Use-Case Research Report action with these
            | content slots, written richly and specifically for THIS client:
            |   - reportTitle: "<Client> — Agentforce Use-Case Research" (generate it).
            |   - clientName: the client/company name.
            |   - executiveSummary: 2-4 sentences on the opportunity and where to start.
            |   - useCases: an HTML <table> with columns: Use case | Impact | Effort | What it does.
            |     Order rows by priority (high impact / low effort first). Use the board's impact &
            |     effort positions.
            |   - webResearch: the key findings from STEP 2 as HTML paragraphs and/or a <ul> list.
            |   - salesforceGuidance: the guidance from STEP 3 as HTML, naming the specific
            |     Salesforce/Agentforce features that fit each major use case.
            |   - recommendations: an HTML <ul> (or <ol>) of concrete next steps, phased.
            |   - sources: an HTML <ul> of <a> links combining the web citation sources and the
            |     Salesforce documentation article links.
            |   - recordId: pass {!@variables.currentRecordId} if it is set, otherwise leave blank.
            |   The action owns all visual styling — you only supply clean content (use <h3>, <p>,
            |   <ul>/<li>, <table>; do NOT add <style>, colors, or a full HTML document).
            |
            | STEP 5 — Respond. After the report is built, give the user a short confirmation and
            | share the returned note so they can click straight into their report. Briefly list
            | the 2-3 headline recommendations.
            |
            | Be concrete and specific to the client — never generic. Always run the research
            | actions before building the report; do not fabricate web or documentation findings.

        actions:
            research_web: @actions.WebSearch
                with searchQuery = ...
            research_salesforce: @actions.AnswerQuestionsWithSalesforceDocumentation
                with query = ...
            build_report: @actions.Employee_Agent_Build_Report
                with reportTitle = ...
                with clientName = ...
                with executiveSummary = ...
                with useCases = ...
                with webResearch = ...
                with salesforceGuidance = ...
                with recommendations = ...
                with sources = ...
                with recordId = @variables.currentRecordId

    actions:
        WebSearch:
            description: |
                Retrieves real-time or external information that isn't available in Salesforce CRM. Use it for questions about news, market trends, competitor details, and product comparisons, or when Salesforce answers need added context from the web.
            label: "Search The Web"
            require_user_confirmation: False
            include_in_progress_indicator: True
            progress_indicator_message: "Searching the web"
            source: "EmployeeCopilot__WebSearch"
            target: "standardInvocableAction://webSearchStream"

            inputs:
                "searchQuery": string
                    description: |
                      Free-text input that specifies what the user wants to search for.
                    label: "Search Query"
                    is_required: True
                    is_user_input: True
                "searchProvider": string
                    description: |
                      The search provider used for web searches.
                    label: "Search Provider"
                    is_required: False
                    is_user_input: False
                "siteFilter": string
                    description: |
                      A comma-separated list of up to 10 allowed domains to filter web search results.
                    label: "Allowed Domains"
                    is_required: False
                    is_user_input: False

            outputs:
                "webSearchSummary": object
                    description: |
                      A prompt that summarizes information from the web search for use in the action.
                    label: "Summary of Web Search"
                    is_displayable: False
                    filter_from_agent: False
                    complex_data_type_name: "lightning__richTextType"
                "citationSources": object
                    description: |
                      Source links from the retrieved content used in the web search summary.
                    label: "Citation Sources"
                    is_displayable: False
                    filter_from_agent: False
                    complex_data_type_name: "@apexClassType/AiCopilot__GenAiCitationInput"
        Employee_Agent_Build_Report:
            description: |
                Assembles a polished, branded HTML use-case research report from content slots, saves it as a Salesforce Note, and returns the created note and the full styled HTML. Use this once at the end to produce the final workshop deliverable.
            label: "Build Use-Case Research Report"
            require_user_confirmation: False
            include_in_progress_indicator: True
            progress_indicator_message: "Building your report"
            source: "Employee_Agent_Build_Report"
            target: "apex://WorkshopReportBuilder"

            inputs:
                "reportTitle": string
                    description: |
                      The report title / headline, e.g. 'MidOcean — Agentforce Use-Case Research'.
                    label: "reportTitle"
                    is_required: True
                    is_user_input: True
                "clientName": string
                    description: |
                      The client or workshop name shown in the report header, e.g. 'MidOcean'.
                    label: "clientName"
                    is_required: False
                    is_user_input: True
                "executiveSummary": string
                    description: |
                      A short executive summary of the workshop and the opportunity. Plain text or simple HTML.
                    label: "executiveSummary"
                    is_required: False
                    is_user_input: True
                "useCases": string
                    description: |
                      The prioritized use cases. Strongly prefer an HTML table with columns Use case / Impact / Effort / What it does. Plain text is also accepted.
                    label: "useCases"
                    is_required: False
                    is_user_input: True
                "webResearch": string
                    description: |
                      A summary of relevant findings from the web search, as HTML or plain text.
                    label: "webResearch"
                    is_required: False
                    is_user_input: True
                "salesforceGuidance": string
                    description: |
                      A summary of relevant Salesforce / Agentforce documentation guidance, as HTML or plain text.
                    label: "salesforceGuidance"
                    is_required: False
                    is_user_input: True
                "recommendations": string
                    description: |
                      Concrete recommended next steps for the client, as an HTML list or newline-separated plain text.
                    label: "recommendations"
                    is_required: False
                    is_user_input: True
                "sources": string
                    description: |
                      Sources and links used, ideally as an HTML list of <a> links, or newline-separated URLs.
                    label: "sources"
                    is_required: False
                    is_user_input: True
                "recordId": string
                    description: |
                      Optional. The Salesforce record Id to associate the note with. Leave blank for a standalone note.
                    label: "recordId"
                    is_required: False
                    is_user_input: True

            outputs:
                "isSuccess": boolean
                    description: |
                      True if the report was built and saved successfully.
                    label: "isSuccess"
                    is_displayable: False
                    filter_from_agent: False
                "note": object
                    description: |
                      The created Note record (a ContentDocument). Share this record with the user so they can open the report — it renders as a clickable link.
                    label: "note"
                    is_displayable: True
                    filter_from_agent: True
                    complex_data_type_name: "lightning__recordInfoType"
                "message": string
                    description: |
                      A short status message describing the result, suitable to relay to the user.
                    label: "message"
                    is_displayable: True
                    filter_from_agent: True
        AnswerQuestionsWithSalesforceDocumentation:
            description: |
                Answers questions about how to use Salesforce products with Salesforce documentation. For example: “How do I create a permission set?”. This action is automatically invoked if no other actions are available for the utterance.
            label: "Answer Questions with Salesforce Documentation (Beta)"
            require_user_confirmation: False
            include_in_progress_indicator: True
            progress_indicator_message: "Searching Salesforce Documentation"
            source: "AdminCopilot__AnswerQuestionsWithSalesforceDocumentation"
            target: "standardInvocableAction://answerQuestionsWithSalesforceDocumentation"

            inputs:
                "query": string
                    description: |
                      Required. A string created by generative AI to be used when searching Salesforce documentation for information about their products.
                    label: "Query"
                    is_required: True
                    is_user_input: True

            outputs:
                "helpDocumentationSummary": object
                    description: |
                      A string formatted as rich text that includes a summary of the information about Salesforce products retrieved from the Salesforce documentation and links to the source articles.
                    label: "Salesforce Documentation Summary"
                    is_displayable: True
                    filter_from_agent: False
                    complex_data_type_name: "lightning__richTextType"
