public without sharing class ListProcessor {
    @InvocableMethod(label='Create List View' description='Create an object list view')
    public static List<Response> checkForListView(List<Request> request) {
        Details details = request[0].details;

        // (left as-is)
        String listViewApiName = details.apiName;
        List<ListView> listViews = [SELECT Id, DeveloperName FROM ListView WHERE DeveloperName =: details.objectApiName];

        Response res = new Response();

        ListViewDetails lvd = new ListViewDetails();
        lvd.label = details.label;
        lvd.apiName = details.apiName;
        lvd.objectApiName = details.objectApiName;
        lvd.fieldApiNames = details.fieldApiNames;

        // NEW: pass-through (optional)
        lvd.filteredByInfo = details.filteredByInfo;
        lvd.orderBy = details.orderBy;
        lvd.filterLogicString = details.filterLogicString;

        res.details = lvd;
        return new List<Response>{ res };
    }

    public class Request {
        @InvocableVariable(required=true) public Details details;
    }

    public class Details {
        @InvocableVariable(required=true) public String label;
        @InvocableVariable(required=true) public String apiName;
        @InvocableVariable(required=true) public String objectApiName;
        @InvocableVariable(required=true) public List<String> fieldApiNames;
        @InvocableVariable public String filterLogicString;

        // NEW (optional): filters + sort by
        @InvocableVariable public List<FilterInfo> filteredByInfo;
        @InvocableVariable public OrderBy orderBy;
    }

    public class Response {
        @InvocableVariable(required=true) public ListViewDetails details;
    }

    public class ListViewDetails {
        @InvocableVariable(required=true) public String label;
        @InvocableVariable(required=true) public String apiName;
        @InvocableVariable(required=true) public String objectApiName;
        @InvocableVariable(required=true) public List<String> fieldApiNames;
        @InvocableVariable public String filterLogicString;

        // NEW (optional): echo back for downstream use
        @InvocableVariable public List<FilterInfo> filteredByInfo;
        @InvocableVariable public OrderBy orderBy;
    }

    // --- small helper wrappers (kept minimal) ---
    public class FilterInfo {
        @InvocableVariable(required=true) public String fieldApiName;
        @InvocableVariable(required=true) public String operator;          // e.g., Equals, Contains, In
        @InvocableVariable(required=true) public List<String> operandLabels; // values (comma-split for In/NotIn on the client)
    }

    public class OrderBy {
        @InvocableVariable(required=true) public String  fieldApiName;     // e.g., 'Name'
        @InvocableVariable(required=true) public Boolean isAscending;      // true = ASC
    }
}