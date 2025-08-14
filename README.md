# 258agentforceHackathon

Overview

Agentic List View is a proof-of-concept built during the 258 Agentforce Hackathon to demonstrate how we can bridge standard Salesforce CRM functionality with Agentforce and LLM-powered natural language experiences.

The goal:
	•	Allow users to create List Views directly from an Agent conversation.
	•	Pre-populate the necessary fields in a custom LWC based on context from the agent’s actions, reducing manual setup.
	•	Show how Agentforce can make common CRM tasks faster, easier, and more accessible from mobile or Slack, where traditional Salesforce tabs might not be available.

⸻

Features
	•	Agent-triggered list view creation – Users can simply ask the agent to create a list view based on prior queries.
	•	Context variable integration – Passes data retrieved in a previous action directly into the list view creation form.
	•	Pre-populated LWC fields – Eliminates manual field entry by automatically filling in details from the agent’s context.
	•	Lightweight architecture – Built in just 2.5 days with minimal components.

⸻

Technical Design

This project was intentionally kept lightweight:
	•	1 Apex Invocable Action – Handles list view creation logic.
	•	2 Lightning Web Components
	•	Input LWC – Captures the list view configuration from the user.
	•	Output LWC – Displays confirmation and results.
	•	2 Lightning Types – Override the output on the Agent action for list view creation.

While some design choices (like object selection options) were simplified due to the time constraint, the implementation demonstrates how traditional CRM workflows can be enhanced with LLM-driven automation.

⸻

Example Flow
	1.	User Query: “Find all Contacts in New York I need to follow up with.”
	2.	Agent Action: Uses the standard Query Records action to retrieve matching Contacts.
	3.	Follow-Up Request: “Create a list view for these records.”
	4.	Agent Execution: Passes the stored context variables to the Apex Invocable → Input LWC → Pre-populated form.
	5.	User Confirmation: User saves the list view without having to enter details manually.

⸻

Future Opportunities
	•	Expanded object support – Allow users to create list views for more standard/custom objects.
	•	More complex filter mapping – Dynamically convert natural language filters into structured queries.
	•	Deeper mobile & Slack integration – Give users quick, on-the-go access to list creation without navigating Salesforce tabs.
	•	Context variable chaining – Enable more complex multi-step flows without losing context.
